"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import ResourceListPage from "@/components/resources/ResourceListPage"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { findModuleResource } from "@/lib/modules"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

export default function RecursosRecursoPage() {
    const params = useParams()
    const groupKey = routeParamToString((params as any)?.group)
    const resourceKey = routeParamToString((params as any)?.resource)
    const { loading } = useAuthGuard()
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
                    <div className="text-sm text-[var(--gray-700)]">
                        O recurso solicitado não existe na lista atual.
                    </div>
                    <Link
                        href={`/resources/${groupKey}`}
                        className="text-sm text-[var(--gray-700)] underline"
                    >
                        Voltar
                    </Link>
                </div>
            </AppLayout>
        )
    }

    const basePath = `/resources/${found.group.key}/${found.resource.key}`

    return (
        <ResourceListPage
            title={`${found.group.label} / ${found.resource.label}`}
            endpoint={found.resource.endpoint}
            adminListHref={found.resource.adminListHref}
            createHref={`${basePath}/new`}
            rowHref={(row) =>
                `${basePath}/${row.id ?? row.pk ?? row.id_custom ?? ""}`.replace(/\/?$/, "")
            }
            requiredGroups={requiredGroups}
        />
    )
}
