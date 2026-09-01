import { Type } from "typebox";
import type { ToolDefinition } from "../extensions/types.js";
import { GraftEngine } from "../graft/index.js";

let defaultEngine: GraftEngine | undefined;

function getGraftEngine(cwd: string = process.cwd()): GraftEngine {
	if (!defaultEngine) {
		defaultEngine = new GraftEngine(cwd);
	}
	return defaultEngine;
}

const GraftMapSchema = Type.Object({
	includeSymbols: Type.Optional(
		Type.Boolean({ description: "Whether to list exported symbols per module. Default true." }),
	),
});

const GraftSkeletonSchema = Type.Object({
	filePath: Type.String({ description: "Path to the file to extract skeleton from." }),
	includeDocstrings: Type.Optional(Type.Boolean({ description: "Include docstrings in output. Default true." })),
});

const GraftCallersSchema = Type.Object({
	symbolName: Type.String({ description: "The name of the function, class, or symbol to search callers for." }),
});

const GraftGrepSchema = Type.Object({
	query: Type.String({ description: "Regex or search term to look for." }),
	caseSensitive: Type.Optional(Type.Boolean({ description: "Case sensitive search. Default false." })),
});

const GraftBlastSchema = Type.Object({
	target: Type.String({ description: "The file path or symbol name to analyze blast radius for." }),
});

const GraftAskSchema = Type.Object({
	question: Type.String({ description: "The architectural or code-related question to find context for." }),
});

const GraftGraphSchema = Type.Object({
	filterCluster: Type.Optional(Type.String({ description: "Filter nodes by folder cluster name (optional)." })),
});

const GraftCyclesSchema = Type.Object({});

const GraftDeadCodeSchema = Type.Object({
	limit: Type.Optional(Type.Number({ description: "Maximum number of dead code symbols to return. Default 20." })),
});

const GraftCallChainSchema = Type.Object({
	symbolName: Type.String({ description: "The symbol name to trace full upstream and downstream call chains for." }),
});

const GraftDiagnosticsSchema = Type.Object({});

const GraftSuggestFixSchema = Type.Object({
	cycle: Type.Array(Type.String(), { description: "Array of file paths forming a circular dependency loop." }),
});

export function createGraftTools(cwd: string = process.cwd()): ToolDefinition<any, any, any>[] {
	const engine = getGraftEngine(cwd);

	const graftMapTool: ToolDefinition<typeof GraftMapSchema, { map: string }> = {
		name: "graft_map",
		label: "graft_map",
		description:
			"Generate a high-level architectural map of the codebase, clustering directories and identifying key entrypoints and exported modules.",
		parameters: GraftMapSchema,
		execute: async (_toolCallId, params) => {
			const mapStr = await engine.map(params);
			return {
				content: [{ type: "text", text: mapStr }],
				details: { map: mapStr },
			};
		},
	};

	const graftSkeletonTool: ToolDefinition<typeof GraftSkeletonSchema, { skeleton: string }> = {
		name: "graft_skeleton",
		label: "graft_skeleton",
		description:
			"Extract the structural skeleton of a file (signatures, types, classes, interfaces, docstrings) while omitting implementation bodies. Use this to quickly understand a file without burning tokens reading the entire file.",
		parameters: GraftSkeletonSchema,
		execute: async (_toolCallId, params) => {
			const skel = await engine.skeleton(params.filePath, params);
			return {
				content: [{ type: "text", text: skel }],
				details: { skeleton: skel },
			};
		},
	};

	const graftCallersTool: ToolDefinition<typeof GraftCallersSchema, { callersCount: number }> = {
		name: "graft_callers",
		label: "graft_callers",
		description:
			"Find all callers and references to a specific function, class, or symbol across the entire codebase.",
		parameters: GraftCallersSchema,
		execute: async (_toolCallId, params) => {
			const callers = await engine.callers(params.symbolName);
			if (callers.length === 0) {
				return {
					content: [{ type: "text", text: `No callers found for symbol "${params.symbolName}".` }],
					details: { callersCount: 0 },
				};
			}

			const formatted = callers
				.map(
					(c) =>
						`- \`${c.callerFile}\`:L${c.line} (in \`${c.callerSymbol || "top-level"}\`) -> ${c.snippet || ""}`,
				)
				.join("\n");

			return {
				content: [
					{
						type: "text",
						text: `📞 Callers of \`${params.symbolName}\` (${callers.length} occurrences):\n\n${formatted}`,
					},
				],
				details: { callersCount: callers.length },
			};
		},
	};

	const graftGrepTool: ToolDefinition<typeof GraftGrepSchema, { totalMatches: number }> = {
		name: "graft_grep",
		label: "graft_grep",
		description:
			"Perform a symbol-aware search across indexed project files, grouping matches by their enclosing function or class.",
		parameters: GraftGrepSchema,
		execute: async (_toolCallId, params) => {
			const result = await engine.grep(params.query, params);
			return {
				content: [{ type: "text", text: result.formatted }],
				details: { totalMatches: result.totalMatches },
			};
		},
	};

	const graftBlastTool: ToolDefinition<typeof GraftBlastSchema, { totalImpactedFiles: number }> = {
		name: "graft_blast",
		label: "graft_blast",
		description: "Analyze the blast radius (impacted files and callers) if a specific file or symbol is modified.",
		parameters: GraftBlastSchema,
		execute: async (_toolCallId, params) => {
			const blast = await engine.blast(params.target);
			const out = [
				`💥 **Blast Radius Analysis for: \`${params.target}\`**`,
				`- Direct dependents (${blast.directDependents.length}): ${blast.directDependents.join(", ") || "None"}`,
				`- Indirect dependents (${blast.indirectDependents.length}): ${blast.indirectDependents.join(", ") || "None"}`,
				`- Total impacted files: ${blast.totalImpactedFiles}`,
			];

			return {
				content: [{ type: "text", text: out.join("\n") }],
				details: { totalImpactedFiles: blast.totalImpactedFiles },
			};
		},
	};

	const graftAskTool: ToolDefinition<typeof GraftAskSchema, { response: string }> = {
		name: "graft_ask",
		label: "graft_ask",
		description:
			"Ask an architectural or functional question about the codebase to get ranked relevant files with mini-skeletons.",
		parameters: GraftAskSchema,
		execute: async (_toolCallId, params) => {
			const res = await engine.ask(params.question);
			return {
				content: [{ type: "text", text: res }],
				details: { response: res },
			};
		},
	};

	const graftGraphTool: ToolDefinition<typeof GraftGraphSchema, any> = {
		name: "graft_graph",
		label: "graft_graph",
		description:
			"Query the Code Knowledge Graph to view high-level architecture clusters, file relationships, and complexity metrics.",
		parameters: GraftGraphSchema,
		execute: async (_toolCallId, params) => {
			const gdata = await engine.graphData();
			let nodes = gdata.nodes;
			if (params.filterCluster) {
				const filter = params.filterCluster.toLowerCase();
				nodes = nodes.filter((n) => n.cluster.toLowerCase() === filter);
			}

			const out = [
				`🌐 **Code Knowledge Graph Summary**`,
				`- **Total Files**: ${gdata.metrics.totalFiles}`,
				`- **Total Symbols**: ${gdata.metrics.totalSymbols}`,
				`- **Total Edges**: ${gdata.metrics.totalEdges}`,
				`- **Clusters (${gdata.clusters.length})**: ${gdata.clusters.map((c) => `\`${c.id}\` (${c.nodeCount} files)`).join(", ")}`,
				`- **Top Modules**:`,
				...nodes
					.slice(0, 15)
					.map(
						(n) =>
							`  - \`${n.id}\` (${n.language}, ${n.symbolCount} symbols, fanIn: ${n.fanIn}, fanOut: ${n.fanOut})`,
					),
			];

			return {
				content: [{ type: "text", text: out.join("\n") }],
				details: gdata.metrics,
			};
		},
	};

	const graftCyclesTool: ToolDefinition<typeof GraftCyclesSchema, any> = {
		name: "graft_cycles",
		label: "graft_cycles",
		description: "Detect circular dependencies and import loops across the codebase.",
		parameters: GraftCyclesSchema,
		execute: async () => {
			const cycles = await engine.circularDependencies();
			if (cycles.length === 0) {
				return {
					content: [{ type: "text", text: "✅ No circular dependencies detected in the codebase." }],
					details: { totalCycles: 0 },
				};
			}

			const out = [
				`⚠️ **Detected ${cycles.length} Circular Dependencies:**\n`,
				...cycles.map((c, i) => `${i + 1}. ${c.cycle.map((p) => `\`${p}\``).join(" ➔ ")} (length: ${c.length})`),
			];

			return {
				content: [{ type: "text", text: out.join("\n") }],
				details: { totalCycles: cycles.length, cycles },
			};
		},
	};

	const graftDeadCodeTool: ToolDefinition<typeof GraftDeadCodeSchema, any> = {
		name: "graft_dead_code",
		label: "graft_dead_code",
		description:
			"Find exported functions, classes, or types that have no external callers or references in the project.",
		parameters: GraftDeadCodeSchema,
		execute: async (_toolCallId, params) => {
			const dead = await engine.deadCode();
			const limit = params.limit || 20;
			if (dead.length === 0) {
				return {
					content: [{ type: "text", text: "✅ No unreferenced exported dead code found." }],
					details: { totalDeadCode: 0 },
				};
			}

			const out = [
				`🔍 **Unreferenced Exported Symbols (${dead.length} total, showing top ${Math.min(dead.length, limit)}):**\n`,
				...dead.slice(0, limit).map((d) => `- \`${d.file}\`:L${d.line} \`${d.symbolName}\` (${d.kind})`),
			];

			return {
				content: [{ type: "text", text: out.join("\n") }],
				details: { totalDeadCode: dead.length, dead },
			};
		},
	};

	const graftCallChainTool: ToolDefinition<typeof GraftCallChainSchema, any> = {
		name: "graft_call_chain",
		label: "graft_call_chain",
		description:
			"Trace complete upstream callers (who invokes this) and downstream callees (what this invokes) for a symbol.",
		parameters: GraftCallChainSchema,
		execute: async (_toolCallId, params) => {
			const chain = await engine.callChain(params.symbolName);
			const out = [
				`🔗 **Call Chain for \`${params.symbolName}\` in \`${chain.file}\`:L${chain.line}**`,
				`\n**Upstream Invocations (${chain.upstreamCallers.length} callers):**`,
				chain.upstreamCallers.length > 0
					? chain.upstreamCallers.map((u) => `- \`${u.file}\`:L${u.line} via \`${u.symbol}\``).join("\n")
					: "  (None / Root entrypoint)",
				`\n**Downstream Dependencies (${chain.downstreamCalls.length} calls):**`,
				chain.downstreamCalls.length > 0
					? chain.downstreamCalls
							.map((d) => `- \`${d.symbol}\`${d.file ? ` in \`${d.file}\`:L${d.line}` : ""}`)
							.join("\n")
					: "  (None / Leaf function)",
			];

			return {
				content: [{ type: "text", text: out.join("\n") }],
				details: chain,
			};
		},
	};

	const graftDiagnosticsTool: ToolDefinition<typeof GraftDiagnosticsSchema, any> = {
		name: "graft_diagnostics",
		label: "graft_diagnostics",
		description:
			"Run static syntax and structural diagnostics across the codebase (TS/JS, Python, C#, Go, Rust, JSON).",
		parameters: GraftDiagnosticsSchema,
		execute: async () => {
			const res = await engine.diagnostics();
			const out = [
				`🩺 **Static Code Diagnostics Summary**`,
				`- **Files Checked**: ${res.totalFilesChecked}`,
				`- **Errors**: ${res.errorCount}`,
				`- **Warnings**: ${res.warningCount}`,
				res.diagnostics.length > 0
					? `\n**Top Issues:**\n` +
						res.diagnostics
							.slice(0, 15)
							.map((d) => `  - [${d.severity.toUpperCase()}] \`${d.file}\`:L${d.line}: ${d.message}`)
							.join("\n")
					: `\n✅ No syntax errors or structural anomalies detected. Codebase is clean.`,
			];

			return {
				content: [{ type: "text", text: out.join("\n") }],
				details: res,
			};
		},
	};

	const graftSuggestFixTool: ToolDefinition<typeof GraftSuggestFixSchema, any> = {
		name: "graft_suggest_fix",
		label: "graft_suggest_fix",
		description: "Generate an architectural refactoring plan to resolve a circular dependency loop safely.",
		parameters: GraftSuggestFixSchema,
		execute: async (_toolCallId, params) => {
			const proposal = engine.suggestCycleFix(params.cycle);
			const out = [
				`🛠️ **Refactoring Proposal for Cycle**`,
				`**Strategy:** ${proposal.strategy}`,
				`**Rationale:** ${proposal.rationale}`,
				`\n**Actionable Steps:**`,
				...proposal.steps.map((s) => `- ${s}`),
			];

			return {
				content: [{ type: "text", text: out.join("\n") }],
				details: proposal,
			};
		},
	};

	return [
		graftMapTool,
		graftSkeletonTool,
		graftCallersTool,
		graftGrepTool,
		graftBlastTool,
		graftAskTool,
		graftGraphTool,
		graftCyclesTool,
		graftDeadCodeTool,
		graftCallChainTool,
		graftDiagnosticsTool,
		graftSuggestFixTool,
	];
}
