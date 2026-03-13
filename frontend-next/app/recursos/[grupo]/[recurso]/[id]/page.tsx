"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { apiFetch } from "@/lib/api"
import { findModuleResource } from "@/lib/modules"

function ensureTrailingSlash(url: string) {
  return url.endsWith("/") ? url : `${url}/`
}

export default function RecursoDetalhePage({
  params,
}: {
  params: { grupo: string; recurso: string; id: string }
}) {
  const { loading } = useAuthGuard()
  const router = useRouter()
  const found = findModuleResource(params.grupo, params.recurso)
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
        const endpoint = ensureTrailingSlash(found.resource.endpoint) + `${params.id}/`
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
  }, [found, params.id])

  if (loading) return null

  if (!found) {
    return (
      <AppLayout>
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

  async function handleDelete() {
    if (!confirm("Apagar este registro?")) return
    setDeleting(true)
    setError(null)
    try {
      const endpoint = ensureTrailingSlash(found.resource.endpoint) + `${params.id}/`
      await apiFetch(endpoint, { method: "DELETE" })
      router.push(`/recursos/${params.grupo}/${params.recurso}`)
    } catch (e: any) {
      setError(e?.message || "Erro ao apagar.")
    } finally {
      setDeleting(false)
    }
  }

  const basePath = `/recursos/${params.grupo}/${params.recurso}`

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title={`${found.resource.label} — ${params.id}`}
          subtitle={found.resource.endpoint}
          actions={
            <div className="flex gap-3">
              <Link
                href={`${basePath}/${params.id}/editar`}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Editar
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {deleting ? "Apagando..." : "Apagar"}
              </button>
              <Link
                href={basePath}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
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
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-800">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </AppLayout>
  )
}
