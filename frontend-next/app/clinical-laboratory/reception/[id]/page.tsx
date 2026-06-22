"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch, apiFetchList } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"
import { routeParamToString } from "@/lib/routeParams"
import {
  countsByStatus,
  fmt,
  ItemRow,
  labItemsOf,
  type LabRequest,
  type RejectionReason,
  type RequestItem,
} from "@/components/clinical-laboratory/ReceptionWorkflow"

export default function LabReceptionDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const [record, setRecord] = useState<LabRequest | null>(null)
  const [reasons, setReasons] = useState<RejectionReason[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busyItem, setBusyItem] = useState<number | null>(null)
  const [busyAll, setBusyAll] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [data, { items: rsns }] = await Promise.all([
        apiFetch<LabRequest>(`/clinical/labrequest/${id}/`, { clientCache: false }),
        apiFetchList<RejectionReason>("/clinical/sample_rejection_reason/", { page: 1, pageSize: 200 }),
      ])
      setRecord(data)
      setReasons(rsns)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar a requisição.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleReceiveItem(item: RequestItem) {
    setBusyItem(item.id)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequestitem/${item.id}/receber-amostra/`, { method: "POST" })
      setFeedback(`Amostra de "${item.exam_name ?? item.medical_exam_name}" recebida.`)
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao receber amostra.")
    } finally {
      setBusyItem(null)
    }
  }

  async function handleReceiveAll() {
    if (!record?.id) return
    setBusyAll(true)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${record.id}/receber-todas-amostras/`, { method: "POST" })
      setFeedback("Todas as amostras pendentes foram recebidas.")
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao receber as amostras.")
    } finally {
      setBusyAll(false)
    }
  }

  async function handleRejectItem(item: RequestItem, note: string, reasonIds: number[]) {
    setBusyItem(item.id)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequestitem/${item.id}/rejeitar-amostra/`, {
        method: "POST",
        body: JSON.stringify({ rejection_reasons: reasonIds, note }),
      })
      setFeedback(`Amostra de "${item.exam_name ?? item.medical_exam_name}" rejeitada — devolvida à enfermagem para recoleta.`)
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao rejeitar amostra.")
    } finally {
      setBusyItem(null)
    }
  }

  const items = record ? labItemsOf(record) : []
  const counts = countsByStatus(items)
  const allResolved = counts.pending === 0 && counts.total > 0
  const allReceived = allResolved && counts.rejected === 0

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <PageHeader
          title={record?.custom_id ? `Recepção — ${record.custom_id}` : "Recepção de Amostra"}
          actions={
            <div className="flex items-center gap-2">
              {counts.pending > 0 ? (
                <button
                  type="button"
                  onClick={handleReceiveAll}
                  disabled={busyAll}
                  className="inline-flex h-8 items-center rounded bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyAll ? "A receber..." : "Receber todas as amostras"}
                </button>
              ) : null}
              <Link
                href="/clinical-laboratory/reception"
                className="inline-flex h-8 items-center rounded border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
              >
                Voltar
              </Link>
            </div>
          }
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
        ) : !record ? (
          <p className="text-sm text-[var(--gray-400)]">Requisição não encontrada.</p>
        ) : (
          <article className="rounded border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
            <div className="mb-2.5 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text)]">{record.patient_name}</p>
                {record.patient_age && <p className="text-[10px] text-[var(--gray-500)]">{record.patient_age}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {getClinicalStatusLabel(record.clinical_status, record.clinical_status_display) && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    {getClinicalStatusLabel(record.clinical_status, record.clinical_status_display)}
                  </span>
                )}
                <span className="text-[10px] text-[var(--gray-400)]">
                  {counts.received}/{counts.total} recebidas
                  {counts.rejected > 0 ? ` · ${counts.rejected} rejeitadas` : ""}
                </span>
                <span className="text-[10px] text-[var(--gray-400)]">Colhida {fmt(record.collected_at)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  reasons={reasons}
                  onReceive={() => handleReceiveItem(item)}
                  onReject={(note, ids) => handleRejectItem(item, note, ids)}
                  busy={busyItem === item.id}
                />
              ))}
            </div>

            {allReceived && (
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-emerald-200 pt-2 dark:border-emerald-800/20">
                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                  ✓ Todas as amostras aceites — disponível em Pedidos
                </span>
                <Link
                  href="/clinical-laboratory/orders"
                  className="flex h-6 items-center rounded bg-emerald-600 px-2.5 text-[10px] font-semibold text-white hover:bg-emerald-700"
                >
                  Ver em Pedidos →
                </Link>
              </div>
            )}

            {allResolved && !allReceived && (
              <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] text-amber-800 dark:border-amber-800/30 dark:bg-amber-900/10 dark:text-amber-300">
                <span className="font-semibold">{counts.rejected} exame(s) rejeitado(s)</span> — devolvido(s) à enfermagem para recoleta.
                {counts.received > 0 && (
                  <span className="ml-1">Os restantes {counts.received} exame(s) foram recebidos.</span>
                )}
              </div>
            )}
          </article>
        )}
      </div>
    </AppLayout>
  )
}
