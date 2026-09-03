// npx vitest run src/core/webview/__tests__/webviewMessageHandler.abandonSubtask.spec.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../i18n", () => ({
	t: vi.fn((key: string) => key),
	changeLanguage: vi.fn(),
}));

vi.mock("vscode", () => ({
	window: { showErrorMessage: vi.fn() },
	workspace: { workspaceFolders: undefined },
}));

import type { ClineProvider } from "../ClineProvider";
import { webviewMessageHandler } from "../webviewMessageHandler";

describe("webviewMessageHandler — abandonSubtaskWithId", () => {
	let provider: { abandonSubtask: ReturnType<typeof vi.fn>; log: (msg: string) => void };

	beforeEach(() => {
		vi.clearAllMocks();
		provider = {
			abandonSubtask: vi.fn().mockResolvedValue(true),
			log: vi.fn(),
		};
	});

	it("calls provider.abandonSubtask with the message text", async () => {
		await webviewMessageHandler(provider as unknown as ClineProvider, {
			type: "abandonSubtaskWithId",
			text: "child-task-99",
		});

		expect(provider.abandonSubtask).toHaveBeenCalledWith("child-task-99");
	});

	it("catches and logs errors from provider.abandonSubtask", async () => {
		const err = new Error("sever failed");
		provider.abandonSubtask!.mockRejectedValue(err);

		// webviewMessageHandler calls .catch() on the promise — it should not throw
		await webviewMessageHandler(provider as unknown as ClineProvider, {
			type: "abandonSubtaskWithId",
			text: "child-task-99",
		});

		// Give the microtask queue a tick so the .catch() fires
		await new Promise((r) => setTimeout(r, 0));

		expect(provider.log).toHaveBeenCalledWith(expect.stringContaining("sever failed"));
	});
});
