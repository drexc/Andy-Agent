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

export interface WebUiSessionItem {
	id: string;
	session: AgentSession;
	lastActive: number;
	modelId: string;
	provider: string;
	title: string;
	cwd: string;
}

interface StoredSessionData {
	id: string;
	title: string;
	modelId: string;
	provider: string;
	lastActive: number;
	cwd: string;
	messages: any[];
}

export class WebUiSessionPool {
	private sessions = new Map<string, WebUiSessionItem>();
	private authStorage: AuthStorage;
	private modelRegistry: ModelRegistry;
	private settingsManager: SettingsManager;
	private graft: GraftEngine;
	public cwd: string;
	public storageDir: string;

	constructor(cwd = process.cwd()) {
		this.cwd = cwd;
		this.authStorage = AuthStorage.create();
		this.modelRegistry = ModelRegistry.create(this.authStorage);
		this.settingsManager = SettingsManager.create(cwd);
		this.graft = new GraftEngine(cwd);
		this.storageDir = path.join(os.homedir(), ".andy", "agent", "webui_sessions");
		if (!existsSync(this.storageDir)) {
			mkdirSync(this.storageDir, { recursive: true });
		}
	}

	public getGraftEngine(): GraftEngine {
		return this.graft;
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

	public listSessions(): Array<{
		id: string;
		title: string;
		modelId: string;
		provider: string;
		lastActive: number;
		messageCount: number;
	}> {
		// First, read from memory
		const list = new Map<
			string,
			{ id: string; title: string; modelId: string; provider: string; lastActive: number; messageCount: number }
		>();

		for (const s of this.sessions.values()) {
			list.set(s.id, {
				id: s.id,
				title: s.title,
				modelId: s.modelId,
				provider: s.provider,
				lastActive: s.lastActive,
				messageCount: s.session.state.messages.length,
			});
		}

		// Also check disk storage for persisted sessions
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

		return Array.from(list.values()).sort((a, b) => b.lastActive - a.lastActive);
	}

	public async getOrCreateSession(
		sessionId = "default",
		modelId?: string,
		provider?: string,
	): Promise<WebUiSessionItem> {
		const existing = this.sessions.get(sessionId);
		if (existing) {
			existing.lastActive = Date.now();
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

		const resolvedModel =
			this.findModel(modelId || storedData?.modelId, provider || storedData?.provider) ||
			this.findModel("auto/best-coding") ||
			this.modelRegistry.getAll()[0];

		if (!resolvedModel) {
			throw new Error("No language model available. Please configure an API key or provider in settings.");
		}

		const sessionManager = PiSessionManager.inMemory();
		const { session } = await createAgentSession({
			cwd: storedData?.cwd || this.cwd,
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
			session,
			lastActive: storedData?.lastActive || Date.now(),
			modelId: resolvedModel.id,
			provider: resolvedModel.provider,
			title: storedData?.title || `Chat ${new Date().toLocaleTimeString()}`,
			cwd: storedData?.cwd || this.cwd,
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

		if (!modelId && !provider) {
			return all.find((m) => this.modelRegistry.hasConfiguredAuth(m)) || all[0];
		}

		if (modelId) {
			const direct = this.modelRegistry.find(provider || "", modelId);
			if (direct) return direct;

			const byId = all.find((m) => m.id === modelId || m.id.toLowerCase() === modelId.toLowerCase());
			if (byId) return byId;

			if (modelId.includes("/")) {
				const [p, ...rest] = modelId.split("/");
				const mId = rest.join("/");
				const match = all.find(
					(m) => m.provider.toLowerCase() === p.toLowerCase() && m.id.toLowerCase() === mId.toLowerCase(),
				);
				if (match) return match;
			}
		}

		if (provider) {
			const byProvider = all.find((m) => m.provider.toLowerCase() === provider.toLowerCase());
			if (byProvider) return byProvider;
		}

		return all[0];
	}
}
