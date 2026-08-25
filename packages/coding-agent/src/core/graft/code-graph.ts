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

				const node: CodeGraphNode = {
					filePath: file,
					relativePath: relPath,
					language: ast.language,
					symbols: ast.symbols,
					imports: ast.imports,
					exports: ast.exports,
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
						[".ts", ".tsx", ".js", ".jsx", ".mjs", ".py", ".go", ".rs", ".java", ".c", ".cpp", ".json"].includes(
							ext,
						)
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
