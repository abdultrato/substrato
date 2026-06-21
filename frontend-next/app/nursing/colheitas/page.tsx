"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"

type SampleDetail = {
  id: number
  name: string
  bottle_type: string
  bottle_type_display?: string
  minimum_volume_ml?: string
  fasting_required?: boolean
  fasting_hours?: number
}

type CollectionRequest = {
  id: number
  custom_id: string
  patient_name: string
  patient_age?: string
  validated_at?: string
  sample_details?: SampleDetail[]
}

function formatDateTime(value?: string): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

async function abrirEtiqueta(id: number) {
  const blob = await apiFetch<Blob>(`/clinical/labrequest/${id}/etiqueta/`, { responseType: "blob" })
  const url = URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener")
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export default function NursingCollectionsPage() {
  useAuthGuard()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<CollectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await apiFetchList<CollectionRequest>(
        "/clinical/labrequest/?validada=true&colhida=false&type=LAB",
        { page: 1, pageSize: 50, clientCache: false }
      )
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar coletas pendentes.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  async function fazerColheita(row: CollectionRequest) {
    setBusyId(row.id)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${row.id}/registar-colheita/`, { method: "POST" })
      setFeedback(`Coleta de ${row.custom_id} registada — a requisição seguiu para o laboratório.`)
      setRows((prev) => prev.filter((item) => item.id !== row.id))
      // Abre logo a etiqueta com o código de barras para a impressora de etiquetas.
      await abrirEtiqueta(row.id)
    } catch (e: any) {
      setError(e?.message || "Falha ao registar a coleta.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <PageHeader
          title="Coletas"
          subtitle="Requisições validadas a aguardar coleta de amostras."
        />

        {feedback ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{feedback}</div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : null}

        {loading ? (
          <div className="text-sm text-[var(--gray-500)]">Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-6 text-center text-sm text-[var(--gray-500)]">
            Sem coletas pendentes.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-1.5">
                  <Link href={`/requests/${row.id}`} className="font-semibold text-[var(--primary-700)] hover:underline">
                    {row.custom_id}
                  </Link>
                  <div className="text-sm text-[var(--text)]">
                    {row.patient_name}
                    {row.patient_age ? <span className="text-[var(--gray-500)]"> · {row.patient_age}</span> : null}
                  </div>
                  <div className="text-xs text-[var(--gray-500)]">Validada em: {formatDateTime(row.validated_at)}</div>
                  {row.sample_details?.length ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {row.sample_details.map((sample) => (
                        <span
                          key={`${row.id}-sample-${sample.id}`}
                          className="inline-flex items-center rounded-full border border-[var(--primary-300)] bg-[var(--primary-300)]/20 px-2.5 py-1 text-xs font-medium text-[var(--text)]"
                          title={sample.name}
                        >
                          {sample.bottle_type_display || sample.bottle_type}
                          {sample.minimum_volume_ml && Number(sample.minimum_volume_ml) > 0
                            ? ` · ${sample.minimum_volume_ml} ml`
                            : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                  <button
                    type="button"
                    onClick={() => fazerColheita(row)}
                    disabled={busyId === row.id}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--primary-600)] px-4 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--primary-700)] disabled:opacity-60"
                  >
                    {busyId === row.id ? "Registando..." : "Fazer coleta"}
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirEtiqueta(row.id).catch(() => setError("Falha ao gerar a etiqueta."))}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
                  >
                    Imprimir etiqueta
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
