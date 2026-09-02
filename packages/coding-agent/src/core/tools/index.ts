export {
	type BashOperations,
	type BashSpawnContext,
	type BashSpawnHook,
	type BashToolDetails,
	type BashToolInput,
	type BashToolOptions,
	createBashTool,
	createBashToolDefinition,
	createLocalBashOperations,
} from "./bash.js";
export {
	createEditTool,
	createEditToolDefinition,
	type EditOperations,
	type EditToolDetails,
	type EditToolInput,
	type EditToolOptions,
} from "./edit.js";
export { withFileMutationQueue } from "./file-mutation-queue.js";
export {
	createReadToolDefinition,
	createWriteToolDefinition,
} from "./file-tools.js";
export { createGraftTools } from "./graft-tools.js";
export {
	createIpythonTool,
	createIpythonToolDefinition,
	IpythonKernelProvisioner,
	type IpythonToolDetails,
	type IpythonToolInput,
	type IpythonToolOptions,
} from "./ipython.js";
export {
	pantheonDelegateTool,
	pantheonListSquadTool,
	pantheonPeerMessageTool,
	pantheonTools,
} from "./pantheon-tools.js";
export {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
	type TruncationOptions,
	type TruncationResult,
	truncateHead,
	truncateLine,
	truncateTail,
} from "./truncate.js";

import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { ToolDefinition } from "../extensions/types.js";
import { createBashToolDefinition } from "./bash.js";
import { createEditToolDefinition } from "./edit.js";
import { createReadToolDefinition, createWriteToolDefinition } from "./file-tools.js";
import { createGraftTools } from "./graft-tools.js";
import { createIpythonToolDefinition, type IpythonToolOptions } from "./ipython.js";
import { pantheonTools } from "./pantheon-tools.js";

export type Tool = AgentTool<any>;
export type ToolDef = ToolDefinition<any, any>;

export interface ToolsOptions {
	ipython?: IpythonToolOptions;
}

export function createAllToolDefinitions(cwd: string, options?: ToolsOptions): Record<string, ToolDef> {
	const graftTools = createGraftTools(cwd);
	const graftMap: Record<string, ToolDef> = {};
	for (const t of graftTools) {
		graftMap[t.name] = t;
	}

	const pantheonMap: Record<string, ToolDef> = {};
	for (const t of pantheonTools) {
		pantheonMap[t.name] = t as any;
	}

	return {
		ipython: createIpythonToolDefinition(cwd, options?.ipython),
		bash: createBashToolDefinition(cwd),
		edit: createEditToolDefinition(cwd),
		read: createReadToolDefinition(cwd),
		write: createWriteToolDefinition(cwd),
		...graftMap,
		...pantheonMap,
	};
}
