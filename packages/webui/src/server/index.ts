import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
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
import type { PantheonMessage } from "@earendil-works/pi-coding-agent";
import { ApiKeyManager } from "./api-key-manager.js";
import { AuthManager, type AndyUserPublic } from "./auth-manager.js";
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
							version: "0.9.0",
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

			// --- 2.05 ANDY CODE EXTENSION AUTH & CONNECTION (DASHBOARD/CONNECT) ---
			if (url === "/dashboard/connect" || url.startsWith("/dashboard/connect")) {
				await this.handleDashboardConnect(req, res, parsedUrl, currentUser);
				return;
			}

			if (method === "POST" && url === "/api/extension/auth/connect") {
				await this.handleExtensionAuthConnect(req, res, parsedUrl, currentUser);
				return;
			}

			if ((method === "GET" || method === "POST") && url === "/api/extension/auth/verify") {
				await this.handleExtensionAuthVerify(req, res);
				return;
			}

			// --- 2.06 ANDY GATEWAY MODELS & AGENT DISCOVERY API ---
			if (
				method === "GET" &&
				(url === "/api/gateway/v1/models" ||
					url === "/v1/models" ||
					url === "/api/models" ||
					url === "/api/gateway/models")
			) {
				await this.handleGatewayModels(req, res);
				return;
			}

			if (
				method === "GET" &&
				(url === "/api/gateway/v1/agent-config" || url === "/api/extension/agent-config")
			) {
				await this.handleExtensionAgentConfig(req, res, parsedUrl);
				return;
			}

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

			// --- BRANDING CONFIG API ---
			const globalBrandingPath = path.join(globalMemoryDir, "branding.json");
			const defaultBranding = {
				appName: "Andy Agent",
				appSlogan: "Context Engine & WebUI",
				appBadge: "RLM",
				logoType: "icon",
				logoValue: "Ψ",
				logoGradient: "from-brand-600 to-indigo-500",
			};

			if (method === "GET" && url === "/api/branding") {
				let branding = { ...defaultBranding };
				if (existsSync(globalBrandingPath)) {
					try {
						branding = { ...defaultBranding, ...JSON.parse(readFileSync(globalBrandingPath, "utf-8")) };
					} catch {}
				}
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, branding }));
				return;
			}

			if (method === "POST" && url === "/api/branding") {
				const body = await this.readJsonBody<any>(req);
				const branding = {
					appName: (body?.appName || defaultBranding.appName).trim(),
					appSlogan: (body?.appSlogan || defaultBranding.appSlogan).trim(),
					appBadge: (body?.appBadge || defaultBranding.appBadge).trim(),
					logoType: body?.logoType || defaultBranding.logoType,
					logoValue: body?.logoValue || defaultBranding.logoValue,
					logoGradient: body?.logoGradient || defaultBranding.logoGradient,
				};
				const dir = path.dirname(globalBrandingPath);
				if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
				writeFileSync(globalBrandingPath, JSON.stringify(branding, null, 2), "utf-8");
				this.addLog("INFO", "Branding", `Updated branding: ${branding.appName} (${branding.appSlogan})`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, branding }));
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
				const { name, description, prompt, scope } = body || {};
				if (!name) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Skill name is required" }));
					return;
				}
				const safeName = path.basename(name).replace(/[^a-zA-Z0-9_-]/g, "_");
				const baseDir = scope === "global" ? globalSkillsDir : projectSkillsDir;
				const skillDir = path.join(baseDir, safeName);
				if (!existsSync(skillDir)) mkdirSync(skillDir, { recursive: true });
				const skillFile = path.join(skillDir, "SKILL.md");
				const skillContent = `---
name: ${safeName}
description: ${description || safeName}
---

${prompt || ""}`;
				writeFileSync(skillFile, skillContent, "utf-8");
				this.addLog("INFO", "Skills", `Saved skill: ${safeName} (${scope || "project"})`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, name: safeName, path: skillFile }));
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
				const { name, content, scope } = body || {};
				if (!name) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Prompt name is required" }));
					return;
				}
				const safeName = path.basename(name).replace(/[^a-zA-Z0-9_\-.]/g, "_");
				const baseDir = scope === "global" ? globalPromptsDir : projectPromptsDir;
				if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true });
				const promptFile = path.join(baseDir, `${safeName}.md`);
				writeFileSync(promptFile, content || "", "utf-8");
				this.addLog("INFO", "Prompts", `Saved prompt template: ${safeName} (${scope || "project"})`);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, name: safeName, path: promptFile }));
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
				const pantheonReg = this.pool.getPantheonRegistry();
				const squads = pantheonReg.getSquads();
				const agents = pantheonReg.getAgents();

				const squadModelItems = squads.flatMap((s) => [
					{
						id: `squad:${s.id}`,
						object: "model",
						created: Math.floor(Date.now() / 1000),
						owned_by: "pantheon-squad",
						context_window: 128000,
						description: `Pantheon Squad: ${s.name} (${s.description || ""})`,
					},
					{
						id: s.id,
						object: "model",
						created: Math.floor(Date.now() / 1000),
						owned_by: "pantheon-squad",
						context_window: 128000,
						description: `Pantheon Squad: ${s.name}`,
					},
				]);

				const agentModelItems = agents.map((a) => ({
					id: `agent:${a.id}`,
					object: "model",
					created: Math.floor(Date.now() / 1000),
					owned_by: "pantheon-agent",
					context_window: 128000,
					description: `🤖 Agente: ${a.name} (${a.role})`,
				}));

				const settingsMgr = this.pool.getSettingsManager();
				const _defaultProvider = settingsMgr.getDefaultProvider() || "omniroute";
				const activeModels = this.pool.getActiveProviderModels();

				// Sort active models: auto/* first, then alphabetically
				activeModels.sort((a, b) => {
					const aIsAuto = a.id.startsWith("auto/");
					const bIsAuto = b.id.startsWith("auto/");
					if (aIsAuto && !bIsAuto) return -1;
					if (!aIsAuto && bIsAuto) return 1;
					return a.id.localeCompare(b.id);
				});

				const activeProviderModelItems = activeModels.flatMap((m) => [
					{
						id: m.id,
						object: "model",
						created: Math.floor(Date.now() / 1000),
						owned_by: m.provider,
						context_window: m.contextWindow || 128000,
						description: `⚡ [${m.provider}] ${m.name || m.id}`,
					},
					{
						id: `${m.provider}/${m.id}`,
						object: "model",
						created: Math.floor(Date.now() / 1000),
						owned_by: m.provider,
						context_window: m.contextWindow || 128000,
						description: `⚡ ${m.provider}/${m.id}`,
					},
				]);

				const regularModelItems = models.map((m) => ({
					id: m.id,
					object: "model",
					created: Math.floor(Date.now() / 1000),
					owned_by: m.provider,
					context_window: m.contextWindow || 128000,
				}));

				const seenIds = new Set<string>();
				const combinedData = [
					...squadModelItems,
					...activeProviderModelItems,
					...agentModelItems,
					...regularModelItems,
				].filter((item) => {
					if (seenIds.has(item.id)) return false;
					seenIds.add(item.id);
					return true;
				});

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify(
						{
							object: "list",
							data: combinedData,
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
				const rawId = url.split("/")[3] || "default";
				const sessionId = path.basename(rawId).replace(/[^a-zA-Z0-9_-]/g, "_") || "default";
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
				const rawId = url.split("/")[3] || "default";
				const sessionId = path.basename(rawId).replace(/[^a-zA-Z0-9_-]/g, "_") || "default";
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
			// --- 13. GRAFT STUDIO API (PROJECT-ISOLATED & WORKSPACE-AWARE) ---
			const customWorkspaceCandidate =
				(req.headers["x-workspace-path"] as string) ||
				(req.headers["x-project-dir"] as string) ||
				(req.headers["x-project-path"] as string) ||
				(req.headers["x-cwd"] as string) ||
				parsedUrl.searchParams.get("workspace") ||
				parsedUrl.searchParams.get("path") ||
				undefined;

			const targetProjectId = parsedUrl.searchParams.get("projectId") || undefined;
			let graft = this.pool.getGraftEngine(targetProjectId);

			if (customWorkspaceCandidate && existsSync(customWorkspaceCandidate)) {
				graft = this.pool.getOrCreateGraftEngine(undefined, path.resolve(customWorkspaceCandidate));
			}

			if (method === "GET" && (url === "/v1/graft/map" || url === "/api/graft/map")) {
				this.addLog("TOOL", "Graft", `Executing graft.map() indexing for workspace "${graft.cwd}"`);
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
				this.addLog("TOOL", "Graft", `Exporting Code Graph Data for workspace "${graft.cwd}"`);
				const graphData = await graft.graphData();
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(graphData, null, 2));
				return;
			}

			if (method === "GET" && (url === "/v1/graft/file" || url === "/api/graft/file")) {
				const localGraphPath = path.join(graft.cwd, ".andy", "graft", "graph.json");
				const altGraphPath = path.join(graft.cwd, ".graft", "graph.json");
				const foundPath = existsSync(localGraphPath)
					? localGraphPath
					: existsSync(altGraphPath)
						? altGraphPath
						: null;

				if (foundPath) {
					const content = readFileSync(foundPath, "utf-8");
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(content);
					return;
				}

				// If not yet generated, generate and return
				const graphData = await graft.graphData();
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(graphData, null, 2));
				return;
			}

			if (method === "POST" && (url === "/v1/graft/sync" || url === "/api/graft/sync")) {
				this.addLog("TOOL", "Graft", `Syncing and persisting Code Graph in "${graft.cwd}"`);
				await graft.init();
				const graphData = await graft.graphData();
				const localGraphPath = path.join(graft.cwd, ".andy", "graft", "graph.json");
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify(
						{
							success: true,
							savedPath: localGraphPath,
							metrics: graphData.metrics,
							totalFiles: graphData.nodes.length,
						},
						null,
						2,
					),
				);
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
				const targetProjectId = parsedUrl.searchParams.get("projectId") || undefined;
				const full = path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(this.pool.cwd, filePath);

				if (!this.isPathAllowed(full, targetProjectId)) {
					res.writeHead(403, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({
							error: "Acceso denegado: Ruta fuera del espacio de trabajo permitido (Path Traversal Protection).",
						}),
					);
					return;
				}

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
				const { filePath, content, projectId } = body || {};
				if (!filePath) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "filePath is required" }));
					return;
				}

				const full = path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(this.pool.cwd, filePath);

				if (!this.isPathAllowed(full, projectId)) {
					res.writeHead(403, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({
							error: "Acceso denegado: Ruta fuera del espacio de trabajo permitido (Path Traversal Protection).",
						}),
					);
					return;
				}

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
				const settingsMgr = this.pool.getSettingsManager();
				const defaultProvider = settingsMgr.getDefaultProvider() || "omniroute";
				const activeModels = this.pool.getActiveProviderModels();

				// Sort active models: auto/* first, then alphabetically
				activeModels.sort((a, b) => {
					const aIsAuto = a.id.startsWith("auto/");
					const bIsAuto = b.id.startsWith("auto/");
					if (aIsAuto && !bIsAuto) return -1;
					if (!aIsAuto && bIsAuto) return 1;
					return a.id.localeCompare(b.id);
				});

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify(
						{
							squads,
							total: squads.length,
							activeProvider: defaultProvider,
							activeProviderModels: activeModels.slice(0, 150).map((m) => ({
								id: m.id,
								name: m.name || m.id,
								provider: m.provider,
								contextWindow: m.contextWindow || 128000,
								reasoning: Boolean((m as any).reasoning),
							})),
						},
						null,
						2,
					),
				);
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

				const turnAbortController = new AbortController();
				req.on("close", () => {
					if (!turnAbortController.signal.aborted) {
						turnAbortController.abort();
					}
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
						signal: turnAbortController.signal,
					};

					async function* textStream() {
						const maxRetries = 3;
						let yieldedAny = false;
						let lastError: string | undefined;

						for (let attempt = 1; attempt <= maxRetries; attempt++) {
							lastError = undefined;
							try {
								const eventStream = stream(targetModel!, context, streamOptions);
								for await (const ev of eventStream) {
									if (ev.type === "text_delta") {
										yieldedAny = true;
										yield ev.delta;
									} else if (ev.type === "error") {
										lastError = ev.error?.errorMessage || "Error en stream del proveedor de IA";
									}
								}
							} catch (err: any) {
								lastError = err.message || String(err);
							}

							if (yieldedAny) {
								return;
							}

							const isTransient =
								lastError &&
								/503|429|busy|capacity|rate limit|structurally heavy|overloaded|temporarily unavailable/i.test(lastError);

							if (isTransient && attempt < maxRetries) {
								const delayMs = attempt * 1500;
								await new Promise((r) => setTimeout(r, delayMs));
								continue;
							}

							break;
						}

						if (!yieldedAny && lastError) {
							yield `\n[Error del proveedor: ${lastError}]`;
						}
					}

					return textStream();
				};

				try {
					const isDirectModel =
						squadId.startsWith("model:") ||
						(!pantheonRegistry.getSquad(squadId) && Boolean(this.pool.findModel(squadId)));

					let turnMessages: PantheonMessage[] = [];

					if (isDirectModel) {
						const directModelId = squadId.startsWith("model:") ? squadId.slice(6) : squadId;
						const targetModel =
							this.pool.findModel(directModelId) ||
							this.pool.findModel("auto/best-coding") ||
							this.pool.getAvailableModels()[0];
						const modelName = targetModel?.name || directModelId;
						const modelProvider = targetModel?.provider || "LLM";

						if (!res.writableEnded) {
							res.write(
								`data: ${JSON.stringify({
									type: "agent_start",
									agentId: directModelId,
									agentName: modelName,
									agentRole: `Modelo Directo (${modelProvider})`,
								})}\n\n`,
							);
						}

						let accumulatedResponse = "";
						const streamGen = await llmCaller([{ role: "user", content: prompt }], directModelId, 0.2);
						if (typeof streamGen === "string") {
							accumulatedResponse = streamGen;
							if (!res.writableEnded) {
								res.write(
									`data: ${JSON.stringify({
										type: "delta",
										agentId: directModelId,
										delta: accumulatedResponse,
									})}\n\n`,
								);
							}
						} else if (streamGen && Symbol.asyncIterator in streamGen) {
							for await (const chunk of streamGen) {
								if (turnAbortController.signal.aborted) break;
								accumulatedResponse += chunk;
								if (!res.writableEnded) {
									res.write(
										`data: ${JSON.stringify({
											type: "delta",
											agentId: directModelId,
											delta: chunk,
										})}\n\n`,
									);
								}
							}
						}

						const directAgentMsg: PantheonMessage = {
							id: randomUUID(),
							senderId: directModelId,
							senderName: modelName,
							senderRole: `Modelo Directo (${modelProvider})`,
							senderAvatar: "⚡",
							senderColor: "#3B82F6",
							content: accumulatedResponse,
							type: "chat",
							timestamp: new Date().toISOString(),
						};

						turnMessages = [
							{
								id: randomUUID(),
								senderId: "user",
								senderName: "Usuario",
								senderRole: "User",
								senderAvatar: "👤",
								senderColor: "#64748B",
								content: prompt,
								type: "chat",
								timestamp: new Date().toISOString(),
							},
							directAgentMsg,
						];

						if (!res.writableEnded) {
							res.write(
								`data: ${JSON.stringify({
									type: "agent_finish",
									agentId: directModelId,
									message: directAgentMsg,
								})}\n\n`,
							);
							res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
							res.end();
						}
					} else {
						turnMessages = await pantheonOrchestrator.executeTurn(
							squadId,
							prompt,
							async (event) => {
								if (!res.writableEnded) {
									try {
										res.write(`data: ${JSON.stringify(event)}\n\n`);
									} catch {}
								}
							},
							{
								targetAgentId,
								abortController: turnAbortController,
								llmCaller,
								projectInfo: {
									id: activeProj.id,
									name: activeProj.name,
									path: activeProj.path,
									description: activeProj.description,
								},
							},
						);
					}

					// Persist Turn Messages into the Project Session
					const targetSessionId = body?.sessionId || "default";
					try {
						const sessionItem = await this.pool.getOrCreateSession(
							targetSessionId,
							undefined,
							undefined,
							activeProj.id,
						);
						sessionItem.lastActive = Date.now();

						// Smart auto-title from first user prompt
						if (
							prompt &&
							(sessionItem.title.startsWith("Chat ") ||
								sessionItem.title.startsWith("session-") ||
								sessionItem.title === "default")
						) {
							const cleanTitle = prompt
								.trim()
								.replace(/^[/#@\s]+/, "")
								.slice(0, 32);
							if (cleanTitle) {
								sessionItem.title = cleanTitle;
							}
						}

						// Append user turn and all agent responses
						const msgs = sessionItem.session.state.messages;
						for (const msg of turnMessages) {
							if (msg.senderId === "user") {
								msgs.push({
									role: "user",
									content: msg.content,
									timestamp: Date.now(),
								} as any);
							} else {
								msgs.push({
									role: "assistant",
									content: msg.content,
									agentId: msg.senderId,
									agentName: msg.senderName,
									agentRole: msg.senderRole,
									agentAvatar: msg.senderAvatar,
									agentColor: msg.senderColor,
									timestamp: Date.now(),
								} as any);
							}
						}

						this.pool.persistSession(sessionItem);
					} catch (saveErr: any) {
						this.addLog(
							"ERROR",
							"Pantheon",
							`Failed to persist session messages: ${saveErr?.message || saveErr}`,
						);
					}
				} catch (err: any) {
					this.addLog("ERROR", "Pantheon", `Turn error: ${err.message || String(err)}`);
					if (!res.writableEnded) {
						try {
							res.write(`data: ${JSON.stringify({ type: "error", error: err.message || String(err) })}\n\n`);
						} catch {}
					}
				} finally {
					if (!res.writableEnded) {
						try {
							res.write("data: [DONE]\n\n");
							res.end();
						} catch {}
					}
				}
				return;
			}

			// --- 14. PANTHEON PEER MESSAGING API (HERMES 0.21.0 `hermes peer`) ---
			if (method === "POST" && (url === "/v1/pantheon/peer" || url === "/api/pantheon/peer")) {
				const body = await this.readJsonBody<any>(req);
				const { fromAgentId, toAgentId, content, autoReply, projectId } = body || {};

				if (!fromAgentId || !toAgentId || !content) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Parameters fromAgentId, toAgentId, and content are required." }));
					return;
				}

				const peerMgr = this.pool.getPantheonPeerManager(projectId);

				const llmCaller = async (
					messages: Array<{ role: string; content: string }>,
					modelId?: string,
					temp?: number,
					systemPrompt?: string,
				) => {
					const resolvedModel =
						this.pool.findModel(modelId || "auto/best-coding") || this.pool.getAvailableModels()[0];
					const pContext: Context = {
						systemPrompt,
						messages: messages.map((m) => ({
							role: (m.role as any) || "user",
							content: m.content,
							timestamp: Date.now(),
						})),
					};
					const auth = await this.pool.getModelRegistry().getApiKeyAndHeaders(resolvedModel);
					const apiKey = auth.ok ? auth.apiKey : undefined;
					const resp = await complete(resolvedModel, pContext, { apiKey, temperature: temp ?? 0.2 });
					return resp.content
						.filter((c: any) => c.type === "text")
						.map((c: any) => c.text)
						.join("\n");
				};

				const peerMsg = await peerMgr.sendPeerMessage(fromAgentId, toAgentId, content, {
					llmCaller,
					autoReply: autoReply !== false,
				});

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, message: peerMsg }, null, 2));
				return;
			}

			if (method === "GET" && (url === "/v1/pantheon/peer/history" || url === "/api/pantheon/peer/history")) {
				const from = parsedUrl.searchParams.get("from") || "";
				const to = parsedUrl.searchParams.get("to") || "";
				const projectId = parsedUrl.searchParams.get("projectId") || undefined;

				if (!from || !to) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Parameters 'from' and 'to' are required." }));
					return;
				}

				const peerMgr = this.pool.getPantheonPeerManager(projectId);
				const conv = peerMgr.getConversation(from, to);

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, conversation: conv }, null, 2));
				return;
			}

			if (
				method === "GET" &&
				(url === "/v1/pantheon/peer/conversations" || url === "/api/pantheon/peer/conversations")
			) {
				const projectId = parsedUrl.searchParams.get("projectId") || undefined;
				const peerMgr = this.pool.getPantheonPeerManager(projectId);
				const convs = peerMgr.listAllConversations();

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, conversations: convs }, null, 2));
				return;
			}

			// --- 15. PANTHEON MEMORY-AWARE CRON API (HERMES 0.21.0 `continuity=true`) ---
			if (method === "POST" && (url === "/v1/pantheon/cron" || url === "/api/pantheon/cron")) {
				const body = await this.readJsonBody<any>(req);
				const { name, agentId, cronExpression, instruction, options, projectId } = body || {};

				if (!name || !agentId || !instruction) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Parameters name, agentId, and instruction are required." }));
					return;
				}

				const cronEngine = this.pool.getPantheonCronEngine(projectId);
				const job = cronEngine.registerJob(
					name,
					agentId,
					cronExpression || "*/15 * * * *",
					instruction,
					options || {},
				);

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, job }, null, 2));
				return;
			}

			if (method === "GET" && (url === "/v1/pantheon/cron" || url === "/api/pantheon/cron")) {
				const projectId = parsedUrl.searchParams.get("projectId") || undefined;
				const cronEngine = this.pool.getPantheonCronEngine(projectId);
				const jobs = cronEngine.listJobs();

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, jobs }, null, 2));
				return;
			}

			if (method === "POST" && (url === "/v1/pantheon/cron/tick" || url === "/api/pantheon/cron/tick")) {
				const body = await this.readJsonBody<any>(req);
				const { jobId, workspaceDir, projectId } = body || {};

				if (!jobId) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Parameter 'jobId' is required." }));
					return;
				}

				const cronEngine = this.pool.getPantheonCronEngine(projectId);
				const activeProj = this.pool.getProject(projectId || "") || this.pool.getActiveProject();
				const targetDir = workspaceDir || activeProj.path || this.pool.cwd;

				const llmCaller = async (
					messages: Array<{ role: string; content: string }>,
					modelId?: string,
					temp?: number,
					systemPrompt?: string,
				) => {
					const resolvedModel =
						this.pool.findModel(modelId || "auto/best-coding") || this.pool.getAvailableModels()[0];
					const pContext: Context = {
						systemPrompt,
						messages: messages.map((m) => ({
							role: (m.role as any) || "user",
							content: m.content,
							timestamp: Date.now(),
						})),
					};
					const auth = await this.pool.getModelRegistry().getApiKeyAndHeaders(resolvedModel);
					const apiKey = auth.ok ? auth.apiKey : undefined;
					const resp = await complete(resolvedModel, pContext, { apiKey, temperature: temp ?? 0.2 });
					return resp.content
						.filter((c: any) => c.type === "text")
						.map((c: any) => c.text)
						.join("\n");
				};

				const execution = await cronEngine.executeTick(jobId, targetDir, llmCaller);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, execution }, null, 2));
				return;
			}

			// --- 16. PANTHEON LIVE TASK STEERING & LIFECYCLE API ---
			if (method === "POST" && (url === "/v1/pantheon/tasks/steer" || url === "/api/pantheon/tasks/steer")) {
				const body = await this.readJsonBody<any>(req);
				const { taskId, instruction, steeredBy, projectId } = body || {};

				if (!taskId || !instruction) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Parameters 'taskId' and 'instruction' are required." }));
					return;
				}

				const orch = this.pool.getPantheonOrchestrator(projectId);
				const steered = orch.steerTask(taskId, instruction, steeredBy || "human");

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: steered, taskId, steeredBy: steeredBy || "human" }));
				return;
			}

			if (method === "POST" && (url === "/v1/pantheon/tasks/abort" || url === "/api/pantheon/tasks/abort")) {
				const body = await this.readJsonBody<any>(req);
				const { taskId, projectId } = body || {};

				if (!taskId) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Parameter 'taskId' is required." }));
					return;
				}

				const orch = this.pool.getPantheonOrchestrator(projectId);
				const aborted = orch.abortTask(taskId);

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: aborted, taskId, status: "aborted" }));
				return;
			}

			if (method === "GET" && (url === "/v1/pantheon/tasks" || url === "/api/pantheon/tasks")) {
				const projectId = parsedUrl.searchParams.get("projectId") || undefined;
				const orch = this.pool.getPantheonOrchestrator(projectId);
				const tasks = orch.getActiveTaskControls().map((t) => ({
					taskId: t.taskId,
					status: t.status,
					tokensUsed: t.tokensUsed,
					toolCallsCount: t.toolCallsCount,
					startedAt: t.startedAt,
				}));

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, tasks }, null, 2));
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

	private detectRepetitionLoop(
		text: string,
		maxCheckLength = 400,
	): { isLooping: boolean; pattern?: string; repetitions?: number } {
		if (!text || text.length < 20) return { isLooping: false };
		const tail = text.slice(-maxCheckLength);

		// Check pattern lengths from 2 to 60 characters
		for (let len = 2; len <= 60; len++) {
			if (tail.length < len * 4) continue;
			const pattern = tail.slice(-len);
			const expectedRepetitions = 4;
			const fullPattern = pattern.repeat(expectedRepetitions);
			if (tail.endsWith(fullPattern)) {
				return { isLooping: true, pattern, repetitions: expectedRepetitions };
			}
		}

		if (/<unk>(?:\s*<unk>){3,}/.test(tail)) {
			return { isLooping: true, pattern: "<unk>", repetitions: 3 };
		}

		return { isLooping: false };
	}

	private isRepetitionLoop(text: string): boolean {
		return this.detectRepetitionLoop(text).isLooping;
	}

	private stripRepetitionLoop(text: string, pattern?: string): string {
		if (!text || !pattern) return text;
		let trimmed = text;
		while (trimmed.endsWith(pattern)) {
			trimmed = trimmed.slice(0, -pattern.length);
		}
		return trimmed.trimEnd();
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

		const customWorkspace = this.detectWorkspaceFromRequest(req, body, messages, rawSystemPrompt);
		const ideProject = this.pool.getOrCreateIdeProject(authResult.key, clientHint, customWorkspace);
		const customSessionId = (req.headers["x-session-id"] as string) || (body.user as string);
		const sessionId = customSessionId ? `ide-${ideProject.id}-${customSessionId}` : `ide-session-${ideProject.id}`;

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

		const rawModelId = (body.model || "auto/best-coding").trim();
		const normModelId = rawModelId.toLowerCase();

		// Check if target model is a Pantheon Squad or Agent
		const pantheonRegistry = this.pool.getPantheonRegistry(ideProject.id);
		const allSquads = pantheonRegistry.getSquads();
		const allAgents = pantheonRegistry.getAgents();

		let targetSquadId: string | null = null;
		let targetAgentId: string | undefined;

		if (normModelId.startsWith("squad:")) {
			targetSquadId = normModelId.slice(6).trim();
			if (targetSquadId === "programming-squad" || targetSquadId === "programming") {
				targetSquadId = "dev-team-squad";
			}
		} else if (normModelId.startsWith("pantheon/")) {
			targetSquadId = normModelId.slice(9).trim();
			if (targetSquadId === "programming-squad" || targetSquadId === "programming") {
				targetSquadId = "dev-team-squad";
			}
		} else if (allSquads.some((s) => s.id.toLowerCase() === normModelId)) {
			targetSquadId = allSquads.find((s) => s.id.toLowerCase() === normModelId)!.id;
		} else if (normModelId.startsWith("agent:")) {
			targetAgentId = normModelId.slice(6).trim();
			targetSquadId = "fullstack-squad";
		} else if (allAgents.some((a) => a.id.toLowerCase() === normModelId && !this.pool.findModel(rawModelId))) {
			targetAgentId = allAgents.find((a) => a.id.toLowerCase() === normModelId)!.id;
			targetSquadId = "fullstack-squad";
		}

		if (targetSquadId) {
			await this.handlePantheonOpenAiBridge(
				req,
				res,
				reqId,
				ideProject,
				sessionId,
				isStream,
				targetSquadId,
				targetAgentId,
				messages,
				nonSystem,
				body,
			);
			return;
		}

		const modelId = rawModelId;
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
					const promptTokens =
						finalUsage?.input ??
						Math.max(
							1,
							Math.ceil(
								(rawSystemPrompt.length +
									messages
										.map((m: any) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
										.join("").length) /
									3.8,
							),
						);
					const completionTokens = finalUsage?.output ?? Math.max(1, Math.ceil(accumulatedText.length / 3.8));
					const totalTokens = finalUsage?.totalTokens ?? promptTokens + completionTokens;

					const usageObj = {
						prompt_tokens: promptTokens,
						completion_tokens: completionTokens,
						total_tokens: totalTokens,
						prompt_tokens_details: { cached_tokens: finalUsage?.cacheRead || 0 },
						completion_tokens_details: { reasoning_tokens: 0 },
					};

					const stopChunk: any = {
						id: reqId,
						object: "chat.completion.chunk",
						created: Math.floor(Date.now() / 1000),
						model: modelId,
						choices: [{ index: 0, delta: {}, finish_reason: finishReason || "stop" }],
						usage: usageObj,
					};
					res.write(`data: ${JSON.stringify(stopChunk)}\n\n`);

					// Emit dedicated usage chunk for KiloCode / Cline / OpenAI compatibility
					const usageChunk = {
						id: reqId,
						object: "chat.completion.chunk",
						created: Math.floor(Date.now() / 1000),
						model: modelId,
						choices: [],
						usage: usageObj,
					};
					res.write(`data: ${JSON.stringify(usageChunk)}\n\n`);

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

	private async handlePantheonOpenAiBridge(
		req: IncomingMessage,
		res: ServerResponse,
		reqId: string,
		ideProject: any,
		sessionId: string,
		isStream: boolean,
		squadId: string,
		targetAgentId: string | undefined,
		_messages: any[],
		nonSystem: any[],
		body: any,
	) {
		const self = this;
		const pantheonOrchestrator = this.pool.getPantheonOrchestrator(ideProject.id);
		const settingsMgr = this.pool.getSettingsManager();

		// Extract prompt: User's latest prompt + conversation context if any
		const userMsgs = nonSystem.filter((m: any) => m.role === "user");
		const lastUserMsg = userMsgs[userMsgs.length - 1];
		let prompt = "";
		if (lastUserMsg) {
			prompt =
				typeof lastUserMsg.content === "string"
					? lastUserMsg.content
					: Array.isArray(lastUserMsg.content)
						? lastUserMsg.content.map((c: any) => (c.type === "text" ? c.text || "" : "")).join(" ")
						: JSON.stringify(lastUserMsg.content || "");
		}
		if (!prompt) prompt = "Hola, escuadrón.";

		// If there is preceding history, format a concise context header
		if (nonSystem.length > 1) {
			const priorTurns = nonSystem.slice(-5, -1);
			let historySnippet = "\n[Historial reciente en IDE]:\n";
			for (const turn of priorTurns) {
				const roleLabel = turn.role === "user" ? "Usuario" : "Asistente";
				const tText =
					typeof turn.content === "string"
						? turn.content
						: Array.isArray(turn.content)
							? turn.content.map((c: any) => (c.type === "text" ? c.text || "" : "")).join(" ")
							: "";
				// Clean out previous hallucinated prompts asking for files / Get-ChildItem
				if (tText.includes("Get-ChildItem") || tText.includes("NO PUEDO Acceder") || tText.includes("tree /F")) {
					continue;
				}
				if (tText) {
					historySnippet += `- ${roleLabel}: ${tText.slice(0, 300)}\n`;
				}
			}
			prompt = `${prompt}\n\n${historySnippet}`;
		}

		this.addLog(
			"INFO",
			"Pantheon Bridge",
			`IDE Chat completion executing Pantheon Squad "${squadId}" on project "${ideProject.name}" (${ideProject.path}): "${prompt.slice(0, 80)}..."`,
		);

		let totalPromptTokens = 0;
		let totalCompletionTokens = 0;
		let totalCacheReadTokens = 0;

		const llmCaller = async (
			pMessages: any[],
			pModelId: string,
			temp: number,
			pSystemPrompt?: string,
		): Promise<AsyncIterable<string>> => {
			const promptEst =
				(pSystemPrompt || "") +
				pMessages
					.map((h: any) => (typeof h.content === "string" ? h.content : JSON.stringify(h.content || "")))
					.join("\n");
			let callPromptTokens = Math.max(1, Math.ceil(promptEst.length / 3.8));
			let callCompletionTokens = 0;
			let callCacheRead = 0;
			let agentResponseText = "";

			const generator = async function* () {
				const defaultModel = settingsMgr.getDefaultModel() || "auto/best-coding";
				const resolvedModel =
					self.pool.findModel(pModelId) || self.pool.findModel(defaultModel) || self.pool.getAvailableModels()[0];

				if (!resolvedModel) {
					yield `[Error: No hay modelos LLM disponibles para ejecutar a los agentes]`;
					return;
				}

				const pContext: Context = {
					systemPrompt: pSystemPrompt,
					messages: pMessages.map((m: any) => {
						if (m.role === "assistant") {
							const textContent =
								typeof m.content === "string"
									? m.content
									: Array.isArray(m.content)
										? m.content.map((c: any) => c.text || "").join("")
										: "";
							return {
								role: "assistant",
								content: [{ type: "text", text: textContent }],
								timestamp: Date.now(),
							} as any;
						}
						if (typeof m.content === "string") {
							return {
								role: m.role || "user",
								content: m.content,
								timestamp: Date.now(),
							} as Message;
						}
						return m as Message;
					}),
				};

				const auth = await self.pool.getModelRegistry().getApiKeyAndHeaders(resolvedModel);
				const apiKey = auth.ok ? auth.apiKey : undefined;
				let hasYielded = false;
				let streamError: string | undefined;
				const maxRetries = 3;

				for (let attempt = 1; attempt <= maxRetries; attempt++) {
					streamError = undefined;
					try {
						const streamResult = stream(resolvedModel, pContext, {
							apiKey,
							temperature: temp,
						});

						for await (const event of streamResult) {
							if (event.type === "text_delta" && event.delta) {
								hasYielded = true;
								agentResponseText += event.delta;

								// Repetition Circuit Breaker
								const loopCheck = self.detectRepetitionLoop(agentResponseText);
								if (loopCheck.isLooping && loopCheck.pattern) {
									self.addLog(
										"WARN",
										"Pantheon Bridge",
										`[LLM Caller Circuit Breaker] Repetition loop detected ("${loopCheck.pattern}"). Terminating stream.`,
									);
									break;
								}

								yield event.delta;
							} else if (event.type === "done") {
								if (event.message?.usage) {
									if (event.message.usage.input) callPromptTokens = event.message.usage.input;
									if (event.message.usage.output) callCompletionTokens = event.message.usage.output;
									if (event.message.usage.cacheRead) callCacheRead = event.message.usage.cacheRead;
								}
							} else if (event.type === "error") {
								streamError = event.error?.errorMessage || "Error en stream del proveedor de IA";
							}
						}
					} catch (err: any) {
						streamError = err.message || String(err);
					}

					if (hasYielded) {
						break;
					}

					const isTransient =
						streamError &&
						/503|429|busy|capacity|rate limit|structurally heavy|overloaded|temporarily unavailable/i.test(streamError);

					if (isTransient && attempt < maxRetries) {
						const delayMs = attempt * 1500;
						self.addLog(
							"WARN",
							"Pantheon Bridge",
							`[LLM Retry] Proveedor ocupado o capacidad saturada (${streamError}). Reintentando en ${delayMs}ms (intento ${attempt}/${maxRetries})...`,
						);
						await new Promise((r) => setTimeout(r, delayMs));
						continue;
					}

					break;
				}

				if (!hasYielded) {
					try {
						const response = await complete(resolvedModel, pContext, {
							apiKey,
							temperature: temp,
						});
						if (response.usage) {
							if (response.usage.input) callPromptTokens = response.usage.input;
							if (response.usage.output) callCompletionTokens = response.usage.output;
							if (response.usage.cacheRead) callCacheRead = response.usage.cacheRead;
						}
						if (response.stopReason === "error") {
							const finalErrMsg = response.errorMessage || streamError || "Inferencia fallida";
							const isTransient =
								/503|429|busy|capacity|rate limit|structurally heavy|overloaded|temporarily unavailable/i.test(finalErrMsg);
							if (isTransient) {
								yield `\n\n[Capacidad del proveedor temporalmente ocupada (503 / Alta demanda). Se reintentó automáticamente 3 veces sin éxito. Por favor espera unos instantes antes de enviar la siguiente instrucción o reduce el alcance de la tarea.]`;
							} else {
								yield `\n\n[Error del proveedor de IA: ${finalErrMsg}]`;
							}
						} else {
							for (const part of response.content) {
								if (part.type === "text" && part.text) {
									hasYielded = true;
									agentResponseText += part.text;
									yield part.text;
								}
							}
							if (!hasYielded) {
								yield `\n\n[Aviso: El modelo ${resolvedModel.id} no retornó texto. ${streamError ? `Detalle: ${streamError}` : ""}]`;
							}
						}
					} catch (fallbackErr: any) {
						const finalErrMsg = fallbackErr.message || streamError || String(fallbackErr);
						yield `\n\n[Error al invocar modelo: ${finalErrMsg}]`;
					}
				}

				if (!callCompletionTokens && agentResponseText) {
					callCompletionTokens = Math.max(1, Math.ceil(agentResponseText.length / 3.8));
				}
				totalPromptTokens += callPromptTokens;
				totalCompletionTokens += callCompletionTokens;
				totalCacheReadTokens += callCacheRead;
			};

			return generator();
		};

		const abortCtrl = new AbortController();
		let isAborted = false;
		const onClientClose = () => {
			isAborted = true;
			abortCtrl.abort();
		};
		req.on("close", onClientClose);

		const returnedModel = body?.model || (targetAgentId ? `agent:${targetAgentId}` : `squad:${squadId}`);
		let accumulatedFullText = "";
		const toolCallsEmitted: any[] = [];

		if (isStream) {
			res.writeHead(200, {
				"Content-Type": "text/event-stream; charset=utf-8",
				"Cache-Control": "no-cache, no-transform",
				Connection: "keep-alive",
				"X-Accel-Buffering": "no",
			});

			// Initial chunk indicating assistant role
			res.write(
				`data: ${JSON.stringify({
					id: reqId,
					object: "chat.completion.chunk",
					created: Math.floor(Date.now() / 1000),
					model: returnedModel,
					choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
				})}\n\n`,
			);

			try {
				await (pantheonOrchestrator as any).executeTurn(
					squadId,
					prompt,
					(event: any) => {
						if (isAborted || res.writableEnded) return;

						let contentToSend = "";
						if (event.type === "agent_start") {
							contentToSend = `\n\n### 🤖 @${event.agentName} (${event.agentRole})\n\n`;
						} else if (event.type === "delta") {
							contentToSend = (event as any).delta || (event as any).text || "";
						} else if (event.type === "tool_start") {
							contentToSend = `\n\n> ⚙️ **Ejecutando ${event.tool === "write" ? "Modificación de Archivo" : "Comando en Terminal"}**: \`${event.target || event.tool}\`...\n\n`;
						} else if (event.type === "tool_result") {
							if (event.tool === "write") {
								const fileContent = (event as any).content || (event as any).input?.content || "";
								let cleanRelPath = event.target || "file";
								if (ideProject?.path && cleanRelPath.startsWith(ideProject.path)) {
									cleanRelPath = path.relative(ideProject.path, cleanRelPath);
								}
								cleanRelPath = cleanRelPath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
								if (ideProject?.name) {
									const idx = cleanRelPath.indexOf(`${ideProject.name}/`);
									if (idx !== -1) {
										cleanRelPath = cleanRelPath.slice(idx + ideProject.name.length + 1);
									}
								}

								const toolCallId = `call_${randomUUID().slice(0, 9)}`;
								const argsJson = JSON.stringify({
									path: cleanRelPath,
									content: fileContent,
								});

								toolCallsEmitted.push({
									id: toolCallId,
									type: "function",
									function: {
										name: "write_to_file",
										arguments: argsJson,
									},
								});

								// Emit tool call chunk for KiloCode / Cline / VS Code native tool execution
								res.write(
									`data: ${JSON.stringify({
										id: reqId,
										object: "chat.completion.chunk",
										created: Math.floor(Date.now() / 1000),
										model: returnedModel,
										choices: [
											{
												index: 0,
												delta: {
													tool_calls: [
														{
															index: toolCallsEmitted.length - 1,
															id: toolCallId,
															type: "function",
															function: {
																name: "write_to_file",
																arguments: argsJson,
															},
														},
													],
												},
												finish_reason: null,
											},
										],
									})}\n\n`,
								);

								contentToSend = `> ✓ **Archivo preparado para tu equipo local**: \`${cleanRelPath}\` (${event.output || "OK"})\n\n`;
							} else {
								contentToSend = `\n\`\`\`bash\n# ${event.target || "comando"} (Exit code: ${event.exitCode ?? 0})\n${event.output || ""}\n\`\`\`\n\n`;
							}
						} else if (event.type === "agent_finish") {
							contentToSend = "\n";
						} else if ((event as any).type === "todo_update") {
							const tu = event as any;
							const toolCallId = `call_${randomUUID().slice(0, 9)}`;
							const argsJson = JSON.stringify({
								todos: tu.todos,
							});

							toolCallsEmitted.push({
								id: toolCallId,
								type: "function",
								function: {
									name: "update_todo_list",
									arguments: argsJson,
								},
							});

							res.write(
								`data: ${JSON.stringify({
									id: reqId,
									object: "chat.completion.chunk",
									created: Math.floor(Date.now() / 1000),
									model: returnedModel,
									choices: [
										{
											index: 0,
											delta: {
												tool_calls: [
													{
														index: toolCallsEmitted.length - 1,
														id: toolCallId,
														type: "function",
														function: {
															name: "update_todo_list",
															arguments: argsJson,
														},
													},
												],
											},
											finish_reason: null,
										},
									],
								})}\n\n`,
							);
							contentToSend = "";
						} else if ((event as any).type === "user_question") {
							const uq = event as any;
							const qText = uq.question || "Acción necesaria por usuario";
							const optionsArr = (uq.options || []).map((o: any) => ({
								text: typeof o === "string" ? o : o.text,
							}));

							const toolCallId = `call_${randomUUID().slice(0, 9)}`;
							const argsJson = JSON.stringify({
								question: qText,
								follow_up: optionsArr,
							});

							toolCallsEmitted.push({
								id: toolCallId,
								type: "function",
								function: {
									name: "ask_followup_question",
									arguments: argsJson,
								},
							});

							// Emit tool call chunk for VS Code / Andy Code native tool execution
							res.write(
								`data: ${JSON.stringify({
									id: reqId,
									object: "chat.completion.chunk",
									created: Math.floor(Date.now() / 1000),
									model: returnedModel,
									choices: [
										{
											index: 0,
											delta: {
												tool_calls: [
													{
														index: toolCallsEmitted.length - 1,
														id: toolCallId,
														type: "function",
														function: {
															name: "ask_followup_question",
															arguments: argsJson,
														},
													},
												],
											},
											finish_reason: null,
										},
									],
								})}\n\n`,
							);

							// The native tool_calls delta above handles the interactive UI in Andy Code;
							// do not send raw XML into delta.content as that prints verbatim in chat.
							contentToSend = "";
						}

						if (contentToSend) {
							// Strip any pseudo-tool XML from streaming content delta
							contentToSend = contentToSend
								.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "")
								.replace(/<ask_followup_question>[\s\S]*?<\/ask_followup_question>/gi, "")
								.replace(/<tool_call>[\s\S]*$/gi, "")
								.replace(/<ask_followup_question>[\s\S]*$/gi, "")
								.replace(/<function=[^>]+>[\s\S]*?<\/function>/gi, "")
								.replace(/<parameter=[^>]+>[\s\S]*?<\/parameter>/gi, "");

							if (!contentToSend) return;

							// Circuit breaker for multi-agent bridge stream
							const loopCheck = self.detectRepetitionLoop(accumulatedFullText + contentToSend);
							if (loopCheck.isLooping) {
								self.addLog(
									"WARN",
									"Pantheon Bridge",
									`Repetition loop detected ("${loopCheck.pattern}"). Suppressing duplicate delta.`,
								);
								return;
							}

							accumulatedFullText += contentToSend;
							res.write(
								`data: ${JSON.stringify({
									id: reqId,
									object: "chat.completion.chunk",
									created: Math.floor(Date.now() / 1000),
									model: returnedModel,
									choices: [{ index: 0, delta: { content: contentToSend }, finish_reason: null }],
								})}\n\n`,
							);
						}
					},
					{
						targetAgentId,
						llmCaller,
						projectInfo: { path: ideProject.path, name: ideProject.name },
						yieldOnFileWrite: true,
					},
				);

				// Fallback safety check: If no tool call was emitted yet, check if text asked for user action
				if (toolCallsEmitted.length === 0) {
					const detectedQ = (pantheonOrchestrator as any).detectUserActionRequired(accumulatedFullText);
					if (detectedQ) {
						const toolCallId = `call_${randomUUID().slice(0, 9)}`;
						const argsJson = JSON.stringify({
							question: detectedQ.question,
							follow_up: detectedQ.options,
						});
						toolCallsEmitted.push({
							id: toolCallId,
							type: "function",
							function: {
								name: "ask_followup_question",
								arguments: argsJson,
							},
						});
						res.write(
							`data: ${JSON.stringify({
								id: reqId,
								object: "chat.completion.chunk",
								created: Math.floor(Date.now() / 1000),
								model: returnedModel,
								choices: [
									{
										index: 0,
										delta: {
											tool_calls: [
												{
													index: 0,
													id: toolCallId,
													type: "function",
													function: {
														name: "ask_followup_question",
														arguments: argsJson,
													},
												},
											],
										},
										finish_reason: null,
									},
								],
							})}\n\n`,
						);
					}
				}

				// Context window usage must reflect the active turn prompt size (not cumulative internal sub-agent loops)
				const finalPromptTokens = Math.max(1, Math.ceil((prompt.length + 800) / 3.8));
				const finalCompletionTokens = Math.max(1, Math.ceil(accumulatedFullText.length / 3.8));
				const finalTotalTokens = finalPromptTokens + finalCompletionTokens;

				const usagePayload = {
					prompt_tokens: finalPromptTokens,
					completion_tokens: finalCompletionTokens,
					total_tokens: finalTotalTokens,
					prompt_tokens_details: { cached_tokens: totalCacheReadTokens },
					completion_tokens_details: { reasoning_tokens: 0 },
				};

				if (!res.writableEnded) {
					const streamFinishReason = toolCallsEmitted.length > 0 ? "tool_calls" : "stop";
					res.write(
						`data: ${JSON.stringify({
							id: reqId,
							object: "chat.completion.chunk",
							created: Math.floor(Date.now() / 1000),
							model: returnedModel,
							choices: [{ index: 0, delta: {}, finish_reason: streamFinishReason }],
							usage: usagePayload,
						})}\n\n`,
					);

					// Dedicated usage chunk for KiloCode / Cline / OpenAI compatibility
					res.write(
						`data: ${JSON.stringify({
							id: reqId,
							object: "chat.completion.chunk",
							created: Math.floor(Date.now() / 1000),
							model: returnedModel,
							choices: [],
							usage: usagePayload,
						})}\n\n`,
					);

					res.write("data: [DONE]\n\n");
					res.end();
				}
			} catch (err: any) {
				const fallbackUsage = {
					prompt_tokens: Math.max(1, Math.ceil((prompt.length + 500) / 3.8)),
					completion_tokens: Math.max(1, Math.ceil((accumulatedFullText.length || 100) / 3.8)),
					total_tokens: Math.max(1, Math.ceil((prompt.length + 600) / 3.8)),
					prompt_tokens_details: { cached_tokens: 0 },
					completion_tokens_details: { reasoning_tokens: 0 },
				};

				if (!res.writableEnded) {
					res.write(
						`data: ${JSON.stringify({
							id: reqId,
							object: "chat.completion.chunk",
							created: Math.floor(Date.now() / 1000),
							model: returnedModel,
							choices: [
								{
									index: 0,
									delta: { content: `\n\n[Error en escuadrón: ${err.message}]` },
									finish_reason: "stop",
								},
							],
							usage: fallbackUsage,
						})}\n\n`,
					);
					res.write("data: [DONE]\n\n");
					res.end();
				}
			}
		} else {
			// Non-streaming response
			try {
				await pantheonOrchestrator.executeTurn(
					squadId,
					prompt,
					(event) => {
						if (event.type === "agent_start") {
							accumulatedFullText += `\n\n### 🤖 @${event.agentName} (${event.agentRole})\n\n`;
						} else if (event.type === "delta") {
							accumulatedFullText += (event as any).delta || (event as any).text || "";
						} else if (event.type === "tool_start") {
							accumulatedFullText += `\n\n> ⚙️ **Ejecutando ${event.tool === "write" ? "Modificación de Archivo" : "Comando en Terminal"}**: \`${event.target}\`...\n\n`;
						} else if (event.type === "tool_result") {
							if (event.tool === "write") {
								const fileContent = (event as any).content || (event as any).input?.content || "";
								let cleanRelPath = event.target || "file";
								if (ideProject?.path && cleanRelPath.startsWith(ideProject.path)) {
									cleanRelPath = path.relative(ideProject.path, cleanRelPath);
								}
								cleanRelPath = cleanRelPath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
								if (ideProject?.name) {
									const idx = cleanRelPath.indexOf(`${ideProject.name}/`);
									if (idx !== -1) {
										cleanRelPath = cleanRelPath.slice(idx + ideProject.name.length + 1);
									}
								}
								const toolCallId = `call_${randomUUID().slice(0, 9)}`;
								toolCallsEmitted.push({
									id: toolCallId,
									type: "function",
									function: {
										name: "write_to_file",
										arguments: JSON.stringify({ path: cleanRelPath, content: fileContent }),
									},
								});
								accumulatedFullText += `> ✓ **Archivo preparado para tu equipo local**: \`${cleanRelPath}\` (${event.output || "OK"})\n\n<write_to_file>\n<path>${cleanRelPath}</path>\n<content>\n${fileContent}\n</content>\n</write_to_file>\n\n`;
							} else {
								accumulatedFullText += `\n\`\`\`bash\n# ${event.target || "comando"} (Exit code: ${event.exitCode ?? 0})\n${event.output || ""}\n\`\`\`\n\n`;
							}
						} else if (event.type === "agent_finish") {
							accumulatedFullText += "\n";
						}
					},
					{
						targetAgentId,
						llmCaller,
						projectInfo: { path: ideProject.path, name: ideProject.name },
					},
				);
			} catch (err: any) {
				accumulatedFullText += `\n\n[Error en escuadrón: ${err.message}]`;
			}

			const finalPromptTokens =
				totalPromptTokens > 0 ? totalPromptTokens : Math.max(1, Math.ceil((prompt.length + 800) / 3.8));
			const finalCompletionTokens =
				totalCompletionTokens > 0
					? totalCompletionTokens
					: Math.max(1, Math.ceil(accumulatedFullText.length / 3.8));
			const finalTotalTokens = finalPromptTokens + finalCompletionTokens;

			const usagePayload = {
				prompt_tokens: finalPromptTokens,
				completion_tokens: finalCompletionTokens,
				total_tokens: finalTotalTokens,
				prompt_tokens_details: { cached_tokens: totalCacheReadTokens },
				completion_tokens_details: { reasoning_tokens: 0 },
			};

			const nonStreamFinishReason = toolCallsEmitted.length > 0 ? "tool_calls" : "stop";
			const choiceMsg: any = {
				role: "assistant",
				content: accumulatedFullText.trim(),
			};
			if (toolCallsEmitted.length > 0) {
				choiceMsg.tool_calls = toolCallsEmitted;
			}

			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify(
					{
						id: reqId,
						object: "chat.completion",
						created: Math.floor(Date.now() / 1000),
						model: returnedModel,
						choices: [
							{
								index: 0,
								message: choiceMsg,
								finish_reason: nonStreamFinishReason,
							},
						],
						usage: usagePayload,
					},
					null,
					2,
				),
			);
		}

		// Persist interaction into IDE project session for full transparency in WebUI
		try {
			const sessionItem = await this.pool.getOrCreateSession(sessionId, returnedModel, undefined, ideProject.id);
			const cleanResponse = accumulatedFullText.trim();
			if (cleanResponse) {
				const assistantContent: (TextContent | ThinkingContent | ToolCall)[] = [
					{ type: "text", text: cleanResponse },
				];
				const finalAssistantMessage: AssistantMessage = {
					role: "assistant",
					content: assistantContent,
					api: "openai-completions",
					provider: "pantheon",
					model: returnedModel,
					usage: {
						input: Math.ceil(prompt.length / 4),
						output: Math.ceil(cleanResponse.length / 4),
						cacheRead: 0,
						cacheWrite: 0,
						totalTokens: Math.ceil((prompt.length + cleanResponse.length) / 4),
						cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
					},
					stopReason: "stop",
					timestamp: Date.now(),
				};
				const userMessage: UserMessage = {
					role: "user",
					content: prompt,
					timestamp: Date.now() - 1000,
				};
				(sessionItem.session.state as any).messages = [
					...(sessionItem.session.state.messages || []),
					userMessage,
					finalAssistantMessage,
				];
				sessionItem.lastActive = Date.now();
				this.pool.persistSession(sessionItem);
			}
		} catch (err: any) {
			this.addLog("WARN", "Pantheon Bridge", `Failed to persist IDE session: ${err.message}`);
		}
	}

	private detectWorkspaceFromRequest(
		req: IncomingMessage,
		body: any,
		messages: any[],
		systemPrompt: string,
	): string | undefined {
		// 1. Direct HTTP Headers
		const headerCandidates = [
			req.headers["x-workspace-path"],
			req.headers["x-project-path"],
			req.headers["x-project-dir"],
			req.headers["x-workspace"],
			req.headers["x-cwd"],
			req.headers["workspace-path"],
			req.headers["x-folder"],
		];
		for (const h of headerCandidates) {
			if (typeof h === "string" && h.trim()) {
				const cand = h.trim();
				if (existsSync(cand)) return cand;
			}
		}

		// 2. Body parameters
		const bodyCandidates = [
			body?.workspace,
			body?.workspace_path,
			body?.workspacePath,
			body?.cwd,
			body?.project_path,
			body?.projectPath,
		];
		for (const b of bodyCandidates) {
			if (typeof b === "string" && b.trim()) {
				const cand = b.trim();
				if (existsSync(cand)) return cand;
			}
		}

		// 3. Scan messages and system prompt for Windows / Unix paths that exist on disk
		const allTexts: string[] = [systemPrompt || ""];
		for (const m of messages) {
			if (typeof m?.content === "string") allTexts.push(m.content);
			else if (Array.isArray(m?.content)) {
				for (const part of m.content) {
					if (part?.type === "text" && typeof part?.text === "string") allTexts.push(part.text);
				}
			}
		}
		const combined = allTexts.join("\n");

		// Windows path regex (e.g. C:\Users\... or D:\...)
		const winPathRegex = /([A-Za-z]:\\[^"'\r\n<>`]+)/g;
		let match = winPathRegex.exec(combined);
		while (match) {
			const raw = match[1]
				.trim()
				.replace(/[.,;:)>\]]+$/, "")
				.trim();
			if (raw.length > 5 && existsSync(raw)) {
				try {
					const stat = statSync(raw);
					if (stat.isDirectory()) return raw;
					if (stat.isFile()) return path.dirname(raw);
				} catch {}
			}
			match = winPathRegex.exec(combined);
		}

		// Unix path regex
		const unixPathRegex = /(\/(?:Users|home|root|var|etc|opt|tmp|mnt|srv)[a-zA-Z0-9_\-./]+)/g;
		match = unixPathRegex.exec(combined);
		while (match) {
			const raw = match[1]
				.trim()
				.replace(/[.,;:)>\]]+$/, "")
				.trim();
			if (raw.length > 5 && existsSync(raw)) {
				try {
					const stat = statSync(raw);
					if (stat.isDirectory()) return raw;
					if (stat.isFile()) return path.dirname(raw);
				} catch {}
			}
			match = unixPathRegex.exec(combined);
		}

		// 4. Keyword & Active Dev Projects Auto-Discovery
		const roots = [
			"C:/Users/dre_x/OneDrive - Comdata SA/Desarrollo",
			"C:/Users/dre_x/OneDrive/Desarrollo",
			"C:/Users/dre_x/Desarrollo",
			path.join(os.homedir(), "OneDrive - Comdata SA", "Desarrollo"),
			path.join(os.homedir(), "OneDrive", "Desarrollo"),
			path.join(os.homedir(), "source", "repos"),
		];

		const knownKeywords = [
			"Hitachi-IH110",
			"Hitachi",
			"IH110",
			"Validadoras",
			"Contadora",
			"SmartCash",
			"TS300",
			"Cdata",
		];

		const matchedKws = knownKeywords.filter((k) => new RegExp(`\\b${k}\\b`, "i").test(combined));

		if (matchedKws.length > 0) {
			for (const r of roots) {
				if (!existsSync(r)) continue;
				const findMatching = (dir: string, depth = 0): string | undefined => {
					if (depth > 6) return undefined;
					try {
						const base = path.basename(dir).toLowerCase();
						for (const kw of matchedKws) {
							if (base === kw.toLowerCase() || base.includes(kw.toLowerCase())) {
								const entries = readdirSync(dir);
								if (
									entries.some(
										(e) =>
											e.endsWith(".csproj") || e.endsWith(".sln") || e === ".kilo" || e === "package.json",
									)
								) {
									return dir;
								}
							}
						}
						for (const entry of readdirSync(dir, { withFileTypes: true })) {
							if (
								entry.isDirectory() &&
								!entry.name.startsWith(".") &&
								!["node_modules", "bin", "obj", "dist", "build", "packages", "AppData"].includes(entry.name)
							) {
								const res = findMatching(path.join(dir, entry.name), depth + 1);
								if (res) return res;
							}
						}
					} catch {}
					return undefined;
				};

				const found = findMatching(r);
				if (found) return found;
			}
		}

		// 5. Check if any project in session pool matches keyword and is not dummy
		for (const p of this.pool.listProjects().projects) {
			if (
				p.path &&
				existsSync(p.path) &&
				!p.path.includes("AppData\\Local\\Temp") &&
				!p.path.includes(".andy\\agent\\workspaces")
			) {
				if (
					matchedKws.some(
						(k) =>
							p.name.toLowerCase().includes(k.toLowerCase()) || p.path.toLowerCase().includes(k.toLowerCase()),
					)
				) {
					return p.path;
				}
			}
		}

		// 6. Check for recent .kilo workspace in developer roots
		for (const r of roots) {
			if (!existsSync(r)) continue;
			const findKilo = (dir: string, depth = 0): string | undefined => {
				if (depth > 5) return undefined;
				try {
					if (existsSync(path.join(dir, ".kilo"))) {
						// Prefer leaf project if it has csproj/sln/package.json
						const entries = readdirSync(dir);
						if (
							entries.some(
								(e) => e.endsWith(".csproj") || e.endsWith(".sln") || e.endsWith(".cs") || e === "package.json",
							)
						) {
							return dir;
						}
					}
					for (const entry of readdirSync(dir, { withFileTypes: true })) {
						if (
							entry.isDirectory() &&
							!entry.name.startsWith(".") &&
							!["node_modules", "bin", "obj", "dist", "build", "packages", "AppData"].includes(entry.name)
						) {
							const res = findKilo(path.join(dir, entry.name), depth + 1);
							if (res) return res;
						}
					}
				} catch {}
				return undefined;
			};
			const foundKilo = findKilo(r);
			if (foundKilo) return foundKilo;
		}

		// Fallback to active project from WebUI pool if valid and not default dummy
		const activeProj = this.pool.getActiveProject();
		if (
			activeProj &&
			activeProj.path &&
			existsSync(activeProj.path) &&
			!activeProj.path.includes("AppData\\Local\\Temp")
		) {
			return activeProj.path;
		}

		return undefined;
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

	private isPathAllowed(targetPath: string, targetProjectId?: string): boolean {
		const normalized = path.resolve(targetPath).toLowerCase();
		const allowedRoots: string[] = [
			this.options.cwd ? path.resolve(this.options.cwd) : process.cwd(),
			process.cwd(),
			this.pool.cwd,
			path.join(os.homedir(), ".andy"),
			path.join(os.homedir(), ".prime"),
		];

		const activeProj = this.pool.getProject(targetProjectId || "") || this.pool.getActiveProject();
		if (activeProj?.path) allowedRoots.push(activeProj.path);

		const allProjects = this.pool.listProjects()?.projects || [];
		for (const p of allProjects) {
			if (p.path) allowedRoots.push(p.path);
		}

		return allowedRoots.some((root) => {
			const resolvedRoot = path.resolve(root).toLowerCase();
			const rel = path.relative(resolvedRoot, normalized);
			return !rel.startsWith("..") && !path.isAbsolute(rel);
		});
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
	private readBodyText(req: IncomingMessage): Promise<string> {
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
				resolve(Buffer.concat(chunks).toString("utf-8"));
			});

			req.on("error", reject);
		});
	}

	private async handleDashboardConnect(
		req: IncomingMessage,
		res: ServerResponse,
		parsedUrl: URL,
		currentUser: AndyUserPublic | null | undefined,
	): Promise<void> {
		const method = req.method || "GET";
		const device = parsedUrl.searchParams.get("device") || "Mi Equipo";
		const editor = parsedUrl.searchParams.get("editor") || "VS Code";
		const version = parsedUrl.searchParams.get("version") || "0.9.0";
		const callbackUri = parsedUrl.searchParams.get("callback_uri") || "cursor://AndyAgent.andy-code/auth-callback";

		if (method === "POST") {
			const rawText = await this.readBodyText(req);
			const body: Record<string, any> = {};
			if (rawText) {
				try {
					Object.assign(body, JSON.parse(rawText));
				} catch {
					const params = new URLSearchParams(rawText);
					for (const [key, val] of params.entries()) {
						body[key] = val;
					}
				}
			}

			const targetDevice = body.device || device;
			const targetEditor = body.editor || editor;
			const targetCallbackUri = body.callback_uri || callbackUri;

			let effectiveUser = currentUser;
			if (!effectiveUser && body.username && body.password) {
				const loginResult = this.authManager.login(body.username, body.password, true);
				if (loginResult.success && loginResult.user) {
					effectiveUser = loginResult.user;
					res.setHeader(
						"Set-Cookie",
						`andy_session=${loginResult.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`,
					);
				}
			}

			const userName = effectiveUser?.displayName || effectiveUser?.username || "Andrés";
			const userEmail = effectiveUser?.username ? `${effectiveUser.username}@v2nethost.cl` : "andres@v2nethost.cl";

			const extKey = this.apiKeyManager.createExtensionToken(userName, targetDevice, targetEditor);
			this.addLog(
				"INFO",
				"Auth",
				`Andy Code extension authorized for user "${userName}" on ${targetEditor} (${targetDevice})`,
			);

			const sep = targetCallbackUri.includes("?") ? "&" : "?";
			const redirectUrl = `${targetCallbackUri}${sep}token=${extKey.key}&name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}`;

			const acceptHeader = (req.headers.accept as string) || "";
			if (acceptHeader.includes("application/json")) {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, token: extKey.key, redirectUrl }));
				return;
			}

			res.writeHead(302, { Location: redirectUrl });
			res.end();
			return;
		}

		// GET - Render approval HTML page
		const html = this.getConnectPageHtml(device, editor, version, callbackUri, currentUser);
		res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
		res.end(html);
	}

	private async handleExtensionAuthConnect(
		req: IncomingMessage,
		res: ServerResponse,
		parsedUrl: URL,
		currentUser: AndyUserPublic | null | undefined,
	): Promise<void> {
		const body = await this.readJsonBody<any>(req);
		const device = body?.device || parsedUrl.searchParams.get("device") || "Mi Equipo";
		const editor = body?.editor || parsedUrl.searchParams.get("editor") || "VS Code";
		const callbackUri =
			body?.callback_uri ||
			parsedUrl.searchParams.get("callback_uri") ||
			"cursor://AndyAgent.andy-code/auth-callback";

		let effectiveUser = currentUser;
		if (!effectiveUser && body?.username && body?.password) {
			const loginResult = this.authManager.login(body.username, body.password, true);
			if (loginResult.success && loginResult.user) {
				effectiveUser = loginResult.user;
			}
		}

		const userName = effectiveUser?.displayName || effectiveUser?.username || "Andrés";
		const userEmail = effectiveUser?.username ? `${effectiveUser.username}@v2nethost.cl` : "andres@v2nethost.cl";

		const extKey = this.apiKeyManager.createExtensionToken(userName, device, editor);
		this.addLog(
			"INFO",
			"Auth",
			`Andy Code extension connected via API for user "${userName}" on ${editor} (${device})`,
		);

		const sep = callbackUri.includes("?") ? "&" : "?";
		const redirectUrl = `${callbackUri}${sep}token=${extKey.key}&name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}`;

		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(
			JSON.stringify({
				success: true,
				token: extKey.key,
				redirectUrl,
				user: { name: userName, email: userEmail },
			}),
		);
	}

	private async handleExtensionAuthVerify(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const authHeader = (req.headers.authorization as string) || (req.headers["x-api-key"] as string) || "";
		const authResult = this.apiKeyManager.validateKey(authHeader);

		if (authResult.valid) {
			const key = authResult.key;
			const cleanName = key?.name ? key.name.split(" (")[0] : "Andrés";
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({
					valid: true,
					user: {
						name: cleanName,
						email: "andres@v2nethost.cl",
						image: null,
					},
				}),
			);
			return;
		}

		const cleanToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
		const sessionValidation = this.authManager.validateSession(cleanToken);
		if (sessionValidation.valid && sessionValidation.user) {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({
					valid: true,
					user: {
						name: sessionValidation.user.displayName || sessionValidation.user.username,
						email: `${sessionValidation.user.username}@v2nethost.cl`,
						image: null,
					},
				}),
			);
			return;
		}

		res.writeHead(401, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ valid: false, error: authResult.reason || "Token inválido o expirado" }));
	}

	private async handleGatewayModels(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const ideProject = this.pool.getOrCreateIdeProject("default", "Andy Code");
		const pantheonRegistry = this.pool.getPantheonRegistry(ideProject.id);
		const squads = pantheonRegistry.getSquads();
		const agents = pantheonRegistry.getAgents();
		const availableLlmModels = this.pool.getAvailableModels();

		const data: any[] = [];

		// 1. Pantheon Squads (Multi-Agent Software Engineering Teams)
		for (const squad of squads) {
			const agentList = (squad.agents || []).map((a: any) => a.name || a.role || a.id).join(", ");
			data.push({
				id: `squad:${squad.id}`,
				object: "model",
				name: `Squad: ${squad.name || squad.id}`,
				description:
					squad.description ||
					`Escuadrón autónomo ${squad.name} con especialistas: ${agentList}`,
				context_window: 128000,
				max_tokens: 8192,
				type: "language",
				tags: ["squad", "pantheon", "multi-agent"],
				owned_by: "andy-agent",
				pricing: { input: "0", output: "0" },
			});
		}

		// Alias for programming-squad
		if (squads.some((s) => s.id === "dev-team-squad")) {
			data.push({
				id: "squad:programming-squad",
				object: "model",
				name: "Squad: Programming Squad (Architect, Developer, Tester, DevOps)",
				description:
					"Escuadrón autónomo completo de desarrollo de software con roles de arquitecto, programador, pruebas y devops.",
				context_window: 128000,
				max_tokens: 8192,
				type: "language",
				tags: ["squad", "pantheon", "multi-agent"],
				owned_by: "andy-agent",
				pricing: { input: "0", output: "0" },
			});
		}

		// 2. Specialized Agents
		for (const agent of agents) {
			data.push({
				id: `agent:${agent.id}`,
				object: "model",
				name: `${agent.name || agent.id} (${agent.role || "Especialista"})`,
				description: agent.systemPrompt
					? agent.systemPrompt.slice(0, 180).replace(/\n+/g, " ")
					: `Agente especialista ${agent.name}`,
				context_window: 128000,
				max_tokens: 8192,
				type: "language",
				tags: ["agent", agent.role || "specialist"],
				owned_by: "andy-agent",
				pricing: { input: "0", output: "0" },
			});
		}

		// 3. Raw LLM Models
		for (const model of availableLlmModels) {
			data.push({
				id: model.id,
				object: "model",
				name: model.name || model.id,
				description: `Modelo LLM ${model.name || model.id} (${model.provider || "Andy Agent"})`,
				context_window: model.contextWindow || 128000,
				max_tokens: model.maxTokens || 8192,
				type: "language",
				tags: [model.provider || "llm"],
				owned_by: model.provider || "andy-agent",
				pricing: { input: "0", output: "0" },
			});
		}

		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ object: "list", data }));
	}

	private async handleExtensionAgentConfig(
		req: IncomingMessage,
		res: ServerResponse,
		parsedUrl: URL,
	): Promise<void> {
		const modelId = parsedUrl.searchParams.get("model") || "squad:programming-squad";
		const ideProject = this.pool.getOrCreateIdeProject("default", "Andy Code");
		const pantheonRegistry = this.pool.getPantheonRegistry(ideProject.id);

		let squadId = "";
		if (modelId.startsWith("squad:")) squadId = modelId.slice(6);
		else if (modelId.startsWith("agent:")) squadId = "fullstack-squad";
		else squadId = modelId;

		if (squadId === "programming-squad" || squadId === "programming") {
			squadId = "dev-team-squad";
		}

		const squad = pantheonRegistry.getSquads().find((s) => s.id.toLowerCase() === squadId.toLowerCase());

		let memory = "";
		let guidelines = "";
		try {
			const memPath = path.join(this.pool.cwd, "MEMORY.md");
			if (existsSync(memPath)) memory = readFileSync(memPath, "utf-8");
			const agentsPath = path.join(this.pool.cwd, "AGENTS.md");
			if (existsSync(agentsPath)) guidelines = readFileSync(agentsPath, "utf-8");
		} catch {}

		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(
			JSON.stringify({
				success: true,
				model: modelId,
				squad: squad || null,
				memory,
				guidelines,
				contextWindow: 128000,
				maxTokens: 8192,
			}),
		);
	}

	private getConnectPageHtml(
		device: string,
		editor: string,
		version: string,
		callbackUri: string,
		currentUser: AndyUserPublic | null | undefined,
	): string {
		const esc = (s: string) =>
			s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

		const safeDevice = esc(device);
		const safeEditor = esc(editor);
		const safeVersion = esc(version);
		const safeCallbackUri = esc(callbackUri);
		const safeUserName = currentUser ? esc(currentUser.displayName || currentUser.username) : "";

		return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vincular Andy Code con Andy Agent</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --border: #1f2937;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --primary: #06b6d4;
      --primary-hover: #0891b2;
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at top, #1e293b 0%, var(--bg) 100%);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 2.25rem;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      background: rgba(6, 182, 212, 0.12);
      border: 1px solid rgba(6, 182, 212, 0.3);
      border-radius: 9999px;
      color: var(--primary);
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
    p.subtitle { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem; }
    .info-box {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1rem;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 0.35rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: var(--text-muted); }
    .info-val { font-weight: 600; }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.85rem 1.25rem;
      border-radius: 0.6rem;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
      color: #ffffff;
      box-shadow: 0 4px 14px 0 rgba(6, 182, 212, 0.39);
    }
    .btn-primary:hover { opacity: 0.95; transform: translateY(-1px); }
    .btn-secondary {
      background: transparent;
      color: var(--text-muted);
      margin-top: 0.75rem;
      border: 1px solid var(--border);
    }
    .btn-secondary:hover { color: var(--text); background: rgba(255, 255, 255, 0.05); }
    .status-pill {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      margin-right: 4px;
    }
    .input-field {
      width: 100%;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      background: #0f172a;
      border: 1px solid var(--border);
      color: #fff;
      font-size: 0.95rem;
      margin-bottom: 0.85rem;
    }
    .input-field:focus { outline: none; border-color: var(--primary); }
    .user-pill {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      margin-bottom: 1.25rem;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .footnote {
      text-align: center;
      margin-top: 1.25rem;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .footnote a { color: var(--primary); text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <span class="status-pill"></span> Andy Agent Servidor
    </div>
    <h1>Vincular Andy Code</h1>
    <p class="subtitle">Conecta la extensión a tu servidor Linux de Andy Agent</p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">💻 Dispositivo:</span>
        <span class="info-val">${safeDevice}</span>
      </div>
      <div class="info-row">
        <span class="info-label">✏️ Editor:</span>
        <span class="info-val">${safeEditor}</span>
      </div>
      <div class="info-row">
        <span class="info-label">📦 Extensión:</span>
        <span class="info-val">v${safeVersion}</span>
      </div>
      <div class="info-row">
        <span class="info-label">🌐 Servidor:</span>
        <span class="info-val">ia.v2nethost.cl:3000</span>
      </div>
    </div>

    ${
		currentUser
			? `
      <div class="user-pill">
        <span>👤 Sesión activa: <strong>${safeUserName}</strong></span>
      </div>
      <form method="POST" action="/dashboard/connect">
        <input type="hidden" name="device" value="${safeDevice}">
        <input type="hidden" name="editor" value="${safeEditor}">
        <input type="hidden" name="version" value="${safeVersion}">
        <input type="hidden" name="callback_uri" value="${safeCallbackUri}">
        <button type="submit" class="btn btn-primary">
          ✓ Autorizar y Conectar a Andy Code
        </button>
      </form>
    `
			: `
      <form method="POST" action="/dashboard/connect">
        <input type="hidden" name="device" value="${safeDevice}">
        <input type="hidden" name="editor" value="${safeEditor}">
        <input type="hidden" name="version" value="${safeVersion}">
        <input type="hidden" name="callback_uri" value="${safeCallbackUri}">
        
        <input type="text" name="username" class="input-field" placeholder="Usuario de Andy Agent" required autocomplete="username">
        <input type="password" name="password" class="input-field" placeholder="Contraseña" required autocomplete="current-password">
        
        <button type="submit" class="btn btn-primary">
          ✓ Iniciar Sesión y Conectar
        </button>
      </form>
      
      <form method="POST" action="/dashboard/connect" style="margin-top: 0.75rem;">
        <input type="hidden" name="device" value="${safeDevice}">
        <input type="hidden" name="editor" value="${safeEditor}">
        <input type="hidden" name="version" value="${safeVersion}">
        <input type="hidden" name="callback_uri" value="${safeCallbackUri}">
        <button type="submit" class="btn btn-secondary">
          ⚡ Conectar como Administrador Local (1-Click)
        </button>
      </form>
    `
	}

    <div class="footnote">
      Al autorizar, se abrirá tu editor (${safeEditor}) y quedará configurado inmediatamente el proveedor Andy Gateway.
    </div>
  </div>
</body>
</html>`;
	}
}

export const PrimeWebUiServer = AndyWebUiServer;
