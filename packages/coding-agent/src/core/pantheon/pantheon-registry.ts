/**
 * Pantheon Agent & Squad Registry
 * Persistent catalog for specialized agents, squads, and collaborative configurations.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { PantheonAgentProfile, PantheonSquad } from "./pantheon-types.js";

export const DEFAULT_PANTHEON_AGENTS: PantheonAgentProfile[] = [
	{
		id: "hermes",
		name: "Hermes",
		role: "Lead Orchestrator & Task Strategist",
		avatar: "👑",
		color: "#8B5CF6", // Purple
		model: "auto/best-coding",
		temperature: 0.2,
		systemPrompt:
			"Eres Hermes, el Orquestador Principal del Pantheon. Tu responsabilidad es analizar las necesidades del usuario, definir un plan técnico preciso de ejecución y asignar subtareas concretas a los especialistas (@Pythia para investigar código, @Athena para diseñar arquitectura, @Hephaestus para programar/modificar archivos y @Argos para correr tests y auditar). No des sugerencias redundantes; coordina la ejecución real del equipo y sintetiza el resultado final para el usuario.",
		capabilities: {
			write: true,
			terminal: true,
			graft: true,
			rlm: true,
			web: true,
			mcp: true,
		},
		isSystem: true,
		status: "idle",
	},
	{
		id: "athena",
		name: "Athena",
		role: "Software Architect & Graft Strategist",
		avatar: "🏛️",
		color: "#3B82F6", // Blue
		model: "auto/best-coding",
		temperature: 0.1,
		systemPrompt:
			"Eres Athena, la Arquitecta de Software del Pantheon. Diseñas la arquitectura de software, modelado de dominios y evaluación del impacto estructural mediante Graft Engineering. Defines contratos de interfaces, esquemas de tipos y rutas de archivos exactas para que @Hephaestus implemente el código sin ambigüedad.",
		capabilities: {
			write: false,
			terminal: false,
			graft: true,
			rlm: true,
			web: true,
			mcp: false,
		},
		isSystem: true,
		status: "idle",
	},
	{
		id: "hephaestus",
		name: "Hephaestus",
		role: "FullStack Coder & Refactoring Specialist",
		avatar: "⚡",
		color: "#F59E0B", // Amber
		model: "auto/best-coding",
		temperature: 0.2,
		systemPrompt:
			"Eres Hephaestus, el Maestro Artesano y Programador del Pantheon. Tu responsabilidad es ESCRIBIR, MODIFICAR Y CREAR CÓDIGO REAL en los archivos del proyecto. No des consejos teóricos ni tips genéricos: implementa el código completo, modular y listo para producción, indicando la ruta del archivo a modificar o crear (ej: ```file:src/mi_archivo.ts ... ```). Tras programar, delega a @Argos para que ejecute los tests.",
		capabilities: {
			write: true,
			terminal: true,
			graft: true,
			rlm: false,
			web: false,
			mcp: true,
		},
		isSystem: true,
		status: "idle",
	},
	{
		id: "argos",
		name: "Argos",
		role: "Graft Auditor & Quality Gatekeeper",
		avatar: "🩺",
		color: "#10B981", // Emerald
		model: "auto/best-coding",
		temperature: 0.1,
		systemPrompt:
			"Eres Argos, el Guardián de Calidad y Tester del Pantheon. Tu responsabilidad es VALIDAR Y EJECUTAR PRUEBAS REALES en la terminal (ej: ```bash:npm test```, ```bash:pytest```, diagnósticos de compilación o linter). No te limites a opinar: indica los comandos de verificación a ejecutar, revisa la salida real de los tests y certifica si el código está listo o requiere corrección.",
		capabilities: {
			write: true,
			terminal: true,
			graft: true,
			rlm: false,
			web: false,
			mcp: false,
		},
		isSystem: true,
		status: "idle",
	},
	{
		id: "pythia",
		name: "Pythia",
		role: "RLM Deep Researcher & Knowledge Synthesizer",
		avatar: "🔮",
		color: "#EC4899", // Pink
		model: "auto/best-coding",
		temperature: 0.3,
		systemPrompt:
			"Eres Pythia, la Investigadora Profunda del Pantheon. Analizas y exploras los archivos fuente, dependencias, librerías y documentación del proyecto. Extraes las secciones de código relevantes para que el escuadrón trabaje con precisión técnica sobre el proyecto activo.",
		capabilities: {
			write: false,
			terminal: false,
			graft: true,
			rlm: true,
			web: true,
			mcp: true,
		},
		isSystem: true,
		status: "idle",
	},
];

export const DEFAULT_PANTHEON_SQUADS: PantheonSquad[] = [
	{
		id: "fullstack-squad",
		name: "FullStack Engineering Squad",
		description: "Escuadrón autónomo completo: Orquestación, Arquitectura, Codificación y Auditoría Graft.",
		leaderId: "hermes",
		memberIds: ["hermes", "athena", "hephaestus", "argos"],
		workflowMode: "hierarchical",
		isSystem: true,
	},
	{
		id: "audit-fix-squad",
		name: "Auditoría & Auto-Refactor Squad",
		description: "Detección estática de errores, resolución de ciclos y refactorización guiada.",
		leaderId: "argos",
		memberIds: ["argos", "hephaestus"],
		workflowMode: "sequential",
		isSystem: true,
	},
	{
		id: "research-squad",
		name: "Exploración & Investigación Squad",
		description: "Investigación recursiva con RLM, análisis de arquitectura y síntesis.",
		leaderId: "hermes",
		memberIds: ["hermes", "pythia", "athena"],
		workflowMode: "collaborative",
		isSystem: true,
	},
];

export class PantheonRegistry {
	private readonly globalDir: string;
	private readonly projectDir: string;

	constructor(projectCwd: string = process.cwd()) {
		this.globalDir = path.join(homedir(), ".andy", "agent", "pantheon");
		this.projectDir = path.join(projectCwd, ".andy", "pantheon");
		this.ensureDirectories();
	}

	private ensureDirectories(): void {
		try {
			if (!existsSync(this.globalDir)) mkdirSync(this.globalDir, { recursive: true });
			if (!existsSync(this.projectDir)) mkdirSync(this.projectDir, { recursive: true });
		} catch {}
	}

	private getAgentsFilePath(): string {
		const projectFile = path.join(this.projectDir, "agents.json");
		if (existsSync(projectFile)) return projectFile;
		return path.join(this.globalDir, "agents.json");
	}

	private getSquadsFilePath(): string {
		const projectFile = path.join(this.projectDir, "squads.json");
		if (existsSync(projectFile)) return projectFile;
		return path.join(this.globalDir, "squads.json");
	}

	public getAgents(): PantheonAgentProfile[] {
		const filePath = this.getAgentsFilePath();
		let stored: PantheonAgentProfile[] = [];
		if (existsSync(filePath)) {
			try {
				const content = readFileSync(filePath, "utf-8");
				stored = JSON.parse(content);
			} catch {}
		}

		// Merge defaults with custom stored agents
		const agentMap = new Map<string, PantheonAgentProfile>();
		for (const def of DEFAULT_PANTHEON_AGENTS) {
			agentMap.set(def.id, { ...def });
		}
		for (const s of stored) {
			agentMap.set(s.id, s);
		}

		return Array.from(agentMap.values());
	}

	public getAgent(id: string): PantheonAgentProfile | undefined {
		const agents = this.getAgents();
		return agents.find((a) => a.id.toLowerCase() === id.toLowerCase());
	}

	public saveAgent(profile: PantheonAgentProfile): PantheonAgentProfile {
		const agents = this.getAgents();
		const idx = agents.findIndex((a) => a.id.toLowerCase() === profile.id.toLowerCase());
		const now = new Date().toISOString();

		const updated: PantheonAgentProfile = {
			...profile,
			updatedAt: now,
			createdAt: profile.createdAt || now,
		};

		if (idx >= 0) {
			agents[idx] = updated;
		} else {
			agents.push(updated);
		}

		this.persistAgents(agents);
		return updated;
	}

	public deleteAgent(id: string): boolean {
		const def = DEFAULT_PANTHEON_AGENTS.find((d) => d.id === id);
		if (def?.isSystem) {
			// Cannot delete system agents, but can reset to defaults
			return false;
		}
		const agents = this.getAgents().filter((a) => a.id !== id);
		this.persistAgents(agents);
		return true;
	}

	public getSquads(): PantheonSquad[] {
		const filePath = this.getSquadsFilePath();
		let stored: PantheonSquad[] = [];
		if (existsSync(filePath)) {
			try {
				const content = readFileSync(filePath, "utf-8");
				stored = JSON.parse(content);
			} catch {}
		}

		const squadMap = new Map<string, PantheonSquad>();
		for (const def of DEFAULT_PANTHEON_SQUADS) {
			squadMap.set(def.id, { ...def });
		}
		for (const s of stored) {
			squadMap.set(s.id, s);
		}

		return Array.from(squadMap.values());
	}

	public getSquad(id: string): PantheonSquad | undefined {
		return this.getSquads().find((s) => s.id === id);
	}

	public saveSquad(squad: PantheonSquad): PantheonSquad {
		const squads = this.getSquads();
		const idx = squads.findIndex((s) => s.id === squad.id);
		const updated = { ...squad, createdAt: squad.createdAt || new Date().toISOString() };
		if (idx >= 0) {
			squads[idx] = updated;
		} else {
			squads.push(updated);
		}
		this.persistSquads(squads);
		return updated;
	}

	public deleteSquad(id: string): boolean {
		const squads = this.getSquads().filter((s) => s.id !== id);
		this.persistSquads(squads);
		return true;
	}

	private persistAgents(agents: PantheonAgentProfile[]): void {
		this.ensureDirectories();
		const targetFile = path.join(this.globalDir, "agents.json");
		try {
			writeFileSync(targetFile, JSON.stringify(agents, null, 2), "utf-8");
		} catch (err) {
			console.error("Failed to persist Pantheon agents:", err);
		}
	}

	private persistSquads(squads: PantheonSquad[]): void {
		this.ensureDirectories();
		const targetFile = path.join(this.globalDir, "squads.json");
		try {
			writeFileSync(targetFile, JSON.stringify(squads, null, 2), "utf-8");
		} catch (err) {
			console.error("Failed to persist Pantheon squads:", err);
		}
	}
}
