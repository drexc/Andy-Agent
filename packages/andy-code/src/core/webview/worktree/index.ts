/**
 * Worktree Module
 *
 * VSCode-specific handlers for git worktree management.
 * Bridges webview messages to the platform-agnostic core services.
 */

// Re-export types from @roo-code/types for convenience
export type { WorktreeDefaultsResponse, WorktreeListResponse } from "@roo-code/types";
export {
	handleCheckBranchWorktreeInclude,
	handleCheckoutBranch,
	handleCreateWorktree,
	handleCreateWorktreeInclude,
	handleDeleteWorktree,
	handleGetAvailableBranches,
	handleGetWorktreeDefaults,
	handleGetWorktreeIncludeStatus,
	handleListWorktrees,
	handleSwitchWorktree,
} from "./handlers";
