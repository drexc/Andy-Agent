/**
 * Lightweight Static Diagnostics & Auto-Fix Engine
 * Multi-language static syntax checker, structural validator and automated refactoring advisor.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export interface CodeDiagnostic {
	file: string;
	line: number;
	column: number;
	severity: "error" | "warning" | "info";
	message: string;
	rule: string;
	fixSuggestion?: string;
}

export interface DiagnosticsSummary {
	totalFilesChecked: number;
	errorCount: number;
	warningCount: number;
	infoCount: number;
	diagnostics: CodeDiagnostic[];
	clean: boolean;
}

export interface CycleFixProposal {
	cycle: string[];
	weakestLink: { from: string; to: string };
	strategy: string;
	rationale: string;
	steps: string[];
}

export class DiagnosticsEngine {
	private readonly rootDir: string;
	private readonly ignoreDirs = new Set([
		"node_modules",
		".git",
		"dist",
		"build",
		".next",
		"bin",
		"obj",
		"target",
		"vendor",
		".venv",
		"__pycache__",
		".andy",
		".prime",
	]);

	constructor(rootDir: string) {
		this.rootDir = path.resolve(rootDir);
	}

	public analyzeProject(): DiagnosticsSummary {
		const files = this.scanFiles(this.rootDir);
		const diagnostics: CodeDiagnostic[] = [];

		for (const absPath of files) {
			const relPath = path.relative(this.rootDir, absPath).replace(/\\/g, "/");
			try {
				const content = readFileSync(absPath, "utf-8");
				this.checkFile(relPath, content, diagnostics);
			} catch (e: any) {
				diagnostics.push({
					file: relPath,
					line: 1,
					column: 1,
					severity: "error",
					message: `No se pudo leer el archivo: ${e.message}`,
					rule: "file-read-error",
				});
			}
		}

		const errorCount = diagnostics.filter((d) => d.severity === "error").length;
		const warningCount = diagnostics.filter((d) => d.severity === "warning").length;
		const infoCount = diagnostics.filter((d) => d.severity === "info").length;

		return {
			totalFilesChecked: files.length,
			errorCount,
			warningCount,
			infoCount,
			diagnostics,
			clean: errorCount === 0 && warningCount === 0,
		};
	}

	private checkFile(file: string, content: string, diagnostics: CodeDiagnostic[]): void {
		const ext = path.extname(file).toLowerCase();

		// 1. JSON Syntax Validation
		if (ext === ".json") {
			try {
				JSON.parse(content);
			} catch (e: any) {
				const match = e.message.match(/position (\d+)/i);
				let line = 1;
				let col = 1;
				if (match) {
					const pos = Number.parseInt(match[1], 10);
					const sub = content.slice(0, pos);
					line = sub.split("\n").length;
					col = sub.length - sub.lastIndexOf("\n");
				}
				diagnostics.push({
					file,
					line,
					column: col,
					severity: "error",
					message: `Error de sintaxis JSON: ${e.message}`,
					rule: "json-syntax",
					fixSuggestion: "Verifica que no sobren comas finales o que las comillas sean dobles.",
				});
			}
			return;
		}

		const lines = content.split(/\r?\n/);

		// 2. Bracket / Brace / Parenthesis Balance for C#, TS, JS, Go, Rust
		if ([".ts", ".tsx", ".js", ".jsx", ".cs", ".go", ".rs", ".c", ".cpp"].includes(ext)) {
			this.checkBraceBalance(file, lines, diagnostics);
		}

		// 3. Python specific syntax heuristics
		if (ext === ".py") {
			this.checkPythonSyntax(file, lines, diagnostics);
		}

		// 4. Generic file hygiene
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.length > 500 && !file.endsWith(".min.js")) {
				diagnostics.push({
					file,
					line: i + 1,
					column: 1,
					severity: "info",
					message: `Línea excesivamente larga (${line.length} caracteres).`,
					rule: "line-length",
				});
			}
			// Check for conflict markers
			if (line.startsWith("<<<<<<< ") || line.startsWith("=======") || line.startsWith(">>>>>>> ")) {
				diagnostics.push({
					file,
					line: i + 1,
					column: 1,
					severity: "error",
					message: "Marcador de conflicto de fusión Git detectado.",
					rule: "git-conflict-marker",
					fixSuggestion: "Resuelve el conflicto de Git eliminando los marcadores.",
				});
			}
		}
	}

	private checkBraceBalance(file: string, lines: string[], diagnostics: CodeDiagnostic[]): void {
		const stack: Array<{ char: string; line: number; col: number }> = [];
		const pairs: Record<string, string> = { "}": "{", ")": "(", "]": "[" };

		for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
			const line = lines[lineIdx];
			let inString: string | null = null;
			const inComment = false;

			for (let colIdx = 0; colIdx < line.length; colIdx++) {
				const ch = line[colIdx];
				const next = line[colIdx + 1];

				if (inComment) continue;

				if (!inString && ch === "/" && next === "/") {
					break; // Rest of line is comment
				}

				if (ch === '"' || ch === "'" || ch === "`") {
					if (!inString) inString = ch;
					else if (inString === ch && line[colIdx - 1] !== "\\") inString = null;
					continue;
				}

				if (inString) continue;

				if (ch === "{" || ch === "(" || ch === "[") {
					stack.push({ char: ch, line: lineIdx + 1, col: colIdx + 1 });
				} else if (ch === "}" || ch === ")" || ch === "]") {
					const expected = pairs[ch];
					if (stack.length === 0) {
						diagnostics.push({
							file,
							line: lineIdx + 1,
							column: colIdx + 1,
							severity: "error",
							message: `Símbolo de cierre '${ch}' inesperado sin apertura previa.`,
							rule: "unmatched-closing-bracket",
						});
					} else {
						const top = stack.pop();
						if (top && top.char !== expected) {
							diagnostics.push({
								file,
								line: lineIdx + 1,
								column: colIdx + 1,
								severity: "error",
								message: `Discrepancia de llaves: se cerró '${ch}' pero se esperaba cerrar '${top.char}' abierto en L${top.line}.`,
								rule: "mismatched-bracket",
							});
						}
					}
				}
			}
		}

		if (stack.length > 0) {
			const unclosed = stack[stack.length - 1];
			diagnostics.push({
				file,
				line: unclosed.line,
				column: unclosed.col,
				severity: "error",
				message: `El bloque iniciado con '${unclosed.char}' no fue cerrado al final del archivo.`,
				rule: "unclosed-bracket",
				fixSuggestion: `Agrega el cierre correspondiente al final del bloque.`,
			});
		}
	}

	private checkPythonSyntax(file: string, lines: string[], diagnostics: CodeDiagnostic[]): void {
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;

			// Missing colon in python control structures
			const blockHeadRegex =
				/^(?:def\s+\w+\s*\(.*?\)|class\s+\w+.*|if\s+.*|elif\s+.*|else|for\s+.*|while\s+.*|try|except.*|finally|with\s+.*)$/;
			if (blockHeadRegex.test(trimmed) && !trimmed.endsWith(":")) {
				diagnostics.push({
					file,
					line: i + 1,
					column: line.length,
					severity: "error",
					message: `Falta ':' al final de la declaración en Python: "${trimmed}"`,
					rule: "python-missing-colon",
					fixSuggestion: "Añade ':' al final de la línea.",
				});
			}
		}
	}

	public suggestCycleFix(cycle: string[]): CycleFixProposal {
		if (cycle.length < 2) {
			return {
				cycle,
				weakestLink: { from: "", to: "" },
				strategy: "Sin ciclo",
				rationale: "La lista proporcionada no contiene un bucle válido.",
				steps: [],
			};
		}

		const from = cycle[0];
		const to = cycle[1];
		const ext = path.extname(from).toLowerCase();
		const baseDir = path.dirname(from);
		const sharedName = ext === ".cs" ? "ICommonTypes.cs" : "shared-types.ts";

		return {
			cycle,
			weakestLink: { from, to },
			strategy: `Patrón Inversión de Dependencias (DIP) / Extracción de Módulo Común`,
			rationale: `El módulo '${from}' importa directamente a '${to}', el cual a su vez depende de la cadena hacia '${cycle[cycle.length - 1]}'. Al extraer los contratos compartidos a un nuevo módulo '${sharedName}', se elimina la dependencia bidireccional.`,
			steps: [
				`1. Crear el archivo común: '${path.join(baseDir, sharedName).replace(/\\/g, "/")}'`,
				`2. Mover las interfaces o tipos compartidos entre '${from}' y '${to}' hacia '${sharedName}'.`,
				`3. Actualizar los imports en '${from}' y '${to}' para importar desde '${sharedName}'.`,
				`4. Ejecutar el linter y compilador para verificar la resolución limpia del ciclo.`,
			],
		};
	}

	private scanFiles(dir: string): string[] {
		const results: string[] = [];
		try {
			const entries = readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				if (this.ignoreDirs.has(entry.name) || entry.name.startsWith(".")) continue;
				const full = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					results.push(...this.scanFiles(full));
				} else if (entry.isFile()) {
					const ext = path.extname(entry.name).toLowerCase();
					if ([".ts", ".tsx", ".js", ".jsx", ".cs", ".go", ".rs", ".py", ".json", ".md"].includes(ext)) {
						try {
							const stat = statSync(full);
							if (stat.size < 1_500_000) {
								results.push(full);
							}
						} catch {}
					}
				}
			}
		} catch {}
		return results;
	}
}
