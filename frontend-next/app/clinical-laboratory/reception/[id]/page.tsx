"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FlaskConical,
  Loader2,
  XCircle,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch, apiFetchList } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"
import { clinicalLabItemsRoute } from "@/lib/clinicalLabExamRouting"
import { routeParamToString } from "@/lib/routeParams"
import {
  countsByStatus,
  fmt,
  ItemRow,
  labItemsOf,
  patientLine,
  type LabRequest,
  type RejectionReason,
  type RequestItem,
} from "@/components/clinical-laboratory/ReceptionWorkflow"

export default function LabReceptionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = routeParamToString((params as any)?.id)
  const [record, setRecord] = useState<LabRequest | null>(null)
  const [reasons, setReasons] = useState<RejectionReason[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busyItem, setBusyItem] = useState<number | null>(null)
  const [busyAll, setBusyAll] = useState(false)
  const [sendingToLab, setSendingToLab] = useState(false)

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

  async function handleSendToLab() {
    if (!record?.id) return
    setSendingToLab(true)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${record.id}/iniciar-processamento/`, { method: "POST" })
      const destination = clinicalLabItemsRoute(labItemsOf(record), `/clinical-laboratory/worklists/${record.id}`)
      router.push(destination)
    } catch (e: any) {
      setError(e?.message || "Falha ao enviar para processamento laboratorial.")
    } finally {
      setSendingToLab(false)
    }
  }

  const items = record ? labItemsOf(record) : []
  const counts = countsByStatus(items)
  const allResolved = counts.pending === 0 && counts.total > 0
  const allReceived = allResolved && counts.rejected === 0
  const statusLabel = record
    ? getClinicalStatusLabel(record.clinical_status, record.clinical_status_display)
    : null
  const patient = record ? patientLine(record) : { name: "", meta: "" }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-4xl space-y-3">
        {/* ── Banner ── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-r from-sky-500/15 via-white/30 to-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:from-sky-500/10 dark:via-white/5 dark:to-white/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                <FlaskConical size={22} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <h1 className="truncate font-display text-xl font-bold text-foreground">
                  {record?.custom_id ? `Recepção — ${record.custom_id}` : "Recepção de Amostra"}
                </h1>
                <p className="text-[11px] text-muted-foreground">Conferência e recepção das amostras por exame.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {counts.pending > 0 && counts.rejected === 0 ? (
                <button
                  type="button"
                  onClick={handleReceiveAll}
                  disabled={busyAll}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 px-3.5 text-xs font-semibold text-white shadow-md shadow-sky-500/30 transition hover:from-sky-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ClipboardCheck size={13} />
                  {busyAll ? "A receber..." : "Receber todas as amostras"}
                </button>
              ) : null}
              <Link
                href="/clinical-laboratory/reception"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/40 px-3 text-xs font-medium text-foreground-2 shadow-sm backdrop-blur-sm transition hover:bg-white/60 hover:text-foreground dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
              >
                <ArrowLeft size={13} />
                Voltar
              </Link>
            </div>
          </div>

          {record ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/30 pt-2.5 dark:border-white/10">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Paciente</div>
                <div className="truncate text-xs font-semibold text-foreground">
                  {patient.name || "—"}
                  {patient.meta ? (
                    <span className="font-normal text-[var(--gray-500)]"> · {patient.meta}</span>
                  ) : null}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Colhida</div>
                <div className="text-xs font-semibold tabular-nums text-foreground">{fmt(record.collected_at)}</div>
              </div>
              {statusLabel ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  {statusLabel}
                </span>
              ) : null}

              <div className="ml-auto flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50/70 px-2 py-1 text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-900/15 dark:text-emerald-300">
                  <CheckCircle2 size={12} />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Recebidas</span>
                  <span className="font-display text-sm font-bold tabular-nums">{counts.received}/{counts.total}</span>
                </span>
                {counts.pending > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-200/60 bg-sky-50/70 px-2 py-1 text-sky-700 dark:border-sky-800/30 dark:bg-sky-900/15 dark:text-sky-300">
                    <Clock size={12} />
                    <span className="text-[10px] font-medium uppercase tracking-wide">Pendentes</span>
                    <span className="font-display text-sm font-bold tabular-nums">{counts.pending}</span>
                  </span>
                ) : null}
                {counts.rejected > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200/60 bg-rose-50/70 px-2 py-1 text-rose-700 dark:border-rose-800/30 dark:bg-rose-900/15 dark:text-rose-300">
                    <XCircle size={12} />
                    <span className="text-[10px] font-medium uppercase tracking-wide">Rejeitadas</span>
                    <span className="font-display text-sm font-bold tabular-nums">{counts.rejected}</span>
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {feedback && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200/60 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800 shadow-sm backdrop-blur-sm dark:border-emerald-800/40 dark:bg-emerald-900/15 dark:text-emerald-300">
            <CheckCircle2 size={13} className="shrink-0" />
            {feedback}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200/60 bg-rose-50/70 px-3 py-2 text-xs text-rose-800 shadow-sm backdrop-blur-sm dark:border-rose-800/40 dark:bg-rose-900/15 dark:text-rose-300">
            <AlertTriangle size={13} className="shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/35 px-4 py-6 text-sm text-[var(--gray-500)] shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <Loader2 size={15} className="animate-spin text-sky-500" />
            A carregar a requisição...
          </div>
        ) : !record ? (
          <div className="rounded-xl border border-white/25 bg-white/35 px-4 py-6 text-sm text-[var(--gray-500)] shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            Requisição não encontrada.
          </div>
        ) : (
          <article className="relative overflow-hidden rounded-xl border border-white/25 bg-white/35 p-3 pl-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <span className="absolute left-0 top-0 h-full w-1.5 rounded-r-full bg-sky-500" />

            <div className="mb-2 flex items-center gap-1.5">
              <FlaskConical size={13} className="text-sky-500" />
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                Amostras da requisição
              </h2>
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
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-emerald-200/60 pt-2.5 dark:border-emerald-800/20">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 size={13} />
                  Todas as amostras aceites — pronto para o laboratório
                </span>
                <button
                  type="button"
                  onClick={handleSendToLab}
                  disabled={sendingToLab}
                  className="inline-flex h-7 items-center rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-teal-700"
                >
                  {sendingToLab ? "A encaminhar..." : "Enviar para laboratório →"}
                </button>
              </div>
            )}

            {allResolved && !allReceived && (
              <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-amber-200/60 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-800 backdrop-blur-sm dark:border-amber-800/30 dark:bg-amber-900/10 dark:text-amber-300">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                <span>
                  <span className="font-semibold">{counts.rejected} exame(s) rejeitado(s)</span> — devolvido(s) à enfermagem para recoleta.
                  {counts.received > 0 && (
                    <span className="ml-1">Os restantes {counts.received} exame(s) foram recebidos.</span>
                  )}
                </span>
              </div>
            )}
          </article>
        )}
      </div>
    </AppLayout>
  )
}
