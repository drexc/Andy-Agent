import { tomlQuery } from "../queries";
import { sampleToml } from "./fixtures/sample-toml";
import { inspectTreeStructure, testParseSourceCodeDefinitions } from "./helpers";

describe("inspectTOML", () => {
	const testOptions = {
		language: "toml",
		wasmFile: "tree-sitter-toml.wasm",
		queryString: tomlQuery,
		extKey: "toml",
	};

	it("should inspect TOML tree structure", async () => {
		await inspectTreeStructure(sampleToml, "toml");
	});

	it("should parse TOML definitions", async () => {
		await testParseSourceCodeDefinitions("test.toml", sampleToml, testOptions);
	});
});
