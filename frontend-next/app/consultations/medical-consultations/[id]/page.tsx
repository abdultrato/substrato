"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  CalendarX2,
  CheckCircle2,
  Circle,
  FileText,
  Info,
  Loader2,
  Pencil,
  Receipt,
  RotateCcw,
  Stethoscope,
  User,
  XCircle,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import MoneyValue from "@/components/ui/MoneyValue"
import { useAuth } from "@/hooks/useAuth"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import { routeParamToString } from "@/lib/routeParams"

type Row = Record<string, any>

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

function normalizeState(value: any): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
}

const FINAL_CONSULTATION_STATES = new Set(["CONCLUIDA", "COMPLETED", "REALIZADA", "CANCELADA", "CANCELED", "CANCELLED", "PAGA", "PAID"])
const BLOCKING_INVOICE_STATES = new Set(["EMIT", "EMITIDA", "ISSUED", "PAGA", "PAID"])

function fmtDateTime(value: any): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

type TimelineStep = { label: string; date: any; done: boolean; note?: string }

function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-0">
      {steps.map((step, i) => (
        <li key={i} className="relative flex flex-1 items-start gap-2.5 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
          <span className="relative z-10 mt-0.5 shrink-0">
            {step.done
              ? <CheckCircle2 size={16} className="text-emerald-500" />
              : <Circle size={16} className="text-[var(--gray-300)]" />}
          </span>
          {i < steps.length - 1 && (
            <>
              <span className="absolute left-[7px] top-6 h-full w-px bg-border sm:hidden" />
              <span className={`absolute left-1/2 top-2 hidden h-px w-full sm:block ${step.done ? "bg-emerald-400/60" : "bg-border"}`} />
            </>
          )}
          <div className="min-w-0">
            <p className={`text-xs font-semibold ${step.done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
            {step.date ? <p className="text-[10px] text-muted-foreground">{fmtDateTime(step.date)}</p> : null}
            {step.note ? <p className="text-[10px] text-muted-foreground">{step.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

export default function MedicalConsultationDetailPage() {
  const params = useParams()
  const id = routeParamToString(params?.id)
  const { t } = useLanguage()
  const { loading: authLoading } = useAuthGuard()
  const { user } = useAuth()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const canWrite = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.MEDICINA,
  ])

  const [row, setRow] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [newScheduledFor, setNewScheduledFor] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)
  const [creditNoteOpen, setCreditNoteOpen] = useState(false)
  const [creditNoteReason, setCreditNoteReason] = useState("")
  const [creditNoteError, setCreditNoteError] = useState<string | null>(null)
  const billingRef = useRef<HTMLElement | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<Row>(`/consultations/consultation/${id}/`, {
        clientCache: safeRefreshToken === 0,
      })
      setRow(res || null)
    } catch (e: any) {
      setError(
        isNotFoundLikeError(e)
          ? t("Consulta não encontrada.", "Consultation not found.")
          : e?.message || t("Falha ao carregar a consulta.", "Failed to load the consultation."),
      )
    } finally {
      setLoading(false)
    }
  }, [id, safeRefreshToken, t])

  useEffect(() => {
    load()
  }, [load])

  const openCreditNoteRequest = useCallback(() => {
    setCreditNoteError(null)
    setCreditNoteOpen(true)
    // Leva o utilizador ao cartão de faturação onde o pedido é feito.
    requestAnimationFrame(() => {
      billingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }, [])

  const cancelConsultation = useCallback(async () => {
    if (!id || !canWrite) return
    setBusy(true)
    setActionError(null)
    try {
      await apiFetch(`/consultations/consultation/${id}/cancel/`, { method: "POST", body: JSON.stringify({}) })
      await load()
    } catch (e: any) {
      const msg = e?.message || t("Falha ao cancelar consulta.", "Failed to cancel consultation.")
      // Fatura já emitida → em vez de só mostrar o aviso, abre o pedido de nota
      // de crédito no cartão de faturação para a fatura em causa.
      if (/nota de crédito|credit note/i.test(msg)) {
        openCreditNoteRequest()
      } else {
        setActionError(msg)
      }
    } finally {
      setBusy(false)
    }
  }, [id, canWrite, load, openCreditNoteRequest, t])

  const requestCreditNote = useCallback(async () => {
    if (!id || !canWrite) return
    setBusy(true)
    setCreditNoteError(null)
    try {
      await apiFetch(`/consultations/consultation/${id}/request-credit-note/`, {
        method: "POST",
        body: JSON.stringify({ reason: creditNoteReason.trim() }),
      })
      setCreditNoteOpen(false)
      setCreditNoteReason("")
      await load()
    } catch (e: any) {
      setCreditNoteError(e?.message || t("Falha ao solicitar nota de crédito.", "Failed to request credit note."))
    } finally {
      setBusy(false)
    }
  }, [id, canWrite, creditNoteReason, load, t])

  const openReschedule = useCallback(() => {
    const current = row?.scheduled_for ? new Date(row.scheduled_for) : null
    setNewScheduledFor(current && !Number.isNaN(current.getTime()) ? current.toISOString().slice(0, 16) : "")
    setActionError(null)
    setRescheduleOpen(true)
  }, [row?.scheduled_for])

  const confirmReschedule = useCallback(async () => {
    if (!id || !canWrite) return
    if (!newScheduledFor.trim()) {
      setActionError(t("Informe a nova data/hora.", "Provide the new date/time."))
      return
    }
    const d = new Date(newScheduledFor)
    const value = Number.isNaN(d.getTime()) ? newScheduledFor : d.toISOString()
    setBusy(true)
    setActionError(null)
    try {
      await apiFetch(`/consultations/consultation/${id}/reschedule/`, { method: "POST", body: JSON.stringify({ scheduled_for: value }) })
      setRescheduleOpen(false)
      await load()
    } catch (e: any) {
      setActionError(e?.message || t("Falha ao remarcar consulta.", "Failed to reschedule consultation."))
    } finally {
      setBusy(false)
    }
  }, [id, canWrite, newScheduledFor, load, t])

  const status = normalizeState(row?.status)
  const invoiceStatus = normalizeState(row?.invoice_status)
  const isOpen = !FINAL_CONSULTATION_STATES.has(status)
  const canEditConsultation =
    canWrite &&
    !FINAL_CONSULTATION_STATES.has(status) &&
    !BLOCKING_INVOICE_STATES.has(invoiceStatus)
  const overdue = useMemo(() => {
    if (!isOpen || !row?.scheduled_for) return false
    const ts = new Date(row.scheduled_for).getTime()
    return !Number.isNaN(ts) && ts < Date.now()
  }, [isOpen, row?.scheduled_for])

  const rescheduled = Number(row?.reschedule_count) > 0
  const meta = useMemo(() => {
    switch (status) {
      case "CONCLUIDA": return { label: t("Realizada", "Completed"), bar: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400" }
      case "CANCELADA": return { label: t("Cancelada", "Cancelled"), bar: "bg-rose-500", badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-400" }
      case "PAGA": return { label: t("Paga", "Paid"), bar: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400" }
      default:
        // Consulta em aberto: distingue re-agendada (âmbar) de agendada (azul).
        if (rescheduled) return { label: t("Re-agendada", "Rescheduled"), bar: "bg-amber-500", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400" }
        return { label: t("Agendada", "Scheduled"), bar: "bg-sky-500", badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-400" }
    }
  }, [status, rescheduled, t])

  const patient = String(row?.patient_name || "—")
  const initial = patient.trim().charAt(0).toUpperCase() || "?"

  const scheduleTypeLabel = useCallback((value?: string) => {
    if (value === "FIM_SEMANA") return t("Fim de semana", "Weekend")
    if (value === "FORA_EXPEDIENTE") return t("Fora de expediente", "After hours")
    if (value === "FERIADO_MANUAL") return t("Feriado", "Holiday")
    return t("Normal", "Normal")
  }, [t])

  const timelineSteps: TimelineStep[] = row ? [
    { label: t("Criada", "Created"), date: row.created_at, done: Boolean(row.created_at) },
    { label: t("Agendada", "Scheduled"), date: row.scheduled_for, done: Boolean(row.scheduled_for) },
    {
      label: t("Re-agendada", "Rescheduled"),
      date: row.updated_at,
      done: Number(row.reschedule_count || 0) > 0,
      note: Number(row.reschedule_count || 0) > 0 ? `${row.reschedule_count}x` : undefined,
    },
    {
      label: status === "CANCELADA" ? t("Cancelada", "Cancelled") : t("Concluída", "Completed"),
      date: status === "CANCELADA" ? row.canceled_at : row.completed_at,
      done: status === "CANCELADA" || Boolean(row.completed_at),
    },
  ] : []

  if (authLoading) return null

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("consultations")}>
      <div className="space-y-1.5">

        {loading ? (
          <div className={`${GLASS} px-4 py-6 text-sm text-muted-foreground`}>{t("A carregar…", "Loading…")}</div>
        ) : error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : row ? (
          <>
            {/* Hero */}
            <section className={`relative overflow-hidden ${GLASS}`}>
              <span className={`absolute left-0 top-0 h-full w-1 ${meta.bar}`} />
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white shadow-md ${meta.bar}`}>
                    {initial}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-lg font-bold leading-tight text-foreground">{patient}</h1>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>{meta.label}</span>
                      {overdue ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-200">
                          <Info size={12} /> {t("Atrasada", "Overdue")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{row.custom_id || `#${row.id}`}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("Preço c/ IVA", "Price incl. VAT")}</span>
                  <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700 tabular-nums dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <MoneyValue value={row.price} />
                  </span>
                </div>
              </div>

              {/* Rodapé do cartão — ações à esquerda, voltar no canto inf. direito */}
              <div className="flex flex-wrap items-center gap-1.5 border-t border-white/20 px-4 py-2 pl-5 dark:border-white/10">
                {canEditConsultation ? (
                  <>
                    <Link
                      href={`/consultations/medical-consultations/${id}/edit`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/70 bg-white/50 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-white/70 dark:bg-white/10 dark:hover:bg-white/20"
                    >
                      <Pencil size={13} /> {t("Editar", "Edit")}
                    </Link>
                  </>
                ) : null}
                {canWrite && isOpen ? (
                  <>
                    <button
                      type="button"
                      onClick={openReschedule}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/70 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
                    >
                      <CalendarX2 size={13} /> {t("Re-agendar", "Reschedule")}
                    </button>
                    <ConfirmDialog
                      title={t("Cancelar consulta", "Cancel consultation")}
                      message={t("Cancelar esta consulta?", "Cancel this consultation?")}
                      confirmText={t("Cancelar consulta", "Cancel consultation")}
                      onConfirm={cancelConsultation}
                      disabled={busy}
                    >
                      <button
                        type="button"
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/70 bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
                      >
                        <XCircle size={13} /> {t("Cancelar", "Cancel")}
                      </button>
                    </ConfirmDialog>
                    {busy ? <Loader2 size={14} className="animate-spin text-muted-foreground" /> : null}
                    {actionError ? <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{actionError}</span> : null}
                  </>
                ) : null}

                {/* Voltar — quadrante inferior direito do cartão de nome */}
                <Link
                  href="/consultations"
                  className="group ml-auto inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/40 py-1.5 pl-1.5 pr-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:border-white/40 hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 transition group-hover:-translate-x-0.5 dark:text-indigo-400">
                    <ArrowLeft size={14} />
                  </span>
                  {t("Consultas médicas", "Medical consultations")}
                </Link>
              </div>
            </section>

            {/* Info grid */}
            <div className="grid gap-1.5 md:grid-cols-2">
              {[
                { icon: Stethoscope, label: t("Especialidade", "Specialty"), value: row.specialty_name || row.type || "—" },
                { icon: User, label: t("Médico", "Doctor"), value: row.doctor_name || t("Sem médico atribuído", "No doctor assigned") },
                { icon: CalendarClock, label: t("Agendada para", "Scheduled for"), value: fmtDateTime(row.scheduled_for) },
                { icon: Info, label: t("Horário", "Schedule"), value: scheduleTypeLabel(row.schedule_type) },
              ].map((f, i) => (
                <section key={i} className={`relative overflow-hidden ${GLASS}`}>
                  <span className={`absolute left-0 top-0 h-full w-1 ${meta.bar}`} />
                  <div className="px-3 py-2 pl-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <f.icon size={12} /> {f.label}
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium text-foreground">{f.value}</div>
                  </div>
                </section>
              ))}
            </div>

            {/* Cartões operacionais */}
            <div className="grid gap-1.5 md:grid-cols-2">
              {/* Fatura */}
              <section
                ref={billingRef}
                className={`relative overflow-hidden ${GLASS} ${creditNoteOpen ? "ring-2 ring-amber-400/60" : ""}`}
              >
                <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
                <div className="space-y-2 px-3 py-2.5 pl-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Receipt size={13} /> {t("Faturação", "Billing")}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {row.invoice_code ? (
                      <span className="text-sm font-semibold text-foreground">{row.invoice_code}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">{t("Sem fatura", "No invoice")}</span>
                    )}
                    {row.invoice_status ? (
                      <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{row.invoice_status}</span>
                    ) : null}
                    {row.invoice_origin === "PRO" ? (
                      <span className="rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-400">{t("Proforma", "Proforma")}</span>
                    ) : null}
                  </div>
                  {row.has_pending_credit_note_request ? (
                    <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 dark:border-amber-700/30 dark:bg-amber-900/20">
                      <Info size={12} className="mt-0.5 shrink-0 text-amber-500" />
                      <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">{t("Nota de crédito solicitada — aguardando Contabilidade.", "Credit note requested — awaiting Accounting.")}</p>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {row.invoice_id ? (
                      <Link
                        href="/invoices"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/40 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <FileText size={13} /> {t("Abrir em Faturas", "Open in Invoices")}
                      </Link>
                    ) : null}
                    {canWrite && row.invoice_id && !row.has_pending_credit_note_request && !creditNoteOpen ? (
                      <button
                        type="button"
                        onClick={openCreditNoteRequest}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400"
                      >
                        {t("Solicitar nota de crédito", "Request credit note")}
                      </button>
                    ) : null}
                  </div>

                  {/* Formulário de pedido de nota de crédito (abre automaticamente
                      quando o cancelamento é bloqueado por fatura já emitida). */}
                  {canWrite && creditNoteOpen ? (
                    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 dark:border-amber-700/30 dark:bg-amber-900/20">
                      <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                        {t(
                          "A fatura já foi emitida e não pode ser cancelada. Solicite uma nota de crédito para esta fatura.",
                          "The invoice has been issued and cannot be cancelled. Request a credit note for this invoice.",
                        )}
                      </p>
                      <textarea
                        value={creditNoteReason}
                        onChange={(e) => { setCreditNoteReason(e.target.value); if (creditNoteError) setCreditNoteError(null) }}
                        rows={2}
                        placeholder={t("Motivo (opcional): ex. cobrança em duplicado, valor incorreto…", "Reason (optional): e.g. duplicate charge, wrong amount…")}
                        className="w-full rounded-lg border border-white/40 bg-white/60 px-2.5 py-1.5 text-xs text-foreground shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 dark:border-white/10 dark:bg-white/10"
                      />
                      {creditNoteError ? (
                        <div className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">{creditNoteError}</div>
                      ) : null}
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => { setCreditNoteOpen(false); setCreditNoteReason("") }} disabled={busy} className="inline-flex items-center rounded-lg border border-white/40 bg-white/50 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-white/70 disabled:opacity-50 dark:border-white/10 dark:bg-white/10">
                          {t("Cancelar", "Cancel")}
                        </button>
                        <button type="button" onClick={requestCreditNote} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50">
                          {busy ? <Loader2 size={13} className="animate-spin" /> : null}
                          {busy ? t("A solicitar…", "Requesting…") : t("Solicitar", "Request")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              {row.description ? (
                <section className={`relative overflow-hidden ${GLASS}`}>
                  <span className="absolute left-0 top-0 h-full w-1 bg-slate-400" />
                  <div className="px-3 py-2.5 pl-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Descrição", "Description")}</div>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{row.description}</p>
                  </div>
                </section>
              ) : null}
            </div>

            {/* Cronologia */}
            <section className={`relative overflow-hidden ${GLASS}`}>
              <span className="absolute left-0 top-0 h-full w-1 bg-sky-500" />
              <div className="space-y-1.5 px-3 py-2.5 pl-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <CalendarClock size={13} /> {t("Cronologia", "Timeline")}
                </div>
                <Timeline steps={timelineSteps} />
              </div>
            </section>
          </>
        ) : null}
      </div>

      {/* Modal de re-agendamento */}
      {rescheduleOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => !busy && setRescheduleOpen(false)} />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/20 bg-white/40 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
            <span className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
            <div className="border-b border-white/20 px-4 py-3 pl-5 dark:border-white/10">
              <h3 className="text-sm font-bold text-foreground">{t("Re-agendar consulta", "Reschedule consultation")}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{patient} · {row?.custom_id || `#${row?.id}`}</p>
            </div>
            <div className="space-y-2 px-4 py-3 pl-5">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">{t("Nova data/hora", "New date/time")}</span>
                <input
                  type="datetime-local"
                  value={newScheduledFor}
                  onChange={(e) => { setNewScheduledFor(e.target.value); if (actionError) setActionError(null) }}
                  aria-label={t("Nova data/hora", "New date/time")}
                  className="w-full rounded-lg border border-white/30 bg-white/50 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 dark:border-white/10 dark:bg-white/10"
                />
              </label>
              {actionError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">{actionError}</div>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-white/20 px-4 py-3 dark:border-white/10">
              <button type="button" onClick={() => setRescheduleOpen(false)} disabled={busy} className="inline-flex items-center rounded-lg border border-white/30 bg-white/40 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-white/60 disabled:opacity-50 dark:border-white/10 dark:bg-white/10">
                {t("Cancelar", "Cancel")}
              </button>
              <button type="button" onClick={confirmReschedule} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50">
                {busy ? <Loader2 size={13} className="animate-spin" /> : <CalendarX2 size={13} />}
                {busy ? t("A remarcar…", "Rescheduling…") : t("Confirmar", "Confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  )
}
