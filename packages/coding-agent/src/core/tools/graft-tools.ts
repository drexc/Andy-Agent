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

	return [graftMapTool, graftSkeletonTool, graftCallersTool, graftGrepTool, graftBlastTool, graftAskTool];
}
