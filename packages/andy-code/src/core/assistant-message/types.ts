import type { McpToolUse, TextContent, ToolUse } from "../../shared/tools";

export type AssistantMessageContent = TextContent | ToolUse | McpToolUse;
