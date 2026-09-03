import * as vscode from "vscode";
import { LocalActionBridge } from "./local-action-bridge.js";

export class AndySidebarProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "andy-agent-sidebar-view";
	private _view?: vscode.WebviewView;
	private bridge: LocalActionBridge;
	private currentAbortController: AbortController | null = null;

	constructor(private readonly _extensionUri: vscode.Uri) {
		this.bridge = new LocalActionBridge();
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(async (data: any) => {
			switch (data.type) {
				case "ready": {
					this.sendWorkspaceContext();
					break;
				}
				case "send_prompt": {
					await this.handleUserPrompt(data.prompt, data.target, data.history);
					break;
				}
				case "abort": {
					if (this.currentAbortController) {
						this.currentAbortController.abort();
						this.currentAbortController = null;
					}
					break;
				}
				case "apply_file": {
					const res = await this.bridge.writeLocalFile(data.path, data.content);
					if (res.success) {
						vscode.window.showInformationMessage(`✓ Andy Agent actualizó: ${res.path} (${res.bytes} bytes)`);
						this.openFileInEditor(res.path);
					} else {
						vscode.window.showErrorMessage(`✗ Error al escribir archivo: ${res.error}`);
					}
					break;
				}
				case "open_file": {
					this.openFileInEditor(data.path);
					break;
				}
				case "run_terminal": {
					this.bridge.executeTerminalCommand(data.command);
					break;
				}
				case "save_settings": {
					const config = vscode.workspace.getConfiguration("andyAgent");
					if (data.serverUrl) {
						await config.update("serverUrl", data.serverUrl, vscode.ConfigurationTarget.Global);
					}
					if (data.apiKey !== undefined) {
						await config.update("apiKey", data.apiKey, vscode.ConfigurationTarget.Global);
					}
					if (data.autoApply !== undefined) {
						await config.update("autoApplyChanges", data.autoApply, vscode.ConfigurationTarget.Global);
					}
					vscode.window.showInformationMessage("✓ Configuración de Andy Agent guardada correctamente.");
					this.sendWorkspaceContext();
					break;
				}
				case "open_settings":
				case "open_vscode_settings": {
					vscode.commands.executeCommand("workbench.action.openSettings", "andyAgent");
					break;
				}
			}
		});
	}

	public sendWorkspaceContext() {
		const config = vscode.workspace.getConfiguration("andyAgent");
		const serverUrl = config.get<string>("serverUrl", "http://localhost:20208");
		const apiKey = config.get<string>("apiKey", "");
		const autoApply = config.get<boolean>("autoApplyChanges", true);
		const defaultTarget = config.get<string>("defaultTarget", "squad:dev-team-squad");
		const workspaceName = this.bridge.getWorkspaceName();
		const workspacePath = this.bridge.getWorkspacePath();

		this._view?.webview.postMessage({
			type: "init_context",
			serverUrl,
			apiKey,
			autoApply,
			defaultTarget,
			workspaceName,
			workspacePath,
		});
	}

	private async openFileInEditor(relPath: string) {
		const root = this.bridge.getWorkspaceRoot();
		if (!root) return;
		try {
			const cleanPath = relPath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
			const fileUri = vscode.Uri.joinPath(root, cleanPath);
			const doc = await vscode.workspace.openTextDocument(fileUri);
			await vscode.window.showTextDocument(doc, { preview: false });
		} catch (err: any) {
			vscode.window.showWarningMessage(`No se pudo abrir ${relPath}: ${err.message}`);
		}
	}

	private async handleUserPrompt(
		userPrompt: string,
		target: string,
		history: Array<{ role: string; content: string }>,
	) {
		const config = vscode.workspace.getConfiguration("andyAgent");
		const serverUrl = config.get<string>("serverUrl", "http://localhost:20208").replace(/\/+$/, "");
		const apiKey = config.get<string>("apiKey", "");
		const autoApply = config.get<boolean>("autoApplyChanges", true);

		this.currentAbortController = new AbortController();
		const signal = this.currentAbortController.signal;

		const messages = [...history, { role: "user", content: userPrompt }];

		const payload = {
			model: target,
			messages,
			stream: true,
		};

		try {
			this._view?.webview.postMessage({ type: "stream_start" });

			const response = await fetch(`${serverUrl}/v1/chat/completions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
				},
				body: JSON.stringify(payload),
				signal,
			});

			if (!response.ok) {
				const errText = await response.text();
				throw new Error(`Servidor Andy Agent respondió con error (${response.status}): ${errText}`);
			}

			if (!response.body) {
				throw new Error("No se recibió stream del servidor.");
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder("utf-8");
			let buffer = "";
			let fullAccumulatedText = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed.startsWith("data:")) continue;
					if (trimmed === "data: [DONE]") {
						continue;
					}

					try {
						const jsonStr = trimmed.slice(5).trim();
						if (!jsonStr) continue;
						const chunk = JSON.parse(jsonStr);

						// Handle streaming content delta
						const delta = chunk.choices?.[0]?.delta;
						if (delta?.content) {
							fullAccumulatedText += delta.content;
							this._view?.webview.postMessage({
								type: "stream_delta",
								content: delta.content,
							});
						}

						// Handle native OpenAI tool calls emitted by Developer / Andy
						if (delta?.tool_calls && Array.isArray(delta.tool_calls)) {
							for (const tc of delta.tool_calls) {
								if (tc.function?.name === "write_to_file" && tc.function.arguments) {
									try {
										const args = JSON.parse(tc.function.arguments);
										if (args.path && args.content) {
											if (autoApply) {
												const writeRes = await this.bridge.writeLocalFile(args.path, args.content);
												this._view?.webview.postMessage({
													type: "file_written",
													path: args.path,
													success: writeRes.success,
													bytes: writeRes.bytes,
												});
											}
										}
									} catch {}
								}
							}
						}

						// Handle usage token counts
						if (chunk.usage) {
							this._view?.webview.postMessage({
								type: "usage",
								usage: chunk.usage,
							});
						}
					} catch {}
				}
			}

			// Fallback: Check if response had XML tags <write_to_file>
			if (autoApply && fullAccumulatedText.includes("<write_to_file>")) {
				const xmlRegex =
					/<write_to_file>\s*<path>([\s\S]*?)<\/path>\s*<content>([\s\S]*?)<\/content>\s*<\/write_to_file>/gi;
				let xmlMatch = xmlRegex.exec(fullAccumulatedText);
				while (xmlMatch !== null) {
					const relPath = xmlMatch[1].trim();
					const content = xmlMatch[2];
					const writeRes = await this.bridge.writeLocalFile(relPath, content);
					this._view?.webview.postMessage({
						type: "file_written",
						path: relPath,
						success: writeRes.success,
						bytes: writeRes.bytes,
					});
					xmlMatch = xmlRegex.exec(fullAccumulatedText);
				}
			}

			this._view?.webview.postMessage({
				type: "stream_end",
				fullText: fullAccumulatedText,
			});
		} catch (err: any) {
			if (err.name === "AbortError") {
				this._view?.webview.postMessage({ type: "stream_abort" });
			} else {
				this._view?.webview.postMessage({
					type: "stream_error",
					error: err.message || String(err),
				});
			}
		} finally {
			this.currentAbortController = null;
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "dist", "media", "main.js"));
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "dist", "media", "style.css"));

		return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Andy Agent</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="status-dot" id="status-dot"></div>
      <span>Andy Agent</span>
    </div>
    <div class="actions">
      <button class="icon-btn" id="new-chat-btn" title="Nueva Conversación">➕ Nuevo</button>
      <button class="icon-btn" id="settings-btn" title="Configuración">⚙️</button>
    </div>
  </div>

  <!-- Settings Modal Panel -->
  <div class="settings-modal" id="settings-modal">
    <div class="settings-card">
      <div class="settings-header">
        <span style="font-weight:600; font-size:13px; display:flex; align-items:center; gap:6px;">⚙️ Configuración Andy Agent</span>
        <button class="icon-btn" id="close-settings-btn" title="Cerrar">✖</button>
      </div>
      
      <div class="setting-group">
        <label class="setting-label">URL del Servidor Andy Agent:</label>
        <input type="text" id="setting-server-url" class="setting-input" placeholder="http://localhost:20208 o http://IP:20208">
        <span class="setting-help">Si Andy Agent corre en otra máquina o servidor remoto, ingresa su dirección IP y puerto (ej: <code>http://192.168.1.50:20208</code>).</span>
      </div>

      <div class="setting-group">
        <label class="setting-label">API Key de Andy Agent:</label>
        <input type="password" id="setting-api-key" class="setting-input" placeholder="andy_sk_...">
        <span class="setting-help">Clave de autenticación para conectar a tu servidor.</span>
      </div>

      <div class="setting-group">
        <label class="setting-label">Espacio de Trabajo Local:</label>
        <div id="setting-workspace" style="font-size:11px; opacity:0.85; word-break:break-all; font-family:monospace; background:var(--code-bg); padding:6px; border-radius:4px; border:1px solid var(--border);">-</div>
      </div>

      <div class="setting-group" style="display:flex; flex-direction:row; align-items:center; gap:8px;">
        <input type="checkbox" id="setting-auto-apply" checked style="cursor:pointer;">
        <label for="setting-auto-apply" style="cursor:pointer; font-size:11.5px;">Guardar cambios en disco local automáticamente</label>
      </div>

      <div id="connection-status" style="display:none; font-size:11.5px; padding:6px 8px; border-radius:4px;"></div>

      <div style="display:flex; gap:8px; margin-top:6px;">
        <button class="send-btn" id="save-settings-btn" style="flex:1;">💾 Guardar Cambios</button>
        <button class="icon-btn" id="test-connection-btn" style="padding:6px 10px;">🔌 Probar Conexión</button>
      </div>

      <div style="margin-top:4px; text-align:center;">
        <a href="#" id="open-vscode-settings-link" style="color:#818cf8; font-size:11px; text-decoration:underline;">Abrir en configuración de VS Code</a>
      </div>
    </div>
  </div>

  <div class="target-bar">
    <label style="font-size:11px; opacity:0.8;">Modo:</label>
    <select class="target-select" id="target-select">
      <optgroup label="Escuadrones Autónomos (Pantheon)">
        <option value="squad:dev-team-squad" selected>👥 Software Dev Team (Architect, Dev, QA, DevOps)</option>
        <option value="squad:fullstack-squad">⚡ FullStack Squad (Hermes, Athena, Hephaestus)</option>
        <option value="squad:audit-fix-squad">🔍 Auditoría & Auto-Refactor</option>
      </optgroup>
      <optgroup label="Modelos Directos">
        <option value="auto/best-coding">🚀 Auto (Mejor Modelo de Código)</option>
        <option value="anthropic/claude-3-7-sonnet">Claude 3.7 Sonnet</option>
        <option value="deepseek/deepseek-chat">DeepSeek V3</option>
        <option value="qwen/qwen-2.5-coder-32b">Qwen 2.5 Coder 32B</option>
      </optgroup>
    </select>
  </div>

  <div class="messages-container" id="messages-container">
    <div class="msg assistant">
      <div class="agent-header">🤖 Andy Agent Prime</div>
      ¡Hola! Estoy conectado a tu espacio de trabajo local de VS Code. Puedes pedirme diseñar arquitectura, refactorizar o escribir código. Cualquier archivo generado se guardará directamente en tu disco.
    </div>
  </div>

  <div class="input-area">
    <textarea class="textarea-box" id="prompt-input" placeholder="Pregúntale a Andy o delega con @Architect, @Developer, @Debugger..."></textarea>
    <div class="input-bottom">
      <div class="mention-chips">
        <span class="chip" data-mention="@Architect">@Architect</span>
        <span class="chip" data-mention="@Developer">@Developer</span>
        <span class="chip" data-mention="@Debugger">@Debugger</span>
        <span class="chip" data-mention="@Tester">@Tester</span>
      </div>
      <button class="send-btn" id="send-btn">Enviar</button>
    </div>
  </div>

  <script src="${scriptUri}"></script>
</body>
</html>`;
	}
}
