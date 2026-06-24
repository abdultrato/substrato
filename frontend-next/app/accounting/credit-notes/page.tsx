"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, XCircle } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MoneyValue from "@/components/ui/MoneyValue"
import { apiFetch } from "@/lib/api"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS } from "@/lib/rbac"

type CreditNoteRow = {
  id: number
  custom_id?: string
  invoice_code?: string
  invoice_status?: string
  consultation_code?: string | null
  patient_name?: string | null
  amount?: string | number
  reason?: string
  status?: string
  status_display?: string
  requested_by_name?: string | null
  reviewed_by_name?: string | null
  decision_note?: string
  created_at?: string
  reviewed_at?: string
}

type Decision = "approve" | "reject"

const STATUS_STYLES: Record<string, string> = {
  PEND: "border-amber-200 bg-amber-50 text-amber-800",
  APRO: "border-emerald-200 bg-emerald-50 text-emerald-800",
  REJE: "border-red-200 bg-red-50 text-red-700",
  CANC: "border-slate-200 bg-slate-50 text-slate-600",
}

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

async function loadCreditNotes(status: string): Promise<CreditNoteRow[]> {
  const query = status ? `?status=${status}&ordering=-created_at` : "?ordering=-created_at"
  const res = await apiFetch<any>(`/billing/credit-note-request/${query}`, { clientCache: false })
  const list = (res?.results ?? res) || []
  return Array.isArray(list) ? list : []
}

export default function CreditNotesQueuePage() {
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [loadingPending, setLoadingPending] = useState(true)
  const [loadingDecided, setLoadingDecided] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [pendingRows, setPendingRows] = useState<CreditNoteRow[]>([])
  const [approvedRows, setApprovedRows] = useState<CreditNoteRow[]>([])
  const [rejectedRows, setRejectedRows] = useState<CreditNoteRow[]>([])

  const [decisionRow, setDecisionRow] = useState<CreditNoteRow | null>(null)
  const [decision, setDecision] = useState<Decision>("approve")
  const [decisionNote, setDecisionNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [decisionError, setDecisionError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    try {
      setErro(null)
      setLoadingPending(true)
      setLoadingDecided(true)
      const [pending, approved, rejected] = await Promise.all([
        loadCreditNotes("PEND"),
        loadCreditNotes("APRO"),
        loadCreditNotes("REJE"),
      ])
      setPendingRows(pending)
      setApprovedRows(approved)
      setRejectedRows(rejected)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar pedidos de nota de crédito."))
    } finally {
      setLoadingPending(false)
      setLoadingDecided(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll, safeRefreshToken])

  const openDecision = useCallback((row: CreditNoteRow, kind: Decision) => {
    setDecisionRow(row)
    setDecision(kind)
    setDecisionNote("")
    setDecisionError(null)
  }, [])

  const closeDecision = useCallback(() => {
    if (submitting) return
    setDecisionRow(null)
    setDecisionNote("")
    setDecisionError(null)
  }, [submitting])

  const confirmDecision = useCallback(async () => {
    if (!decisionRow?.id) return
    setSubmitting(true)
    setDecisionError(null)
    try {
      await apiFetch(`/billing/credit-note-request/${decisionRow.id}/${decision}/`, {
        method: "POST",
        body: JSON.stringify({ note: decisionNote.trim() }),
      })
      setDecisionRow(null)
      setDecisionNote("")
      await loadAll()
    } catch (e: any) {
      setDecisionError(e?.message || "Falha ao registar a decisão.")
    } finally {
      setSubmitting(false)
    }
  }, [decision, decisionNote, decisionRow?.id, loadAll])

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.CONTABILIDADE]}>
      <div className="space-y-4">
        <PageHeader title="Notas de crédito" />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        {/* Fila de pendentes */}
        <Card title="Pedidos pendentes" subtitle="A aguardar decisão da Contabilidade.">
          {loadingPending ? (
            <div className="text-sm text-gray-500">Carregando...</div>
          ) : pendingRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              Nenhum pedido pendente.
            </div>
          ) : (
            <CreditNoteTable rows={pendingRows} onDecide={openDecision} showActions />
          )}
        </Card>

        {/* Aprovadas e rejeitadas */}
        <div className="grid gap-4 lg:grid-cols-2">
          <DecidedSection
            title="Aprovadas"
            icon={<CheckCircle2 size={14} className="text-emerald-600" />}
            rows={approvedRows}
            loading={loadingDecided}
            emptyMsg="Nenhuma nota de crédito aprovada."
            tone="emerald"
          />
          <DecidedSection
            title="Rejeitadas"
            icon={<XCircle size={14} className="text-red-500" />}
            rows={rejectedRows}
            loading={loadingDecided}
            emptyMsg="Nenhuma nota de crédito rejeitada."
            tone="red"
          />
        </div>
      </div>

      {decisionRow ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={closeDecision} />
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {decision === "approve" ? "Aprovar nota de crédito" : "Rejeitar nota de crédito"}
              </h3>
              <p className="mt-1 text-xs text-[var(--gray-600)]">
                {decisionRow.custom_id} · {decisionRow.invoice_code} · {decisionRow.patient_name || "-"}
              </p>
            </div>

            <div className="space-y-3 px-4 py-4">
              <label className="space-y-1">
                <span className="text-xs text-[var(--gray-600)]">Nota da decisão (opcional)</span>
                <textarea
                  value={decisionNote}
                  onChange={(e) => {
                    setDecisionNote(e.target.value)
                    if (decisionError) setDecisionError(null)
                  }}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  autoFocus
                />
              </label>
              {decisionError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {decisionError}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
              <button
                type="button"
                onClick={closeDecision}
                disabled={submitting}
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDecision}
                disabled={submitting}
                className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-60 ${
                  decision === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submitting ? "A processar..." : decision === "approve" ? "Aprovar" : "Rejeitar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  )
}

function CreditNoteTable({
  rows,
  onDecide,
  showActions = false,
}: {
  rows: CreditNoteRow[]
  onDecide?: (row: CreditNoteRow, kind: Decision) => void
  showActions?: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
          <tr>
            <th className="px-3 py-2 text-left">Pedido</th>
            <th className="px-3 py-2 text-left">Fatura</th>
            <th className="px-3 py-2 text-left">Paciente</th>
            <th className="px-3 py-2 text-right">Valor</th>
            <th className="px-3 py-2 text-left">Motivo</th>
            <th className="px-3 py-2 text-left">Solicitante</th>
            {showActions ? <th className="px-3 py-2 text-right">Ações</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-3 py-2 font-medium text-slate-900">{r.custom_id || r.id}</td>
              <td className="px-3 py-2 text-slate-700">
                <div>{r.invoice_code || "-"}</div>
                {r.consultation_code ? (
                  <div className="text-[11px] text-slate-500">{r.consultation_code}</div>
                ) : null}
              </td>
              <td className="px-3 py-2 text-slate-700">{r.patient_name || "-"}</td>
              <td className="px-3 py-2 text-right font-medium text-slate-900">
                <MoneyValue value={r.amount} />
              </td>
              <td className="min-w-[160px] px-3 py-2 text-slate-600">{r.reason || "-"}</td>
              <td className="px-3 py-2 text-slate-600">
                <div>{fmtDate(r.created_at)}</div>
                {r.requested_by_name ? (
                  <div className="text-[11px] text-slate-500">{r.requested_by_name}</div>
                ) : null}
              </td>
              {showActions ? (
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onDecide?.(r, "approve")}
                      className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecide?.(r, "reject")}
                      className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      Rejeitar
                    </button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DecidedSection({
  title,
  icon,
  rows,
  loading,
  emptyMsg,
  tone,
}: {
  title: string
  icon: React.ReactNode
  rows: CreditNoteRow[]
  loading: boolean
  emptyMsg: string
  tone: "emerald" | "red"
}) {
  const borderColor = tone === "emerald" ? "border-emerald-200" : "border-red-200"
  const bgColor = tone === "emerald" ? "bg-emerald-50" : "bg-red-50"
  const textColor = tone === "emerald" ? "text-emerald-800" : "text-red-800"
  const subTextColor = tone === "emerald" ? "text-emerald-700" : "text-red-700"

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 shadow-sm">
      <div className="flex items-center gap-2 pb-2">
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--gray-100)]">{icon}</div>
        <p className="text-xs font-semibold text-[var(--text)]">{title}</p>
        {!loading && rows.length > 0 ? (
          <span className="ml-auto rounded-full bg-[var(--gray-100)] px-2 py-0.5 text-[11px] font-semibold text-[var(--gray-700)]">
            {rows.length}
          </span>
        ) : null}
      </div>

      {loading ? (
        <p className="text-[11px] text-[var(--gray-500)]">Carregando...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] px-3 py-4 text-center text-[11px] text-[var(--gray-500)]">
          {emptyMsg}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className={`rounded-lg border ${borderColor} ${bgColor} px-3 py-2`}>
              <div className="flex flex-wrap items-start justify-between gap-1">
                <div>
                  <span className={`text-xs font-semibold ${textColor}`}>{r.custom_id || `#${r.id}`}</span>
                  <span className={`ml-1.5 text-[11px] ${subTextColor}`}>{r.invoice_code || "-"}</span>
                  {r.patient_name ? (
                    <span className={`ml-1.5 text-[11px] ${subTextColor}`}>· {r.patient_name}</span>
                  ) : null}
                </div>
                <MoneyValue value={r.amount} className={`text-xs font-semibold ${textColor}`} />
              </div>
              {r.reason ? <p className={`mt-0.5 text-[11px] ${subTextColor}`}>{r.reason}</p> : null}
              <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] ${subTextColor}`}>
                {r.requested_by_name ? <span>Solicitado por: <strong>{r.requested_by_name}</strong></span> : null}
                {r.reviewed_by_name ? <span>Decidido por: <strong>{r.reviewed_by_name}</strong></span> : null}
                {r.reviewed_at ? <span>{fmtDate(r.reviewed_at)}</span> : null}
              </div>
              {r.decision_note ? (
                <p className={`mt-1 text-[11px] italic ${subTextColor}`}>&quot;{r.decision_note}&quot;</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
