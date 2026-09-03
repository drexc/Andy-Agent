vi.mock("vscode", () => ({
	window: {
		showInformationMessage: vi.fn(),
	},
}));

import * as vscode from "vscode";

const {
	mockGetVisibleInstance,
	mockGetAllInstances,
	mockHandleAndyCodeAuthCallback,
	mockSetAndyCodeUserInfo,
	mockVisibleProvider,
} = vi.hoisted(() => {
	const mockVisibleProvider = {
		handleOpenRouterCallback: vi.fn(),
		handleRequestyCallback: vi.fn(),
		handleAndyCodeCallback: vi.fn(),
	} as any;

	return {
		mockGetVisibleInstance: vi.fn(() => mockVisibleProvider),
		mockGetAllInstances: vi.fn(() => [mockVisibleProvider]),
		mockHandleAndyCodeAuthCallback: vi.fn(),
		mockSetAndyCodeUserInfo: vi.fn(),
		mockVisibleProvider,
	};
});

vi.mock("../../core/webview/ClineProvider", () => ({
	ClineProvider: {
		getVisibleInstance: mockGetVisibleInstance,
		getAllInstances: mockGetAllInstances,
	},
}));

vi.mock("../../services/andy-code-auth", () => ({
	handleAuthCallback: mockHandleAndyCodeAuthCallback,
	setAndyCodeUserInfo: mockSetAndyCodeUserInfo,
}));

import { handleUri } from "../handleUri";

describe("handleUri", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetVisibleInstance.mockReturnValue(mockVisibleProvider);
		mockGetAllInstances.mockReturnValue([mockVisibleProvider]);
	});

	it("ignores legacy cloud auth callback", async () => {
		await handleUri({
			path: "/auth/clerk/callback",
			query: "code=test-code&state=test-state&organizationId=test-org",
		} as any);

		expect(mockVisibleProvider.handleOpenRouterCallback).not.toHaveBeenCalled();
		expect(mockVisibleProvider.handleRequestyCallback).not.toHaveBeenCalled();
		expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
			"Roo Code Cloud sign-in is currently unavailable. Configure another provider to continue.",
		);
	});

	it("stores callback user info even when no provider instances exist", async () => {
		mockGetVisibleInstance.mockReturnValue(null);
		mockGetAllInstances.mockReturnValue([]);
		mockHandleAndyCodeAuthCallback.mockResolvedValue(true);

		await handleUri({
			path: "/auth-callback",
			query: "token=zoo_ext_test_token&name=Jane%20Doe&email=jane%40example.com&image=https%3A%2F%2Fexample.com%2Favatar.png",
		} as any);

		expect(mockHandleAndyCodeAuthCallback).toHaveBeenCalledWith("zoo_ext_test_token");
		expect(mockSetAndyCodeUserInfo).toHaveBeenCalledWith({
			name: "Jane Doe",
			email: "jane@example.com",
			image: "https://example.com/avatar.png",
		});
		// No provider instances exist, so handleAndyCodeCallback should not be called
		expect(mockVisibleProvider.handleAndyCodeCallback).not.toHaveBeenCalled();
	});

	it("refreshes the visible provider after a successful auth callback", async () => {
		mockHandleAndyCodeAuthCallback.mockResolvedValue(true);

		await handleUri({
			path: "/auth-callback",
			query: "token=zoo_ext_test_token",
		} as any);

		// When no user info is provided, null values are passed to clear stale data
		expect(mockSetAndyCodeUserInfo).toHaveBeenCalledWith({
			name: null,
			email: null,
			image: null,
		});
		expect(mockVisibleProvider.handleAndyCodeCallback).toHaveBeenCalledWith("zoo_ext_test_token");
	});

	it("clears stale user info fields when re-authing with missing fields", async () => {
		mockHandleAndyCodeAuthCallback.mockResolvedValue(true);

		// Re-auth with only name - email and image should be cleared
		await handleUri({
			path: "/auth-callback",
			query: "token=zoo_ext_test_token&name=John%20Doe",
		} as any);

		expect(mockSetAndyCodeUserInfo).toHaveBeenCalledWith({
			name: "John Doe",
			email: null,
			image: null,
		});
	});

	it("does not persist user info when auth callback validation fails", async () => {
		mockHandleAndyCodeAuthCallback.mockResolvedValue(false);

		await handleUri({
			path: "/auth-callback",
			query: "token=zoo_ext_test_token&name=Jane%20Doe",
		} as any);

		expect(mockSetAndyCodeUserInfo).not.toHaveBeenCalled();
		expect(mockVisibleProvider.handleAndyCodeCallback).not.toHaveBeenCalled();
	});

	it("propagates the callback token to every ClineProvider instance, not just the visible one", async () => {
		// Regression: prior to multi-instance fan-out, hidden providers (sidebar collapsed,
		// secondary panels) never received the andySessionToken, so their profile settings
		// stayed unauthenticated until reload.
		mockHandleAndyCodeAuthCallback.mockResolvedValue(true);

		const hiddenProvider = { handleAndyCodeCallback: vi.fn() } as any;
		const secondHidden = { handleAndyCodeCallback: vi.fn() } as any;
		mockGetAllInstances.mockReturnValue([mockVisibleProvider, hiddenProvider, secondHidden]);

		await handleUri({
			path: "/auth-callback",
			query: "token=zoo_ext_test_token",
		} as any);

		expect(mockHandleAndyCodeAuthCallback).toHaveBeenCalledWith("zoo_ext_test_token");
		expect(mockSetAndyCodeUserInfo).toHaveBeenCalled();
		expect(mockVisibleProvider.handleAndyCodeCallback).toHaveBeenCalledWith("zoo_ext_test_token");
		expect(hiddenProvider.handleAndyCodeCallback).toHaveBeenCalledWith("zoo_ext_test_token");
		expect(secondHidden.handleAndyCodeCallback).toHaveBeenCalledWith("zoo_ext_test_token");
	});

	it("serializes callbacks across instances to avoid concurrent profile-store writes", async () => {
		// Regression: a previous implementation used Promise.all which fanned out concurrent
		// read-modify-write operations on the same provider settings store. Verify the
		// callbacks are invoked sequentially.
		mockHandleAndyCodeAuthCallback.mockResolvedValue(true);

		const order: string[] = [];
		const makeProvider = (name: string) =>
			({
				handleAndyCodeCallback: vi.fn(async () => {
					order.push(`${name}:start`);
					// Yield to the event loop so a concurrent call would interleave.
					await new Promise((resolve) => setTimeout(resolve, 0));
					order.push(`${name}:end`);
				}),
			}) as any;

		const a = makeProvider("a");
		const b = makeProvider("b");
		mockGetAllInstances.mockReturnValue([a, b]);

		await handleUri({
			path: "/auth-callback",
			query: "token=zoo_ext_test_token",
		} as any);

		expect(order).toEqual(["a:start", "a:end", "b:start", "b:end"]);
	});

	it("continues fan-out when one instance fails to persist the callback token", async () => {
		mockHandleAndyCodeAuthCallback.mockResolvedValue(true);

		const failingProvider = {
			handleAndyCodeCallback: vi.fn(async () => {
				throw new Error("profile store unavailable");
			}),
		} as any;
		const healthyProvider = { handleAndyCodeCallback: vi.fn() } as any;
		mockGetAllInstances.mockReturnValue([failingProvider, healthyProvider]);

		await handleUri({
			path: "/auth-callback",
			query: "token=zoo_ext_test_token",
		} as any);

		expect(failingProvider.handleAndyCodeCallback).toHaveBeenCalledWith("zoo_ext_test_token");
		expect(healthyProvider.handleAndyCodeCallback).toHaveBeenCalledWith("zoo_ext_test_token");
	});
});
