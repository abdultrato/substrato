"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
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

// ─── RequestCard ──────────────────────────────────────────────────────────────

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
      <article className="cursor-pointer rounded border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm transition-colors hover:border-[var(--primary-400)] hover:shadow">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                {row.custom_id}
              </span>
              {hasCritical && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
                  CRÍTICO
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[var(--text)]">{row.patient_name}</p>
            {row.patient_age && (
              <p className="text-[10px] text-[var(--gray-500)]">{row.patient_age}</p>
            )}
          </div>
          {statusLabel && (
            <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              {statusLabel}
            </span>
          )}
        </div>

        {summary && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-2">
            {summary.pending > 0 && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                {summary.pending} pendente{summary.pending !== 1 ? "s" : ""}
              </span>
            )}
            {summary.in_analysis > 0 && (
              <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700 dark:bg-violet-900/20 dark:text-violet-400">
                {summary.in_analysis} em análise
              </span>
            )}
            {summary.awaiting_validation > 0 && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                {summary.awaiting_validation} a validar
              </span>
            )}
            {summary.validated > 0 && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                {summary.validated} validado{summary.validated !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </article>
    </Link>
  )
}

// ─── Column config ────────────────────────────────────────────────────────────

const COL_CONFIG = [
  {
    label: "Todas pendentes",
    color: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800/30",
    bg: "bg-amber-50/60 dark:bg-amber-900/10",
  },
  {
    label: "Parcialmente iniciadas",
    color: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800/30",
    bg: "bg-orange-50/60 dark:bg-orange-900/10",
  },
  {
    label: "Em análise",
    color: "text-violet-700 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800/30",
    bg: "bg-violet-50/60 dark:bg-violet-900/10",
  },
  {
    label: "Concluídas",
    color: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800/30",
    bg: "bg-emerald-50/60 dark:bg-emerald-900/10",
  },
] as const

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LabWorklistsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<LabRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summaries, setSummaries] = useState<Map<number, RequestResults>>(new Map())
  const [summariesPending, setSummariesPending] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSummaries(new Map())
    try {
      const { items } = await apiFetchList<LabRequest>("/clinical/labrequest/?fase=trabalho", {
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
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  // Eager-load summaries for column classification
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

  // Classify into 4 columns
  const columns: [LabRequest[], LabRequest[], LabRequest[], LabRequest[]] = [[], [], [], []]
  for (const row of rows) {
    const r = summaries.get(row.id)
    columns[classifyRequest(r?.summary)].push(row)
  }
  const sortedColumns = columns.map(sortRequests)
  const isReady = !loading && summariesPending === 0

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-3 px-4">
        <PageHeader
          title="Lista de Trabalho"
          subtitle="Inserção e validação de resultados por exame."
        />

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {!isReady ? (
          <p className="text-sm text-[var(--gray-400)]">
            {loading ? "Carregando..." : "Classificando requisições..."}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[var(--gray-400)]">Sem requisições em processamento.</p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {sortedColumns.map((colRows, colIdx) => {
              const cfg = COL_CONFIG[colIdx]
              return (
                <div
                  key={colIdx}
                  className={`flex flex-col rounded-lg border ${cfg.border} ${cfg.bg} p-2`}
                >
                  <div className="mb-2 flex items-center justify-between px-0.5">
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wide ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>
                    <span
                      className={`rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-bold dark:bg-black/20 ${cfg.color}`}
                    >
                      {colRows.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {colRows.map((row) => {
                      const r = summaries.get(row.id)
                      return (
                        <RequestCard
                          key={row.id}
                          row={row}
                          summary={r?.summary}
                          hasCritical={r?.request.has_critical_result}
                        />
                      )
                    })}
                    {colRows.length === 0 && (
                      <p className="px-1 text-[11px] text-[var(--gray-400)]">—</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
