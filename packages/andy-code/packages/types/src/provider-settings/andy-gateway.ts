import { z } from "zod"

import { providerIdentifiers } from "../provider-identifiers.js"
import { baseProviderSettingsShape, createModelIdAccessor, createProviderDefinition } from "./common.js"

export const ANDY_GATEWAY_MODEL_ID_FIELD = "andyGatewayModelId"
export const ZOO_GATEWAY_MODEL_ID_FIELD = ANDY_GATEWAY_MODEL_ID_FIELD

export const andyGatewayProviderDefinition = createProviderDefinition({
	apiProvider: providerIdentifiers.andyGateway,
	modelIdKey: ANDY_GATEWAY_MODEL_ID_FIELD,
	getModelId: createModelIdAccessor(ANDY_GATEWAY_MODEL_ID_FIELD),
	schema: {
		...baseProviderSettingsShape,
		andySessionToken: z.string().optional(),
		[ANDY_GATEWAY_MODEL_ID_FIELD]: z.string().optional(),
		andyGatewayBaseUrl: z.string().optional(),
	},
})
