#!/usr/bin/env node
import { OpenAiBridgeServer } from "./server.js";
import type { BridgeServerOptions } from "./types.js";

function parseCliArgs(): BridgeServerOptions {
	const args = process.argv.slice(2);
	const options: BridgeServerOptions = {
		port: Number(process.env.PORT) || 3000,
		host: process.env.HOST || "0.0.0.0",
		cwd: process.env.ANDY_AGENT_CWD || process.env.PRIME_AGENT_CWD || process.cwd(),
		defaultProvider:
			process.env.ANDY_AGENT_DEFAULT_PROVIDER || process.env.PRIME_AGENT_DEFAULT_PROVIDER || "omniroute",
		defaultModel: process.env.ANDY_AGENT_DEFAULT_MODEL || process.env.PRIME_AGENT_DEFAULT_MODEL || "auto/best-coding",
		apiKey: process.env.BRIDGE_API_KEY || undefined,
		verbose: false,
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--port" || arg === "-p") {
			options.port = Number(args[++i]);
		} else if (arg === "--host" || arg === "-h") {
			options.host = args[++i];
		} else if (arg === "--cwd") {
			options.cwd = args[++i];
		} else if (arg === "--provider") {
			options.defaultProvider = args[++i];
		} else if (arg === "--model" || arg === "-m") {
			options.defaultModel = args[++i];
		} else if (arg === "--api-key") {
			options.apiKey = args[++i];
		} else if (arg === "--verbose" || arg === "-v") {
			options.verbose = true;
		} else if (arg === "--help") {
			console.log(`
Andy Agent - OpenAI-Compatible API Bridge Server

Usage:
  npx tsx packages/openai-bridge/src/cli.ts [options]

Options:
  -p, --port <number>      Port to listen on (default: 3000 or $PORT)
  -h, --host <string>      Host interface to bind (default: 0.0.0.0 or $HOST)
  --cwd <path>             Working directory for code operations (default: current directory)
  --provider <name>        Default model provider (default: omniroute)
  -m, --model <id>         Default model ID (default: auto/best-coding)
  --api-key <key>          Require this Bearer API key for requests to the bridge
  -v, --verbose            Log verbose request and prompt diagnostics
  --help                   Show this help message

Endpoints:
  GET  /health             Health check status
  GET  /v1/models          List available models from Prime Agent
  POST /v1/chat/completions Standard OpenAI Chat Completion (streaming & non-streaming)
  POST /v1/sessions/reset  Reset an active session

Example:
  npx tsx packages/openai-bridge/src/cli.ts --port 3000 --provider omniroute --model auto/best-coding
`);
			process.exit(0);
		}
	}

	return options;
}

async function main(): Promise<void> {
	const options = parseCliArgs();
	const server = new OpenAiBridgeServer(options);

	const cleanup = async () => {
		console.log("\n[Prime Agent OpenAI Bridge] Shutting down...");
		await server.stop();
		process.exit(0);
	};

	process.on("SIGINT", cleanup);
	process.on("SIGTERM", cleanup);

	await server.start(options.port, options.host);
}

main().catch((err) => {
	console.error("[Prime Agent OpenAI Bridge] Startup failed:", err);
	process.exit(1);
});
