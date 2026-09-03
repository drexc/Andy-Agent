import type { ModelInfo } from "@roo-code/types";
import axios from "axios";
import { getAndyCodeBaseUrl, resolveZooGatewaySessionToken } from "../../../services/andy-code-auth";
import type { ApiHandlerOptions } from "../../../shared/api";

import {
	parseVercelAiGatewayModel,
	type VercelAiGatewayModel,
	vercelAiGatewayModelsResponseSchema,
} from "./vercel-ai-gateway";

// Bound model discovery so a network stall can't hang provider initialization paths.
const MODEL_DISCOVERY_TIMEOUT_MS = 15_000;

/**
 * getZooGatewayModels
 *
 * Fetches models from the Andy Gateway API. Requires authentication via the zoo_ext_ token.
 */

export async function getZooGatewayModels(options?: ApiHandlerOptions): Promise<Record<string, ModelInfo>> {
	const models: Record<string, ModelInfo> = {};
	const baseURL = options?.zooGatewayBaseUrl ?? `${getAndyCodeBaseUrl()}/api/gateway/v1`;

	const sessionToken = resolveZooGatewaySessionToken(options?.zooSessionToken);
	if (!sessionToken) {
		return models;
	}

	const headers: Record<string, string> = {
		Authorization: `Bearer ${sessionToken}`,
	};

	try {
		const response = await axios.get(`${baseURL}/models`, {
			headers,
			timeout: MODEL_DISCOVERY_TIMEOUT_MS,
		});
		const result = vercelAiGatewayModelsResponseSchema.safeParse(response.data);

		if (!result.success) {
			console.error(`Andy Gateway models response is invalid ${JSON.stringify(result.error.format())}`);
			return models;
		}

		for (const model of result.data.data) {
			const { id } = model;

			// Only include language models for chat inference.
			// Embedding models are statically defined in embeddingModels.ts.
			if (model.type !== "language") {
				continue;
			}

			models[id] = parseZooGatewayModel({ id, model });
		}
	} catch (error) {
		// Log only safe fields; never serialize the full error object because it
		// includes request config/headers which carry the bearer session token.
		const err = error as {
			message?: string;
			name?: string;
			code?: string;
			response?: { status?: number; statusText?: string };
		};
		console.error(
			`Error fetching Andy Gateway models: name=${err.name ?? "Error"} code=${err.code ?? "unknown"} status=${err.response?.status ?? "unknown"} ${err.response?.statusText ?? ""} message=${err.message ?? "unknown error"}`,
		);
	}

	return models;
}

/**
 * parseZooGatewayModel
 *
 * Parses a Andy Gateway model into ModelInfo format.
 * Andy Gateway returns the same format as Vercel AI Gateway, so we can reuse the parsing logic.
 */

export const parseZooGatewayModel = ({ id, model }: { id: string; model: VercelAiGatewayModel }): ModelInfo => {
	return parseVercelAiGatewayModel({ id, model });
};
