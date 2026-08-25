import type { OpenAIChatCompletionChunk, OpenAIChatCompletionResponse, OpenAIChatMessage } from "./types.js";

export function extractUserPrompt(messages: OpenAIChatMessage[]): {
	prompt: string;
	systemPrompt?: string;
} {
	if (!messages || messages.length === 0) {
		return { prompt: "" };
	}

	let systemPrompt = "";
	const systemMessages = messages.filter((m) => m.role === "system" || m.role === "developer");
	if (systemMessages.length > 0) {
		systemPrompt = systemMessages
			.map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
			.join("\n\n");
	}

	// Find the last user message
	const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
	let prompt = "";
	if (lastUserMessage) {
		if (typeof lastUserMessage.content === "string") {
			prompt = lastUserMessage.content;
		} else if (Array.isArray(lastUserMessage.content)) {
			prompt = lastUserMessage.content.map((part) => (part.type === "text" ? part.text || "" : "")).join(" ");
		}
	}

	// If there is preceding conversation context that the agent should know:
	// If multiple user/assistant turns were provided, we can synthesize context if needed
	const nonSystem = messages.filter((m) => m.role !== "system" && m.role !== "developer");
	if (nonSystem.length > 1) {
		// Include previous turns context if the agent session is fresh
		const history = nonSystem.slice(0, -1);
		const formattedHistory = history
			.map((m) => {
				const role = m.role === "user" ? "User" : "Assistant";
				const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
				return `[${role}]: ${text}`;
			})
			.join("\n\n");

		if (formattedHistory.length > 0) {
			prompt = `Previous conversation context:\n${formattedHistory}\n\nCurrent user request:\n${prompt}`;
		}
	}

	return { prompt, systemPrompt: systemPrompt || undefined };
}

export function createChunk(
	id: string,
	model: string,
	deltaContent: string,
	finishReason: "stop" | null = null,
): OpenAIChatCompletionChunk {
	return {
		id,
		object: "chat.completion.chunk",
		created: Math.floor(Date.now() / 1000),
		model,
		choices: [
			{
				index: 0,
				delta: deltaContent ? { content: deltaContent } : {},
				finish_reason: finishReason,
			},
		],
	};
}

export function formatSseChunk(chunk: OpenAIChatCompletionChunk): string {
	return `data: ${JSON.stringify(chunk)}\n\n`;
}

export function formatDone(): string {
	return "data: [DONE]\n\n";
}

export function createFullResponse(
	id: string,
	model: string,
	content: string,
	promptTokens = 0,
	completionTokens = 0,
): OpenAIChatCompletionResponse {
	return {
		id,
		object: "chat.completion",
		created: Math.floor(Date.now() / 1000),
		model,
		choices: [
			{
				index: 0,
				message: {
					role: "assistant",
					content,
				},
				finish_reason: "stop",
			},
		],
		usage: {
			prompt_tokens: promptTokens || Math.ceil(content.length / 4),
			completion_tokens: completionTokens || Math.ceil(content.length / 4),
			total_tokens: (promptTokens || 0) + (completionTokens || 0) || Math.ceil(content.length / 2),
		},
	};
}
