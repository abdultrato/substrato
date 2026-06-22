"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetchList } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { genderLabel } from "@/components/clinical-laboratory/ReceptionWorkflow"

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestItem = {
  id: number
  exam_name?: string
  medical_exam_name?: string
}

type LabRequest = {
  id: number
  custom_id?: string
  patient_name?: string
  patient_age?: string
  patient_gender?: string
  clinical_status?: string
  clinical_status_display?: string
  type: "LAB" | "MED"
  collected_at?: string
  items?: RequestItem[]
}

function fmt(v?: string) {
  if (!v) return "-"
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function examCount(row: LabRequest) {
  return (row.items ?? []).filter((i) => i.exam_name || i.medical_exam_name).length
}

// ─── Summary Card (square, clickable) ───────────────────────────────────────────

function OrderCard({ row }: { row: LabRequest }) {
  const router = useRouter()
  const target = `/clinical-laboratory/orders/${row.id}`
  const priority = getClinicalStatusLabel(row.clinical_status, row.clinical_status_display)
  const meta = [row.patient_age, genderLabel(row.patient_gender)].filter(Boolean).join(" · ")
  const n = examCount(row)

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
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
          row.type === "LAB"
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
        }`}>
          {row.type}
        </span>
      </div>

      <div className="truncate text-xs text-[var(--text)]">
        {row.patient_name}
        {meta ? <span className="text-[10px] text-[var(--gray-500)]"> · {meta}</span> : null}
      </div>

      <div className="flex flex-wrap gap-1 pt-0.5">
        {priority ? (
          <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {priority}
          </span>
        ) : null}
        <span className="inline-flex items-center rounded bg-[var(--gray-100,#f3f4f6)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--gray-700)] dark:bg-[var(--gray-800,#1f2937)] dark:text-[var(--gray-300)]">
          {n} {n === 1 ? "exame" : "exames"}
        </span>
        <span className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          ✓ Amostras aceites
        </span>
      </div>

      <div className="mt-auto text-[10px] text-[var(--gray-400)]">Colhida {fmt(row.collected_at)}</div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LabOrdersPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<LabRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await apiFetchList<LabRequest>("/clinical/labrequest/?fase=pedidos", {
        page: 1,
        pageSize: 200,
        clientCache: false,
      })
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar pedidos.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-3">
        <PageHeader title="Pedidos" />

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[var(--gray-400)]">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[var(--gray-400)]">Sem pedidos a aguardar processamento.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((row) => (
              <OrderCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
