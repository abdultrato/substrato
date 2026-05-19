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

export default function ProcedimentoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = routeParamToString((params as any)?.id)

  const [data, setData] = useState<any | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const endpoint = ensureTrailingSlash("/nursing/procedimento/") + `${id}/`
      const res = await apiFetch<any>(endpoint)
      setData(res)
    } catch (e: any) {
      setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar procedimento."))
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
    setErrorMessage(null)
    try {
      const endpoint = ensureTrailingSlash("/nursing/procedimento/") + `${id}/`
      await apiFetch(endpoint, { method: "DELETE" })
      router.push("/nursing/procedures")
    } catch (e: any) {
      setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao apagar."))
    } finally {
      setDeleting(false)
    }
  }

  async function handleOpenPdf() {
    setDownloadingPdf(true)
    setErrorMessage(null)
    try {
      const endpoint = ensureTrailingSlash("/nursing/procedimento/") + `${id}/pdf/`
      const blob = await apiFetch<Blob>(endpoint, { responseType: "blob" })
      const url = window.URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener,noreferrer")
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
    } catch (e: any) {
      setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar PDF."))
    } finally {
      setDownloadingPdf(false)
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-6">
        <PageHeader
          title={`Procedimento — ${id}`}
          subtitle="/nursing/procedimento/"
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleOpenPdf}
                disabled={downloadingPdf}
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
              >
                {downloadingPdf ? "Gerando PDF..." : "PDF"}
              </button>
              <Link
                href={`/nursing/procedures/${id}/edit`}
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
                href="/nursing/procedures"
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
              >
                Voltar
              </Link>
            </div>
          }
        />

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
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

