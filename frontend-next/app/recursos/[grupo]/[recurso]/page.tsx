"use client"

import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import ResourceListPage from "@/components/resources/ResourceListPage"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { findModuleResource } from "@/lib/modules"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

export default function RecursosRecursoPage({
  params,
}: {
  params: { grupo: string; recurso: string }
}) {
  const { loading } = useAuthGuard()
  const found = findModuleResource(params.grupo, params.recurso)
  const requiredGroups = requiredGroupsForResourceGroup(params.grupo)

  if (loading) return null

  if (!found) {
    return (
      <AppLayout requiredGroups={requiredGroups}>
        <div className="space-y-6">
          <PageHeader
            title="Recurso não encontrado"
            subtitle={`${params.grupo}/${params.recurso}`}
          />
          <div className="text-sm text-[var(--gray-700)]">
            O recurso solicitado não existe na lista atual.
          </div>
          <Link
            href={`/recursos/${params.grupo}`}
            className="text-sm text-[var(--gray-700)] underline"
          >
            Voltar
          </Link>
        </div>
      </AppLayout>
    )
  }

  const basePath = `/recursos/${found.group.key}/${found.resource.key}`

  return (
    <ResourceListPage
      title={`${found.group.label} / ${found.resource.label}`}
      endpoint={found.resource.endpoint}
      adminListHref={found.resource.adminListHref}
      createHref={`${basePath}/novo`}
      rowHref={(row) =>
        `${basePath}/${row.id ?? row.pk ?? row.id_custom ?? ""}`.replace(/\/?$/, "")
      }
      requiredGroups={requiredGroups}
    />
  )
}
