import { spawn } from "node:child_process";
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
	type TextContent,
	type ThinkingContent,
	type Tool,
	type ToolCall,
	type ToolResultMessage,
	type UserMessage,
} from "@earendil-works/pi-ai";
import { ApiKeyManager } from "./api-key-manager.js";
import { AuthManager } from "./auth-manager.js";
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
	public apiKeyManager: ApiKeyManager;
	public authManager: AuthManager;
	private logs: LogEntry[] = [];
	private maxLogs = 1000;
	private logSubscribers = new Set<(entry: LogEntry) => void>();

	constructor(options: WebUiServerOptions = {}) {
		this.options = options;
		this.pool = new WebUiSessionPool(options.cwd || process.cwd());
		this.autoLearner = new AutoLearningEngine(options.cwd || process.cwd(), this.addLog.bind(this));
		this.apiKeyManager = new ApiKeyManager();
		this.authManager = new AuthManager();
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

	private getAuthToken(req: IncomingMessage): string {
		const authHeader = req.headers.authorization;
		if (authHeader) {
			return authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
		}
		const cookieHeader = req.headers.cookie;
		if (cookieHeader) {
			const cookies = cookieHeader.split(";");
			for (const c of cookies) {
				const [name, val] = c.trim().split("=");
				if (name === "andy_session" && val) {
					return decodeURIComponent(val);
				}
			}
		}
		return "";
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
								auth: "/api/auth",
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

			// --- 2.1 AUTHENTICATION & SESSION MANAGEMENT API ---
			if (method === "POST" && url === "/api/auth/login") {
				const body = await this.readJsonBody<any>(req);
				const username = body?.username || "";
				const password = body?.password || "";
				const rememberMe = Boolean(body?.rememberMe);

				const result = this.authManager.login(username, password, rememberMe);
				if (!result.success) {
					this.addLog("WARN", "Auth", `Failed login attempt for user "${username}"`);
					res.writeHead(401, { "Content-Type": "application/json" });
					res.end(JSON.stringify(result));
					return;
				}

				this.addLog("INFO", "Auth", `User "${result.user?.username}" logged in successfully`);
				const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
				res.setHeader(
					"Set-Cookie",
					`andy_session=${result.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
				);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(result));
				return;
			}

			const token = this.getAuthToken(req);
			const authValidation = this.authManager.validateSession(token);
			const currentUser = authValidation.user;

			if (method === "POST" && url === "/api/auth/logout") {
				if (token) {
					this.authManager.logout(token);
				}
				res.setHeader("Set-Cookie", "andy_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true }));
				return;
			}

			if (method === "GET" && url === "/api/auth/status") {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify({
						authenticated: Boolean(currentUser),
						user: currentUser || null,
						totalUsers: this.authManager.getTotalUsersCount(),
					}),
				);
				return;
			}

			if (method === "GET" && url === "/api/auth/me") {
				if (!currentUser) {
					res.writeHead(401, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Unauthorized", authenticated: false }));
					return;
				}
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, user: currentUser }));
				return;
			}

			if (method === "POST" && url === "/api/auth/change-password") {
				if (!currentUser) {
					res.writeHead(401, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Unauthorized", code: "AUTH_REQUIRED" }));
					return;
				}
				const body = await this.readJsonBody<any>(req);
				const oldPassword = body?.oldPassword || "";
				const newPassword = body?.newPassword || "";
				const result = this.authManager.changePassword(currentUser.id, oldPassword, newPassword);
				if (!result.success) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify(result));
					return;
				}
				this.addLog("INFO", "Auth", `Password updated for user "${currentUser.username}"`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(result));
				return;
			}

			if (method === "GET" && url === "/api/auth/users") {
				if (!currentUser || currentUser.role !== "admin") {
					res.writeHead(403, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Permiso denegado. Se requiere rol de Administrador." }));
					return;
				}
				try {
					const users = this.authManager.listUsers(currentUser.id);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ success: true, users }));
				} catch (err: any) {
					res.writeHead(403, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: err.message || String(err) }));
				}
				return;
			}

			if (method === "POST" && url === "/api/auth/users") {
				if (!currentUser || currentUser.role !== "admin") {
					res.writeHead(403, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Permiso denegado. Se requiere rol de Administrador." }));
					return;
				}
				const body = await this.readJsonBody<any>(req);
				const result = this.authManager.createUser(currentUser.id, body || {});
				if (!result.success) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify(result));
					return;
				}
				this.addLog(
					"INFO",
					"Auth",
					`Admin "${currentUser.username}" created user "${result.user?.username}" (${result.user?.role})`,
				);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(result));
				return;
			}

			if ((method === "PUT" || method === "PATCH") && url.startsWith("/api/auth/users/")) {
				if (!currentUser || currentUser.role !== "admin") {
					res.writeHead(403, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Permiso denegado. Se requiere rol de Administrador." }));
					return;
				}
				const targetUserId = url.split("/")[4];
				const body = await this.readJsonBody<any>(req);

				if (body?.newPassword) {
					const passResult = this.authManager.adminResetPassword(currentUser.id, targetUserId, body.newPassword);
					if (!passResult.success) {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify(passResult));
						return;
					}
					this.addLog(
						"INFO",
						"Auth",
						`Admin "${currentUser.username}" reset password for user ID "${targetUserId}"`,
					);
				}

				const result = this.authManager.updateUser(currentUser.id, targetUserId, body || {});
				if (!result.success) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify(result));
					return;
				}
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(result));
				return;
			}

			if (method === "DELETE" && url.startsWith("/api/auth/users/")) {
				if (!currentUser || currentUser.role !== "admin") {
					res.writeHead(403, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Permiso denegado. Se requiere rol de Administrador." }));
					return;
				}
				const targetUserId = url.split("/")[4];
				const result = this.authManager.deleteUser(currentUser.id, targetUserId);
				if (!result.success) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify(result));
					return;
				}
				this.addLog("INFO", "Auth", `Admin "${currentUser.username}" deleted user ID "${targetUserId}"`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(result));
				return;
			}

			// --- ROUTE PROTECTION MIDDLEWARE FOR WEBUI /api/* ENDPOINTS ---
			const isPublicAuthRoute = url === "/api/auth/login" || url === "/api/auth/status" || url === "/api/auth/setup";

			const isIdeOpenAiRoute =
				url === "/v1/chat/completions" ||
				url === "/chat/completions" ||
				url.endsWith("/chat/completions") ||
				url === "/v1/models" ||
				url === "/models" ||
				url === "/api/models" ||
				url.endsWith("/models") ||
				url.startsWith("/v1/graft/") ||
				url === "/health" ||
				url === "/v1" ||
				url === "/v1/";

			if (url.startsWith("/api/") && !isPublicAuthRoute && !isIdeOpenAiRoute) {
				if (!authValidation.valid || !currentUser) {
					res.writeHead(401, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({
							error: "Sesión no válida o expirada. Inicia sesión para continuar.",
							code: "AUTH_REQUIRED",
						}),
					);
					return;
				}
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

			// --- 3.1 PROJECTS API ---
			if (method === "GET" && url === "/api/projects") {
				const data = this.pool.listProjects();
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(data, null, 2));
				return;
			}

			if (method === "POST" && url === "/api/projects") {
				const body = await this.readJsonBody<any>(req);
				try {
					const project = this.pool.createProject(body || {});
					this.addLog("INFO", "Projects", `Created project "${project.name}" at ${project.path}`);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ success: true, project }));
				} catch (err: any) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: err.message || String(err) }));
				}
				return;
			}

			if (method === "POST" && (url === "/api/projects/switch" || url === "/api/projects/active")) {
				const body = await this.readJsonBody<any>(req);
				const projectId = body?.projectId || body?.id;
				try {
					const activeProject = this.pool.switchProject(projectId);
					this.addLog(
						"INFO",
						"Projects",
						`Switched active project to "${activeProject.name}" (${activeProject.path})`,
					);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ success: true, activeProject, activeProjectId: activeProject.id }));
				} catch (err: any) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: err.message || String(err) }));
				}
				return;
			}

			if (method === "POST" && (url === "/api/projects/toggle-autonomy" || url === "/api/projects/autonomy")) {
				const body = await this.readJsonBody<any>(req);
				const targetId = body?.projectId || body?.id || this.pool.getActiveProject().id;
				try {
					let updated: any;
					if (body && typeof body.autonomousMode === "boolean") {
						updated = this.pool.updateProject(targetId, { autonomousMode: body.autonomousMode });
					} else {
						updated = this.pool.toggleProjectAutonomy(targetId);
					}
					this.addLog(
						"INFO",
						"Projects",
						`Set autonomousMode=${updated.autonomousMode !== false} for project "${updated.name}"`,
					);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({
							success: true,
							project: updated,
							autonomousMode: updated.autonomousMode !== false,
						}),
					);
				} catch (err: any) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: err.message || String(err) }));
				}
				return;
			}

			if ((method === "PUT" || method === "PATCH") && url.startsWith("/api/projects/")) {
				const projectId = url.split("/")[3];
				const body = await this.readJsonBody<any>(req);
				try {
					const updated = this.pool.updateProject(projectId, body || {});
					this.addLog("INFO", "Projects", `Updated project "${updated.name}"`);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ success: true, project: updated }));
				} catch (err: any) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: err.message || String(err) }));
				}
				return;
			}

			if (method === "DELETE" && url.startsWith("/api/projects/")) {
				const projectId = url.split("/")[3];
				try {
					this.pool.deleteProject(projectId);
					this.addLog("INFO", "Projects", `Deleted project ${projectId}`);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ success: true, activeProject: this.pool.getActiveProject() }));
				} catch (err: any) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: err.message || String(err) }));
				}
				return;
			}

			// --- 4. MEMORY.MD API ---
			const globalMemoryDir = existsSync(path.join(os.homedir(), ".andy", "agent"))
				? path.join(os.homedir(), ".andy", "agent")
				: existsSync(path.join(os.homedir(), ".prime", "agent"))
					? path.join(os.homedir(), ".prime", "agent")
					: path.join(os.homedir(), ".andy", "agent");
			const globalMemoryPath = path.join(globalMemoryDir, "MEMORY.md");

			if (method === "GET" && url === "/api/memory") {
				const scope = parsedUrl.searchParams.get("scope") || "project";
				const targetPath = scope === "global" ? globalMemoryPath : path.join(this.pool.cwd, "MEMORY.md");
				let content = "";
				if (existsSync(targetPath)) {
					content = readFileSync(targetPath, "utf-8");
				} else {
					content = `# Memory (${scope === "global" ? "Global" : `Project: ${this.pool.getActiveProject().name}`})\n\nGuarda aquí el contexto persistente, decisiones arquitectónicas y preferencias que Andy Agent debe recordar permanentemente.\n`;
				}
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ scope, path: targetPath, exists: existsSync(targetPath), content }));
				return;
			}

			if (method === "POST" && url === "/api/memory") {
				const body = await this.readJsonBody<any>(req);
				const scope = body?.scope || "project";
				const content = body?.content ?? "";
				const targetPath = scope === "global" ? globalMemoryPath : path.join(this.pool.cwd, "MEMORY.md");

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
			const globalAgentsMdPath = path.join(globalMemoryDir, "AGENTS.md");

			if (method === "GET" && url === "/api/instructions") {
				const scope = parsedUrl.searchParams.get("scope") || "project";
				const targetPath = scope === "global" ? globalAgentsMdPath : path.join(this.pool.cwd, "AGENTS.md");
				let content = "";
				if (existsSync(targetPath)) {
					content = readFileSync(targetPath, "utf-8");
				} else {
					content = `# Agent Instructions (AGENTS.md)\n\nDefine aquí las pautas de estilo, convenciones de código y comportamiento de Andy Agent para ${this.pool.getActiveProject().name}.\n`;
				}
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ scope, path: targetPath, exists: existsSync(targetPath), content }));
				return;
			}

			if (method === "POST" && url === "/api/instructions") {
				const body = await this.readJsonBody<any>(req);
				const scope = body?.scope || "project";
				const content = body?.content ?? "";
				const targetPath = scope === "global" ? globalAgentsMdPath : path.join(this.pool.cwd, "AGENTS.md");

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
				const modelsJsonPath = existsSync(path.join(os.homedir(), ".andy", "agent", "models.json"))
					? path.join(os.homedir(), ".andy", "agent", "models.json")
					: existsSync(path.join(os.homedir(), ".prime", "agent", "models.json"))
						? path.join(os.homedir(), ".prime", "agent", "models.json")
						: path.join(os.homedir(), ".andy", "agent", "models.json");

				let modelsConfig: any = { providers: {} };
				if (existsSync(modelsJsonPath)) {
					try {
						modelsConfig = JSON.parse(readFileSync(modelsJsonPath, "utf-8"));
					} catch {}
				}

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
					customBaseUrl:
						modelsConfig?.providers?.omniroute?.baseUrl ||
						modelsConfig?.providers?.custom?.baseUrl ||
						"http://ia.v2nethost.cl:20128/v1",
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

				const modelsJsonPath = existsSync(path.join(os.homedir(), ".andy", "agent", "models.json"))
					? path.join(os.homedir(), ".andy", "agent", "models.json")
					: existsSync(path.join(os.homedir(), ".prime", "agent", "models.json"))
						? path.join(os.homedir(), ".prime", "agent", "models.json")
						: path.join(os.homedir(), ".andy", "agent", "models.json");

				// Custom Base URL save
				if (body?.customBaseUrl || body?.baseUrl) {
					const targetBaseUrl = (body.customBaseUrl || body.baseUrl || "").trim();
					const targetProvider = body.customProvider || body.defaultProvider || "omniroute";
					if (targetBaseUrl) {
						let modelsConfig: any = { providers: {} };
						if (existsSync(modelsJsonPath)) {
							try {
								modelsConfig = JSON.parse(readFileSync(modelsJsonPath, "utf-8"));
							} catch {}
						}
						if (!modelsConfig.providers) modelsConfig.providers = {};
						if (!modelsConfig.providers[targetProvider]) modelsConfig.providers[targetProvider] = {};
						modelsConfig.providers[targetProvider].baseUrl = targetBaseUrl;
						if (targetProvider === "omniroute" || targetProvider === "custom") {
							modelsConfig.providers[targetProvider].api = "openai-completions";
							modelsConfig.providers[targetProvider].apiKey =
								body.customApiKey ||
								modelsConfig.providers[targetProvider].apiKey ||
								"sk-7fd5586a69f723fb-71d90e-838d8616";
							if (!Array.isArray(modelsConfig.providers[targetProvider].models)) {
								modelsConfig.providers[targetProvider].models = [];
							}
							const targetModelId = body.defaultModel || "auto/best-coding";
							const existing = modelsConfig.providers[targetProvider].models.find(
								(m: any) => m.id === targetModelId,
							);
							if (!existing) {
								modelsConfig.providers[targetProvider].models.push({
									id: targetModelId,
									name: `${targetProvider === "omniroute" ? "Omniroute" : "Custom"} (${targetModelId})`,
									api: "openai-completions",
									baseUrl: targetBaseUrl,
									reasoning: true,
									input: ["text", "image"],
								});
							}
							for (const m of modelsConfig.providers[targetProvider].models) {
								m.baseUrl = targetBaseUrl;
							}
						}
						const dir = path.dirname(modelsJsonPath);
						if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
						writeFileSync(modelsJsonPath, JSON.stringify(modelsConfig, null, 2), "utf-8");
						this.pool.getModelRegistry().refresh();
						this.addLog("INFO", "Settings", `Saved baseUrl for ${targetProvider}: ${targetBaseUrl}`);
					}
				}

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

				const modelsJsonPath = existsSync(path.join(os.homedir(), ".andy", "agent", "models.json"))
					? path.join(os.homedir(), ".andy", "agent", "models.json")
					: existsSync(path.join(os.homedir(), ".prime", "agent", "models.json"))
						? path.join(os.homedir(), ".prime", "agent", "models.json")
						: path.join(os.homedir(), ".andy", "agent", "models.json");

				let modelsConfig: any = { providers: {} };
				if (existsSync(modelsJsonPath)) {
					try {
						modelsConfig = JSON.parse(readFileSync(modelsJsonPath, "utf-8"));
					} catch {}
				}

				const baseProviders = [
					{
						id: "omniroute",
						name: "Omniroute / v2nethost",
						category: "Routers & Proxy",
						defaultBaseUrl: "http://ia.v2nethost.cl:20128/v1",
						defaultModel: "auto/best-coding",
						description: "Router multi-modelo con proxy inteligente de alta disponibilidad.",
					},
					{
						id: "openrouter",
						name: "OpenRouter",
						category: "Routers & Proxy",
						defaultBaseUrl: "https://openrouter.ai/api/v1",
						defaultModel: "anthropic/claude-3.5-sonnet",
						description: "Agregador global con acceso unificado a cientos de modelos de IA.",
					},
					{
						id: "openai",
						name: "OpenAI Oficial",
						category: "Propietarios",
						defaultBaseUrl: "https://api.openai.com/v1",
						defaultModel: "gpt-4o",
						description: "Modelos GPT-4o, GPT-4o-mini y series o1/o3 de OpenAI.",
					},
					{
						id: "anthropic",
						name: "Anthropic Claude",
						category: "Propietarios",
						defaultBaseUrl: "https://api.anthropic.com/v1",
						defaultModel: "claude-3-5-sonnet-20241022",
						description: "Familia Claude 3.5 Sonnet, Haiku y Opus para codificación avanzada.",
					},
					{
						id: "google",
						name: "Google Gemini",
						category: "Propietarios",
						defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
						defaultModel: "gemini-2.0-flash",
						description: "Modelos multimodales de Google con ventanas de contexto masivas.",
					},
					{
						id: "deepseek",
						name: "DeepSeek",
						category: "Open-Weight",
						defaultBaseUrl: "https://api.deepseek.com/v1",
						defaultModel: "deepseek-chat",
						description: "Modelos DeepSeek V3 y DeepSeek R1 de alto rendimiento y bajo costo.",
					},
					{
						id: "groq",
						name: "Groq LPU",
						category: "Inferencia Rápida",
						defaultBaseUrl: "https://api.groq.com/openai/v1",
						defaultModel: "llama-3.3-70b-versatile",
						description: "Inferencia ultra-rápida en chips LPU con latencias mínimas.",
					},
					{
						id: "mistral",
						name: "Mistral AI",
						category: "Open-Weight",
						defaultBaseUrl: "https://api.mistral.ai/v1",
						defaultModel: "codestral-latest",
						description: "Modelos Codestral, Mistral Large y Pixtral para desarrollo.",
					},
					{
						id: "xai",
						name: "xAI (Grok)",
						category: "Propietarios",
						defaultBaseUrl: "https://api.x.ai/v1",
						defaultModel: "grok-2-latest",
						description: "Modelos Grok 2 y Grok Beta de xAI.",
					},
					{
						id: "together",
						name: "Together AI",
						category: "Inferencia Rápida",
						defaultBaseUrl: "https://api.together.xyz/v1",
						defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
						description: "Infraestructura de inferencia en la nube para modelos de código abierto.",
					},
					{
						id: "fireworks",
						name: "Fireworks AI",
						category: "Inferencia Rápida",
						defaultBaseUrl: "https://api.fireworks.ai/inference/v1",
						defaultModel: "accounts/fireworks/models/qwen2p5-coder-32b-instruct",
						description: "Plataforma de inferencia rápida con Qwen 2.5 Coder y Llama.",
					},
					{
						id: "ollama",
						name: "Ollama Local",
						category: "Local / Autohospedado",
						defaultBaseUrl: "http://localhost:11434/v1",
						defaultModel: "qwen2.5-coder:latest",
						description: "Ejecución 100% privada y local sin requerir conexión a internet.",
					},
					{
						id: "lmstudio",
						name: "LM Studio Local",
						category: "Local / Autohospedado",
						defaultBaseUrl: "http://localhost:1234/v1",
						defaultModel: "local-model",
						description: "Servidor local de inferencia compatible con OpenAI en tu equipo.",
					},
					{
						id: "custom",
						name: "Endpoint OpenAI Personalizado",
						category: "Personalizado / Proxy",
						defaultBaseUrl: "http://localhost:8000/v1",
						defaultModel: "custom-model",
						description: "Cualquier servidor vLLM, LocalAI, TGI o proxy corporativo compatible.",
					},
				];

				const providers = baseProviders.map((p) => {
					const savedBaseUrl = modelsConfig?.providers?.[p.id]?.baseUrl;
					const isConfigured =
						savedList.includes(p.id) ||
						!!savedBaseUrl ||
						(p.id === "omniroute" && (savedList.includes("omniroute") || savedList.includes("openai-codex"))) ||
						p.id === "ollama" ||
						p.id === "lmstudio";

					return {
						...p,
						baseUrl: savedBaseUrl || p.defaultBaseUrl,
						savedBaseUrl: savedBaseUrl || null,
						isConfigured,
						isActive: defaultProvider === p.id,
					};
				});

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ providers, defaultProvider, savedAuth: savedList }, null, 2));
				return;
			}

			if (method === "POST" && url === "/api/providers") {
				const body = await this.readJsonBody<any>(req);
				const { provider, baseUrl, apiKey, defaultModel } = body;
				if (!provider) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Provider ID required" }));
					return;
				}

				const modelsJsonPath = existsSync(path.join(os.homedir(), ".andy", "agent", "models.json"))
					? path.join(os.homedir(), ".andy", "agent", "models.json")
					: existsSync(path.join(os.homedir(), ".prime", "agent", "models.json"))
						? path.join(os.homedir(), ".prime", "agent", "models.json")
						: path.join(os.homedir(), ".andy", "agent", "models.json");

				let modelsConfig: any = { providers: {} };
				if (existsSync(modelsJsonPath)) {
					try {
						modelsConfig = JSON.parse(readFileSync(modelsJsonPath, "utf-8"));
					} catch {}
				}

				// Persist baseUrl in models.json
				if (baseUrl && typeof baseUrl === "string" && baseUrl.trim()) {
					const cleanBaseUrl = baseUrl.trim();
					if (!modelsConfig.providers) modelsConfig.providers = {};
					if (!modelsConfig.providers[provider]) modelsConfig.providers[provider] = {};
					modelsConfig.providers[provider].baseUrl = cleanBaseUrl;

					if (provider === "omniroute" || provider === "custom") {
						modelsConfig.providers[provider].api = "openai-completions";
						modelsConfig.providers[provider].apiKey =
							apiKey || modelsConfig.providers[provider].apiKey || "sk-7fd5586a69f723fb-71d90e-838d8616";
						if (!Array.isArray(modelsConfig.providers[provider].models)) {
							modelsConfig.providers[provider].models = [];
						}
						const targetModelId = defaultModel || "auto/best-coding";
						const existing = modelsConfig.providers[provider].models.find((m: any) => m.id === targetModelId);
						if (!existing) {
							modelsConfig.providers[provider].models.push({
								id: targetModelId,
								name: `${provider === "omniroute" ? "Omniroute" : "Custom"} (${targetModelId})`,
								api: "openai-completions",
								baseUrl: cleanBaseUrl,
								reasoning: true,
								input: ["text", "image"],
							});
						}
						for (const m of modelsConfig.providers[provider].models) {
							m.baseUrl = cleanBaseUrl;
						}
					}

					const dir = path.dirname(modelsJsonPath);
					if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
					writeFileSync(modelsJsonPath, JSON.stringify(modelsConfig, null, 2), "utf-8");
					this.pool.getModelRegistry().refresh();
					this.addLog("INFO", "Providers", `Persisted baseUrl for provider "${provider}": ${cleanBaseUrl}`);
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
					`Configured active provider: ${provider} (BaseUrl: ${baseUrl || "default"}, Model: ${defaultModel || "auto"})`,
				);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, provider, baseUrl, defaultModel }));
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

			// --- 9.1 API KEYS MANAGEMENT (FOR VSCODE, KILOCODE, CURSOR INTEGRATION) ---
			if (method === "GET" && url === "/api/keys") {
				const keys = this.apiKeyManager.listKeys();
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ keys }, null, 2));
				return;
			}

			if (method === "POST" && url === "/api/keys") {
				const body = await this.readJsonBody<any>(req);
				const name = body?.name || "Clave IDE";
				const expiresAt = body?.expiresAt ? Number(body.expiresAt) : null;
				const newKey = this.apiKeyManager.createKey(name, expiresAt);
				this.addLog("INFO", "APIKeys", `Created API Key "${newKey.name}" (${newKey.id})`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, key: newKey }));
				return;
			}

			if (method === "DELETE" && url.startsWith("/api/keys/")) {
				const keyId = url.split("/")[3];
				const ok = this.apiKeyManager.deleteKey(keyId);
				this.addLog("INFO", "APIKeys", `Deleted API Key ${keyId}`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: ok, keyId }));
				return;
			}

			if (method === "POST" && url.startsWith("/api/keys/") && url.endsWith("/revoke")) {
				const keyId = url.split("/")[3];
				const ok = this.apiKeyManager.revokeKey(keyId);
				this.addLog("INFO", "APIKeys", `Revoked API Key ${keyId}`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: ok, keyId }));
				return;
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

			if (
				method === "GET" &&
				(url === "/v1/models" || url === "/models" || url === "/api/models" || url.endsWith("/models"))
			) {
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
				const targetProjectId = parsedUrl.searchParams.get("projectId") || undefined;
				const sessions = this.pool.listSessions(targetProjectId);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ sessions }, null, 2));
				return;
			}

			if (method === "GET" && url.startsWith("/api/sessions/") && url.endsWith("/messages")) {
				const parts = url.split("/");
				const sessionId = parts[3] || "default";
				const targetProjectId = parsedUrl.searchParams.get("projectId") || undefined;
				const sessionItem = await this.pool.getOrCreateSession(sessionId, undefined, undefined, targetProjectId);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ sessionId, messages: sessionItem.session.state.messages }, null, 2));
				return;
			}

			if (method === "GET" && url.startsWith("/api/sessions/") && url.endsWith("/tree")) {
				const parts = url.split("/");
				const sessionId = parts[3] || "default";
				const targetProjectId = parsedUrl.searchParams.get("projectId") || undefined;
				const sessionItem = await this.pool.getOrCreateSession(sessionId, undefined, undefined, targetProjectId);
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
			if (
				method === "POST" &&
				(url === "/v1/chat/completions" || url === "/chat/completions" || url.endsWith("/chat/completions"))
			) {
				await this.handleOpenAiChatCompletions(req, res);
				return;
			}

			// --- 13. GRAFT STUDIO API (PROJECT-ISOLATED) ---
			const targetProjectId = parsedUrl.searchParams.get("projectId") || undefined;
			const graft = this.pool.getGraftEngine(targetProjectId);

			if (method === "GET" && (url === "/v1/graft/map" || url === "/api/graft/map")) {
				const activeProj = this.pool.getProject(targetProjectId || "") || this.pool.getActiveProject();
				this.addLog(
					"TOOL",
					"Graft",
					`Executing graft.map() indexing for project "${activeProj.name}" (${activeProj.path})`,
				);
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

			if (method === "GET" && (url === "/v1/graft/graph" || url === "/api/graft/graph")) {
				const activeProj = this.pool.getProject(targetProjectId || "") || this.pool.getActiveProject();
				this.addLog("TOOL", "Graft", `Exporting Code Graph Data for project "${activeProj.name}"`);
				const graphData = await graft.graphData();
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(graphData, null, 2));
				return;
			}

			if (method === "GET" && (url === "/v1/graft/cycles" || url === "/api/graft/cycles")) {
				this.addLog("TOOL", "Graft", `Detecting Circular Dependencies`);
				const cycles = await graft.circularDependencies();
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ cycles, total: cycles.length }, null, 2));
				return;
			}

			if (method === "GET" && (url === "/v1/graft/dead-code" || url === "/api/graft/dead-code")) {
				this.addLog("TOOL", "Graft", `Detecting Unreferenced Dead Code`);
				const dead = await graft.deadCode();
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ dead, total: dead.length }, null, 2));
				return;
			}

			if (method === "GET" && (url === "/v1/graft/call-chain" || url === "/api/graft/call-chain")) {
				const symbol = parsedUrl.searchParams.get("symbol") || "";
				this.addLog("TOOL", "Graft", `Tracing Call Chain for "${symbol}"`);
				const chain = await graft.callChain(symbol);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(chain, null, 2));
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

			if (method === "GET" && (url === "/v1/graft/diagnostics" || url === "/api/graft/diagnostics")) {
				this.addLog("TOOL", "Graft", `Running Project Diagnostics for "${graft.cwd}"`);
				const diag = await graft.diagnostics();
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(diag, null, 2));
				return;
			}

			if (method === "POST" && (url === "/v1/graft/fix-cycle" || url === "/api/graft/fix-cycle")) {
				const body = await this.readJsonBody<any>(req);
				const cycle = body?.cycle || [];
				this.addLog("TOOL", "Graft", `Generating Fix for Cycle [${cycle.join(" -> ")}]`);
				const proposal = graft.suggestCycleFix(cycle);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(proposal, null, 2));
				return;
			}

			// --- 13. INTERACTIVE WEB TERMINAL API ---
			if (method === "POST" && (url === "/api/terminal/exec" || url === "/v1/terminal/exec")) {
				const body = await this.readJsonBody<any>(req);
				const command = (body?.command || "").trim();
				const targetProjectId = body?.projectId || parsedUrl.searchParams.get("projectId") || undefined;
				const activeProj = this.pool.getProject(targetProjectId || "") || this.pool.getActiveProject();
				const targetCwd = activeProj.path || this.pool.cwd;

				if (!command) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Command is required" }));
					return;
				}

				this.addLog("INFO", "Terminal", `Executing: "${command}" in "${targetCwd}"`);

				// Special interceptor for systemctl restart andy-agent
				const trimmedCmd = command.trim();
				if (
					trimmedCmd === "systemctl restart andy-agent" ||
					trimmedCmd === "sudo systemctl restart andy-agent" ||
					trimmedCmd === "systemctl --user restart andy-agent" ||
					trimmedCmd === "pm2 restart andy-agent"
				) {
					this.addLog("WARN", "System", `Terminal command triggered system restart: "${trimmedCmd}"`);
					if (body?.stream === true) {
						res.writeHead(200, {
							"Content-Type": "text/event-stream; charset=utf-8",
							"Cache-Control": "no-cache, no-transform",
							Connection: "keep-alive",
						});
						res.write(
							`data: ${JSON.stringify({
								type: "stdout",
								text: `[SYSTEM] Ejecutando: ${trimmedCmd}\n[SYSTEM] Reiniciando Andy Agent... esperando reconexión...\n`,
							})}\n\n`,
						);
						res.write(`data: ${JSON.stringify({ type: "exit", code: 0 })}\n\n`);
						res.write("data: [DONE]\n\n");
						res.end();
					} else {
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(
							JSON.stringify({
								command,
								cwd: targetCwd,
								exitCode: 0,
								stdout: `[SYSTEM] Ejecutando: ${trimmedCmd}\n[SYSTEM] Reiniciando Andy Agent...\n`,
								stderr: "",
								success: true,
							}),
						);
					}

					setTimeout(() => {
						const isWindows = process.platform === "win32";
						if (!isWindows) {
							try {
								spawn("systemctl", ["restart", "andy-agent"], { detached: true, stdio: "ignore" }).unref();
							} catch {}
							try {
								spawn("systemctl", ["--user", "restart", "andy-agent"], {
									detached: true,
									stdio: "ignore",
								}).unref();
							} catch {}
						}
						process.exit(0);
					}, 600);
					return;
				}

				const isWindows = process.platform === "win32";
				const shell = isWindows ? "powershell.exe" : "/bin/bash";
				const shellArgs = isWindows ? ["-NoProfile", "-Command", command] : ["-c", command];

				if (body?.stream === true) {
					res.writeHead(200, {
						"Content-Type": "text/event-stream; charset=utf-8",
						"Cache-Control": "no-cache, no-transform",
						Connection: "keep-alive",
					});

					const proc = spawn(shell, shellArgs, { cwd: targetCwd, env: process.env });
					proc.stdout.on("data", (chunk) => {
						res.write(`data: ${JSON.stringify({ type: "stdout", text: chunk.toString("utf-8") })}\n\n`);
					});
					proc.stderr.on("data", (chunk) => {
						res.write(`data: ${JSON.stringify({ type: "stderr", text: chunk.toString("utf-8") })}\n\n`);
					});
					proc.on("close", (code) => {
						res.write(`data: ${JSON.stringify({ type: "exit", code: code ?? 0 })}\n\n`);
						res.write("data: [DONE]\n\n");
						res.end();
					});
					proc.on("error", (err) => {
						res.write(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`);
						res.end();
					});
				} else {
					const proc = spawn(shell, shellArgs, { cwd: targetCwd, env: process.env });
					let stdout = "";
					let stderr = "";
					proc.stdout.on("data", (chunk) => {
						stdout += chunk.toString("utf-8");
					});
					proc.stderr.on("data", (chunk) => {
						stderr += chunk.toString("utf-8");
					});
					proc.on("close", (code) => {
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(
							JSON.stringify({
								command,
								cwd: targetCwd,
								exitCode: code ?? 0,
								stdout,
								stderr,
								success: (code ?? 0) === 0,
							}),
						);
					});
					proc.on("error", (err) => {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: err.message }));
					});
				}
				return;
			}

			// --- 13.2 SYSTEM RESTART API ---
			if (method === "POST" && (url === "/api/system/restart" || url === "/v1/system/restart")) {
				this.addLog("WARN", "System", "Server restart initiated via /api/system/restart");
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify({
						success: true,
						message: "Reiniciando Andy Agent... el servicio volverá en unos segundos.",
						action: "restart",
					}),
				);

				setTimeout(() => {
					const isWindows = process.platform === "win32";
					if (!isWindows) {
						try {
							spawn("systemctl", ["restart", "andy-agent"], { detached: true, stdio: "ignore" }).unref();
						} catch {}
						try {
							spawn("systemctl", ["--user", "restart", "andy-agent"], {
								detached: true,
								stdio: "ignore",
							}).unref();
						} catch {}
						try {
							spawn("pm2", ["restart", "andy-agent"], { detached: true, stdio: "ignore" }).unref();
						} catch {}
					}
					process.exit(0);
				}, 600);
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

			// --- 15. PANTHEON MULTI-AGENT API ---
			const pantheonRegistry = this.pool.getPantheonRegistry(targetProjectId);

			if (method === "GET" && (url === "/api/pantheon/agents" || url === "/v1/pantheon/agents")) {
				const agents = pantheonRegistry.getAgents();
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ agents, total: agents.length }, null, 2));
				return;
			}

			if (method === "POST" && (url === "/api/pantheon/agents" || url === "/v1/pantheon/agents")) {
				const body = await this.readJsonBody<any>(req);
				const saved = pantheonRegistry.saveAgent(body);
				this.addLog("INFO", "Pantheon", `Saved Pantheon Agent "${saved.name}" (${saved.role})`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, agent: saved }));
				return;
			}

			if (
				method === "DELETE" &&
				(url.startsWith("/api/pantheon/agents/") || url.startsWith("/v1/pantheon/agents/"))
			) {
				const agentId = url.split("/")[4] || url.split("/")[3];
				const deleted = pantheonRegistry.deleteAgent(agentId);
				this.addLog("INFO", "Pantheon", `Deleted Pantheon Agent "${agentId}": ${deleted}`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: deleted, agentId }));
				return;
			}

			if (method === "GET" && (url === "/api/pantheon/squads" || url === "/v1/pantheon/squads")) {
				const squads = pantheonRegistry.getSquads();
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ squads, total: squads.length }, null, 2));
				return;
			}

			if (method === "POST" && (url === "/api/pantheon/squads" || url === "/v1/pantheon/squads")) {
				const body = await this.readJsonBody<any>(req);
				const saved = pantheonRegistry.saveSquad(body);
				this.addLog("INFO", "Pantheon", `Saved Pantheon Squad "${saved.name}"`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, squad: saved }));
				return;
			}

			if (
				method === "DELETE" &&
				(url.startsWith("/api/pantheon/squads/") || url.startsWith("/v1/pantheon/squads/"))
			) {
				const squadId = url.split("/")[4] || url.split("/")[3];
				const deleted = pantheonRegistry.deleteSquad(squadId);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: deleted, squadId }));
				return;
			}

			if (method === "POST" && (url === "/api/pantheon/chat" || url === "/v1/pantheon/chat")) {
				const body = await this.readJsonBody<any>(req);
				const squadId = body?.squadId || "fullstack-squad";
				const prompt = (body?.prompt || "").trim();
				const targetAgentId = body?.targetAgentId || undefined;
				const projectId = body?.projectId || parsedUrl.searchParams.get("projectId") || undefined;
				const activeProj = this.pool.getProject(projectId || "") || this.pool.getActiveProject();
				const pantheonOrchestrator = this.pool.getPantheonOrchestrator(activeProj.id);

				if (!prompt) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Prompt is required" }));
					return;
				}

				this.addLog(
					"INFO",
					"Pantheon",
					`Squad "${squadId}" Turn Initiated on project "${activeProj.name}" (${activeProj.path}): "${prompt.slice(0, 80)}..."`,
				);

				res.writeHead(200, {
					"Content-Type": "text/event-stream; charset=utf-8",
					"Cache-Control": "no-cache, no-transform",
					Connection: "keep-alive",
				});

				const llmCaller = async (messages: any[], modelId: string, temp: number, systemPrompt?: string) => {
					const targetModel = this.pool.findModel(modelId);
					if (!targetModel) {
						return `[Modelo ${modelId} no encontrado en el registro de proveedores]`;
					}
					const authStorage = this.pool.getAuthStorage();
					const apiKey = await authStorage.getApiKey(targetModel.provider);
					const now = Date.now();

					let effectiveSystemPrompt = systemPrompt || "";
					const validMessages: Message[] = [];

					for (const m of messages) {
						if (m.role === "system") {
							if (!effectiveSystemPrompt) {
								effectiveSystemPrompt = m.content || "";
							}
						} else if (m.role === "user") {
							validMessages.push({
								role: "user",
								content: m.content || "",
								timestamp: now,
							});
						} else if (m.role === "assistant") {
							validMessages.push({
								role: "assistant",
								content: [{ type: "text", text: m.content || "" }],
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
								timestamp: now,
							});
						}
					}

					if (validMessages.length === 0) {
						validMessages.push({
							role: "user",
							content: "Por favor procede con la tarea encomendada.",
							timestamp: now,
						});
					}

					const context: Context = {
						systemPrompt: effectiveSystemPrompt,
						messages: validMessages,
					};

					const streamOptions = {
						apiKey: apiKey || undefined,
						temperature: temp ?? 0.2,
						maxTokens: 4096,
					};

					async function* textStream() {
						try {
							const eventStream = stream(targetModel!, context, streamOptions);
							for await (const ev of eventStream) {
								if (ev.type === "text_delta") {
									yield ev.delta;
								} else if (ev.type === "error") {
									yield `\n[Error del proveedor: ${ev.error?.errorMessage || "Inferencia fallida"}]`;
								}
							}
						} catch (err: any) {
							yield `\n[Error al conectar con ${modelId}: ${err.message || String(err)}]`;
						}
					}

					return textStream();
				};

				try {
					await pantheonOrchestrator.executeTurn(
						squadId,
						prompt,
						async (event) => {
							if (!res.writableEnded) {
								res.write(`data: ${JSON.stringify(event)}\n\n`);
							}
						},
						{
							targetAgentId,
							llmCaller,
							projectInfo: {
								id: activeProj.id,
								name: activeProj.name,
								path: activeProj.path,
								description: activeProj.description,
							},
						},
					);
				} catch (err: any) {
					this.addLog("ERROR", "Pantheon", `Turn error: ${err.message || String(err)}`);
					if (!res.writableEnded) {
						res.write(`data: ${JSON.stringify({ type: "error", error: err.message || String(err) })}\n\n`);
					}
				} finally {
					if (!res.writableEnded) {
						res.write("data: [DONE]\n\n");
						res.end();
					}
				}
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

		const projectId = body?.projectId;
		const provider = body?.provider;
		const sessionItem = await this.pool.getOrCreateSession(sessionId, modelId, provider, projectId);
		const session = sessionItem.session;

		res.writeHead(200, {
			"Content-Type": "text/event-stream; charset=utf-8",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		});

		const sendEvent = (event: any) => {
			if (!res.writableEnded) {
				res.write(`data: ${JSON.stringify(event)}\n\n`);
			}
		};

		let fullAssistantText = "";
		const unsubscribe = session.subscribe((event: any) => {
			if (event.type === "message_start") {
				if (event.message?.role === "assistant") {
					this.addLog("RLM", "Turn", "Assistant turn started");
				}
			} else if (event.type === "message_update") {
				if (event.assistantMessageEvent) {
					const ame = event.assistantMessageEvent;
					if (ame.type === "text_delta") {
						fullAssistantText += ame.delta;
						sendEvent({ type: "token", content: ame.delta });
					} else if (ame.type === "thinking_delta") {
						sendEvent({ type: "reasoning", content: ame.delta });
					} else if (ame.type === "error") {
						const errText = ame.error?.errorMessage || "Error en el proveedor del modelo";
						this.addLog("ERROR", "Chat", `Provider stream error: ${errText}`);
						sendEvent({ type: "error", error: errText });
					}
				}
			} else if (event.type === "tool_execution_start" || event.type === "tool_call") {
				const toolName = event.toolName || event.tool;
				const toolArgs = event.args || event.input;
				this.addLog("TOOL", toolName, "Tool call started", toolArgs);
				sendEvent({ type: "tool_start", tool: toolName, input: toolArgs });
			} else if (event.type === "tool_execution_end" || event.type === "tool_result") {
				const toolName = event.toolName || event.tool;
				this.addLog("TOOL", toolName, "Tool call completed");
				sendEvent({ type: "tool_result", tool: toolName, output: event.result });
			} else if (event.type === "turn_end") {
				if (event.message?.role === "assistant") {
					if ((event.message as any).stopReason === "error") {
						const errText = (event.message as any).errorMessage || "Error en la respuesta del modelo";
						sendEvent({ type: "error", error: errText });
					}
				}
			}
		});

		req.on("close", () => {
			if (session.isStreaming) {
				session.abort().catch(() => {});
			}
		});

		try {
			const targetProject = this.pool.getProject(sessionItem.projectId) || this.pool.getActiveProject();
			const isAutonomous = targetProject.autonomousMode !== false;

			let effectivePrompt = promptText;
			const msgs = session.state.messages || [];
			const isFirstTurn = msgs.length === 0 || !msgs.some((m: any) => m.role === "assistant");
			if (isAutonomous && isFirstTurn) {
				const autonomousDirective = `[AUTONOMOUS_AGENT_MODE: ACTIVE]\nYou are operating in Goose-style Autonomous Mode for this project. You have full authority to directly read, create, and edit files, run terminal commands, execute tests, and make sequential tool calls without pausing to ask the user for confirmation. Execute the required steps and solve the objective completely.\n\n`;
				effectivePrompt = autonomousDirective + promptText;
			}

			if (session.isStreaming) {
				await session.prompt(effectivePrompt, { streamingBehavior: "followUp" });
			} else {
				await session.prompt(effectivePrompt);
			}

			// Fallback: If no streaming tokens were captured, extract from session state messages
			if (!fullAssistantText) {
				const msgs = session.state.messages || [];
				const lastAssistantMsg = msgs.filter((m: any) => m.role === "assistant").pop() as any;
				if (lastAssistantMsg) {
					let extracted = "";
					if (typeof lastAssistantMsg.content === "string") {
						extracted = lastAssistantMsg.content;
					} else if (Array.isArray(lastAssistantMsg.content)) {
						extracted = lastAssistantMsg.content
							.filter((c: any) => c.type === "text")
							.map((c: any) => c.text)
							.join("\n");
					}
					if (extracted) {
						fullAssistantText = extracted;
						sendEvent({ type: "token", content: extracted });
					}
					if (lastAssistantMsg.stopReason === "error") {
						const errText = lastAssistantMsg.errorMessage || "Error en la respuesta del modelo";
						sendEvent({ type: "error", error: errText });
					}
				}
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
			sendEvent({ type: "done" });
			res.write("data: [DONE]\n\n");
			res.end();
		} finally {
			unsubscribe();
		}
	}

	private isRepetitionLoop(text: string): boolean {
		if (!text || text.length < 100) return false;
		const tail = text.slice(-600);
		for (let len = 12; len <= 120; len++) {
			const chunk = tail.slice(-len);
			let count = 0;
			let pos = tail.length - len;
			while (pos >= 0 && tail.slice(pos, pos + len) === chunk) {
				count++;
				pos -= len;
				if (count >= 4) return true;
			}
		}
		// Also detect repeated <unk> tokens
		if (/<unk>(?:\s*<unk>){3,}/.test(tail)) return true;
		return false;
	}

	private sanitizeAssistantText(text: string): string {
		if (!text) return text;
		return text
			.replace(/(?:<unk>)+/g, "")
			.replace(/<\/parameter>\s*<\/function>\s*<\/tool_call>/g, "")
			.trim();
	}

	private async handleOpenAiChatCompletions(req: IncomingMessage, res: ServerResponse): Promise<void> {
		// Validar API Key
		const authHeader = (req.headers.authorization as string) || (req.headers["x-api-key"] as string) || "";
		const authResult = this.apiKeyManager.validateKey(authHeader);
		if (!authResult.valid) {
			this.addLog(
				"WARN",
				"Auth",
				`Unauthorized API access to /v1/chat/completions: ${authResult.reason || "Invalid key"}`,
			);
			res.writeHead(401, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({
					error: {
						message:
							authResult.reason ||
							"Incorrect or missing API key. Manage your API keys in the Andy Agent WebUI under the API Keys tab.",
						type: "invalid_request_error",
						param: null,
						code: "invalid_api_key",
					},
				}),
			);
			return;
		}

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

		// Detect client type / IDE and create or reuse dedicated Project
		const userAgent = (req.headers["user-agent"] as string) || "";
		let clientHint = "";
		if (userAgent.toLowerCase().includes("kilocode") || userAgent.toLowerCase().includes("kilo"))
			clientHint = "Kilo Code";
		else if (userAgent.toLowerCase().includes("cline")) clientHint = "Cline (VSCode)";
		else if (userAgent.toLowerCase().includes("roo")) clientHint = "Roo Code";
		else if (userAgent.toLowerCase().includes("cursor")) clientHint = "Cursor";
		else if (userAgent.toLowerCase().includes("windsurf")) clientHint = "Windsurf";
		else if (userAgent.toLowerCase().includes("continue")) clientHint = "Continue";
		else if (userAgent.toLowerCase().includes("vscode") || userAgent.toLowerCase().includes("code"))
			clientHint = "VS Code";
		else if (userAgent.toLowerCase().includes("python")) clientHint = "Python SDK";
		else if (userAgent.toLowerCase().includes("curl")) clientHint = "CLI / cURL";

		const customWorkspace =
			(req.headers["x-workspace-path"] as string) ||
			(req.headers["x-project-path"] as string) ||
			(req.headers["x-project-dir"] as string) ||
			undefined;

		const ideProject = this.pool.getOrCreateIdeProject(authResult.key, clientHint, customWorkspace);
		const customSessionId = (req.headers["x-session-id"] as string) || (body.user as string);
		const sessionId = customSessionId ? `ide-${ideProject.id}-${customSessionId}` : `ide-session-${ideProject.id}`;

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
			`Incoming chat completion for model "${modelId}" (project: "${ideProject.name}", session: ${sessionId}, stream: ${isStream})`,
		);

		const sessionItem = await this.pool.getOrCreateSession(sessionId, modelId, undefined, ideProject.id);
		const session = sessionItem.session;
		const targetModel = session.model;
		if (!targetModel) {
			res.writeHead(400, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: { message: `Model "${modelId}" could not be resolved.` } }));
			return;
		}

		// Set human-readable title for the IDE chat session
		const firstUserMsg = nonSystem.find((m: any) => m.role === "user");
		if (firstUserMsg) {
			const promptSnippet =
				typeof firstUserMsg.content === "string"
					? firstUserMsg.content
					: Array.isArray(firstUserMsg.content)
						? firstUserMsg.content.map((c: any) => c.text || "").join(" ")
						: "";
			if (
				promptSnippet &&
				(!sessionItem.title || sessionItem.title.startsWith("Chat ") || sessionItem.title.startsWith("IDE Chat"))
			) {
				sessionItem.title = `${ideProject.clientName || "IDE"}: ${promptSnippet.slice(0, 32)}${promptSnippet.length > 32 ? "..." : ""}`;
			}
		}

		// Parse tools from OpenAI format if provided by Kilo Code / VS Code
		let tools: Tool[] | undefined;
		if (Array.isArray(body.tools) && body.tools.length > 0) {
			tools = body.tools
				.map((t: any) => {
					if (t.type === "function" && t.function) {
						return {
							name: t.function.name,
							description: t.function.description || "",
							parameters: t.function.parameters || { type: "object", properties: {} },
						};
					}
					if (t.name && t.parameters) {
						return {
							name: t.name,
							description: t.description || "",
							parameters: t.parameters,
						};
					}
					return null;
				})
				.filter(Boolean) as Tool[];
		}

		const contextMessages: Message[] = nonSystem.map((m: any) => {
			if (m.role === "assistant") {
				const contentParts: (TextContent | ThinkingContent | ToolCall)[] = [];
				if (typeof m.content === "string" && m.content) {
					contentParts.push({ type: "text", text: m.content });
				} else if (Array.isArray(m.content)) {
					for (const part of m.content) {
						if (part.type === "text" && part.text) {
							contentParts.push({ type: "text", text: part.text });
						} else if (part.type === "thinking" && part.thinking) {
							contentParts.push({ type: "thinking", thinking: part.thinking });
						}
					}
				}
				if (Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
					for (const tc of m.tool_calls) {
						const fn = tc.function || tc;
						let argsObj: any = {};
						if (typeof fn.arguments === "string") {
							try {
								argsObj = JSON.parse(fn.arguments);
							} catch {
								argsObj = { raw: fn.arguments };
							}
						} else if (typeof fn.arguments === "object" && fn.arguments) {
							argsObj = fn.arguments;
						}
						contentParts.push({
							type: "toolCall",
							id: tc.id || `call_${Math.random().toString(36).substring(2, 9)}`,
							name: fn.name,
							arguments: argsObj,
						});
					}
				}
				if (contentParts.length === 0) {
					contentParts.push({ type: "text", text: "" });
				}
				return {
					role: "assistant",
					content: contentParts,
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
					stopReason: m.tool_calls?.length ? "toolUse" : "stop",
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
			tools,
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
			temperature: isConsolidationRequest ? 0 : (body.temperature ?? 0.2),
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
				choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
			};
			res.write(`data: ${JSON.stringify(initialChunk)}\n\n`);

			let accumulatedText = "";
			let finishReason: string | null = null;
			let finalUsage: any = null;
			const toolIndexMap = new Map<number, number>();
			let nextToolIndex = 0;

			try {
				const eventStream = stream(targetModel, context, streamOptions);
				for await (const event of eventStream) {
					if (isAborted || res.writableEnded) break;
					if (event.type === "text_delta") {
						accumulatedText += event.delta;

						// Anti-repetition & Model Collapse Guard
						if (this.isRepetitionLoop(accumulatedText)) {
							this.addLog(
								"WARN",
								"OpenAI Bridge",
								`Repetition loop / model collapse detected for session "${sessionId}". Aborting stream gracefully.`,
							);
							finishReason = "stop";
							abortCtrl.abort();
							break;
						}

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
								{
									index: 0,
									delta: { reasoning_content: event.delta, reasoning: event.delta },
									finish_reason: null,
								},
							],
						};
						res.write(`data: ${JSON.stringify(chunk)}\n\n`);
					} else if (event.type === "toolcall_start") {
						if (!toolIndexMap.has(event.contentIndex)) {
							toolIndexMap.set(event.contentIndex, nextToolIndex++);
						}
						const tcIndex = toolIndexMap.get(event.contentIndex) ?? 0;
						const tc = event.partial.content[event.contentIndex] as ToolCall;
						const chunk = {
							id: reqId,
							object: "chat.completion.chunk",
							created: Math.floor(Date.now() / 1000),
							model: modelId,
							choices: [
								{
									index: 0,
									delta: {
										tool_calls: [
											{
												index: tcIndex,
												id: tc?.id || `call_${Math.random().toString(36).substring(2, 9)}`,
												type: "function",
												function: {
													name: tc?.name || "",
													arguments: "",
												},
											},
										],
									},
									finish_reason: null,
								},
							],
						};
						res.write(`data: ${JSON.stringify(chunk)}\n\n`);
					} else if (event.type === "toolcall_delta") {
						if (!toolIndexMap.has(event.contentIndex)) {
							toolIndexMap.set(event.contentIndex, nextToolIndex++);
						}
						const tcIndex = toolIndexMap.get(event.contentIndex) ?? 0;
						const chunk = {
							id: reqId,
							object: "chat.completion.chunk",
							created: Math.floor(Date.now() / 1000),
							model: modelId,
							choices: [
								{
									index: 0,
									delta: {
										tool_calls: [
											{
												index: tcIndex,
												function: {
													arguments: event.delta,
												},
											},
										],
									},
									finish_reason: null,
								},
							],
						};
						res.write(`data: ${JSON.stringify(chunk)}\n\n`);
					} else if (event.type === "done") {
						finalUsage = event.message?.usage;
						if (event.reason === "toolUse") {
							finishReason = "tool_calls";
						}
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
				const cleanText = this.sanitizeAssistantText(accumulatedText);

				this.autoLearner
					.processTurn({
						sessionId,
						prompt: lastUserText,
						assistantResponse: cleanText,
						modelId,
					})
					.catch((err) => this.addLog("WARN", "AutoLearn", `Error: ${err.message}`));

				// Persist chat session with full context and assistant response for WebUI visibility
				try {
					const assistantContent: (TextContent | ThinkingContent | ToolCall)[] = [];
					if (cleanText) {
						assistantContent.push({ type: "text", text: cleanText });
					}
					const finalAssistantMessage: AssistantMessage = {
						role: "assistant",
						content: assistantContent,
						api: targetModel.api,
						provider: targetModel.provider,
						model: targetModel.id,
						usage: finalUsage || {
							input: 0,
							output: 0,
							cacheRead: 0,
							cacheWrite: 0,
							totalTokens: 0,
							cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
						},
						stopReason: finishReason === "tool_calls" ? "toolUse" : "stop",
						timestamp: Date.now(),
					};
					(sessionItem.session.state as any).messages = [...contextMessages, finalAssistantMessage];
					sessionItem.lastActive = Date.now();
					this.pool.persistSession(sessionItem);
				} catch (err: any) {
					this.addLog("WARN", "OpenAI Bridge", `Failed to persist IDE session: ${err.message}`);
				}

				if (!res.writableEnded) {
					const stopChunk: any = {
						id: reqId,
						object: "chat.completion.chunk",
						created: Math.floor(Date.now() / 1000),
						model: modelId,
						choices: [{ index: 0, delta: {}, finish_reason: finishReason || "stop" }],
					};
					if (finalUsage) {
						stopChunk.usage = {
							prompt_tokens: finalUsage.input || 0,
							completion_tokens: finalUsage.output || 0,
							total_tokens: finalUsage.totalTokens || 0,
						};
					}
					res.write(`data: ${JSON.stringify(stopChunk)}\n\n`);

					if (body.stream_options?.include_usage && finalUsage) {
						const usageChunk = {
							id: reqId,
							object: "chat.completion.chunk",
							created: Math.floor(Date.now() / 1000),
							model: modelId,
							choices: [],
							usage: {
								prompt_tokens: finalUsage.input || 0,
								completion_tokens: finalUsage.output || 0,
								total_tokens: finalUsage.totalTokens || 0,
							},
						};
						res.write(`data: ${JSON.stringify(usageChunk)}\n\n`);
					}

					res.write("data: [DONE]\n\n");
					res.end();
				}
			}
		} else {
			// Non-streaming standard JSON response
			try {
				const result = await complete(targetModel, context, streamOptions);
				let accumulatedText = "";
				const toolCalls: any[] = [];
				if (Array.isArray(result.content)) {
					for (const c of result.content) {
						if (c.type === "text") {
							accumulatedText += (accumulatedText ? "\n" : "") + (c.text || "");
						} else if (c.type === "toolCall") {
							toolCalls.push({
								id: c.id,
								type: "function",
								function: {
									name: c.name,
									arguments: typeof c.arguments === "string" ? c.arguments : JSON.stringify(c.arguments || {}),
								},
							});
						}
					}
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

				// Persist chat session for non-streaming response
				try {
					const assistantContent: (TextContent | ThinkingContent | ToolCall)[] = [];
					if (accumulatedText) {
						assistantContent.push({ type: "text", text: accumulatedText });
					}
					if (toolCalls.length > 0) {
						for (const tc of toolCalls) {
							assistantContent.push({
								type: "toolCall",
								id: tc.id,
								name: tc.function.name,
								arguments:
									typeof tc.function.arguments === "string"
										? JSON.parse(tc.function.arguments || "{}")
										: tc.function.arguments,
							});
						}
					}
					const finalAssistantMessage: AssistantMessage = {
						role: "assistant",
						content: assistantContent,
						api: targetModel.api,
						provider: targetModel.provider,
						model: targetModel.id,
						usage: {
							input: result.usage?.input || 0,
							output: result.usage?.output || 0,
							cacheRead: result.usage?.cacheRead || 0,
							cacheWrite: result.usage?.cacheWrite || 0,
							totalTokens: result.usage?.totalTokens || 0,
							cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
						},
						stopReason: toolCalls.length > 0 ? "toolUse" : "stop",
						timestamp: Date.now(),
					};
					(sessionItem.session.state as any).messages = [...contextMessages, finalAssistantMessage];
					sessionItem.lastActive = Date.now();
					this.pool.persistSession(sessionItem);
				} catch (err: any) {
					this.addLog("WARN", "OpenAI Bridge", `Failed to persist IDE session: ${err.message}`);
				}

				const messageObj: any = {
					role: "assistant",
					content: accumulatedText || null,
				};
				if (toolCalls.length > 0) {
					messageObj.tool_calls = toolCalls;
				}

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
								message: messageObj,
								finish_reason: toolCalls.length > 0 ? "tool_calls" : "stop",
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
