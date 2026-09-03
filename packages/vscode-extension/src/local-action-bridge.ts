import * as path from "node:path";
import * as vscode from "vscode";

export interface FileActionResult {
	success: boolean;
	path: string;
	error?: string;
	bytes?: number;
}

export class LocalActionBridge {
	private terminal: vscode.Terminal | null = null;

	public getWorkspaceRoot(): vscode.Uri | null {
		const folders = vscode.workspace.workspaceFolders;
		if (!folders || folders.length === 0) return null;
		return folders[0].uri;
	}

	public getWorkspacePath(): string {
		const root = this.getWorkspaceRoot();
		return root ? root.fsPath : "";
	}

	public getWorkspaceName(): string {
		const root = this.getWorkspaceRoot();
		return root ? path.basename(root.fsPath) : "Workspace";
	}

	public async writeLocalFile(relativePath: string, content: string): Promise<FileActionResult> {
		try {
			const root = this.getWorkspaceRoot();
			if (!root) {
				return {
					success: false,
					path: relativePath,
					error: "No hay ninguna carpeta de proyecto abierta en VS Code.",
				};
			}

			// Normalize path
			let cleanPath = relativePath.trim().replace(/^['"`]|['"`]$/g, "");
			cleanPath = cleanPath.replace(/^[/\\]+/, "").replace(/\\/g, "/");

			const fileUri = vscode.Uri.joinPath(root, cleanPath);
			const parentDir = vscode.Uri.joinPath(root, path.dirname(cleanPath));

			// Ensure parent directories exist
			try {
				await vscode.workspace.fs.createDirectory(parentDir);
			} catch {}

			const buffer = Buffer.from(content, "utf-8");
			await vscode.workspace.fs.writeFile(fileUri, buffer);

			return {
				success: true,
				path: cleanPath,
				bytes: buffer.byteLength,
			};
		} catch (err: any) {
			return {
				success: false,
				path: relativePath,
				error: err.message || String(err),
			};
		}
	}

	public async readLocalFile(relativePath: string): Promise<{ success: boolean; content?: string; error?: string }> {
		try {
			const root = this.getWorkspaceRoot();
			if (!root) return { success: false, error: "No hay espacio de trabajo abierto." };

			const cleanPath = relativePath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
			const fileUri = vscode.Uri.joinPath(root, cleanPath);
			const data = await vscode.workspace.fs.readFile(fileUri);
			return { success: true, content: Buffer.from(data).toString("utf-8") };
		} catch (err: any) {
			return { success: false, error: err.message || String(err) };
		}
	}

	public executeTerminalCommand(command: string): void {
		if (!this.terminal || this.terminal.exitStatus !== undefined) {
			this.terminal = vscode.window.createTerminal({
				name: "Andy Agent Terminal",
				cwd: this.getWorkspacePath() || undefined,
			});
		}
		this.terminal.show();
		this.terminal.sendText(command);
	}
}
