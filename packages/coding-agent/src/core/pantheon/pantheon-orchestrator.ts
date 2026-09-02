/**
 * Pantheon Orchestrator & Peer-to-Peer Multi-Agent Engine
 * Executes collaborative, sequential, and hierarchical workflows with Graft & RLM context.
 */

import { randomUUID } from "node:crypto";
import { GraftEngine } from "../graft/index.js";
import { PantheonRegistry } from "./pantheon-registry.js";
import type {
	PantheonAgentProfile,
	PantheonMessage,
	PantheonRoomState,
	PantheonSquad,
	PantheonTaskDelegation,
} from "./pantheon-types.js";

export interface PantheonExecutionEvent {
	type: "agent_start" | "delta" | "agent_finish" | "delegation" | "graft_event" | "error" | "done";
	agentId?: string;
	agentName?: string;
	agentAvatar?: string;
	agentColor?: string;
	agentRole?: string;
	delta?: string;
	message?: PantheonMessage;
	delegation?: PantheonTaskDelegation;
	graftData?: any;
	error?: string;
}

export type PantheonEventCallback = (event: PantheonExecutionEvent) => void | Promise<void>;

export class PantheonOrchestrator {
	private readonly registry: PantheonRegistry;
	private readonly graft: GraftEngine;
	private readonly cwd: string;
	private readonly roomStates: Map<string, PantheonRoomState> = new Map();

	constructor(cwd: string = process.cwd()) {
		this.cwd = cwd;
		this.registry = new PantheonRegistry(cwd);
		this.graft = new GraftEngine(cwd);
	}

	public getRegistry(): PantheonRegistry {
		return this.registry;
	}

	public getRoomState(squadId: string): PantheonRoomState {
		let state = this.roomStates.get(squadId);
		if (!state) {
			state = {
				squadId,
				messages: [],
				delegations: [],
			};
			this.roomStates.set(squadId, state);
		}
		return state;
	}

	/**
	 * Run a collaborative multi-agent turn
	 */
	public async executeTurn(
		squadId: string,
		userPrompt: string,
		onEvent: PantheonEventCallback,
		options: {
			targetAgentId?: string;
			llmCaller?: (messages: any[], model: string, temp: number) => Promise<AsyncIterable<string> | string>;
		} = {},
	): Promise<PantheonMessage[]> {
		const squad = this.registry.getSquad(squadId) || this.registry.getSquads()[0];
		const roomState = this.getRoomState(squad.id);

		// Record user message
		const userMsg: PantheonMessage = {
			id: randomUUID(),
			senderId: "user",
			senderName: "Usuario",
			senderRole: "Human Operator",
			senderAvatar: "👤",
			senderColor: "#64748B",
			content: userPrompt,
			type: "chat",
			timestamp: new Date().toISOString(),
		};
		roomState.messages.push(userMsg);

		// Parse @mentions in user prompt
		const mentionMatch = userPrompt.match(/@(\w+)/i);
		let targetAgentId = options.targetAgentId;
		if (!targetAgentId && mentionMatch) {
			const mentionedName = mentionMatch[1].toLowerCase();
			const found = this.registry
				.getAgents()
				.find((a) => a.id.toLowerCase() === mentionedName || a.name.toLowerCase() === mentionedName);
			if (found) targetAgentId = found.id;
		}

		// Default to squad leader if no specific agent targeted
		const activeAgentId = targetAgentId || squad.leaderId || "hermes";
		const primaryAgent = this.registry.getAgent(activeAgentId) || this.registry.getAgents()[0];

		// Collect Graft Structural Context
		let graftContextData: any;
		try {
			const graftMap = await this.graft.map();
			const diags = await this.graft.diagnostics();
			graftContextData = {
				mapSummary: graftMap.slice(0, 500),
				diagnosticsCount: diags.errorCount + diags.warningCount,
			};
			await onEvent({
				type: "graft_event",
				agentId: primaryAgent.id,
				graftData: graftContextData,
			});
		} catch {}

		// Build Context Prompt for the primary agent
		const systemPrompt = this.buildAgentSystemPrompt(primaryAgent, squad, graftContextData);

		// Format conversation history
		const historyContext = roomState.messages.slice(-8).map((m) => ({
			role: m.senderId === "user" ? "user" : "assistant",
			content: `[${m.senderName} (${m.senderRole})]: ${m.content}`,
		}));

		await onEvent({
			type: "agent_start",
			agentId: primaryAgent.id,
			agentName: primaryAgent.name,
			agentAvatar: primaryAgent.avatar,
			agentColor: primaryAgent.color,
			agentRole: primaryAgent.role,
		});

		let fullResponseText = "";

		if (options.llmCaller) {
			try {
				const responseStream = await options.llmCaller(
					[{ role: "system", content: systemPrompt }, ...historyContext],
					primaryAgent.model,
					primaryAgent.temperature,
				);

				if (typeof responseStream === "string") {
					fullResponseText = responseStream;
					await onEvent({ type: "delta", agentId: primaryAgent.id, delta: fullResponseText });
				} else {
					for await (const chunk of responseStream) {
						fullResponseText += chunk;
						await onEvent({ type: "delta", agentId: primaryAgent.id, delta: chunk });
					}
				}
			} catch (err: any) {
				fullResponseText = `Error al generar respuesta de ${primaryAgent.name}: ${err.message}`;
				await onEvent({ type: "error", agentId: primaryAgent.id, error: err.message });
			}
		} else {
			// Fallback simulated multi-agent synthesis
			fullResponseText = `[${primaryAgent.name}] He analizado la solicitud "${userPrompt}". El escuadrón ${squad.name} está listo para actuar con soporte de Graft y RLM.`;
			await onEvent({ type: "delta", agentId: primaryAgent.id, delta: fullResponseText });
		}

		const agentMsg: PantheonMessage = {
			id: randomUUID(),
			senderId: primaryAgent.id,
			senderName: primaryAgent.name,
			senderRole: primaryAgent.role,
			senderAvatar: primaryAgent.avatar,
			senderColor: primaryAgent.color,
			content: fullResponseText,
			type: "chat",
			timestamp: new Date().toISOString(),
			graftContext: graftContextData,
		};
		roomState.messages.push(agentMsg);

		await onEvent({
			type: "agent_finish",
			agentId: primaryAgent.id,
			message: agentMsg,
		});

		// Check if primary agent delegated to a peer agent (e.g. "@Hephaestus", "@Argos")
		const peerDelegations = this.detectPeerDelegations(fullResponseText, primaryAgent.id);
		for (const del of peerDelegations) {
			roomState.delegations.push(del);
			await onEvent({
				type: "delegation",
				agentId: del.fromAgentId,
				delegation: del,
			});
		}

		await onEvent({ type: "done" });
		return [userMsg, agentMsg];
	}

	private buildAgentSystemPrompt(agent: PantheonAgentProfile, squad: PantheonSquad, graftContext?: any): string {
		const members = this.registry
			.getAgents()
			.filter((a) => squad.memberIds.includes(a.id))
			.map((a) => `- **@${a.name}** (${a.role}): ${a.systemPrompt.slice(0, 100)}...`)
			.join("\n");

		return `${agent.systemPrompt}

Eres parte del escuadrón multi-agente "${squad.name}" (Modo: ${squad.workflowMode}).
Otros agentes en tu escuadrón:
${members}

Puedes delegar tareas mencionando a otro agente con @Nombre y describiendo la subtarea exacta que debe realizar.

${graftContext ? `\n[Graft Context]\n- Mapa del proyecto activo disponible.\n- Diagnósticos de código pendientes: ${graftContext.diagnosticsCount || 0}` : ""}`;
	}

	private detectPeerDelegations(text: string, fromAgentId: string): PantheonTaskDelegation[] {
		const delegations: PantheonTaskDelegation[] = [];
		const agents = this.registry.getAgents();

		for (const a of agents) {
			if (a.id === fromAgentId) continue;
			const regex = new RegExp(`@${a.name}\\b`, "i");
			if (regex.test(text)) {
				delegations.push({
					taskId: `task-${randomUUID().slice(0, 8)}`,
					fromAgentId,
					toAgentId: a.id,
					instruction: text.slice(0, 300),
					status: "pending",
					createdAt: new Date().toISOString(),
				});
			}
		}

		return delegations;
	}
}
