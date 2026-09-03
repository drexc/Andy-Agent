import * as vscode from "vscode";
import { AndySidebarProvider } from "./andy-sidebar-provider.js";

export function activate(context: vscode.ExtensionContext) {
	console.log("Andy Agent extension is now active!");

	const provider = new AndySidebarProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(AndySidebarProvider.viewType, provider, {
			webviewOptions: { retainContextWhenHidden: true },
		}),
	);

	// Command: Open Sidebar
	context.subscriptions.push(
		vscode.commands.registerCommand("andyAgent.openSidebar", async () => {
			await vscode.commands.executeCommand("andy-agent-sidebar-view.focus");
		}),
	);

	// Command: New Chat
	context.subscriptions.push(
		vscode.commands.registerCommand("andyAgent.newChat", async () => {
			await vscode.commands.executeCommand("andy-agent-sidebar-view.focus");
			provider.sendWorkspaceContext();
		}),
	);

	// Command: Refactor selected code
	context.subscriptions.push(
		vscode.commands.registerCommand("andyAgent.refactorSelection", async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showWarningMessage("No hay ningún archivo activo abierto en el editor.");
				return;
			}
			const selection = editor.selection;
			const text = editor.document.getText(selection);
			if (!text) {
				vscode.window.showWarningMessage("Por favor, selecciona un bloque de código para refactorizar.");
				return;
			}
			await vscode.commands.executeCommand("andy-agent-sidebar-view.focus");
			vscode.window.showInformationMessage("Código seleccionado enviado a Andy Agent.");
		}),
	);

	// Status bar icon
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = "andyAgent.openSidebar";
	statusBarItem.text = "$(hubot) Andy Agent";
	statusBarItem.tooltip = "Abrir panel de Andy Agent AI";
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);
}

export function deactivate() {}
