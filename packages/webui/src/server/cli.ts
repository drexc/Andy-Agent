#!/usr/bin/env node
import { parseArgs } from "node:util";
import { AndyWebUiServer } from "./index.js";

async function main() {
	const { values } = parseArgs({
		options: {
			port: { type: "string", short: "p", default: "3000" },
			host: { type: "string", short: "h", default: "0.0.0.0" },
			cwd: { type: "string", default: process.cwd() },
			apiKey: { type: "string" },
			help: { type: "boolean" },
		},
		allowPositionals: true,
	});

	if (values.help) {
		console.log(`
Andy Agent WebUI Server 🚀
Usage:
  npx @andy-agent/webui [options]
  npm run webui

Options:
  -p, --port <number>    Port to listen on (default: 3000)
  -h, --host <string>    Host to bind to (default: 0.0.0.0)
      --cwd <path>       Root working directory (default: process.cwd())
      --apiKey <key>     Optional API key for authentication
      --help             Show this help message
`);
		process.exit(0);
	}

	const port = Number.parseInt(values.port || "3000", 10);
	const host = values.host || "0.0.0.0";
	const cwd = values.cwd || process.cwd();
	const apiKey = values.apiKey;

	const server = new AndyWebUiServer({ port, host, cwd, apiKey });
	await server.start(port, host);

	const cleanup = async () => {
		console.log("\nStopping Andy WebUI server...");
		await server.stop();
		process.exit(0);
	};

	process.on("SIGINT", cleanup);
	process.on("SIGTERM", cleanup);
}

main().catch((err) => {
	console.error("Fatal error starting Andy WebUI:", err);
	process.exit(1);
});
