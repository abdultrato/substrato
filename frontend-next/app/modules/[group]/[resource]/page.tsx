"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import ResourceListPage from "@/components/resources/ResourceListPage"
import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { useWorkspaceScope } from "@/hooks/useWorkspaceScope"
import { findModuleResource } from "@/lib/modules"
import { routeParamToString } from "@/lib/routeParams"
import { GROUPS } from "@/lib/rbac"

export default function ModuloRecursoPage() {
    const params = useParams()
    const groupKey = routeParamToString((params as any)?.group)
    const resourceKey = routeParamToString((params as any)?.resource)
    const { loading } = useAuthGuard()
    const { t, tr } = useLanguage()
    const workspaceScope = useWorkspaceScope()
    const { modules } = useModulesCatalog(workspaceScope)
    const found = findModuleResource(groupKey, resourceKey, modules)
    const allGroups = Object.values(GROUPS)
    const requiredGroups =
        found?.group.key === "equipamentos" ? allGroups : [GROUPS.ADMIN, GROUPS.LABORATORIO]

    if (loading) return null

    if (!found) {
        return (
            <AppLayout>
                <div className="space-y-6">
                    <PageHeader
                        title={t("Recurso não encontrado", "Resource not found")}
                        subtitle={t("O recurso solicitado não existe no catálogo atual.", "The requested resource does not exist in the current catalog.")}
                    />
                    <div className="text-sm text-gray-600">
                        {t("O recurso solicitado não existe na lista atual.", "The requested resource does not exist in the current list.")}
                    </div>
                    <Link href={`/modules/${groupKey}`} className="text-sm text-gray-700 underline">
                        {t("Voltar", "Back")}
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
            requiredGroups={requiredGroups}
        />
    )
}
