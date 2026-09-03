import type { ExtensionContext } from "vscode"

export function getUserAgent(context?: ExtensionContext): string {
	return `Andy-Code ${context?.extension?.packageJSON?.version || "unknown"}`
}
