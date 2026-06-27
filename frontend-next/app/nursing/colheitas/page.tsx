"use client"

import { AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"

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
  clinical_status?: string
  clinical_status_display?: string
  sample_details?: SampleDetail[]
  items?: RequestItem[]
}

type CardWarning = {
  key: string
  label: string
  tone: string
}

const URGENT_STATUSES = new Set([
  "PRIORITARIO",
  "URGENTE",
  "MUITO_URGENTE",
  "URGENTISSIMO",
  "EMERGENCIA",
])

function isUrgent(row: CollectionRequest): boolean {
  return URGENT_STATUSES.has((row.clinical_status || "").trim().toLocaleUpperCase())
}

function fastingHoursOf(row: CollectionRequest): number {
  return (row.sample_details || [])
    .filter((sample) => sample.fasting_required)
    .reduce((max, sample) => Math.max(max, Number(sample.fasting_hours || 0)), 0)
}

function warningsFor(row: CollectionRequest, column: ColumnKey): CardWarning[] {
  const warnings: CardWarning[] = []
  const danger = "border-rose-200 bg-rose-100 text-rose-800"
  const warn = "border-amber-200 bg-amber-100 text-amber-800"

  if (isUrgent(row)) {
    warnings.push({
      key: "urgente",
      label: getClinicalStatusLabel(row.clinical_status, row.clinical_status_display) || "Urgente",
      tone: danger,
    })
  }
  if (column === "rejeitadas") {
    warnings.push({ key: "recoleta", label: "Recoleta necessária", tone: danger })
  }
  if ((row.sample_details || []).some((sample) => sample.fasting_required)) {
    const hours = fastingHoursOf(row)
    warnings.push({ key: "jejum", label: hours > 0 ? `Jejum ${hours}h` : "Jejum", tone: warn })
  }
  return warnings
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
      // Only process requests that have items (exams/procedures)
      if (Array.isArray(row.items) && row.items.length > 0) {
        grouped[classify(row)].push(row)
      }
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
      <div className="mx-auto w-[90vw] max-w-[90vw] space-y-4">
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
          <div className="grid grid-cols-1 items-start gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {COLUMNS.map((column) => {
              const items = buckets[column.key]
              return (
                <section
                  key={column.key}
                  className={`flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/20 bg-white/20 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] ${column.top}`}
                >
                  <div className="flex min-h-12 items-center justify-between gap-2 border-b border-border/50 bg-white/25 px-3 py-2 dark:bg-white/[0.03]">
                    <h2 className={`text-sm font-bold leading-tight ${column.header}`}>{column.title}</h2>
                    <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${column.badge}`}>
                      {items.length}
                    </span>
                  </div>

                  <div className="grid max-h-[calc(100vh-210px)] auto-rows-min grid-cols-1 gap-1.5 overflow-y-auto p-1.5 pr-2">
                    {items.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-center text-xs text-[var(--gray-500)]">
                        Sem requisições.
                      </div>
                    ) : (
                      items.map((row) => {
                        const { collected, total } = progressOf(row)
                        const target = `/nursing/requests/${row.id}`
                        const warnings = warningsFor(row, column.key)
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
                            className="grid cursor-pointer grid-cols-1 gap-x-3 gap-y-1 overflow-hidden rounded-lg border border-white/25 bg-white/35 px-3 py-2 shadow-sm backdrop-blur-sm transition hover:border-[var(--primary-400)] hover:bg-white/45 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-400)] dark:border-white/10 dark:bg-white/5 xl:grid-cols-[minmax(0,1fr)_auto]"
                          >
                            <div className="flex items-center justify-between gap-2 xl:col-start-1">
                              <span className="text-sm font-semibold text-[var(--primary-700)]">{row.custom_id}</span>
                              <div className="flex shrink-0 items-center gap-1">
                                {warnings.length ? (
                                  <AlertTriangle className="h-4 w-4 text-rose-500" aria-label="Atenção" />
                                ) : null}
                                {total > 0 ? (
                                  <span className="text-[10px] font-medium text-[var(--gray-500)]">
                                    {collected}/{total}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text)] xl:col-start-1">
                              <span className="truncate font-medium">
                                {row.patient_name}
                                {row.patient_age ? <span className="text-[var(--gray-500)]"> · {row.patient_age}</span> : null}
                              </span>
                              <span className="text-[10px] text-[var(--gray-500)]">Validada: {formatDateTime(row.validated_at)}</span>
                            </div>

                            {warnings.length ? (
                              <div className="flex flex-wrap gap-1 xl:col-start-1">
                                {warnings.map((warning) => (
                                  <span
                                    key={`${row.id}-warn-${warning.key}`}
                                    className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${warning.tone}`}
                                  >
                                    <AlertTriangle className="h-3 w-3" aria-hidden />
                                    {warning.label}
                                  </span>
                                ))}
                              </div>
                            ) : null}

                            {row.sample_details?.length ? (
                              <div className="flex flex-wrap items-center gap-1 overflow-hidden pt-0.5 xl:col-start-1">
                                {row.sample_details.slice(0, 3).map((sample) => (
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
                                {row.sample_details.length > 3 ? (
                                  <span className="text-[10px] font-semibold text-muted-foreground">+{row.sample_details.length - 3}</span>
                                ) : null}
                              </div>
                            ) : null}

                            <div className="flex flex-wrap items-center gap-1.5 pt-1 xl:col-start-2 xl:row-start-1 xl:row-span-4 xl:self-center xl:pt-0">
                              {column.action ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    fazerColheita(row)
                                  }}
                                  disabled={busyId === row.id}
                                  className="inline-flex h-7 items-center justify-center rounded-md bg-[var(--primary-600)] px-2.5 text-[11px] font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--primary-700)] disabled:opacity-60"
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
                                className="inline-flex h-7 items-center justify-center rounded-md border border-white/30 bg-white/30 px-2.5 text-[11px] font-medium text-[var(--gray-700)] transition hover:bg-white/50 dark:border-white/10 dark:bg-white/5"
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
