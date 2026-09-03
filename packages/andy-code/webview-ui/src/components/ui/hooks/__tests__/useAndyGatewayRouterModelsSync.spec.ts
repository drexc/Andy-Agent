// npx vitest src/components/ui/hooks/__tests__/useAndyGatewayRouterModelsSync.spec.ts

import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { Mock } from "vitest"

import type { ModelInfo, RouterModels } from "@roo-code/types"

import { useAndyGatewayRouterModelsSync } from "../useAndyGatewayRouterModelsSync"
import { fetchRouterModels } from "../useRouterModels"
import { useExtensionState } from "@src/context/ExtensionStateContext"

vi.mock("../useRouterModels")
vi.mock("@src/context/ExtensionStateContext")

const mockFetchRouterModels = fetchRouterModels as Mock<typeof fetchRouterModels>
const mockUseExtensionState = useExtensionState as unknown as Mock

const modelInfo: ModelInfo = {
	maxTokens: 8192,
	contextWindow: 200000,
	supportsImages: false,
	supportsPromptCache: false,
}

const zooModels = { "anthropic/claude-sonnet-4": modelInfo }

// Test fixtures intentionally carry a single provider key; RouterModels requires
// every provider key, so cast through unknown for these partial literals.
const asRouterModels = (value: Record<string, Record<string, ModelInfo>>) => value as unknown as RouterModels

const setAuthenticated = (andyCodeIsAuthenticated: boolean) => {
	mockUseExtensionState.mockReturnValue({ andyCodeIsAuthenticated })
}

const renderSyncHook = (queryClient: QueryClient) =>
	renderHook(() => useAndyGatewayRouterModelsSync(), {
		wrapper: ({ children }: { children: React.ReactNode }) =>
			React.createElement(QueryClientProvider, { client: queryClient }, children),
	})

const makeQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

beforeEach(() => {
	vi.clearAllMocks()
	mockFetchRouterModels.mockResolvedValue(asRouterModels({ "andy-gateway": zooModels }))
})

describe("useAndyGatewayRouterModelsSync", () => {
	it("does not fetch when the user is not authenticated", async () => {
		setAuthenticated(false)
		const queryClient = makeQueryClient()

		renderSyncHook(queryClient)
		window.dispatchEvent(new MessageEvent("message", { data: { type: "andyGatewayCredentialsReady" } }))

		await Promise.resolve()
		expect(mockFetchRouterModels).not.toHaveBeenCalled()
	})

	it("fetches andy-gateway models on the andyGatewayCredentialsReady message when authenticated", async () => {
		setAuthenticated(true)
		const queryClient = makeQueryClient()

		renderSyncHook(queryClient)
		window.dispatchEvent(new MessageEvent("message", { data: { type: "andyGatewayCredentialsReady" } }))

		await waitFor(() => expect(mockFetchRouterModels).toHaveBeenCalledWith("andy-gateway"))
	})

	it("fetches once on the false -> true authentication transition", async () => {
		setAuthenticated(false)
		const queryClient = makeQueryClient()

		const { rerender } = renderSyncHook(queryClient)
		expect(mockFetchRouterModels).not.toHaveBeenCalled()

		setAuthenticated(true)
		rerender()

		await waitFor(() => expect(mockFetchRouterModels).toHaveBeenCalledTimes(1))
	})

	it("merges into the routerModels cache without clobbering other providers", async () => {
		setAuthenticated(true)
		const queryClient = makeQueryClient()
		const existingOpenrouter = { "openai/gpt-4": modelInfo }
		queryClient.setQueryData(["routerModels", "all"], asRouterModels({ openrouter: existingOpenrouter }))

		renderSyncHook(queryClient)
		window.dispatchEvent(new MessageEvent("message", { data: { type: "andyGatewayCredentialsReady" } }))

		await waitFor(() => {
			const cached = queryClient.getQueryData<RouterModels>(["routerModels", "all"])
			expect(cached?.["andy-gateway"]).toEqual(zooModels)
			expect(cached?.openrouter).toEqual(existingOpenrouter)
		})
	})

	it("does not overwrite the cache when the fetch returns no andy-gateway models", async () => {
		setAuthenticated(true)
		mockFetchRouterModels.mockResolvedValue(asRouterModels({ "andy-gateway": {} }))
		const queryClient = makeQueryClient()
		queryClient.setQueryData(["routerModels", "all"], asRouterModels({ openrouter: { "openai/gpt-4": modelInfo } }))

		renderSyncHook(queryClient)
		window.dispatchEvent(new MessageEvent("message", { data: { type: "andyGatewayCredentialsReady" } }))

		await waitFor(() => expect(mockFetchRouterModels).toHaveBeenCalled())
		const cached = queryClient.getQueryData<RouterModels>(["routerModels", "all"])
		expect(cached?.["andy-gateway"]).toBeUndefined()
		// The whole cache must survive an empty result, not just the andy-gateway key.
		expect(cached?.openrouter).toEqual({ "openai/gpt-4": modelInfo })
	})

	it("swallows fetch errors", async () => {
		setAuthenticated(true)
		mockFetchRouterModels.mockRejectedValue(new Error("router fetch in flight"))
		const queryClient = makeQueryClient()

		renderSyncHook(queryClient)
		expect(() =>
			window.dispatchEvent(new MessageEvent("message", { data: { type: "andyGatewayCredentialsReady" } })),
		).not.toThrow()

		await waitFor(() => expect(mockFetchRouterModels).toHaveBeenCalled())
	})
})
