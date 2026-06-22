"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch, apiFetchList } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestItem = {
  id: number
  exam_name?: string
  medical_exam_name?: string
  sample_status?: string
}

type LabRequest = {
  id: number
  custom_id?: string
  patient_name?: string
  patient_age?: string
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

function examNames(row: LabRequest) {
  return (row.items ?? [])
    .filter((i) => i.exam_name || i.medical_exam_name)
    .map((i) => i.exam_name ?? i.medical_exam_name ?? "")
    .join(", ")
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function OrderCard({
  row,
  onIniciar,
  onTransferir,
  busy,
}: {
  row: LabRequest
  onIniciar: () => void
  onTransferir: () => void
  busy: boolean
}) {
  return (
    <article className="rounded border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/requests/${row.id}`}
            className="text-sm font-semibold text-[var(--primary-700)] hover:underline dark:text-[var(--primary-400)]"
          >
            {row.custom_id}
          </Link>
          <p className="text-xs text-[var(--text)]">{row.patient_name}</p>
          {row.patient_age && (
            <p className="text-[10px] text-[var(--gray-500)]">{row.patient_age}</p>
          )}
          <p className="mt-0.5 text-[11px] text-[var(--gray-500)]">{examNames(row)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
            row.type === "LAB"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
          }`}>
            {row.type}
          </span>
          {getClinicalStatusLabel(row.clinical_status, row.clinical_status_display) && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              {getClinicalStatusLabel(row.clinical_status, row.clinical_status_display)}
            </span>
          )}
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            ✓ Amostras aceites
          </span>
          <span className="text-[10px] text-[var(--gray-400)]">Colhida {fmt(row.collected_at)}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-2">
        <button
          type="button"
          onClick={onTransferir}
          disabled={busy}
          className="h-7 rounded border border-[var(--border)] px-3 text-[11px] text-[var(--gray-700)] hover:bg-[var(--gray-100)] disabled:opacity-60 dark:text-[var(--gray-300)]"
        >
          Transferir análise
        </button>
        <button
          type="button"
          onClick={onIniciar}
          disabled={busy}
          className="h-7 rounded bg-[var(--primary-600)] px-3 text-[11px] font-semibold text-white hover:bg-[var(--primary-700)] disabled:opacity-60"
        >
          {busy ? "A processar..." : "Iniciar processamento"}
        </button>
      </div>
    </article>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LabOrdersPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<LabRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

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

  async function handleIniciar(row: LabRequest) {
    setBusyId(row.id)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${row.id}/iniciar-processamento/`, { method: "POST" })
      setFeedback(`${row.custom_id} enviada para lista de trabalho.`)
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao iniciar processamento.")
    } finally {
      setBusyId(null)
    }
  }

  async function handleTransferir(row: LabRequest) {
    setBusyId(row.id)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${row.id}/transferir-analise/`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      setFeedback(`${row.custom_id} transferida para análise externa.`)
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao transferir análise.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <PageHeader
          title="Pedidos"
          subtitle="Requisições com amostras aceites na receção — prontas para análise ou transferência."
        />

        {feedback && (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/15 dark:text-emerald-300">
            {feedback}
          </div>
        )}
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[var(--gray-400)]">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[var(--gray-400)]">
            Sem pedidos a aguardar processamento.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <OrderCard
                key={row.id}
                row={row}
                onIniciar={() => handleIniciar(row)}
                onTransferir={() => handleTransferir(row)}
                busy={busyId === row.id}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
