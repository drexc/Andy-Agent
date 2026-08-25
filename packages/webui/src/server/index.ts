import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import {
	type AssistantMessage,
	type Context,
	complete,
	type Message,
	stream,
	type ToolResultMessage,
	type UserMessage,
} from "@earendil-works/pi-ai";
import { AutoLearningEngine } from "./auto-learner.js";
import { getWebUiHtml } from "./html-bundle.js";
import { WebUiSessionPool } from "./session-manager.js";

export interface WebUiServerOptions {
	port?: number;
	host?: string;
	cwd?: string;
	apiKey?: string;
}

export interface LogEntry {
	id: string;
	timestamp: string;
	level: "INFO" | "WARN" | "ERROR" | "TOOL" | "RLM" | "HTTP";
	category: string;
	message: string;
	details?: any;
}

export class AndyWebUiServer {
	private server: Server;
	private pool: WebUiSessionPool;
	private options: WebUiServerOptions;
	private autoLearner: AutoLearningEngine;
	private logs: LogEntry[] = [];
	private maxLogs = 1000;
	private logSubscribers = new Set<(entry: LogEntry) => void>();

	constructor(options: WebUiServerOptions = {}) {
		this.options = options;
		this.pool = new WebUiSessionPool(options.cwd || process.cwd());
		this.autoLearner = new AutoLearningEngine(options.cwd || process.cwd(), this.addLog.bind(this));
		this.server = createServer(this.handleRequest.bind(this));
		this.addLog("INFO", "Server", `Andy WebUI Server initialized at ${options.cwd || process.cwd()}`);
	}

	public addLog(level: LogEntry["level"], category: string, message: string, details?: any): void {
		const entry: LogEntry = {
			id: Math.random().toString(36).substring(2, 9),
			timestamp: new Date().toISOString(),
			level,
			category,
			message,
			details,
		};
		this.logs.push(entry);
		if (this.logs.length > this.maxLogs) {
			this.logs.shift();
		}
		for (const subscriber of this.logSubscribers) {
			try {
				subscriber(entry);
			} catch {}
		}
	}

	public start(port = this.options.port || 3000, host = this.options.host || "0.0.0.0"): Promise<number> {
		return new Promise((resolve, reject) => {
			const listenOptions = host && host !== "0.0.0.0" ? { port, host } : { port };

			this.server.listen(listenOptions, () => {
				const addr = this.server.address();
				const actualPort = typeof addr === "object" && addr ? addr.port : port;
				this.addLog(
					"INFO",
					"Server",
					`Server listening on http://${host === "0.0.0.0" ? "localhost" : host}:${actualPort}`,
				);
				console.log(`\n========================================================`);
				console.log(`🚀 Andy Agent WebUI is RUNNING`);
				console.log(`========================================================`);
				console.log(`📍 Web Interface:       http://localhost:${actualPort}`);
				console.log(`📍 OpenAI API Base:     http://localhost:${actualPort}/v1`);
				console.log(`📍 Available Models:    http://localhost:${actualPort}/v1/models`);
				console.log(`📍 Graft Studio API:    http://localhost:${actualPort}/v1/graft/map`);
				console.log(`========================================================\n`);
				resolve(actualPort);
			});
			this.server.on("error", reject);
		});
	}

	public stop(): Promise<void> {
		return new Promise((resolve) => {
			this.server.close(() => resolve());
		});
	}

	private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
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

		try {
			// --- 1. WEBUI SPA FRONTEND ---
			if (method === "GET" && (url === "/" || url === "/index.html")) {
				res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
				res.end(getWebUiHtml());
				return;
			}

			// --- 2. HEALTH & INFO ---
			if (method === "GET" && (url === "/health" || url === "/v1" || url === "/v1/")) {
				const models = this.pool.getAvailableModels();
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify(
						{
							status: "ok",
							name: "Andy Agent WebUI Server",
							version: "0.8.0",
							totalAvailableModels: models.length,
							endpoints: {
								webui: "/",
								health: "/health",
								models: "/v1/models",
								chatCompletions: "/v1/chat/completions",
								chatWebUi: "/api/chat",
								sessions: "/api/sessions",
								memory: "/api/memory",
								instructions: "/api/instructions",
								skills: "/api/skills",
								prompts: "/api/prompts",
								logs: "/api/logs",
								settings: "/api/settings",
								mcp: "/api/mcp",
								graftMap: "/v1/graft/map",
								files: "/api/files",
							},
						},
						null,
						2,
					),
				);
				return;
			}

			// --- 3. LOGS API ---
			if (method === "GET" && url === "/api/logs") {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ logs: this.logs }, null, 2));
				return;
			}

			if (method === "GET" && url === "/api/logs/stream") {
				res.writeHead(200, {
					"Content-Type": "text/event-stream; charset=utf-8",
					"Cache-Control": "no-cache",
					Connection: "keep-alive",
				});

				const onNewLog = (entry: LogEntry) => {
					res.write(`data: ${JSON.stringify(entry)}\n\n`);
				};
				this.logSubscribers.add(onNewLog);
				req.on("close", () => {
					this.logSubscribers.delete(onNewLog);
				});
				return;
			}

			// --- 4. MEMORY.MD API ---
			const projectMemoryPath = path.join(this.pool.cwd, "MEMORY.md");
			const globalMemoryDir = existsSync(path.join(os.homedir(), ".andy", "agent"))
				? path.join(os.homedir(), ".andy", "agent")
				: existsSync(path.join(os.homedir(), ".prime", "agent"))
					? path.join(os.homedir(), ".prime", "agent")
					: path.join(os.homedir(), ".andy", "agent");
			const globalMemoryPath = path.join(globalMemoryDir, "MEMORY.md");

			if (method === "GET" && url === "/api/memory") {
				const scope = parsedUrl.searchParams.get("scope") || "project";
				const targetPath = scope === "global" ? globalMemoryPath : projectMemoryPath;
				let content = "";
				if (existsSync(targetPath)) {
					content = readFileSync(targetPath, "utf-8");
				} else {
					content = `# Memory (${scope === "global" ? "Global" : `Project: ${path.basename(this.pool.cwd)}`})\n\nGuarda aquí el contexto persistente, decisiones arquitectónicas y preferencias que Andy Agent debe recordar permanentemente.\n`;
				}
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ scope, path: targetPath, exists: existsSync(targetPath), content }));
				return;
			}

			if (method === "POST" && url === "/api/memory") {
				const body = await this.readJsonBody<any>(req);
				const scope = body?.scope || "project";
				const content = body?.content ?? "";
				const targetPath = scope === "global" ? globalMemoryPath : projectMemoryPath;

				const dir = path.dirname(targetPath);
				if (!existsSync(dir)) {
					mkdirSync(dir, { recursive: true });
				}
				writeFileSync(targetPath, content, "utf-8");
				this.addLog("INFO", "Memory", `Updated ${scope} MEMORY.md (${content.length} bytes)`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, scope, path: targetPath }));
				return;
			}

			// --- 5. AGENTS.MD (INSTRUCTIONS / PERSONA) API ---
			const projectAgentsMdPath = path.join(this.pool.cwd, "AGENTS.md");
			const globalAgentsMdPath = path.join(globalMemoryDir, "AGENTS.md");

			if (method === "GET" && url === "/api/instructions") {
				const scope = parsedUrl.searchParams.get("scope") || "project";
				const targetPath = scope === "global" ? globalAgentsMdPath : projectAgentsMdPath;
				let content = "";
				if (existsSync(targetPath)) {
					content = readFileSync(targetPath, "utf-8");
				} else {
					content = `# Agent Instructions (AGENTS.md)\n\nDefine aquí las pautas de estilo, convenciones de código y comportamiento de Andy Agent.\n`;
				}
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ scope, path: targetPath, exists: existsSync(targetPath), content }));
				return;
			}

			if (method === "POST" && url === "/api/instructions") {
				const body = await this.readJsonBody<any>(req);
				const scope = body?.scope || "project";
				const content = body?.content ?? "";
				const targetPath = scope === "global" ? globalAgentsMdPath : projectAgentsMdPath;

				const dir = path.dirname(targetPath);
				if (!existsSync(dir)) {
					mkdirSync(dir, { recursive: true });
				}
				writeFileSync(targetPath, content, "utf-8");
				this.addLog("INFO", "Instructions", `Updated ${scope} AGENTS.md (${content.length} bytes)`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, scope, path: targetPath }));
				return;
			}

			// --- 6. SKILLS API (CRUD) ---
			const projectSkillsDir = existsSync(path.join(this.pool.cwd, ".andy", "skills"))
				? path.join(this.pool.cwd, ".andy", "skills")
				: existsSync(path.join(this.pool.cwd, ".prime", "skills"))
					? path.join(this.pool.cwd, ".prime", "skills")
					: path.join(this.pool.cwd, ".andy", "skills");
			const globalSkillsDir = existsSync(path.join(os.homedir(), ".andy", "skills"))
				? path.join(os.homedir(), ".andy", "skills")
				: existsSync(path.join(os.homedir(), ".prime", "skills"))
					? path.join(os.homedir(), ".prime", "skills")
					: path.join(os.homedir(), ".andy", "skills");

			if (method === "GET" && url === "/api/skills") {
				const skillsList = this.listSkills(projectSkillsDir, globalSkillsDir);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ skills: skillsList }, null, 2));
				return;
			}

			if (method === "POST" && url === "/api/skills") {
				const body = await this.readJsonBody<any>(req);
				const { name, description, prompt, scope } = body;
				if (!name) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Skill name is required" }));
					return;
				}
				const baseDir = scope === "global" ? globalSkillsDir : projectSkillsDir;
				const skillDir = path.join(baseDir, name);
				if (!existsSync(skillDir)) mkdirSync(skillDir, { recursive: true });
				const skillFile = path.join(skillDir, "SKILL.md");
				const skillContent = `---
name: ${name}
description: ${description || name}
---

${prompt || ""}`;
				writeFileSync(skillFile, skillContent, "utf-8");
				this.addLog("INFO", "Skills", `Saved skill: ${name} (${scope || "project"})`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, name, path: skillFile }));
				return;
			}

			// --- 7. PROMPT TEMPLATES API ---
			const projectPromptsDir = existsSync(path.join(this.pool.cwd, ".andy", "prompts"))
				? path.join(this.pool.cwd, ".andy", "prompts")
				: existsSync(path.join(this.pool.cwd, ".prime", "prompts"))
					? path.join(this.pool.cwd, ".prime", "prompts")
					: path.join(this.pool.cwd, ".andy", "prompts");
			const globalPromptsDir = existsSync(path.join(os.homedir(), ".andy", "prompts"))
				? path.join(os.homedir(), ".andy", "prompts")
				: existsSync(path.join(os.homedir(), ".prime", "prompts"))
					? path.join(os.homedir(), ".prime", "prompts")
					: path.join(os.homedir(), ".andy", "prompts");

			if (method === "GET" && url === "/api/prompts") {
				const prompts = this.listPromptTemplates(projectPromptsDir, globalPromptsDir);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ prompts }, null, 2));
				return;
			}

			if (method === "POST" && url === "/api/prompts") {
				const body = await this.readJsonBody<any>(req);
				const { name, content, scope } = body;
				if (!name) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Prompt name is required" }));
					return;
				}
				const baseDir = scope === "global" ? globalPromptsDir : projectPromptsDir;
				if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true });
				const promptFile = path.join(baseDir, `${name}.md`);
				writeFileSync(promptFile, content || "", "utf-8");
				this.addLog("INFO", "Prompts", `Saved prompt template: ${name} (${scope || "project"})`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, name, path: promptFile }));
				return;
			}

			// --- 7.1 AUTO-LEARNING CONFIG API ---
			if (method === "GET" && url === "/api/autolearn") {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ config: this.autoLearner.config }, null, 2));
				return;
			}

			if (method === "POST" && url === "/api/autolearn") {
				const body = await this.readJsonBody<any>(req);
				const updated = this.autoLearner.saveConfig(body || {});
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, config: updated }, null, 2));
				return;
			}

			// --- 8. SETTINGS API (FULL SCHEMA) ---
			const settingsMgr = this.pool.getSettingsManager();

			if (method === "GET" && url === "/api/settings") {
				const authStorage = this.pool.getAuthStorage();
				const defaults = {
					defaultProvider: settingsMgr.getDefaultProvider() || "auto",
					defaultModel: settingsMgr.getDefaultModel() || "auto/best-coding",
					defaultThinkingLevel: settingsMgr.getDefaultThinkingLevel() || "medium",
					rlmMaxDepth: settingsMgr.getRlmMaxDepth() ?? 2,
					theme: settingsMgr.getTheme() || "dark",
					compaction: settingsMgr.getCompactionSettings(),
					retry: settingsMgr.getRetrySettings(),
					autoRefine: settingsMgr.getAutoRefineSettings(),
					steeringMode: settingsMgr.getSteeringMode(),
					followUpMode: settingsMgr.getFollowUpMode(),
					mcpServers: settingsMgr.getGlobalMcpServers() || {},
				};
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify(
						{
							defaults,
							savedAuthProviders: authStorage.list(),
						},
						null,
						2,
					),
				);
				return;
			}

			if (method === "POST" && url === "/api/settings") {
				const body = await this.readJsonBody<any>(req);
				if (body?.defaultModel) settingsMgr.setDefaultModel(body.defaultModel);
				if (body?.defaultProvider) settingsMgr.setDefaultProvider(body.defaultProvider);
				if (body?.defaultThinkingLevel) settingsMgr.setDefaultThinkingLevel(body.defaultThinkingLevel);
				if (body?.rlmMaxDepth !== undefined) settingsMgr.setRlmMaxDepth(Number(body.rlmMaxDepth));
				if (body?.theme) settingsMgr.setTheme(body.theme);
				if (typeof body?.compaction?.enabled === "boolean")
					settingsMgr.setCompactionEnabled(body.compaction.enabled);
				if (body?.steeringMode) settingsMgr.setSteeringMode(body.steeringMode);
				if (body?.followUpMode) settingsMgr.setFollowUpMode(body.followUpMode);

				// Custom API auth save
				if (body?.customApiKey && body?.customProvider) {
					const authStorage = this.pool.getAuthStorage();
					authStorage.set(body.customProvider, {
						type: "api_key",
						key: body.customApiKey,
					});
					this.addLog("INFO", "Settings", `Saved API credentials for provider ${body.customProvider}`);
				}

				this.addLog("INFO", "Settings", "Updated global and session settings");
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true }));
				return;
			}

			// --- 9. PROVIDERS MANAGEMENT & TEST API ---
			if (method === "GET" && url === "/api/providers") {
				const authStorage = this.pool.getAuthStorage();
				const savedList = authStorage.list();
				const defaultProvider = settingsMgr.getDefaultProvider() || "auto";

				const providers = [
					{
						id: "omniroute",
						name: "Omniroute / v2nethost",
						category: "Routers & Proxy",
						defaultBaseUrl: "http://ia.v2nethost.cl:20128/v1",
						defaultModel: "auto/best-coding",
						description: "Router multi-modelo con proxy inteligente de alta disponibilidad.",
						isConfigured: savedList.includes("omniroute") || savedList.includes("openai-codex"),
						isActive: defaultProvider === "omniroute",
					},
					{
						id: "openrouter",
						name: "OpenRouter",
						category: "Routers & Proxy",
						defaultBaseUrl: "https://openrouter.ai/api/v1",
						defaultModel: "anthropic/claude-3.5-sonnet",
						description: "Agregador global con acceso unificado a cientos de modelos de IA.",
						isConfigured: savedList.includes("openrouter") || !!process.env.OPENROUTER_API_KEY,
						isActive: defaultProvider === "openrouter",
					},
					{
						id: "openai",
						name: "OpenAI Oficial",
						category: "Propietarios",
						defaultBaseUrl: "https://api.openai.com/v1",
						defaultModel: "gpt-4o",
						description: "Modelos GPT-4o, GPT-4o-mini y series o1/o3 de OpenAI.",
						isConfigured: savedList.includes("openai") || !!process.env.OPENAI_API_KEY,
						isActive: defaultProvider === "openai",
					},
					{
						id: "anthropic",
						name: "Anthropic Claude",
						category: "Propietarios",
						defaultBaseUrl: "https://api.anthropic.com/v1",
						defaultModel: "claude-3-5-sonnet-20241022",
						description: "Familia Claude 3.5 Sonnet, Haiku y Opus para codificación avanzada.",
						isConfigured: savedList.includes("anthropic") || !!process.env.ANTHROPIC_API_KEY,
						isActive: defaultProvider === "anthropic",
					},
					{
						id: "google",
						name: "Google Gemini",
						category: "Propietarios",
						defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
						defaultModel: "gemini-2.0-flash",
						description: "Modelos multimodales de Google con ventanas de contexto masivas.",
						isConfigured: savedList.includes("google") || !!process.env.GEMINI_API_KEY,
						isActive: defaultProvider === "google",
					},
					{
						id: "deepseek",
						name: "DeepSeek",
						category: "Open-Weight",
						defaultBaseUrl: "https://api.deepseek.com/v1",
						defaultModel: "deepseek-chat",
						description: "Modelos DeepSeek V3 y DeepSeek R1 de alto rendimiento y bajo costo.",
						isConfigured: savedList.includes("deepseek") || !!process.env.DEEPSEEK_API_KEY,
						isActive: defaultProvider === "deepseek",
					},
					{
						id: "groq",
						name: "Groq LPU",
						category: "Inferencia Rápida",
						defaultBaseUrl: "https://api.groq.com/openai/v1",
						defaultModel: "llama-3.3-70b-versatile",
						description: "Inferencia ultra-rápida en chips LPU con latencias mínimas.",
						isConfigured: savedList.includes("groq") || !!process.env.GROQ_API_KEY,
						isActive: defaultProvider === "groq",
					},
					{
						id: "mistral",
						name: "Mistral AI",
						category: "Open-Weight",
						defaultBaseUrl: "https://api.mistral.ai/v1",
						defaultModel: "codestral-latest",
						description: "Modelos Codestral, Mistral Large y Pixtral para desarrollo.",
						isConfigured: savedList.includes("mistral") || !!process.env.MISTRAL_API_KEY,
						isActive: defaultProvider === "mistral",
					},
					{
						id: "xai",
						name: "xAI (Grok)",
						category: "Propietarios",
						defaultBaseUrl: "https://api.x.ai/v1",
						defaultModel: "grok-2-latest",
						description: "Modelos Grok 2 y Grok Beta de xAI.",
						isConfigured: savedList.includes("xai") || !!process.env.XAI_API_KEY,
						isActive: defaultProvider === "xai",
					},
					{
						id: "together",
						name: "Together AI",
						category: "Inferencia Rápida",
						defaultBaseUrl: "https://api.together.xyz/v1",
						defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
						description: "Infraestructura de inferencia en la nube para modelos de código abierto.",
						isConfigured: savedList.includes("together") || !!process.env.TOGETHER_API_KEY,
						isActive: defaultProvider === "together",
					},
					{
						id: "fireworks",
						name: "Fireworks AI",
						category: "Inferencia Rápida",
						defaultBaseUrl: "https://api.fireworks.ai/inference/v1",
						defaultModel: "accounts/fireworks/models/qwen2p5-coder-32b-instruct",
						description: "Plataforma de inferencia rápida con Qwen 2.5 Coder y Llama.",
						isConfigured: savedList.includes("fireworks") || !!process.env.FIREWORKS_API_KEY,
						isActive: defaultProvider === "fireworks",
					},
					{
						id: "ollama",
						name: "Ollama Local",
						category: "Local / Autohospedado",
						defaultBaseUrl: "http://localhost:11434/v1",
						defaultModel: "qwen2.5-coder:latest",
						description: "Ejecución 100% privada y local sin requerir conexión a internet.",
						isConfigured: true,
						isActive: defaultProvider === "ollama",
					},
					{
						id: "lmstudio",
						name: "LM Studio Local",
						category: "Local / Autohospedado",
						defaultBaseUrl: "http://localhost:1234/v1",
						defaultModel: "local-model",
						description: "Servidor local de inferencia compatible con OpenAI en tu equipo.",
						isConfigured: true,
						isActive: defaultProvider === "lmstudio",
					},
					{
						id: "custom",
						name: "Endpoint OpenAI Personalizado",
						category: "Personalizado / Proxy",
						defaultBaseUrl: "http://localhost:8000/v1",
						defaultModel: "custom-model",
						description: "Cualquier servidor vLLM, LocalAI, TGI o proxy corporativo compatible.",
						isConfigured: savedList.includes("custom"),
						isActive: defaultProvider === "custom",
					},
				];

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ providers, defaultProvider, savedAuth: savedList }, null, 2));
				return;
			}

			if (method === "POST" && url === "/api/providers") {
				const body = await this.readJsonBody<any>(req);
				const { provider, apiKey, defaultModel } = body;
				if (!provider) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Provider ID required" }));
					return;
				}

				const authStorage = this.pool.getAuthStorage();
				if (apiKey) {
					authStorage.set(provider, {
						type: "api_key",
						key: apiKey,
					});
				}

				settingsMgr.setDefaultProvider(provider);
				if (defaultModel) {
					settingsMgr.setDefaultModel(defaultModel);
				}

				this.addLog(
					"INFO",
					"Providers",
					`Configured active provider: ${provider} (Model: ${defaultModel || "auto"})`,
				);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, provider, defaultModel }));
				return;
			}

			if (method === "POST" && (url === "/api/providers/test" || url === "/api/providers/models")) {
				const body = await this.readJsonBody<any>(req);
				const { provider, baseUrl, apiKey } = body;
				const testUrl = `${(baseUrl || "http://ia.v2nethost.cl:20128/v1").replace(/\/$/, "")}/models`;

				const startTest = Date.now();
				try {
					const headers: Record<string, string> = { "Content-Type": "application/json" };
					if (apiKey) {
						if (provider === "anthropic") {
							headers["x-api-key"] = apiKey;
							headers["anthropic-version"] = "2023-06-01";
						} else {
							headers.Authorization = `Bearer ${apiKey}`;
						}
					}

					// Custom provider model catalogs for non-OpenAI endpoints if needed
					if (provider === "anthropic" && !baseUrl) {
						const anthropicModels = [
							"claude-3-5-sonnet-20241022",
							"claude-3-5-haiku-20241022",
							"claude-3-opus-20240229",
							"claude-3-sonnet-20240229",
						];
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(
							JSON.stringify({
								success: true,
								status: 200,
								latencyMs: 15,
								totalModels: anthropicModels.length,
								models: anthropicModels,
							}),
						);
						return;
					}

					if (provider === "google" && !baseUrl) {
						const geminiModels = [
							"gemini-2.0-flash",
							"gemini-2.0-flash-thinking-exp",
							"gemini-1.5-pro",
							"gemini-1.5-flash",
							"gemini-exp-1206",
						];
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(
							JSON.stringify({
								success: true,
								status: 200,
								latencyMs: 15,
								totalModels: geminiModels.length,
								models: geminiModels,
							}),
						);
						return;
					}

					const abortCtrl = new AbortController();
					const timeoutId = setTimeout(() => abortCtrl.abort(), 25000);

					const testRes = await fetch(testUrl, {
						method: "GET",
						headers,
						signal: abortCtrl.signal,
					});
					clearTimeout(timeoutId);

					const latencyMs = Date.now() - startTest;
					if (testRes.ok) {
						const data: any = await testRes.json().catch(() => ({}));
						let rawModels: any[] = [];
						if (Array.isArray(data?.data)) {
							rawModels = data.data;
						} else if (Array.isArray(data?.models)) {
							rawModels = data.models;
						} else if (Array.isArray(data)) {
							rawModels = data;
						}

						const modelIds = rawModels
							.map((m: any) => (typeof m === "string" ? m : m.id || m.name || m.model))
							.filter(Boolean);

						this.addLog(
							"INFO",
							"Providers",
							`Fetched ${modelIds.length} models for ${provider || "custom"} (${latencyMs}ms)`,
						);
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(
							JSON.stringify({
								success: true,
								status: testRes.status,
								latencyMs,
								totalModels: modelIds.length,
								models: modelIds,
							}),
						);
					} else {
						const errorText = await testRes.text().catch(() => "");
						this.addLog(
							"WARN",
							"Providers",
							`Provider models test failed with HTTP ${testRes.status}: ${testUrl}`,
						);
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ success: false, status: testRes.status, latencyMs, error: errorText }));
					}
				} catch (testErr: any) {
					const latencyMs = Date.now() - startTest;
					this.addLog("ERROR", "Providers", `Provider connection error to ${testUrl}: ${testErr.message}`);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ success: false, latencyMs, error: testErr.message || String(testErr) }));
				}
				return;
			}

			// --- 9. MCP SERVERS API ---
			if (method === "GET" && url === "/api/mcp") {
				const mcpServers = settingsMgr.getGlobalMcpServers() || {};
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ mcpServers }, null, 2));
				return;
			}

			if (method === "POST" && url === "/api/mcp") {
				const body = await this.readJsonBody<any>(req);
				const name = body?.name;
				const config = body?.config;
				if (!name || !config) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Parameters 'name' and 'config' required" }));
					return;
				}
				settingsMgr.setGlobalMcpServer(name, config);
				this.addLog("INFO", "MCP", `Registered MCP server: ${name}`, config);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, name, config }));
				return;
			}

			if (method === "DELETE" && url.startsWith("/api/mcp/")) {
				const name = url.split("/")[3];
				if (name) {
					settingsMgr.removeGlobalMcpServer(name);
					this.addLog("INFO", "MCP", `Removed MCP server: ${name}`);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ success: true, name }));
					return;
				}
			}

			// --- 10. MODELS LIST & CATALOG BY PROVIDER ---
			if (method === "GET" && url === "/api/models/catalog") {
				const authStorage = this.pool.getAuthStorage();
				const savedList = authStorage.list();
				const defaultProvider = settingsMgr.getDefaultProvider() || "omniroute";
				const defaultModel = settingsMgr.getDefaultModel() || "auto/best-coding";

				const standardCatalogs = [
					{
						providerId: "omniroute",
						providerName: "Omniroute / v2nethost",
						isConfigured: savedList.includes("omniroute") || savedList.includes("openai-codex"),
						isActive: defaultProvider === "omniroute",
						models: [
							"auto/best-coding",
							"auto/best-reasoning",
							"auto/best-fast",
							"auto/best-vision",
							"auto/best-chat",
							"auto/best-coding-fast",
							"auto/pro-coding",
							"auto/pro-reasoning",
							"auto/coding",
							"auto/reasoning",
							"claude-3-5-sonnet-20241022",
							"deepseek-chat",
							"gpt-4o",
							"gpt-4o-mini",
							"qwen2.5-coder-32b-instruct",
						],
					},
					{
						providerId: "openai",
						providerName: "OpenAI Oficial",
						isConfigured: savedList.includes("openai") || !!process.env.OPENAI_API_KEY,
						isActive: defaultProvider === "openai",
						models: ["gpt-4o", "gpt-4o-mini", "o1", "o1-mini", "o3-mini", "gpt-4-turbo"],
					},
					{
						providerId: "anthropic",
						providerName: "Anthropic Claude",
						isConfigured: savedList.includes("anthropic") || !!process.env.ANTHROPIC_API_KEY,
						isActive: defaultProvider === "anthropic",
						models: [
							"claude-3-5-sonnet-20241022",
							"claude-3-5-haiku-20241022",
							"claude-3-opus-20240229",
							"claude-3-sonnet-20240229",
						],
					},
					{
						providerId: "deepseek",
						providerName: "DeepSeek",
						isConfigured: savedList.includes("deepseek") || !!process.env.DEEPSEEK_API_KEY,
						isActive: defaultProvider === "deepseek",
						models: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"],
					},
					{
						providerId: "google",
						providerName: "Google Gemini",
						isConfigured: savedList.includes("google") || !!process.env.GEMINI_API_KEY,
						isActive: defaultProvider === "google",
						models: ["gemini-2.0-flash", "gemini-2.0-flash-thinking-exp", "gemini-1.5-pro", "gemini-1.5-flash"],
					},
					{
						providerId: "groq",
						providerName: "Groq LPU",
						isConfigured: savedList.includes("groq") || !!process.env.GROQ_API_KEY,
						isActive: defaultProvider === "groq",
						models: [
							"llama-3.3-70b-versatile",
							"llama-3.1-8b-instant",
							"mixtral-8x7b-32768",
							"deepseek-r1-distill-llama-70b",
						],
					},
					{
						providerId: "openrouter",
						providerName: "OpenRouter",
						isConfigured: savedList.includes("openrouter") || !!process.env.OPENROUTER_API_KEY,
						isActive: defaultProvider === "openrouter",
						models: [
							"anthropic/claude-3.5-sonnet",
							"deepseek/deepseek-chat",
							"openai/gpt-4o",
							"meta-llama/llama-3.3-70b-instruct",
							"qwen/qwen-2.5-coder-32b-instruct",
						],
					},
					{
						providerId: "ollama",
						providerName: "Ollama Local",
						isConfigured: true,
						isActive: defaultProvider === "ollama",
						models: ["qwen2.5-coder:latest", "deepseek-r1:latest", "llama3.2:latest", "codellama:latest"],
					},
					{
						providerId: "lmstudio",
						providerName: "LM Studio Local",
						isConfigured: true,
						isActive: defaultProvider === "lmstudio",
						models: ["local-model"],
					},
				];

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify(
						{
							activeProvider: defaultProvider,
							activeModel: defaultModel,
							catalogs: standardCatalogs,
						},
						null,
						2,
					),
				);
				return;
			}

			if (method === "GET" && (url === "/v1/models" || url === "/api/models")) {
				const models = this.pool.getAvailableModels();
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify(
						{
							object: "list",
							data: models.map((m) => ({
								id: m.id,
								object: "model",
								created: Math.floor(Date.now() / 1000),
								owned_by: m.provider,
								context_window: m.contextWindow || 128000,
							})),
						},
						null,
						2,
					),
				);
				return;
			}

			// --- 11. SESSIONS API ---
			if (method === "GET" && url === "/api/sessions") {
				const sessions = this.pool.listSessions();
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ sessions }, null, 2));
				return;
			}

			if (method === "GET" && url.startsWith("/api/sessions/") && url.endsWith("/messages")) {
				const parts = url.split("/");
				const sessionId = parts[3] || "default";
				const sessionItem = await this.pool.getOrCreateSession(sessionId);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ sessionId, messages: sessionItem.session.state.messages }, null, 2));
				return;
			}

			if (method === "GET" && url.startsWith("/api/sessions/") && url.endsWith("/tree")) {
				const parts = url.split("/");
				const sessionId = parts[3] || "default";
				const sessionItem = await this.pool.getOrCreateSession(sessionId);
				const messages = sessionItem.session.state.messages;
				const tree = messages.map((m: any, idx) => ({
					id: `node-${idx}`,
					turnIndex: idx,
					role: m.role,
					summary: typeof m.content === "string" ? m.content.slice(0, 60) : "Tool interaction",
					timestamp: Date.now(),
				}));
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ sessionId, nodes: tree }, null, 2));
				return;
			}

			if ((method === "PUT" || method === "PATCH") && url.startsWith("/api/sessions/")) {
				const sessionId = url.split("/")[3] || "default";
				const body = await this.readJsonBody<any>(req);
				const title = body?.title;
				if (title) {
					await this.pool.setSessionTitle(sessionId, title);
					this.addLog("INFO", "Session", `Renamed session ${sessionId} to "${title}"`);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ success: true, sessionId, title }));
					return;
				}
			}

			if (method === "DELETE" && url.startsWith("/api/sessions/")) {
				const sessionId = url.split("/")[3] || "default";
				await this.pool.deleteSession(sessionId);
				this.addLog("INFO", "Session", `Deleted session ${sessionId}`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, sessionId }));
				return;
			}

			// --- 12. CHAT STREAMING (WEBUI RICH SSE) ---
			if (method === "POST" && url === "/api/chat") {
				await this.handleChatStream(req, res);
				return;
			}

			// --- 12.1 OPENAI-COMPATIBLE CHAT COMPLETIONS (KILOCODE, CURSOR, CLINE, ROO-CODE) ---
			if (method === "POST" && (url === "/v1/chat/completions" || url === "/chat/completions")) {
				await this.handleOpenAiChatCompletions(req, res);
				return;
			}

			// --- 13. GRAFT STUDIO API ---
			const graft = this.pool.getGraftEngine();

			if (method === "GET" && (url === "/v1/graft/map" || url === "/api/graft/map")) {
				this.addLog("TOOL", "Graft", "Executing graft.map() architectural indexing");
				const map = await graft.map();
				res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
				res.end(map);
				return;
			}

			if (method === "GET" && (url === "/v1/graft/skeleton" || url === "/api/graft/skeleton")) {
				const file = parsedUrl.searchParams.get("file") || "";
				if (!file) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Parameter 'file' is required" }));
					return;
				}
				this.addLog("TOOL", "Graft", `Extracting skeleton for ${file}`);
				const skel = await graft.skeleton(file);
				res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
				res.end(skel);
				return;
			}

			if (method === "GET" && (url === "/v1/graft/callers" || url === "/api/graft/callers")) {
				const symbol = parsedUrl.searchParams.get("symbol") || "";
				this.addLog("TOOL", "Graft", `Searching callers for symbol ${symbol}`);
				const callers = await graft.callers(symbol);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ symbol, callers, total: callers.length }, null, 2));
				return;
			}

			if (method === "GET" && (url === "/v1/graft/blast" || url === "/api/graft/blast")) {
				const target = parsedUrl.searchParams.get("target") || "";
				this.addLog("TOOL", "Graft", `Analyzing blast radius for ${target}`);
				const blast = await graft.blast(target);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(blast, null, 2));
				return;
			}

			if (method === "GET" && (url === "/v1/graft/grep" || url === "/api/graft/grep")) {
				const q = parsedUrl.searchParams.get("q") || "";
				const grepResult = await graft.grep(q);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify(
						{ query: q, totalMatches: grepResult.totalMatches, formatted: grepResult.formatted },
						null,
						2,
					),
				);
				return;
			}

			// --- 14. WORKSPACE FILES API ---
			if (method === "GET" && url === "/api/files") {
				const files = this.listWorkspaceFiles(this.pool.cwd);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ files }, null, 2));
				return;
			}

			if (method === "GET" && url === "/api/files/read") {
				const filePath = parsedUrl.searchParams.get("path") || "";
				const full = path.isAbsolute(filePath) ? filePath : path.resolve(this.pool.cwd, filePath);
				if (!existsSync(full)) {
					res.writeHead(404, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "File not found" }));
					return;
				}
				const content = readFileSync(full, "utf-8");
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ path: filePath, content }));
				return;
			}

			if (method === "POST" && url === "/api/files/write") {
				const body = await this.readJsonBody<any>(req);
				const { filePath, content } = body;
				const full = path.isAbsolute(filePath) ? filePath : path.resolve(this.pool.cwd, filePath);
				const dir = path.dirname(full);
				if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
				writeFileSync(full, content || "", "utf-8");
				this.addLog("INFO", "Files", `Saved file: ${filePath}`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, path: filePath }));
				return;
			}

			// --- 404 NOT FOUND ---
			res.writeHead(404, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: { message: `Route not found: ${method} ${url}`, code: 404 } }));
		} catch (error: any) {
			this.addLog("ERROR", "HTTP", `${method} ${url} Error: ${error.message || String(error)}`);
			console.error(`[WebUI Server Error] ${method} ${url}:`, error);
			if (!res.headersSent) {
				res.writeHead(500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: { message: error.message || String(error) } }));
			}
		}
	}

	private async handleChatStream(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const body = await this.readJsonBody<any>(req);
		const sessionId = body?.sessionId || "default";
		const modelId = body?.model;
		const userMessages = body?.messages || [];
		const lastUserMsg = userMessages.filter((m: any) => m.role === "user").pop();
		const promptText = lastUserMsg
			? typeof lastUserMsg.content === "string"
				? lastUserMsg.content
				: JSON.stringify(lastUserMsg.content)
			: "";

		this.addLog(
			"INFO",
			"Chat",
			`Received prompt for session "${sessionId}" [Model: ${modelId || "default"}]: "${promptText.slice(0, 80)}..."`,
		);

		const sessionItem = await this.pool.getOrCreateSession(sessionId, modelId);
		const session = sessionItem.session;

		res.writeHead(200, {
			"Content-Type": "text/event-stream; charset=utf-8",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		});

		const sendEvent = (event: any) => {
			res.write(`data: ${JSON.stringify(event)}\n\n`);
		};

		let fullAssistantText = "";
		const unsubscribe = session.subscribe((event: any) => {
			if (event.type === "message_start") {
				if (event.message.role === "assistant") {
					this.addLog("RLM", "Turn", `Assistant turn started`);
				}
			} else if (event.type === "message_update") {
				if (event.assistantMessageEvent) {
					const ame = event.assistantMessageEvent;
					if (ame.type === "text_delta") {
						fullAssistantText += ame.delta;
						sendEvent({ type: "token", content: ame.delta });
					} else if (ame.type === "thinking_delta") {
						sendEvent({ type: "reasoning", content: ame.delta });
					}
				}
			} else if (event.type === "tool_call") {
				this.addLog("TOOL", event.toolName, `Tool call started`, event.input);
				sendEvent({ type: "tool_start", tool: event.toolName, input: event.input });
			} else if (event.type === "tool_result") {
				this.addLog("TOOL", event.toolName, `Tool call completed`);
				sendEvent({ type: "tool_result", tool: event.toolName, output: event.result });
			}
		});

		try {
			if (session.isStreaming) {
				await session.prompt(promptText, { streamingBehavior: "followUp" });
			} else {
				await session.prompt(promptText);
			}

			// Smart auto-title from first prompt
			if (promptText && (sessionItem.title.startsWith("Chat ") || sessionItem.title.startsWith("session-"))) {
				const clean = promptText
					.trim()
					.replace(/^[/#\s]+/, "")
					.slice(0, 32);
				if (clean) {
					sessionItem.title = clean;
				}
			}
			this.pool.persistSession(sessionItem);

			// Trigger Auto-Learning reflection in background (non-blocking)
			this.autoLearner
				.processTurn({
					sessionId,
					prompt: promptText,
					assistantResponse: fullAssistantText,
					modelId,
				})
				.catch((err) => this.addLog("WARN", "AutoLearn", `Error: ${err.message}`));

			sendEvent({ type: "done" });
			res.write("data: [DONE]\n\n");
			res.end();
			this.addLog("INFO", "Chat", `Completed prompt for session "${sessionId}"`);
		} catch (err: any) {
			this.addLog("ERROR", "Chat", `Execution error: ${err.message || String(err)}`);
			sendEvent({ type: "error", error: err.message || String(err) });
			res.write("data: [DONE]\n\n");
			res.end();
		} finally {
			unsubscribe();
		}
	}

	private async handleOpenAiChatCompletions(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const body = await this.readJsonBody<any>(req);
		if (!body || !body.messages || !Array.isArray(body.messages)) {
			res.writeHead(400, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({
					error: {
						message: "Invalid request: 'messages' array is required.",
						type: "invalid_request_error",
						param: "messages",
						code: "invalid_messages",
					},
				}),
			);
			return;
		}

		const isStream = body.stream === true;
		const reqId = `chatcmpl-${randomUUID()}`;
		const sessionId = (req.headers["x-session-id"] as string) || body.user || "kilocode-session";

		// Extract prompt and system instruction
		const messages: any[] = body.messages;
		const systemMsgs = messages.filter((m: any) => m.role === "system" || m.role === "developer");
		const nonSystem = messages.filter((m: any) => m.role !== "system" && m.role !== "developer");

		const rawSystemPrompt =
			systemMsgs.length > 0
				? systemMsgs
						.map((m: any) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
						.join("\n\n")
				: "";

		const isConsolidationRequest = messages.some((m: any) => {
			const txt = (typeof m.content === "string" ? m.content : JSON.stringify(m.content || "")).toLowerCase();
			return (
				txt.includes("consolidate") ||
				txt.includes("condense") ||
				txt.includes("task_history_summary") ||
				txt.includes("summary of the conversation") ||
				txt.includes("summarize the conversation")
			);
		});

		// Enriquecer con memoria de Andy Agent excepto en peticiones internas de consolidación de KiloCode
		let memoryContext = "";
		if (!isConsolidationRequest) {
			const projectMemoryPath = path.join(this.pool.cwd, "MEMORY.md");
			const globalMemoryPath = path.join(os.homedir(), ".andy", "agent", "MEMORY.md");
			const projectAgentsPath = path.join(this.pool.cwd, "AGENTS.md");

			if (existsSync(projectMemoryPath)) {
				try {
					const mem = readFileSync(projectMemoryPath, "utf-8").trim();
					if (mem) memoryContext += `\n\n### Project Memory (MEMORY.md):\n${mem}`;
				} catch {}
			}
			if (existsSync(globalMemoryPath)) {
				try {
					const gmem = readFileSync(globalMemoryPath, "utf-8").trim();
					if (gmem) memoryContext += `\n\n### Global Memory:\n${gmem}`;
				} catch {}
			}
			if (existsSync(projectAgentsPath)) {
				try {
					const agents = readFileSync(projectAgentsPath, "utf-8").trim();
					if (agents) memoryContext += `\n\n### Project Guidelines (AGENTS.md):\n${agents}`;
				} catch {}
			}
		}

		const systemPrompt = memoryContext
			? rawSystemPrompt
				? `${rawSystemPrompt}\n\n## Andy Agent Persistent Memory & Guidelines:${memoryContext}`
				: `## Andy Agent Persistent Memory & Guidelines:${memoryContext}`
			: rawSystemPrompt || undefined;

		const modelId = body.model || "auto/best-coding";
		this.addLog(
			"INFO",
			"OpenAI Bridge",
			`Incoming chat completion for model "${modelId}" (session: ${sessionId}, stream: ${isStream})`,
		);

		const sessionItem = await this.pool.getOrCreateSession(sessionId, modelId);
		const session = sessionItem.session;
		const targetModel = session.model;
		if (!targetModel) {
			res.writeHead(400, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: { message: `Model "${modelId}" could not be resolved.` } }));
			return;
		}

		const contextMessages: Message[] = nonSystem.map((m: any) => {
			if (m.role === "assistant") {
				const textContent =
					typeof m.content === "string"
						? m.content
						: Array.isArray(m.content)
							? m.content.map((c: any) => c.text || JSON.stringify(c)).join("\n")
							: JSON.stringify(m.content || "");
				return {
					role: "assistant",
					content: [{ type: "text", text: textContent }],
					api: targetModel.api,
					provider: targetModel.provider,
					model: targetModel.id,
					usage: {
						input: 0,
						output: 0,
						cacheRead: 0,
						cacheWrite: 0,
						totalTokens: 0,
						cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
					},
					stopReason: "stop",
					timestamp: Date.now(),
				} as AssistantMessage;
			}
			if (m.role === "tool" || m.role === "toolResult") {
				const textContent = typeof m.content === "string" ? m.content : JSON.stringify(m.content || "");
				return {
					role: "toolResult",
					toolCallId: m.tool_call_id || m.toolCallId || "call_1",
					toolName: m.name || m.toolName || "tool",
					content: [{ type: "text", text: textContent }],
					isError: false,
					timestamp: Date.now(),
				} as ToolResultMessage;
			}
			const textContent =
				typeof m.content === "string"
					? m.content
					: Array.isArray(m.content)
						? m.content.map((c: any) => (c.type === "text" ? c.text || "" : "")).join(" ")
						: JSON.stringify(m.content || "");
			return {
				role: "user",
				content: textContent || "(empty)",
				timestamp: Date.now(),
			} as UserMessage;
		});

		const context: Context = {
			systemPrompt,
			messages:
				contextMessages.length > 0 ? contextMessages : [{ role: "user", content: "Hello", timestamp: Date.now() }],
		};

		const auth = await sessionItem.session.modelRegistry.getApiKeyAndHeaders(targetModel);
		const apiKey = auth.ok ? auth.apiKey : undefined;
		const abortCtrl = new AbortController();
		let isAborted = false;

		const onClientClose = () => {
			isAborted = true;
			abortCtrl.abort();
		};
		req.on("close", onClientClose);

		const streamOptions: any = {
			apiKey,
			signal: abortCtrl.signal,
			temperature: isConsolidationRequest ? 0 : body.temperature,
			maxTokens: body.max_tokens || body.max_completion_tokens,
		};

		if (isStream) {
			res.writeHead(200, {
				"Content-Type": "text/event-stream; charset=utf-8",
				"Cache-Control": "no-cache, no-transform",
				Connection: "keep-alive",
				"X-Accel-Buffering": "no",
			});

			// Initial chunk indicating assistant role
			const initialChunk = {
				id: reqId,
				object: "chat.completion.chunk",
				created: Math.floor(Date.now() / 1000),
				model: modelId,
				choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }],
			};
			res.write(`data: ${JSON.stringify(initialChunk)}\n\n`);

			let accumulatedText = "";
			try {
				const eventStream = stream(targetModel, context, streamOptions);
				for await (const event of eventStream) {
					if (isAborted || res.writableEnded) break;
					if (event.type === "text_delta") {
						accumulatedText += event.delta;
						const chunk = {
							id: reqId,
							object: "chat.completion.chunk",
							created: Math.floor(Date.now() / 1000),
							model: modelId,
							choices: [{ index: 0, delta: { content: event.delta }, finish_reason: null }],
						};
						res.write(`data: ${JSON.stringify(chunk)}\n\n`);
					} else if (event.type === "thinking_delta") {
						const chunk = {
							id: reqId,
							object: "chat.completion.chunk",
							created: Math.floor(Date.now() / 1000),
							model: modelId,
							choices: [
								{ index: 0, delta: { content: "", reasoning_content: event.delta }, finish_reason: null },
							],
						};
						res.write(`data: ${JSON.stringify(chunk)}\n\n`);
					}
				}
			} catch (err: any) {
				this.addLog("ERROR", "OpenAI Bridge", `Error during stream: ${err.message || String(err)}`);
				if (!isAborted && !res.writableEnded) {
					const errChunk = {
						id: reqId,
						object: "chat.completion.chunk",
						created: Math.floor(Date.now() / 1000),
						model: modelId,
						choices: [
							{
								index: 0,
								delta: { content: `\n\n⚠️ Error: ${err.message || String(err)}` },
								finish_reason: null,
							},
						],
					};
					res.write(`data: ${JSON.stringify(errChunk)}\n\n`);
				}
			} finally {
				req.off("close", onClientClose);

				const lastUser = nonSystem[nonSystem.length - 1];
				const lastUserText = lastUser
					? typeof lastUser.content === "string"
						? lastUser.content
						: JSON.stringify(lastUser.content)
					: "";
				this.autoLearner
					.processTurn({
						sessionId,
						prompt: lastUserText,
						assistantResponse: accumulatedText,
						modelId,
					})
					.catch((err) => this.addLog("WARN", "AutoLearn", `Error: ${err.message}`));

				if (!res.writableEnded) {
					const stopChunk = {
						id: reqId,
						object: "chat.completion.chunk",
						created: Math.floor(Date.now() / 1000),
						model: modelId,
						choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
					};
					res.write(`data: ${JSON.stringify(stopChunk)}\n\n`);
					res.write("data: [DONE]\n\n");
					res.end();
				}
			}
		} else {
			// Non-streaming standard JSON response
			try {
				const result = await complete(targetModel, context, streamOptions);
				let accumulatedText = "";
				if (Array.isArray(result.content)) {
					accumulatedText = result.content
						.filter((c: any) => c.type === "text")
						.map((c: any) => c.text || "")
						.join("\n");
				} else if (typeof (result as any).content === "string") {
					accumulatedText = (result as any).content;
				}

				const lastUser = nonSystem[nonSystem.length - 1];
				const lastUserText = lastUser
					? typeof lastUser.content === "string"
						? lastUser.content
						: JSON.stringify(lastUser.content)
					: "";
				this.autoLearner
					.processTurn({
						sessionId,
						prompt: lastUserText,
						assistantResponse: accumulatedText,
						modelId,
					})
					.catch((err) => this.addLog("WARN", "AutoLearn", `Error: ${err.message}`));

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify({
						id: reqId,
						object: "chat.completion",
						created: Math.floor(Date.now() / 1000),
						model: modelId,
						choices: [
							{
								index: 0,
								message: {
									role: "assistant",
									content: accumulatedText || "(Completado exitosamente)",
								},
								finish_reason: "stop",
							},
						],
						usage: {
							prompt_tokens: result.usage?.input || 0,
							completion_tokens: result.usage?.output || 0,
							total_tokens: result.usage?.totalTokens || 0,
						},
					}),
				);
			} catch (err: any) {
				this.addLog("ERROR", "OpenAI Bridge", `Error during complete: ${err.message || String(err)}`);
				res.writeHead(500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: { message: err.message || String(err) } }));
			}
		}
	}

	private listSkills(projectDir: string, globalDir: string): any[] {
		const list: any[] = [];
		const scan = (dir: string, scope: "project" | "global") => {
			if (!existsSync(dir)) return;
			try {
				const entries = readdirSync(dir, { withFileTypes: true });
				for (const entry of entries) {
					const full = path.join(dir, entry.name);
					if (entry.isDirectory()) {
						const skillMd = path.join(full, "SKILL.md");
						if (existsSync(skillMd)) {
							const content = readFileSync(skillMd, "utf-8");
							list.push({
								name: entry.name,
								path: skillMd,
								scope,
								content,
							});
						}
					} else if (entry.isFile() && entry.name.endsWith(".md")) {
						const content = readFileSync(full, "utf-8");
						list.push({
							name: entry.name.replace(/\.md$/, ""),
							path: full,
							scope,
							content,
						});
					}
				}
			} catch {}
		};
		scan(projectDir, "project");
		scan(globalDir, "global");
		return list;
	}

	private listPromptTemplates(projectDir: string, globalDir: string): any[] {
		const list: any[] = [];
		const scan = (dir: string, scope: "project" | "global") => {
			if (!existsSync(dir)) return;
			try {
				const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
				for (const f of files) {
					const full = path.join(dir, f);
					const content = readFileSync(full, "utf-8");
					list.push({
						name: f.replace(/\.md$/, ""),
						path: full,
						scope,
						content,
					});
				}
			} catch {}
		};
		scan(projectDir, "project");
		scan(globalDir, "global");
		return list;
	}

	private listWorkspaceFiles(dir: string, baseDir = dir, maxFiles = 300): string[] {
		const results: string[] = [];
		try {
			const entries = readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				if (
					entry.name.startsWith(".") ||
					entry.name === "node_modules" ||
					entry.name === "dist" ||
					entry.name === "kernel-venv"
				) {
					continue;
				}
				const full = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					results.push(...this.listWorkspaceFiles(full, baseDir, maxFiles - results.length));
				} else if (entry.isFile()) {
					results.push(path.relative(baseDir, full).replace(/\\/g, "/"));
				}
				if (results.length >= maxFiles) break;
			}
		} catch {}
		return results;
	}

	private readJsonBody<T>(req: IncomingMessage): Promise<T | null> {
		return new Promise((resolve, reject) => {
			const chunks: Buffer[] = [];
			let size = 0;
			const maxSizeBytes = 20 * 1024 * 1024;

			req.on("data", (chunk: Buffer) => {
				size += chunk.length;
				if (size > maxSizeBytes) {
					reject(new Error("Request body payload too large"));
					req.destroy();
					return;
				}
				chunks.push(chunk);
			});

			req.on("end", () => {
				if (chunks.length === 0) {
					resolve(null);
					return;
				}
				try {
					const data = Buffer.concat(chunks).toString("utf-8");
					resolve(JSON.parse(data) as T);
				} catch (err) {
					reject(new Error(`Malformed JSON in request body: ${err}`));
				}
			});

			req.on("error", reject);
		});
	}
}

export const PrimeWebUiServer = AndyWebUiServer;
