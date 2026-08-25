import { readFile } from "node:fs/promises";
import { type FileAstResult, parseFileAst } from "./ast-parser.js";

export interface SkeletonOptions {
	includeDocstrings?: boolean;
	includePrivate?: boolean;
	maxLines?: number;
}

export async function generateFileSkeleton(filePath: string, options: SkeletonOptions = {}): Promise<string> {
	try {
		const content = await readFile(filePath, "utf-8");
		const ast = parseFileAst(filePath, content);
		return renderSkeleton(ast, options);
	} catch (error: any) {
		return `// Error generating skeleton for ${filePath}: ${error.message || String(error)}`;
	}
}

export function renderSkeleton(ast: FileAstResult, options: SkeletonOptions = {}): string {
	const includeDocstrings = options.includeDocstrings !== false;
	const includePrivate = options.includePrivate ?? false;

	const parts: string[] = [];
	parts.push(`// === SKELETON: ${ast.filePath} (${ast.language}) ===\n`);

	// 1. Imports overview
	if (ast.imports.length > 0) {
		parts.push("// --- Imports ---");
		for (const imp of ast.imports) {
			const symbols =
				imp.importedSymbols.length > 0
					? `{ ${imp.importedSymbols.slice(0, 8).join(", ")}${imp.importedSymbols.length > 8 ? ", ..." : ""} }`
					: "*";
			parts.push(`import ${symbols} from "${imp.source}";`);
		}
		parts.push("");
	}

	// Group symbols
	const typesAndInterfaces = ast.symbols.filter(
		(s) => s.kind === "interface" || s.kind === "type" || s.kind === "enum",
	);
	const classes = ast.symbols.filter((s) => s.kind === "class");
	const topLevelFunctions = ast.symbols.filter((s) => s.kind === "function" && !s.parent);
	const topLevelVars = ast.symbols.filter((s) => s.kind === "variable" || s.kind === "constant");

	// 2. Types & Interfaces
	if (typesAndInterfaces.length > 0) {
		parts.push("// --- Types & Interfaces ---");
		for (const item of typesAndInterfaces) {
			if (item.docstring && includeDocstrings) {
				parts.push(item.docstring);
			}
			parts.push(`${item.signature}\n`);
		}
	}

	// 3. Classes
	if (classes.length > 0) {
		parts.push("// --- Classes & Methods ---");
		for (const cls of classes) {
			if (cls.docstring && includeDocstrings) {
				parts.push(cls.docstring);
			}
			parts.push(`${cls.signature} {`);

			// Methods of this class
			const methods = ast.symbols.filter((s) => s.parent === cls.name && s.kind === "method");
			for (const m of methods) {
				if (m.docstring && includeDocstrings) {
					parts.push(`  ${m.docstring}`);
				}
				const cleanSig = m.signature.replace(/\{$/, "").trim();
				parts.push(`  ${cleanSig} { /* ... */ }`);
			}
			parts.push("}\n");
		}
	}

	// 4. Exported / Top-Level Functions
	if (topLevelFunctions.length > 0) {
		parts.push("// --- Functions ---");
		for (const fn of topLevelFunctions) {
			if (!fn.exported && !includePrivate) continue;
			if (fn.docstring && includeDocstrings) {
				parts.push(fn.docstring);
			}
			const cleanSig = fn.signature.replace(/\{$/, "").trim();
			parts.push(`${fn.exported ? "export " : ""}${cleanSig} { /* ... */ }\n`);
		}
	}

	// 5. Variables / Constants
	if (topLevelVars.length > 0) {
		const relevant = topLevelVars.filter((v) => v.exported || includePrivate);
		if (relevant.length > 0) {
			parts.push("// --- Exports / Constants ---");
			for (const v of relevant) {
				parts.push(`${v.exported ? "export " : ""}${v.signature};`);
			}
			parts.push("");
		}
	}

	return parts.join("\n");
}
