import { extname } from "node:path";

export interface CodeSymbol {
	name: string;
	kind:
		| "function"
		| "class"
		| "interface"
		| "type"
		| "enum"
		| "method"
		| "variable"
		| "constant"
		| "module"
		| "struct"
		| "trait"
		| "record";
	line: number;
	endLine: number;
	signature: string;
	docstring?: string;
	exported?: boolean;
	parent?: string;
	inherits?: string[];
	calls?: string[];
}

export interface FileAstResult {
	filePath: string;
	language: string;
	symbols: CodeSymbol[];
	imports: Array<{ source: string; importedSymbols: string[] }>;
	exports: string[];
}

export function detectLanguage(filePath: string): string {
	const ext = extname(filePath).toLowerCase();
	switch (ext) {
		case ".ts":
		case ".mts":
		case ".cts":
			return "typescript";
		case ".tsx":
			return "tsx";
		case ".js":
		case ".mjs":
		case ".cjs":
			return "javascript";
		case ".jsx":
			return "jsx";
		case ".py":
		case ".pyi":
			return "python";
		case ".cs":
			return "csharp";
		case ".go":
			return "go";
		case ".rs":
			return "rust";
		case ".java":
			return "java";
		case ".c":
		case ".h":
			return "c";
		case ".cpp":
		case ".hpp":
		case ".cc":
			return "cpp";
		case ".json":
			return "json";
		case ".md":
			return "markdown";
		case ".yaml":
		case ".yml":
			return "yaml";
		default:
			return "unknown";
	}
}

export function parseFileAst(filePath: string, sourceText: string): FileAstResult {
	const language = detectLanguage(filePath);

	if (language === "typescript" || language === "tsx" || language === "javascript" || language === "jsx") {
		return parseTypeScriptAst(filePath, sourceText, language);
	}

	if (language === "python") {
		return parsePythonStructuralAst(filePath, sourceText);
	}

	if (language === "csharp") {
		return parseCSharpAst(filePath, sourceText);
	}

	if (language === "go") {
		return parseGoAst(filePath, sourceText);
	}

	if (language === "rust") {
		return parseRustAst(filePath, sourceText);
	}

	return parseGenericStructuralAst(filePath, sourceText, language);
}

function extractDocstringBefore(lines: string[], lineIndex: number): string | undefined {
	const docLines: string[] = [];
	let idx = lineIndex - 1;

	// Single line comments or block comments directly above
	while (idx >= 0) {
		const l = lines[idx].trim();
		if (l.startsWith("*/") || l.startsWith("*") || l.startsWith("/**") || l.startsWith("//") || l.startsWith("#")) {
			docLines.unshift(lines[idx]);
			if (l.startsWith("/**") || l.startsWith("/*")) break;
			idx--;
		} else {
			break;
		}
	}

	return docLines.length > 0 ? docLines.join("\n").trim() : undefined;
}

function extractCallsFromText(text: string): string[] {
	const calls: string[] = [];
	const callRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
	let _match: RegExpExecArray | null;

	const reserved = new Set([
		"if",
		"for",
		"while",
		"switch",
		"catch",
		"function",
		"return",
		"typeof",
		"instanceof",
		"import",
		"export",
		"class",
		"interface",
		"type",
		"enum",
		"const",
		"let",
		"var",
		"new",
		"super",
		"this",
		"await",
		"yield",
	]);

	for (const m of text.matchAll(callRegex)) {
		const fn = m[1];
		if (!reserved.has(fn) && !calls.includes(fn)) {
			calls.push(fn);
		}
	}

	return calls;
}

function parseTypeScriptAst(filePath: string, sourceText: string, language: string): FileAstResult {
	const lines = sourceText.split("\n");
	const symbols: CodeSymbol[] = [];
	const imports: Array<{ source: string; importedSymbols: string[] }> = [];
	const exports: string[] = [];

	let currentClass: { name: string; startLine: number } | undefined;
	let braceDepth = 0;
	let classBraceDepth = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		const lineNum = i + 1;

		// Track braces
		const openBraces = (line.match(/\{/g) || []).length;
		const closeBraces = (line.match(/\}/g) || []).length;
		braceDepth += openBraces - closeBraces;

		if (currentClass && braceDepth <= classBraceDepth) {
			currentClass = undefined;
		}

		// 1. Imports
		// import { a, b } from "module";
		const importMatch = trimmed.match(/^import\s+(?:type\s+)?(?:([a-zA-Z0-9_$,\s{}*]+)\s+from\s+)?['"]([^'"]+)['"]/);
		if (importMatch) {
			const rawSymbols = importMatch[1] || "";
			const source = importMatch[2];
			const importedSymbols = rawSymbols
				.replace(/[{}]/g, "")
				.split(",")
				.map((s) => s.trim().split(/\s+as\s+/)[0])
				.filter(Boolean);
			imports.push({ source, importedSymbols });
			continue;
		}

		// 2. Interfaces & Types
		const interfaceMatch = trimmed.match(
			/^(?:export\s+)?interface\s+([A-Za-z0-9_$]+)(?:<[^>]*>)?(?:\s+extends\s+[^{]+)?/,
		);
		if (interfaceMatch) {
			const name = interfaceMatch[1];
			const isExp = trimmed.startsWith("export");
			if (isExp) exports.push(name);

			symbols.push({
				name,
				kind: "interface",
				line: lineNum,
				endLine: lineNum,
				signature: interfaceMatch[0],
				docstring: extractDocstringBefore(lines, i),
				exported: isExp,
			});
			continue;
		}

		const typeMatch = trimmed.match(/^(?:export\s+)?type\s+([A-Za-z0-9_$]+)(?:<[^>]*>)?\s*=/);
		if (typeMatch) {
			const name = typeMatch[1];
			const isExp = trimmed.startsWith("export");
			if (isExp) exports.push(name);

			symbols.push({
				name,
				kind: "type",
				line: lineNum,
				endLine: lineNum,
				signature: trimmed.replace(/;$/, ""),
				docstring: extractDocstringBefore(lines, i),
				exported: isExp,
			});
			continue;
		}

		// 3. Enums
		const enumMatch = trimmed.match(/^(?:export\s+)?(?:const\s+)?enum\s+([A-Za-z0-9_$]+)/);
		if (enumMatch) {
			const name = enumMatch[1];
			const isExp = trimmed.startsWith("export");
			if (isExp) exports.push(name);

			symbols.push({
				name,
				kind: "enum",
				line: lineNum,
				endLine: lineNum,
				signature: enumMatch[0],
				docstring: extractDocstringBefore(lines, i),
				exported: isExp,
			});
			continue;
		}

		// 4. Classes
		const classMatch = trimmed.match(
			/^(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_$]+)(?:<[^>]*>)?(?:\s+extends\s+[A-Za-z0-9_$.]+)?(?:\s+implements\s+[A-Za-z0-9_$,\s]+)?/,
		);
		if (classMatch) {
			const name = classMatch[1];
			const isExp = trimmed.startsWith("export");
			if (isExp) exports.push(name);

			currentClass = { name, startLine: lineNum };
			classBraceDepth = braceDepth - openBraces;

			symbols.push({
				name,
				kind: "class",
				line: lineNum,
				endLine: lineNum,
				signature: classMatch[0],
				docstring: extractDocstringBefore(lines, i),
				exported: isExp,
			});
			continue;
		}

		// 5. Methods inside class
		if (currentClass) {
			const methodMatch = trimmed.match(
				/^(?:public\s+|private\s+|protected\s+|static\s+|async\s+)*(?:get\s+|set\s+)?([A-Za-z0-9_$]+)\s*\(([^)]*)\)(?:\s*:\s*([^{;]+))?/,
			);
			if (methodMatch && !["if", "for", "while", "switch", "catch", "constructor"].includes(methodMatch[1])) {
				const methodName = methodMatch[1];
				const fullName = `${currentClass.name}.${methodName}`;
				symbols.push({
					name: fullName,
					kind: "method",
					line: lineNum,
					endLine: lineNum,
					signature: methodMatch[0],
					docstring: extractDocstringBefore(lines, i),
					exported: !trimmed.startsWith("private"),
					parent: currentClass.name,
					calls: extractCallsFromText(line),
				});
				continue;
			}
		}

		// 6. Functions (Standalone)
		const funcMatch = trimmed.match(
			/^(?:export\s+)?(?:async\s+)?function\s*([A-Za-z0-9_$]+)?\s*\(([^)]*)\)(?:\s*:\s*([^{;]+))?/,
		);
		if (funcMatch && funcMatch[1]) {
			const name = funcMatch[1];
			const isExp = trimmed.startsWith("export");
			if (isExp) exports.push(name);

			symbols.push({
				name,
				kind: "function",
				line: lineNum,
				endLine: lineNum,
				signature: funcMatch[0],
				docstring: extractDocstringBefore(lines, i),
				exported: isExp,
				calls: extractCallsFromText(line),
			});
			continue;
		}

		// 7. Exported Const / Functions: `export const foo = async (...) => ...`
		const constFuncMatch = trimmed.match(
			/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)(?:\s*:\s*[^=]+)?\s*=\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/,
		);
		if (constFuncMatch) {
			const name = constFuncMatch[1];
			const isExp = trimmed.startsWith("export");
			if (isExp) exports.push(name);

			symbols.push({
				name,
				kind: "function",
				line: lineNum,
				endLine: lineNum,
				signature: `${trimmed.split("=>")[0].trim()} => ...`,
				docstring: extractDocstringBefore(lines, i),
				exported: isExp,
				calls: extractCallsFromText(line),
			});
			continue;
		}

		// 8. General Exported Constants
		const constMatch = trimmed.match(/^export\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)/);
		if (constMatch) {
			const name = constMatch[1];
			exports.push(name);
			symbols.push({
				name,
				kind: "constant",
				line: lineNum,
				endLine: lineNum,
				signature: trimmed.replace(/;$/, ""),
				docstring: extractDocstringBefore(lines, i),
				exported: true,
			});
		}
	}

	return {
		filePath,
		language,
		symbols,
		imports,
		exports,
	};
}

function parsePythonStructuralAst(filePath: string, sourceText: string): FileAstResult {
	const lines = sourceText.split("\n");
	const symbols: CodeSymbol[] = [];
	const imports: Array<{ source: string; importedSymbols: string[] }> = [];
	const exports: string[] = [];

	let currentClass: string | undefined;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		const lineNum = i + 1;

		// Imports
		const importMatch = trimmed.match(/^import\s+([\w.,\s]+)/);
		const fromImportMatch = trimmed.match(/^from\s+([\w.]+)\s+import\s+([\w*,\s()]+)/);

		if (fromImportMatch) {
			const source = fromImportMatch[1];
			const importedSymbols = fromImportMatch[2]
				.replace(/[()]/g, "")
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			imports.push({ source, importedSymbols });
		} else if (importMatch) {
			const imported = importMatch[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0]);
			for (const imp of imported) {
				imports.push({ source: imp, importedSymbols: [imp] });
			}
		}

		// Classes
		const classMatch = line.match(/^class\s+([A-Za-z0-9_]+)(?:\(([^)]*)\))?:/);
		if (classMatch) {
			const name = classMatch[1];
			currentClass = name;
			symbols.push({
				name,
				kind: "class",
				line: lineNum,
				endLine: lineNum,
				signature: classMatch[0].replace(/:$/, ""),
				docstring: extractDocstringBefore(lines, i),
				exported: !name.startsWith("_"),
			});
			if (!name.startsWith("_")) exports.push(name);
			continue;
		}

		// Functions / Methods
		const fnMatch = line.match(/^(\s*)(async\s+)?def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/);
		if (fnMatch) {
			const indent = fnMatch[1].length;
			const isAsync = Boolean(fnMatch[2]);
			const name = fnMatch[3];
			const isMethod = indent > 0 && currentClass !== undefined;
			const fullName = isMethod ? `${currentClass}.${name}` : name;

			symbols.push({
				name: fullName,
				kind: isMethod ? "method" : "function",
				line: lineNum,
				endLine: lineNum,
				signature: `${isAsync ? "async " : ""}def ${name}(${fnMatch[4]})${fnMatch[5] ? ` -> ${fnMatch[5]}` : ""}`,
				docstring: extractDocstringBefore(lines, i),
				exported: !name.startsWith("_"),
				parent: isMethod ? currentClass : undefined,
				calls: extractCallsFromText(line),
			});
			if (!name.startsWith("_") && !isMethod) exports.push(name);
			continue;
		}

		if (line.match(/^[A-Za-z0-9_]/) && !classMatch && !fnMatch) {
			currentClass = undefined;
		}
	}

	return {
		filePath,
		language: "python",
		symbols,
		imports,
		exports,
	};
}

function parseCSharpAst(filePath: string, sourceText: string): FileAstResult {
	const lines = sourceText.split("\n");
	const symbols: CodeSymbol[] = [];
	const imports: Array<{ source: string; importedSymbols: string[] }> = [];
	const exports: string[] = [];

	let currentClass: { name: string; startLine: number } | undefined;
	let braceDepth = 0;
	let classBraceDepth = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		const lineNum = i + 1;

		const openBraces = (line.match(/\{/g) || []).length;
		const closeBraces = (line.match(/\}/g) || []).length;
		braceDepth += openBraces - closeBraces;

		if (currentClass && braceDepth <= classBraceDepth) {
			currentClass = undefined;
		}

		// 1. Usings / Imports
		// using System.Collections.Generic;
		const usingMatch = trimmed.match(/^using\s+(?:static\s+)?([A-Za-z0-9_.]+);/);
		if (usingMatch) {
			const source = usingMatch[1];
			imports.push({ source, importedSymbols: [source.split(".").pop() || source] });
			continue;
		}

		// 2. Namespace
		const namespaceMatch = trimmed.match(/^namespace\s+([A-Za-z0-9_.]+)/);
		if (namespaceMatch) {
			symbols.push({
				name: namespaceMatch[1],
				kind: "module",
				line: lineNum,
				endLine: lineNum,
				signature: namespaceMatch[0],
				docstring: extractDocstringBefore(lines, i),
				exported: true,
			});
			continue;
		}

		// 3. Classes / Interfaces / Structs / Enums / Records
		const typeDeclMatch = trimmed.match(
			/^(?:public\s+|internal\s+|protected\s+|private\s+)?(?:abstract\s+|sealed\s+|static\s+|partial\s+)*(class|interface|struct|enum|record)\s+([A-Za-z0-9_]+)(?:<[^>]*>)?(?:\s*:\s*([^{]+))?/,
		);
		if (typeDeclMatch) {
			const kind = typeDeclMatch[1] as "class" | "interface" | "struct" | "enum" | "record";
			const name = typeDeclMatch[2];
			const rawInherits = typeDeclMatch[3]
				? typeDeclMatch[3].split(",").map((s) => s.trim().replace(/\{$/, ""))
				: undefined;
			const isPublic = trimmed.includes("public");

			currentClass = { name, startLine: lineNum };
			classBraceDepth = braceDepth - openBraces;

			if (isPublic) exports.push(name);

			symbols.push({
				name,
				kind,
				line: lineNum,
				endLine: lineNum,
				signature: typeDeclMatch[0].replace(/\{$/, "").trim(),
				docstring: extractDocstringBefore(lines, i),
				exported: isPublic,
				inherits: rawInherits,
			});
			continue;
		}

		// 4. Methods / Constructors / Properties
		if (currentClass) {
			// Method match: public static byte[] CrearTrama(byte id, byte[] payload)
			const methodMatch = trimmed.match(
				/^(?:public\s+|internal\s+|protected\s+|private\s+|override\s+|virtual\s+|static\s+|async\s+)+([A-Za-z0-9_<>[\]?]+)\s+([A-Za-z0-9_]+)(?:<[^>]*>)?\s*\(([^)]*)\)/,
			);
			if (methodMatch && !["if", "for", "while", "switch", "catch", "using", "lock"].includes(methodMatch[2])) {
				const retType = methodMatch[1];
				const methodName = methodMatch[2];
				const fullName = `${currentClass.name}.${methodName}`;
				const isPublic = trimmed.startsWith("public");

				symbols.push({
					name: fullName,
					kind: "method",
					line: lineNum,
					endLine: lineNum,
					signature: `${retType} ${methodName}(${methodMatch[3]})`,
					docstring: extractDocstringBefore(lines, i),
					exported: isPublic,
					parent: currentClass.name,
					calls: extractCallsFromText(line),
				});
				continue;
			}

			// Property match: public int Status { get; set; }
			const propMatch = trimmed.match(
				/^(?:public\s+|internal\s+|protected\s+|private\s+|static\s+)+([A-Za-z0-9_<>[\]?]+)\s+([A-Za-z0-9_]+)\s*\{\s*(?:get|set)/,
			);
			if (propMatch) {
				const propName = propMatch[2];
				const fullName = `${currentClass.name}.${propName}`;
				symbols.push({
					name: fullName,
					kind: "variable",
					line: lineNum,
					endLine: lineNum,
					signature: `${propMatch[1]} ${propName} { get; set; }`,
					docstring: extractDocstringBefore(lines, i),
					exported: trimmed.startsWith("public"),
					parent: currentClass.name,
				});
			}
		}
	}

	return {
		filePath,
		language: "csharp",
		symbols,
		imports,
		exports,
	};
}

function parseGoAst(filePath: string, sourceText: string): FileAstResult {
	const lines = sourceText.split("\n");
	const symbols: CodeSymbol[] = [];
	const imports: Array<{ source: string; importedSymbols: string[] }> = [];
	const exports: string[] = [];

	let inImportBlock = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		const lineNum = i + 1;

		// 1. Package
		const pkgMatch = trimmed.match(/^package\s+([A-Za-z0-9_]+)/);
		if (pkgMatch) {
			symbols.push({
				name: pkgMatch[1],
				kind: "module",
				line: lineNum,
				endLine: lineNum,
				signature: pkgMatch[0],
				docstring: extractDocstringBefore(lines, i),
				exported: true,
			});
			continue;
		}

		// 2. Imports
		if (trimmed === "import (") {
			inImportBlock = true;
			continue;
		}
		if (inImportBlock) {
			if (trimmed === ")") {
				inImportBlock = false;
			} else {
				const impMatch = trimmed.match(/(?:([A-Za-z0-9_]+)\s+)?["']([^"']+)["']/);
				if (impMatch) {
					const source = impMatch[2];
					const alias = impMatch[1] || source.split("/").pop() || source;
					imports.push({ source, importedSymbols: [alias] });
				}
			}
			continue;
		}
		const singleImpMatch = trimmed.match(/^import\s+(?:([A-Za-z0-9_]+)\s+)?["']([^"']+)["']/);
		if (singleImpMatch) {
			const source = singleImpMatch[2];
			const alias = singleImpMatch[1] || source.split("/").pop() || source;
			imports.push({ source, importedSymbols: [alias] });
			continue;
		}

		// 3. Types (Struct & Interface)
		const typeMatch = trimmed.match(/^type\s+([A-Za-z0-9_]+)\s+(struct|interface)/);
		if (typeMatch) {
			const name = typeMatch[1];
			const kind = typeMatch[2] === "struct" ? "struct" : "interface";
			const isExported = /^[A-Z]/.test(name);
			if (isExported) exports.push(name);

			symbols.push({
				name,
				kind,
				line: lineNum,
				endLine: lineNum,
				signature: trimmed.replace(/\{$/, "").trim(),
				docstring: extractDocstringBefore(lines, i),
				exported: isExported,
			});
			continue;
		}

		// 4. Functions / Methods: func (s *Server) Start() error
		const funcMatch = trimmed.match(
			/^func\s+(?:\(([A-Za-z0-9_*\s]+)\)\s+)?([A-Za-z0-9_]+)\s*\(([^)]*)\)(?:\s*([^{]+))?/,
		);
		if (funcMatch) {
			const receiver = funcMatch[1]?.trim().split(/\s+/).pop()?.replace("*", "");
			const name = funcMatch[2];
			const fullName = receiver ? `${receiver}.${name}` : name;
			const isExported = /^[A-Z]/.test(name);
			if (isExported && !receiver) exports.push(name);

			symbols.push({
				name: fullName,
				kind: receiver ? "method" : "function",
				line: lineNum,
				endLine: lineNum,
				signature: funcMatch[0].replace(/\{$/, "").trim(),
				docstring: extractDocstringBefore(lines, i),
				exported: isExported,
				parent: receiver,
				calls: extractCallsFromText(line),
			});
		}
	}

	return {
		filePath,
		language: "go",
		symbols,
		imports,
		exports,
	};
}

function parseRustAst(filePath: string, sourceText: string): FileAstResult {
	const lines = sourceText.split("\n");
	const symbols: CodeSymbol[] = [];
	const imports: Array<{ source: string; importedSymbols: string[] }> = [];
	const exports: string[] = [];

	let currentImpl: string | undefined;
	let braceDepth = 0;
	let implBraceDepth = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		const lineNum = i + 1;

		const openBraces = (line.match(/\{/g) || []).length;
		const closeBraces = (line.match(/\}/g) || []).length;
		braceDepth += openBraces - closeBraces;

		if (currentImpl && braceDepth <= implBraceDepth) {
			currentImpl = undefined;
		}

		// 1. Use statements (Imports)
		const useMatch = trimmed.match(/^use\s+([A-Za-z0-9_:]+)(?:::\{([^}]+)\})?;/);
		if (useMatch) {
			const source = useMatch[1];
			const importedSymbols = useMatch[2]
				? useMatch[2].split(",").map((s) => s.trim())
				: [source.split("::").pop() || source];
			imports.push({ source, importedSymbols });
			continue;
		}

		// 2. Structs, Enums, Traits
		const structMatch = trimmed.match(/^(?:pub(?:\([^)]+\))?\s+)?(struct|enum|trait)\s+([A-Za-z0-9_]+)/);
		if (structMatch) {
			const kind = structMatch[1] === "trait" ? "trait" : structMatch[1] === "struct" ? "struct" : "enum";
			const name = structMatch[2];
			const isPub = trimmed.startsWith("pub");
			if (isPub) exports.push(name);

			symbols.push({
				name,
				kind,
				line: lineNum,
				endLine: lineNum,
				signature: trimmed.replace(/\{$/, "").trim(),
				docstring: extractDocstringBefore(lines, i),
				exported: isPub,
			});
			continue;
		}

		// 3. Impl blocks: impl MyTrait for MyStruct / impl MyStruct
		const implMatch = trimmed.match(/^impl(?:\s+<[^>]*>)?\s+(?:([A-Za-z0-9_:]+)\s+for\s+)?([A-Za-z0-9_:]+)/);
		if (implMatch) {
			const traitName = implMatch[1];
			const structName = implMatch[2];
			currentImpl = structName;
			implBraceDepth = braceDepth - openBraces;

			if (traitName) {
				const existing = symbols.find((s) => s.name === structName);
				if (existing) {
					existing.inherits = existing.inherits || [];
					if (!existing.inherits.includes(traitName)) existing.inherits.push(traitName);
				}
			}
			continue;
		}

		// 4. Functions / Methods: pub fn new(...) -> Self
		const fnMatch = trimmed.match(
			/^(?:pub(?:\([^)]+\))?\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)(?:\s*->\s*([^{]+))?/,
		);
		if (fnMatch) {
			const name = fnMatch[1];
			const fullName = currentImpl ? `${currentImpl}::${name}` : name;
			const isPub = trimmed.startsWith("pub");
			if (isPub && !currentImpl) exports.push(name);

			symbols.push({
				name: fullName,
				kind: currentImpl ? "method" : "function",
				line: lineNum,
				endLine: lineNum,
				signature: fnMatch[0].replace(/\{$/, "").trim(),
				docstring: extractDocstringBefore(lines, i),
				exported: isPub,
				parent: currentImpl,
				calls: extractCallsFromText(line),
			});
		}
	}

	return {
		filePath,
		language: "rust",
		symbols,
		imports,
		exports,
	};
}

function parseGenericStructuralAst(filePath: string, sourceText: string, language: string): FileAstResult {
	const lines = sourceText.split("\n");
	const symbols: CodeSymbol[] = [];
	const imports: Array<{ source: string; importedSymbols: string[] }> = [];
	const exports: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		const lineNum = i + 1;

		// Generic function match (Go, Rust, Java, C, etc.)
		const fnMatch = trimmed.match(
			/^(?:pub\s+|public\s+|export\s+|fn\s+|func\s+)?(?:async\s+)?(?:func|fn|function|def)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/,
		);
		if (fnMatch) {
			const name = fnMatch[1];
			symbols.push({
				name,
				kind: "function",
				line: lineNum,
				endLine: lineNum,
				signature: fnMatch[0],
				docstring: extractDocstringBefore(lines, i),
				exported: true,
				calls: extractCallsFromText(line),
			});
			exports.push(name);
		}
	}

	return {
		filePath,
		language,
		symbols,
		imports,
		exports,
	};
}
