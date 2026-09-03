import type { ExtensionMessage } from "@roo-code/types";

/** Notifies the webview that Andy Gateway credentials are available for model discovery. */
export function postAndyGatewayCredentialsReady(postMessage: (message: ExtensionMessage) => void): void {
	postMessage({ type: "andyGatewayCredentialsReady" });
}
