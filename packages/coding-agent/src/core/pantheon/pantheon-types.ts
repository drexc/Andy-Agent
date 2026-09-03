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
	mcpServers?: string[];
	peerEnabled?: boolean;
	scratchpad?: string;
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

export type PantheonMessageType = "chat" | "delegation" | "review" | "handoff" | "system" | "peer";

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

export interface PantheonPeerMessage {
	id: string;
	fromAgentId: string;
	toAgentId: string;
	content: string;
	response?: string;
	timestamp: string;
	status: "pending" | "delivered" | "replied" | "failed";
}

export interface PantheonPeerConversation {
	pairKey: string; // e.g. "architect_developer"
	agentA: string;
	agentB: string;
	messages: PantheonPeerMessage[];
	updatedAt: string;
}

export interface PantheonCronOptions {
	continuity?: boolean; // carries scratchpad and state between runs
	monitorMode?: boolean; // skips LLM call if no workspace changes detected
	maxRuns?: number;
	timeoutMs?: number;
}

export interface PantheonCronJob {
	id: string;
	name: string;
	agentId: string;
	cronExpression: string;
	instruction: string;
	options: PantheonCronOptions;
	status: "active" | "paused" | "completed" | "error";
	scratchpad: string;
	lastRunTimestamp?: string;
	lastRunStatus?: "success" | "skipped_no_changes" | "error";
	lastRunOutput?: string;
	totalRuns: number;
	createdAt: string;
	updatedAt: string;
}

export interface PantheonCronExecution {
	jobId: string;
	runIndex: number;
	startedAt: string;
	completedAt?: string;
	status: "success" | "skipped_no_changes" | "error";
	output: string;
	scratchpad: string;
	tokensUsed?: number;
}

export interface PantheonSteerInstruction {
	taskId: string;
	instruction: string;
	steeredBy: string;
	timestamp: string;
}

export interface PantheonTaskControl {
	taskId: string;
	status: "running" | "paused" | "aborted" | "completed";
	abortController: AbortController;
	steerQueue: string[];
	tokensUsed: number;
	toolCallsCount: number;
	startedAt: number;
}

export interface PantheonTaskDelegation {
	taskId: string;
	fromAgentId: string;
	toAgentId: string;
	instruction: string;
	status: "pending" | "running" | "completed" | "failed" | "aborted";
	result?: string;
	graftTargetFiles?: string[];
	createdAt: string;
	completedAt?: string;
}

export interface PantheonRoomState {
	squadId: string;
	status?: "active" | "waiting_user_input" | "paused";
	activeAgentId?: string;
	lastAskingAgentId?: string;
	pendingUserQuestion?: any;
	messages: PantheonMessage[];
	delegations: PantheonTaskDelegation[];
}
