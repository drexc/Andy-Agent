// Andy Agent VS Code Webview Script
const vscode = acquireVsCodeApi();

const container = document.getElementById("messages-container");
const input = document.getElementById("prompt-input");
const sendBtn = document.getElementById("send-btn");
const targetSelect = document.getElementById("target-select");
const syncBtn = document.getElementById("sync-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const settingsBtn = document.getElementById("settings-btn");

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

let history = [];
let isStreaming = false;
let currentAssistantMsgDiv = null;
let currentServerUrl = "https://ia.v2nethost.cl:3000";
let currentApiKey = "";

// Notify extension host that webview is loaded
vscode.postMessage({ type: "ready" });

// Chips
document.querySelectorAll(".chip").forEach((chip) => {
	chip.addEventListener("click", () => {
		input.value = chip.dataset.mention + " " + input.value;
		input.focus();
	});
});

// New chat
newChatBtn.addEventListener("click", () => {
	history = [];
	container.innerHTML =
		'<div class="msg assistant"><div class="agent-header">🤖 Andy Agent Prime</div>Nueva conversación iniciada. ¿En qué proyecto o refactorización trabajaremos hoy?</div>';
});

// Settings modal
settingsBtn.addEventListener("click", () => {
	settingsModal.style.display = "flex";
});

closeSettingsBtn.addEventListener("click", () => {
	settingsModal.style.display = "none";
});

saveSettingsBtn.addEventListener("click", () => {
	const sUrl = settingServerUrl.value.trim().replace(/\/+$/, "");
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

// Sincronización dinámica de escuadrones y agentes desde la WebUI
async function syncModelsAndAgents() {
	const sUrl = (settingServerUrl.value.trim() || currentServerUrl).replace(/\/+$/, "");
	const sKey = settingApiKey.value.trim() || currentApiKey;
	if (syncBtn) syncBtn.textContent = "⏳ Sincronizando...";

	try {
		const resp = await fetch(sUrl + "/v1/models", {
			headers: sKey ? { Authorization: "Bearer " + sKey } : {},
		});
		if (!resp.ok) throw new Error("HTTP " + resp.status + " " + resp.statusText);
		const data = await resp.json();
		const items = data.data || [];

		// Separar escuadrones, agentes y modelos
		const squadItems = items.filter((m) => m.id.startsWith("squad:"));
		const agentItems = items.filter((m) => m.id.startsWith("agent:"));
		const modelItems = items.filter(
			(m) =>
				!m.id.startsWith("squad:") &&
				!m.id.startsWith("agent:") &&
				!items.some((s) => s.id === "squad:" + m.id),
		);

		const prevSelected = targetSelect.value;
		targetSelect.innerHTML = "";

		// 1. Escuadrones Autónomos (Pantheon)
		if (squadItems.length > 0) {
			const grp = document.createElement("optgroup");
			grp.label = "👥 Escuadrones Autónomos (WebUI)";
			for (const s of squadItems) {
				const opt = document.createElement("option");
				opt.value = s.id;
				opt.textContent = s.description || s.id.replace("squad:", "");
				grp.appendChild(opt);
			}
			targetSelect.appendChild(grp);
		}

		// 2. Agentes Individuales de la WebUI
		if (agentItems.length > 0) {
			const grp = document.createElement("optgroup");
			grp.label = "🤖 Agentes Creados en la WebUI";
			for (const a of agentItems) {
				const opt = document.createElement("option");
				opt.value = a.id;
				opt.textContent = a.description || a.id.replace("agent:", "");
				grp.appendChild(opt);
			}
			targetSelect.appendChild(grp);
		}

		// 3. Modelos de Lenguaje Directos
		if (modelItems.length > 0) {
			const grp = document.createElement("optgroup");
			grp.label = "⚡ Modelos de IA Directos";
			for (const m of modelItems.slice(0, 30)) {
				const opt = document.createElement("option");
				opt.value = m.id;
				opt.textContent = m.description || m.id;
				grp.appendChild(opt);
			}
			targetSelect.appendChild(grp);
		}

		// Si no hay modelos cargados, añadir fallback
		if (targetSelect.options.length === 0) {
			const opt = document.createElement("option");
			opt.value = "squad:dev-team-squad";
			opt.textContent = "👥 Software Dev Team";
			targetSelect.appendChild(opt);
		}

		// Restaurar selección previa si existe
		if (prevSelected && Array.from(targetSelect.options).some((o) => o.value === prevSelected)) {
			targetSelect.value = prevSelected;
		}

		if (syncBtn) syncBtn.textContent = "🔄 Sincronizar";
		statusDot.style.background = "#22c55e";
		statusDot.style.boxShadow = "0 0 6px #22c55e";
	} catch (err) {
		console.warn("No se pudieron sincronizar modelos de " + sUrl + ":", err);
		if (syncBtn) syncBtn.textContent = "⚠️ Reintentar";
	}
}

if (syncBtn) {
	syncBtn.addEventListener("click", () => {
		syncModelsAndAgents();
	});
}

async function testConnection() {
	const sUrl = (settingServerUrl.value.trim() || currentServerUrl).replace(/\/+$/, "");
	const sKey = settingApiKey.value.trim() || currentApiKey;
	connectionStatus.style.display = "block";
	connectionStatus.style.background = "rgba(99, 102, 241, 0.2)";
	connectionStatus.style.color = "#a5b4fc";
	connectionStatus.textContent = "Conectando con " + sUrl + "...";

	try {
		const resp = await fetch(sUrl + "/v1/models", {
			headers: sKey ? { Authorization: "Bearer " + sKey } : {},
		});
		if (resp.ok) {
			const data = await resp.json();
			const count = data.data ? data.data.length : 0;
			connectionStatus.style.background = "rgba(34, 197, 94, 0.2)";
			connectionStatus.style.color = "#4ade80";
			connectionStatus.textContent =
				"✓ ¡Conexión exitosa! Servidor Andy responde (" + count + " modelos y agentes sincronizados).";
			statusDot.style.background = "#22c55e";
			statusDot.style.boxShadow = "0 0 6px #22c55e";

			// Sincronizar agentes de inmediato
			await syncModelsAndAgents();
		} else {
			throw new Error("HTTP " + resp.status + " " + resp.statusText);
		}
	} catch (err) {
		connectionStatus.style.background = "rgba(239, 68, 68, 0.2)";
		connectionStatus.style.color = "#f87171";
		connectionStatus.textContent =
			"✗ No se pudo conectar a " + sUrl + " (" + err.message + "). Verifica que el servidor esté encendido.";
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
	formatted = formatted.replace(/```([a-zA-Z0-9_\-]*)\r?\n([\s\S]*?)```/g, (match, lang, code) => {
		return "<pre><code>" + code.trim() + "</code></pre>";
	});
	formatted = formatted.replace(/`([^`]+)`/g, "<code>$1</code>");
	formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
	formatted = formatted.replace(/^### (.*$)/gim, '<h4 style="margin:6px 0; color:#818cf8;">$1</h4>');
	formatted = formatted.replace(/^## (.*$)/gim, '<h3 style="margin:8px 0; color:#6366f1;">$1</h3>');
	formatted = formatted.replace(/\n/g, "<br>");
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
	currentAssistantMsgDiv.innerHTML =
		'<div class="agent-header">⚡ Andy Agent Procesando...</div><div class="content"></div>';
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
			pill.innerHTML =
				"✓ Guardado en tu disco: <strong>" + escapeHtml(msg.path) + "</strong> (" + (msg.bytes || 0) + " bytes)";
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
			usageDiv.textContent =
				"Tokens: Entrada " +
				(msg.usage.prompt_tokens || 0) +
				" · Salida " +
				(msg.usage.completion_tokens || 0) +
				" · Total " +
				(msg.usage.total_tokens || 0);
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
				contentBox.innerHTML += '<div style="color:#ef4444; margin-top:8px;">⚠️ Error: ' + escapeHtml(msg.error) + "</div>";
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
