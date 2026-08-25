import type { CodeGraph } from "./code-graph.js";

export interface RepoMapOptions {
	maxDepth?: number;
	includeSymbols?: boolean;
	maxSymbolsPerFile?: number;
}

export async function generateRepoMap(graph: CodeGraph, options: RepoMapOptions = {}): Promise<string> {
	await graph.ensureIndexed();
	const nodes = graph.getNodes();
	const includeSymbols = options.includeSymbols !== false;
	const maxSymbolsPerFile = options.maxSymbolsPerFile ?? 5;

	// Group files by top-level or second-level directory
	const dirClusters = new Map<string, typeof nodes>();
	const languages = new Map<string, number>();

	for (const node of nodes) {
		const parts = node.relativePath.split("/");
		const cluster = parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0] || ".";

		const existing = dirClusters.get(cluster) || [];
		existing.push(node);
		dirClusters.set(cluster, existing);

		languages.set(node.language, (languages.get(node.language) || 0) + 1);
	}

	const out: string[] = [];
	out.push("# 🗺️ Codebase Architectural Map (Graft Engine)");
	out.push(`- **Total indexed files**: ${nodes.length}`);
	out.push(
		`- **Languages**: ${Array.from(languages.entries())
			.map(([lang, count]) => `${lang} (${count})`)
			.join(", ")}`,
	);
	out.push("");

	// Key entrypoints
	const entrypoints = nodes.filter((n) => {
		const base = n.relativePath.toLowerCase();
		return (
			base.endsWith("main.ts") ||
			base.endsWith("cli.ts") ||
			base.endsWith("index.ts") ||
			base.endsWith("server.ts") ||
			base.endsWith("app.ts") ||
			base.endsWith("__init__.py")
		);
	});

	if (entrypoints.length > 0) {
		out.push("## 🚪 Key Entrypoints");
		for (const ep of entrypoints.slice(0, 15)) {
			const exported = ep.exports.length > 0 ? ` -> exports: [${ep.exports.slice(0, 4).join(", ")}]` : "";
			out.push(`- \`${ep.relativePath}\` (${ep.language})${exported}`);
		}
		out.push("");
	}

	// Module Clusters
	out.push("## 📦 Modules & Clusters");
	for (const [cluster, clusterNodes] of dirClusters.entries()) {
		out.push(`### 📁 \`${cluster}/\` (${clusterNodes.length} files)`);

		for (const node of clusterNodes) {
			const exportedSymbols = node.symbols.filter((s) => s.exported);
			const symbolStr =
				includeSymbols && exportedSymbols.length > 0
					? ` | exports: ${exportedSymbols
							.slice(0, maxSymbolsPerFile)
							.map((s) => s.name)
							.join(", ")}${exportedSymbols.length > maxSymbolsPerFile ? "..." : ""}`
					: "";

			out.push(`  - \`${node.relativePath}\`${symbolStr}`);
		}
		out.push("");
	}

	return out.join("\n");
}
