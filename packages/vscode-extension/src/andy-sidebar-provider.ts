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

	private _getHtmlForWebview(_webview: vscode.Webview): string {
		return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Andy Agent</title>
  <style>
    :root {
      --bg: var(--vscode-sideBar-background, #18181b);
      --fg: var(--vscode-sideBar-foreground, #f4f4f5);
      --input-bg: var(--vscode-input-background, #27272a);
      --input-fg: var(--vscode-input-foreground, #ffffff);
      --input-border: var(--vscode-input-border, #3f3f46);
      --btn-bg: var(--vscode-button-background, #4f46e5);
      --btn-fg: var(--vscode-button-foreground, #ffffff);
      --btn-hover: var(--vscode-button-hoverBackground, #4338ca);
      --card-bg: var(--vscode-editor-background, #1f1f23);
      --badge-bg: #3730a3;
      --code-bg: #111113;
      --border: var(--vscode-widget-border, #333338);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--fg); height: 100vh; display: flex; flex-direction: column; overflow: hidden; font-size: 13px; }
    
    /* Header */
    .header { padding: 10px 14px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.15); }
    .brand { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13.5px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 6px #22c55e; }
    .actions { display: flex; gap: 6px; }
    .icon-btn { background: transparent; border: 1px solid var(--border); color: var(--fg); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; }
    .icon-btn:hover { background: var(--border); }

    /* Target Selector Bar */
    .target-bar { padding: 8px 14px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.08); }
    .target-select { flex: 1; background: var(--input-bg); color: var(--input-fg); border: 1px solid var(--input-border); padding: 5px 8px; border-radius: 4px; font-size: 12px; outline: none; }

    /* Messages List */
    .messages-container { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 14px; }
    .msg { display: flex; flex-direction: column; gap: 4px; max-width: 100%; word-break: break-word; line-height: 1.45; }
    .msg.user { align-self: flex-end; background: var(--btn-bg); color: var(--btn-fg); padding: 8px 12px; border-radius: 10px 10px 2px 10px; max-width: 90%; }
    .msg.assistant { align-self: flex-start; background: var(--card-bg); border: 1px solid var(--border); padding: 10px 12px; border-radius: 4px 10px 10px 10px; width: 100%; }
    .agent-header { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 12px; margin-bottom: 6px; color: #818cf8; }
    
    /* Code & File Cards */
    pre { background: var(--code-bg); padding: 8px 10px; border-radius: 4px; overflow-x: auto; margin: 8px 0; border: 1px solid rgba(255,255,255,0.08); font-size: 11.5px; font-family: monospace; }
    code { font-family: Consolas, monospace; }
    .file-pill { display: inline-flex; align-items: center; gap: 6px; background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; color: #4ade80; padding: 4px 8px; border-radius: 4px; font-size: 11px; margin: 4px 0; cursor: pointer; }
    .file-pill:hover { background: rgba(34, 197, 94, 0.25); }

    /* Token Stats */
    .token-stat { font-size: 10px; opacity: 0.7; margin-top: 4px; }

    /* Input Area */
    .input-area { padding: 10px 14px; border-top: 1px solid var(--border); background: var(--bg); display: flex; flex-direction: column; gap: 8px; }
    .textarea-box { width: 100%; min-height: 52px; max-height: 140px; background: var(--input-bg); color: var(--input-fg); border: 1px solid var(--input-border); border-radius: 6px; padding: 8px; font-size: 12.5px; resize: none; outline: none; }
    .textarea-box:focus { border-color: #6366f1; }
    .input-bottom { display: flex; justify-content: space-between; align-items: center; }
    .mention-chips { display: flex; gap: 4px; }
    .chip { background: rgba(255,255,255,0.06); border: 1px solid var(--border); padding: 2px 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer; color: #a5b4fc; }
    .chip:hover { background: rgba(99, 102, 241, 0.2); }
    .send-btn { background: var(--btn-bg); color: var(--btn-fg); border: none; padding: 6px 14px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 12px; }
    .send-btn:hover { background: var(--btn-hover); }

    /* Settings Modal */
    .settings-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(3px); z-index: 999; display: none; flex-direction: column; justify-content: center; padding: 14px; }
    .settings-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); max-height: 90vh; overflow-y: auto; }
    .settings-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
    .setting-group { display: flex; flex-direction: column; gap: 4px; }
    .setting-label { font-size: 11.5px; font-weight: 600; color: #a5b4fc; }
    .setting-input { background: var(--input-bg); color: var(--input-fg); border: 1px solid var(--input-border); border-radius: 4px; padding: 6px 8px; font-size: 12px; outline: none; width: 100%; }
    .setting-input:focus { border-color: #6366f1; }
    .setting-help { font-size: 10.5px; opacity: 0.7; line-height: 1.35; }
  </style>
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

  <script>
    const vscode = acquireVsCodeApi();
    const container = document.getElementById("messages-container");
    const input = document.getElementById("prompt-input");
    const sendBtn = document.getElementById("send-btn");
    const targetSelect = document.getElementById("target-select");
    const newChatBtn = document.getElementById("new-chat-btn");
    const settingsBtn = document.getElementById("settings-btn");

    let history = [];
    let isStreaming = false;
    let currentAssistantMsgDiv = null;

    vscode.postMessage({ type: "ready" });

    // Handle chips
    document.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => {
        input.value = chip.dataset.mention + " " + input.value;
        input.focus();
      });
    });

    newChatBtn.addEventListener("click", () => {
      history = [];
      container.innerHTML = \`
        <div class="msg assistant">
          <div class="agent-header">🤖 Andy Agent Prime</div>
          Nueva conversación iniciada. ¿En qué proyecto o refactorización trabajaremos hoy?
        </div>
      \`;
    });

    const settingsModal = document.getElementById("settings-modal");
    const closeSettingsBtn = document.getElementById("close-settings-btn");
    const saveSettingsBtn = document.getElementById("save-settings-btn");
    const testConnectionBtn = document.getElementById("test-connection-btn");
    const openVsCodeSettingsLink = document.getElementById("open-vscode-settings-link");
    const settingServerUrl = document.getElementById("setting-server-url");
    const settingApiKey = document.getElementById("setting-api-key");
    const settingAutoApply = document.getElementById("setting-auto-apply");
    const settingWorkspace = document.getElementById("setting-workspace");
    const connectionStatus = document.getElementById("connection-status");
    const statusDot = document.getElementById("status-dot");

    let currentServerUrl = "http://localhost:20208";
    let currentApiKey = "";

    settingsBtn.addEventListener("click", () => {
      settingsModal.style.display = "flex";
    });

    closeSettingsBtn.addEventListener("click", () => {
      settingsModal.style.display = "none";
    });

    saveSettingsBtn.addEventListener("click", () => {
      const sUrl = settingServerUrl.value.trim().replace(//+$/, "");
      const sKey = settingApiKey.value.trim();
      const sAuto = settingAutoApply.checked;
      currentServerUrl = sUrl;
      currentApiKey = sKey;
      vscode.postMessage({
        type: "save_settings",
        serverUrl: sUrl,
        apiKey: sKey,
        autoApply: sAuto,
      });
      settingsModal.style.display = "none";
      testConnection();
    });

    async function testConnection() {
      const sUrl = (settingServerUrl.value.trim() || currentServerUrl).replace(//+$/, "");
      const sKey = settingApiKey.value.trim() || currentApiKey;
      connectionStatus.style.display = "block";
      connectionStatus.style.background = "rgba(99, 102, 241, 0.2)";
      connectionStatus.style.color = "#a5b4fc";
      connectionStatus.textContent = "Conectando con " + sUrl + "...";

      try {
        const resp = await fetch(sUrl + "/v1/models", {
          headers: sKey ? { "Authorization": "Bearer " + sKey } : {}
        });
        if (resp.ok) {
          const data = await resp.json();
          const count = data.data ? data.data.length : 0;
          connectionStatus.style.background = "rgba(34, 197, 94, 0.2)";
          connectionStatus.style.color = "#4ade80";
          connectionStatus.textContent = "✓ ¡Conexión exitosa! Servidor Andy Agent responde (" + count + " modelos disponibles).";
          statusDot.style.background = "#22c55e";
          statusDot.style.boxShadow = "0 0 6px #22c55e";
        } else {
          throw new Error("HTTP " + resp.status + " " + resp.statusText);
        }
      } catch (err) {
        connectionStatus.style.background = "rgba(239, 68, 68, 0.2)";
        connectionStatus.style.color = "#f87171";
        connectionStatus.textContent = "✗ No se pudo conectar a " + sUrl + " (" + err.message + "). Verifica que el servidor esté encendido.";
        statusDot.style.background = "#ef4444";
        statusDot.style.boxShadow = "0 0 6px #ef4444";
      }
    }

    testConnectionBtn.addEventListener("click", testConnection);

    openVsCodeSettingsLink.addEventListener("click", (e) => {
      e.preventDefault();
      vscode.postMessage({ type: "open_vscode_settings" });
    });

    function escapeHtml(text) {
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function formatMarkdown(text) {
      let formatted = escapeHtml(text);
      // Code blocks
      formatted = formatted.replace(/\`\`\`([a-zA-Z0-9_-]*)\r?\n([\\s\\S]*?)\`\`\`/g, (match, lang, code) => {
        return \`<pre><code>\${code.trim()}</code></pre>\`;
      });
      // Inline code
      formatted = formatted.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
      // Bold
      formatted = formatted.replace(/\\*\\*([^\\*]+)\\*\\*/g, '<strong>$1</strong>');
      // Headers
      formatted = formatted.replace(/^### (.*$)/gim, '<h4 style="margin:6px 0; color:#818cf8;">$1</h4>');
      formatted = formatted.replace(/^## (.*$)/gim, '<h3 style="margin:8px 0; color:#6366f1;">$1</h3>');
      // Line breaks
      formatted = formatted.replace(/\\n/g, '<br>');
      return formatted;
    }

    function sendMessage() {
      const prompt = input.value.trim();
      if (!prompt || isStreaming) return;

      input.value = "";
      isStreaming = true;
      sendBtn.textContent = "Detener";

      // Append user message
      const userDiv = document.createElement("div");
      userDiv.className = "msg user";
      userDiv.textContent = prompt;
      container.appendChild(userDiv);

      // Create assistant container
      currentAssistantMsgDiv = document.createElement("div");
      currentAssistantMsgDiv.className = "msg assistant";
      currentAssistantMsgDiv.innerHTML = '<div class="agent-header">⚡ Andy Agent Procesando...</div><div class="content"></div>';
      container.appendChild(currentAssistantMsgDiv);
      container.scrollTop = container.scrollHeight;

      vscode.postMessage({
        type: "send_prompt",
        prompt,
        target: targetSelect.value,
        history,
      });

      history.push({ role: "user", content: prompt });
    }

    sendBtn.addEventListener("click", () => {
      if (isStreaming) {
        vscode.postMessage({ type: "abort" });
      } else {
        sendMessage();
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    window.addEventListener("message", (event) => {
      const msg = event.data;
      const contentBox = currentAssistantMsgDiv ? currentAssistantMsgDiv.querySelector(".content") : null;

      switch (msg.type) {
        case "init_context": {
          if (msg.serverUrl) {
            currentServerUrl = msg.serverUrl;
            settingServerUrl.value = msg.serverUrl;
          }
          if (msg.apiKey !== undefined) {
            currentApiKey = msg.apiKey;
            settingApiKey.value = msg.apiKey;
          }
          if (msg.autoApply !== undefined) {
            settingAutoApply.checked = msg.autoApply;
          }
          if (msg.workspacePath) {
            settingWorkspace.textContent = msg.workspacePath;
          }
          if (msg.defaultTarget) {
            targetSelect.value = msg.defaultTarget;
          }
          testConnection();
          break;
        }
        case "stream_start": {
          if (contentBox) contentBox.innerHTML = "";
          break;
        }
        case "stream_delta": {
          if (contentBox) {
            contentBox.dataset.raw = (contentBox.dataset.raw || "") + msg.content;
            contentBox.innerHTML = formatMarkdown(contentBox.dataset.raw);
            container.scrollTop = container.scrollHeight;
          }
          break;
        }
        case "file_written": {
          const pill = document.createElement("div");
          pill.className = "file-pill";
          pill.innerHTML = \`✓ Guardado en tu disco: <strong>\${msg.path}</strong> (\${msg.bytes || 0} bytes)\`;
          pill.addEventListener("click", () => {
            vscode.postMessage({ type: "open_file", path: msg.path });
          });
          currentAssistantMsgDiv.appendChild(pill);
          container.scrollTop = container.scrollHeight;
          break;
        }
        case "usage": {
          const usageDiv = document.createElement("div");
          usageDiv.className = "token-stat";
          usageDiv.textContent = \`Tokens: Entrada \${msg.usage.prompt_tokens || 0} · Salida \${msg.usage.completion_tokens || 0} · Total \${msg.usage.total_tokens || 0}\`;
          currentAssistantMsgDiv.appendChild(usageDiv);
          break;
        }
        case "stream_end": {
          isStreaming = false;
          sendBtn.textContent = "Enviar";
          if (contentBox) {
            const raw = contentBox.dataset.raw || msg.fullText || "";
            history.push({ role: "assistant", content: raw });
          }
          break;
        }
        case "stream_error": {
          isStreaming = false;
          sendBtn.textContent = "Enviar";
          if (contentBox) {
            contentBox.innerHTML += \`<div style="color:#ef4444; margin-top:8px;">⚠️ Error: \${msg.error}</div>\`;
          }
          break;
        }
        case "stream_abort": {
          isStreaming = false;
          sendBtn.textContent = "Enviar";
          if (contentBox) {
            contentBox.innerHTML += '<div style="color:#eab308; margin-top:8px;">⏹️ Tarea detenida por el usuario.</div>';
          }
          break;
        }
      }
    });
  </script>
</body>
</html>`;
	}
}
