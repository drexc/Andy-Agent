import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Type } from "typebox";
import type { ToolDefinition } from "../extensions/types.js";

const ReadFileSchema = Type.Object({
	filePath: Type.Optional(Type.String({ description: "Path to the file to read" })),
	path: Type.Optional(Type.String({ description: "Alias for filePath" })),
	offset: Type.Optional(Type.Number({ description: "1-based line number to start reading from" })),
	limit: Type.Optional(Type.Number({ description: "Maximum number of lines to read" })),
});

const WriteFileSchema = Type.Object({
	filePath: Type.Optional(Type.String({ description: "Path to the file to write" })),
	path: Type.Optional(Type.String({ description: "Alias for filePath" })),
	content: Type.String({ description: "Content to write into the file" }),
});

export function createReadToolDefinition(
	cwd: string = process.cwd(),
): ToolDefinition<typeof ReadFileSchema, { linesCount: number }> {
	return {
		name: "read",
		label: "read",
		description: "Read the contents of a file from disk with optional line offset and limit.",
		parameters: ReadFileSchema,
		execute: async (_toolCallId, params) => {
			const targetPath = params.filePath || params.path;
			if (!targetPath) {
				return {
					content: [{ type: "text", text: "Error: Must specify filePath or path parameter." }],
					details: { linesCount: 0 },
				};
			}

			const fullPath = path.isAbsolute(targetPath) ? targetPath : path.resolve(cwd, targetPath);
			if (!existsSync(fullPath)) {
				return {
					content: [{ type: "text", text: `Error: File not found at "${fullPath}"` }],
					details: { linesCount: 0 },
				};
			}

			try {
				const content = readFileSync(fullPath, "utf-8");
				const lines = content.split(/\r?\n/);
				const offset = Math.max(1, params.offset ?? 1);
				const limit = params.limit ?? lines.length;

				const slicedLines = lines.slice(offset - 1, offset - 1 + limit);
				const formatted = slicedLines.map((line, idx) => `${offset + idx} | ${line}`).join("\n");

				return {
					content: [{ type: "text", text: formatted || "(Empty file)" }],
					details: { linesCount: slicedLines.length },
				};
			} catch (err: any) {
				return {
					content: [{ type: "text", text: `Error reading file: ${err.message || String(err)}` }],
					details: { linesCount: 0 },
				};
			}
		},
	};
}

export function createWriteToolDefinition(
	cwd: string = process.cwd(),
): ToolDefinition<typeof WriteFileSchema, { success: boolean }> {
	return {
		name: "write",
		label: "write",
		description: "Write or create a file on disk with the given content.",
		parameters: WriteFileSchema,
		execute: async (_toolCallId, params) => {
			const targetPath = params.filePath || params.path;
			if (!targetPath) {
				return {
					content: [{ type: "text", text: "Error: Must specify filePath or path parameter." }],
					details: { success: false },
				};
			}

			const fullPath = path.isAbsolute(targetPath) ? targetPath : path.resolve(cwd, targetPath);
			try {
				const dir = path.dirname(fullPath);
				if (!existsSync(dir)) {
					mkdirSync(dir, { recursive: true });
				}
				writeFileSync(fullPath, params.content, "utf-8");
				return {
					content: [{ type: "text", text: `Successfully wrote ${params.content.length} bytes to ${fullPath}` }],
					details: { success: true },
				};
			} catch (err: any) {
				return {
					content: [{ type: "text", text: `Error writing file: ${err.message || String(err)}` }],
					details: { success: false },
				};
			}
		},
	};
}
