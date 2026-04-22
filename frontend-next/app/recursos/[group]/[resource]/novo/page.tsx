"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import AutoForm from "@/components/form/AutoForm"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { findModuleResource } from "@/lib/modules"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"
import { getTenantIdFromUser } from "@/lib/tenancy"

export default function NovoRecursoPage() {
    const params = useParams()
    const groupKey = routeParamToString((params as any)?.group)
    const resourceKey = routeParamToString((params as any)?.resource)
    const { loading } = useAuthGuard()
    const { user } = useAuth()
    const { modules } = useModulesCatalog()
    const found = findModuleResource(groupKey, resourceKey, modules)
    const requiredGroups = requiredGroupsForResourceGroup(groupKey)

    if (loading) return null

    if (!found) {
        return (
            <AppLayout requiredGroups={requiredGroups}>
                <div className="space-y-6">
                    <PageHeader
                        title="Recurso não encontrado"
                        subtitle={`${groupKey}/${resourceKey}`}
                    />
                    <Link
                        href={`/recursos/${groupKey}`}
                        className="text-sm text-gray-700 underline"
                    >
                        Voltar
                    </Link>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout requiredGroups={requiredGroups}>
            <div className="mx-auto w-full max-w-5xl space-y-6">
                <PageHeader
                    title={`Novo ${found.resource.label}`}
                    subtitle={found.resource.endpoint}
                    actions={
                        <Link
                            href={`/recursos/${groupKey}/${resourceKey}`}
                            className="text-sm text-[var(--gray-700)] underline"
                        >
                            Voltar
                        </Link>
                    }
                />

                {(() => {
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
                    submitLabel="Criar"
                    initialValues={initialValues}
                    config={effectiveConfig}
                    onSuccess={() => {
                        window.location.href = `/recursos/${groupKey}/${resourceKey}`
                    }}
                />
                    )
                })()}
            </div>
        </AppLayout>
    )
}
