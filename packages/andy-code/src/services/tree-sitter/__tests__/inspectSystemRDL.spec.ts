import systemrdlQuery from "../queries/systemrdl";
import sampleSystemRDLContent from "./fixtures/sample-systemrdl";
import { debugLog, inspectTreeStructure, testParseSourceCodeDefinitions } from "./helpers";

describe("inspectSystemRDL", () => {
	const testOptions = {
		language: "systemrdl",
		wasmFile: "tree-sitter-systemrdl.wasm",
		queryString: systemrdlQuery,
		extKey: "rdl",
	};

	it("should inspect SystemRDL tree structure", async () => {
		const result = await inspectTreeStructure(sampleSystemRDLContent, "systemrdl");
		expect(result).toBeDefined();
	});

	it("should parse SystemRDL definitions", async () => {
		const result = await testParseSourceCodeDefinitions("test.rdl", sampleSystemRDLContent, testOptions);
		expect(result).toBeDefined();
		debugLog("SystemRDL parse result:", result);
	});
});
