import { useEffect, useMemo } from "react"
import {
	type ProviderSettings,
	type OrganizationAllowList,
	type RouterModels,
	andyGatewayDefaultModelId,
	providerIdentifiers,
} from "@roo-code/types"

import { useExtensionState } from "@src/context/ExtensionStateContext"
import { getAndyCodeAuthUrl } from "@src/oauth/urls"
import { useAppTranslation } from "@src/i18n/TranslationContext"
import { VSCodeButtonLink } from "@src/components/common/VSCodeButtonLink"

import { ModelPicker } from "../ModelPicker"
import { ApiErrorMessage } from "../ApiErrorMessage"

type AndyGatewayProps = {
	apiConfiguration: ProviderSettings
	setApiConfigurationField: (field: keyof ProviderSettings, value: ProviderSettings[keyof ProviderSettings]) => void
	routerModels?: RouterModels
	organizationAllowList: OrganizationAllowList
	modelValidationError?: string
	simplifySettings?: boolean
}

function isClaudeSonnetModelId(id: string) {
	return /claude.*sonnet/i.test(id)
}

// Exported for unit tests. Picks the default Andy Gateway model id, preferring
// Claude Sonnet 4.5 → Sonnet 4 → first available Sonnet → first model overall.
export function pickAndyGatewayDefaultModelId(modelIds: string[]) {
	if (modelIds.length === 0) {
		return andyGatewayDefaultModelId
	}

	const sonnets = modelIds.filter(isClaudeSonnetModelId)
	if (sonnets.length === 0) {
		return modelIds[0]
	}

	return (
		sonnets.find((id) => id === "anthropic/claude-sonnet-4.5") ??
		sonnets.find((id) => id.includes("claude-sonnet-4.5")) ??
		sonnets.find((id) => /sonnet-4[.-]5/i.test(id)) ??
		sonnets.find((id) => /sonnet-4(?![.-]?\d)/i.test(id)) ??
		sonnets[0]
	)
}

export const AndyGateway = ({
	apiConfiguration,
	setApiConfigurationField,
	routerModels,
	organizationAllowList,
	modelValidationError,
	simplifySettings,
}: AndyGatewayProps) => {
	const { t } = useAppTranslation()
	const { andyCodeIsAuthenticated, andyCodeUserEmail, andyCodeUserName, andyCodeBaseUrl, uriScheme, deviceName } =
		useExtensionState()

	const authUrl = getAndyCodeAuthUrl(uriScheme, andyCodeBaseUrl, deviceName)
	const resolvedDashboardBase = andyCodeBaseUrl?.replace(/\/$/, "") || "https://ia.v2nethost.cl:3000"

	const zooModels = useMemo(() => routerModels?.[providerIdentifiers.andyGateway] ?? {}, [routerModels])
	const modelIds = useMemo(() => Object.keys(zooModels), [zooModels])
	const resolvedDefaultModelId = useMemo(() => pickAndyGatewayDefaultModelId(modelIds), [modelIds])

	useEffect(() => {
		if (modelIds.length === 0) {
			return
		}

		const current = apiConfiguration.andyGatewayModelId
		if (!current || !modelIds.includes(current)) {
			setApiConfigurationField("andyGatewayModelId", resolvedDefaultModelId)
		}
	}, [apiConfiguration.andyGatewayModelId, modelIds, resolvedDefaultModelId, setApiConfigurationField])

	return (
		<>
			<div className="flex flex-col gap-1 rounded-md border border-vscode-panel-border p-2">
				<div className="flex items-center justify-between">
					<label className="block text-sm font-medium">{t("settings:providers.andyGateway.account")}</label>
					{andyCodeIsAuthenticated && andyCodeUserEmail && (
						<span className="text-xs text-vscode-descriptionForeground">{andyCodeUserEmail}</span>
					)}
				</div>
				{!andyCodeIsAuthenticated ? (
					<div className="flex flex-col gap-1">
						<ApiErrorMessage errorMessage={t("settings:validation.andyGatewaySignIn")} />
						<p className="text-xs text-vscode-descriptionForeground">
							{t("settings:providers.andyGateway.signInDescription")}
						</p>
						<VSCodeButtonLink href={authUrl} appearance="primary">
							{t("settings:providers.andyGateway.signInButton")}
						</VSCodeButtonLink>
					</div>
				) : (
					<div className="flex items-center gap-1">
						<span className="codicon codicon-check text-vscode-charts-green" />
						<span className="text-xs text-vscode-descriptionForeground">
							{andyCodeUserName
								? t("settings:providers.andyGateway.authenticatedAs", { name: andyCodeUserName })
								: t("settings:providers.andyGateway.authenticated")}
						</span>
					</div>
				)}
			</div>
			<ModelPicker
				apiConfiguration={apiConfiguration}
				setApiConfigurationField={setApiConfigurationField}
				defaultModelId={resolvedDefaultModelId}
				models={zooModels}
				modelIdKey="andyGatewayModelId"
				serviceName="Andy Gateway"
				serviceUrl={`${resolvedDashboardBase}/dashboard/models`}
				organizationAllowList={organizationAllowList}
				errorMessage={modelValidationError}
				simplifySettings={simplifySettings}
			/>
		</>
	)
}
