import { useCallback, useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

import {
	allRouterModelsProvider,
	RouterModelsMessageType,
	type ExtensionMessage,
	type RouterModels,
	providerIdentifiers,
} from "@roo-code/types"

import { useExtensionState } from "@src/context/ExtensionStateContext"

import { fetchRouterModels } from "./useRouterModels"

/**
 * Keeps andy-gateway models in the shared routerModels query fresh when credentials
 * become available (sign-in or profile seeding) without coupling auth to modelCache.
 */
export function useAndyGatewayRouterModelsSync() {
	const queryClient = useQueryClient()
	const { andyCodeIsAuthenticated } = useExtensionState()
	const wasAuthenticatedRef = useRef<boolean | undefined>(undefined)

	const syncAndyGatewayModels = useCallback(async () => {
		if (!andyCodeIsAuthenticated) {
			return
		}

		try {
			const partial = await fetchRouterModels(providerIdentifiers.andyGateway)
			const zooModels = partial[providerIdentifiers.andyGateway]
			if (!zooModels || Object.keys(zooModels).length === 0) {
				return
			}

			queryClient.setQueryData<RouterModels>(
				[RouterModelsMessageType.routerModels, allRouterModelsProvider],
				(current) => (current ? { ...current, [providerIdentifiers.andyGateway]: zooModels } : partial),
			)
		} catch {
			// Ignore: bulk router fetch may still be in flight.
		}
	}, [queryClient, andyCodeIsAuthenticated])

	useEffect(() => {
		const onMessage = (event: MessageEvent) => {
			const message = event.data as ExtensionMessage
			if (message.type === "andyGatewayCredentialsReady") {
				void syncAndyGatewayModels()
			}
		}

		window.addEventListener("message", onMessage)
		return () => window.removeEventListener("message", onMessage)
	}, [syncAndyGatewayModels])

	useEffect(() => {
		const wasAuthenticated = wasAuthenticatedRef.current
		wasAuthenticatedRef.current = andyCodeIsAuthenticated

		if (andyCodeIsAuthenticated && wasAuthenticated === false) {
			void syncAndyGatewayModels()
		}
	}, [andyCodeIsAuthenticated, syncAndyGatewayModels])
}
