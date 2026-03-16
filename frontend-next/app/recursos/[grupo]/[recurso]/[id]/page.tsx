"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { apiFetch } from "@/lib/api"
import { findModuleResource } from "@/lib/modules"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

function ensureTrailingSlash(url: string) {
  return url.endsWith("/") ? url : `${url}/`
}

export default function RecursoDetalhePage() {
  const params = useParams()
  const grupo = routeParamToString((params as any)?.grupo)
  const recurso = routeParamToString((params as any)?.recurso)
  const id = routeParamToString((params as any)?.id)
  const { loading } = useAuthGuard()
  const router = useRouter()
  const found = findModuleResource(grupo, recurso)
  const requiredGroups = requiredGroupsForResourceGroup(grupo)
  const [data, setData] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!found) return
      try {
        setLoadingData(true)
        setError(null)
        const endpoint = ensureTrailingSlash(found.resource.endpoint) + `${id}/`
        const res = await apiFetch<any>(endpoint)
        if (mounted) setData(res)
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
  }, [found, id])

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
            className="text-sm text-[var(--gray-700)] underline"
          >
            Voltar
          </Link>
        </div>
      </AppLayout>
    )
  }

  async function handleDelete() {
    if (!confirm("Apagar este registro?")) return
    setDeleting(true)
    setError(null)
    try {
      const endpoint = ensureTrailingSlash(found.resource.endpoint) + `${id}/`
      await apiFetch(endpoint, { method: "DELETE" })
      router.push(`/recursos/${grupo}/${recurso}`)
    } catch (e: any) {
      setError(e?.message || "Erro ao apagar.")
    } finally {
      setDeleting(false)
    }
  }

  const basePath = `/recursos/${grupo}/${recurso}`

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="space-y-6">
        <PageHeader
          title={`${found.resource.label} — ${id}`}
          subtitle={found.resource.endpoint}
          actions={
            <div className="flex gap-3">
              <Link
                href={`${basePath}/${id}/editar`}
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
              >
                Editar
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {deleting ? "Apagando..." : "Apagar"}
              </button>
              <Link
                href={basePath}
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
              >
                Voltar
              </Link>
            </div>
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
          <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--gray-100)] p-4 text-xs text-[var(--text)]">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </AppLayout>
  )
}
