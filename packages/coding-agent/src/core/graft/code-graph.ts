import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { type CodeSymbol, parseFileAst } from "./ast-parser.js";

export interface CodeGraphNode {
	filePath: string;
	relativePath: string;
	language: string;
	symbols: CodeSymbol[];
	imports: Array<{ source: string; importedSymbols: string[]; resolvedPath?: string }>;
	exports: string[];
	lineCount?: number;
}

export interface CodeGraphEdge {
	source: string;
	target: string;
	type: "import" | "call" | "inheritance" | "type-ref";
	symbols?: string[];
	weight?: number;
}

export interface CodeGraphData {
	nodes: Array<{
		id: string;
		label: string;
		language: string;
		cluster: string;
		symbolCount: number;
		symbols: CodeSymbol[];
		lines: number;
		fanIn: number;
		fanOut: number;
		instability: number;
	}>;
	edges: CodeGraphEdge[];
	clusters: Array<{
		id: string;
		name: string;
		nodeCount: number;
	}>;
	metrics: {
		totalFiles: number;
		totalSymbols: number;
		totalEdges: number;
		languages: Record<string, number>;
		circularDependenciesCount: number;
		deadCodeCount: number;
	};
}

export interface CircularDependencyResult {
	cycle: string[];
	length: number;
}

export interface DeadCodeSymbol {
	file: string;
	symbolName: string;
	kind: string;
	line: number;
	signature: string;
}

export interface CallChainNode {
	symbol: string;
	file: string;
	line: number;
	upstreamCallers: Array<{ symbol: string; file: string; line: number }>;
	downstreamCalls: Array<{ symbol: string; file?: string; line?: number }>;
}

export interface CallerReference {
	callerFile: string;
	callerSymbol?: string;
	line: number;
	snippet?: string;
}

export interface BlastRadiusResult {
	target: string;
	directDependents: string[];
	indirectDependents: string[];
	totalImpactedFiles: number;
	impactedSymbols: string[];
}

const DEFAULT_IGNORES = new Set([
	"node_modules",
	".git",
	"dist",
	"build",
	".next",
	".turbo",
	".cache",
	"venv",
	".venv",
	"kernel-venv",
	".prime",
	".andy",
	".gemini",
]);

export class CodeGraph {
	private rootDir: string;
	private nodes = new Map<string, CodeGraphNode>();
	private symbolIndex = new Map<string, { node: CodeGraphNode; symbol: CodeSymbol }[]>();
	private reverseDependencies = new Map<string, Set<string>>();
	private isIndexed = false;

	constructor(rootDir: string = process.cwd()) {
		this.rootDir = resolve(rootDir);
	}

	public async build(): Promise<void> {
		this.nodes.clear();
		this.symbolIndex.clear();
		this.reverseDependencies.clear();

		const files = await this.scanFiles(this.rootDir);

		for (const file of files) {
			try {
				const content = await readFile(file, "utf-8");
				const ast = parseFileAst(file, content);
				const relPath = relative(this.rootDir, file).replace(/\\/g, "/");
				const lineCount = content.split("\n").length;

				const node: CodeGraphNode = {
					filePath: file,
					relativePath: relPath,
					language: ast.language,
					symbols: ast.symbols,
					imports: ast.imports,
					exports: ast.exports,
					lineCount,
				};

				this.nodes.set(file, node);

				// Index symbols
				for (const sym of ast.symbols) {
					const existing = this.symbolIndex.get(sym.name) || [];
					existing.push({ node, symbol: sym });
					this.symbolIndex.set(sym.name, existing);
				}
			} catch (_e) {
				// Skip unreadable files
			}
		}

		// Resolve import paths and build reverse dependency graph
		for (const [filePath, node] of this.nodes.entries()) {
			for (const imp of node.imports) {
				const resolved = this.resolveImportPath(filePath, imp.source);
				if (resolved && this.nodes.has(resolved)) {
					imp.resolvedPath = resolved;

					const dependents = this.reverseDependencies.get(resolved) || new Set<string>();
					dependents.add(filePath);
					this.reverseDependencies.set(resolved, dependents);
				}
			}
		}

		this.isIndexed = true;
	}

	public async ensureIndexed(): Promise<void> {
		if (!this.isIndexed) {
			await this.build();
		}
	}

	public getNodes(): CodeGraphNode[] {
		return Array.from(this.nodes.values());
	}

	public getNode(filePath: string): CodeGraphNode | undefined {
		const full = resolve(this.rootDir, filePath);
		return this.nodes.get(full);
	}

	public getCallers(symbolName: string): CallerReference[] {
		const results: CallerReference[] = [];

		for (const node of this.nodes.values()) {
			for (const sym of node.symbols) {
				if (sym.calls?.includes(symbolName)) {
					results.push({
						callerFile: node.relativePath,
						callerSymbol: sym.name,
						line: sym.line,
						snippet: sym.signature,
					});
				}
			}
		}

		return results;
	}

	public getDependencies(filePath: string): string[] {
		const full = resolve(this.rootDir, filePath);
		const node = this.nodes.get(full);
		if (!node) return [];

		return node.imports
			.map((imp) => (imp.resolvedPath ? relative(this.rootDir, imp.resolvedPath).replace(/\\/g, "/") : imp.source))
			.filter(Boolean);
	}

	public getDependents(filePath: string): string[] {
		const full = resolve(this.rootDir, filePath);
		const dependents = this.reverseDependencies.get(full);
		if (!dependents) return [];

		return Array.from(dependents).map((p) => relative(this.rootDir, p).replace(/\\/g, "/"));
	}

	public getBlastRadius(target: string): BlastRadiusResult {
		const full = resolve(this.rootDir, target);
		const direct = new Set<string>();
		const indirect = new Set<string>();
		const impactedSymbols = new Set<string>();

		// If target is a file
		if (this.nodes.has(full)) {
			const directDeps = this.reverseDependencies.get(full) || new Set<string>();
			for (const dep of directDeps) {
				direct.add(relative(this.rootDir, dep).replace(/\\/g, "/"));
			}

			// Transitive exploration (up to depth 4)
			const queue = [...directDeps];
			const visited = new Set<string>([full, ...directDeps]);

			while (queue.length > 0) {
				const current = queue.shift()!;
				const nextDeps = this.reverseDependencies.get(current) || new Set<string>();
				for (const next of nextDeps) {
					if (!visited.has(next)) {
						visited.add(next);
						indirect.add(relative(this.rootDir, next).replace(/\\/g, "/"));
						queue.push(next);
					}
				}
			}
		} else {
			// Target is a symbol name
			const callers = this.getCallers(target);
			for (const caller of callers) {
				direct.add(caller.callerFile);
				if (caller.callerSymbol) impactedSymbols.add(caller.callerSymbol);
			}
		}

		return {
			target,
			directDependents: Array.from(direct),
			indirectDependents: Array.from(indirect),
			totalImpactedFiles: direct.size + indirect.size,
			impactedSymbols: Array.from(impactedSymbols),
		};
	}

	public getCircularDependencies(): CircularDependencyResult[] {
		const cycles: CircularDependencyResult[] = [];
		const visited = new Set<string>();
		const recStack = new Set<string>();
		const path: string[] = [];

		const relNodes = Array.from(this.nodes.values()).map((n) => n.relativePath);
		const adjMap = new Map<string, string[]>();

		for (const node of this.nodes.values()) {
			const deps = node.imports
				.map((i) => (i.resolvedPath ? relative(this.rootDir, i.resolvedPath).replace(/\\/g, "/") : undefined))
				.filter((d): d is string => Boolean(d));
			adjMap.set(node.relativePath, deps);
		}

		const dfs = (curr: string) => {
			visited.add(curr);
			recStack.add(curr);
			path.push(curr);

			const neighbors = adjMap.get(curr) || [];
			for (const next of neighbors) {
				if (!visited.has(next)) {
					dfs(next);
				} else if (recStack.has(next)) {
					const cycleStartIdx = path.indexOf(next);
					if (cycleStartIdx !== -1) {
						const cycle = path.slice(cycleStartIdx).concat(next);
						// Avoid duplicates with rotation
						const exists = cycles.some(
							(c) => c.cycle.length === cycle.length && c.cycle.every((n) => cycle.includes(n)),
						);
						if (!exists) {
							cycles.push({ cycle, length: cycle.length - 1 });
						}
					}
				}
			}

			path.pop();
			recStack.delete(curr);
		};

		for (const node of relNodes) {
			if (!visited.has(node)) {
				dfs(node);
			}
		}

		return cycles.sort((a, b) => a.length - b.length);
	}

	public getDeadCode(): DeadCodeSymbol[] {
		const deadSymbols: DeadCodeSymbol[] = [];

		for (const node of this.nodes.values()) {
			for (const sym of node.symbols) {
				if (sym.exported && sym.kind !== "module") {
					// Check if this symbol is called or imported anywhere
					let isReferenced = false;

					// 1. Is it imported by other files?
					for (const otherNode of this.nodes.values()) {
						if (otherNode.filePath === node.filePath) continue;
						for (const imp of otherNode.imports) {
							if (imp.resolvedPath === node.filePath && imp.importedSymbols.includes(sym.name)) {
								isReferenced = true;
								break;
							}
						}
						if (isReferenced) break;
					}

					// 2. Is it called anywhere?
					if (!isReferenced) {
						const callers = this.getCallers(sym.name);
						if (callers.length > 0) {
							isReferenced = true;
						}
					}

					if (!isReferenced && !sym.name.startsWith("main") && !sym.name.startsWith("index")) {
						deadSymbols.push({
							file: node.relativePath,
							symbolName: sym.name,
							kind: sym.kind,
							line: sym.line,
							signature: sym.signature,
						});
					}
				}
			}
		}

		return deadSymbols;
	}

	public getCallChain(symbolName: string): CallChainNode {
		const callers = this.getCallers(symbolName);
		const upstreamCallers = callers.map((c) => ({
			symbol: c.callerSymbol || "anonymous",
			file: c.callerFile,
			line: c.line,
		}));

		const matchingSyms = this.symbolIndex.get(symbolName) || [];
		const downstreamCalls: Array<{ symbol: string; file?: string; line?: number }> = [];

		for (const { symbol } of matchingSyms) {
			for (const call of symbol.calls || []) {
				const targets = this.symbolIndex.get(call) || [];
				const target = targets[0];
				downstreamCalls.push({
					symbol: call,
					file: target?.node.relativePath,
					line: target?.symbol.line,
				});
			}
		}

		const primarySym = matchingSyms[0];

		return {
			symbol: symbolName,
			file: primarySym?.node.relativePath || "unknown",
			line: primarySym?.symbol.line || 1,
			upstreamCallers,
			downstreamCalls,
		};
	}

	public getGraphData(): CodeGraphData {
		const nodes: CodeGraphData["nodes"] = [];
		const edges: CodeGraphEdge[] = [];
		const clustersMap = new Map<string, number>();
		const langCounts: Record<string, number> = {};
		let totalSymbols = 0;

		for (const node of this.nodes.values()) {
			const parts = node.relativePath.split("/");
			const cluster = parts.length > 1 ? parts[0] : "root";
			clustersMap.set(cluster, (clustersMap.get(cluster) || 0) + 1);

			langCounts[node.language] = (langCounts[node.language] || 0) + 1;
			totalSymbols += node.symbols.length;

			const dependents = this.reverseDependencies.get(node.filePath) || new Set<string>();
			const fanIn = dependents.size;

			const resolvedImports = node.imports
				.map((i) => i.resolvedPath)
				.filter((p): p is string => Boolean(p && this.nodes.has(p)));
			const fanOut = resolvedImports.length;

			const instability = fanIn + fanOut > 0 ? Number((fanOut / (fanIn + fanOut)).toFixed(2)) : 0;

			nodes.push({
				id: node.relativePath,
				label: parts[parts.length - 1],
				language: node.language,
				cluster,
				symbolCount: node.symbols.length,
				symbols: node.symbols,
				lines: node.lineCount || 1,
				fanIn,
				fanOut,
				instability,
			});

			// Add edges for imports
			for (const imp of node.imports) {
				if (imp.resolvedPath && this.nodes.has(imp.resolvedPath)) {
					const targetRel = relative(this.rootDir, imp.resolvedPath).replace(/\\/g, "/");
					edges.push({
						source: node.relativePath,
						target: targetRel,
						type: "import",
						symbols: imp.importedSymbols,
					});
				}
			}

			// Add edges for symbol inheritance
			for (const sym of node.symbols) {
				if (sym.inherits && sym.inherits.length > 0) {
					for (const parentName of sym.inherits) {
						const parentEntries = this.symbolIndex.get(parentName) || [];
						for (const p of parentEntries) {
							if (p.node.filePath !== node.filePath) {
								edges.push({
									source: node.relativePath,
									target: p.node.relativePath,
									type: "inheritance",
									symbols: [`${sym.name} -> ${parentName}`],
								});
							}
						}
					}
				}
			}
		}

		const clusters = Array.from(clustersMap.entries()).map(([id, nodeCount]) => ({
			id,
			name: id.toUpperCase(),
			nodeCount,
		}));

		const circular = this.getCircularDependencies();
		const deadCode = this.getDeadCode();

		return {
			nodes,
			edges,
			clusters,
			metrics: {
				totalFiles: nodes.length,
				totalSymbols,
				totalEdges: edges.length,
				languages: langCounts,
				circularDependenciesCount: circular.length,
				deadCodeCount: deadCode.length,
			},
		};
	}

	private resolveImportPath(importerFile: string, importSource: string): string | undefined {
		if (!importSource.startsWith(".")) return undefined;

		const dir = dirname(importerFile);
		const base = resolve(dir, importSource);

		const candidates = [
			base,
			`${base}.ts`,
			`${base}.tsx`,
			`${base}.js`,
			`${base}.jsx`,
			`${base}.mjs`,
			`${base}.cs`,
			`${base}.py`,
			`${base}.go`,
			`${base}.rs`,
			join(base, "index.ts"),
			join(base, "index.js"),
		];

		for (const cand of candidates) {
			if (this.nodes.has(cand)) return cand;
		}

		return undefined;
	}

	private async scanFiles(dir: string): Promise<string[]> {
		const results: string[] = [];

		async function walk(currentDir: string) {
			let entries: any[] = [];
			try {
				entries = await readdir(currentDir, { withFileTypes: true });
			} catch {
				return;
			}

			for (const entry of entries) {
				const fullPath = join(currentDir, entry.name);
				if (entry.isDirectory()) {
					if (!DEFAULT_IGNORES.has(entry.name) && !entry.name.startsWith(".")) {
						await walk(fullPath);
					}
				} else if (entry.isFile()) {
					const ext = entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase();
					if (
						[
							".ts",
							".tsx",
							".js",
							".jsx",
							".mjs",
							".py",
							".go",
							".rs",
							".java",
							".c",
							".cpp",
							".cs",
							".json",
						].includes(ext)
					) {
						results.push(fullPath);
					}
				}
			}
		}

		await walk(dir);
		return results;
	}
}
