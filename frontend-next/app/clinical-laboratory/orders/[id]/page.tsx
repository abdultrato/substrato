"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"
import { routeParamToString } from "@/lib/routeParams"
import { genderLabel } from "@/components/clinical-laboratory/ReceptionWorkflow"

type RequestItem = {
  id: number
  exam_name?: string
  exam_custom_id?: string
  exam_method?: string
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
  status?: string
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

function examRows(row: LabRequest) {
  return (row.items ?? []).filter((i) => i.exam_name || i.medical_exam_name)
}

export default function LabOrderDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const [record, setRecord] = useState<LabRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<LabRequest>(`/clinical/labrequest/${id}/`, { clientCache: false })
      setRecord(data)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar o pedido.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleIniciar() {
    if (!record?.id) return
    setBusy(true)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${record.id}/iniciar-processamento/`, { method: "POST" })
      setFeedback(`${record.custom_id} enviada para lista de trabalho.`)
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao iniciar processamento.")
    } finally {
      setBusy(false)
    }
  }

  async function handleTransferir() {
    if (!record?.id) return
    setBusy(true)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${record.id}/transferir-analise/`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      setFeedback(`${record.custom_id} transferida para análise externa.`)
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao transferir análise.")
    } finally {
      setBusy(false)
    }
  }

  const exams = record ? examRows(record) : []
  const meta = record ? [record.patient_age, genderLabel(record.patient_gender)].filter(Boolean).join(" · ") : ""
  const isPending = (record?.status || "").trim().toLowerCase() === "pendente"

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <nav className="flex items-center gap-1.5 text-xs text-[var(--gray-500)]">
          <Link href="/clinical-laboratory/orders" className="hover:underline">Pedidos</Link>
          <span aria-hidden>›</span>
          <span className="font-semibold text-[var(--text)]">{record?.custom_id ?? id}</span>
        </nav>

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
        ) : !record ? (
          <p className="text-sm text-[var(--gray-400)]">Pedido não encontrado.</p>
        ) : (
          <article className="overflow-hidden rounded border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="flex items-start justify-between gap-2 px-3 pt-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text)]">
                  {record.patient_name}
                  {meta ? <span className="text-[11px] font-normal text-[var(--gray-500)]"> · {meta}</span> : null}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  record.type === "LAB"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                }`}>
                  {record.type}
                </span>
                {getClinicalStatusLabel(record.clinical_status, record.clinical_status_display) && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    {getClinicalStatusLabel(record.clinical_status, record.clinical_status_display)}
                  </span>
                )}
                <span className="text-[10px] text-[var(--gray-400)]">Colhida {fmt(record.collected_at)}</span>
              </div>
            </div>

            {exams.length > 0 && (
              <div className="mx-3 mt-2.5 overflow-hidden border border-[var(--border)]">
                <table className="w-full table-fixed border-collapse text-[11px]">
                  <colgroup>
                    <col className="w-[22%]" />
                    <col className="w-[50%]" />
                    <col className="w-[28%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--gray-50,#f9fafb)] dark:bg-[var(--gray-900,#111)]">
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Código</th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Exame</th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Método</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {exams.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 1 ? "bg-[var(--gray-50,#f9fafb)] dark:bg-[var(--gray-900,#0d0d0d)]" : ""}>
                        <td className="truncate px-3 py-1.5 font-mono text-[10px] text-[var(--gray-500)]">{item.exam_custom_id ?? "—"}</td>
                        <td className="truncate px-3 py-1.5 font-medium text-[var(--text)]">{item.exam_name ?? item.medical_exam_name ?? "—"}</td>
                        <td className="truncate px-3 py-1.5 text-[var(--gray-500)]">{item.exam_method ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {isPending ? (
              <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--border)] px-3 py-2">
                <button
                  type="button"
                  onClick={handleTransferir}
                  disabled={busy}
                  className="h-7 rounded border border-[var(--border)] px-3 text-[11px] text-[var(--gray-700)] hover:bg-[var(--gray-100)] disabled:opacity-60 dark:text-[var(--gray-300)]"
                >
                  Transferir análise
                </button>
                <button
                  type="button"
                  onClick={handleIniciar}
                  disabled={busy}
                  className="h-7 rounded bg-[var(--primary-600)] px-3 text-[11px] font-semibold text-white hover:bg-[var(--primary-700)] disabled:opacity-60"
                >
                  {busy ? "A processar..." : "Iniciar processamento"}
                </button>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] px-3 py-2">
                <span className="text-[10px] font-medium text-[var(--gray-500)]">
                  Pedido já encaminhado para processamento.
                </span>
                <Link
                  href="/clinical-laboratory/worklists"
                  className="flex h-7 items-center rounded bg-[var(--primary-600)] px-3 text-[11px] font-semibold text-white hover:bg-[var(--primary-700)]"
                >
                  Ver em Listas de trabalho →
                </Link>
              </div>
            )}
          </article>
        )}
      </div>
    </AppLayout>
  )
}
