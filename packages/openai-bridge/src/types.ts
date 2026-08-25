export interface OpenAIChatMessage {
	role: "system" | "user" | "assistant" | "tool" | "developer";
	content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
	name?: string;
}

export interface OpenAIChatCompletionRequest {
	model?: string;
	messages: OpenAIChatMessage[];
	stream?: boolean;
	temperature?: number;
	max_tokens?: number;
	user?: string;
	[key: string]: unknown;
}

export interface OpenAIChatCompletionChoice {
	index: number;
	message: {
		role: "assistant";
		content: string;
	};
	finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | null;
}

export interface OpenAIChatCompletionResponse {
	id: string;
	object: "chat.completion";
	created: number;
	model: string;
	choices: OpenAIChatCompletionChoice[];
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export interface OpenAIChatCompletionChunk {
	id: string;
	object: "chat.completion.chunk";
	created: number;
	model: string;
	choices: Array<{
		index: number;
		delta: {
			role?: "assistant";
			content?: string;
		};
		finish_reason: "stop" | "length" | "tool_calls" | null;
	}>;
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export interface OpenAIModelItem {
	id: string;
	object: "model";
	created: number;
	owned_by: string;
	permission?: unknown[];
	root?: string;
	parent?: string | null;
}

export interface OpenAIModelListResponse {
	object: "list";
	data: OpenAIModelItem[];
}

export interface BridgeServerOptions {
	port?: number;
	host?: string;
	cwd?: string;
	defaultProvider?: string;
	defaultModel?: string;
	apiKey?: string;
	sessionTimeoutMs?: number;
	verbose?: boolean;
}
