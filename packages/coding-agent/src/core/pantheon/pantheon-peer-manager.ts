/**
 * Pantheon Peer Manager
 * Implements bot-to-bot direct communication (inspired by Hermes 0.21.0 `hermes peer`).
 * Preserves durable inter-agent conversation histories on disk across sessions.
 */

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { PantheonRegistry } from "./pantheon-registry.js";
import type { PantheonPeerConversation, PantheonPeerMessage } from "./pantheon-types.js";

export class PantheonPeerManager {
	private readonly globalDir: string;
	private readonly projectDir: string;
	private readonly registry: PantheonRegistry;

	constructor(projectCwd: string = process.cwd(), registry?: PantheonRegistry) {
		this.globalDir = path.join(homedir(), ".andy", "agent", "pantheon", "peer_chats");
		this.projectDir = path.join(projectCwd, ".andy", "pantheon", "peer_chats");
		this.registry = registry || new PantheonRegistry(projectCwd);
		this.ensureDirectories();
	}

	private ensureDirectories(): void {
		try {
			if (!existsSync(this.globalDir)) mkdirSync(this.globalDir, { recursive: true });
			if (!existsSync(this.projectDir)) mkdirSync(this.projectDir, { recursive: true });
		} catch {}
	}

	public getPairKey(agentA: string, agentB: string): string {
		const sorted = [agentA.toLowerCase(), agentB.toLowerCase()].sort();
		return `${sorted[0]}_${sorted[1]}`;
	}

	private getConversationPath(pairKey: string): string {
		const projectFile = path.join(this.projectDir, `${pairKey}.json`);
		if (existsSync(projectFile)) return projectFile;
		const globalFile = path.join(this.globalDir, `${pairKey}.json`);
		if (existsSync(globalFile)) return globalFile;
		return projectFile;
	}

	public getConversation(fromAgentId: string, toAgentId: string): PantheonPeerConversation {
		const pairKey = this.getPairKey(fromAgentId, toAgentId);
		const filePath = this.getConversationPath(pairKey);

		if (existsSync(filePath)) {
			try {
				const content = readFileSync(filePath, "utf-8");
				return JSON.parse(content);
			} catch {}
		}

		return {
			pairKey,
			agentA: fromAgentId.toLowerCase(),
			agentB: toAgentId.toLowerCase(),
			messages: [],
			updatedAt: new Date().toISOString(),
		};
	}

	public saveConversation(conv: PantheonPeerConversation): void {
		this.ensureDirectories();
		const filePath = path.join(this.projectDir, `${conv.pairKey}.json`);
		conv.updatedAt = new Date().toISOString();
		try {
			writeFileSync(filePath, JSON.stringify(conv, null, 2), "utf-8");
		} catch {}
	}

	public async sendPeerMessage(
		fromAgentId: string,
		toAgentId: string,
		content: string,
		options: {
			llmCaller?: (
				messages: Array<{ role: string; content: string }>,
				model?: string,
				temperature?: number,
				systemPrompt?: string,
			) => Promise<string | AsyncIterable<string>>;
			autoReply?: boolean;
		} = {},
	): Promise<PantheonPeerMessage> {
		const fromAgent = this.registry.getAgent(fromAgentId);
		const toAgent = this.registry.getAgent(toAgentId);

		const messageId = `peer-msg-${randomUUID().slice(0, 8)}`;
		const now = new Date().toISOString();

		const peerMsg: PantheonPeerMessage = {
			id: messageId,
			fromAgentId: fromAgent ? fromAgent.id : fromAgentId,
			toAgentId: toAgent ? toAgent.id : toAgentId,
			content,
			timestamp: now,
			status: "pending",
		};

		const conv = this.getConversation(fromAgentId, toAgentId);
		conv.messages.push(peerMsg);
		this.saveConversation(conv);

		if (options.autoReply !== false && options.llmCaller && toAgent) {
			try {
				const systemPrompt = `${toAgent.systemPrompt}

# CONSULTA PEER DIRECTA (BOT-TO-BOT)
Has recibido un mensaje directo de tu colega especialista @${fromAgent ? fromAgent.name : fromAgentId} (${fromAgent ? fromAgent.role : "Agent"}).
Responde de forma técnica, concisa y profesional directamente para tu compañero de escuadrón.`;

				const historyContext = conv.messages.slice(-8).map((m) => ({
					role: m.fromAgentId === toAgent.id ? "assistant" : "user",
					content: `[@${m.fromAgentId}]: ${m.content}${m.response ? `\n[@${m.toAgentId}]: ${m.response}` : ""}`,
				}));

				const response = await options.llmCaller(historyContext, toAgent.model, toAgent.temperature, systemPrompt);

				let replyText = "";
				if (typeof response === "string") {
					replyText = response;
				} else if (response && Symbol.asyncIterator in response) {
					for await (const chunk of response) {
						replyText += chunk;
					}
				}

				peerMsg.response = replyText.trim();
				peerMsg.status = "replied";
				this.saveConversation(conv);
			} catch (err: any) {
				peerMsg.status = "failed";
				peerMsg.response = `[Error al contactar a @${toAgent.name}: ${err.message || String(err)}]`;
				this.saveConversation(conv);
			}
		} else {
			peerMsg.status = "delivered";
			this.saveConversation(conv);
		}

		return peerMsg;
	}

	public listAllConversations(): Array<{ pairKey: string; lastMessage?: PantheonPeerMessage; count: number }> {
		const results: Array<{ pairKey: string; lastMessage?: PantheonPeerMessage; count: number }> = [];
		const dirs = [this.projectDir, this.globalDir];
		const seenKeys = new Set<string>();

		for (const dir of dirs) {
			if (!existsSync(dir)) continue;
			try {
				const files = readdirSync(dir) as string[];
				for (const file of files) {
					if (file.endsWith(".json")) {
						const pairKey = file.replace(/\.json$/, "");
						if (seenKeys.has(pairKey)) continue;
						seenKeys.add(pairKey);

						try {
							const fileContent = readFileSync(path.join(dir, file), "utf-8");
							const conv: PantheonPeerConversation = JSON.parse(fileContent);
							results.push({
								pairKey,
								lastMessage: conv.messages[conv.messages.length - 1],
								count: conv.messages.length,
							});
						} catch {}
					}
				}
			} catch {}
		}

		return results;
	}
}
