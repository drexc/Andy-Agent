import { zigQuery } from "../queries";
import { sampleZig } from "./fixtures/sample-zig";
import { inspectTreeStructure, testParseSourceCodeDefinitions } from "./helpers";

describe("Zig Tree-sitter Parser", () => {
	it("should inspect tree structure", async () => {
		await inspectTreeStructure(sampleZig, "zig");
	});

	it("should parse source code definitions", async () => {
		const result = await testParseSourceCodeDefinitions("file.zig", sampleZig, {
			language: "zig",
			wasmFile: "tree-sitter-zig.wasm",
			queryString: zigQuery,
			extKey: "zig",
		});
		expect(result).toBeDefined();
	});
});
