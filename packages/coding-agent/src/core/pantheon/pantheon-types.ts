/**
 * Pantheon Multi-Agent System - Types & Data Models
 * Inspired by Hermes Agent Pantheon architecture (society of persistent specialized agents).
 */

export interface PantheonAgentCapabilities {
	write: boolean;
	terminal: boolean;
	graft: boolean;
	rlm: boolean;
	web: boolean;
	mcp: boolean;
}

export interface PantheonAgentProfile {
	id: string;
	name: string;
	role: string;
	avatar: string;
	color: string;
	model: string;
	temperature: number;
	systemPrompt: string;
	capabilities: PantheonAgentCapabilities;
	isSystem?: boolean;
	status?: "idle" | "thinking" | "coding" | "delegating" | "error";
	totalTokensUsed?: number;
	createdAt?: string;
	updatedAt?: string;
}

export type PantheonWorkflowMode = "collaborative" | "sequential" | "hierarchical";

export interface PantheonSquad {
	id: string;
	name: string;
	description: string;
	leaderId: string;
	memberIds: string[];
	workflowMode: PantheonWorkflowMode;
	isSystem?: boolean;
	createdAt?: string;
}

export type PantheonMessageType = "chat" | "delegation" | "review" | "handoff" | "system";

export interface PantheonMessage {
	id: string;
	senderId: string;
	senderName: string;
	senderRole: string;
	senderAvatar: string;
	senderColor: string;
	recipientId?: string; // empty means broadcast to room
	recipientName?: string;
	content: string;
	type: PantheonMessageType;
	timestamp: string;
	graftContext?: {
		files?: string[];
		blastRadius?: string[];
		diagnosticsCount?: number;
	};
	rlmDepth?: number;
	executionStatus?: "running" | "completed" | "failed";
}

export interface PantheonTaskDelegation {
	taskId: string;
	fromAgentId: string;
	toAgentId: string;
	instruction: string;
	status: "pending" | "running" | "completed" | "failed";
	result?: string;
	graftTargetFiles?: string[];
	createdAt: string;
	completedAt?: string;
}

export interface PantheonRoomState {
	squadId: string;
	activeAgentId?: string;
	messages: PantheonMessage[];
	delegations: PantheonTaskDelegation[];
}
