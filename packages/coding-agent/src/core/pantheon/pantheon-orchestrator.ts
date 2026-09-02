/**
 * Pantheon Orchestrator & Peer-to-Peer Multi-Agent Engine
 * Executes collaborative, sequential, and hierarchical workflows with Graft & RLM context.
 */

import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { GraftEngine } from "../graft/index.js";
import { PantheonRegistry } from "./pantheon-registry.js";
import type {
	PantheonAgentProfile,
	PantheonMessage,
	PantheonRoomState,
	PantheonSquad,
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
}

export interface PantheonExecutionEvent {
	type: "agent_start" | "delta" | "agent_finish" | "delegation" | "graft_event" | "error" | "done";
	agentId?: string;
	agentName?: string;
	agentAvatar?: string;
	agentColor?: string;
	agentRole?: string;
	delta?: string;
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

	constructor(cwd: string = process.cwd()) {
		this.cwd = path.resolve(cwd);
		this.registry = new PantheonRegistry(this.cwd);
		this.graft = new GraftEngine(this.cwd);
	}

	public getRegistry(): PantheonRegistry {
		return this.registry;
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
	 * Run a collaborative multi-agent turn
	 */
	public async executeTurn(
		squadId: string,
		userPrompt: string,
		onEvent: PantheonEventCallback,
		options: {
			targetAgentId?: string;
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
		const mentionMatch = userPrompt.match(/@(\w+)/i);
		let targetAgentId = options.targetAgentId;
		if (!targetAgentId && mentionMatch) {
			const mentionedName = mentionMatch[1].toLowerCase();
			const found = this.registry
				.getAgents()
				.find((a) => a.id.toLowerCase() === mentionedName || a.name.toLowerCase() === mentionedName);
			if (found) targetAgentId = found.id;
		}

		// Default to squad leader if no specific agent targeted
		const activeAgentId = targetAgentId || squad.leaderId || "hermes";
		const primaryAgent = this.registry.getAgent(activeAgentId) || this.registry.getAgents()[0];

		// Load Project Context (MEMORY.md, AGENTS.md, Files, CWD)
		const projectContext = this.loadProjectContext(options.projectInfo);

		// Collect Graft Structural Context
		let graftContextData: any;
		try {
			const graftMap = await this.graft.map();
			const diags = await this.graft.diagnostics();
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
			const currentAgent = agentsQueue.shift()!;
			executionCounts[currentAgent.id] = (executionCounts[currentAgent.id] || 0) + 1;
			currentStep++;

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
				role: m.senderId === "user" ? "user" : "assistant",
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

			const agentMsg: PantheonMessage = {
				id: randomUUID(),
				senderId: currentAgent.id,
				senderName: currentAgent.name,
				senderRole: currentAgent.role,
				senderAvatar: currentAgent.avatar,
				senderColor: currentAgent.color,
				content: fullResponseText,
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

			// Check if current agent delegated to peer agents
			const peerDelegations = this.detectPeerDelegations(fullResponseText, currentAgent.id);
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
					// Allow up to 2 turns per agent in a single user session to prevent infinite loops
					if (count < 2 && !alreadyInQueue) {
						agentsQueue.push(nextAgent);
					}
				}
			}
		}

		await onEvent({ type: "done" });
		return allTurnMessages;
	}

	private loadProjectContext(projectInfo?: PantheonProjectInfo): PantheonProjectContext {
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

		// 3. Scan workspace file structure
		let fileList = "";
		try {
			const scanned: string[] = [];
			const scanDir = (dir: string, depth = 0) => {
				if (depth > 2 || scanned.length >= 40) return;
				const entries = readdirSync(dir);
				for (const entry of entries) {
					if (
						entry.startsWith(".") ||
						entry === "node_modules" ||
						entry === "dist" ||
						entry === "build" ||
						entry === "bin" ||
						entry === "obj" ||
						entry === "coverage"
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
						}
					} catch {}
				}
			};

			scanDir(targetCwd);
			fileList = scanned.slice(0, 40).join("\n");
			if (scanned.length === 0) {
				fileList = "(Directorio vacío o recién inicializado)";
			}
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
## Inventario de Archivos del Proyecto:
\`\`\`
${projectContext.fileList}
\`\`\`
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

		const operationalRules = `\n\n# REGLAS CRÍTICAS DE EJECUCIÓN DEL PANTHEON
1. **Identidad del Agente**: Eres exclusivamente **@${agent.name}** (${agent.role}), un agente autónomo del sistema multi-agente Pantheon en el ecosistema Andy Agent. Tu única identidad es @${agent.name}. NUNCA te identifiques como Antigravity, Google DeepMind, OpenAI ni un asistente genérico.
2. **Idioma y Formato Humano**: Responde siempre en **Español** con formato Markdown estructurado, limpio y profesional (encabezados, listas, tablas y bloques de código).
3. **PROHIBIDO EMITIR PSEUDO-TAGS XML DE HERRAMIENTAS**: NUNCA generes etiquetas como \`<tool_call>\`, \`<arg_key>\`, \`<arg_value>\`, \`<invoke>\` ni comandos simulados en texto plano. Toda la información del AST de Graft, archivos y memoria del proyecto ya ha sido recolectada y provista arriba.
4. **Conocimiento del Proyecto Activo**: Ya te encuentras ejecutando dentro del espacio de trabajo del proyecto activo ("${projectContext?.name || path.basename(this.cwd)}" en "${projectContext?.path || this.cwd}").
5. **PROHIBIDO PREGUNTAR POR EL PROYECTO O RUTA**: No preguntes al usuario "¿cuál es el proyecto?", "¿dónde está el código?" ni pidas que te indiquen rutas. Actúa directamente sobre el proyecto activo aquí provisto.
6. **Especialización Inmediata**:
   - Si eres **@Pythia**: Realiza la investigación profunda RLM y síntesis analizando los módulos, dependencias y arquitectura del proyecto activo, y presenta los hallazgos directamente.
   - Si eres **@Athena**: Diseña la arquitectura, interfaces y evalúa el impacto estructural (Graft blast radius) sobre el proyecto activo.
   - Si eres **@Hephaestus**: Desarrolla el código, refactoriza y edita los archivos directamente respetando la modularidad.
   - Si eres **@Argos**: Audita el código, diagnósticos estáticos y dependencias basándote en la información estructural de Graft arriba expuesta, y redacta tu reporte de auditoría.
   - Si eres **@Hermes**: Orquesta el plan global y coordina las tareas entre los especialistas.`;

		return `${agent.systemPrompt}

Eres parte del escuadrón multi-agente "${squad.name}" (Modo: ${squad.workflowMode}).
Otros agentes en tu escuadrón:
${members}

Puedes delegar tareas mencionando a otro agente con @Nombre y describiendo la subtarea exacta que debe realizar.
${projectSection}${graftSection}${delegationSection}${operationalRules}`;
	}

	private detectPeerDelegations(text: string, fromAgentId: string): PantheonTaskDelegation[] {
		const delegations: PantheonTaskDelegation[] = [];
		const agents = this.registry.getAgents();

		for (const a of agents) {
			if (a.id === fromAgentId) continue;
			const regex = new RegExp(`@${a.name}\\b`, "i");
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
