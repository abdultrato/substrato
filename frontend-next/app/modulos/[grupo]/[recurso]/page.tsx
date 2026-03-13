"use client"

import Link from "next/link"

import ResourceListPage from "@/components/resources/ResourceListPage"
import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { findModuleResource } from "@/lib/modules"
import { GROUPS } from "@/lib/rbac"

export default function ModuloRecursoPage({
  params,
}: {
  params: { grupo: string; recurso: string }
}) {
  const { loading } = useAuthGuard()
  const found = findModuleResource(params.grupo, params.recurso)

  if (loading) return null

  if (!found) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <PageHeader
            title="Recurso não encontrado"
            subtitle={`${params.grupo}/${params.recurso}`}
          />
          <div className="text-sm text-gray-600">
            O recurso solicitado não existe na lista atual.
          </div>
          <Link href={`/modulos/${params.grupo}`} className="text-sm text-gray-700 underline">
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
      requiredGroups={[GROUPS.ADMIN]}
    />
  )
}
