import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";

import {
	clearAndyCodeToken,
	clearAndyCodeUserInfo,
	disconnectAndyCode,
	getCachedAndyCodeToken,
	getCachedAndyCodeUserInfo,
	getAndyCodeBaseUrl,
	handleAuthCallback,
	initAndyCodeAuth,
	resolveAndyGatewaySessionToken,
	setAndyCodeToken,
	setAndyCodeUserInfo,
	verifyAndyCodeToken,
} from "../andy-code-auth";

vi.mock("vscode", () => ({
	workspace: {
		getConfiguration: vi.fn(() => ({
			get: vi.fn((key: string, defaultValue?: string) => defaultValue),
		})),
	},
	window: {
		showErrorMessage: vi.fn(),
		showInformationMessage: vi.fn(),
	},
}));

vi.mock("../i18n", () => ({
	t: vi.fn((key: string) => key),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("andy-code-auth", () => {
	let mockSecrets: any;
	let mockContext: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockReset();

		const secretStore: Record<string, string> = {};
		mockSecrets = {
			get: vi.fn(async (key: string) => secretStore[key]),
			store: vi.fn(async (key: string, value: string) => {
				secretStore[key] = value;
			}),
			delete: vi.fn(async (key: string) => {
				delete secretStore[key];
			}),
			onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
		};

		mockContext = {
			secrets: mockSecrets,
		};
	});

	afterEach(async () => {
		await clearAndyCodeToken();
		await clearAndyCodeUserInfo();
		vi.restoreAllMocks();
	});

	describe("getCachedAndyCodeToken", () => {
		it("returns an empty string when no token is set", async () => {
			await clearAndyCodeToken();

			expect(getCachedAndyCodeToken()).toBe("");
		});

		it("preloads the cached token during initialization", async () => {
			await mockSecrets.store("andy-code-session-token", "zoo_ext_cached_token");
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ valid: true }),
			});

			await initAndyCodeAuth(mockContext);
			await Promise.resolve();

			expect(getCachedAndyCodeToken()).toBe("zoo_ext_cached_token");
		});
	});

	describe("initAndyCodeAuth", () => {
		it("clears stored user info and token when the cached token is invalid", async () => {
			await mockSecrets.store("andy-code-session-token", "zoo_ext_stale_token");
			await mockSecrets.store("andy-code-user-name", "Jane Doe");
			await mockSecrets.store("andy-code-user-email", "jane@example.com");
			await mockSecrets.store("andy-code-user-image", "https://example.com/avatar.png");
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ valid: false }),
			});

			await initAndyCodeAuth(mockContext);

			// Both token and user info should be cleared on a definitive invalid response
			expect(getCachedAndyCodeToken()).toBe("");
			expect(getCachedAndyCodeUserInfo()).toEqual({
				name: undefined,
				email: undefined,
				image: undefined,
			});
		});

		it("clears stored user info and token when backend returns HTTP error (invalid token)", async () => {
			await mockSecrets.store("andy-code-session-token", "zoo_ext_stale_token");
			await mockSecrets.store("andy-code-user-name", "Jane Doe");
			await mockSecrets.store("andy-code-user-email", "jane@example.com");
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: "Unauthorized",
			});

			await initAndyCodeAuth(mockContext);

			expect(getCachedAndyCodeToken()).toBe("");
			expect(getCachedAndyCodeUserInfo()).toEqual({
				name: undefined,
				email: undefined,
				image: undefined,
			});
		});

		it("preserves token and user info when the backend is temporarily unreachable", async () => {
			await mockSecrets.store("andy-code-session-token", "zoo_ext_valid_token");
			await mockSecrets.store("andy-code-user-name", "Jane Doe");
			await mockSecrets.store("andy-code-user-email", "jane@example.com");
			// Simulate a network error during verification
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			await initAndyCodeAuth(mockContext);

			expect(getCachedAndyCodeToken()).toBe("zoo_ext_valid_token");
			expect(getCachedAndyCodeUserInfo().name).toBe("Jane Doe");
		});

		it("preserves token and user info when verify returns 5xx (transient backend error)", async () => {
			await mockSecrets.store("andy-code-session-token", "zoo_ext_valid_token");
			await mockSecrets.store("andy-code-user-name", "Jane Doe");
			await mockSecrets.store("andy-code-user-email", "jane@example.com");
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 503,
				statusText: "Service Unavailable",
			});

			await initAndyCodeAuth(mockContext);

			expect(getCachedAndyCodeToken()).toBe("zoo_ext_valid_token");
			expect(getCachedAndyCodeUserInfo().name).toBe("Jane Doe");
		});
	});

	describe("clearAndyCodeToken", () => {
		it("clears the cached token", async () => {
			await initAndyCodeAuth(mockContext);
			await setAndyCodeToken("zoo_ext_test_token");

			await clearAndyCodeToken();

			expect(getCachedAndyCodeToken()).toBe("");
		});
	});

	describe("getAndyCodeBaseUrl", () => {
		it("returns the default URL when ANDY_CODE_BASE_URL is not set", () => {
			const originalEnv = process.env.ANDY_CODE_BASE_URL;
			delete process.env.ANDY_CODE_BASE_URL;

			expect(getAndyCodeBaseUrl()).toBe("https://ia.v2nethost.cl:3000");

			if (originalEnv) {
				process.env.ANDY_CODE_BASE_URL = originalEnv;
			}
		});

		it("respects ANDY_CODE_BASE_URL", () => {
			const originalEnv = process.env.ANDY_CODE_BASE_URL;
			process.env.ANDY_CODE_BASE_URL = "https://staging.ia.v2nethost.cl:3000";

			expect(getAndyCodeBaseUrl()).toBe("https://staging.ia.v2nethost.cl:3000");

			if (originalEnv) {
				process.env.ANDY_CODE_BASE_URL = originalEnv;
			} else {
				delete process.env.ANDY_CODE_BASE_URL;
			}
		});
	});

	describe("handleAuthCallback", () => {
		it("does not persist a token when backend verification fails", async () => {
			await initAndyCodeAuth(mockContext);
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ valid: false }),
			});

			const success = await handleAuthCallback("zoo_ext_fake_token");

			expect(success).toBe(false);
			expect(getCachedAndyCodeToken()).toBe("");
			expect(mockSecrets.store).not.toHaveBeenCalledWith("andy-code-session-token", "zoo_ext_fake_token");
		});

		it("persists a token only after backend verification succeeds", async () => {
			await initAndyCodeAuth(mockContext);
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ valid: true }),
			});

			const success = await handleAuthCallback("zoo_ext_real_token");

			expect(success).toBe(true);
			expect(getCachedAndyCodeToken()).toBe("zoo_ext_real_token");
			expect(mockSecrets.store).toHaveBeenCalledWith("andy-code-session-token", "zoo_ext_real_token");
		});
	});

	describe("verifyAndyCodeToken", () => {
		it("returns 'valid' when the backend confirms the token", async () => {
			await initAndyCodeAuth(mockContext);
			await setAndyCodeToken("zoo_ext_valid_token");
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ valid: true }),
			});

			expect(await verifyAndyCodeToken()).toBe("valid");
			// Token should NOT be cleared — no side effects
			expect(getCachedAndyCodeToken()).toBe("zoo_ext_valid_token");
		});

		it("returns 'invalid' when the backend reports valid: false", async () => {
			await initAndyCodeAuth(mockContext);
			await setAndyCodeToken("zoo_ext_invalid_token");
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ valid: false }),
			});

			expect(await verifyAndyCodeToken()).toBe("invalid");
			// No side effects — caller decides what to do
			expect(getCachedAndyCodeToken()).toBe("zoo_ext_invalid_token");
		});

		it("returns 'invalid' when the backend returns 4xx", async () => {
			await initAndyCodeAuth(mockContext);
			await setAndyCodeToken("zoo_ext_invalid_token");
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: "Unauthorized",
			});

			expect(await verifyAndyCodeToken()).toBe("invalid");
		});

		it("returns 'unreachable' when the backend returns 5xx (transient)", async () => {
			await initAndyCodeAuth(mockContext);
			await setAndyCodeToken("zoo_ext_token");
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 503,
				statusText: "Service Unavailable",
			});

			expect(await verifyAndyCodeToken()).toBe("unreachable");
			expect(getCachedAndyCodeToken()).toBe("zoo_ext_token");
		});

		it("returns 'unreachable' when a network error occurs", async () => {
			await initAndyCodeAuth(mockContext);
			await setAndyCodeToken("zoo_ext_token");
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			expect(await verifyAndyCodeToken()).toBe("unreachable");
			// Token must NOT be cleared on network error
			expect(getCachedAndyCodeToken()).toBe("zoo_ext_token");
		});

		it("returns 'invalid' when no token is stored", async () => {
			await initAndyCodeAuth(mockContext);

			expect(await verifyAndyCodeToken()).toBe("invalid");
		});
	});

	describe("setAndyCodeUserInfo", () => {
		it("clears email when passed null", async () => {
			await initAndyCodeAuth(mockContext);
			await setAndyCodeUserInfo({
				name: "Jane Doe",
				email: "jane@example.com",
				image: "https://example.com/avatar.png",
			});

			// Verify email is set
			expect(getCachedAndyCodeUserInfo().email).toBe("jane@example.com");

			// Clear email with null
			await setAndyCodeUserInfo({ email: null });

			// Email should be cleared, but other fields should remain
			const info = getCachedAndyCodeUserInfo();
			expect(info.email).toBeUndefined();
			expect(info.name).toBe("Jane Doe");
			expect(info.image).toBe("https://example.com/avatar.png");
		});

		it("does not clear email when passed undefined", async () => {
			await initAndyCodeAuth(mockContext);
			await setAndyCodeUserInfo({
				name: "Jane Doe",
				email: "jane@example.com",
				image: "https://example.com/avatar.png",
			});

			// Pass undefined for email - should preserve existing value
			await setAndyCodeUserInfo({ name: "John Doe", email: undefined });

			const info = getCachedAndyCodeUserInfo();
			expect(info.email).toBe("jane@example.com");
			expect(info.name).toBe("John Doe");
		});
	});

	describe("resolveAndyGatewaySessionToken", () => {
		it("prefers the cached token over a profile token", async () => {
			await initAndyCodeAuth(mockContext);
			await setAndyCodeToken("zoo_ext_cached");

			expect(resolveAndyGatewaySessionToken("zoo_ext_profile")).toBe("zoo_ext_cached");
		});

		it("ignores profile tokens after an explicit sign-out clear", async () => {
			await initAndyCodeAuth(mockContext);
			await setAndyCodeToken("zoo_ext_cached");
			await clearAndyCodeToken();

			expect(resolveAndyGatewaySessionToken("zoo_ext_stale_profile")).toBeUndefined();
		});

		it("falls back to the profile token when the cache is empty and not cleared", async () => {
			await initAndyCodeAuth(mockContext);

			expect(resolveAndyGatewaySessionToken("zoo_ext_profile")).toBe("zoo_ext_profile");
		});
	});

	describe("disconnectAndyCode", () => {
		it("revokes the current token and clears cached auth state", async () => {
			await initAndyCodeAuth(mockContext);
			await setAndyCodeToken("zoo_ext_real_token");
			await setAndyCodeUserInfo({
				name: "Jane Doe",
				email: "jane@example.com",
				image: "https://example.com/avatar.png",
			});
			mockFetch.mockResolvedValueOnce({ ok: true });

			await disconnectAndyCode();

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/extension/auth/revoke"),
				expect.objectContaining({
					method: "POST",
					headers: { Authorization: "Bearer zoo_ext_real_token" },
				}),
			);
			expect(getCachedAndyCodeToken()).toBe("");
			expect(getCachedAndyCodeUserInfo()).toEqual({
				name: undefined,
				email: undefined,
				image: undefined,
			});
		});
	});
});
