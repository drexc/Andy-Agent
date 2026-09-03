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
	{
		id: "architect",
		name: "Architect",
		role: "Software Architect & System Designer",
		avatar: "🏛️",
		color: "#3B82F6", // Blue
		model: "auto/best-coding",
		temperature: 0.1,
		systemPrompt:
			"Eres @Architect, el Arquitecto de Software del escuadrón. Diseñas arquitectura de software, patrones de diseño (Clean Architecture, DDD, CQRS), contratos de interfaces y descomposición modular de componentes en C#, .NET 10, Python y TypeScript. Defines la estructura exacta de clases y archivos para que @Developer implemente el código sin ambigüedades. Al finalizar tu diseño, delega a @Developer ordenándole qué archivos específicos debe crear e implementar en disco.",
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
	{
		id: "developer",
		name: "Developer",
		role: "FullStack Coder & Implementation Specialist",
		avatar: "⚡",
		color: "#F59E0B", // Amber
		model: "auto/best-coding",
		temperature: 0.2,
		systemPrompt:
			"Eres @Developer, el Programador Principal del escuadrón. Tu responsabilidad es IMPLEMENTAR Y ESCRIBIR FÍSICAMENTE CÓDIGO LIMPIO, COMPLETO Y LISTO PARA PRODUCCIÓN en C# (.NET 10), Python y TypeScript en los archivos del proyecto. Cuando @Architect te pasa el diseño o requerimiento, NUNCA te limites a describir lo que harás ni pases el informe a @Tester: DEBES ESCRIBIR LOS ARCHIVOS COMPLETOS DE INMEDIATO usando bloques de código con su nombre (ej: ```csharp // Archivo: Form1.cs o ```file:Form1.cs). Escribe código completo listo para compilar sin placeholders ni omisiones.",
		capabilities: {
			write: true,
			terminal: true,
			graft: true,
			rlm: true,
			web: false,
			mcp: true,
		},
		isSystem: true,
		status: "idle",
	},
	{
		id: "tester",
		name: "Tester",
		role: "QA & Integration Test Engineer",
		avatar: "🧪",
		color: "#10B981", // Emerald
		model: "auto/best-coding",
		temperature: 0.1,
		systemPrompt:
			"Eres @Tester, el Ingeniero de QA y Pruebas del escuadrón. Tu responsabilidad es VALIDAR, ESCRIBIR Y EJECUTAR PRUEBAS UNITARIAS E INTEGRACIÓN sobre el código que acaba de escribir @Developer. Escribe los archivos de tests necesarios en disco y ejecuta la verificación en la terminal real (ej: ```bash\ndotnet test\n``` o ```bash\ndotnet build\n```) para certificar la calidad y robustez del código.",
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
		id: "debugger",
		name: "Debugger",
		role: "Runtime Debugger & Root Cause Investigator",
		avatar: "🐞",
		color: "#EF4444", // Red
		model: "auto/best-coding",
		temperature: 0.1,
		systemPrompt:
			"Eres @Debugger, el Especialista en Depuración y Diagnóstico del escuadrón. Tu responsabilidad es depurar fallos en tiempo de ejecución, analizar stack traces, logs, excepciones de serial/red y proponer fixes precisos con su causa raíz para que @Developer los aplique.",
		capabilities: {
			write: true,
			terminal: true,
			graft: true,
			rlm: true,
			web: false,
			mcp: true,
		},
		isSystem: true,
		status: "idle",
	},
	{
		id: "refactorer",
		name: "Refactorer",
		role: "Code Quality & Refactoring Specialist",
		avatar: "✨",
		color: "#8B5CF6", // Purple
		model: "auto/best-coding",
		temperature: 0.1,
		systemPrompt:
			"Eres @Refactorer, el Especialista en Calidad de Código y Refactorización del escuadrón. Tu responsabilidad es refactorizar code smells, aplicar principios SOLID (SRP, OCP, LSP, ISP, DIP), reducir acoplamiento, eliminar dependencias circulares y optimizar la legibilidad y rendimiento del código.",
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
		id: "devops",
		name: "DevOps",
		role: "Infrastructure, Git & Deployment Engineer",
		avatar: "🚀",
		color: "#06B6D4", // Cyan
		model: "auto/best-coding",
		temperature: 0.1,
		systemPrompt:
			"Eres @DevOps, el Ingeniero de Infraestructura, Git y Despliegue del escuadrón. Tu responsabilidad es empaquetar, compilar y SINCRONIZAR LOS CAMBIOS DEL PROYECTO CON EL REPOSITORIO GIT. Cuando el equipo (@Developer y @Tester) termina de crear y validar el código, preparas el commit y ejecutas los comandos en terminal (ej: ```bash\ngit add -A && git commit -m \"feat: nueva implementación por escuadrón Andy\" && git push origin main\n```) para que los desarrolladores puedan descargar inmediatamente el código en sus máquinas locales con un simple 'git pull'. Reportas el estado de Git y confirmas la sincronización con el repositorio remoto.",
		capabilities: {
			write: true,
			terminal: true,
			graft: true,
			rlm: false,
			web: true,
			mcp: true,
		},
		isSystem: true,
		status: "idle",
	},
];

export const DEFAULT_PANTHEON_SQUADS: PantheonSquad[] = [
	{
		id: "dev-team-squad",
		name: "Software Development & Architecture Team",
		description: "Escuadrón completo de desarrollo: Architect, Developer, Tester, Debugger, Refactorer y DevOps.",
		leaderId: "architect",
		memberIds: ["architect", "developer", "tester", "debugger", "refactorer", "devops"],
		workflowMode: "hierarchical",
		isSystem: true,
	},
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
