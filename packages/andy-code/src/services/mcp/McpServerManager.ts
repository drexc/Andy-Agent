import type * as vscode from "vscode";
import type { ClineProvider } from "../../core/webview/ClineProvider";
import { McpHub } from "./McpHub";
import { SecretStorageService } from "./SecretStorageService";

/**
 * Singleton manager for MCP server instances.
 * Ensures only one set of MCP servers runs across all webviews.
 */
export class McpServerManager {
	private static instance: McpHub | null = null;
	private static readonly GLOBAL_STATE_KEY = "mcpHubInstanceId";
	private static providers: Set<ClineProvider> = new Set();
	private static initializationPromise: Promise<McpHub> | null = null;

	/**
	 * Get the singleton McpHub instance.
	 * Creates a new instance if one doesn't exist.
	 * Thread-safe implementation using a promise-based lock.
	 */
	static async getInstance(context: vscode.ExtensionContext, provider: ClineProvider): Promise<McpHub> {
		// Register the provider
		McpServerManager.providers.add(provider);

		// If we already have an instance, return it
		if (McpServerManager.instance) {
			return McpServerManager.instance;
		}

		// If initialization is in progress, wait for it
		if (McpServerManager.initializationPromise) {
			return McpServerManager.initializationPromise;
		}

		// Create a new initialization promise
		McpServerManager.initializationPromise = (async () => {
			try {
				// Double-check instance in case it was created while we were waiting
				if (!McpServerManager.instance) {
					const secretStorage = new SecretStorageService(context);
					const hub = new McpHub(provider, secretStorage);
					// Wait for all MCP servers to finish connecting (or timing out)
					await hub.waitUntilReady();
					McpServerManager.instance = hub;
					// Store a unique identifier in global state to track the primary instance
					await context.globalState.update(McpServerManager.GLOBAL_STATE_KEY, Date.now().toString());
				}
				return McpServerManager.instance;
			} finally {
				// Clear the initialization promise after completion or error
				McpServerManager.initializationPromise = null;
			}
		})();

		return McpServerManager.initializationPromise;
	}

	/**
	 * Remove a provider from the tracked set.
	 * This is called when a webview is disposed.
	 */
	static unregisterProvider(provider: ClineProvider): void {
		McpServerManager.providers.delete(provider);
	}

	/**
	 * Notify all registered providers of server state changes.
	 */
	static notifyProviders(message: any): void {
		McpServerManager.providers.forEach((provider) => {
			provider.postMessageToWebview(message).catch((error) => {
				console.error("Failed to notify provider:", error);
			});
		});
	}

	/**
	 * Clean up the singleton instance and all its resources.
	 */
	static async cleanup(context: vscode.ExtensionContext): Promise<void> {
		if (McpServerManager.instance) {
			await McpServerManager.instance.dispose();
			McpServerManager.instance = null;
			await context.globalState.update(McpServerManager.GLOBAL_STATE_KEY, undefined);
		}
		McpServerManager.providers.clear();
	}
}
