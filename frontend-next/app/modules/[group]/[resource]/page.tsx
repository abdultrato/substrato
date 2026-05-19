"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import ResourceListPage from "@/components/resources/ResourceListPage"
import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { findModuleResource } from "@/lib/modules"
import { routeParamToString } from "@/lib/routeParams"
import { GROUPS } from "@/lib/rbac"

export default function ModuloRecursoPage() {
    const params = useParams()
    const groupKey = routeParamToString((params as any)?.group)
    const resourceKey = routeParamToString((params as any)?.resource)
    const { loading } = useAuthGuard()
    const { modules } = useModulesCatalog()
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
                        title="Recurso não encontrado"
                        subtitle={`${groupKey}/${resourceKey}`}
                    />
                    <div className="text-sm text-gray-600">
                        O recurso solicitado não existe na lista atual.
                    </div>
                    <Link href={`/modules/${groupKey}`} className="text-sm text-gray-700 underline">
                        Voltar
                    </Link>
                </div>
            </AppLayout>
        )
    }

    return (
        <ResourceListPage
            title={`${found.group.label} / ${found.resource.label}`}
            endpoint={found.resource.endpoint}
            adminListHref={found.resource.adminListHref}
            requiredGroups={requiredGroups}
        />
    )
}
