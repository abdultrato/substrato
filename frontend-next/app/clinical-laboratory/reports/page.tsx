"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch, apiFetchList } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { genderLabel } from "@/components/clinical-laboratory/ReceptionWorkflow"

type LabRequest = {
  id: number
  custom_id?: string
  patient_name?: string
  patient_age?: string
  patient_gender?: string
  clinical_status?: string
  clinical_status_display?: string
  updated_at?: string
  validated_at?: string
}

type ColumnKey = "today" | "yesterday" | "month" | "older"

type ColumnConfig = {
  key: ColumnKey
  title: string
  header: string
  badge: string
  top: string
}

const COLUMNS: ColumnConfig[] = [
  { key: "today", title: "Resultados de hoje", header: "text-sky-700", badge: "bg-sky-100 text-sky-800", top: "border-t-2 border-t-sky-400" },
  { key: "yesterday", title: "Resultados de ontem", header: "text-indigo-700", badge: "bg-indigo-100 text-indigo-800", top: "border-t-2 border-t-indigo-400" },
  { key: "month", title: "Resultados deste mês", header: "text-amber-700", badge: "bg-amber-100 text-amber-800", top: "border-t-2 border-t-amber-400" },
  { key: "older", title: "Resultados mais antigos", header: "text-slate-600", badge: "bg-slate-100 text-slate-700", top: "border-t-2 border-t-slate-400" },
]

function laudoDate(row: LabRequest): string | undefined {
  return row.updated_at || row.validated_at
}

function makeBucketer() {
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startYesterday = startToday - 24 * 60 * 60 * 1000
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  return (row: LabRequest): ColumnKey => {
    const value = laudoDate(row)
    const t = value ? new Date(value).getTime() : NaN
    if (Number.isNaN(t)) return "older"
    if (t >= startToday) return "today"
    if (t >= startYesterday) return "yesterday"
    if (t >= startMonth) return "month"
    return "older"
  }
}

function SmartCard({
  row,
  onNotify,
  busy,
  notified,
}: {
  row: LabRequest
  onNotify: (row: LabRequest) => void
  busy: boolean
  notified: boolean
}) {
  const priority = getClinicalStatusLabel(row.clinical_status, row.clinical_status_display)
  const meta = [row.patient_age, genderLabel(row.patient_gender)].filter(Boolean).join(" · ")

  function openPdf() {
    window.open(`/api/v1/clinical/labrequest/${row.id}/results-pdf/`, "_blank")
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/requests/${row.id}`}
          className="text-sm font-semibold text-[var(--primary-700)] hover:underline dark:text-[var(--primary-400)]"
        >
          {row.custom_id}
        </Link>
        {priority ? (
          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {priority}
          </span>
        ) : null}
      </div>

      <div className="truncate text-xs text-[var(--text)]">
        {row.patient_name}
        {meta ? <span className="text-[10px] text-[var(--gray-500)]"> · {meta}</span> : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={openPdf}
          className="inline-flex h-7 items-center rounded bg-[var(--primary-600)] px-2.5 text-[10px] font-semibold text-white hover:bg-[var(--primary-700)]"
        >
          Imprimir resultado
        </button>
        <button
          type="button"
          onClick={() => onNotify(row)}
          disabled={busy}
          className="inline-flex h-7 items-center rounded border border-[var(--border)] px-2.5 text-[10px] font-medium text-[var(--gray-700)] hover:bg-[var(--gray-100)] disabled:opacity-60 dark:text-[var(--gray-300)]"
        >
          {busy ? "A notificar..." : notified ? "✓ Notificado" : "Notificar paciente"}
        </button>
      </div>
    </div>
  )
}

export default function LabReportsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<LabRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notifiedId, setNotifiedId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await apiFetchList<LabRequest>(
        "/clinical/labrequest/?fase=laudos&ordering=-updated_at",
        { page: 1, pageSize: 200, clientCache: false },
      )
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar laudos.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  const buckets = useMemo(() => {
    const bucketer = makeBucketer()
    const grouped: Record<ColumnKey, LabRequest[]> = { today: [], yesterday: [], month: [], older: [] }
    for (const row of rows) {
      grouped[bucketer(row)].push(row)
    }
    return grouped
  }, [rows])

  async function handleNotify(row: LabRequest) {
    setBusyId(row.id)
    setError(null)
    try {
      await apiFetch(`/clinical/labrequest/${row.id}/send-results-notification/`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      setNotifiedId(row.id)
    } catch (e: any) {
      setError(e?.message || "Falha ao enviar notificação.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-3">
        <PageHeader title="Laudos" />

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[var(--gray-400)]">A carregar...</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((column) => {
              const items = buckets[column.key]
              return (
                <section key={column.key} className={`flex flex-col rounded-lg bg-[var(--card)]/40 p-2 ${column.top}`}>
                  <div className="flex items-center justify-between gap-2 px-1 pb-2 pt-1">
                    <h2 className={`text-xs font-semibold uppercase tracking-wide ${column.header}`}>{column.title}</h2>
                    <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${column.badge}`}>
                      {items.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto pr-1 max-h-[calc(100vh-180px)] [scrollbar-width:thin]">
                    {items.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--gray-500)]">
                        Sem laudos.
                      </div>
                    ) : (
                      items.map((row) => (
                        <SmartCard
                          key={row.id}
                          row={row}
                          onNotify={handleNotify}
                          busy={busyId === row.id}
                          notified={notifiedId === row.id}
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
