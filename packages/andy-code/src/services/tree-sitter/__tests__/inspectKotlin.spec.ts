import { kotlinQuery } from "../queries";
import sampleKotlinContent from "./fixtures/sample-kotlin";
import { inspectTreeStructure, testParseSourceCodeDefinitions } from "./helpers";

describe("inspectKotlin", () => {
	const testOptions = {
		language: "kotlin",
		wasmFile: "tree-sitter-kotlin.wasm",
		queryString: kotlinQuery,
		extKey: "kt",
	};

	it("should inspect Kotlin tree structure", async () => {
		await inspectTreeStructure(sampleKotlinContent, "kotlin");
	});

	it("should parse Kotlin definitions", async () => {
		await testParseSourceCodeDefinitions("test.kt", sampleKotlinContent, testOptions);
	});
});
