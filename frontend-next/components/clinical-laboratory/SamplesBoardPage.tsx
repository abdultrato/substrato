"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"

type SampleRow = {
  id: number
  custom_id?: string
  order_custom_id?: string
  patient_name?: string
  patient_age?: string
  patient_gender?: string
  barcode?: string
  sample_type?: string
  sample_type_display?: string
  container_type?: string
  condition?: string
  condition_display?: string
  status?: string
  status_display?: string
  collected_at?: string
  received_at?: string
}

type ColumnKey = "a_receber" | "recebidas" | "aceites" | "rejeitadas"

type ColumnConfig = {
  key: ColumnKey
  title: string
  header: string
  badge: string
  top: string
}

const SAMPLE_COLUMNS: ColumnConfig[] = [
  { key: "a_receber", title: "Amostras por receber", header: "text-sky-700", badge: "bg-sky-100 text-sky-800", top: "border-t-2 border-t-sky-400" },
  { key: "recebidas", title: "Amostras recebidas", header: "text-amber-700", badge: "bg-amber-100 text-amber-800", top: "border-t-2 border-t-amber-400" },
  { key: "aceites", title: "Amostras aceites", header: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800", top: "border-t-2 border-t-emerald-400" },
  { key: "rejeitadas", title: "Amostras rejeitadas", header: "text-rose-700", badge: "bg-rose-100 text-rose-800", top: "border-t-2 border-t-rose-400" },
]

function fmt(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function genderLabel(value?: string): string {
  const normalized = (value || "").trim().toLocaleUpperCase()
  if (normalized.startsWith("M")) return "Masculino"
  if (normalized.startsWith("F")) return "Feminino"
  return ""
}

function classifySample(row: SampleRow): ColumnKey {
  switch ((row.status || "").trim().toUpperCase()) {
    case "RECEBIDA":
      return "recebidas"
    case "ACEITE":
    case "EM_PROCESSAMENTO":
    case "PROCESSADA":
    case "ARMAZENADA":
    case "DESCARTADA":
      return "aceites"
    case "REJEITADA":
      return "rejeitadas"
    default:
      return "a_receber"
  }
}

function statusTone(status?: string): string {
  switch ((status || "").trim().toUpperCase()) {
    case "ACEITE":
    case "EM_PROCESSAMENTO":
    case "PROCESSADA":
    case "ARMAZENADA":
    case "DESCARTADA":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
    case "RECEBIDA":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    case "REJEITADA":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
    default:
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
  }
}

function conditionTone(condition?: string): string {
  return (condition || "").trim().toUpperCase() === "ADEQUADA"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
}

function SampleCard({
  row,
  busyAction,
  onReceive,
  onAccept,
}: {
  row: SampleRow
  busyAction: "receive" | "accept" | null
  onReceive: () => void
  onAccept: () => void
}) {
  const router = useRouter()
  const target = `/clinical-laboratory/samples/${row.id}`
  const canReceive = classifySample(row) === "a_receber"
  const canAccept = (row.status || "").trim().toUpperCase() === "RECEBIDA"
  const sampleLabel = row.sample_type_display || row.sample_type || "Amostra"

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(target)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          router.push(target)
        }
      }}
      className="flex aspect-[2/1] cursor-pointer flex-col gap-1.5 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 shadow-sm transition hover:border-[var(--primary-400)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-400)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[var(--primary-700)] dark:text-[var(--primary-400)]">
            {row.barcode || row.custom_id || `Amostra #${row.id}`}
          </span>
          <span className="block truncate text-[10px] text-[var(--gray-500)]">
            {row.order_custom_id ? `Pedido ${row.order_custom_id}` : row.custom_id || ""}
          </span>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${statusTone(row.status)}`}>
          {row.status_display || row.status || "Pendente"}
        </span>
      </div>

      <div className="truncate text-xs text-[var(--text)]">
        {row.patient_name || "Paciente"}
        {(() => {
          const meta = [row.patient_age, genderLabel(row.patient_gender)].filter(Boolean).join(" · ")
          return meta ? <span className="text-[10px] text-[var(--gray-500)]"> · {meta}</span> : null
        })()}
      </div>

      <div className="flex flex-wrap gap-1 pt-0.5">
        <span className="inline-flex items-center rounded bg-[var(--gray-100)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--gray-700)] dark:bg-[var(--gray-800)] dark:text-[var(--gray-200)]">
          {sampleLabel}
        </span>
        {row.container_type ? (
          <span className="inline-flex items-center rounded bg-[var(--gray-100)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--gray-700)] dark:bg-[var(--gray-800)] dark:text-[var(--gray-200)]">
            {row.container_type}
          </span>
        ) : null}
        {row.condition_display ? (
          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${conditionTone(row.condition)}`}>
            {row.condition_display}
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex items-end justify-between gap-2">
        <div className="min-w-0 text-[10px] text-[var(--gray-400)]">
          <div className="truncate">Colhida {fmt(row.collected_at)}</div>
          {row.received_at ? <div className="truncate">Recebida {fmt(row.received_at)}</div> : null}
        </div>
        <div className="flex shrink-0 gap-1.5">
          {canReceive ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onReceive()
              }}
              disabled={busyAction !== null}
              className="inline-flex h-7 items-center rounded bg-emerald-600 px-2.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === "receive" ? "A receber..." : "Receber"}
            </button>
          ) : null}
          {canAccept ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onAccept()
              }}
              disabled={busyAction !== null}
              className="inline-flex h-7 items-center rounded bg-amber-600 px-2.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === "accept" ? "A aceitar..." : "Aceitar"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function SamplesBoardPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<SampleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<{ id: number; action: "receive" | "accept" } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await apiFetchList<SampleRow>("/clinical_laboratory/sample/", {
        page: 1,
        pageSize: 200,
        clientCache: false,
      })
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar amostras.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  async function runAction(row: SampleRow, action: "receive" | "accept") {
    setBusy({ id: row.id, action })
    setError(null)
    try {
      const suffix = action === "receive" ? "receber" : "aceitar"
      await apiFetch(`/clinical_laboratory/sample/${row.id}/${suffix}/`, { method: "POST" })
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao actualizar o estado da amostra.")
    } finally {
      setBusy(null)
    }
  }

  const buckets = useMemo(() => {
    const grouped: Record<ColumnKey, SampleRow[]> = {
      a_receber: [],
      recebidas: [],
      aceites: [],
      rejeitadas: [],
    }
    for (const row of rows) grouped[classifySample(row)].push(row)
    return grouped
  }, [rows])

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-3">
        <PageHeader title="Amostras laboratoriais" />

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[var(--gray-400)]">Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {SAMPLE_COLUMNS.map((column) => {
              const items = buckets[column.key]
              return (
                <section
                  key={column.key}
                  className={`flex flex-col rounded-lg bg-[var(--card)]/40 p-2 ${column.top}`}
                >
                  <div className="flex items-center justify-between gap-2 px-1 pb-2 pt-1">
                    <h2 className={`text-xs font-semibold uppercase tracking-wide ${column.header}`}>{column.title}</h2>
                    <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${column.badge}`}>
                      {items.length}
                    </span>
                  </div>

                  <div className="grid auto-rows-min grid-cols-1 gap-2 overflow-y-auto pr-1 max-h-[calc(100vh-200px)] sm:grid-cols-2 xl:grid-cols-1 [scrollbar-width:thin]">
                    {items.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--gray-500)] sm:col-span-2 xl:col-span-1">
                        Sem amostras.
                      </div>
                    ) : (
                      items.map((row) => (
                        <SampleCard
                          key={row.id}
                          row={row}
                          busyAction={busy?.id === row.id ? busy.action : null}
                          onReceive={() => runAction(row, "receive")}
                          onAccept={() => runAction(row, "accept")}
                        />
                      ))
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
