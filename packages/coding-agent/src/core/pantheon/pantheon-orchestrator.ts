import { exec } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GraftEngine } from "../graft/index.js";
import { PantheonRegistry } from "./pantheon-registry.js";
import type {
	PantheonAgentProfile,
	PantheonMessage,
	PantheonRoomState,
	PantheonSquad,
	PantheonTaskControl,
	PantheonTaskDelegation,
} from "./pantheon-types.js";

export interface PantheonProjectInfo {
	id?: string;
	name?: string;
	path?: string;
	description?: string;
}

export interface PantheonProjectContext {
	name: string;
	path: string;
	description?: string;
	fileList: string;
	memory?: string;
	agentsMd?: string;
	manifestSummary?: string;
	codeSnippetsSummary?: string;
}

export interface PantheonExecutionEvent {
	type:
		| "agent_start"
		| "delta"
		| "agent_finish"
		| "delegation"
		| "graft_event"
		| "tool_start"
		| "tool_result"
		| "file_change"
		| "error"
		| "done";
	agentId?: string;
	agentName?: string;
	agentAvatar?: string;
	agentColor?: string;
	agentRole?: string;
	delta?: string;
	text?: string;
	tool?: string;
	target?: string;
	exitCode?: number;
	input?: any;
	output?: any;
	message?: PantheonMessage;
	delegation?: PantheonTaskDelegation;
	graftData?: any;
	error?: string;
}

export type PantheonEventCallback = (event: PantheonExecutionEvent) => void | Promise<void>;

export class PantheonOrchestrator {
	private readonly registry: PantheonRegistry;
	private readonly graft: GraftEngine;
	private readonly cwd: string;
	private readonly roomStates: Map<string, PantheonRoomState> = new Map();
	private readonly activeTaskControls: Map<string, PantheonTaskControl> = new Map();

	constructor(cwd: string = process.cwd()) {
		this.cwd = path.resolve(cwd);
		this.registry = new PantheonRegistry(this.cwd);
		this.graft = new GraftEngine(this.cwd);
	}

	public getRegistry(): PantheonRegistry {
		return this.registry;
	}

	public steerTask(taskId: string, instruction: string, steeredBy: string = "user"): boolean {
		const ctrl = this.activeTaskControls.get(taskId);
		if (ctrl && ctrl.status === "running") {
			ctrl.steerQueue.push(`[Steered by @${steeredBy}]: ${instruction}`);
			return true;
		}
		return false;
	}

	public abortTask(taskId: string): boolean {
		const ctrl = this.activeTaskControls.get(taskId);
		if (ctrl && (ctrl.status === "running" || ctrl.status === "paused")) {
			ctrl.status = "aborted";
			ctrl.abortController.abort();
			return true;
		}
		return false;
	}

	public getActiveTaskControls(): PantheonTaskControl[] {
		return Array.from(this.activeTaskControls.values());
	}

	public isDangerousDestructiveCommand(cmd: string): boolean {
		const lower = cmd.toLowerCase().trim();
		const patterns = [
			/\b(rmdir|rd)\s+\/[sq]/i,
			/\bdel\s+\/[sqfa]/i,
			/\bformat\s+[a-z]:/i,
			/\brm\s+-(?:r[fF]|f[rR]|rf)\s+[/\\]/i,
			/\bmkfs\b/i,
			/\bdd\s+if=/i,
			/\bdrop\s+database\b/i,
			/\bremove-item\s+.*-recurse\s+.*-force\s+c:[\\/]/i,
		];
		return patterns.some((p) => p.test(lower));
	}

	public getRoomState(squadId: string): PantheonRoomState {
		let state = this.roomStates.get(squadId);
		if (!state) {
			state = {
				squadId,
				messages: [],
				delegations: [],
			};
			this.roomStates.set(squadId, state);
		}
		return state;
	}

	/**
	 * Run a collaborative multi-agent turn with real tool and file actions
	 */
	public async executeTurn(
		squadId: string,
		userPrompt: string,
		onEvent: PantheonEventCallback,
		options: {
			targetAgentId?: string;
			taskId?: string;
			abortController?: AbortController;
			projectInfo?: PantheonProjectInfo;
			llmCaller?: (
				messages: any[],
				model: string,
				temp: number,
				systemPrompt?: string,
			) => Promise<AsyncIterable<string> | string>;
		} = {},
	): Promise<PantheonMessage[]> {
		const squad = this.registry.getSquad(squadId) || this.registry.getSquads()[0];
		const roomState = this.getRoomState(squad.id);

		const taskId = options.taskId || `task-${randomUUID().slice(0, 8)}`;
		const abortController = options.abortController || new AbortController();
		const taskControl: PantheonTaskControl = {
			taskId,
			status: "running",
			abortController,
			steerQueue: [],
			tokensUsed: 0,
			toolCallsCount: 0,
			startedAt: Date.now(),
		};
		this.activeTaskControls.set(taskId, taskControl);

		// Record user message
		const userMsg: PantheonMessage = {
			id: randomUUID(),
			senderId: "user",
			senderName: "Usuario",
			senderRole: "Human Operator",
			senderAvatar: "👤",
			senderColor: "#64748B",
			content: userPrompt,
			type: "chat",
			timestamp: new Date().toISOString(),
		};
		roomState.messages.push(userMsg);

		// Parse @mentions in user prompt
		const mentionMatch = userPrompt.match(/@([a-zA-Z0-9_-]+)/i);
		let targetAgentId = options.targetAgentId;
		if (!targetAgentId && mentionMatch) {
			const mentionedName = mentionMatch[1].toLowerCase();
			let found = this.registry
				.getAgents()
				.find((a) => a.id.toLowerCase() === mentionedName || a.name.toLowerCase() === mentionedName);

			// Map common role aliases if not matched by exact name
			if (!found) {
				if (/developer|coder|programador|dev|backend|frontend/i.test(mentionedName)) {
					found = this.registry.getAgent("hephaestus");
				} else if (/architect|arquitecto|designer/i.test(mentionedName)) {
					found = this.registry.getAgent("athena");
				} else if (/tester|auditor|qa|refactorer|devops|quality/i.test(mentionedName)) {
					found = this.registry.getAgent("argos");
				} else if (/researcher|investigador|search/i.test(mentionedName)) {
					found = this.registry.getAgent("pythia");
				} else if (/leader|lider|orchestrator/i.test(mentionedName)) {
					found = this.registry.getAgent("hermes");
				}
			}
			if (found) targetAgentId = found.id;
		}

		// Determine starting agent
		const activeAgentId = targetAgentId || squad.leaderId || "hermes";
		const primaryAgent = this.registry.getAgent(activeAgentId) || this.registry.getAgents()[0];

		// Detect if userPrompt mentions an explicit project path on disk
		let effectiveProjectInfo = options.projectInfo;
		const winPathRegex = /([A-Za-z]:\\[^"'\r\n<>`]+)/g;
		let pathMatch = winPathRegex.exec(userPrompt);
		while (pathMatch) {
			const cand = pathMatch[1]
				.trim()
				.replace(/[.,;:)>\]]+$/, "")
				.trim();
			if (cand.length > 5 && existsSync(cand)) {
				const resolved = path.resolve(cand);
				effectiveProjectInfo = {
					id: effectiveProjectInfo?.id || "custom-path",
					name: path.basename(resolved),
					path: resolved,
					description: effectiveProjectInfo?.description,
				};
				break;
			}
			pathMatch = winPathRegex.exec(userPrompt);
		}

		// Load Project Context (MEMORY.md, AGENTS.md, Files, CWD)
		const projectContext = await this.loadProjectContext(effectiveProjectInfo);

		// Collect Graft Structural Context
		let graftContextData: any;
		try {
			const graftEngine =
				projectContext.path && projectContext.path !== this.cwd ? new GraftEngine(projectContext.path) : this.graft;
			const graftMap = await graftEngine.map();
			const diags = await graftEngine.diagnostics();
			graftContextData = {
				map: graftMap.slice(0, 3000),
				mapSummary: graftMap.slice(0, 500),
				diagnosticsCount: diags.errorCount + diags.warningCount,
			};
			await onEvent({
				type: "graft_event",
				agentId: primaryAgent.id,
				graftData: graftContextData,
			});
		} catch {}

		const allTurnMessages: PantheonMessage[] = [userMsg];
		const agentsQueue: PantheonAgentProfile[] = [primaryAgent];
		const executionCounts: Record<string, number> = {};
		const maxTotalSteps = 5;
		let currentStep = 0;

		const isExplicitDirectTarget = Boolean(targetAgentId);

		while (agentsQueue.length > 0 && currentStep < maxTotalSteps) {
			if (taskControl.status === "aborted" || abortController.signal.aborted) {
				await onEvent({ type: "error", error: "Tarea cancelada por el usuario (Live Steering: Aborted)." });
				break;
			}

			const currentAgent = agentsQueue.shift()!;
			executionCounts[currentAgent.id] = (executionCounts[currentAgent.id] || 0) + 1;
			currentStep++;

			// If steering directives were queued, inject them into conversation history
			if (taskControl.steerQueue.length > 0) {
				const steeredDirectives = taskControl.steerQueue.splice(0, taskControl.steerQueue.length);
				for (const sDir of steeredDirectives) {
					roomState.messages.push({
						id: randomUUID(),
						senderId: "system",
						senderName: "Steering Controller",
						senderRole: "Live Steering",
						senderAvatar: "🎛️",
						senderColor: "#06B6D4",
						content: sDir,
						type: "system",
						timestamp: new Date().toISOString(),
					});
				}
			}

			// Build Context Prompt for the current agent
			const systemPrompt = this.buildAgentSystemPrompt(
				currentAgent,
				squad,
				graftContextData,
				projectContext,
				currentStep > 1,
			);

			// Format conversation history
			const historyContext = roomState.messages.slice(-10).map((m) => ({
				role: m.senderId === "user" || m.senderId === "system" ? "user" : "assistant",
				content: `[${m.senderName} (${m.senderRole})]: ${m.content}`,
			}));

			await onEvent({
				type: "agent_start",
				agentId: currentAgent.id,
				agentName: currentAgent.name,
				agentAvatar: currentAgent.avatar,
				agentColor: currentAgent.color,
				agentRole: currentAgent.role,
			});

			let fullResponseText = "";

			if (options.llmCaller) {
				try {
					const responseStream = await options.llmCaller(
						historyContext,
						currentAgent.model,
						currentAgent.temperature,
						systemPrompt,
					);

					if (typeof responseStream === "string") {
						fullResponseText = responseStream;
						await onEvent({ type: "delta", agentId: currentAgent.id, delta: fullResponseText });
					} else if (responseStream && Symbol.asyncIterator in responseStream) {
						for await (const chunk of responseStream) {
							fullResponseText += chunk;
							await onEvent({ type: "delta", agentId: currentAgent.id, delta: chunk });
						}
					}
				} catch (err: any) {
					fullResponseText = `Error al generar respuesta de ${currentAgent.name}: ${err.message || String(err)}`;
					await onEvent({ type: "error", agentId: currentAgent.id, error: err.message || String(err) });
				}
			} else {
				// Fallback simulated multi-agent synthesis
				fullResponseText = `[${currentAgent.name}] He analizado la solicitud "${userPrompt}". El escuadrón ${squad.name} está listo para actuar sobre el proyecto activo "${projectContext.name}".`;
				await onEvent({ type: "delta", agentId: currentAgent.id, delta: fullResponseText });
			}

			// Execute Real Actions (File writes / edits and terminal test commands)
			const actionResultsText = await this.executeAgentActions(
				currentAgent,
				fullResponseText,
				projectContext.path,
				onEvent,
			);

			const cleanedResponse = this.sanitizeAgentOutput(fullResponseText);
			let effectiveResponseText =
				cleanedResponse.trim() ||
				(fullResponseText.includes("tool_call") || fullResponseText.includes("[read(")
					? `[${currentAgent.name}] He procesado la tarea asignada sobre el proyecto activo.`
					: fullResponseText);

			if (actionResultsText) {
				effectiveResponseText += actionResultsText;
			}

			const agentMsg: PantheonMessage = {
				id: randomUUID(),
				senderId: currentAgent.id,
				senderName: currentAgent.name,
				senderRole: currentAgent.role,
				senderAvatar: currentAgent.avatar,
				senderColor: currentAgent.color,
				content: effectiveResponseText,
				type: "chat",
				timestamp: new Date().toISOString(),
				graftContext: graftContextData,
			};
			roomState.messages.push(agentMsg);
			allTurnMessages.push(agentMsg);

			await onEvent({
				type: "agent_finish",
				agentId: currentAgent.id,
				message: agentMsg,
			});

			// If user specifically targeted this one agent, we finish without delegating
			if (isExplicitDirectTarget) {
				break;
			}

			// Check if current agent explicitly delegated to peer agents in the same squad
			const peerDelegations = this.detectPeerDelegations(fullResponseText, currentAgent.id, squad);
			for (const del of peerDelegations) {
				roomState.delegations.push(del);
				await onEvent({
					type: "delegation",
					agentId: del.fromAgentId,
					delegation: del,
				});

				const nextAgent = this.registry.getAgent(del.toAgentId);
				if (nextAgent) {
					const count = executionCounts[nextAgent.id] || 0;
					const alreadyInQueue = agentsQueue.some((a) => a.id === nextAgent.id);
					if (count < 2 && !alreadyInQueue) {
						agentsQueue.push(nextAgent);
					}
				}
			}

			// Purposeful Next-Step Routing (No Blind 5-Agent Tip Loops)
			if (peerDelegations.length === 0 && agentsQueue.length === 0) {
				// 1. If leader/architect just completed the planning step:
				if (currentAgent.id === "hermes" || currentAgent.id === "architect" || currentAgent.id === "athena") {
					const lowerPrompt = userPrompt.toLowerCase();
					const isCodingTask =
						/crea|haz|programa|corrige|modifica|escribe|agrega|refactoriza|implementa|build|code|fix|function|clase|archivo/i.test(
							lowerPrompt,
						);
					const isResearchTask = /investiga|explora|busca|analiza|documenta/i.test(lowerPrompt);

					const coderId = squad.memberIds.find((id) => id === "developer" || id === "hephaestus");
					const researcherId = squad.memberIds.find((id) => id === "pythia" || id === "researcher");

					if (isCodingTask && coderId && !(executionCounts[coderId] > 0)) {
						const coder = this.registry.getAgent(coderId);
						if (coder) {
							agentsQueue.push(coder);
							await this.emitAutoDelegation(
								currentAgent.id,
								coder.id,
								"Implementación de código",
								roomState,
								onEvent,
							);
						}
					} else if (isResearchTask && researcherId && !(executionCounts[researcherId] > 0)) {
						const researcher = this.registry.getAgent(researcherId);
						if (researcher) {
							agentsQueue.push(researcher);
							await this.emitAutoDelegation(
								currentAgent.id,
								researcher.id,
								"Investigación profunda de código",
								roomState,
								onEvent,
							);
						}
					}
				}
				// 2. If Coder (Developer / Hephaestus) just modified or created files, automatically delegate to Tester/Auditor:
				else if (currentAgent.id === "developer" || currentAgent.id === "hephaestus") {
					const testerId = squad.memberIds.find((id) => id === "tester" || id === "argos");
					if (testerId && !(executionCounts[testerId] > 0)) {
						const tester = this.registry.getAgent(testerId);
						if (tester) {
							agentsQueue.push(tester);
							await this.emitAutoDelegation(
								currentAgent.id,
								tester.id,
								"Auditoría de calidad y ejecución de tests",
								roomState,
								onEvent,
							);
						}
					}
				}
				// 3. If Tester (or Auditor) just finished testing, automatically delegate to DevOps to sync/push Git:
				else if (currentAgent.id === "tester" || currentAgent.id === "argos") {
					const devopsId = squad.memberIds.find((id) => id === "devops");
					if (devopsId && !(executionCounts[devopsId] > 0)) {
						const devops = this.registry.getAgent(devopsId);
						if (devops) {
							agentsQueue.push(devops);
							await this.emitAutoDelegation(
								currentAgent.id,
								devops.id,
								"Sincronización Git y publicación de cambios",
								roomState,
								onEvent,
							);
						}
					}
				}
			}
		}

		await onEvent({ type: "done" });
		return allTurnMessages;
	}

	private async emitAutoDelegation(
		fromAgentId: string,
		toAgentId: string,
		instruction: string,
		roomState: PantheonRoomState,
		onEvent: PantheonEventCallback,
	): Promise<void> {
		const autoDel: PantheonTaskDelegation = {
			taskId: `task-${randomUUID().slice(0, 8)}`,
			fromAgentId,
			toAgentId,
			instruction,
			status: "pending",
			createdAt: new Date().toISOString(),
		};
		roomState.delegations.push(autoDel);
		await onEvent({
			type: "delegation",
			agentId: fromAgentId,
			delegation: autoDel,
		});
	}

	private async executeCommandLine(
		cmd: string,
		cwd: string,
	): Promise<{ stdout: string; stderr: string; exitCode: number }> {
		return new Promise((resolve) => {
			exec(cmd, { cwd, timeout: 45000, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
				resolve({
					stdout: (stdout || "").toString(),
					stderr: (stderr || "").toString(),
					exitCode: error ? (error.code ?? 1) : 0,
				});
			});
		});
	}

	private isPathSafe(resolvedPath: string, rootDir: string): boolean {
		const resolvedRoot = path.resolve(rootDir).toLowerCase();
		const target = path.resolve(resolvedPath).toLowerCase();
		const rel = path.relative(resolvedRoot, target);
		return !rel.startsWith("..") && !path.isAbsolute(rel);
	}

	private extractFilesFromAgentText(text: string): Array<{ path: string; content: string; pattern: string }> {
		const files: Array<{ path: string; content: string; pattern: string }> = [];
		const handledPaths = new Set<string>();
		const handledBodies = new Set<string>();

		const register = (p: string, c: string, pat: string) => {
			let cleanPath = p
				.trim()
				.replace(/^['"`]|['"`]$/g, "")
				.trim();
			cleanPath = cleanPath.replace(/^[*_`]+|[*_`]+$/g, "").trim();
			const cleanBody = c.trim();
			if (!cleanPath || !cleanBody) return;
			if (cleanPath.length < 2 || cleanPath.includes("\n") || cleanPath.includes("\r")) return;

			if (handledPaths.has(cleanPath.toLowerCase()) || handledBodies.has(cleanBody)) return;
			handledPaths.add(cleanPath.toLowerCase());
			handledBodies.add(cleanBody);
			files.push({ path: cleanPath, content: c, pattern: pat });
		};

		// Pattern 1: ```file:path or ```write:path or ```filepath:path
		const p1 = /```(?:file|write|filepath):\s*([^\r\n]+)\r?\n([\s\S]*?)```/gi;
		let m1 = p1.exec(text);
		while (m1 !== null) {
			register(m1[1], m1[2], "file-tag");
			m1 = p1.exec(text);
		}

		// Pattern 2: ```lang:path.ext (e.g. ```csharp:Form1.cs or ```cs:src/Form1.cs)
		const p2 = /```[a-zA-Z0-9_-]+:([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)\r?\n([\s\S]*?)```/gi;
		let m2 = p2.exec(text);
		while (m2 !== null) {
			register(m2[1], m2[2], "lang-colon-path");
			m2 = p2.exec(text);
		}

		// Pattern 3: ```lang // filepath: path or ```lang // Archivo: path
		const p3 =
			/```[a-zA-Z0-9_-]+\s*(?:\/\/|#)\s*(?:filepath|file|archivo|ruta|filename):?\s*([^\r\n]+)\r?\n([\s\S]*?)```/gi;
		let m3 = p3.exec(text);
		while (m3 !== null) {
			register(m3[1], m3[2], "commented-lang-tag");
			m3 = p3.exec(text);
		}

		// Pattern 4: ```lang\n// Archivo: path or // File: path.ext or // path.ext
		const p4 =
			/```(?:[a-zA-Z0-9_-]+)\r?\n(?:\/\/|#)\s*(?:filepath|file|archivo|ruta|filename)?\s*:?\s*([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)\r?\n([\s\S]*?)```/gi;
		let m4 = p4.exec(text);
		while (m4 !== null) {
			register(m4[1], m4[2], "first-line-comment");
			m4 = p4.exec(text);
		}

		// Pattern 5: Preceding Markdown header with filename (e.g. ### 1. Archivo: Form1.cs\n```csharp ... ```)
		const p5 =
			/(?:###?\s*(?:\d+[.)]\s*)?(?:[Aa]rchivo|[Ff]ile|[Cc]rear|[Ii]mplementar)?\s*[:`"']?\s*([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)[`"']?\s*\r?\n+)\s*```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)```/gi;
		let m5 = p5.exec(text);
		while (m5 !== null) {
			register(m5[1], m5[2], "preceding-header");
			m5 = p5.exec(text);
		}

		// Pattern 6: Fallback class inference for C# and other typed blocks without explicit filename
		const p6 = /```(?:csharp|cs|dotnet|c#)\r?\n([\s\S]*?)```/gi;
		let m6 = p6.exec(text);
		while (m6 !== null) {
			const body = m6[1];
			const classMatch = body.match(/(?:public|internal)?\s*(?:partial\s+)?class\s+([A-Za-z0-9_]+)/);
			if (classMatch && classMatch[1]) {
				const inferredName = `${classMatch[1]}.cs`;
				register(inferredName, body, "inferred-class");
			}
			m6 = p6.exec(text);
		}

		return files;
	}

	private async executeAgentActions(
		agent: PantheonAgentProfile,
		text: string,
		targetCwd: string,
		onEvent: PantheonEventCallback,
	): Promise<string> {
		let extraResultsText = "";

		// 1. File Writing / Editing (for agents with write capability, e.g. Developer, Hephaestus, Refactorer)
		if (agent.capabilities.write) {
			const filesToWrite = this.extractFilesFromAgentText(text);
			for (const fileItem of filesToWrite) {
				const rawPath = fileItem.path;
				const content = fileItem.content;
				try {
					const fullPath = path.isAbsolute(rawPath) ? path.resolve(rawPath) : path.resolve(targetCwd, rawPath);
					if (!this.isPathSafe(fullPath, targetCwd)) {
						const safetyMsg = `🛡️ [Guardrail de Seguridad]: Intento de escribir fuera del directorio del proyecto bloqueado: "${rawPath}".`;
						await onEvent({
							type: "error",
							agentId: agent.id,
							error: safetyMsg,
						});
						extraResultsText += `\n\n> ⚠️ **Bloqueo de Seguridad**: Se impidió escribir en \`${rawPath}\` porque excede los límites del proyecto.`;
						continue;
					}
					const dir = path.dirname(fullPath);
					if (!existsSync(dir)) {
						mkdirSync(dir, { recursive: true });
					}
					writeFileSync(fullPath, content, "utf-8");
					const lineCount = content.split(/\r?\n/).length;
					const byteCount = Buffer.byteLength(content, "utf-8");

					await onEvent({
						type: "tool_start",
						agentId: agent.id,
						tool: "write",
						target: rawPath,
						input: { path: rawPath, lines: lineCount, bytes: byteCount },
					});

					const resultMsg = `✓ Archivo "${rawPath}" creado/modificado exitosamente (${lineCount} líneas, ${byteCount} bytes en disco).`;
					await onEvent({
						type: "tool_result",
						agentId: agent.id,
						tool: "write",
						target: rawPath,
						output: resultMsg,
					});

					extraResultsText += `\n\n> 🛠️ **Acción ejecutada**: Se escribió el archivo \`${rawPath}\` (${lineCount} líneas en disco).`;
				} catch (err: any) {
					await onEvent({
						type: "tool_result",
						agentId: agent.id,
						tool: "write",
						target: rawPath,
						output: `✗ Error al escribir archivo "${rawPath}": ${err.message || String(err)}`,
					});
				}
			}
		}

		// 2. Terminal Command / Test Execution (for agents with terminal capability, e.g. Tester, Argos)
		if (agent.capabilities.terminal) {
			const commandsToRun: string[] = [];

			// Pattern 1: ```bash:command or ```terminal:command
			const bashColonRegex = /```(?:bash|terminal|test|sh|powershell|cmd):\s*([^\r\n]+)\r?\n?([\s\S]*?)```/gi;
			let m1 = bashColonRegex.exec(text);
			while (m1 !== null) {
				let cmd = m1[1].trim();
				const body = m1[2]?.trim();
				if (body && (!cmd || cmd.length === 0)) cmd = body;
				if (cmd && !commandsToRun.includes(cmd)) commandsToRun.push(cmd);
				m1 = bashColonRegex.exec(text);
			}

			// Pattern 2: ```bash\ncommand\n``` (e.g. dotnet test, npm test, pytest)
			const bashPlainRegex = /```(?:bash|sh|cmd|powershell|terminal)\r?\n([^\r\n]+(?:\r?\n[^\r\n]+)*?)\r?\n```/gi;
			let m2 = bashPlainRegex.exec(text);
			while (m2 !== null) {
				const fullCmd = m2[1].trim();
				if (
					fullCmd &&
					!commandsToRun.includes(fullCmd) &&
					(fullCmd.startsWith("dotnet") ||
						fullCmd.startsWith("npm") ||
						fullCmd.startsWith("pytest") ||
						fullCmd.startsWith("cargo") ||
						fullCmd.startsWith("mvn") ||
						fullCmd.startsWith("python") ||
						fullCmd.startsWith("node") ||
						fullCmd.startsWith("git"))
				) {
					commandsToRun.push(fullCmd);
				}
				m2 = bashPlainRegex.exec(text);
			}

			for (const cmd of commandsToRun) {
				if (this.isDangerousDestructiveCommand(cmd)) {
					const safetyMsg = `🛡️ [Guardrail de Seguridad Hermes 0.21.0]: Comando destructivo bloqueado automáticamente por seguridad: "${cmd}". Requiere confirmación manual del usuario.`;
					await onEvent({
						type: "error",
						agentId: agent.id,
						error: safetyMsg,
					});
					extraResultsText += `\n\n> ⚠️ **Bloqueo de Seguridad**: Se impidió la ejecución automática del comando destructivo \`${cmd}\`.`;
				} else {
					await onEvent({
						type: "tool_start",
						agentId: agent.id,
						tool: "bash",
						target: cmd,
						input: { command: cmd },
					});

					const res = await this.executeCommandLine(cmd, targetCwd);
					const combinedOutput =
						(res.stdout + (res.stderr ? `\nSTDERR:\n${res.stderr}` : "")).trim() ||
						"(Comando completado sin salida)";
					const isSuccess = res.exitCode === 0;

					await onEvent({
						type: "tool_result",
						agentId: agent.id,
						tool: "bash",
						target: cmd,
						output: `Exit Code ${res.exitCode}\n${combinedOutput.slice(0, 2000)}`,
					});

					extraResultsText += `\n\n### 🩺 Resultado de Ejecución en Terminal (\`${cmd}\`)\n- **Estado**: ${isSuccess ? "✅ Éxito (Exit Code 0)" : `❌ Fallo (Exit Code ${res.exitCode})`}\n\`\`\`text\n${combinedOutput.slice(0, 1500)}\n\`\`\``;
				}
			}
		}

		// 3. File Read Request Execution (e.g. ```read: path/file.cs``` or [read(file_path='...')] )
		const readBlockRegex = /(?:```(?:read|file_read):\s*([^\r\n]+)```|\[read\(file_path=['"]?([^'"]+)['"]?\)\])/gi;
		let readMatch = readBlockRegex.exec(text);
		while (readMatch !== null) {
			const targetFile = (readMatch[1] || readMatch[2] || "").trim();
			if (targetFile) {
				try {
					const fullPath = path.isAbsolute(targetFile)
						? path.resolve(targetFile)
						: path.resolve(targetCwd, targetFile);
					if (!this.isPathSafe(fullPath, targetCwd)) {
						const safetyMsg = `🛡️ [Guardrail de Seguridad]: Lectura de archivo fuera del directorio del proyecto bloqueada: "${targetFile}".`;
						await onEvent({
							type: "error",
							agentId: agent.id,
							error: safetyMsg,
						});
						extraResultsText += `\n\n> ⚠️ **Bloqueo de Seguridad**: Se impidió leer \`${targetFile}\` porque excede los límites del proyecto.`;
						readMatch = readBlockRegex.exec(text);
						continue;
					}
					if (existsSync(fullPath)) {
						const content = readFileSync(fullPath, "utf-8");
						const ext = (path.extname(targetFile).slice(1) || "text").toLowerCase();
						await onEvent({
							type: "tool_start",
							agentId: agent.id,
							tool: "read",
							input: { path: targetFile },
						});
						await onEvent({
							type: "tool_result",
							agentId: agent.id,
							tool: "read",
							output: `✓ Lectura de ${targetFile} (${content.split(/\r?\n/).length} líneas)`,
						});
						extraResultsText += `\n\n### 📖 Contenido de \`${targetFile}\`:\n\`\`\`${ext}\n${content.slice(0, 4000)}\n\`\`\``;
					}
				} catch {}
			}
			readMatch = readBlockRegex.exec(text);
		}

		return extraResultsText;
	}

	private async extractXlsxText(filePath: string): Promise<string> {
		return new Promise((resolve) => {
			try {
				const yauzl = require("yauzl");
				yauzl.open(filePath, { lazyEntries: true }, (err: any, zipfile: any) => {
					if (err || !zipfile) return resolve("");
					let sharedStrings: string[] = [];

					zipfile.readEntry();
					zipfile.on("entry", (entry: any) => {
						if (entry.fileName === "xl/sharedStrings.xml") {
							zipfile.openReadStream(entry, (sErr: any, readStream: any) => {
								if (sErr) return zipfile.readEntry();
								const chunks: Buffer[] = [];
								readStream.on("data", (chunk: Buffer) => chunks.push(chunk));
								readStream.on("end", () => {
									const xml = Buffer.concat(chunks).toString("utf-8");
									const matches = xml.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
									sharedStrings = matches.map((m: string) => m.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
									zipfile.readEntry();
								});
							});
						} else {
							zipfile.readEntry();
						}
					});
					zipfile.on("end", () => {
						if (sharedStrings.length === 0) return resolve("");
						const cleanStrings = Array.from(new Set(sharedStrings));
						const result = `### 📊 Especificación de Protocolo desde Archivo Excel (${path.basename(filePath)}):\n\`\`\`text\n${cleanStrings.slice(0, 300).join("\n")}\n\`\`\``;
						resolve(result);
					});
					zipfile.on("error", () => resolve(""));
				});
			} catch {
				resolve("");
			}
		});
	}

	private async loadProjectContext(projectInfo?: PantheonProjectInfo): Promise<PantheonProjectContext> {
		const targetCwd = projectInfo?.path ? path.resolve(projectInfo.path) : this.cwd;
		const name = projectInfo?.name || path.basename(targetCwd) || "Proyecto Principal";
		const description = projectInfo?.description;

		// 1. Read MEMORY.md
		let memory: string | undefined;
		const memoryCandidates = [
			path.join(targetCwd, "MEMORY.md"),
			path.join(targetCwd, ".andy", "MEMORY.md"),
			path.join(targetCwd, ".prime", "MEMORY.md"),
		];
		for (const memPath of memoryCandidates) {
			if (existsSync(memPath)) {
				try {
					memory = readFileSync(memPath, "utf-8").trim();
					if (memory.length > 2500) {
						memory = `${memory.slice(0, 2500)}\n... [truncado por longitud]`;
					}
					break;
				} catch {}
			}
		}

		// 2. Read AGENTS.md
		let agentsMd: string | undefined;
		const agentsCandidates = [
			path.join(targetCwd, "AGENTS.md"),
			path.join(targetCwd, ".andy", "AGENTS.md"),
			path.join(targetCwd, ".prime", "AGENTS.md"),
		];
		for (const agPath of agentsCandidates) {
			if (existsSync(agPath)) {
				try {
					agentsMd = readFileSync(agPath, "utf-8").trim();
					if (agentsMd.length > 2500) {
						agentsMd = `${agentsMd.slice(0, 2500)}\n... [truncado por longitud]`;
					}
					break;
				} catch {}
			}
		}

		// 3. Deep scan workspace file structure & manifests
		let fileList = "";
		let manifestSummary = "";
		let codeSnippetsSummary = "";

		try {
			const scanned: string[] = [];
			const manifestFiles: string[] = [];
			const docFiles: string[] = [];
			const sourceFiles: string[] = [];

			const scanDir = (dir: string, depth = 0) => {
				if (depth > 6 || scanned.length >= 250) return;
				if (!existsSync(dir)) return;
				try {
					const entries = readdirSync(dir);
					for (const entry of entries) {
						if (
							entry.startsWith(".") ||
							entry === "node_modules" ||
							entry === "dist" ||
							entry === "build" ||
							entry === "bin" ||
							entry === "obj" ||
							entry === "coverage" ||
							entry === "packages" ||
							entry === "TestResults" ||
							entry === "Debug" ||
							entry === "Release"
						) {
							continue;
						}
						const fullPath = path.join(dir, entry);
						const relPath = path.relative(targetCwd, fullPath).replace(/\\/g, "/");
						try {
							const stat = statSync(fullPath);
							if (stat.isDirectory()) {
								scanned.push(`📁 ${relPath}/`);
								scanDir(fullPath, depth + 1);
							} else {
								scanned.push(`📄 ${relPath}`);
								const lower = entry.toLowerCase();
								if (
									lower.endsWith(".sln") ||
									lower.endsWith(".csproj") ||
									lower.endsWith(".fsproj") ||
									lower.endsWith(".vbproj") ||
									lower === "package.json" ||
									lower === "cargo.toml" ||
									lower === "go.mod" ||
									lower === "requirements.txt" ||
									lower === "pyproject.toml"
								) {
									manifestFiles.push(fullPath);
								} else if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) {
									docFiles.push(fullPath);
								} else if (
									(lower.endsWith(".cs") ||
										lower.endsWith(".ts") ||
										lower.endsWith(".py") ||
										lower.endsWith(".rs") ||
										lower.endsWith(".go")) &&
									sourceFiles.length < 50
								) {
									sourceFiles.push(fullPath);
								}
							}
						} catch {}
					}
				} catch {}
			};

			scanDir(targetCwd);
			fileList = scanned.slice(0, 200).join("\n");
			if (scanned.length === 0) {
				fileList = "(Directorio vacío o recién inicializado)";
			}

			// Read key manifest files
			if (manifestFiles.length > 0) {
				const manifests: string[] = [];
				for (const mf of manifestFiles.slice(0, 5)) {
					try {
						const rel = path.relative(targetCwd, mf).replace(/\\/g, "/");
						const content = readFileSync(mf, "utf-8").trim();
						manifests.push(`### 📦 ${rel}\n\`\`\`xml\n${content.slice(0, 2000)}\n\`\`\``);
					} catch {}
				}
				manifestSummary = manifests.join("\n\n");
			}

			// Extract public interfaces, models, classes and documentation
			const snippets: string[] = [];

			// 1. Decode Excel / protocol documentation files
			if (docFiles.length > 0) {
				for (const df of docFiles.slice(0, 3)) {
					try {
						const xlsxText = await this.extractXlsxText(df);
						if (xlsxText) {
							snippets.push(xlsxText);
						}
					} catch {}
				}
			}

			// 2. Sort source files to prioritize root files & protocol handlers (Comandos.cs, Main.cs, Procesador.cs, Packet.cs)
			sourceFiles.sort((a, b) => {
				const aBase = path.basename(a).toLowerCase();
				const bBase = path.basename(b).toLowerCase();
				const isPriority = (name: string) =>
					name.includes("comando") ||
					name.includes("main") ||
					name.includes("procesador") ||
					name.includes("protocol") ||
					name.includes("service") ||
					name.includes("packet");
				if (isPriority(aBase) && !isPriority(bBase)) return -1;
				if (!isPriority(aBase) && isPriority(bBase)) return 1;
				return a.length - b.length;
			});

			if (sourceFiles.length > 0) {
				for (const sf of sourceFiles.slice(0, 40)) {
					try {
						const rel = path.relative(targetCwd, sf).replace(/\\/g, "/");
						const content = readFileSync(sf, "utf-8");
						const ext = path.extname(sf).slice(1) || "cs";

						// If file is small (< 15KB), include full content for complete context
						if (content.length <= 15000) {
							snippets.push(`### 🔍 ${rel} (Código Completo):\n\`\`\`${ext}\n${content}\n\`\`\``);
						} else {
							// For larger files, extract declarations, signatures, public methods, events, properties, and constants
							const lines = content.split(/\r?\n/);
							const relevantLines = lines.filter(
								(l) =>
									/(?:public|internal|protected|const|static)\s+(?:class|interface|struct|enum|record|void|async|Task|event|string|int|bool|byte|List|Dictionary|delegate|byte\[\])/i.test(
										l,
									) ||
									/#region|#endregion/i.test(l) ||
									/0x[0-9A-Fa-f]{2}/.test(l) ||
									/case\s+0x/i.test(l) ||
									/namespace\s+|using\s+/i.test(l),
							);
							if (relevantLines.length > 0) {
								snippets.push(
									`### 🔍 ${rel} (Estructura/Signaturas públicas, constantes de protocolo y eventos):\n\`\`\`${ext}\n${relevantLines.slice(0, 180).join("\n")}\n\`\`\``,
								);
							} else {
								snippets.push(
									`### 🔍 ${rel} (Muestra inicial):\n\`\`\`${ext}\n${content.slice(0, 4000)}\n\`\`\``,
								);
							}
						}
					} catch {}
				}
			}
			codeSnippetsSummary = snippets.join("\n\n");
		} catch {
			fileList = "(No fue posible escanear los archivos del directorio)";
		}

		return {
			name,
			path: targetCwd.replace(/\\/g, "/"),
			description,
			fileList,
			memory,
			agentsMd,
			manifestSummary,
			codeSnippetsSummary,
		};
	}

	private buildAgentSystemPrompt(
		agent: PantheonAgentProfile,
		squad: PantheonSquad,
		graftContext?: any,
		projectContext?: PantheonProjectContext,
		isDelegatedStep?: boolean,
	): string {
		const members = this.registry
			.getAgents()
			.filter((a) => squad.memberIds.includes(a.id))
			.map((a) => `- **@${a.name}** (${a.role}): ${a.systemPrompt.slice(0, 100)}...`)
			.join("\n");

		const projectSection = projectContext
			? `\n\n# ESPACIO DE TRABAJO Y PROYECTO ACTIVO
- **Nombre del Proyecto**: ${projectContext.name}
- **Directorio Raíz / Workspace CWD**: ${projectContext.path}
${projectContext.description ? `- **Propósito/Descripción**: ${projectContext.description}\n` : ""}
## Árbol de Archivos del Proyecto:
\`\`\`
${projectContext.fileList}
\`\`\`
${projectContext.manifestSummary ? `\n## Manifiestos de Construcción y Dependencias del Proyecto:\n${projectContext.manifestSummary}\n` : ""}
${projectContext.codeSnippetsSummary ? `\n## Interfaces y Estructuras Públicas del Código Fuente:\n${projectContext.codeSnippetsSummary}\n` : ""}
${projectContext.memory ? `\n## Memoria Persistente del Proyecto (MEMORY.md):\n${projectContext.memory}\n` : ""}
${projectContext.agentsMd ? `\n## Reglas y Directivas del Proyecto (AGENTS.md):\n${projectContext.agentsMd}\n` : ""}`
			: `\n\n# ESPACIO DE TRABAJO
- **Directorio Raíz (CWD)**: ${this.cwd.replace(/\\/g, "/")}`;

		const graftSection = graftContext?.map
			? `\n\n# GRAFT KNOWLEDGE GRAPH (ARQUITECTURA Y AST)
\`\`\`
${graftContext.map}
\`\`\`
- Diagnósticos estáticos pendientes: ${graftContext.diagnosticsCount || 0}`
			: "";

		const delegationSection = isDelegatedStep
			? `\n\n# INTERVENCIÓN POR DELEGACIÓN DEL ESCUADRÓN
Has sido invocado en cadena porque otro miembro de tu escuadrón te delegó una tarea o solicitó tu análisis en los mensajes inmediatamente anteriores. Lee atentamente sus conclusiones o instrucciones previas en el historial, asume el control inmediato y entrega tus resultados según tu especialidad sin repetir lo que ya se dijo.`
			: "";

		const squadAgents = this.registry.getAgents().filter((a) => squad.memberIds.includes(a.id));

		const memberTags = squadAgents.map((a) => `@${a.name}`).join(", ");
		const otherSquadMembers = squadAgents.filter((a) => a.id !== agent.id);
		const otherTags = otherSquadMembers.map((a) => `@${a.name}`).join(", ");

		const squadCollaborationProtocol = `\n\n# PROTOCOLO OBLIGATORIO DE COLABORACIÓN Y DELEGACIÓN EN EL ESCUADRÓN
1. **Trabajo en Equipo Autónomo**: Formas parte del escuadrón especializado "${squad.name}".
2. **Delega Explícitamente a tus Compañeros**: Para pasarle la tarea o hallazgos al siguiente especialista DE TU ESCUADRÓN, menciona su etiqueta con @Nombre (miembros del escuadrón disponibles: ${otherTags || memberTags}). Cada mención activará al agente en vivo para que elabore su parte en la misma conversación.
3. **Regla de Escuadrón**: Delega EXCLUSIVAMENTE a miembros de tu escuadrón (${otherTags || memberTags}). NUNCA delegues a agentes de otros escuadrones.`;

		const specializationBullets = squadAgents
			.map((a) => {
				if (a.id.includes("architect") || a.id.includes("athena")) {
					return `   - Si eres **@${a.name}**: Diseña la arquitectura, contratos, interfaces y especificaciones técnicas de la solución, y delega inmediatamente a los desarrolladores del escuadrón.`;
				}
				if (a.id.includes("tester")) {
					return `   - Si eres **@${a.name}**: Diseña y escribe pruebas unitarias e integración para validar la lógica del negocio con bloques de prueba y comandos \`\`\`bash:dotnet test\`\`\`.`;
				}
				if (a.id.includes("refactorer")) {
					return `   - Si eres **@${a.name}**: Audita el código generado, optimiza code smells y aplica principios SOLID (SRP/DIP).`;
				}
				if (a.id.includes("debugger")) {
					return `   - Si eres **@${a.name}**: Analiza stack traces, diagnostica fallos y propone fixes precisos.`;
				}
				if (a.id.includes("devops")) {
					return `   - Si eres **@${a.name}**: Configura pipelines, scripts de build y dependencias del proyecto.`;
				}
				if (a.id.includes("pythia") || a.id.includes("researcher")) {
					return `   - Si eres **@${a.name}**: Analiza dependencias y código fuente preexistente y sintetiza los hallazgos técnicos para los desarrolladores de tu escuadrón.`;
				}
				if (a.id.includes("developer") || a.id.includes("hephaestus") || a.capabilities.write) {
					return `   - Si eres **@${a.name}**: PROGRAMA Y ESCRIBE DIRECTAMENTE el código completo de la solución en disco con bloques \`\`\`file:ruta/archivo.ext ... \`\`\`. Utiliza las clases y dependencias existentes en el proyecto.`;
				}
				if (a.capabilities.terminal) {
					return `   - Si eres **@${a.name}**: Audita el código generado y ejecuta la validación o compilación con bloques de comando \`\`\`bash:comando\`\`\` (ej: \`\`\`bash:dotnet build\`\`\`).`;
				}
				return `   - Si eres **@${a.name}**: Realiza tu análisis especializado (${a.role}) y delega al siguiente especialista de tu escuadrón.`;
			})
			.join("\n");

		const operationalRules = `\n\n# REGLAS CRÍTICAS DE EJECUCIÓN DEL PANTHEON
1. **Identidad del Agente**: Eres exclusivamente **@${agent.name}** (${agent.role}), un agente autónomo del escuadrón "${squad.name}" en el ecosistema Andy Agent. Tu única identidad es @${agent.name}. NUNCA te identifiques como Antigravity, Google DeepMind, OpenAI ni un asistente genérico.
2. **Idioma y Formato Humano**: Responde siempre en **Español** con formato Markdown estructurado, limpio y profesional (encabezados, listas, tablas y bloques de código).
3. **PROHIBICIÓN ABSOLUTA DE GENERAR PSEUDO-TAGS O TOKENS DE HERRAMIENTAS**: NUNCA generes tokens o etiquetas especiales de llamada a herramientas como \`<|tool_call_start|>\`, \`<|tool_call_end|>\`, \`<tool_call>\`, \`<arg_key>\`, \`<arg_value>\`, \`<action>\`. Toda la información del proyecto, manifiestos y código fuente ya ha sido leída y provista arriba. Redacta siempre en texto Markdown en Español para el usuario y para tus compañeros de escuadrón.
4. **Acceso Directo y Total al Proyecto Activo**: Ya te encuentras ejecutando dentro del espacio de trabajo del proyecto activo ("${projectContext?.name || path.basename(this.cwd)}" en "${projectContext?.path || this.cwd}"). Toda la estructura de archivos, clases, interfaces públicas, manifiestos (.csproj / .sln), modelos C# y documentación técnica de protocolos (incluyendo hojas Excel .xlsx decodificadas) ya están completamente leídos e incluidos arriba en tu contexto.
5. **PROHIBICIÓN ESTRICTA DE DECIR "NO PUEDO ACCEDER", "NECESITO LOS ARCHIVOS" O PEDIR QUE EL USUARIO COMPARTA CÓDIGO**: NUNCA digas "NO PUEDO Acceder a tu Filesystem", "Necesito los Archivos Fuente para Proceder", "no tengo acceso al código" ni pidas que el usuario comparta archivos o ejecute "Get-ChildItem", "tree /F", "dir". Tienes el código fuente C# completo arriba en "Interfaces y Estructuras Públicas del Código Fuente", las tablas en "Especificación de Protocolo desde Archivo Excel" y la estructura en "Árbol de Archivos del Proyecto". Realiza el análisis comparativo, auditoría, diseño o implementación de inmediato con los datos provistos.
6. **Programación Inmediata Sin Preguntas Retóricas**: No pidas confirmación para empezar ni preguntes "¿deseas que proceda?". Entrega de inmediato el diseño arquitectónico y el CÓDIGO FUENTE COMPLETO implementado.
7. **Especialización Inmediata en tu Escuadrón**:\n${specializationBullets}`;

		const writerAgents =
			squadAgents
				.filter((a) => a.capabilities.write)
				.map((a) => `@${a.name}`)
				.join(" / ") || "@Developer";
		const terminalAgents =
			squadAgents
				.filter((a) => a.capabilities.terminal)
				.map((a) => `@${a.name}`)
				.join(" / ") || "@Tester";

		const writerMandate = agent.capabilities.write
			? `\n\n# ⚡ MANDATO EXCLUSIVO Y OBLIGATORIO DE IMPLEMENTACIÓN PARA @${agent.name.toUpperCase()} (CREACIÓN REAL EN DISCO)
1. Eres el programador/desarrollador. Tu trabajo NO ES explicar teóricamente cómo se haría ni pasarle el informe a otro agente con solo palabras.
2. Tu deber prioritario y absoluto es ESCRIBIR FÍSICAMENTE EN DISCO EL CÓDIGO FUENTE DE LA SOLUCIÓN.
3. Debes generar los archivos completos listos para producción con su ruta en cualquiera de estos formatos soportados:
   \`\`\`csharp // Archivo: Form1.cs
   // Todo el código C# completo
   \`\`\`
   o
   \`\`\`file:Form1.cs
   // Todo el código C# completo
   \`\`\`
4. El motor de Pantheon detectará cada bloque de archivo y lo GUARDARÁ INMEDIATAMENTE EN DISCO en el proyecto activo ("${projectContext?.path || this.cwd}").
5. PROHIBICIÓN TERMINANTE: NO delegues a @Tester ni a ningún otro compañero sin haber creado primero los archivos de código. Si no generas bloques de archivo ejecutables, el proyecto no se actualizará y habrás fallado tu tarea.`
			: "";

		const architectMandate =
			agent.id.includes("architect") || agent.id.includes("athena")
				? `\n\n# 🏛️ DIRECTIVA DE ARQUITECTURA PARA @${agent.name.toUpperCase()}
1. Diseña la arquitectura técnica, patrones, interfaces y especifica con precisión los nombres de archivos y rutas que deben implementarse.
2. Al finalizar tu diseño, delega a @Developer ordenándole explícitamente qué archivos de código debe escribir en disco.`
				: "";

		const testerMandate =
			agent.id.includes("tester") || agent.id.includes("argos")
				? `\n\n# 🧪 DIRECTIVA DE AUDITORÍA Y QA PARA @${agent.name.toUpperCase()}
1. Audita el código que acaba de escribir @Developer.
2. Si creas tests unitarios, escríbelos en disco usando \`\`\`csharp // Archivo: Tests/Form1Tests.cs ... \`\`\`
3. Si deseas compilar o probar, ejecuta comandos de terminal usando \`\`\`bash\ndotnet test\n\`\`\` o \`\`\`bash\ndotnet build\n\`\`\`.
4. NO repitas el diseño del arquitecto ni el código del desarrollador.`
				: "";

		const devopsMandate = agent.id.includes("devops")
			? `\n\n# 🚀 DIRECTIVA DE SINCRONIZACIÓN GIT Y PUBLICACIÓN PARA @${agent.name.toUpperCase()}
1. El equipo (@Architect, @Developer y @Tester) ha terminado de implementar y auditar los archivos en el servidor.
2. Tu responsabilidad prioritaria es EMPAQUETAR Y PUBLICAR LOS CAMBIOS EN EL REPOSITORIO GIT para que el usuario pueda sincronizarlos en su PC local (KiloCode / VS Code).
3. Ejecuta los comandos en un bloque:
   \`\`\`bash
   git add -A
   git commit -m "feat(pantheon): implementación automática por escuadrón Andy Agent"
   git push origin main
   \`\`\`
4. Informa con precisión al usuario qué archivos quedaron commiteados y recuérdale ejecutar \`git pull origin main\` en su PC local para tener los archivos al instante.`
			: "";

		const actionProtocol = `\n\n# PROTOCOLO OBLIGATORIO DE CREACIÓN Y ESCRITURA DE ARCHIVOS EN DISCO (${writerAgents})
1. **Para Escribir o Modificar Archivos (${writerAgents})**:
   Escribe bloques de código indicando claramente el nombre del archivo en cualquiera de las siguientes formas:
   - Bloque con comentario de archivo:
     \`\`\`csharp // Archivo: Form1.cs
     // Código fuente completo
     \`\`\`
   - Bloque con prefijo file:
     \`\`\`file:Form1.cs
     // Código fuente completo
     \`\`\`
   - Bloque con lenguaje y nombre:
     \`\`\`csharp:Form1.cs
     // Código fuente completo
     \`\`\`
   - Encabezado previo:
     ### Archivo: Form1.cs
     \`\`\`csharp
     // Código fuente completo
     \`\`\`
   El sistema escribirá inmediatamente cada archivo en el disco del proyecto. Al terminar de escribir todos los archivos, delega a ${terminalAgents} para que ejecute la verificación.

2. **Para Ejecutar Pruebas o Comandos (${terminalAgents})**:
   Escribe el bloque de comando con el formato:
   \`\`\`bash
   dotnet build
   \`\`\`
   o
   \`\`\`bash
   dotnet test
   \`\`\`
   El sistema ejecutará el comando en la terminal real del proyecto y presentará el reporte de calidad.`;

		return `${agent.systemPrompt}

Eres parte del escuadrón multi-agente "${squad.name}" (Modo: ${squad.workflowMode}).
Otros agentes en tu escuadrón:
${members}
${projectSection}${graftSection}${delegationSection}${writerMandate}${architectMandate}${testerMandate}${devopsMandate}${squadCollaborationProtocol}${actionProtocol}${operationalRules}`;
	}

	private sanitizeAgentOutput(text: string): string {
		if (!text) return "";
		return text
			.replace(/<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>/gi, "")
			.replace(/<\|tool_call_start\|>[\s\S]*$/gi, "")
			.replace(/<\|im_start\|>[\s\S]*?<\|im_end\|>/gi, "")
			.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "")
			.replace(/\[read\(file_path=[^\]]*\)\]/gi, "")
			.replace(/\[write\(file_path=[^\]]*\)\]/gi, "")
			.replace(/\[execute\(command=[^\]]*\)\]/gi, "")
			.trim();
	}

	private detectPeerDelegations(text: string, fromAgentId: string, squad?: PantheonSquad): PantheonTaskDelegation[] {
		const delegations: PantheonTaskDelegation[] = [];
		const allowedAgents = squad
			? this.registry.getAgents().filter((a) => squad.memberIds.includes(a.id))
			: this.registry.getAgents();

		for (const a of allowedAgents) {
			if (a.id === fromAgentId) continue;
			const regex = new RegExp(`@${a.name}\\b|@${a.id}\\b`, "i");
			if (regex.test(text)) {
				delegations.push({
					taskId: `task-${randomUUID().slice(0, 8)}`,
					fromAgentId,
					toAgentId: a.id,
					instruction: text.slice(0, 300),
					status: "pending",
					createdAt: new Date().toISOString(),
				});
			}
		}

		return delegations;
	}
}
