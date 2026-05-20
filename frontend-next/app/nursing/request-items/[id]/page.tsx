"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"

function ensureTrailingSlash(url: string) {
  return url.endsWith("/") ? url : `${url}/`
}

export default function ItemRequisicaoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = routeParamToString((params as any)?.id)

  const [data, setData] = useState<any | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const endpoint = ensureTrailingSlash("/clinical/labrequestitem/") + `${id}/`
      const res = await apiFetch<any>(endpoint)
      setData(res)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar item."))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    reload().catch(() => {})
  }, [reload])

  async function handleDelete() {
    if (!confirm("Apagar este registro?")) return
    setDeleting(true)
    setErro(null)
    try {
      const endpoint = ensureTrailingSlash("/clinical/labrequestitem/") + `${id}/`
      await apiFetch(endpoint, { method: "DELETE" })
      router.push("/nursing/request-items")
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao apagar."))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-6">
        <PageHeader
          title={`Item de requisição — ${id}`}
          subtitle="Detalhes do item de requisição selecionado."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/nursing/request-items/${id}/edit`}
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
              >
                Editar
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {deleting ? "Apagando..." : "Apagar"}
              </button>
              <Link
                href="/nursing/request-items"
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
              >
                Voltar
              </Link>
            </div>
          }
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--gray-100)] p-4 text-xs text-[var(--text)]">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </AppLayout>
  )
}

