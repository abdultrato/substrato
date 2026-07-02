"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AlertCircle, ChevronLeft, ClipboardCheck, Loader2, Search } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch, apiFetchList } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"

// ─── Types ────────────────────────────────────────────────────────────────────

type LabRequest = {
  id: number
  custom_id?: string
  patient_name?: string
  patient_age?: string
  clinical_status?: string
  clinical_status_display?: string
  type: "LAB" | "MED"
  collected_at?: string
}

type Summary = {
  total: number
  pending: number
  in_analysis: number
  awaiting_validation: number
  validated: number
  disregarded: number
  disregard_awaiting_validation: number
}

type RequestResults = {
  request: { id: number; has_critical_result?: boolean }
  summary: Summary
}

type ColIndex = 0 | 1 | 2 | 3

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classifyRequest(summary?: Summary | null): ColIndex {
  if (!summary || summary.total === 0) return 0
  const { total, pending, validated, disregarded } = summary
  const finished = validated + disregarded
  if (finished === total) return 3
  if (pending === 0) return 2
  if (pending === total) return 0
  return 1
}

function urgencyScore(status?: string): number {
  const s = (status || "").toUpperCase()
  if (s.includes("URGENT") || s.includes("CRITI")) return 3
  if (s.includes("PRIORIT") || s.includes("EXPRESSO")) return 2
  return 1
}

function sortRequests(requests: LabRequest[]): LabRequest[] {
  return [...requests].sort((a, b) => {
    const uDiff = urgencyScore(b.clinical_status) - urgencyScore(a.clinical_status)
    if (uDiff !== 0) return uDiff
    if (a.collected_at && b.collected_at) {
      return new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime()
    }
    return b.id - a.id
  })
}

// ─── Column config ────────────────────────────────────────────────────────────

type ColConfig = {
  label: string
  headerCls: string
  badge: string
  colBg: string
  leftBar: string
}

const COL_CONFIG: ColConfig[] = [
  {
    label: "Todas pendentes",
    headerCls: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    colBg: "from-amber-50/60 via-white/50 to-yellow-50/40 border-amber-200/50 dark:from-amber-950/30 dark:via-slate-900/30 dark:to-yellow-950/20 dark:border-amber-800/30",
    leftBar: "bg-amber-400",
  },
  {
    label: "Parcialmente iniciadas",
    headerCls: "text-orange-700 dark:text-orange-300",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
    colBg: "from-orange-50/60 via-white/50 to-amber-50/40 border-orange-200/50 dark:from-orange-950/30 dark:via-slate-900/30 dark:to-amber-950/20 dark:border-orange-800/30",
    leftBar: "bg-orange-400",
  },
  {
    label: "Em análise",
    headerCls: "text-violet-700 dark:text-violet-300",
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
    colBg: "from-violet-50/60 via-white/50 to-purple-50/40 border-violet-200/50 dark:from-violet-950/30 dark:via-slate-900/30 dark:to-purple-950/20 dark:border-violet-800/30",
    leftBar: "bg-violet-400",
  },
  {
    label: "Concluídas",
    headerCls: "text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    colBg: "from-emerald-50/60 via-white/50 to-teal-50/40 border-emerald-200/50 dark:from-emerald-950/30 dark:via-slate-900/30 dark:to-teal-950/20 dark:border-emerald-800/30",
    leftBar: "bg-emerald-400",
  },
]

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  row,
  summary,
  hasCritical,
}: {
  row: LabRequest
  summary?: Summary | null
  hasCritical?: boolean
}) {
  const statusLabel = getClinicalStatusLabel(row.clinical_status, row.clinical_status_display)

  return (
    <Link href={`/clinical-laboratory/worklists/${row.id}`}>
      <article className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-white/50 bg-white/30 shadow-sm backdrop-blur-sm transition hover:border-white/70 hover:bg-white/50 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.08]">

        {/* código + critical + prioridade */}
        <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1.5">
          <span className="font-mono text-[10px] font-bold text-sky-700 dark:text-sky-300 truncate">
            {row.custom_id ?? `#${row.id}`}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {hasCritical && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                CRÍTICO
              </span>
            )}
            {statusLabel && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                {statusLabel}
              </span>
            )}
          </div>
        </div>

        {/* paciente */}
        <div className="border-t border-white/40 px-3 py-2 dark:border-white/10">
          <p className="truncate text-[12px] font-semibold text-foreground leading-snug">
            {row.patient_name || "—"}
          </p>
          {row.patient_age && (
            <p className="mt-0.5 text-[10px] text-[var(--gray-500)]">{row.patient_age}</p>
          )}
        </div>

        {/* contagens de resultados */}
        {summary && (
          <div className="border-t border-white/40 px-3 py-2 dark:border-white/10">
            <div className="flex flex-wrap gap-1">
              {summary.pending > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  {summary.pending} pendente{summary.pending !== 1 ? "s" : ""}
                </span>
              )}
              {summary.in_analysis > 0 && (
                <span className="inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                  {summary.in_analysis} em análise
                </span>
              )}
              {summary.awaiting_validation > 0 && (
                <span className="inline-flex items-center rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-semibold text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
                  {summary.awaiting_validation} a validar
                </span>
              )}
              {summary.validated > 0 && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                  {summary.validated} validado{summary.validated !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        )}
      </article>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LabWorklistsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<LabRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summaries, setSummaries] = useState<Map<number, RequestResults>>(new Map())
  const [summariesPending, setSummariesPending] = useState(0)
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSummaries(new Map())
    try {
      const params = new URLSearchParams({ fase: "trabalho" })
      if (query) params.set("search", query)
      const { items } = await apiFetchList<LabRequest>(`/clinical/labrequest/?${params}`, {
        page: 1,
        pageSize: 200,
        clientCache: false,
      })
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar lista de trabalho.")
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => { load() }, [load, safeRefreshToken])

  useEffect(() => {
    if (rows.length === 0) return
    setSummariesPending(rows.length)
    rows.forEach((row) => {
      apiFetch<RequestResults>(`/clinical/labrequest/${row.id}/result-items/`)
        .then((data) => {
          setSummaries((prev) => new Map(prev).set(row.id, data))
        })
        .catch(() => {})
        .finally(() => {
          setSummariesPending((n) => Math.max(0, n - 1))
        })
    })
  }, [rows])

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setQuery(value), 350)
  }

  const columns: [LabRequest[], LabRequest[], LabRequest[], LabRequest[]] = [[], [], [], []]
  for (const row of rows) {
    const r = summaries.get(row.id)
    columns[classifyRequest(r?.summary)].push(row)
  }
  const sortedColumns = columns.map(sortRequests)
  const isReady = !loading && summariesPending === 0
  const total = rows.length

  return (
    <AppLayout fullWidth>
      <div className="w-full min-w-0 max-w-none space-y-3 px-1 py-1">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden rounded-xl border border-sky-200/50 bg-gradient-to-br from-sky-50/80 via-white/60 to-cyan-50/60 shadow-sm backdrop-blur-sm dark:border-sky-800/30 dark:from-sky-950/30 dark:via-slate-900/40 dark:to-cyan-950/20">
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />
          <div className="px-4 py-3 pl-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={15} className="text-sky-500" />
                <div>
                  <h1 className="font-display text-sm font-bold text-foreground leading-tight">
                    Lista de Trabalho
                  </h1>
                  <p className="text-[10px] text-[var(--gray-500)]">
                    {loading
                      ? <><Loader2 size={9} className="inline animate-spin mr-1" />A carregar...</>
                      : !isReady
                        ? <><Loader2 size={9} className="inline animate-spin mr-1" />A classificar requisições...</>
                        : total > 0
                          ? `${total} requisição${total !== 1 ? "ões" : ""}${query ? ` · "${query}"` : ""}`
                          : "Sem requisições em processamento"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/clinical-laboratory"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/40 bg-white/30 px-2.5 text-[11px] text-[var(--gray-700)] backdrop-blur-sm transition hover:bg-white/50 dark:border-white/10 dark:text-[var(--gray-300)] dark:hover:bg-white/10">
                  <ChevronLeft size={11} /> Voltar
                </Link>
                <div className="flex items-center gap-1.5 rounded-lg border border-white/50 bg-white/50 px-2.5 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06]">
                  <Search size={11} className="shrink-0 text-[var(--gray-400)]" />
                  <input
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Pesquisar paciente, código..."
                    className="w-40 bg-transparent text-[11px] text-[var(--text)] outline-none placeholder-[var(--gray-400)]"
                  />
                  {search && (
                    <button type="button" onClick={() => { setSearch(""); setQuery("") }}
                      className="text-[var(--gray-400)] hover:text-foreground text-[10px]">×</button>
                  )}
                </div>
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
            <Loader2 size={16} className="animate-spin" /> A carregar lista de trabalho...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-16 text-center text-[12px] text-[var(--gray-400)]">
            Sem requisições em processamento.
          </div>
        ) : (
          <div className="grid w-full min-w-0 grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4" style={{ height: "calc(100vh - 148px)" }}>
            {sortedColumns.map((colRows, colIdx) => {
              const cfg = COL_CONFIG[colIdx]
              return (
                <section
                  key={colIdx}
                  className={`relative flex min-h-0 flex-col overflow-hidden rounded-xl border bg-gradient-to-br shadow-sm backdrop-blur-sm ${cfg.colBg}`}
                >
                  <span className={`absolute left-0 top-0 h-full w-1 ${cfg.leftBar}`} />

                  <div className="flex shrink-0 items-center justify-between gap-2 px-3 pb-2.5 pl-4 pt-3">
                    <h2 className={`text-[10px] font-bold uppercase tracking-widest ${cfg.headerCls}`}>
                      {cfg.label}
                    </h2>
                    <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${cfg.badge}`}>
                      {colRows.length}
                    </span>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-3 pl-4 [scrollbar-width:thin]">
                    {colRows.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/60 px-3 py-6 text-center text-[10px] text-[var(--gray-400)] dark:border-white/10">
                        Sem requisições.
                      </div>
                    ) : (
                      colRows.map((row) => {
                        const r = summaries.get(row.id)
                        return (
                          <RequestCard
                            key={row.id}
                            row={row}
                            summary={r?.summary}
                            hasCritical={r?.request.has_critical_result}
                          />
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
