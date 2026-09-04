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
		| "user_question"
		| "todo_update"
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
	question?: string;
	options?: Array<{ text: string }>;
	todos?: Array<any>;
	error?: string;
}

export interface UserActionRequired {
	question: string;
	options: Array<{ text: string }>;
	rawMatch?: string;
}

export type PantheonEventCallback = (event: PantheonExecutionEvent) => void | Promise<void>;

export class PantheonStreamFilter {
	private buffer = "";
	private inToolBlock = false;
	private hasProcessedLeadingSpeaker = false;
	private emittedAnyContent = false;

	public feed(chunk: string): string {
		this.buffer += chunk;
		// Strip HTML <br> tags that models frequently insert before or around tool blocks
		this.buffer = this.buffer.replace(/<br\s*\/?>/gi, "");
		let output = "";

		// 1. Strip leading speaker prefix like [Architect (Software Architect & System Designer)]:
		if (!this.hasProcessedLeadingSpeaker) {
			const trimmed = this.buffer.trimStart();
			if (trimmed.startsWith("[") && trimmed.includes("]:")) {
				const afterPrefix = trimmed.replace(/^\[[^\]]+\]:\s*/, "");
				this.buffer = afterPrefix;
				this.hasProcessedLeadingSpeaker = true;
			} else if (this.buffer.length > 50 || (!trimmed.startsWith("[") && this.buffer.length > 5)) {
				this.hasProcessedLeadingSpeaker = true;
			}
		}

		while (this.buffer.length > 0) {
			if (this.inToolBlock) {
				// Check for closing tags of outer tool blocks or functions
				const closeMatch = this.buffer.match(
					/<\/(?:tool_call|ask_followup_question|write_to_file|execute_command|read_file|function|parameter|action|function_calls|function_call)>/i,
				);
				if (closeMatch) {
					const endIdx = closeMatch.index! + closeMatch[0].length;
					this.buffer = this.buffer.slice(endIdx);
					// Continue consuming any immediately adjacent closing tags or whitespace
					const trailingTagsMatch = this.buffer.match(
						/^(?:\s|<\/(?:tool_call|function|parameter|action|read_file|write_to_file|execute_command)>)+/i,
					);
					if (trailingTagsMatch) {
						this.buffer = this.buffer.slice(trailingTagsMatch[0].length);
					}
					this.inToolBlock = false;
				} else {
					// Check for JSON tool end
					if (this.buffer.trimStart().startsWith("{") && this.buffer.includes("}")) {
						const lastBrace = this.buffer.lastIndexOf("}");
						this.buffer = this.buffer.slice(lastBrace + 1);
						this.inToolBlock = false;
					} else {
						// Still in tool block: don't emit anything
						if (this.buffer.length > 200) {
							this.buffer = this.buffer.slice(-200);
						}
						break;
					}
				}
			} else {
				// Check for orphaned closing tags at start of buffer
				const orphanCloseMatch = this.buffer.match(
					/^\s*<\/(?:tool_call|function|parameter|read_file|write_to_file|execute_command|action|function_calls|function_call)>/i,
				);
				if (orphanCloseMatch) {
					this.buffer = this.buffer.slice(orphanCloseMatch[0].length);
					continue;
				}

				// Check for leading or inline tool tags (open)
				const openTagMatch = this.buffer.match(
					/<(?:tool_call|ask_followup_question|write_to_file|execute_command|read_file|function\b|parameter\b|<\|tool_call)/i,
				);
				const openJsonMatch = this.buffer.match(/\{\s*"(?:tool|name)"\s*:\s*"/i);

				let earliestIdx = -1;

				if (openTagMatch) {
					earliestIdx = openTagMatch.index!;
				}
				if (openJsonMatch && (earliestIdx === -1 || openJsonMatch.index! < earliestIdx)) {
					earliestIdx = openJsonMatch.index!;
				}

				// Also check if an orphaned close tag appears later in the text
				const inlineOrphanCloseMatch = this.buffer.match(
					/<\/(?:tool_call|function|parameter|read_file|write_to_file|execute_command|action|function_calls|function_call)>/i,
				);
				if (inlineOrphanCloseMatch && (earliestIdx === -1 || inlineOrphanCloseMatch.index! < earliestIdx)) {
					output += this.buffer.slice(0, inlineOrphanCloseMatch.index!);
					this.buffer = this.buffer.slice(inlineOrphanCloseMatch.index! + inlineOrphanCloseMatch[0].length);
					continue;
				}

				if (earliestIdx !== -1) {
					output += this.buffer.slice(0, earliestIdx);
					this.buffer = this.buffer.slice(earliestIdx);
					this.inToolBlock = true;
				} else {
					// Check if buffer ends with a potential opening or closing tag
					const partialTagMatch = this.buffer.match(/<\/?(?:[a-zA-Z_=-]*)$/);
					const partialJsonMatch = this.buffer.match(/\{[\s"]*(?:t|to|too|tool|n|na|nam|name)?$/);

					if (partialTagMatch) {
						output += this.buffer.slice(0, partialTagMatch.index!);
						this.buffer = partialTagMatch[0];
						break;
					} else if (partialJsonMatch) {
						output += this.buffer.slice(0, partialJsonMatch.index!);
						this.buffer = partialJsonMatch[0];
						break;
					} else {
						output += this.buffer;
						this.buffer = "";
					}
				}
			}
		}

		if (output) this.emittedAnyContent = true;
		return output;
	}

	public flush(): string {
		if (this.inToolBlock) {
			this.buffer = "";
			return "";
		}
		// Clean any trailing orphaned tags before flushing
		let out = this.buffer.replace(
			/<\/?(?:tool_call|function|parameter|read_file|write_to_file|execute_command|action|function_calls|function_call)(?:=[^>]*| [^>]*|>)/gi,
			"",
		);
		this.buffer = "";
		if (out) this.emittedAnyContent = true;
		return out;
	}

	public hasEmitted(): boolean {
		return this.emittedAnyContent;
	}
}

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

	public detectRepetitionLoop(
		text: string,
		maxCheckLength = 300,
	): { isLooping: boolean; pattern?: string; repetitions?: number } {
		if (!text || text.length < 20) return { isLooping: false };
		const tail = text.slice(-maxCheckLength);

		// Check pattern lengths from 2 to 30 characters
		for (let len = 2; len <= 30; len++) {
			if (tail.length < len * 4) continue;
			const pattern = tail.slice(-len);

			// Ignore patterns that only contain markdown formatting characters (dashes, pipes, spaces, colons, equal signs, asterisks, hashes)
			if (pattern.replace(/[-=*_|\s:#]/g, "").length === 0) continue;

			const expectedRepetitions = 4;
			const fullPattern = pattern.repeat(expectedRepetitions);
			if (tail.endsWith(fullPattern)) {
				return { isLooping: true, pattern, repetitions: expectedRepetitions };
			}
		}
		return { isLooping: false };
	}

	public stripRepetitionLoop(text: string, pattern?: string): string {
		if (!text || !pattern) return text;
		let trimmed = text;
		while (trimmed.endsWith(pattern)) {
			trimmed = trimmed.slice(0, -pattern.length);
		}
		return trimmed.trimEnd();
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
			yieldOnFileWrite?: boolean;
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
					found = squad.memberIds.includes("developer")
						? this.registry.getAgent("developer")
						: this.registry.getAgent("hephaestus");
				} else if (/architect|arquitecto|designer/i.test(mentionedName)) {
					found = squad.memberIds.includes("architect")
						? this.registry.getAgent("architect")
						: this.registry.getAgent("athena");
				} else if (/tester|auditor|qa|quality/i.test(mentionedName)) {
					found = squad.memberIds.includes("tester")
						? this.registry.getAgent("tester")
						: this.registry.getAgent("argos");
				} else if (/refactorer|refactor/i.test(mentionedName)) {
					found = this.registry.getAgent("refactorer");
				} else if (/devops|ops|deployment/i.test(mentionedName)) {
					found = this.registry.getAgent("devops");
				} else if (/debugger|debug/i.test(mentionedName)) {
					found = this.registry.getAgent("debugger");
				} else if (/researcher|investigador|search/i.test(mentionedName)) {
					found = this.registry.getAgent("pythia");
				} else if (/leader|lider|orchestrator/i.test(mentionedName)) {
					found = squad.memberIds.includes("architect")
						? this.registry.getAgent("architect")
						: this.registry.getAgent("hermes");
				}
			}
			if (found) targetAgentId = found.id;
		}

		// Determine starting agent (resuming after interactive question if applicable)
		let resolvedStartingAgentId = targetAgentId;
		if (
			!resolvedStartingAgentId &&
			((roomState as any).status === "waiting_user_input" || (roomState as any).lastAskingAgentId)
		) {
			const lastAsking = (roomState as any).lastAskingAgentId;
			if (lastAsking === "architect" || lastAsking === "athena" || lastAsking === "hermes") {
				const coderId = squad.memberIds.find((id) => id === "developer" || id === "hephaestus");
				if (coderId) resolvedStartingAgentId = coderId;
			}
			roomState.status = "active";
			delete (roomState as any).pendingUserQuestion;
			delete (roomState as any).lastAskingAgentId;
		}

		const activeAgentId = resolvedStartingAgentId || squad.leaderId || "hermes";
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

			// Format conversation history (clean speaker prefixes and raw JSON tool calls so peer agents don't imitate them)
			const historyContext = roomState.messages.slice(-10).map((m) => {
				const isUserOrSystem = m.senderId === "user" || m.senderId === "system";
				const cleanContent = m.content
					.replace(/^\s*\[?[A-Z][a-zA-Z0-9_\s-]+\s*\([^)]+\)\]?\s*:\s*/g, "")
					.replace(/\{\s*"(?:tool|name)"\s*:\s*"update_?todo_?list"[\s\S]*?\}\s*$/gi, "")
					.replace(/\b@?AxonHub\b/gi, "")
					.trim();
				return {
					role: isUserOrSystem ? "user" : "assistant",
					content: isUserOrSystem ? m.content : `@${m.senderName}: ${cleanContent}`,
				};
			});

			// When this is a delegated step (currentStep > 1), inject an actionable turn directive
			// instructing the specific specialist on its immediate duty so it doesn't repeat prior analysis.
			const activeHistory = [...historyContext];
			if (currentStep > 1) {
				const lastAgentMessage = roomState.messages[roomState.messages.length - 1];
				const lastAgentName = lastAgentMessage?.senderName || "tu compañero de escuadrón";

				let turnDirective = `@${currentAgent.name}: Has recibido el relevo de @${lastAgentName}. Continúa con tu especialidad técnica sin repetir lo ya expuesto.`;

				if (
					currentAgent.capabilities?.write ||
					currentAgent.id.includes("developer") ||
					currentAgent.id.includes("hephaestus")
				) {
					turnDirective = `@${currentAgent.name}: El arquitecto (@${lastAgentName}) ha definido el diseño y especificaciones. AHORA ES TU TURNO DE PROGRAMAR: NO repitas el análisis ni generes archivos .md de documentación. DEBES ESCRIBIR FÍSICAMENTE EN DISCO TODOS LOS ARCHIVOS DE CÓDIGO FUENTE REALES (.csproj, Program.cs, Form1.cs, Form1.Designer.cs, tests, etc.) en bloques ejecutables con su ruta exacta (ejemplo: \`\`\`xml <!-- Archivo: ... -->\`\`\` y \`\`\`csharp // Archivo: ...\`\`\` o \`\`\`file:...\`\`\`). Empieza a generar todos los archivos de código fuente de inmediato.`;
				} else if (
					currentAgent.capabilities?.terminal ||
					currentAgent.id.includes("tester") ||
					currentAgent.id.includes("argos")
				) {
					turnDirective = `@${currentAgent.name}: @${lastAgentName} ha generado la implementación. AHORA ES TU TURNO DE VALIDACIÓN Y CONTROL DE CALIDAD: Audita los archivos generados, escribe los tests necesarios en disco si aplica (\`\`\`csharp // Archivo: ...\`\`\`), y ejecuta los comandos de compilación/prueba en la terminal (por ejemplo: \`\`\`bash\\ndotnet build\\n\`\`\` o \`\`\`bash\\ndotnet test\\n\`\`\`). NO repitas el análisis previo.`;
				} else if (currentAgent.id.includes("devops")) {
					turnDirective = `@${currentAgent.name}: El equipo ha finalizado la implementación y auditoría. AHORA ES TU TURNO: Ejecuta los comandos git necesarios para sincronizar y publicar los cambios en el repositorio.`;
				}

				activeHistory.push({
					role: "user",
					content: turnDirective,
				});
			}

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
						activeHistory,
						currentAgent.model,
						currentAgent.temperature,
						systemPrompt,
					);

					if (typeof responseStream === "string") {
						fullResponseText = responseStream;
						const sanitized = this.sanitizeAgentOutput(fullResponseText);
						if (sanitized) {
							await onEvent({ type: "delta", agentId: currentAgent.id, delta: sanitized });
						}
					} else if (responseStream && Symbol.asyncIterator in responseStream) {
						const filter = new PantheonStreamFilter();

						for await (const chunk of responseStream) {
							fullResponseText += chunk;

							// Circuit breaker: detect degenerate LLM repetition loops (e.g. -🚀-🚀-🚀...)
							const loopCheck = this.detectRepetitionLoop(fullResponseText);
							if (loopCheck.isLooping && loopCheck.pattern) {
								console.warn(
									`[Pantheon Circuit Breaker] Repetition loop detected for @${currentAgent.name} (pattern: "${loopCheck.pattern}"). Breaking generation.`,
								);
								fullResponseText = this.stripRepetitionLoop(fullResponseText, loopCheck.pattern);
								break;
							}

							const cleanDelta = filter.feed(chunk);
							if (cleanDelta) {
								await onEvent({ type: "delta", agentId: currentAgent.id, delta: cleanDelta });
							}
						}

						const finalDelta = filter.flush();
						if (finalDelta) {
							await onEvent({ type: "delta", agentId: currentAgent.id, delta: finalDelta });
						}

						// If the agent only emitted tool calls (like update_todo_list) without chat text,
						// format the todo plan into Markdown and emit so the user sees the plan in chat
						if (!filter.hasEmitted()) {
							const sanitized = this.sanitizeAgentOutput(fullResponseText);
							if (sanitized && !sanitized.includes("<ask_followup_question>")) {
								await onEvent({ type: "delta", agentId: currentAgent.id, delta: sanitized });
							}
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

			// Check if agent requested user action / interactive decision
			const userActionReq = this.detectUserActionRequired(fullResponseText);
			if (userActionReq) {
				roomState.status = "waiting_user_input";
				(roomState as any).pendingUserQuestion = userActionReq;
				(roomState as any).lastAskingAgentId = currentAgent.id;

				await onEvent({
					type: "user_question",
					agentId: currentAgent.id,
					question: userActionReq.question,
					options: userActionReq.options,
				});

				// Pause squad execution: empty the queue so peer agents don't execute prematurely
				agentsQueue.length = 0;
				break;
			}

			// Yield on file write when requested (e.g. Andy Code / IDE client waiting for approval)
			if (
				options.yieldOnFileWrite &&
				actionResultsText &&
				(actionResultsText.includes("Se escribió el archivo") || actionResultsText.includes("Acción ejecutada"))
			) {
				(roomState as any).pendingFileApproval = true;
				(roomState as any).lastActionResultsText = actionResultsText;
				agentsQueue.length = 0;
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
					if (count < 1 && !alreadyInQueue) {
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
		let effectiveCwd = cwd;
		let effectiveCmd = cmd;

		// Si el comando empieza con cd "..." && <cmd>, resolver directorio de forma inteligente
		const cdMatch = cmd.match(/^cd\s+["']?([^"']+)["']?\s*(?:&&|;)\s*(.*)$/i);
		if (cdMatch) {
			const targetDir = path.isAbsolute(cdMatch[1]) ? path.resolve(cdMatch[1]) : path.resolve(cwd, cdMatch[1]);
			const remainingCmd = cdMatch[2].trim();
			if (existsSync(targetDir)) {
				effectiveCwd = targetDir;
				effectiveCmd = remainingCmd;
			} else {
				// El subdirectorio indicado por el LLM no existe físicamente; ejecutar el comando en la raíz del proyecto
				effectiveCmd = remainingCmd;
			}
		}

		return new Promise((resolve) => {
			exec(
				effectiveCmd,
				{ cwd: effectiveCwd, timeout: 45000, maxBuffer: 1024 * 1024 * 5 },
				(error, stdout, stderr) => {
					resolve({
						stdout: (stdout || "").toString(),
						stderr: (stderr || "").toString(),
						exitCode: error ? (error.code ?? 1) : 0,
					});
				},
			);
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

		// Pattern 3: ```lang // filepath: path or ```lang // Archivo: path or ```xml <!-- Archivo: path -->
		const p3 =
			/```[a-zA-Z0-9_-]+\s*(?:\/\/|#|<!--)\s*(?:filepath|file|archivo|ruta|filename)?:?\s*([^\r\n>]+?)(?:\s*-->)?\r?\n([\s\S]*?)```/gi;
		let m3 = p3.exec(text);
		while (m3 !== null) {
			register(m3[1], m3[2], "commented-lang-tag");
			m3 = p3.exec(text);
		}

		// Pattern 4: Inside code block, first line is a comment with filename (// or # or <!--)
		const p4 =
			/```(?:[a-zA-Z0-9_-]*)\r?\n(?:\/\/|#|<!--)\s*(?:filepath|file|archivo|ruta|filename)?\s*:?\s*([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)(?:\s*-->)?\r?\n([\s\S]*?)```/gi;
		let m4 = p4.exec(text);
		while (m4 !== null) {
			register(m4[1], m4[2], "first-line-comment");
			m4 = p4.exec(text);
		}

		// Pattern 5: Preceding Markdown header with filename (e.g. ### 1. Archivo: Form1.cs or #### Form1.cs or **Archivo: Form1.cs**)
		const p5 =
			/(?:(?:#{1,6}|\*\*)\s*(?:\d+[.)]\s*)?(?:[Aa]rchivo|[Ff]ile|[Cc]rear|[Ii]mplementar)?\s*[:`"']*\s*([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)[`"':*]*\s*\r?\n+)\s*```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)```/gi;
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

		// Pattern 7: JSON tool calls: {"name": "write_to_file", "arguments": {"filePath": "...", "content": "..."}}
		const p7 = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})\s*\}/g;
		let m7 = p7.exec(text);
		while (m7 !== null) {
			try {
				const toolName = m7[1].toLowerCase();
				if (toolName === "write_to_file" || toolName === "write" || toolName === "file_write") {
					const args = JSON.parse(m7[2]);
					const filePath = args.filePath || args.path || args.file || args.target;
					const content = args.content || args.code || "";
					if (filePath && content) {
						register(filePath, content, "json-tool-write");
					}
				}
			} catch {}
			m7 = p7.exec(text);
		}

		// Pattern 8: XML tool calls: <write_to_file><path>...</path><content>...</content></write_to_file>
		const p8 =
			/<write_to_file>\s*<(?:filePath|path)>([^<]+)<\/(?:filePath|path)>\s*<content>([\s\S]*?)<\/content>\s*<\/write_to_file>/gi;
		let m8 = p8.exec(text);
		while (m8 !== null) {
			register(m8[1].trim(), m8[2], "xml-tool-write");
			m8 = p8.exec(text);
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

		// 0. Todo List Update (if the agent emitted update_todo_list JSON or XML)
		let todosData: any[] | null = null;
		const todoJsonRegex =
			/\{\s*"(?:tool|name)"\s*:\s*"update_?todo_?list"\s*,\s*"(?:todos|parameters)"\s*:\s*([\s\S]*?)\s*\}/i;
		const todoMatch = text.match(todoJsonRegex);
		if (todoMatch) {
			try {
				let rawData: any = null;
				try {
					const fullObj = JSON.parse(todoMatch[0]);
					rawData = fullObj.todos || (fullObj.parameters && fullObj.parameters.todos);
				} catch {
					rawData = JSON.parse(todoMatch[1]);
				}
				if (Array.isArray(rawData)) {
					todosData = rawData;
				}
			} catch {}
		} else {
			const todoXmlRegex =
				/<function(?:=update_todo_list| name=["']update_todo_list["'])>[\s\S]*?<parameter(?:=todos| name=["']todos["'])>([\s\S]*?)<\/parameter>/i;
			const xmlMatch = text.match(todoXmlRegex);
			if (xmlMatch) {
				try {
					const parsed = JSON.parse(xmlMatch[1].trim());
					if (Array.isArray(parsed)) {
						todosData = parsed;
					}
				} catch {}
			}
		}

		if (Array.isArray(todosData)) {
			const normalizedTodos = todosData
				.map((item: any) => {
					if (typeof item === "string") {
						return { content: item.trim(), status: "pending" };
					}
					const content = String(
						item.content ||
						item.task ||
						item.title ||
						item.description ||
						item.text ||
						item.name ||
						item.step ||
						item.todo ||
						item.label ||
						item.summary ||
						item.active_form ||
						item.message ||
						(typeof item.action === "string" ? item.action : "") ||
						""
					).trim();
					const statusLower = String(item.status || "").toLowerCase();
					const status =
						statusLower === "completed" || statusLower === "done" || item.completed === true
							? "completed"
							: statusLower === "in_progress" || statusLower === "running" || item.in_progress === true
								? "in_progress"
								: "pending";
					return { ...item, content, status };
				})
				.filter((item: any) => Boolean(item.content));

			await onEvent({
				type: "todo_update" as any,
				agentId: agent.id,
				todos: normalizedTodos,
			});
		}

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
						input: { path: rawPath, lines: lineCount, bytes: byteCount, content },
					});

					const resultMsg = `✓ Archivo "${rawPath}" creado/modificado exitosamente (${lineCount} líneas, ${byteCount} bytes en disco).`;
					await onEvent({
						type: "tool_result",
						agentId: agent.id,
						tool: "write",
						target: rawPath,
						output: resultMsg,
						content,
					} as any);

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
						fullCmd.startsWith("git") ||
						fullCmd.startsWith("cd "))
				) {
					commandsToRun.push(fullCmd);
				}
				m2 = bashPlainRegex.exec(text);
			}

			// Pattern 3: JSON tool calls: {"name": "execute_command" | "run_command" | "terminal", "arguments": {"command": "..."}}
			const jsonCmdRegex =
				/\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})\s*\}/g;
			let m3 = jsonCmdRegex.exec(text);
			while (m3 !== null) {
				try {
					const toolName = m3[1].toLowerCase();
					if (
						toolName === "execute_command" ||
						toolName === "run_command" ||
						toolName === "terminal" ||
						toolName === "bash" ||
						toolName === "cmd"
					) {
						const args = JSON.parse(m3[2]);
						const cmd = (args.command || args.cmd || "").trim();
						if (cmd && !commandsToRun.includes(cmd)) {
							commandsToRun.push(cmd);
						}
					}
				} catch {}
				m3 = jsonCmdRegex.exec(text);
			}

			// Pattern 4: XML tool calls: <execute_command><command>...</command></execute_command>
			const xmlCmdRegex = /<execute_command>\s*<command>([\s\S]*?)<\/command>\s*<\/execute_command>/gi;
			let m4 = xmlCmdRegex.exec(text);
			while (m4 !== null) {
				const cmd = m4[1].trim();
				if (cmd && !commandsToRun.includes(cmd)) {
					commandsToRun.push(cmd);
				}
				m4 = xmlCmdRegex.exec(text);
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

		// 3. File Read Request Execution (markdown blocks, JSON tools, XML tools)
		const filesToRead: string[] = [];

		const readBlockRegex = /(?:```(?:read|file_read):\s*([^\r\n]+)```|\[read\(file_path=['"]?([^'"]+)['"]?\)\])/gi;
		let readMatch = readBlockRegex.exec(text);
		while (readMatch !== null) {
			const tf = (readMatch[1] || readMatch[2] || "").trim();
			if (tf && !filesToRead.includes(tf)) filesToRead.push(tf);
			readMatch = readBlockRegex.exec(text);
		}

		// JSON tool calls for read_file: {"name": "read_file", "arguments": {"filePath": "..."}}
		const jsonReadRegex =
			/\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})\s*\}/g;
		let jrm = jsonReadRegex.exec(text);
		while (jrm !== null) {
			try {
				const name = jrm[1].toLowerCase();
				if (name === "read_file" || name === "read" || name === "file_read") {
					const args = JSON.parse(jrm[2]);
					const tf = (args.filePath || args.path || args.file || "").trim();
					if (tf && !filesToRead.includes(tf)) filesToRead.push(tf);
				}
			} catch {}
			jrm = jsonReadRegex.exec(text);
		}

		// XML tool calls: <read_file><path>...</path></read_file>
		const xmlReadRegex = /<read_file>\s*<(?:filePath|path)>([\s\S]*?)<\/(?:filePath|path)>\s*<\/read_file>/gi;
		let xrm = xmlReadRegex.exec(text);
		while (xrm !== null) {
			const tf = xrm[1].trim();
			if (tf && !filesToRead.includes(tf)) filesToRead.push(tf);
			xrm = xmlReadRegex.exec(text);
		}

		// Function-style tool calls: <function=read_file><parameter=path>...</parameter></function>
		const fnReadRegex =
			/<function(?:=read_file| name=["']read_file["'])>[\s\S]*?<parameter(?:=file_path|=path| name=["']file_path["']| name=["']path["'])>([\s\S]*?)<\/parameter>/gi;
		let frm = fnReadRegex.exec(text);
		while (frm !== null) {
			const tf = frm[1].trim();
			if (tf && !filesToRead.includes(tf)) filesToRead.push(tf);
			frm = fnReadRegex.exec(text);
		}

		for (const targetFile of filesToRead) {
			try {
				let fullPath = path.isAbsolute(targetFile) ? path.resolve(targetFile) : path.resolve(targetCwd, targetFile);

				// Fallback: If targetFile has prefix matching parts of targetCwd, try resolving relative basename
				if (!existsSync(fullPath)) {
					const baseOnly = path.basename(targetFile);
					const altPath = path.resolve(targetCwd, baseOnly);
					if (existsSync(altPath)) {
						fullPath = altPath;
					}
				}

				if (!this.isPathSafe(fullPath, targetCwd)) {
					const safetyMsg = `🛡️ [Guardrail de Seguridad]: Lectura de archivo fuera del directorio del proyecto bloqueada: "${targetFile}".`;
					await onEvent({
						type: "error",
						agentId: agent.id,
						error: safetyMsg,
					});
					extraResultsText += `\n\n> ⚠️ **Bloqueo de Seguridad**: Se impidió leer \`${targetFile}\` porque excede los límites del proyecto.`;
					continue;
				}

				if (existsSync(fullPath)) {
					const content = readFileSync(fullPath, "utf-8");
					const ext = (path.extname(fullPath).slice(1) || "text").toLowerCase();
					await onEvent({
						type: "tool_start",
						agentId: agent.id,
						tool: "read",
						target: targetFile,
						input: { path: targetFile },
					});
					await onEvent({
						type: "tool_result",
						agentId: agent.id,
						tool: "read",
						target: targetFile,
						output: `✓ Lectura de ${targetFile} (${content.split(/\r?\n/).length} líneas)`,
					});
					extraResultsText += `\n\n### 📖 Contenido de \`${path.basename(fullPath)}\`:\n\`\`\`${ext}\n${content.slice(0, 4000)}\n\`\`\``;
				} else {
					extraResultsText += `\n\n> ℹ️ Archivo \`${targetFile}\` no encontrado en el proyecto activo.`;
				}
			} catch {}
		}

		// 4. Graft Code Graph Actions (AST Mapping, Blast Radius, Skeletons, Callers, Diagnostics, Wiring export)
		const graftEngine =
			targetCwd && targetCwd !== this.cwd ? new GraftEngine(targetCwd) : this.graft;

		// Pattern: ```graft:map or <graft_map> or json graft_map
		if (
			/```graft:\s*map\b/i.test(text) ||
			/<graft_map>/i.test(text) ||
			/"name"\s*:\s*"graft_map"/i.test(text)
		) {
			try {
				const mapStr = await graftEngine.map();
				await onEvent({
					type: "tool_start",
					agentId: agent.id,
					tool: "graft_map",
					target: targetCwd,
				});
				await onEvent({
					type: "tool_result",
					agentId: agent.id,
					tool: "graft_map",
					target: targetCwd,
					output: mapStr,
				});
				extraResultsText += `\n\n### 🏛️ Mapa Arquitectónico Graft (AST):\n\`\`\`text\n${mapStr.slice(0, 3000)}\n\`\`\``;
			} catch (err: any) {
				extraResultsText += `\n\n> ✗ Error al generar mapa Graft: ${err.message || String(err)}`;
			}
		}

		// Pattern: ```graft:blast <target> or <graft_blast><target>...</target></graft_blast>
		const blastRegex =
			/(?:```graft:\s*blast\s+([^\r\n]+)```|<graft_blast>\s*<target>([\s\S]*?)<\/target>\s*<\/graft_blast>)/gi;
		let blastMatch = blastRegex.exec(text);
		while (blastMatch !== null) {
			const target = (blastMatch[1] || blastMatch[2] || "").trim();
			if (target) {
				try {
					const blastRes = await graftEngine.blast(target);
					await onEvent({
						type: "tool_start",
						agentId: agent.id,
						tool: "graft_blast",
						target,
					});
					const formattedBlast = `- Dependientes directos: ${blastRes.directDependents.length}\n- Dependientes indirectos: ${blastRes.indirectDependents.length}\n- Total de archivos impactados: ${blastRes.totalImpactedFiles}\n${blastRes.directDependents.map((d) => `  * ${d}`).join("\n")}`;
					await onEvent({
						type: "tool_result",
						agentId: agent.id,
						tool: "graft_blast",
						target,
						output: formattedBlast,
					});
					extraResultsText += `\n\n### 💥 Radio de Impacto Graft (Blast Radius) para \`${target}\`:\n${formattedBlast}`;
				} catch {}
			}
			blastMatch = blastRegex.exec(text);
		}

		// Pattern: ```graft:skeleton <file> or <graft_skeleton><filePath>...</filePath></graft_skeleton>
		const skelRegex =
			/(?:```graft:\s*skeleton\s+([^\r\n]+)```|<graft_skeleton>\s*<filePath>([\s\S]*?)<\/filePath>\s*<\/graft_skeleton>)/gi;
		let skelMatch = skelRegex.exec(text);
		while (skelMatch !== null) {
			const tf = (skelMatch[1] || skelMatch[2] || "").trim();
			if (tf) {
				try {
					const skel = await graftEngine.skeleton(tf);
					await onEvent({
						type: "tool_start",
						agentId: agent.id,
						tool: "graft_skeleton",
						target: tf,
					});
					await onEvent({
						type: "tool_result",
						agentId: agent.id,
						tool: "graft_skeleton",
						target: tf,
						output: skel,
					});
					extraResultsText += `\n\n### 🦴 Esqueleto Estructural Graft de \`${path.basename(tf)}\`:\n\`\`\`typescript\n${skel.slice(0, 3000)}\n\`\`\``;
				} catch {}
			}
			skelMatch = skelRegex.exec(text);
		}

		// Pattern: ```graft:diagnostics or <graft_diagnostics>
		if (
			/```graft:\s*diagnostics\b/i.test(text) ||
			/<graft_diagnostics>/i.test(text) ||
			/"name"\s*:\s*"graft_diagnostics"/i.test(text)
		) {
			try {
				const diags = await graftEngine.diagnostics();
				const summary = `- Archivos analizados: ${diags.totalFilesChecked}\n- Errores sintácticos/estructurales: ${diags.errorCount}\n- Advertencias: ${diags.warningCount}\n- Estado: ${diags.clean ? "Limpio" : "Requiere atención"}`;
				await onEvent({
					type: "tool_start",
					agentId: agent.id,
					tool: "graft_diagnostics",
					target: targetCwd,
				});
				await onEvent({
					type: "tool_result",
					agentId: agent.id,
					tool: "graft_diagnostics",
					target: targetCwd,
					output: summary,
				});
				extraResultsText += `\n\n### 🩺 Diagnóstico Estático Graft (AST):\n${summary}`;
			} catch {}
		}

		// Pattern: ```graft:build or ```graft:wiring
		if (
			/```graft:\s*(?:build|wiring|export)\b/i.test(text) ||
			/<graft_build>/i.test(text)
		) {
			try {
				const wiringPath = await graftEngine.exportWiring();
				await onEvent({
					type: "tool_start",
					agentId: agent.id,
					tool: "graft_build",
					target: wiringPath,
				});
				await onEvent({
					type: "tool_result",
					agentId: agent.id,
					tool: "graft_build",
					target: wiringPath,
					output: `Graft wiring v0.16.0 exportado a ${wiringPath}`,
				});
				extraResultsText += `\n\n> 🌐 **Graft 0.16.0 Build**: Se generó el grafo de cableado \`graft/.graph/wiring.json\` con éxito.`;
			} catch {}
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
			fileList = scanned.slice(0, 80).join("\n");
			if (scanned.length === 0) {
				fileList = "(Directorio vacío o recién inicializado)";
			}

			// Read key manifest files
			if (manifestFiles.length > 0) {
				const manifests: string[] = [];
				for (const mf of manifestFiles.slice(0, 3)) {
					try {
						const rel = path.relative(targetCwd, mf).replace(/\\/g, "/");
						const content = readFileSync(mf, "utf-8").trim();
						manifests.push(`### 📦 ${rel}\n\`\`\`xml\n${content.slice(0, 1000)}\n\`\`\``);
					} catch {}
				}
				manifestSummary = manifests.join("\n\n");
			}

			// Extract public interfaces, models, classes and documentation
			const snippets: string[] = [];
			let currentSnippetsChars = 0;
			const MAX_SNIPPETS_CHARS = 30000; // Strict budget (~7,500 tokens) to avoid OmniRoute 503 "Structurally heavy" load shedding

			// 1. Decode Excel / protocol documentation files
			if (docFiles.length > 0) {
				for (const df of docFiles.slice(0, 2)) {
					if (currentSnippetsChars >= MAX_SNIPPETS_CHARS) break;
					try {
						const xlsxText = await this.extractXlsxText(df);
						if (xlsxText) {
							const snippet = xlsxText.slice(0, 5000);
							snippets.push(snippet);
							currentSnippetsChars += snippet.length;
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
				for (const sf of sourceFiles.slice(0, 15)) {
					if (currentSnippetsChars >= MAX_SNIPPETS_CHARS) break;
					try {
						const rel = path.relative(targetCwd, sf).replace(/\\/g, "/");
						const content = readFileSync(sf, "utf-8");
						const ext = path.extname(sf).slice(1) || "cs";

						// If file is small (< 4KB), include full content for context
						if (content.length <= 4000) {
							const snippet = `### 🔍 ${rel} (Código Completo):\n\`\`\`${ext}\n${content}\n\`\`\``;
							snippets.push(snippet);
							currentSnippetsChars += snippet.length;
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
								const snippet = `### 🔍 ${rel} (Estructura/Signaturas públicas y constantes):\n\`\`\`${ext}\n${relevantLines.slice(0, 60).join("\n")}\n\`\`\``;
								snippets.push(snippet);
								currentSnippetsChars += snippet.length;
							} else {
								const snippet = `### 🔍 ${rel} (Muestra inicial):\n\`\`\`${ext}\n${content.slice(0, 1500)}\n\`\`\``;
								snippets.push(snippet);
								currentSnippetsChars += snippet.length;
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
3. **PROHIBICIÓN ABSOLUTA DE GENERAR JSON O PSEUDO-TAGS DE HERRAMIENTAS COMO TEXTO**: NUNCA escribas JSON en el chat como {"tool":"update_todo_list"...}, {"name":"..."}, ni etiquetas especiales como \`<|tool_call_start|>\`, \`<|tool_call_end|>\`, \`<tool_call>\`, \`<arg_key>\`, \`<arg_value>\`, \`<action>\`. Toda planificación de tareas o fases debe redactarse en viñetas Markdown elegantes y legibles en Español (ej: "- 🔄 **Fase 1**: ...", "- ⏳ **Fase 2**: ...").
4. **PROHIBICIÓN DE PREFIJOS DE HABLANTE**: NUNCA comiences tu respuesta escribiendo "[Architect (...)]:" ni tu propio nombre o rol al inicio de tu mensaje. Empieza directamente con el contenido técnico en Español.
5. **Acceso Directo y Total al Proyecto Activo**: Ya te encuentras ejecutando dentro del espacio de trabajo del proyecto activo ("${projectContext?.name || path.basename(this.cwd)}" en "${projectContext?.path || this.cwd}"). Toda la estructura de archivos, clases, interfaces públicas, manifiestos (.csproj / .sln), modelos C# y documentación técnica de protocolos (incluyendo hojas Excel .xlsx decodificadas) ya están completamente leídos e incluidos arriba en tu contexto.
6. **PROHIBICIÓN ESTRICTA DE DECIR "NO PUEDO ACCEDER", "NECESITO LOS ARCHIVOS" O PEDIR QUE EL USUARIO COMPARTA CÓDIGO**: NUNCA digas "NO PUEDO Acceder a tu Filesystem", "Necesito los Archivos Fuente para Proceder", "no tengo acceso al código" ni pidas que el usuario comparta archivos o ejecute "Get-ChildItem", "tree /F", "dir". Tienes el código fuente C# completo arriba en "Interfaces y Estructuras Públicas del Código Fuente", las tablas en "Especificación de Protocolo desde Archivo Excel" y la estructura en "Árbol de Archivos del Proyecto". Realiza el análisis comparativo, auditoría, diseño o implementación de inmediato con los datos provistos.
7. **Programación Inmediata Sin Preguntas Retóricas**: No pidas confirmación para empezar ni preguntes "¿deseas que proceda?". Entrega de inmediato el diseño arquitectónico y el CÓDIGO FUENTE COMPLETO implementado.
8. **Tratamiento al Usuario**: Trata al usuario con profesionalismo y respeto. NUNCA inventes pseudónimos, apodos ni nombres ficticios como "AxonHub" para referirte a él; dirígete a él de manera neutral o por el nombre que él mismo indique.
9. **Especialización Inmediata en tu Escuadrón**:\n${specializationBullets}`;

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
5. PROHIBICIÓN TERMINANTE: NO delegues a @Tester ni a ningún otro compañero sin haber creado primero los archivos de código. Si no generas bloques de archivo ejecutables, el proyecto no se actualizará y habrás fallado tu tarea.
6. PROHIBICIÓN TERMINANTE DE GENERAR PSEUDO-HERRAMIENTAS O ETIQUETAS XML: NUNCA escribas <tool_call>, <function...>, <read_file>, ni digas "primero necesito leer los archivos existentes". Toda la información, clases, interfaces y modelos ya están arriba en tu contexto. Tu ÚNICO deber es escribir de inmediato los bloques de código completos \`\`\`file:ruta/archivo.ext ...\`\`\`.`
			: "";

		const architectMandate =
			agent.id.includes("architect") || agent.id.includes("athena")
				? `\n\n# 🏛️ DIRECTIVA DE ARQUITECTURA PARA @${agent.name.toUpperCase()}
1. Diseña la arquitectura técnica, patrones, interfaces y especifica con precisión los nombres de archivos y rutas que deben implementarse.
2. Si te falta información crítica o datos del usuario (como hojas Excel, especificaciones de protocolos o confirmación de opciones), formula una sección clara titulada "🚨 **Acción Necesaria del Usuario**" con opciones concretas (1. **Opción A**: ..., 2. **Opción B**: ...) y TERMINA TU MENSAJE esperando su respuesta. NO delegues a @Developer hasta que el usuario elija su opción.
3. Si el diseño está completo y no se requiere información del usuario, delega a @Developer ordenándole explícitamente qué archivos de código debe escribir en disco.`
				: "";

		const testerMandate =
			agent.id.includes("tester") || agent.id.includes("argos")
				? `\n\n# 🧪 DIRECTIVA DE AUDITORÍA Y QA PARA @${agent.name.toUpperCase()}
1. Audita el código que acaba de escribir @Developer.
2. Si creas tests unitarios, escríbelos en disco usando \`\`\`csharp // Archivo: Tests/Form1Tests.cs ... \`\`\`
3. Si deseas compilar o probar, ejecuta comandos de terminal usando \`\`\`bash\ndotnet test\n\`\`\` o \`\`\`bash\ndotnet build\n\`\`\`.
4. NO repitas el diseño del arquitecto ni el código del desarrollador.
5. Si delegas al especialista de despliegue, di simplemente "@DevOps: Por favor sincroniza los cambios con el repositorio Git". PROHIBICIÓN TERMINANTE: NO generes viñetas vacías repetitivas ni bucles de emojis.`
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

		const debuggerMandate = agent.id.includes("debugger")
			? `\n\n# 🐞 DIRECTIVA DE DIAGNÓSTICO Y COMPILACIÓN PARA @${agent.name.toUpperCase()}
1. Si el usuario te pide compilar o diagnosticar el proyecto, ejecuta el comando en la terminal real usando:
   \`\`\`bash
   dotnet build
   \`\`\`
   (o \`\`\`bash\ndotnet test\n\`\`\` para pruebas).
2. El sistema ejecutará el comando directamente en el proyecto y te devolverá el reporte exacto de compilación.
3. Si la compilación tiene errores, analiza cada archivo y número de línea, explica la causa raíz y escribe el fix o dile a @Developer cómo solucionarlo.`
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
${projectSection}${graftSection}${delegationSection}${writerMandate}${architectMandate}${testerMandate}${devopsMandate}${debuggerMandate}${squadCollaborationProtocol}${actionProtocol}${operationalRules}`;
	}

	private sanitizeAgentOutput(text: string): string {
		if (!text) return "";
		let cleaned = text
			// Strip leading speaker prefix like [Architect (Software Architect & System Designer)]:
			.replace(/^\s*\[?[A-Z][a-zA-Z0-9_\s-]+\s*\([^)]+\)\]?\s*:\s*/g, "");

		const getTodoItemText = (item: any): string => {
			if (typeof item === "string") return item.trim();
			if (!item || typeof item !== "object") return "";
			return String(
				item.content ||
				item.task ||
				item.title ||
				item.description ||
				item.text ||
				item.name ||
				item.step ||
				item.todo ||
				item.label ||
				item.summary ||
				item.active_form ||
				item.message ||
				(typeof item.action === "string" ? item.action : "") ||
				""
			).trim();
		};

		const getTodoItemStatus = (item: any): string => {
			if (!item || typeof item !== "object") return "⏳";
			const status = String(item.status || "").toLowerCase();
			if (status === "completed" || status === "done" || item.completed === true) {
				return "✅";
			}
			if (status === "in_progress" || status === "running" || item.in_progress === true) {
				return "🔄";
			}
			return "⏳";
		};

		const formatTodoList = (todosData: any): string => {
			if (typeof todosData === "string") {
				return todosData
					.split(/\r?\n/)
					.map((l) => l.trim())
					.filter(Boolean)
					.map((l) => {
						if (l.match(/^[-*]?\s*\[[xX]\]/)) return `- ✅ **${l.replace(/^[-*]?\s*\[[xX]\]\s*/, "")}**`;
						if (l.match(/^[-*]?\s*\[[-~]\]/)) return `- 🔄 **${l.replace(/^[-*]?\s*\[[-~]\]\s*/, "")}**`;
						if (l.match(/^[-*]?\s*\[\s*\]/)) return `- ⏳ **${l.replace(/^[-*]?\s*\[\s*\]\s*/, "")}**`;
						return l.startsWith("-") ? l : `- ${l}`;
					})
					.join("\n");
			}
			if (Array.isArray(todosData)) {
				return todosData
					.map((item: any) => {
						const todoText = getTodoItemText(item);
						if (!todoText) return null;
						const icon = getTodoItemStatus(item);
						return `- ${icon} **${todoText}**`;
					})
					.filter(Boolean)
					.join("\n");
			}
			return "";
		};

		// Convert XML update_todo_list to clean Markdown list
		const todoXmlRegex =
			/<(?:tool_call>\s*)?<function(?:=update_todo_list| name=["']update_todo_list["'])>[\s\S]*?<parameter(?:=todos| name=["']todos["'])>([\s\S]*?)<\/parameter>[\s\S]*?(?:<\/function>\s*<\/tool_call>|<\/tool_call>|<\/function>|$)/i;
		const xmlTodoMatch = cleaned.match(todoXmlRegex);
		if (xmlTodoMatch) {
			try {
				let rawTodos = xmlTodoMatch[1].trim();
				let parsedTodos: any = null;
				try {
					parsedTodos = JSON.parse(rawTodos);
				} catch {
					parsedTodos = rawTodos;
				}
				const formattedList = formatTodoList(parsedTodos);
				if (formattedList) {
					cleaned = cleaned.replace(xmlTodoMatch[0], `📋 **Plan de Trabajo del Escuadrón**:\n\n${formattedList}\n\n`);
				} else {
					cleaned = cleaned.replace(xmlTodoMatch[0], "");
				}
			} catch {}
		}

		// Convert update_todo_list JSON to clean Markdown list
		const todoJsonRegex =
			/\{\s*"(?:tool|name)"\s*:\s*"update_?todo_?list"\s*,\s*"(?:todos|parameters)"\s*:\s*([\s\S]*?)\s*\}/i;
		const todoMatch = cleaned.match(todoJsonRegex);
		if (todoMatch) {
			try {
				let rawData: any = null;
				try {
					const fullObj = JSON.parse(todoMatch[0]);
					rawData = fullObj.todos || (fullObj.parameters && fullObj.parameters.todos);
				} catch {
					rawData = JSON.parse(todoMatch[1]);
				}
				const formattedList = formatTodoList(rawData);
				if (formattedList) {
					cleaned = cleaned.replace(todoMatch[0], `📋 **Plan de Trabajo del Escuadrón**:\n\n${formattedList}\n\n`);
				} else {
					cleaned = cleaned.replace(todoMatch[0], "");
				}
			} catch {}
		}

		return cleaned
			.replace(/<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>/gi, "")
			.replace(/<\|tool_call_start\|>[\s\S]*$/gi, "")
			.replace(/<\|im_start\|>[\s\S]*?<\|im_end\|>/gi, "")
			.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "")
			.replace(/<tool_call>[\s\S]*$/gi, "")
			.replace(/<ask_followup_question>[\s\S]*?<\/ask_followup_question>/gi, "")
			.replace(/<ask_followup_question>[\s\S]*$/gi, "")
			.replace(/<question>[\s\S]*?<\/question>/gi, "")
			.replace(/<question>[\s\S]*$/gi, "")
			.replace(/<follow_up>[\s\S]*?<\/follow_up>/gi, "")
			.replace(/<follow_up>[\s\S]*$/gi, "")
			.replace(/<function=[^>]+>[\s\S]*?<\/function>/gi, "")
			.replace(/<parameter=[^>]+>[\s\S]*?<\/parameter>/gi, "")
			.replace(
				/\{\s*"name"\s*:\s*"(?:read_file|execute_command|write_to_file|run_command|terminal|read|write)"\s*,\s*"arguments"\s*:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*\}/gi,
				"",
			)
			.replace(/\[read\(file_path=[^\]]*\)\]/gi, "")
			.replace(/\[write\(file_path=[^\]]*\)\]/gi, "")
			.replace(/\[execute\(command=[^\]]*\)\]/gi, "")
			.replace(/<execute_command>[\s\S]*?<\/execute_command>/gi, "")
			.replace(/<read_file>[\s\S]*?<\/read_file>/gi, "")
			// Strip any leftover orphaned tags like </tool_call>, </function>, </parameter>, etc.
			.replace(/<\/?(?:tool_call|function|parameter|tool_call_start|tool_call_end|function_calls|function_call|arg_key|arg_value|action)(?:=[^>]*|>)/gi, "")
			.replace(/\n{3,}/g, "\n\n")
			.trim();
	}

	private detectPeerDelegations(text: string, fromAgentId: string, squad?: PantheonSquad): PantheonTaskDelegation[] {
		const delegations: PantheonTaskDelegation[] = [];
		const allowedAgents = squad
			? this.registry.getAgents().filter((a) => squad.memberIds.includes(a.id))
			: this.registry.getAgents();

		for (const a of allowedAgents) {
			if (a.id === fromAgentId) continue;
			// Ignore pure acknowledgements like "Entendido @Architect" if no task is being delegated
			const isAckOnly = new RegExp(
				`(?:entendido|gracias|de acuerdo|recibido|ok|saludos|perfecto)\\s*,?\\s*@(?:${a.name}|${a.id})\\b`,
				"i",
			).test(text);
			if (isAckOnly) {
				const hasActionableInstruction = new RegExp(
					`@(?:${a.name}|${a.id})\\b[^.]*(?:implementa|crea|haz|corrige|revisa|compila|valida|ejecuta|procede|delega)`,
					"i",
				).test(text);
				if (!hasActionableInstruction) continue;
			}
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

	public detectUserActionRequired(text: string): UserActionRequired | null {
		if (!text) return null;

		const options: Array<{ text: string }> = [];
		let question = "";
		let rawMatch = "";

		// 1. Direct XML tag check (robust to unclosed tags and truncated outputs)
		if (text.includes("<ask_followup_question>") || text.includes("<question>")) {
			rawMatch = "XML_ask_followup";
			const qMatch = text.match(/<question>([\s\S]*?)(?:<\/question>|<\/ask_followup_question>|$)/i);
			if (qMatch) {
				question = qMatch[1].trim();
			} else {
				const afterTag = text.split(/<ask_followup_question>/i)[1] || "";
				question = afterTag.trim();
			}

			const followUpMatch = text.match(/<follow_up>([\s\S]*?)(?:<\/follow_up>|<\/ask_followup_question>|$)/i);
			if (followUpMatch) {
				try {
					const parsed = JSON.parse(followUpMatch[1].trim());
					if (Array.isArray(parsed)) {
						for (const item of parsed) {
							const optText =
								typeof item === "string" ? item : item.text || item.answer || JSON.stringify(item);
							if (optText) options.push({ text: optText });
						}
					}
				} catch {}
			}
		}

		// 2. If no options extracted from XML yet, parse options from Header pattern or text
		if (options.length === 0) {
			const headerRegex =
				/(?:🚨|🎯|📌|❓|⚠️)?\s*(?:\*{1,3})?(?:Acci[oó]n\s+(?:Necesaria|Requerida)|Pr[oó]ximos\s+Pasos|Pregunta|Confirmaci[oó]n\s+Requerida|Decisi[oó]n\s+Requerida)(?:\s+(?:del|para\s+el|por\s+el|de)\s+Usuario)?(?:\*{1,3})?:?([^\n\r]*)/i;
			const match = text.match(headerRegex);

			let sectionText = "";

			if (match) {
				rawMatch = match[0];
				const startIndex = match.index! + match[0].length;
				const remaining = text.slice(startIndex);
				const stopMatch = remaining.match(
					/(?:\n\s*---|\n\s*#{1,4}\s+|\n\s*📌\s*|\n\s*(?:\*{1,2})?(?:Decisi[oó]n|Procedo)\b)/i,
				);
				sectionText = (stopMatch ? remaining.slice(0, stopMatch.index) : remaining).trim();
			} else {
				// 3. Fallback: check if the text ends with an interactive user question (¿Quieres..., ¿Deseas..., etc.)
				const closingQuestionMatch = text.match(
					/(?:^|\n)\s*(?:(?:Por\s+favor|Recuerda|Nota)[^\n]*\n\s*)?(¿(?:Quieres|Deseas|Prefieres|Confirmas|Indicas|Puedes|Te\s+gustar[ií]a|Cu[aá]l)[^?\n]+\?[\s\S]*)$/i,
				);
				if (closingQuestionMatch) {
					rawMatch = "ClosingQuestion";
					sectionText = closingQuestionMatch[1].trim();
				}
			}

			if (sectionText) {
				const optionLines = sectionText.split(/\r?\n/);
				const introLines: string[] = [];
				let closingQuestion = "";

				const optionPattern =
					/^(?:[-*+]\s+|\d+[.)]\s+)?(?:\*{1,2})?Opci[oó]n\s+([A-Za-z0-9]+)(?:\*{1,2})?[\s:—–-]+\s*(.+)$/i;

				for (const line of optionLines) {
					const trimmed = line.trim();
					if (!trimmed) continue;
					const optMatch = trimmed.match(optionPattern);
					if (optMatch) {
						const cleanText = optMatch[2]
							.replace(/^[\s—–:-]+/, "")
							.replace(/^\*+|\*+$/g, "")
							.trim();
						options.push({ text: `Opción ${optMatch[1]}: ${cleanText}` });
						continue;
					}

					// If we haven't found any options yet, lines before options form the intro
					if (options.length === 0) {
						if (
							!/^(?:\*{1,2})?(?:⏳|🕒|⌛|\(esperando|esperando|nota:|aviso:|status:)/i.test(trimmed) &&
							!/esperando\s+su\s+respuesta/i.test(trimmed)
						) {
							introLines.push(trimmed);
						}
					} else {
						// Once options started, check for a closing question line like "¿Cuál opción prefieres?"
						const qm = trimmed.match(/(¿[^?]+\?)/);
						if (qm) {
							closingQuestion = qm[1].trim();
						}
					}
				}

				// Check "o prefieres" if still no options
				if (options.length === 0) {
					const eitherOrMatch = sectionText.match(
						/¿(?:Quieres\s+que|Deseas\s+que)?\s*([^,?]+?)(?:,\s*o\s+(?:prefieres|deseas)?\s*([^?]+))\?/i,
					);
					if (eitherOrMatch) {
						let opt1 = eitherOrMatch[1]
							.trim()
							.replace(/^(?:proceda\s+con\s+la\s+|instale\s+)/i, "")
							.trim();
						let opt2 = eitherOrMatch[2]
							.trim()
							.replace(/^(?:compartir\s+primero\s+el\s+|proporcionar\s+)/i, "")
							.trim();
						opt1 = opt1.charAt(0).toUpperCase() + opt1.slice(1);
						opt2 = opt2.charAt(0).toUpperCase() + opt2.slice(1);
						options.push({ text: `Opción 1: ${opt1}` });
						options.push({ text: `Opción 2: ${opt2}` });
					}
				}

				if (!question) {
					if (introLines.length > 0 && closingQuestion) {
						question = `${introLines[0]} ${closingQuestion}`;
					} else if (closingQuestion) {
						question = closingQuestion;
					} else if (introLines.length > 0) {
						question = introLines.join(" ").trim();
					} else {
						question = sectionText.slice(0, 150).trim();
					}
				}
			}
		}

		if (!question && options.length === 0) {
			return null;
		}

		if (options.length === 0) {
			if (rawMatch === "XML_ask_followup") {
				options.push(
					{ text: "Opción A: Proceder con la implementación de las fases" },
					{ text: "Opción B: Revisar o ajustar el diseño arquitectónico" },
				);
			} else {
				options.push({ text: "Confirmar y Continuar" }, { text: "Modificar Requerimiento" });
			}
		}

		return {
			question: question || "Por favor, seleccione una de las opciones:",
			options: options.slice(0, 5),
			rawMatch,
		};
	}
}
