import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Model } from "@earendil-works/pi-ai";
import {
	type AgentSession,
	AuthStorage,
	createAgentSession,
	ModelRegistry,
	SessionManager as PiSessionManager,
	SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { GraftEngine } from "../../../coding-agent/src/core/graft/index.js";

export interface ProjectItem {
	id: string;
	name: string;
	path: string;
	description?: string;
	createdAt: number;
	lastActive: number;
	defaultModel?: string;
	defaultProvider?: string;
}

export interface WebUiSessionItem {
	id: string;
	projectId: string;
	session: AgentSession;
	lastActive: number;
	modelId: string;
	provider: string;
	title: string;
	cwd: string;
}

interface StoredSessionData {
	id: string;
	projectId?: string;
	title: string;
	modelId: string;
	provider: string;
	lastActive: number;
	cwd: string;
	messages: any[];
}

interface StoredProjectsFile {
	activeProjectId: string;
	projects: ProjectItem[];
}

export class WebUiSessionPool {
	private sessions = new Map<string, WebUiSessionItem>();
	private projects = new Map<string, ProjectItem>();
	private activeProjectId = "default";
	private authStorage: AuthStorage;
	private modelRegistry: ModelRegistry;
	private settingsManager: SettingsManager;
	private graftEngines = new Map<string, GraftEngine>();
	public cwd: string;
	public storageDir: string;
	public projectsFilePath: string;

	constructor(cwd = process.cwd()) {
		this.cwd = cwd;
		this.authStorage = AuthStorage.create();
		this.modelRegistry = ModelRegistry.create(this.authStorage);
		this.settingsManager = SettingsManager.create(cwd);
		this.storageDir = path.join(os.homedir(), ".andy", "agent", "webui_sessions");
		this.projectsFilePath = path.join(os.homedir(), ".andy", "agent", "projects.json");

		if (!existsSync(this.storageDir)) {
			mkdirSync(this.storageDir, { recursive: true });
		}

		// Ensure Omniroute is configured by default if no auth/models exist
		this.ensureDefaultOmnirouteConfig();

		// Initialize Projects
		this.loadProjects(cwd);
	}

	private ensureDefaultOmnirouteConfig(): void {
		try {
			const modelsJsonPath = existsSync(path.join(os.homedir(), ".andy", "agent", "models.json"))
				? path.join(os.homedir(), ".andy", "agent", "models.json")
				: existsSync(path.join(os.homedir(), ".prime", "agent", "models.json"))
					? path.join(os.homedir(), ".prime", "agent", "models.json")
					: path.join(os.homedir(), ".andy", "agent", "models.json");

			let modelsConfig: any = { providers: {} };
			let needsSave = false;

			if (existsSync(modelsJsonPath)) {
				try {
					modelsConfig = JSON.parse(readFileSync(modelsJsonPath, "utf-8"));
				} catch {}
			} else {
				needsSave = true;
			}

			if (!modelsConfig.providers) {
				modelsConfig.providers = {};
				needsSave = true;
			}

			if (!modelsConfig.providers.omniroute) {
				const isDebianOrLinux = process.platform === "linux";
				const defaultBaseUrl = isDebianOrLinux ? "http://127.0.0.1:20128/v1" : "http://ia.v2nethost.cl:20128/v1";
				modelsConfig.providers.omniroute = {
					baseUrl: defaultBaseUrl,
					apiKey: "sk-7fd5586a69f723fb-71d90e-838d8616",
					api: "openai-completions",
					models: [
						{
							id: "auto/best-coding",
							name: "Omniroute Auto Best Coding",
							api: "openai-completions",
							baseUrl: defaultBaseUrl,
							reasoning: true,
							input: ["text", "image"],
						},
					],
				};
				needsSave = true;
			}

			if (needsSave) {
				const dir = path.dirname(modelsJsonPath);
				if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
				writeFileSync(modelsJsonPath, JSON.stringify(modelsConfig, null, 2), "utf-8");
			}

			// Ensure AuthStorage has omniroute credentials
			if (!this.authStorage.hasAuth("omniroute")) {
				this.authStorage.set("omniroute", {
					type: "api_key",
					key: "sk-7fd5586a69f723fb-71d90e-838d8616",
				});
			}

			// If no default provider configured, set to omniroute
			if (!this.settingsManager.getDefaultProvider()) {
				this.settingsManager.setDefaultProvider("omniroute");
				this.settingsManager.setDefaultModel("auto/best-coding");
			}

			this.modelRegistry.refresh();
		} catch (e) {
			console.warn("[WebUI] Warning initializing default Omniroute config:", e);
		}
	}

	private loadProjects(initialCwd: string): void {
		let loadedFromFile = false;
		if (existsSync(this.projectsFilePath)) {
			try {
				const content = readFileSync(this.projectsFilePath, "utf-8");
				const parsed = JSON.parse(content) as StoredProjectsFile;
				if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
					for (const p of parsed.projects) {
						this.projects.set(p.id, p);
					}
					if (parsed.activeProjectId && this.projects.has(parsed.activeProjectId)) {
						this.activeProjectId = parsed.activeProjectId;
					} else {
						this.activeProjectId = parsed.projects[0].id;
					}
					loadedFromFile = true;
				}
			} catch (e) {
				console.warn("[WebUI] Warning reading projects.json:", e);
			}
		}

		if (!loadedFromFile || this.projects.size === 0) {
			const initialProject: ProjectItem = {
				id: "default",
				name: path.basename(initialCwd) || "Proyecto Principal",
				path: path.resolve(initialCwd),
				description: "Proyecto predeterminado del espacio de trabajo",
				createdAt: Date.now(),
				lastActive: Date.now(),
			};
			this.projects.set(initialProject.id, initialProject);
			this.activeProjectId = initialProject.id;
			this.saveProjects();
		}

		const active = this.getActiveProject();
		this.cwd = active.path;
		this.getOrCreateGraftEngine(active.id, active.path);
	}

	private saveProjects(): void {
		try {
			const dir = path.dirname(this.projectsFilePath);
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}
			const data: StoredProjectsFile = {
				activeProjectId: this.activeProjectId,
				projects: Array.from(this.projects.values()),
			};
			writeFileSync(this.projectsFilePath, JSON.stringify(data, null, 2), "utf-8");
		} catch (err) {
			console.error("[WebUI] Failed to persist projects.json:", err);
		}
	}

	public getActiveProject(): ProjectItem {
		const found = this.projects.get(this.activeProjectId);
		if (found) return found;
		const first = Array.from(this.projects.values())[0];
		if (first) {
			this.activeProjectId = first.id;
			return first;
		}
		const fallback: ProjectItem = {
			id: "default",
			name: "Proyecto Principal",
			path: this.cwd,
			createdAt: Date.now(),
			lastActive: Date.now(),
		};
		this.projects.set(fallback.id, fallback);
		this.activeProjectId = fallback.id;
		return fallback;
	}

	public getProject(projectId: string): ProjectItem | undefined {
		return this.projects.get(projectId);
	}

	public listProjects(): {
		projects: Array<ProjectItem & { sessionCount: number }>;
		activeProjectId: string;
		activeProject: ProjectItem;
	} {
		const allSessions = this.listSessionsUnfiltered();
		const result = Array.from(this.projects.values()).map((p) => {
			const count = allSessions.filter((s) => s.projectId === p.id || (!s.projectId && p.id === "default")).length;
			return {
				...p,
				sessionCount: count,
			};
		});

		result.sort((a, b) => b.lastActive - a.lastActive);
		return {
			projects: result,
			activeProjectId: this.activeProjectId,
			activeProject: this.getActiveProject(),
		};
	}

	public createProject(data: {
		name: string;
		path: string;
		description?: string;
		defaultModel?: string;
		defaultProvider?: string;
	}): ProjectItem {
		const name = data.name?.trim();
		const rawPath = data.path?.trim();
		if (!name) throw new Error("Project name is required");
		if (!rawPath) throw new Error("Project folder path is required");

		const resolvedPath = path.resolve(rawPath);
		if (!existsSync(resolvedPath)) {
			mkdirSync(resolvedPath, { recursive: true });
		}

		const id = `proj-${Math.random().toString(36).substring(2, 9)}`;
		const project: ProjectItem = {
			id,
			name,
			path: resolvedPath,
			description: data.description?.trim() || "",
			createdAt: Date.now(),
			lastActive: Date.now(),
			defaultModel: data.defaultModel,
			defaultProvider: data.defaultProvider,
		};

		this.projects.set(id, project);
		this.getOrCreateGraftEngine(id, resolvedPath);
		this.saveProjects();
		return project;
	}

	public switchProject(projectId: string): ProjectItem {
		const project = this.projects.get(projectId);
		if (!project) {
			throw new Error(`Project with ID "${projectId}" not found`);
		}

		this.activeProjectId = project.id;
		project.lastActive = Date.now();
		this.cwd = project.path;

		// Recreate or point settings manager to project path
		this.settingsManager = SettingsManager.create(project.path);

		// Ensure Graft instance exists and is initialized for this project
		this.getOrCreateGraftEngine(project.id, project.path);

		this.saveProjects();
		return project;
	}

	public updateProject(
		projectId: string,
		data: {
			name?: string;
			path?: string;
			description?: string;
			defaultModel?: string;
			defaultProvider?: string;
		},
	): ProjectItem {
		const project = this.projects.get(projectId);
		if (!project) {
			throw new Error(`Project with ID "${projectId}" not found`);
		}

		if (data.name !== undefined) project.name = data.name.trim() || project.name;
		if (data.description !== undefined) project.description = data.description.trim();
		if (data.defaultModel !== undefined) project.defaultModel = data.defaultModel;
		if (data.defaultProvider !== undefined) project.defaultProvider = data.defaultProvider;

		if (data.path && data.path.trim() && data.path.trim() !== project.path) {
			const newPath = path.resolve(data.path.trim());
			if (!existsSync(newPath)) {
				mkdirSync(newPath, { recursive: true });
			}
			project.path = newPath;
			this.graftEngines.delete(projectId);
			this.getOrCreateGraftEngine(projectId, newPath);
			if (this.activeProjectId === projectId) {
				this.cwd = newPath;
				this.settingsManager = SettingsManager.create(newPath);
			}
		}

		this.saveProjects();
		return project;
	}

	public deleteProject(projectId: string): boolean {
		if (this.projects.size <= 1) {
			throw new Error("Cannot delete the only remaining project.");
		}

		const deleted = this.projects.delete(projectId);
		if (deleted) {
			this.graftEngines.delete(projectId);

			// Delete associated sessions from memory and disk
			for (const [sId, s] of this.sessions.entries()) {
				if (s.projectId === projectId) {
					this.deleteSession(sId);
				}
			}

			// If active project was deleted, switch to the first remaining
			if (this.activeProjectId === projectId) {
				const nextProj = Array.from(this.projects.values())[0];
				if (nextProj) {
					this.switchProject(nextProj.id);
				}
			} else {
				this.saveProjects();
			}
		}
		return deleted;
	}

	public getOrCreateGraftEngine(projectId?: string, customPath?: string): GraftEngine {
		const pId = projectId || this.activeProjectId;
		let engine = this.graftEngines.get(pId);
		if (!engine) {
			const project = this.projects.get(pId);
			const targetPath = customPath || project?.path || this.cwd;
			engine = new GraftEngine(targetPath);
			this.graftEngines.set(pId, engine);
		}
		return engine;
	}

	public getGraftEngine(projectId?: string): GraftEngine {
		return this.getOrCreateGraftEngine(projectId);
	}

	public getAvailableModels(): Model<any>[] {
		return this.modelRegistry.getAll();
	}

	public getModelRegistry(): ModelRegistry {
		return this.modelRegistry;
	}

	public getAuthStorage(): AuthStorage {
		return this.authStorage;
	}

	public getSettingsManager(): SettingsManager {
		return this.settingsManager;
	}

	private listSessionsUnfiltered(): Array<{
		id: string;
		projectId: string;
		title: string;
		modelId: string;
		provider: string;
		lastActive: number;
		messageCount: number;
	}> {
		const list = new Map<
			string,
			{
				id: string;
				projectId: string;
				title: string;
				modelId: string;
				provider: string;
				lastActive: number;
				messageCount: number;
			}
		>();

		for (const s of this.sessions.values()) {
			list.set(s.id, {
				id: s.id,
				projectId: s.projectId || "default",
				title: s.title,
				modelId: s.modelId,
				provider: s.provider,
				lastActive: s.lastActive,
				messageCount: s.session.state.messages.length,
			});
		}

		try {
			if (existsSync(this.storageDir)) {
				const files = readdirSync(this.storageDir).filter((f) => f.endsWith(".json"));
				for (const f of files) {
					const sessionId = f.replace(/\.json$/, "");
					if (!list.has(sessionId)) {
						try {
							const content = readFileSync(path.join(this.storageDir, f), "utf-8");
							const parsed = JSON.parse(content) as StoredSessionData;
							list.set(sessionId, {
								id: parsed.id || sessionId,
								projectId: parsed.projectId || "default",
								title: parsed.title || `Chat ${sessionId.slice(0, 8)}`,
								modelId: parsed.modelId || "auto/best-coding",
								provider: parsed.provider || "omniroute",
								lastActive: parsed.lastActive || Date.now(),
								messageCount: Array.isArray(parsed.messages) ? parsed.messages.length : 0,
							});
						} catch {}
					}
				}
			}
		} catch {}

		return Array.from(list.values());
	}

	public listSessions(projectId?: string): Array<{
		id: string;
		projectId: string;
		title: string;
		modelId: string;
		provider: string;
		lastActive: number;
		messageCount: number;
	}> {
		const targetProjectId = projectId || this.activeProjectId;
		const all = this.listSessionsUnfiltered();
		const filtered = all.filter(
			(s) => s.projectId === targetProjectId || (!s.projectId && targetProjectId === "default"),
		);
		return filtered.sort((a, b) => b.lastActive - a.lastActive);
	}

	public async getOrCreateSession(
		sessionId = "default",
		modelId?: string,
		provider?: string,
		projectId?: string,
	): Promise<WebUiSessionItem> {
		const targetProjectId = projectId || this.activeProjectId;
		const targetProject = this.getProject(targetProjectId) || this.getActiveProject();

		const existing = this.sessions.get(sessionId);
		if (existing) {
			existing.lastActive = Date.now();
			if (!existing.projectId) existing.projectId = targetProject.id;
			if (modelId) {
				const resolvedModel = this.findModel(modelId, provider);
				if (resolvedModel && resolvedModel.id !== existing.modelId) {
					try {
						await existing.session.setModel(resolvedModel);
						existing.modelId = resolvedModel.id;
						existing.provider = resolvedModel.provider;
						this.persistSession(existing);
					} catch (e) {
						console.warn(`[WebUI] Warning setting model for session ${sessionId}:`, e);
					}
				}
			}
			return existing;
		}

		// Check if stored on disk
		const storedFile = path.join(this.storageDir, `${sessionId}.json`);
		let storedData: StoredSessionData | null = null;
		if (existsSync(storedFile)) {
			try {
				const raw = readFileSync(storedFile, "utf-8");
				storedData = JSON.parse(raw);
			} catch {}
		}

		const defaultProv = this.settingsManager.getDefaultProvider() || "omniroute";
		const defaultMod = this.settingsManager.getDefaultModel() || "auto/best-coding";

		const targetProvider = provider || storedData?.provider || targetProject.defaultProvider || defaultProv;
		const targetModel = modelId || storedData?.modelId || targetProject.defaultModel || defaultMod;

		const resolvedModel =
			this.findModel(targetModel, targetProvider) ||
			this.findModel(defaultMod, defaultProv) ||
			this.findModel("auto/best-coding", "omniroute");

		if (!resolvedModel) {
			throw new Error("No language model available. Please configure an API key or provider in settings.");
		}

		const sessionManager = PiSessionManager.inMemory();
		const sessionCwd = storedData?.cwd || targetProject.path || this.cwd;
		const { session } = await createAgentSession({
			cwd: sessionCwd,
			authStorage: this.authStorage,
			modelRegistry: this.modelRegistry,
			settingsManager: this.settingsManager,
			model: resolvedModel,
			sessionManager,
		});

		// Restore previous messages if loaded from disk
		if (storedData?.messages && Array.isArray(storedData.messages) && storedData.messages.length > 0) {
			try {
				(session.state as any).messages = storedData.messages;
			} catch {}
		}

		const item: WebUiSessionItem = {
			id: sessionId,
			projectId: storedData?.projectId || targetProject.id,
			session,
			lastActive: storedData?.lastActive || Date.now(),
			modelId: resolvedModel.id,
			provider: resolvedModel.provider,
			title: storedData?.title || `Chat ${new Date().toLocaleTimeString()}`,
			cwd: sessionCwd,
		};

		this.sessions.set(sessionId, item);
		this.persistSession(item);
		return item;
	}

	public async setSessionTitle(sessionId: string, newTitle: string): Promise<boolean> {
		const title = newTitle.trim();
		if (!title) return false;

		const existing = this.sessions.get(sessionId);
		if (existing) {
			existing.title = title;
			this.persistSession(existing);
			return true;
		}

		// If not in memory, update on disk
		const storedFile = path.join(this.storageDir, `${sessionId}.json`);
		if (existsSync(storedFile)) {
			try {
				const raw = readFileSync(storedFile, "utf-8");
				const data = JSON.parse(raw) as StoredSessionData;
				data.title = title;
				writeFileSync(storedFile, JSON.stringify(data, null, 2), "utf-8");
				return true;
			} catch {}
		}

		return false;
	}

	public persistSession(item: WebUiSessionItem): void {
		try {
			const filePath = path.join(this.storageDir, `${item.id}.json`);
			const data: StoredSessionData = {
				id: item.id,
				projectId: item.projectId,
				title: item.title,
				modelId: item.modelId,
				provider: item.provider,
				lastActive: item.lastActive,
				cwd: item.cwd,
				messages: item.session.state.messages || [],
			};
			writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
		} catch (err) {
			console.error(`[WebUI] Failed to persist session ${item.id}:`, err);
		}
	}

	public async deleteSession(sessionId: string): Promise<boolean> {
		const item = this.sessions.get(sessionId);
		if (item) {
			try {
				await item.session.abort();
			} catch {}
			this.sessions.delete(sessionId);
		}

		// Delete from disk
		const storedFile = path.join(this.storageDir, `${sessionId}.json`);
		if (existsSync(storedFile)) {
			try {
				unlinkSync(storedFile);
			} catch {}
		}

		return true;
	}

	public findModel(modelId?: string, provider?: string): Model<any> | undefined {
		const all = this.modelRegistry.getAll();
		if (!all || all.length === 0) return undefined;

		const defaultProv = this.settingsManager.getDefaultProvider() || "omniroute";
		const defaultMod = this.settingsManager.getDefaultModel() || "auto/best-coding";

		const targetProvider = provider || defaultProv;
		const targetModelId = modelId || defaultMod;

		// 1. Direct search by provider and model ID
		if (targetProvider && targetModelId) {
			const direct = this.modelRegistry.find(targetProvider, targetModelId);
			if (direct) return direct;
		}

		// 2. Direct search by model ID with any provider
		if (targetModelId) {
			const directWithTarget = all.find(
				(m) =>
					m.provider.toLowerCase() === targetProvider.toLowerCase() &&
					m.id.toLowerCase() === targetModelId.toLowerCase(),
			);
			if (directWithTarget) return directWithTarget;

			const byIdWithAuth = all.find(
				(m) =>
					(m.id === targetModelId || m.id.toLowerCase() === targetModelId.toLowerCase()) &&
					this.modelRegistry.hasConfiguredAuth(m),
			);
			if (byIdWithAuth) return byIdWithAuth;

			const byId = all.find((m) => m.id === targetModelId || m.id.toLowerCase() === targetModelId.toLowerCase());
			if (byId && this.modelRegistry.hasConfiguredAuth(byId)) return byId;

			if (targetModelId.includes("/")) {
				const [p, ...rest] = targetModelId.split("/");
				const mId = rest.join("/");
				const match = all.find(
					(m) => m.provider.toLowerCase() === p.toLowerCase() && m.id.toLowerCase() === mId.toLowerCase(),
				);
				if (match) return match;
			}
		}

		// 3. Search by provider with configured auth
		if (targetProvider) {
			const byProviderWithAuth = all.find(
				(m) => m.provider.toLowerCase() === targetProvider.toLowerCase() && this.modelRegistry.hasConfiguredAuth(m),
			);
			if (byProviderWithAuth) return byProviderWithAuth;

			const byProvider = all.find((m) => m.provider.toLowerCase() === targetProvider.toLowerCase());
			if (byProvider && this.modelRegistry.hasConfiguredAuth(byProvider)) return byProvider;
		}

		// 4. Search for ANY available model with configured auth
		const available = this.modelRegistry.getAvailable();
		if (available.length > 0) {
			return available[0];
		}

		// 5. Fallback: synthesize an Omniroute model so requests route to Omniroute proxy
		const isDebianOrLinux = process.platform === "linux";
		const fallbackBaseUrl = isDebianOrLinux ? "http://127.0.0.1:20128/v1" : "http://ia.v2nethost.cl:20128/v1";
		return {
			id: targetModelId || "auto/best-coding",
			name: `Omniroute (${targetModelId || "auto/best-coding"})`,
			api: "openai-completions" as any,
			provider: "omniroute",
			baseUrl: fallbackBaseUrl,
			reasoning: true,
			input: ["text", "image"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 128000,
			maxTokens: 16384,
		} as Model<any>;
	}
}
