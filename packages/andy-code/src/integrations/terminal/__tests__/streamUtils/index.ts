// streamUtils/index.ts
import { createBashCommandStream } from "./bashStream";
import { createCmdCommandStream } from "./cmdStream";
import {
	createBaseMockStream,
	createBashMockStream,
	createChunkedMockStream,
	createCmdMockStream,
	createPowerShellMockStream,
} from "./mockStream";
import { createPowerShellStream } from "./pwshStream";

/**
 * Common interface for all command streams
 */
export interface CommandStream {
	stream: AsyncIterable<string>;
	exitCode: number;
}

/**
 * Check if PowerShell Core (pwsh) is available on the system
 * @returns Boolean indicating whether pwsh is available
 */
export function isPowerShellCoreAvailable(): boolean {
	return (global as any).__TEST_ENV__?.isPowerShellAvailable || false;
}

/**
 * Get the current platform
 * @returns The current platform: 'win32', 'darwin', 'linux', etc.
 */
export function getPlatform(): string {
	return (global as any).__TEST_ENV__?.platform || process.platform;
}

/**
 * Check if the current platform is Windows
 * @returns Boolean indicating whether the current platform is Windows
 */
export function isWindows(): boolean {
	return getPlatform() === "win32";
}

// Export all streams for direct use in specific test files
export {
	// Mock streams
	createBaseMockStream,
	// Real command execution streams
	createBashCommandStream,
	createBashMockStream,
	createChunkedMockStream,
	createCmdCommandStream,
	createCmdMockStream,
	createPowerShellMockStream,
	createPowerShellStream,
};
