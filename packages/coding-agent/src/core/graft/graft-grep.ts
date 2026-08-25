import { readFile } from "node:fs/promises";
import type { CodeSymbol } from "./ast-parser.js";
import type { CodeGraph } from "./code-graph.js";

export interface GraftGrepMatch {
	filePath: string;
	relativePath: string;
	lineNumber: number;
	lineContent: string;
	enclosingSymbol?: CodeSymbol;
}

export interface GraftGrepResult {
	query: string;
	totalMatches: number;
	matchesByFile: Map<string, GraftGrepMatch[]>;
	formatted: string;
}

export async function graftGrep(
	graph: CodeGraph,
	query: string,
	options: { caseSensitive?: boolean; maxResults?: number } = {},
): Promise<GraftGrepResult> {
	await graph.ensureIndexed();
	const nodes = graph.getNodes();
	const maxResults = options.maxResults ?? 50;
	const isCaseSensitive = options.caseSensitive ?? false;

	const pattern = new RegExp(query, isCaseSensitive ? "g" : "gi");
	const matchesByFile = new Map<string, GraftGrepMatch[]>();
	let totalMatches = 0;

	for (const node of nodes) {
		if (totalMatches >= maxResults) break;

		try {
			const text = await readFile(node.filePath, "utf-8");
			const lines = text.split("\n");

			for (let i = 0; i < lines.length; i++) {
				if (totalMatches >= maxResults) break;
				const line = lines[i];

				if (pattern.test(line)) {
					pattern.lastIndex = 0; // reset regex state
					const lineNum = i + 1;

					// Find enclosing symbol
					const enclosing = node.symbols.find((s) => lineNum >= s.line && lineNum <= (s.endLine || s.line + 20));

					const match: GraftGrepMatch = {
						filePath: node.filePath,
						relativePath: node.relativePath,
						lineNumber: lineNum,
						lineContent: line.trim(),
						enclosingSymbol: enclosing,
					};

					const fileMatches = matchesByFile.get(node.relativePath) || [];
					fileMatches.push(match);
					matchesByFile.set(node.relativePath, fileMatches);
					totalMatches++;
				}
			}
		} catch {}
	}

	// Format results grouped by file & enclosing symbol
	const out: string[] = [];
	out.push(`🔎 Graft Symbol-Aware Grep: "${query}" (${totalMatches} matches found)\n`);

	for (const [file, matches] of matchesByFile.entries()) {
		out.push(`📄 **${file}** (${matches.length} matches):`);
		for (const m of matches) {
			const symInfo = m.enclosingSymbol ? ` [in \`${m.enclosingSymbol.name}\` (${m.enclosingSymbol.kind})]` : "";
			out.push(`  L${m.lineNumber}${symInfo}: ${m.lineContent}`);
		}
		out.push("");
	}

	return {
		query,
		totalMatches,
		matchesByFile,
		formatted: out.join("\n"),
	};
}
