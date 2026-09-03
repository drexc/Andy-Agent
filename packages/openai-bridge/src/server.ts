import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { GraftEngine } from "../../coding-agent/src/core/graft/index.js";
import { createChunk, createFullResponse, extractUserPrompt, formatDone, formatSseChunk } from "./adapter.js";
import { SessionPool } from "./session-pool.js";
import type { BridgeServerOptions, OpenAIChatCompletionRequest, OpenAIModelListResponse } from "./types.js";

export class OpenAiBridgeServer {
	private server: Server;
	private pool: SessionPool;
	private graft: GraftEngine;
	private options: BridgeServerOptions;

	constructor(options: BridgeServerOptions = {}) {
		this.options = options;
		this.pool = new SessionPool(options);
		this.graft = new GraftEngine(options.cwd || process.cwd());
		this.server = createServer(this.handleRequest.bind(this));
	}

	public start(port = this.options.port || 3000, host = this.options.host || "0.0.0.0"): Promise<number> {
		return new Promise((resolve, reject) => {
			const listenOptions = host && host !== "0.0.0.0" ? { port, host } : { port };

			this.server.listen(listenOptions, () => {
				const addr = this.server.address();
				const actualPort = typeof addr === "object" && addr ? addr.port : port;
				console.log(`\n========================================================`);
				console.log(`🚀 Andy Agent OpenAI Bridge is RUNNING`);
				console.log(`========================================================`);
				console.log(`📍 Status & Health:     http://localhost:${actualPort}/health`);
				console.log(`📍 OpenAI Base URL:     http://localhost:${actualPort}/v1`);
				console.log(`📍 Available Models:    http://localhost:${actualPort}/v1/models`);
				console.log(`📍 Chat Completions:    http://localhost:${actualPort}/v1/chat/completions`);
				console.log(`========================================================\n`);
				resolve(actualPort);
			});
			this.server.on("error", reject);
		});
	}

	public stop(): Promise<void> {
		this.pool.dispose();
		return new Promise((resolve) => {
			this.server.close(() => resolve());
		});
	}

	private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const startMs = Date.now();
		const method = req.method || "GET";
		const parsedUrl = new URL(req.url || "/", "http://localhost");
		const pathname = parsedUrl.pathname;
		const url = pathname;

		// Set CORS headers
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "*");

		if (method === "OPTIONS") {
			res.writeHead(204);
			res.end();
			return;
		}

		// Auth check if configured
		if (this.options.apiKey) {
			const authHeader = req.headers.authorization;
			const expected = `Bearer ${this.options.apiKey}`;
			if (!authHeader || authHeader !== expected) {
				res.writeHead(401, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: { message: "Unauthorized", type: "invalid_request_error" } }));
				console.log(`[Bridge] ${method} ${url} - 401 Unauthorized`);
				return;
			}
		}

		try {
			if (method === "GET" && (url === "/" || url === "/health" || url === "/v1" || url === "/v1/")) {
				const models = this.pool.getAvailableModels();
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify(
						{
							status: "ok",
							name: "Andy Agent OpenAI Bridge",
							version: "0.9.0",
							totalAvailableModels: models.length,
							defaultModel: this.options.defaultModel || "auto/best-coding",
							endpoints: {
								health: "/health",
								models: "/v1/models",
								chatCompletions: "/v1/chat/completions",
								resetSession: "/v1/sessions/reset",
								graftMap: "/v1/graft/map",
								graftSkeleton: "/v1/graft/skeleton?file=path",
								graftCallers: "/v1/graft/callers?symbol=name",
								graftBlast: "/v1/graft/blast?target=name",
								graftGrep: "/v1/graft/grep?q=query",
								graftAsk: "/v1/graft/ask?q=question",
							},
						},
						null,
						2,
					),
				);
				console.log(`[Bridge] ${method} ${url} - 200 OK (${Date.now() - startMs}ms)`);
				return;
			}

			// --- GRAFT REST ENDPOINTS ---
			if (method === "GET" && (pathname === "/v1/graft/map" || pathname === "/graft/map")) {
				const map = await this.graft.map();
				res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
				res.end(map);
				console.log(`[Bridge] ${method} ${url} - 200 OK (${Date.now() - startMs}ms)`);
				return;
			}

			if (method === "GET" && (pathname === "/v1/graft/skeleton" || pathname === "/graft/skeleton")) {
				const file = parsedUrl.searchParams.get("file") || "";
				if (!file) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Query parameter 'file' is required" }));
					return;
				}
				const skel = await this.graft.skeleton(file);
				res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
				res.end(skel);
				console.log(`[Bridge] ${method} ${url} - 200 OK (${Date.now() - startMs}ms)`);
				return;
			}

			if (method === "GET" && (pathname === "/v1/graft/callers" || pathname === "/graft/callers")) {
				const symbol = parsedUrl.searchParams.get("symbol") || "";
				const callers = await this.graft.callers(symbol);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ symbol, callers, total: callers.length }, null, 2));
				console.log(`[Bridge] ${method} ${url} - 200 OK (${Date.now() - startMs}ms)`);
				return;
			}

			if (method === "GET" && (pathname === "/v1/graft/blast" || pathname === "/graft/blast")) {
				const target = parsedUrl.searchParams.get("target") || "";
				const blast = await this.graft.blast(target);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(blast, null, 2));
				console.log(`[Bridge] ${method} ${url} - 200 OK (${Date.now() - startMs}ms)`);
				return;
			}

			if (method === "GET" && (pathname === "/v1/graft/grep" || pathname === "/graft/grep")) {
				const q = parsedUrl.searchParams.get("q") || "";
				const grepResult = await this.graft.grep(q);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify(
						{ query: q, totalMatches: grepResult.totalMatches, formatted: grepResult.formatted },
						null,
						2,
					),
				);
				console.log(`[Bridge] ${method} ${url} - 200 OK (${Date.now() - startMs}ms)`);
				return;
			}

			if (method === "GET" && (pathname === "/v1/graft/ask" || pathname === "/graft/ask")) {
				const q = parsedUrl.searchParams.get("q") || "";
				const askResult = await this.graft.ask(q);
				res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
				res.end(askResult);
				console.log(`[Bridge] ${method} ${url} - 200 OK (${Date.now() - startMs}ms)`);
				return;
			}

			if (method === "GET" && (url === "/v1/models" || url === "/models")) {
				await this.handleListModels(res);
				console.log(`[Bridge] ${method} ${url} - 200 OK (${Date.now() - startMs}ms)`);
				return;
			}

			if (method === "POST" && (url === "/v1/chat/completions" || url === "/chat/completions")) {
				await this.handleChatCompletions(req, res);
				console.log(`[Bridge] ${method} ${url} - 200 OK (${Date.now() - startMs}ms)`);
				return;
			}

			if (method === "POST" && url === "/v1/sessions/reset") {
				const body = await this.readJsonBody<any>(req);
				const sessionId = body?.sessionId || (req.headers["x-session-id"] as string) || "default";
				await this.pool.resetSession(sessionId);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, sessionId }));
				console.log(`[Bridge] ${method} ${url} - Session ${sessionId} reset`);
				return;
			}

			res.writeHead(404, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: { message: `Route not found: ${method} ${url}`, code: 404 } }));
			console.log(`[Bridge] ${method} ${url} - 404 Not Found`);
		} catch (error: any) {
			console.error(`[Bridge Error] ${method} ${url}:`, error);
			if (!res.headersSent) {
				res.writeHead(500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: { message: error.message || String(error) } }));
			}
		}
	}

	private async handleListModels(res: ServerResponse): Promise<void> {
		const models = this.pool.getAvailableModels();
		const response: OpenAIModelListResponse = {
			object: "list",
			data: models.map((m) => ({
				id: m.id,
				object: "model",
				created: Math.floor(Date.now() / 1000),
				owned_by: m.provider || "andy-agent",
				root: m.id,
				parent: null,
			})),
		};

		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify(response, null, 2));
	}

	private async handleChatCompletions(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const body = await this.readJsonBody<OpenAIChatCompletionRequest>(req);
		if (!body || !body.messages || !Array.isArray(body.messages)) {
			res.writeHead(400, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: { message: "Invalid request: 'messages' array is required." } }));
			return;
		}

		const isStream = body.stream === true;
		const reqId = `chatcmpl-${randomUUID()}`;
		const sessionId = (req.headers["x-session-id"] as string) || body.user || "default";
		const customCwd = req.headers["x-cwd"] as string | undefined;

		const { session, resolvedModel } = await this.pool.getOrCreateSession({
			sessionId,
			modelId: body.model,
			cwd: customCwd,
		});

		const { prompt } = extractUserPrompt(body.messages);
		const modelId = resolvedModel.id;

		console.log(`[Bridge] Incoming prompt for model "${modelId}" (session: ${sessionId}, stream: ${isStream})`);

		if (isStream) {
			res.writeHead(200, {
				"Content-Type": "text/event-stream; charset=utf-8",
				"Cache-Control": "no-cache, no-transform",
				Connection: "keep-alive",
				"X-Accel-Buffering": "no",
			});

			// Initial chunk indicating role
			res.write(
				formatSseChunk({
					id: reqId,
					object: "chat.completion.chunk",
					created: Math.floor(Date.now() / 1000),
					model: modelId,
					choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
				}),
			);

			let isAborted = false;
			const onClientClose = () => {
				isAborted = true;
				session.abort().catch(() => {});
			};
			req.on("close", onClientClose);

			let lastAssistantTextLength = 0;

			const unsubscribe = session.subscribe((event: any) => {
				if (isAborted || res.writableEnded) return;

				try {
					// Handle streaming text updates
					if (event.type === "message_update") {
						const msg = event.message;
						if (msg && msg.role === "assistant") {
							// If content has text parts
							if (Array.isArray(msg.content)) {
								let currentFullText = "";
								for (const part of msg.content) {
									if (part.type === "text") {
										currentFullText += part.text || "";
									}
								}

								if (currentFullText.length > lastAssistantTextLength) {
									const delta = currentFullText.slice(lastAssistantTextLength);
									lastAssistantTextLength = currentFullText.length;
									res.write(formatSseChunk(createChunk(reqId, modelId, delta, null)));
								}
							}
						}
					}

					// Handle tool executions (e.g. IPython REPL code execution)
					if (event.type === "tool_execution_start") {
						const toolName = event.toolName || "tool";
						const toolArgs = event.args ? JSON.stringify(event.args, null, 2) : "";
						const toolCallMsg = `\n\n> ⚙️ **[Andy Agent Executing: ${toolName}]**\n\`\`\`python\n${toolArgs}\n\`\`\`\n\n`;
						res.write(formatSseChunk(createChunk(reqId, modelId, toolCallMsg, null)));
					}

					if (event.type === "tool_execution_end") {
						const result = event.result?.content || event.result;
						const resultStr = typeof result === "string" ? result : JSON.stringify(result, null, 2);
						if (resultStr && resultStr.length > 0) {
							const toolResultMsg = `> 📄 **Output:**\n\`\`\`\n${resultStr.slice(0, 500)}${resultStr.length > 500 ? "...(truncated)" : ""}\n\`\`\`\n\n`;
							res.write(formatSseChunk(createChunk(reqId, modelId, toolResultMsg, null)));
						}
					}
				} catch (e) {
					console.error("[Bridge Event Handling Error]:", e);
				}
			});

			try {
				await session.prompt(prompt);
			} catch (err: any) {
				if (!isAborted) {
					res.write(
						formatSseChunk(
							createChunk(reqId, modelId, `\n\n⚠️ **Execution Error**: ${err.message || String(err)}\n`, null),
						),
					);
				}
			} finally {
				unsubscribe();
				req.off("close", onClientClose);
				if (!res.writableEnded) {
					res.write(formatSseChunk(createChunk(reqId, modelId, "", "stop")));
					res.write(formatDone());
					res.end();
				}
			}
		} else {
			// Non-streaming JSON response
			let accumulatedText = "";
			let lastAssistantLength = 0;

			const unsubscribe = session.subscribe((event: any) => {
				if (event.type === "message_update") {
					const msg = event.message;
					if (msg && msg.role === "assistant" && Array.isArray(msg.content)) {
						let currentFullText = "";
						for (const part of msg.content) {
							if (part.type === "text") {
								currentFullText += part.text || "";
							}
						}
						if (currentFullText.length > lastAssistantLength) {
							accumulatedText += currentFullText.slice(lastAssistantLength);
							lastAssistantLength = currentFullText.length;
						}
					}
				}
			});

			try {
				await session.prompt(prompt);
			} finally {
				unsubscribe();
			}

			const fullResponse = createFullResponse(reqId, modelId, accumulatedText || "(Done)");
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify(fullResponse, null, 2));
		}
	}

	private readJsonBody<T>(req: IncomingMessage): Promise<T | null> {
		return new Promise((resolve, reject) => {
			let data = "";
			req.setEncoding("utf8");
			req.on("data", (chunk) => {
				data += chunk;
				if (data.length > 20 * 1024 * 1024) {
					reject(new Error("Request body payload too large (max 20MB)"));
				}
			});
			req.on("end", () => {
				if (!data.trim()) {
					resolve(null);
					return;
				}
				try {
					resolve(JSON.parse(data) as T);
				} catch (err) {
					reject(new Error(`Malformed JSON in request body: ${err}`));
				}
			});
			req.on("error", reject);
		});
	}
}
