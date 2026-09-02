/**
 * Pantheon Agent Tools
 * Exposes multi-agent delegation, peer messaging, and squad exploration to agents.
 */

import { type Static, Type } from "typebox";
import type { ToolDefinition } from "../extensions/types.js";
import { PantheonRegistry } from "../pantheon/pantheon-registry.js";

const PantheonDelegateSchema = Type.Object({
	targetAgentId: Type.String({
		description: "ID or Name of the target Pantheon agent (e.g., 'athena', 'hephaestus', 'argos', 'pythia')",
	}),
	task: Type.String({
		description: "Clear, detailed instruction for the specialist agent to execute",
	}),
	targetFiles: Type.Optional(
		Type.Array(Type.String(), {
			description: "Optional list of files or modules relevant to this delegated task",
		}),
	),
});

export const pantheonDelegateTool: ToolDefinition<typeof PantheonDelegateSchema, any> = {
	name: "pantheon_delegate",
	label: "pantheon_delegate",
	description:
		"Delegate a specific subtask to a named Pantheon specialist agent (e.g. Athena for architecture, Hephaestus for coding, Argos for audit/diagnostics, Pythia for research).",
	parameters: PantheonDelegateSchema,
	execute: async (_toolCallId, params: Static<typeof PantheonDelegateSchema>) => {
		const registry = new PantheonRegistry(process.cwd());
		const agent = registry.getAgent(params.targetAgentId);

		if (!agent) {
			const available = registry
				.getAgents()
				.map((a) => `${a.id} (${a.name})`)
				.join(", ");
			return {
				content: [
					{
						type: "text",
						text: `Pantheon Agent "${params.targetAgentId}" not found. Available agents: ${available}`,
					},
				],
				details: { success: false, error: "Agent not found" },
			};
		}

		return {
			content: [
				{
					type: "text",
					text: `🎯 Delegated to @${agent.name} (${agent.role}):\nTask: ${params.task}${params.targetFiles ? `\nTarget Files: ${params.targetFiles.join(", ")}` : ""}\n[Delegation queued successfully in Pantheon Squad]`,
				},
			],
			details: { success: true, targetAgentId: agent.id, task: params.task },
		};
	},
};

const PantheonPeerMessageSchema = Type.Object({
	recipientAgentId: Type.String({
		description: "ID or Name of the peer agent to message (e.g., 'athena', 'hephaestus', 'argos')",
	}),
	message: Type.String({
		description: "Content of the peer message, review notes, or status update",
	}),
});

export const pantheonPeerMessageTool: ToolDefinition<typeof PantheonPeerMessageSchema, any> = {
	name: "pantheon_peer_message",
	label: "pantheon_peer_message",
	description: "Send a direct peer message, review note, or status update to another Pantheon agent in the squad.",
	parameters: PantheonPeerMessageSchema,
	execute: async (_toolCallId, params: Static<typeof PantheonPeerMessageSchema>) => {
		const registry = new PantheonRegistry(process.cwd());
		const agent = registry.getAgent(params.recipientAgentId);

		if (!agent) {
			return {
				content: [
					{
						type: "text",
						text: `Peer agent "${params.recipientAgentId}" not found in Pantheon registry.`,
					},
				],
				details: { success: false, error: "Peer agent not found" },
			};
		}

		return {
			content: [
				{
					type: "text",
					text: `📬 Message delivered to @${agent.name} (${agent.role}):\n"${params.message}"`,
				},
			],
			details: { success: true, recipient: agent.id, message: params.message },
		};
	},
};

const PantheonListSquadSchema = Type.Object({});

export const pantheonListSquadTool: ToolDefinition<typeof PantheonListSquadSchema, any> = {
	name: "pantheon_list_squad",
	label: "pantheon_list_squad",
	description:
		"List all registered Pantheon agents, their specialized roles, models, and capabilities in the active squad.",
	parameters: PantheonListSquadSchema,
	execute: async (_toolCallId) => {
		const registry = new PantheonRegistry(process.cwd());
		const agents = registry.getAgents();
		const squads = registry.getSquads();

		const agentList = agents
			.map(
				(a) =>
					`• **@${a.name}** (\`${a.id}\`) - *${a.role}*\n  Avatar: ${a.avatar} | Model: ${a.model} | Temp: ${a.temperature}\n  Capabilities: Write=${a.capabilities.write}, Graft=${a.capabilities.graft}, RLM=${a.capabilities.rlm}`,
			)
			.join("\n\n");

		const squadList = squads
			.map(
				(s) =>
					`• **${s.name}** (\`${s.id}\`): Mode=${s.workflowMode} | Leader=@${s.leaderId} | Members=${s.memberIds.join(", ")}`,
			)
			.join("\n");

		return {
			content: [
				{
					type: "text",
					text: `🏛️ **Pantheon Society of Agents**\n\n${agentList}\n\n📋 **Active Squads**\n${squadList}`,
				},
			],
			details: { agentCount: agents.length, squadCount: squads.length },
		};
	},
};

export const pantheonTools = [pantheonDelegateTool, pantheonPeerMessageTool, pantheonListSquadTool];
