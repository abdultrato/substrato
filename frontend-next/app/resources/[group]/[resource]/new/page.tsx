"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import AutoForm from "@/components/form/AutoForm"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { findModuleResource } from "@/lib/modules"
import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { canCreateUserWithGroupsByHierarchy, GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import { createResourceActionLabel } from "@/lib/resources/createLabels"
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"
import { getTenantIdFromUser } from "@/lib/tenancy"

export default function CriarRecursoPage() {
    const params = useParams()
    const groupKey = routeParamToString((params as any)?.group)
    const resourceKey = routeParamToString((params as any)?.resource)
    const { loading } = useAuthGuard()
    const { t, tr, language } = useLanguage()
    const { user } = useAuth()
    const { modules } = useModulesCatalog("neutral")
    const found = findModuleResource(groupKey, resourceKey, modules)
    const requiredGroups = requiredGroupsForResourceGroup(groupKey)
    const normalizedEndpoint = (found?.resource.endpoint || "").toLowerCase()
    const isIdentityUserResource =
        normalizedEndpoint === "/identity/user/" || normalizedEndpoint === "/identidade/user/"
    const canCreateIdentityUser = canCreateUserWithGroupsByHierarchy(user, [GROUPS.STUDENT])

    if (loading) return null

    if (!found) {
        return (
            <AppLayout requiredGroups={requiredGroups}>
                <div className="space-y-6">
                    <PageHeader
                        title={t("Recurso não encontrado", "Resource not found")}
                        subtitle={t("O recurso solicitado não existe no catálogo atual.", "The requested resource does not exist in the current catalog.")}
                    />
                    <Link
                        href={`/resources/${groupKey}`}
                        className="text-sm text-gray-700 underline"
                    >
                        {t("Voltar", "Back")}
                    </Link>
                </div>
            </AppLayout>
        )
    }

    const canCreateResource = hasOpenApiMethod(found.resource.endpoint, "post")
    const resourceLabel = tr(found.resource.label)
    const createActionLabel = createResourceActionLabel(resourceLabel, language)
    if (!canCreateResource) {
        return (
            <AppLayout requiredGroups={requiredGroups}>
                <div className="mx-auto w-full max-w-5xl space-y-6">
                    <PageHeader
                        title={t("Criação indisponível", "Creation unavailable")}
                        subtitle={t("Este recurso não expõe criação no contrato atual da API.", "This resource does not expose creation in the current API contract.")}
                        actions={
                            <Link
                                href={`/resources/${found.group.key}/${found.resource.key}`}
                                className="text-sm text-[var(--gray-700)] underline"
                            >
                                {t("Voltar", "Back")}
                            </Link>
                        }
                    />
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout requiredGroups={requiredGroups}>
            <div className="mx-auto w-full max-w-5xl space-y-6">
                <PageHeader
                    title={createActionLabel}
                    subtitle={t("Preencha os dados para criar um novo registo.", "Fill in the fields to create a new record.")}
                    actions={
                        <Link
                            href={`/resources/${groupKey}/${resourceKey}`}
                            className="text-sm text-[var(--gray-700)] underline"
                        >
                            {t("Voltar", "Back")}
                        </Link>
                    }
                />

                {(() => {
                    if (isIdentityUserResource && !canCreateIdentityUser) {
                        return (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                {t("Sem autoridade hierárquica para criar utilizadores.", "No hierarchy authority to create users.")}
                            </div>
                        )
                    }

                    const cfg = getResourceFormConfig(groupKey, resourceKey, found.resource.endpoint)
                    const tenantId = getTenantIdFromUser(user)

                    // Se o tenant é herdado automaticamente mas não conseguimos inferir do utilizador logado,
                    // liberamos edição para não bloquear a criação.
                    const makesTenantReadOnly = !!cfg?.somenteLeituraCampos?.includes("tenant")
                    const effectiveConfig =
                        makesTenantReadOnly && !tenantId
                            ? {
                                ...cfg,
                                somenteLeituraCampos: (cfg?.somenteLeituraCampos || []).filter((f) => f !== "tenant"),
                            }
                            : cfg

                    const initialValues = tenantId ? { tenant: tenantId } : {}

                    return (
                <AutoForm
                    endpoint={found.resource.endpoint}
                    method="post"
                    submitLabel={createActionLabel}
                    initialValues={initialValues}
                    config={effectiveConfig}
                    onSuccess={() => {
                        window.location.href = `/resources/${groupKey}/${resourceKey}`
                    }}
                />
                    )
                })()}
            </div>
        </AppLayout>
    )
}
