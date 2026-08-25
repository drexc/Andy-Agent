import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export interface AutoLearningConfig {
	enabled: boolean;
	autoUpdateMemory: boolean;
	autoCreateSkills: boolean;
	scope: "project" | "global";
	minTurnLength: number;
}

export interface LearnedInsight {
	category: "architecture" | "bugfix" | "preference" | "command";
	topic: string;
	insight: string;
	timestamp: number;
}

export class AutoLearningEngine {
	private cwd: string;
	private configPath: string;
	private projectMemoryPath: string;
	private globalMemoryPath: string;
	private logCallback?: (level: "INFO" | "WARN" | "ERROR", category: string, message: string) => void;
	public config: AutoLearningConfig;

	constructor(
		cwd = process.cwd(),
		logCallback?: (level: "INFO" | "WARN" | "ERROR", category: string, message: string) => void,
	) {
		this.cwd = cwd;
		this.logCallback = logCallback;
		const andyDir = path.join(os.homedir(), ".andy", "agent");
		const primeDir = path.join(os.homedir(), ".prime", "agent");
		const agentDir = existsSync(andyDir) || !existsSync(primeDir) ? andyDir : primeDir;
		this.configPath = path.join(agentDir, "autolearn.json");
		this.projectMemoryPath = path.join(cwd, "MEMORY.md");
		this.globalMemoryPath = path.join(agentDir, "MEMORY.md");

		this.config = this.loadConfig();
	}

	private loadConfig(): AutoLearningConfig {
		const defaultConfig: AutoLearningConfig = {
			enabled: true,
			autoUpdateMemory: true,
			autoCreateSkills: true,
			scope: "project",
			minTurnLength: 15,
		};

		try {
			if (existsSync(this.configPath)) {
				const raw = readFileSync(this.configPath, "utf-8");
				return { ...defaultConfig, ...JSON.parse(raw) };
			}
		} catch {}
		return defaultConfig;
	}

	public saveConfig(newConfig: Partial<AutoLearningConfig>): AutoLearningConfig {
		this.config = { ...this.config, ...newConfig };
		try {
			const dir = path.dirname(this.configPath);
			if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
			writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), "utf-8");
			this.log("INFO", "AutoLearn", "Updated auto-learning configuration");
		} catch (err: any) {
			this.log("ERROR", "AutoLearn", `Failed to save config: ${err.message}`);
		}
		return this.config;
	}

	private log(level: "INFO" | "WARN" | "ERROR", category: string, message: string): void {
		if (this.logCallback) {
			this.logCallback(level, category, message);
		}
	}

	public async processTurn(params: {
		sessionId: string;
		prompt: string;
		assistantResponse: string;
		modelId?: string;
	}): Promise<LearnedInsight[]> {
		if (!this.config.enabled) return [];

		const { prompt, assistantResponse } = params;
		if (!prompt || prompt.trim().length < this.config.minTurnLength) return [];
		if (!assistantResponse || assistantResponse.trim().length < 20) return [];

		// Run extraction in background
		try {
			const insights = this.extractInsights(prompt, assistantResponse);
			if (insights.length > 0 && this.config.autoUpdateMemory) {
				await this.applyInsightsToMemory(insights);
			}
			return insights;
		} catch (err: any) {
			this.log("WARN", "AutoLearn", `Error during reflection: ${err.message}`);
			return [];
		}
	}

	private extractInsights(prompt: string, response: string): LearnedInsight[] {
		const insights: LearnedInsight[] = [];
		const lowerPrompt = prompt.toLowerCase();
		const lowerResp = response.toLowerCase();

		// 1. Detección de correcciones de protocolo / hardware / configuración
		if (
			lowerPrompt.includes("protocolo") ||
			lowerPrompt.includes("baud") ||
			lowerPrompt.includes("puerto") ||
			lowerPrompt.includes("validadora") ||
			lowerPrompt.includes("hitachi") ||
			lowerPrompt.includes("sensor")
		) {
			// Extract specific values
			const baudMatch = response.match(/(\d{4,6})\s*baud/i) || prompt.match(/(\d{4,6})\s*baud/i);
			const cmdMatch = response.match(/comando\s*([0-9-]+)/i) || response.match(/(\d{2}-\d{2,3})/i);

			if (baudMatch || cmdMatch || lowerResp.includes("hitachi")) {
				let details = "";
				if (baudMatch) details += `Baud rate: ${baudMatch[1]}. `;
				if (cmdMatch) details += `Comando clave: ${cmdMatch[1]}. `;
				if (lowerResp.includes("hopper") || lowerResp.includes("billete"))
					details += `Sensor Hopper / estado de conteo verificado.`;

				insights.push({
					category: "architecture",
					topic: "Protocolo & Hardware",
					insight: `Configuración validada: ${details || "Ajustes de protocolo y lectura de sensores aplicados."}`,
					timestamp: Date.now(),
				});
			}
		}

		// 2. Detección de soluciones a bugs o errores de compilación / runtime
		if (
			lowerPrompt.includes("error") ||
			lowerPrompt.includes("falló") ||
			lowerPrompt.includes("no funciona") ||
			lowerPrompt.includes("corrección") ||
			lowerPrompt.includes("arreglar")
		) {
			// Extract summary of fix from response
			const lines = response
				.split("\n")
				.filter((l) => l.trim().startsWith("-") || l.trim().startsWith("1.") || l.trim().startsWith("2."));
			if (lines.length > 0) {
				const summary = lines
					.slice(0, 2)
					.map((l) => l.replace(/^[-0-9.\s*]+/, "").trim())
					.join("; ");
				if (summary.length > 10) {
					insights.push({
						category: "bugfix",
						topic: "Solución de Error",
						insight: summary.slice(0, 160),
						timestamp: Date.now(),
					});
				}
			}
		}

		// 3. Detección de comandos específicos o dependencias descubiertas
		if (lowerResp.includes("dotnet build") || lowerResp.includes("npm run") || lowerResp.includes("npx tsx")) {
			const cmdMatch = response.match(/`(dotnet [^`]+|npm run [^`]+|npx tsx [^`]+)`/);
			if (cmdMatch) {
				insights.push({
					category: "command",
					topic: "Comando del Proyecto",
					insight: `Comando validado: \`${cmdMatch[1]}\``,
					timestamp: Date.now(),
				});
			}
		}

		// 4. Preferencias del usuario
		if (
			lowerPrompt.includes("siempre") ||
			lowerPrompt.includes("en español") ||
			lowerPrompt.includes("recuerda") ||
			lowerPrompt.includes("nunca")
		) {
			const pref = prompt.replace(/^.*(siempre|en español|recuerda que|nunca)/i, "$1").trim();
			if (pref.length > 5) {
				insights.push({
					category: "preference",
					topic: "Preferencia de Usuario",
					insight: pref.slice(0, 140),
					timestamp: Date.now(),
				});
			}
		}

		return insights;
	}

	private async applyInsightsToMemory(insights: LearnedInsight[]): Promise<void> {
		const targetPath = this.config.scope === "global" ? this.globalMemoryPath : this.projectMemoryPath;
		let content = "";

		if (existsSync(targetPath)) {
			content = readFileSync(targetPath, "utf-8");
		} else {
			content = `# Memoria del Proyecto (${path.basename(this.cwd)})\n\nContexto persistente acumulado automáticamente por Andy Agent.\n`;
		}

		let addedCount = 0;

		for (const item of insights) {
			// Check if already in memory (simple deduplication)
			const cleanInsight = item.insight.toLowerCase().trim();
			if (content.toLowerCase().includes(cleanInsight.slice(0, 30))) {
				continue;
			}

			const sectionHeader = `## ${item.topic}`;
			const dateStr = new Date().toLocaleDateString("es-ES", { month: "short", day: "numeric" });
			const entry = `- **[${dateStr}]**: ${item.insight}\n`;

			if (content.includes(sectionHeader)) {
				content = content.replace(sectionHeader, `${sectionHeader}\n${entry}`);
			} else {
				content += `\n${sectionHeader}\n${entry}`;
			}

			addedCount++;
			this.log("INFO", "AutoLearn", `[Memorizado]: ${item.topic} -> ${item.insight.slice(0, 70)}...`);
		}

		if (addedCount > 0) {
			const dir = path.dirname(targetPath);
			if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
			writeFileSync(targetPath, content, "utf-8");
			this.log("INFO", "AutoLearn", `Saved ${addedCount} new insights to ${path.basename(targetPath)}`);
		}
	}
}
