"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, AlertTriangle, FlaskConical, Loader2 } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch, apiFetchList } from "@/lib/api"
import { countForm } from "@/lib/i18n/plural"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import {
  countsByStatus,
  fmt,
  genderLabel,
  labItemsOf,
  type LabRequest,
} from "@/components/clinical-laboratory/ReceptionWorkflow"

// ─── Columns ──────────────────────────────────────────────────────────────────

type ColumnKey = "por_conferir" | "rejeitadas" | "parcial" | "totalmente"

type ColumnConfig = {
  key: ColumnKey
  title: string
  headerCls: string
  badge: string
  bar: string
  colBg: string
  leftBar: string
}

const RECEPTION_COLUMNS: ColumnConfig[] = [
  {
    key: "por_conferir",
    title: "Por conferir",
    headerCls: "text-sky-700 dark:text-sky-300",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
    bar: "bg-sky-400",
    colBg: "from-sky-50/60 via-white/50 to-cyan-50/40 border-sky-200/50 dark:from-sky-950/30 dark:via-slate-900/30 dark:to-cyan-950/20 dark:border-sky-800/30",
    leftBar: "bg-sky-400",
  },
  {
    key: "rejeitadas",
    title: "Rejeitadas",
    headerCls: "text-rose-700 dark:text-rose-300",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
    bar: "bg-rose-400",
    colBg: "from-rose-50/60 via-white/50 to-red-50/40 border-rose-200/50 dark:from-rose-950/30 dark:via-slate-900/30 dark:to-red-950/20 dark:border-rose-800/30",
    leftBar: "bg-rose-400",
  },
  {
    key: "parcial",
    title: "Recebidas parcialmente",
    headerCls: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    bar: "bg-amber-400",
    colBg: "from-amber-50/60 via-white/50 to-yellow-50/40 border-amber-200/50 dark:from-amber-950/30 dark:via-slate-900/30 dark:to-yellow-950/20 dark:border-amber-800/30",
    leftBar: "bg-amber-400",
  },
  {
    key: "totalmente",
    title: "Recebidas totalmente",
    headerCls: "text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    bar: "bg-emerald-400",
    colBg: "from-emerald-50/60 via-white/50 to-teal-50/40 border-emerald-200/50 dark:from-emerald-950/30 dark:via-slate-900/30 dark:to-teal-950/20 dark:border-emerald-800/30",
    leftBar: "bg-emerald-400",
  },
]

function classifyReception(row: LabRequest): ColumnKey {
  const { received, rejected, total } = countsByStatus(labItemsOf(row))
  if (total > 0 && received === total) return "totalmente"
  if (rejected > 0) return "rejeitadas"
  if (received > 0) return "parcial"
  return "por_conferir"
}

// ─── Reception Card ───────────────────────────────────────────────────────────

function ReceptionCard({
  row,
  onReceive,
  busy,
}: {
  row: LabRequest
  onReceive: () => void
  busy: boolean
}) {
  const router = useRouter()
  const counts = countsByStatus(labItemsOf(row))
  const target = `/clinical-laboratory/reception/${row.id}`
  const priority = getClinicalStatusLabel(row.clinical_status, row.clinical_status_display)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(target)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(target) }
      }}
      className="group relative flex cursor-pointer flex-col gap-1.5 overflow-hidden rounded-xl border border-white/50 bg-white/30 px-3 py-2.5 shadow-sm backdrop-blur-sm transition hover:border-white/70 hover:bg-white/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.08]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] font-bold text-foreground">
          {row.custom_id ?? `#${row.id}`}
        </span>
        {counts.rejected > 0 && (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" aria-label="Tem amostras rejeitadas" />
        )}
      </div>

      <div className="truncate">
        <span className="text-[11px] font-medium text-foreground">{row.patient_name ?? "—"}</span>
        {(() => {
          const meta = [row.patient_age, genderLabel(row.patient_gender)].filter(Boolean).join(" · ")
          return meta ? (
            <span className="ml-1 text-[10px] text-[var(--gray-500)]">{meta}</span>
          ) : null
        })()}
      </div>

      <div className="flex flex-wrap gap-1">
        {priority && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {priority}
          </span>
        )}
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
          {counts.received}/{counts.total} {countForm(counts.total, { one: "amostra recebida", other: "amostras recebidas" })}
        </span>
        {counts.rejected > 0 && (
          <span className="inline-flex items-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-semibold text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
            {counts.rejected} {counts.rejected === 1 ? "rejeitada" : "rejeitadas"}
          </span>
        )}
        {counts.pending > 0 && (
          <span className="inline-flex items-center rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-semibold text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
            {counts.pending} por conferir
          </span>
        )}
      </div>

      <div className="mt-auto flex items-end justify-between gap-2">
        <span className="text-[9px] text-[var(--gray-400)]">Colhida {fmt(row.collected_at)}</span>
        {counts.pending > 0 && counts.rejected === 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onReceive() }}
            disabled={busy}
            className="inline-flex h-6 shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-[9px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? <><Loader2 size={9} className="animate-spin" /> A receber...</>
              : counts.pending === 1 ? "Receber amostra" : "Receber amostras"
            }
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LabReceptionPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<LabRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await apiFetchList<LabRequest>(
        "/clinical/labrequest/?type=LAB&status=pendente",
        { page: 1, pageSize: 200, clientCache: false }
      )
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar requisições.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load, safeRefreshToken])

  async function handleReceiveAll(row: LabRequest) {
    setBusyId(row.id)
    setError(null)
    try {
      await apiFetch(`/clinical/labrequest/${row.id}/receber-todas-amostras/`, { method: "POST" })
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao receber as amostras.")
    } finally {
      setBusyId(null)
    }
  }

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

  const total = rows.length

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-4 px-1 py-1">

        {/* ── Hero header ── */}
        <section className="relative overflow-hidden rounded-xl border border-sky-200/50 bg-gradient-to-br from-sky-50/80 via-white/60 to-cyan-50/60 shadow-sm backdrop-blur-sm dark:border-sky-800/30 dark:from-sky-950/30 dark:via-slate-900/40 dark:to-cyan-950/20">
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />
          <div className="px-4 py-3 pl-5">
            <div className="flex items-center gap-2">
              <FlaskConical size={15} className="text-sky-500" />
              <div>
                <h1 className="font-display text-sm font-bold text-foreground leading-tight">
                  Recepção de Amostras
                </h1>
                <p className="text-[10px] text-[var(--gray-500)]">
                  {loading
                    ? <><Loader2 size={9} className="inline animate-spin mr-1" />A carregar...</>
                    : total > 0
                      ? `${total} requisição${total !== 1 ? "ões" : ""} pendente${total !== 1 ? "s" : ""}`
                      : "Sem requisições pendentes"
                  }
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2.5 text-[12px] text-rose-800 dark:border-rose-800/40 dark:bg-rose-900/15 dark:text-rose-300">
            <AlertCircle size={13} className="shrink-0" /> {error}
          </div>
        )}

        {/* ── Kanban board ── */}
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[12px] text-[var(--gray-400)]">
            <Loader2 size={16} className="animate-spin" /> A carregar requisições...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {RECEPTION_COLUMNS.map((col) => {
              const items = buckets[col.key]
              return (
                <section
                  key={col.key}
                  className={`relative flex flex-col overflow-hidden rounded-xl border bg-gradient-to-br shadow-sm backdrop-blur-sm ${col.colBg}`}
                >
                  {/* coloured left accent bar */}
                  <span className={`absolute left-0 top-0 h-full w-1 ${col.leftBar}`} />

                  {/* column header */}
                  <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pl-4 pt-3">
                    <h2 className={`text-[10px] font-bold uppercase tracking-widest ${col.headerCls}`}>
                      {col.title}
                    </h2>
                    <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${col.badge}`}>
                      {items.length}
                    </span>
                  </div>

                  {/* cards */}
                  <div className="flex flex-col gap-2 overflow-y-auto px-3 pb-3 pl-4 max-h-[calc(100vh-210px)] [scrollbar-width:thin]">
                    {items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/60 px-3 py-6 text-center text-[10px] text-[var(--gray-400)] dark:border-white/10">
                        Sem requisições.
                      </div>
                    ) : (
                      items.map((row) => (
                        <ReceptionCard
                          key={row.id}
                          row={row}
                          onReceive={() => handleReceiveAll(row)}
                          busy={busyId === row.id}
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
