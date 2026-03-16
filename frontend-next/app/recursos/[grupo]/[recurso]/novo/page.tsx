"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import AutoForm from "@/components/form/AutoForm"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { findModuleResource } from "@/lib/modules"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

export default function NovoRecursoPage() {
  const params = useParams()
  const grupo = routeParamToString((params as any)?.grupo)
  const recurso = routeParamToString((params as any)?.recurso)
  const { loading } = useAuthGuard()
  const found = findModuleResource(grupo, recurso)
  const requiredGroups = requiredGroupsForResourceGroup(grupo)

  if (loading) return null

  if (!found) {
    return (
      <AppLayout requiredGroups={requiredGroups}>
        <div className="space-y-6">
          <PageHeader
            title="Recurso não encontrado"
            subtitle={`${grupo}/${recurso}`}
          />
          <Link
            href={`/recursos/${grupo}`}
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
      <div className="space-y-6">
        <PageHeader
          title={`Novo ${found.resource.label}`}
          subtitle={found.resource.endpoint}
          actions={
            <Link
              href={`/recursos/${grupo}/${recurso}`}
              className="text-sm text-[var(--gray-700)] underline"
            >
              Voltar
            </Link>
          }
        />

        <AutoForm
          endpoint={found.resource.endpoint}
          method="post"
          submitLabel="Criar"
          onSuccess={() => {
            window.location.href = `/recursos/${grupo}/${recurso}`
          }}
        />
      </div>
    </AppLayout>
  )
}
