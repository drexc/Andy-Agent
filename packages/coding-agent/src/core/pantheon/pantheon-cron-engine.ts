/**
 * Pantheon Cron Engine
 * Implements memory-aware scheduled tasks and continuities (inspired by Hermes 0.21.0 `continuity=true`).
 * Carries persistent scratchpad and workspace diff awareness between scheduled runs.
 */

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { PantheonRegistry } from "./pantheon-registry.js";
import type { PantheonCronExecution, PantheonCronJob, PantheonCronOptions } from "./pantheon-types.js";

export class PantheonCronEngine {
	private readonly projectDir: string;
	private readonly globalDir: string;
	private readonly registry: PantheonRegistry;
	private lastWorkspaceSnapshot = new Map<string, number>();

	constructor(projectCwd: string = process.cwd(), registry?: PantheonRegistry) {
		this.globalDir = path.join(homedir(), ".andy", "agent", "pantheon", "cron");
		this.projectDir = path.join(projectCwd, ".andy", "pantheon", "cron");
		this.registry = registry || new PantheonRegistry(projectCwd);
		this.ensureDirectories();
	}

	private ensureDirectories(): void {
		try {
			if (!existsSync(this.globalDir)) mkdirSync(this.globalDir, { recursive: true });
			if (!existsSync(this.projectDir)) mkdirSync(this.projectDir, { recursive: true });
		} catch {}
	}

	private getJobFilePath(jobId: string): string {
		return path.join(this.projectDir, `${jobId}.json`);
	}

	public getJob(jobId: string): PantheonCronJob | undefined {
		const projectFile = this.getJobFilePath(jobId);
		if (existsSync(projectFile)) {
			try {
				return JSON.parse(readFileSync(projectFile, "utf-8"));
			} catch {}
		}
		const globalFile = path.join(this.globalDir, `${jobId}.json`);
		if (existsSync(globalFile)) {
			try {
				return JSON.parse(readFileSync(globalFile, "utf-8"));
			} catch {}
		}
		return undefined;
	}

	public saveJob(job: PantheonCronJob): void {
		this.ensureDirectories();
		job.updatedAt = new Date().toISOString();
		const filePath = this.getJobFilePath(job.id);
		try {
			writeFileSync(filePath, JSON.stringify(job, null, 2), "utf-8");
		} catch {}
	}

	public listJobs(): PantheonCronJob[] {
		const jobs: PantheonCronJob[] = [];
		const dirs = [this.projectDir, this.globalDir];
		const seenIds = new Set<string>();

		for (const dir of dirs) {
			if (!existsSync(dir)) continue;
			try {
				const files = readdirSync(dir);
				for (const file of files) {
					if (file.endsWith(".json") && !file.includes(".history.")) {
						const id = file.replace(/\.json$/, "");
						if (seenIds.has(id)) continue;
						seenIds.add(id);

						try {
							const content = readFileSync(path.join(dir, file), "utf-8");
							jobs.push(JSON.parse(content));
						} catch {}
					}
				}
			} catch {}
		}

		return jobs;
	}

	public registerJob(
		name: string,
		agentId: string,
		cronExpression: string,
		instruction: string,
		options: PantheonCronOptions = {},
	): PantheonCronJob {
		const id = `cron-${randomUUID().slice(0, 8)}`;
		const now = new Date().toISOString();

		const job: PantheonCronJob = {
			id,
			name,
			agentId,
			cronExpression,
			instruction,
			options: {
				continuity: options.continuity ?? true,
				monitorMode: options.monitorMode ?? false,
				maxRuns: options.maxRuns,
				timeoutMs: options.timeoutMs,
			},
			status: "active",
			scratchpad: "",
			totalRuns: 0,
			createdAt: now,
			updatedAt: now,
		};

		this.saveJob(job);
		return job;
	}

	/**
	 * Executes a single tick of the cron job with continuity memory and monitor mode.
	 */
	public async executeTick(
		jobId: string,
		workspaceDir: string,
		llmCaller: (
			messages: Array<{ role: string; content: string }>,
			model?: string,
			temperature?: number,
			systemPrompt?: string,
		) => Promise<string | AsyncIterable<string>>,
	): Promise<PantheonCronExecution> {
		const job = this.getJob(jobId);
		if (!job) throw new Error(`Cron job "${jobId}" not found.`);

		const agent = this.registry.getAgent(job.agentId) || this.registry.getAgents()[0];
		const startedAt = new Date().toISOString();

		// Monitor Mode: Check if workspace files changed since last run
		if (job.options.monitorMode) {
			const hasChanges = this.checkWorkspaceChanges(workspaceDir);
			if (!hasChanges && job.totalRuns > 0) {
				const skippedExec: PantheonCronExecution = {
					jobId,
					runIndex: job.totalRuns + 1,
					startedAt,
					completedAt: new Date().toISOString(),
					status: "skipped_no_changes",
					output: "Monitor Mode: Sin cambios detectados en el espacio de trabajo. Ejecución omitida.",
					scratchpad: job.scratchpad,
				};
				job.lastRunTimestamp = startedAt;
				job.lastRunStatus = "skipped_no_changes";
				job.lastRunOutput = skippedExec.output;
				this.saveJob(job);
				return skippedExec;
			}
		}

		// Prepare Continuity Context
		const continuityHeader =
			job.options.continuity && job.scratchpad
				? `\n\n# MEMORIA PERSISTENTE DE EJECUCIONES ANTERIORES (CONTINUITY SCRATCHPAD):\n\`\`\`markdown\n${job.scratchpad}\n\`\`\`\n- Última ejecución completada: ${job.lastRunTimestamp || "Ninguna"}\n- Número total de ejecuciones acumuladas: ${job.totalRuns}`
				: "";

		const systemPrompt = `${agent.systemPrompt}

# TAREA PROGRAMADA PERIÓDICA (PANTHEON CRON RUN)
- Nombre de la tarea: ${job.name}
- Expresión: ${job.cronExpression}
- Modo continuidad: ${job.options.continuity ? "ACTIVO (Preserva estado y scratchpad)" : "INACTIVO"}${continuityHeader}

Instrucción de ejecución:
${job.instruction}

Entrega el informe de estado, actualizaciones y cualquier actualización de tu scratchpad de memoria.`;

		const responseStream = await llmCaller(
			[{ role: "user", content: `Ejecuta la ronda periódica: "${job.instruction}"` }],
			agent.model,
			agent.temperature,
			systemPrompt,
		);

		let outputText = "";
		if (typeof responseStream === "string") {
			outputText = responseStream;
		} else if (responseStream && Symbol.asyncIterator in responseStream) {
			for await (const chunk of responseStream) {
				outputText += chunk;
			}
		}

		// Update Job State
		job.totalRuns++;
		job.lastRunTimestamp = startedAt;
		job.lastRunStatus = "success";
		job.lastRunOutput = outputText.trim();

		// Extract updated scratchpad if provided in markdown or use latest output summary
		if (job.options.continuity) {
			job.scratchpad = `[Ronda #${job.totalRuns} - ${startedAt}]: ${outputText.slice(0, 500)}...`;
		}

		if (job.options.maxRuns && job.totalRuns >= job.options.maxRuns) {
			job.status = "completed";
		}

		this.saveJob(job);

		const execution: PantheonCronExecution = {
			jobId,
			runIndex: job.totalRuns,
			startedAt,
			completedAt: new Date().toISOString(),
			status: "success",
			output: outputText.trim(),
			scratchpad: job.scratchpad,
		};

		return execution;
	}

	private checkWorkspaceChanges(dir: string): boolean {
		let maxMtime = 0;
		const scan = (d: string, depth = 0) => {
			if (depth > 3) return;
			try {
				const entries = readdirSync(d, { withFileTypes: true });
				for (const e of entries) {
					if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "bin" || e.name === "obj")
						continue;
					const full = path.join(d, e.name);
					if (e.isDirectory()) {
						scan(full, depth + 1);
					} else {
						const st = statSync(full);
						if (st.mtimeMs > maxMtime) maxMtime = st.mtimeMs;
					}
				}
			} catch {}
		};

		scan(dir);
		const lastTime = this.lastWorkspaceSnapshot.get(dir) || 0;
		this.lastWorkspaceSnapshot.set(dir, maxMtime);
		return maxMtime > lastTime;
	}
}
