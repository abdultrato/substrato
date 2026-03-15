"use client"

import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import AutoForm from "@/components/form/AutoForm"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { findModuleResource } from "@/lib/modules"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

export default function NovoRecursoPage({
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
          <Link
            href={`/recursos/${params.grupo}`}
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
              href={`/recursos/${params.grupo}/${params.recurso}`}
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
            window.location.href = `/recursos/${params.grupo}/${params.recurso}`
          }}
        />
      </div>
    </AppLayout>
  )
}
