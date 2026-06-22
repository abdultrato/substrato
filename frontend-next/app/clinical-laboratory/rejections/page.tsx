"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetchList } from "@/lib/api"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"

type Rejection = {
  id: number
  custom_id?: string
  request: number
  request_custom_id?: string
  patient_name?: string
  exam_name?: string
  reasons_text?: string
  note?: string
  status?: string
  status_display?: string
  created_at?: string
  resolved_at?: string
}

type ColumnKey = "pendente" | "resolvida"

type ColumnConfig = {
  key: ColumnKey
  title: string
  hint: string
  header: string
  badge: string
  top: string
}

const COLUMNS: ColumnConfig[] = [
  {
    key: "pendente",
    title: "Rejeições pendentes",
    hint: "Enviadas à enfermagem, ainda sem reconferência/recepção.",
    header: "text-amber-700",
    badge: "bg-amber-100 text-amber-800",
    top: "border-t-2 border-t-amber-400",
  },
  {
    key: "resolvida",
    title: "Rejeições resolvidas",
    hint: "Amostra reconferida e recebida sem nova rejeição.",
    header: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800",
    top: "border-t-2 border-t-emerald-400",
  },
]

function fmt(value?: string): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function normalizeStatus(value?: string): ColumnKey {
  return (value || "").trim().toLocaleLowerCase() === "resolvida" ? "resolvida" : "pendente"
}

export default function LabRejectionsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<Rejection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await apiFetchList<Rejection>("/clinical/sample_rejection/", {
        page: 1,
        pageSize: 200,
        clientCache: false,
      })
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar as rejeições.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  const buckets = useMemo(() => {
    const grouped: Record<ColumnKey, Rejection[]> = { pendente: [], resolvida: [] }
    for (const row of rows) {
      grouped[normalizeStatus(row.status)].push(row)
    }
    return grouped
  }, [rows])

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <PageHeader title="Rejeições de Amostras" />

        {error && (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[var(--gray-400)]">Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {COLUMNS.map((column) => {
              const items = buckets[column.key]
              return (
                <section
                  key={column.key}
                  className={`flex flex-col rounded-lg bg-[var(--card)]/40 p-2 ${column.top}`}
                >
                  <div className="flex items-baseline justify-between gap-2 px-1 pb-2 pt-1">
                    <div className="min-w-0">
                      <h2 className={`text-xs font-semibold uppercase tracking-wide ${column.header}`}>{column.title}</h2>
                      <p className="text-[10px] text-[var(--gray-500)]">{column.hint}</p>
                    </div>
                    <span className={`inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${column.badge}`}>
                      {items.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto pr-1 max-h-[calc(100vh-200px)] [scrollbar-width:thin]">
                    {items.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--gray-500)]">
                        Sem rejeições.
                      </div>
                    ) : (
                      items.map((row) => (
                        <div
                          key={row.id}
                          className="space-y-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/clinical-laboratory/reception/${row.request}`}
                              className="text-sm font-semibold text-[var(--primary-700)] hover:underline dark:text-[var(--primary-400)]"
                            >
                              {row.request_custom_id || `REQ ${row.request}`}
                            </Link>
                            {row.exam_name ? (
                              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                                {row.exam_name}
                              </span>
                            ) : null}
                          </div>

                          {row.patient_name ? (
                            <div className="truncate text-xs text-[var(--text)]">{row.patient_name}</div>
                          ) : null}

                          {row.reasons_text ? (
                            <div className="rounded border border-rose-200 bg-rose-50/70 px-2 py-1 text-[10px] text-rose-800">
                              <span className="font-semibold">Motivo: </span>
                              {row.reasons_text}
                              {row.note ? ` — ${row.note}` : ""}
                            </div>
                          ) : null}

                          <div className="text-[10px] text-[var(--gray-400)]">
                            Rejeitada em {fmt(row.created_at)}
                            {column.key === "resolvida" ? ` · Resolvida em ${fmt(row.resolved_at)}` : ""}
                          </div>
                        </div>
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
