import { GraftEngine } from "./index.js";

async function main() {
	const graft = new GraftEngine(".");

	console.log("=== TEST 1: GRAFT MAP ===");
	const map = await graft.map();
	console.log(map.slice(0, 400));

	console.log("\n=== TEST 2: GRAFT SKELETON ===");
	const skel = await graft.skeleton("packages/coding-agent/src/core/graft/index.ts");
	console.log(skel);

	console.log("\n=== TEST 3: GRAFT GREP (query: createAgentSession) ===");
	const grep = await graft.grep("createAgentSession");
	console.log(grep.formatted.slice(0, 450));

	console.log("\n=== TEST 4: GRAFT CALLERS (symbol: createChunk) ===");
	const callers = await graft.callers("createChunk");
	console.log(JSON.stringify(callers, null, 2));

	console.log("\n=== TEST 5: GRAFT BLAST RADIUS (target: packages/openai-bridge/src/types.ts) ===");
	const blast = await graft.blast("packages/openai-bridge/src/types.ts");
	console.log(JSON.stringify(blast, null, 2));

	console.log("\n=== TEST 6: GRAFT ASK ===");
	const ask = await graft.ask("How does the OpenAI bridge handle streaming SSE chunks?");
	console.log(ask.slice(0, 600));

	console.log("\n🎉 ALL GRAFT TESTS COMPLETED SUCCESSFULLY!");
}

main().catch(console.error);
