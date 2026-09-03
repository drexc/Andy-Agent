/**
 * apply_patch tool module
 *
 * A stripped-down, file-oriented diff format designed to be easy to parse and safe to apply.
 * Based on the Codex apply_patch specification.
 */

export type { ApplyPatchFileChange } from "./apply";
export { ApplyPatchError, applyChunksToContent, processAllHunks, processHunk } from "./apply";
export type { ApplyPatchArgs, Hunk, UpdateFileChunk } from "./parser";
export { ParseError, parsePatch } from "./parser";
export { seekSequence } from "./seek-sequence";
