import { CodeGraph } from "./code-graph.js";
import { type CycleFixProposal, DiagnosticsEngine, type DiagnosticsSummary } from "./diagnostics.js";
import { type GraftGrepResult, graftGrep } from "./graft-grep.js";
import { generateRepoMap, type RepoMapOptions } from "./repo-map.js";
import { generateFileSkeleton, renderSkeleton, type SkeletonOptions } from "./skeleton.js";

export * from "./ast-parser.js";
export * from "./code-graph.js";
export * from "./diagnostics.js";
export * from "./graft-grep.js";
export * from "./repo-map.js";
export * from "./skeleton.js";

export class GraftEngine {
	private graph: CodeGraph;
	private diagnosticsEngine: DiagnosticsEngine;
	private rootDir: string;

	constructor(rootDir: string = process.cwd()) {
		this.rootDir = rootDir;
		this.graph = new CodeGraph(rootDir);
		this.diagnosticsEngine = new DiagnosticsEngine(rootDir);
	}

	public get cwd(): string {
		return this.rootDir;
	}

	public async init(): Promise<void> {
		await this.graph.build();
	}

	public async skeleton(filePath: string, options: SkeletonOptions = {}): Promise<string> {
		return generateFileSkeleton(filePath, options);
	}

	public async map(options: RepoMapOptions = {}): Promise<string> {
		return generateRepoMap(this.graph, options);
	}

	public async callers(symbolName: string) {
		await this.graph.ensureIndexed();
		return this.graph.getCallers(symbolName);
	}

	public async dependencies(filePath: string): Promise<string[]> {
		await this.graph.ensureIndexed();
		return this.graph.getDependencies(filePath);
	}

	public async dependents(filePath: string): Promise<string[]> {
		await this.graph.ensureIndexed();
		return this.graph.getDependents(filePath);
	}

	public async blast(target: string) {
		await this.graph.ensureIndexed();
		return this.graph.getBlastRadius(target);
	}

	public async graphData() {
		await this.graph.ensureIndexed();
		return this.graph.getGraphData();
	}

	public async circularDependencies() {
		await this.graph.ensureIndexed();
		return this.graph.getCircularDependencies();
	}

	public async deadCode() {
		await this.graph.ensureIndexed();
		return this.graph.getDeadCode();
	}

	public async callChain(symbolName: string) {
		await this.graph.ensureIndexed();
		return this.graph.getCallChain(symbolName);
	}

	public async diagnostics(): Promise<DiagnosticsSummary> {
		return this.diagnosticsEngine.analyzeProject();
	}

	public suggestCycleFix(cycle: string[]): CycleFixProposal {
		return this.diagnosticsEngine.suggestCycleFix(cycle);
	}

	public async grep(
		query: string,
		options: { caseSensitive?: boolean; maxResults?: number } = {},
	): Promise<GraftGrepResult> {
		return graftGrep(this.graph, query, options);
	}

	public async ask(question: string): Promise<string> {
		await this.graph.ensureIndexed();
		const nodes = this.graph.getNodes();

		// Extract keywords from question
		const keywords = question
			.toLowerCase()
			.replace(/[^\w\s-]/g, " ")
			.split(/\s+/)
			.filter((w) => w.length > 2);

		// Score nodes based on matches in exports, symbols, path
		const scored = nodes
			.map((node) => {
				let score = 0;
				const pathLower = node.relativePath.toLowerCase();

				for (const kw of keywords) {
					if (pathLower.includes(kw)) score += 5;
					for (const sym of node.symbols) {
						if (sym.name.toLowerCase().includes(kw)) score += 3;
						if (sym.signature.toLowerCase().includes(kw)) score += 1;
					}
				}

				return { node, score };
			})
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 5);

		if (scored.length === 0) {
			return `Graft Ask: No specific high-relevance files found for question "${question}". Try graft.map() to explore the architecture.`;
		}

		const out: string[] = [];
		out.push(`🎯 **Graft Ranked Context for:** "${question}"\n`);

		for (const { node, score } of scored) {
			out.push(`### 📄 \`${node.relativePath}\` (relevance score: ${score})`);
			const exported = node.symbols.filter((s) => s.exported).slice(0, 6);
			if (exported.length > 0) {
				out.push(`- **Key Exports**: ${exported.map((s) => `\`${s.name}\` (${s.kind})`).join(", ")}`);
			}

			// Include mini skeleton
			const miniSkel = renderSkeleton(
				{
					filePath: node.filePath,
					language: node.language,
					symbols: exported,
					imports: node.imports.slice(0, 5),
					exports: node.exports,
				},
				{ includeDocstrings: false },
			);
			out.push(`\`\`\`typescript\n${miniSkel.slice(0, 600)}${miniSkel.length > 600 ? "\n// ..." : ""}\n\`\`\`\n`);
		}

		return out.join("\n");
	}
}
