"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetchList } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import {
  countsByStatus,
  fmt,
  labItemsOf,
  type LabRequest,
} from "@/components/clinical-laboratory/ReceptionWorkflow"

// ─── Columns ──────────────────────────────────────────────────────────────────

type ColumnKey = "por_conferir" | "rejeitadas" | "parcial" | "totalmente"

type ColumnConfig = {
  key: ColumnKey
  title: string
  header: string
  badge: string
  top: string
}

const RECEPTION_COLUMNS: ColumnConfig[] = [
  { key: "por_conferir", title: "Amostras por conferir", header: "text-sky-700", badge: "bg-sky-100 text-sky-800", top: "border-t-2 border-t-sky-400" },
  { key: "rejeitadas", title: "Amostras Rejeitadas", header: "text-rose-700", badge: "bg-rose-100 text-rose-800", top: "border-t-2 border-t-rose-400" },
  { key: "parcial", title: "Amostras Recebidas Parcialmente", header: "text-amber-700", badge: "bg-amber-100 text-amber-800", top: "border-t-2 border-t-amber-400" },
  { key: "totalmente", title: "Amostras Recebidas Totalmente", header: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800", top: "border-t-2 border-t-emerald-400" },
]

function classifyReception(row: LabRequest): ColumnKey {
  const { received, rejected, total } = countsByStatus(labItemsOf(row))
  if (total > 0 && received === total) return "totalmente"
  if (rejected > 0) return "rejeitadas"
  if (received > 0) return "parcial"
  return "por_conferir"
}

// ─── Summary Card (square, clickable) ───────────────────────────────────────────

function ReceptionCard({ row }: { row: LabRequest }) {
  const router = useRouter()
  const counts = countsByStatus(labItemsOf(row))
  const target = `/clinical-laboratory/reception/${row.id}`
  const priority = getClinicalStatusLabel(row.clinical_status, row.clinical_status_display)

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
        <span className="text-sm font-semibold text-[var(--primary-700)] dark:text-[var(--primary-400)]">{row.custom_id}</span>
        {counts.rejected > 0 ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" aria-label="Tem amostras rejeitadas" />
        ) : null}
      </div>

      <div className="truncate text-xs text-[var(--text)]">{row.patient_name}</div>
      {row.patient_age ? <div className="text-[10px] text-[var(--gray-500)]">{row.patient_age}</div> : null}

      <div className="flex flex-wrap gap-1 pt-0.5">
        {priority ? (
          <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {priority}
          </span>
        ) : null}
        <span className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
          {counts.received}/{counts.total} {counts.total === 1 ? "amostra recebida" : "amostras recebidas"}
        </span>
        {counts.rejected > 0 ? (
          <span className="inline-flex items-center rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
            {counts.rejected} {counts.rejected === 1 ? "amostra rejeitada" : "amostras rejeitadas"}
          </span>
        ) : null}
        {counts.pending > 0 ? (
          <span className="inline-flex items-center rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
            {counts.pending} {counts.pending === 1 ? "amostra" : "amostras"} por conferir
          </span>
        ) : null}
      </div>

      <div className="mt-auto text-[10px] text-[var(--gray-400)]">Colhida {fmt(row.collected_at)}</div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LabReceptionPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<LabRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await apiFetchList<LabRequest>(
        "/clinical/labrequest/?type=LAB&status=pendente&colhida=true",
        { page: 1, pageSize: 200, clientCache: false }
      )
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar requisições.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  const buckets = useMemo(() => {
    const grouped: Record<ColumnKey, LabRequest[]> = {
      por_conferir: [],
      rejeitadas: [],
      parcial: [],
      totalmente: [],
    }
    for (const row of rows) {
      grouped[classifyReception(row)].push(row)
    }
    return grouped
  }, [rows])

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-3">
        <PageHeader title="Recepção de Amostras" />

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[var(--gray-400)]">Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {RECEPTION_COLUMNS.map((column) => {
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
                        Sem requisições.
                      </div>
                    ) : (
                      items.map((row) => <ReceptionCard key={row.id} row={row} />)
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
