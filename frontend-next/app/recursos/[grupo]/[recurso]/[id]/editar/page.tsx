"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import AutoForm from "@/components/form/AutoForm"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { findModuleResource } from "@/lib/modules"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

export default function EditarRecursoPage({
  params,
}: {
  params: { grupo: string; recurso: string; id: string }
}) {
  const { loading } = useAuthGuard()
  const router = useRouter()
  const found = findModuleResource(params.grupo, params.recurso)
  const requiredGroups = requiredGroupsForResourceGroup(params.grupo)
  const [initial, setInitial] = useState<Record<string, any> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!found) return
      try {
        setLoadingData(true)
        setError(null)
        const endpoint = `${found.resource.endpoint.replace(/\/$/, "")}/${params.id}/`
        const res = await (await import("@/lib/api")).apiFetch<any>(endpoint)
        if (mounted) setInitial(res ?? {})
      } catch (e: any) {
        if (mounted) setError(e?.message || "Erro ao carregar recurso.")
      } finally {
        if (mounted) setLoadingData(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [found, params.id])

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

  const basePath = `/recursos/${params.grupo}/${params.recurso}`

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="space-y-6">
        <PageHeader
          title={`Editar ${found.resource.label} — ${params.id}`}
          subtitle={found.resource.endpoint}
          actions={
            <Link
              href={`${basePath}/${params.id}`}
              className="text-sm text-[var(--gray-700)] underline"
            >
              Voltar
            </Link>
          }
        />

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        {loadingData ? (
          <div className="text-sm text-[var(--gray-500)]">Carregando...</div>
        ) : (
          <AutoForm
            endpoint={`${found.resource.endpoint.replace(/\/$/, "")}/${params.id}/`}
            method="put"
            initialValues={initial || {}}
            submitLabel="Salvar"
            onSuccess={() =>
              router.push(`/recursos/${params.grupo}/${params.recurso}/${params.id}`)
            }
          />
        )}
      </div>
    </AppLayout>
  )
}
