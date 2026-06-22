"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

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

type RequestItem = {
  id: number
  exam_name?: string
  medical_exam_name?: string
  sample_status?: string
}

type CollectionRequest = {
  id: number
  custom_id: string
  patient_name: string
  patient_age?: string
  validated_at?: string
  status?: string
  sample_details?: SampleDetail[]
  items?: RequestItem[]
}

type ColumnKey = "por_coletar" | "parcial" | "rejeitadas" | "coletadas"

type ColumnConfig = {
  key: ColumnKey
  title: string
  header: string
  badge: string
  top: string
  action?: string
}

const COLUMNS: ColumnConfig[] = [
  {
    key: "por_coletar",
    title: "Amostras por coletar",
    header: "text-sky-700",
    badge: "bg-sky-100 text-sky-800",
    top: "border-t-2 border-t-sky-400",
    action: "Fazer coleta",
  },
  {
    key: "parcial",
    title: "Amostras parcialmente coletadas",
    header: "text-amber-700",
    badge: "bg-amber-100 text-amber-800",
    top: "border-t-2 border-t-amber-400",
    action: "Concluir coleta",
  },
  {
    key: "rejeitadas",
    title: "Amostras rejeitadas",
    header: "text-rose-700",
    badge: "bg-rose-100 text-rose-800",
    top: "border-t-2 border-t-rose-400",
    action: "Registar recoleta",
  },
  {
    key: "coletadas",
    title: "Amostras coletadas",
    header: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800",
    top: "border-t-2 border-t-emerald-400",
  },
]

function formatDateTime(value?: string): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function normalizeStatus(value?: string): string {
  return (value || "").trim().toLocaleLowerCase()
}

function labItemsOf(row: CollectionRequest): RequestItem[] {
  return (row.items || []).filter((item) => normalizeStatus(item.sample_status) !== "")
}

function progressOf(row: CollectionRequest): { collected: number; total: number } {
  const items = labItemsOf(row)
  const collected = items.filter((item) => {
    const status = normalizeStatus(item.sample_status)
    return status === "coletada" || status === "recebida"
  }).length
  return { collected, total: items.length }
}

function classify(row: CollectionRequest): ColumnKey {
  const items = labItemsOf(row)
  if (items.length === 0) return "por_coletar"
  const statuses = items.map((item) => normalizeStatus(item.sample_status))
  if (statuses.some((status) => status === "rejeitada")) return "rejeitadas"
  const { collected, total } = progressOf(row)
  if (collected === total) return "coletadas"
  if (collected > 0) return "parcial"
  return "por_coletar"
}

async function abrirEtiqueta(id: number) {
  const blob = await apiFetch<Blob>(`/clinical/labrequest/${id}/etiqueta/`, { responseType: "blob" })
  const url = URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener")
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export default function NursingCollectionsPage() {
  useAuthGuard()
  const router = useRouter()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<CollectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const { items } = await apiFetchList<CollectionRequest>(
        "/clinical/labrequest/?validada=true&type=LAB&status=pendente",
        { page: 1, pageSize: 100, clientCache: false }
      )
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar coletas.")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  const buckets = useMemo(() => {
    const grouped: Record<ColumnKey, CollectionRequest[]> = {
      por_coletar: [],
      parcial: [],
      rejeitadas: [],
      coletadas: [],
    }
    for (const row of rows) {
      grouped[classify(row)].push(row)
    }
    return grouped
  }, [rows])

  async function fazerColheita(row: CollectionRequest) {
    setBusyId(row.id)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${row.id}/colher-todas-amostras/`, { method: "POST" })
      setFeedback(`Coleta de ${row.custom_id} registada.`)
      await load(true)
    } catch (e: any) {
      setError(e?.message || "Falha ao registar a coleta.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-4">
        <PageHeader title="Coletas" />

        {feedback ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{feedback}</div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : null}

        {loading ? (
          <div className="text-sm text-[var(--gray-500)]">Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((column) => {
              const items = buckets[column.key]
              return (
                <section
                  key={column.key}
                  className={`flex flex-col rounded-lg bg-[var(--card)]/40 p-2 ${column.top}`}
                >
                  <div className="flex items-center justify-between px-1 pb-2 pt-1">
                    <h2 className={`text-xs font-semibold uppercase tracking-wide ${column.header}`}>{column.title}</h2>
                    <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${column.badge}`}>
                      {items.length}
                    </span>
                  </div>

                  <div className="grid auto-rows-min grid-cols-1 gap-2 overflow-y-auto pr-1 max-h-[calc(100vh-210px)] sm:grid-cols-2 xl:grid-cols-1">
                    {items.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--gray-500)] sm:col-span-2 xl:col-span-1">
                        Sem requisições.
                      </div>
                    ) : (
                      items.map((row) => {
                        const { collected, total } = progressOf(row)
                        const target = `/nursing/requests/${row.id}`
                        return (
                          <div
                            key={row.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => router.push(target)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault()
                                router.push(target)
                              }
                            }}
                            className="flex aspect-square cursor-pointer flex-col gap-1.5 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 shadow-sm transition hover:border-[var(--primary-400)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-400)]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold text-[var(--primary-700)]">{row.custom_id}</span>
                              {total > 0 ? (
                                <span className="shrink-0 text-[10px] font-medium text-[var(--gray-500)]">
                                  {collected}/{total}
                                </span>
                              ) : null}
                            </div>
                            <div className="truncate text-xs text-[var(--text)]">
                              {row.patient_name}
                              {row.patient_age ? <span className="text-[var(--gray-500)]"> · {row.patient_age}</span> : null}
                            </div>
                            <div className="text-[10px] text-[var(--gray-500)]">Validada: {formatDateTime(row.validated_at)}</div>

                            {row.sample_details?.length ? (
                              <div className="flex flex-1 flex-wrap content-start gap-1 overflow-hidden pt-0.5">
                                {row.sample_details.map((sample) => (
                                  <span
                                    key={`${row.id}-sample-${sample.id}`}
                                    className="inline-flex h-fit items-center rounded border border-[var(--primary-300)] bg-[var(--primary-300)]/20 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text)]"
                                    title={sample.name}
                                  >
                                    {sample.bottle_type_display || sample.bottle_type}
                                    {sample.minimum_volume_ml && Number(sample.minimum_volume_ml) > 0
                                      ? ` · ${sample.minimum_volume_ml} ml`
                                      : ""}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="flex-1" />
                            )}

                            <div className="mt-auto flex flex-wrap items-center gap-2">
                              {column.action ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    fazerColheita(row)
                                  }}
                                  disabled={busyId === row.id}
                                  className="inline-flex h-8 items-center justify-center rounded-md bg-[var(--primary-600)] px-3 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--primary-700)] disabled:opacity-60"
                                >
                                  {busyId === row.id ? "Registando..." : column.action}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  abrirEtiqueta(row.id).catch(() => setError("Falha ao gerar a etiqueta."))
                                }}
                                className="inline-flex h-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
                              >
                                Etiqueta
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
