"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import ResourceListPage from "@/components/resources/ResourceListPage"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { findModuleResource } from "@/lib/modules"
import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import { buildRecordDetailHref } from "@/lib/resources/recordIdentity"

export default function RecursosRecursoPage() {
    const params = useParams()
    const groupKey = routeParamToString((params as any)?.group)
    const resourceKey = routeParamToString((params as any)?.resource)
    const { loading } = useAuthGuard()
    const { t, tr } = useLanguage()
    const { modules } = useModulesCatalog("neutral")
    const found = findModuleResource(groupKey, resourceKey, modules)
    const requiredGroups = requiredGroupsForResourceGroup(groupKey)

    if (loading) return null

    if (!found) {
        return (
            <AppLayout requiredGroups={requiredGroups}>
                <div className="space-y-6">
                    <PageHeader
                        title={t("Recurso não encontrado", "Resource not found")}
                        subtitle={t("O recurso solicitado não existe no catálogo atual.", "The requested resource does not exist in the current catalog.")}
                    />
                    <div className="text-sm text-[var(--gray-700)]">
                        {t("O recurso solicitado não existe na lista atual.", "The requested resource does not exist in the current list.")}
                    </div>
                    <Link
                        href={`/resources/${groupKey}`}
                        className="text-sm text-[var(--gray-700)] no-underline hover:underline"
                    >
                        {t("Voltar", "Back")}
                    </Link>
                </div>
            </AppLayout>
        )
    }

    const basePath = `/resources/${found.group.key}/${found.resource.key}`
    const canList = hasOpenApiMethod(found.resource.endpoint, "get")
    const canCreate = hasOpenApiMethod(found.resource.endpoint, "post")

    if (!canList) {
        return (
            <AppLayout requiredGroups={requiredGroups}>
                <div className="space-y-6">
                    <PageHeader
                        title={t("Listagem indisponível", "List unavailable")}
                        subtitle={t("Este recurso existe no catálogo, mas a API não expõe listagem para ele.", "This resource exists in the catalog, but the API does not expose a list endpoint for it.")}
                    />
                    <Link
                        href={`/resources/${found.group.key}`}
                        className="text-sm text-[var(--gray-700)] no-underline hover:underline"
                    >
                        {t("Voltar ao módulo", "Back to module")}
                    </Link>
                </div>
            </AppLayout>
        )
    }

    return (
        <ResourceListPage
            title={`${tr(found.group.label)} / ${tr(found.resource.label)}`}
            subtitle={t("Registos disponíveis no recurso selecionado.", "Available records in the selected resource.")}
            endpoint={found.resource.endpoint}
            adminListHref={found.resource.adminListHref}
            createHref={canCreate ? `${basePath}/new` : undefined}
            rowHref={(row) => buildRecordDetailHref(basePath, row)}
            requiredGroups={requiredGroups}
        />
    )
}
