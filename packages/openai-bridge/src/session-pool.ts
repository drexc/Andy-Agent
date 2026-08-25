import { join } from "node:path";
import type { Model } from "@earendil-works/pi-ai";
import {
	type AgentSession,
	AuthStorage,
	createAgentSession,
	getAgentDir,
	ModelRegistry,
	SessionManager,
} from "@earendil-works/pi-coding-agent";
import type { BridgeServerOptions } from "./types.js";

interface PooledSession {
	id: string;
	session: AgentSession;
	lastActive: number;
	modelId?: string;
	provider?: string;
	cwd: string;
}

export class SessionPool {
	private sessions = new Map<string, PooledSession>();
	private authStorage: AuthStorage;
	private modelRegistry: ModelRegistry;
	private agentDir: string;
	private options: BridgeServerOptions;
	private cleanupInterval: NodeJS.Timeout;

	constructor(options: BridgeServerOptions = {}) {
		this.options = options;
		this.agentDir = getAgentDir();
		this.authStorage = AuthStorage.create(join(this.agentDir, "auth.json"));
		this.modelRegistry = ModelRegistry.create(this.authStorage, join(this.agentDir, "models.json"));

		const timeout = options.sessionTimeoutMs ?? 30 * 60 * 1000;
		this.cleanupInterval = setInterval(() => this.cleanup(timeout), 60 * 1000);
	}

	public getModelRegistry(): ModelRegistry {
		return this.modelRegistry;
	}

	public getAvailableModels(): Model<any>[] {
		return this.modelRegistry.getAll();
	}

	public findModel(modelIdOrPattern?: string, providerName?: string): Model<any> | undefined {
		if (!modelIdOrPattern && !providerName) {
			const defaultProv = this.options.defaultProvider || "omniroute";
			const defaultMod = this.options.defaultModel || "auto/best-coding";
			return this.modelRegistry.find(defaultProv, defaultMod) ?? this.modelRegistry.getAll()[0];
		}

		if (providerName && modelIdOrPattern) {
			const match = this.modelRegistry.find(providerName, modelIdOrPattern);
			if (match) return match;
		}

		if (modelIdOrPattern) {
			// Check if model contains provider prefix "provider/model"
			if (modelIdOrPattern.includes("/")) {
				const [prov, ...rest] = modelIdOrPattern.split("/");
				const mod = rest.join("/");
				const direct = this.modelRegistry.find(prov, mod);
				if (direct) return direct;
			}

			// Search across all providers
			const all = this.modelRegistry.getAll();
			const byId = all.find((m) => m.id === modelIdOrPattern || m.name === modelIdOrPattern);
			if (byId) return byId;

			// Check default provider
			const defaultProv = this.options.defaultProvider || "omniroute";
			const inDefault = this.modelRegistry.find(defaultProv, modelIdOrPattern);
			if (inDefault) return inDefault;
		}

		return this.modelRegistry.getAll()[0];
	}

	public async getOrCreateSession(params: {
		sessionId?: string;
		modelId?: string;
		provider?: string;
		cwd?: string;
	}): Promise<{ session: AgentSession; resolvedModel: Model<any> }> {
		const sessionId = params.sessionId || "default";
		const cwd = params.cwd || this.options.cwd || process.cwd();
		const resolvedModel = this.findModel(params.modelId, params.provider);

		if (!resolvedModel) {
			throw new Error(`No model found matching "${params.modelId || params.provider || "default"}".`);
		}

		const existing = this.sessions.get(sessionId);
		if (existing) {
			existing.lastActive = Date.now();
			if (params.modelId && existing.modelId !== params.modelId) {
				try {
					await existing.session.setModel(resolvedModel);
					existing.modelId = resolvedModel.id;
				} catch (e) {
					console.warn(`[SessionPool] Warning setting model for session ${sessionId}:`, e);
				}
			}
			return { session: existing.session, resolvedModel };
		}

		// Create new session
		const sessionManager = SessionManager.inMemory();
		const { session } = await createAgentSession({
			cwd,
			agentDir: this.agentDir,
			authStorage: this.authStorage,
			modelRegistry: this.modelRegistry,
			model: resolvedModel,
			sessionManager,
		});

		this.sessions.set(sessionId, {
			id: sessionId,
			session,
			lastActive: Date.now(),
			modelId: resolvedModel.id,
			provider: resolvedModel.provider,
			cwd,
		});

		return { session, resolvedModel };
	}

	public async resetSession(sessionId: string): Promise<boolean> {
		const item = this.sessions.get(sessionId);
		if (item) {
			try {
				await item.session.abort();
			} catch {}
			this.sessions.delete(sessionId);
			return true;
		}
		return false;
	}

	public async resetAll(): Promise<void> {
		for (const [_id, item] of this.sessions.entries()) {
			try {
				await item.session.abort();
			} catch {}
		}
		this.sessions.clear();
	}

	private cleanup(timeoutMs: number): void {
		const now = Date.now();
		for (const [id, item] of this.sessions.entries()) {
			if (now - item.lastActive > timeoutMs) {
				try {
					item.session.abort();
				} catch {}
				this.sessions.delete(id);
			}
		}
	}

	public dispose(): void {
		clearInterval(this.cleanupInterval);
		this.resetAll().catch(() => {});
	}
}
