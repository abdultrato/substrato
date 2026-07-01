"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import MoneyValue from "@/components/ui/MoneyValue"
import PdfActionLabel from "@/components/ui/PdfActionLabel"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import SearchableSelect from "@/components/ui/SearchableSelect"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import {
  Building2,
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  CalendarX2,
  CheckCircle2,
  FileCheck2,
  FileText,
  Info,
  Loader2,
  Receipt,
  Stethoscope,
  User,
  X,
} from "lucide-react"

type Patient = { id: number; name?: string }
type Doctor = { id: number; name?: string; profession_name?: string; role_name?: string }
type Specialty = {
  id: number
  name?: string
  base_price?: string | number
  active?: boolean
}

type PricePreview = {
  specialty: number
  specialty_name?: string
  base_price?: string
  manual_holiday?: boolean
  is_holiday?: boolean
  schedule_type?: string
  price_multiplier?: string
  price_final?: string
  vat_percentage?: string
  vat_amount?: string
  price_with_vat?: string
  currency?: string
}

type ConsultationRow = {
  id: number
  custom_id?: string
  patient?: number
  patient_name?: string
  doctor?: number | null
  doctor_name?: string
  specialty?: number | null
  specialty_name?: string
  type?: string
  status?: string
  price?: string | number
  schedule_type?: string
  price_multiplier?: string | number
  manual_holiday?: boolean
  scheduled_for?: string
  reschedule_count?: number
  invoice_id?: number | null
  invoice_code?: string
  invoice_status?: string
  invoice_origin?: string
  has_pending_credit_note_request?: boolean
}

type InvoiceIssueMode = "draft" | "issue" | "proforma"

type ConsultationInvoicePreviewItem = {
  key: string
  category: string
  item_type: string
  item_type_label: string
  source: string
  source_code?: string
  description: string
  quantity: string
  unit_price: string
  subtotal: string
  vat_percentage: string
  vat_amount: string
  total: string
  selected: boolean
}

type ConsultationInvoicePreview = {
  consultation_id: number
  consultation_code: string
  patient_name: string
  entry_date: string
  items: ConsultationInvoicePreviewItem[]
  subtotal: string
  vat_amount: string
  total: string
}

type CreateConsultationInvoiceResponse = {
  consultation_id: number
  invoice_id: number
  invoice_code: string
  invoice_status: string
  invoice_origin: string
  total: string
}

const DUE_SOON_MS = 30 * 60 * 1000

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

async function openInvoicePdf(invoiceId: number) {
  const blob = await apiFetch<Blob>(`/invoices/${invoiceId}/pdf/`, { responseType: "blob" })
  const url = window.URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener,noreferrer")
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
}

// ── Design helpers ────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  count,
  onClose,
  children,
}: {
  icon: React.ElementType
  title: string
  count?: number
  onClose?: () => void
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
          <Icon size={13} />
        </span>
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
        {count !== undefined && (
          <span className="ml-auto rounded-full bg-[var(--primary-600)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--primary-700)] dark:text-[var(--primary-400)]">
            {count}
          </span>
        )}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className={`flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground ${count === undefined ? "ml-auto" : ""}`}
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      <div className="p-3">{children}</div>
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConsultationsPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const canWrite = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
  ])
  const canInvoice = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.CONTABILIDADE,
  ])

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nowTick, setNowTick] = useState(() => Date.now())

  const [consultations, setConsultations] = useState<ConsultationRow[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])

  const [scheduleFormOpen, setScheduleFormOpen] = useState(false)
  const [patientId, setPatientId] = useState("")
  const [doctorId, setDoctorId] = useState("")
  const [specialtyId, setSpecialtyId] = useState("")
  const [scheduledForInput, setScheduledForInput] = useState("")
  const [manualHoliday, setManualHoliday] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pricePreview, setPricePreview] = useState<PricePreview | null>(null)
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)
  const [rescheduling, setRescheduling] = useState(false)
  const [consultationToReschedule, setConsultationToReschedule] = useState<ConsultationRow | null>(null)
  const [newScheduledFor, setNewScheduledFor] = useState("")
  const [invoicePdfId, setInvoicePdfId] = useState<number | null>(null)
  const [invoiceReviewOpen, setInvoiceReviewOpen] = useState(false)
  const [invoiceReviewMode, setInvoiceReviewMode] = useState<InvoiceIssueMode>("draft")
  const [invoiceReviewRow, setInvoiceReviewRow] = useState<ConsultationRow | null>(null)
  const [invoicePreview, setInvoicePreview] = useState<ConsultationInvoicePreview | null>(null)
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<Set<string>>(new Set())
  const [invoiceReviewLoading, setInvoiceReviewLoading] = useState<number | null>(null)
  const [invoiceReviewSubmitting, setInvoiceReviewSubmitting] = useState(false)
  const [invoiceReviewError, setInvoiceReviewError] = useState<string | null>(null)
  const [creditNoteModalOpen, setCreditNoteModalOpen] = useState(false)
  const [creditNoteRow, setCreditNoteRow] = useState<ConsultationRow | null>(null)
  const [creditNoteReason, setCreditNoteReason] = useState("")
  const [creditNoteSubmitting, setCreditNoteSubmitting] = useState(false)
  const [creditNoteError, setCreditNoteError] = useState<string | null>(null)

  const localizeErrorMessage = useCallback((message?: string) => {
    const raw = (message || "").trim()
    if (!raw) return t("Ocorreu um erro inesperado.", "An unexpected error occurred.")
    if (/^internal server error$/i.test(raw)) {
      return t("Erro interno do servidor.", "Internal server error.")
    }
    return raw
  }, [t])

  const loadData = useCallback(async () => {
    const [consultationsResponse, patientsResponse, doctorsResponse, specialtiesResponse] = await Promise.all([
      apiFetch<any>("/consultations/", { clientCache: safeRefreshToken === 0 }),
      apiFetch<any>("/clinical/patients/", { clientCache: safeRefreshToken === 0 }),
      apiFetch<any>("/consultations/doctors/", { clientCache: safeRefreshToken === 0 }),
      apiFetch<any>("/consultations/specialty/", { clientCache: safeRefreshToken === 0 }),
    ])

    const list = (v: any) => (v && v.results ? v.results : v) || []

    setConsultations(Array.isArray(list(consultationsResponse)) ? list(consultationsResponse) : [])
    setPatients(Array.isArray(list(patientsResponse)) ? list(patientsResponse) : [])
    setDoctors(Array.isArray(list(doctorsResponse)) ? list(doctorsResponse) : [])
    const specialtyItems = Array.isArray(list(specialtiesResponse)) ? (list(specialtiesResponse) as Specialty[]) : []
    setSpecialties(specialtyItems)
    setSpecialtyId((prev) => prev || (specialtyItems[0]?.id ? String(specialtyItems[0].id) : ""))
  }, [safeRefreshToken])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErrorMessage(null)
        await loadData()
        if (!mounted) return
      } catch (e: any) {
        if (!mounted) return
        setErrorMessage(
          isNotFoundLikeError(e)
            ? null
            : localizeErrorMessage(e?.message) || t("Falha ao carregar consultas.", "Failed to load consultations.")
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [loadData, localizeErrorMessage, t])

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30 * 1000)
    return () => clearInterval(id)
  }, [])

  async function createConsultation(e: any) {
    e.preventDefault()
    if (!canWrite) return

    setFormError(null)
    if (!patientId) {
      setFormError(t("Selecione um paciente.", "Select a patient."))
      return
    }
    if (!specialtyId) {
      setFormError(t("Selecione uma especialidade.", "Select a specialty."))
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        patient: Number(patientId),
        specialty: Number(specialtyId),
      }

      if (doctorId) payload.doctor = Number(doctorId)

      if (scheduledForInput) {
        const d = new Date(scheduledForInput)
        payload.scheduled_for = Number.isNaN(d.getTime()) ? scheduledForInput : d.toISOString()
      }

      if (manualHoliday) payload.manual_holiday = true

      await apiFetch("/consultations/", {
        method: "POST",
        body: JSON.stringify(payload),
      })

      setPatientId("")
      setDoctorId("")
      setSpecialtyId("")
      setScheduledForInput("")
      setManualHoliday(false)
      setPricePreview(null)
      setFormError(null)

      await loadData()
    } catch (e: any) {
      setFormError(localizeErrorMessage(e?.message) || t("Falha ao marcar consulta.", "Failed to schedule consultation."))
    } finally {
      setSaving(false)
    }
  }

  const cancelConsultation = useCallback(async (consultationId: number) => {
    if (!canWrite) return
    try {
      setErrorMessage(null)
      await apiFetch(`/consultations/${consultationId}/cancel/`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      await loadData()
    } catch (e: any) {
      setErrorMessage(localizeErrorMessage(e?.message) || t("Falha ao cancelar consulta.", "Failed to cancel consultation."))
    }
  }, [canWrite, loadData, localizeErrorMessage, t])

  const cancelCreditNoteRequest = useCallback(async (consultationId: number) => {
    if (!canWrite) return
    try {
      setErrorMessage(null)
      await apiFetch(`/consultations/${consultationId}/cancel-credit-note-request/`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      await loadData()
    } catch (e: any) {
      setErrorMessage(localizeErrorMessage(e?.message) || t("Falha ao cancelar pedido de nota de crédito.", "Failed to cancel credit note request."))
    }
  }, [canWrite, loadData, localizeErrorMessage, t])

  const completeConsultation = useCallback(async (consultationId: number) => {
    if (!canWrite) return
    try {
      setErrorMessage(null)
      await apiFetch(`/consultations/${consultationId}/complete/`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      await loadData()
    } catch (e: any) {
      setErrorMessage(localizeErrorMessage(e?.message) || t("Falha ao concluir consulta.", "Failed to complete consultation."))
    }
  }, [canWrite, loadData, localizeErrorMessage, t])

  const closeRescheduleModal = useCallback(() => {
    if (rescheduling) return
    setRescheduleModalOpen(false)
    setConsultationToReschedule(null)
    setNewScheduledFor("")
    setRescheduleError(null)
  }, [rescheduling])

  const openRescheduleModal = useCallback(async (row: ConsultationRow) => {
    if (!canWrite) return
    const current = row.scheduled_for ? new Date(row.scheduled_for) : null
    const defaultValue = current && !Number.isNaN(current.getTime())
      ? current.toISOString().slice(0, 16)
      : ""
    setConsultationToReschedule(row)
    setNewScheduledFor(defaultValue)
    setRescheduleError(null)
    setRescheduleModalOpen(true)
  }, [canWrite])

  const confirmReschedule = useCallback(async () => {
    if (!consultationToReschedule?.id) return
    setRescheduleError(null)
    if (!newScheduledFor.trim()) {
      setRescheduleError(t("Informe a nova data/hora da consulta.", "Provide the new consultation date/time."))
      return
    }
    const d = new Date(newScheduledFor)
    const value = Number.isNaN(d.getTime()) ? newScheduledFor : d.toISOString()

    setRescheduling(true)
    try {
      await apiFetch(`/consultations/${consultationToReschedule.id}/reschedule/`, {
        method: "POST",
        body: JSON.stringify({ scheduled_for: value }),
      })
      setRescheduleModalOpen(false)
      setConsultationToReschedule(null)
      setNewScheduledFor("")
      setRescheduleError(null)
      await loadData()
    } catch (e: any) {
      setRescheduleError(localizeErrorMessage(e?.message) || t("Falha ao remarcar consulta.", "Failed to reschedule consultation."))
    } finally {
      setRescheduling(false)
    }
  }, [loadData, consultationToReschedule?.id, localizeErrorMessage, newScheduledFor, t])

  const openCreditNoteModal = useCallback((row: ConsultationRow) => {
    setCreditNoteRow(row)
    setCreditNoteReason("")
    setCreditNoteError(null)
    setCreditNoteModalOpen(true)
  }, [])

  const closeCreditNoteModal = useCallback(() => {
    if (creditNoteSubmitting) return
    setCreditNoteModalOpen(false)
    setCreditNoteRow(null)
    setCreditNoteReason("")
    setCreditNoteError(null)
  }, [creditNoteSubmitting])

  const confirmCreditNote = useCallback(async () => {
    if (!creditNoteRow?.id) return
    setCreditNoteSubmitting(true)
    setCreditNoteError(null)
    try {
      await apiFetch(`/consultations/${creditNoteRow.id}/request-credit-note/`, {
        method: "POST",
        body: JSON.stringify({ reason: creditNoteReason.trim() }),
      })
      setCreditNoteModalOpen(false)
      setCreditNoteRow(null)
      setCreditNoteReason("")
      setErrorMessage(null)
      await loadData()
    } catch (e: any) {
      setCreditNoteError(localizeErrorMessage(e?.message) || t("Falha ao solicitar nota de crédito.", "Failed to request credit note."))
    } finally {
      setCreditNoteSubmitting(false)
    }
  }, [creditNoteRow?.id, creditNoteReason, loadData, localizeErrorMessage, t])

  const openConsultationInvoicePdf = useCallback(async (invoiceId: number) => {
    if (invoicePdfId === invoiceId) return
    try {
      setInvoicePdfId(invoiceId)
      setErrorMessage(null)
      await openInvoicePdf(invoiceId)
    } catch (e: any) {
      setErrorMessage(localizeErrorMessage(e?.message) || t("Falha ao gerar PDF da fatura.", "Failed to generate invoice PDF."))
    } finally {
      setInvoicePdfId(null)
    }
  }, [invoicePdfId, localizeErrorMessage, t])

  const openInvoiceReview = useCallback(async (row: ConsultationRow, mode: InvoiceIssueMode) => {
    if (!canInvoice) return
    if (invoiceReviewLoading === row.id) return
    try {
      setInvoiceReviewLoading(row.id)
      setInvoiceReviewError(null)
      setInvoiceReviewMode(mode)
      setInvoiceReviewRow(row)
      const preview = await apiFetch<ConsultationInvoicePreview>(`/consultations/${row.id}/invoice-preview/`, {
        clientCache: false,
      })
      const initiallySelected = new Set(
        (preview.items || [])
          .filter((item) => item.selected !== false)
          .map((item) => item.key)
      )
      setInvoicePreview(preview)
      setSelectedInvoiceItems(initiallySelected)
      setInvoiceReviewOpen(true)
    } catch (e: any) {
      setErrorMessage(localizeErrorMessage(e?.message) || t("Falha ao preparar a fatura.", "Failed to prepare invoice."))
    } finally {
      setInvoiceReviewLoading(null)
    }
  }, [canInvoice, invoiceReviewLoading, localizeErrorMessage, t])

  const closeInvoiceReview = useCallback(() => {
    if (invoiceReviewSubmitting) return
    setInvoiceReviewOpen(false)
    setInvoiceReviewMode("draft")
    setInvoiceReviewRow(null)
    setInvoicePreview(null)
    setSelectedInvoiceItems(new Set())
    setInvoiceReviewError(null)
  }, [invoiceReviewSubmitting])

  const toggleInvoicePreviewItem = useCallback((key: string, checked: boolean) => {
    setSelectedInvoiceItems((prev) => {
      const next = new Set(prev)
      if (checked) { next.add(key) } else { next.delete(key) }
      return next
    })
    setInvoiceReviewError(null)
  }, [])

  const invoiceReviewTotals = useMemo(() => {
    const selected = invoicePreview?.items.filter((item) => selectedInvoiceItems.has(item.key)) || []
    const sum = (field: "subtotal" | "vat_amount" | "total") =>
      selected.reduce((acc, item) => acc + Number.parseFloat(String(item[field] || "0")), 0).toFixed(2)
    return {
      count: selected.length,
      subtotal: sum("subtotal"),
      vat_amount: sum("vat_amount"),
      total: sum("total"),
    }
  }, [invoicePreview?.items, selectedInvoiceItems])

  const confirmInvoiceReview = useCallback(async () => {
    if (!invoiceReviewRow?.id) return
    const selectedItems = Array.from(selectedInvoiceItems)
    if (!selectedItems.length) {
      setInvoiceReviewError(t("Selecione pelo menos um item para a fatura.", "Select at least one item for the invoice."))
      return
    }

    setInvoiceReviewSubmitting(true)
    setInvoiceReviewError(null)
    try {
      const result = await apiFetch<CreateConsultationInvoiceResponse>(`/consultations/${invoiceReviewRow.id}/create-invoice/`, {
        method: "POST",
        body: JSON.stringify({
          invoice_type: invoiceReviewMode,
          issue: invoiceReviewMode === "issue",
          selected_items: selectedItems,
        }),
      })
      setConsultations((prev) => prev.map((row) => (
        row.id === invoiceReviewRow.id
          ? {
              ...row,
              invoice_id: result.invoice_id,
              invoice_code: result.invoice_code,
              invoice_status: result.invoice_status,
              invoice_origin: result.invoice_origin,
            }
          : row
      )))
      closeInvoiceReview()
      await loadData()
    } catch (e: any) {
      setInvoiceReviewError(localizeErrorMessage(e?.message) || t("Falha ao emitir fatura.", "Failed to issue invoice."))
    } finally {
      setInvoiceReviewSubmitting(false)
    }
  }, [
    closeInvoiceReview,
    invoiceReviewMode,
    invoiceReviewRow?.id,
    loadData,
    localizeErrorMessage,
    selectedInvoiceItems,
    t,
  ])

  const patientOptions = useMemo(
    () => patients.map((p) => ({ value: String(p.id), label: p.name || `${t("Paciente", "Patient")} ${p.id}` })),
    [patients, t]
  )

  const doctorOptions = useMemo(
    () =>
      doctors.map((m) => ({
        value: String(m.id),
        label: m.name || `${t("Médico", "Doctor")} ${m.id}`,
        hint: m.role_name || m.profession_name || undefined,
      })),
    [doctors, t]
  )

  const specialtyOptions = useMemo(
    () =>
      specialties
        .filter((x) => x.active !== false)
        .map((esp) => ({ value: String(esp.id), label: esp.name || `${t("Especialidade", "Specialty")} ${esp.id}` })),
    [specialties, t]
  )

  const setScheduledNow = useCallback(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    setScheduledForInput(now.toISOString().slice(0, 16))
  }, [])

  const isDueSoon = useCallback((c: ConsultationRow) => {
    if (!c.scheduled_for) return true
    const ts = new Date(c.scheduled_for).getTime()
    if (Number.isNaN(ts)) return true
    return ts <= nowTick + DUE_SOON_MS
  }, [nowTick])

  const isRescheduled = (c: ConsultationRow) => Boolean(c.reschedule_count && c.reschedule_count > 0)

  const markedConsultations = useMemo(
    () => consultations.filter((c) => c.status === "MARCADA" && isDueSoon(c)),
    [consultations, isDueSoon]
  )
  const scheduledConsultations = useMemo(
    () => consultations.filter((c) => c.status === "MARCADA" && !isRescheduled(c) && !isDueSoon(c)),
    [consultations, isDueSoon]
  )
  const rescheduledConsultations = useMemo(
    () => consultations.filter((c) => c.status === "MARCADA" && isRescheduled(c) && !isDueSoon(c)),
    [consultations, isDueSoon]
  )
  const completedConsultations = useMemo(
    () => consultations.filter((c) => c.status === "CONCLUIDA"),
    [consultations]
  )

  const formatScheduleTypeLabel = useCallback((value?: string) => {
    if (value === "FIM_SEMANA") return t("Fim de semana", "Weekend")
    if (value === "FORA_EXPEDIENTE") return t("Fora de expediente", "After hours")
    if (value === "FERIADO_MANUAL") return t("Feriado", "Holiday")
    return t("Normal", "Normal")
  }, [t])

  const renderConsultationCard = useCallback((r: ConsultationRow) => {
    const isProformaInvoice = r.invoice_origin === "PRO"
    const invoiceIssued = r.invoice_status === "EMIT" || r.invoice_status === "PAGA"
    const canPrepareInvoice = canInvoice && r.status !== "CANCELADA" && !isProformaInvoice && (!r.invoice_status || r.invoice_status === "RASC")
    const canReviewProformaInvoice = canInvoice && r.status !== "CANCELADA" && isProformaInvoice && r.invoice_status === "RASC"
    const hasPendingCreditNote = Boolean(r.has_pending_credit_note_request)
    const canRequestCreditNote = canWrite && (r.status === "CONCLUIDA" || invoiceIssued) && !hasPendingCreditNote
    const loadingReview = invoiceReviewLoading === r.id

    return (
      <div key={r.id} className="rounded-xl border border-border/60 p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{r.patient_name || "-"}</div>
            <div className="text-[11px] text-muted-foreground">{r.custom_id || r.id}</div>
          </div>
          <span className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400">
            <MoneyValue value={r.price} />
          </span>
        </div>

        <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">{r.specialty_name || r.type || "-"}</div>
          <div>{r.doctor_name ? `${t("Médico", "Doctor")}: ${r.doctor_name}` : t("Sem médico atribuído", "No doctor assigned")}</div>
          <div>{t("Data", "Date")}: {fmtDate(r.scheduled_for)}</div>
          <div>{t("Horário", "Schedule")}: {formatScheduleTypeLabel(r.schedule_type)}</div>
        </div>

        {/* Invoice info */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2">
          {r.invoice_code ? (
            <span className="text-[11px] font-semibold text-foreground">{r.invoice_code}</span>
          ) : (
            <span className="text-[11px] text-muted-foreground">{t("Sem fatura", "No invoice")}</span>
          )}
          {r.invoice_status ? (
            <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {r.invoice_status}
            </span>
          ) : null}
          {isProformaInvoice ? (
            <span className="rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-400">
              {t("Proforma", "Proforma")}
            </span>
          ) : null}
        </div>

        {/* Invoice actions */}
        {canPrepareInvoice ? (
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => openInvoiceReview(r, "draft")}
              disabled={loadingReview}
              className="flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              <FileText size={11} />
              {r.invoice_id ? t("Rever rascunho", "Review draft") : t("Rascunho", "Draft")}
            </button>
            <button
              type="button"
              onClick={() => openInvoiceReview(r, "issue")}
              disabled={loadingReview}
              className="flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400"
            >
              <Receipt size={11} />
              {t("Original", "Issue")}
            </button>
          </div>
        ) : null}
        {canReviewProformaInvoice ? (
          <button
            type="button"
            onClick={() => openInvoiceReview(r, "proforma")}
            disabled={loadingReview}
            className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1.5 text-[11px] font-semibold text-violet-800 transition hover:bg-violet-100 disabled:opacity-50 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-400"
          >
            <FileText size={11} />
            {t("Rever proforma", "Review proforma")}
          </button>
        ) : null}
        {r.invoice_id ? (
          <button
            type="button"
            onClick={() => openConsultationInvoicePdf(Number(r.invoice_id))}
            disabled={invoicePdfId === Number(r.invoice_id)}
            className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
          >
            <PdfActionLabel loading={invoicePdfId === Number(r.invoice_id)} loadingLabel={t("PDF...", "PDF...")}>
              {t("PDF Fatura", "Invoice PDF")}
            </PdfActionLabel>
          </button>
        ) : null}

        {/* Credit note */}
        {hasPendingCreditNote ? (
          <div className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 dark:border-amber-700/30 dark:bg-amber-900/20">
            <Info size={11} className="mt-0.5 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">{t("Nota de crédito solicitada", "Credit note requested")}</p>
              <p className="text-[10px] text-amber-700 dark:text-amber-500">{t("Aguardando Contabilidade.", "Awaiting Accounting.")}</p>
            </div>
          </div>
        ) : canRequestCreditNote ? (
          <button
            type="button"
            onClick={() => openCreditNoteModal(r)}
            className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400"
          >
            {t("Solicitar nota de crédito", "Request credit note")}
          </button>
        ) : null}

        {/* Cancel / reschedule */}
        {canWrite && (r.status === "MARCADA" || (r.status !== "CANCELADA" && r.status !== "CONCLUIDA" && r.status !== "PAGA")) ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5 border-t border-border/40 pt-1.5">
            <button
              type="button"
              onClick={() => openRescheduleModal(r)}
              className="inline-flex items-center rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground transition hover:bg-muted"
            >
              {t("Remarcar", "Reschedule")}
            </button>
            <ConfirmDialog
              title={t("Cancelar consulta", "Cancel consultation")}
              message={t("Cancelar esta consulta?", "Cancel this consultation?")}
              confirmText={t("Cancelar consulta", "Cancel consultation")}
              onConfirm={() => cancelConsultation(r.id)}
            >
              <button
                type="button"
                className="inline-flex items-center rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-50 dark:bg-red-900/10 dark:text-red-400"
              >
                {t("Cancelar", "Cancel")}
              </button>
            </ConfirmDialog>
          </div>
        ) : canWrite && r.status === "PAGA" && hasPendingCreditNote ? (
          <div className="mt-1.5 border-t border-border/40 pt-1.5">
            <ConfirmDialog
              title={t("Cancelar nota de crédito solicitada", "Cancel credit note request")}
              message={t("Cancelar o pedido de nota de crédito pendente?", "Cancel the pending credit note request?")}
              confirmText={t("Cancelar pedido", "Cancel request")}
              danger
              onConfirm={() => cancelCreditNoteRequest(r.id)}
            >
              <button
                type="button"
                className="inline-flex items-center rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-50 dark:bg-red-900/10 dark:text-red-400"
              >
                {t("Cancelar nota de crédito", "Cancel credit note")}
              </button>
            </ConfirmDialog>
          </div>
        ) : null}
      </div>
    )
  }, [
    canInvoice,
    canWrite,
    cancelConsultation,
    cancelCreditNoteRequest,
    completeConsultation,
    formatScheduleTypeLabel,
    invoicePdfId,
    invoiceReviewLoading,
    openConsultationInvoicePdf,
    openCreditNoteModal,
    openInvoiceReview,
    openRescheduleModal,
    t,
  ])

  const renderConsultationColumn = useCallback((
    title: string,
    rows: ConsultationRow[],
    Icon: React.ElementType,
  ) => (
    <SectionCard icon={Icon} title={title} count={rows.length}>
      {loading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-white/20 bg-white/30 dark:bg-white/5" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
          {t("Nenhuma consulta.", "No consultations.")}
        </div>
      ) : (
        <div className="max-h-[calc(100vh-15rem)] space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
          {rows.map(renderConsultationCard)}
        </div>
      )}
    </SectionCard>
  ), [loading, renderConsultationCard, t])

  useEffect(() => {
    let mounted = true
    async function loadPreview() {
      if (!specialtyId) {
        if (mounted) setPricePreview(null)
        return
      }

      try {
        const params = new URLSearchParams()
        params.set("specialty", String(specialtyId))
        if (scheduledForInput) {
          const d = new Date(scheduledForInput)
          const value = Number.isNaN(d.getTime()) ? scheduledForInput : d.toISOString()
          params.set("scheduled_for", value)
        }
        if (manualHoliday) params.set("manual_holiday", "true")
        const res = await apiFetch<PricePreview>(`/consultations/consultation/price/?${params.toString()}`)
        if (mounted) setPricePreview(res || null)
      } catch {
        if (mounted) setPricePreview(null)
      }
    }

    loadPreview()
    return () => { mounted = false }
  }, [specialtyId, scheduledForInput, manualHoliday])

  return (
    <AppLayout
      requiredGroups={[
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.MEDICINA,
        GROUPS.MEDICINA_OCUPACIONAL,
        GROUPS.CONTABILIDADE,
      ]}
    >
      <div className="space-y-1.5">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <h1 className="text-lg font-bold text-foreground">{t("Consultas", "Consultations")}</h1>
          <p className="text-[11px] text-muted-foreground">{t("Gestão do fluxo de consultas médicas", "Medical consultation flow management")}</p>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {/* Form — colapsado: só o botão; ao clicar, abre o cartão completo */}
        {canWrite && !scheduleFormOpen ? (
          <button
            type="button"
            onClick={() => setScheduleFormOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700"
          >
            <CalendarPlus size={13} />
            {t("Marcar consulta", "Schedule consultation")}
          </button>
        ) : null}

        {/* Form */}
        {canWrite && scheduleFormOpen ? (
          <SectionCard
            icon={CalendarPlus}
            title={t("Marcar consulta", "Schedule consultation")}
            onClose={() => setScheduleFormOpen(false)}
          >
            {formError ? (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
                {formError}
              </div>
            ) : null}
            <form onSubmit={createConsultation} className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">{t("Paciente", "Patient")}</label>
                  <SearchableSelect
                    value={patientId}
                    onChange={setPatientId}
                    options={patientOptions}
                    placeholder={t("Pesquisar...", "Search...")}
                    searchPlaceholder={t("Pesquisar paciente...", "Search patient...")}
                    emptyMessage={t("Nenhum paciente.", "No patient.")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">{t("Médico", "Doctor")}</label>
                  <SearchableSelect
                    value={doctorId}
                    onChange={setDoctorId}
                    options={doctorOptions}
                    allowClear
                    placeholder={t("Opcional", "Optional")}
                    searchPlaceholder={t("Pesquisar médico...", "Search doctor...")}
                    emptyMessage={t("Nenhum médico.", "No doctor.")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">{t("Especialidade", "Specialty")}</label>
                  <SearchableSelect
                    value={specialtyId}
                    onChange={setSpecialtyId}
                    options={specialtyOptions}
                    placeholder={t("Selecione", "Select")}
                    searchPlaceholder={t("Pesquisar...", "Search...")}
                    emptyMessage={t("Nenhuma especialidade.", "No specialty.")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    {t("Preço c/ IVA", "Price incl. VAT")}
                    {pricePreview?.manual_holiday ? (
                      <span className="ml-1.5 text-amber-600 dark:text-amber-400">· {t("Feriado", "Holiday")}</span>
                    ) : null}
                  </label>
                  <input
                    value={pricePreview?.price_with_vat || ""}
                    readOnly
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground"
                    placeholder="—"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="datetime-local"
                  value={scheduledForInput}
                  onChange={(e) => setScheduledForInput(e.target.value)}
                  className="min-w-[11rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
                />
                <button
                  type="button"
                  onClick={setScheduledNow}
                  className="shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
                >
                  {t("Agora", "Now")}
                </button>
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-violet-400">
                  <input
                    type="checkbox"
                    checked={manualHoliday}
                    onChange={(e) => setManualHoliday(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border accent-violet-600"
                  />
                  {t("Feriado", "Holiday")}
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <CalendarPlus size={12} />}
                  {saving ? t("A marcar...", "Scheduling...") : t("Marcar", "Schedule")}
                </button>
              </div>
            </form>
          </SectionCard>
        ) : null}

        {!canWrite ? (
          <SectionCard icon={Building2} title={t("Modo leitura", "Read-only mode")}>
            <p className="text-sm text-muted-foreground">
              {t(
                "Contabilidade pode visualizar, mas não pode criar ou editar consultas.",
                "Accounting can view, but cannot create or edit consultations."
              )}
            </p>
          </SectionCard>
        ) : null}

        {/* Columns */}
        <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-4">
          {renderConsultationColumn(t("Marcadas", "Walk-in"), markedConsultations, CalendarCheck2)}
          {renderConsultationColumn(t("Agendadas", "Scheduled"), scheduledConsultations, CalendarClock)}
          {renderConsultationColumn(t("Re-agendadas", "Rescheduled"), rescheduledConsultations, CalendarX2)}
          {renderConsultationColumn(t("Realizadas", "Completed"), completedConsultations, CheckCircle2)}
        </div>
      </div>

      {/* Reschedule modal */}
      {rescheduleModalOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={closeRescheduleModal} />
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--text)]">{t("Remarcar consulta", "Reschedule consultation")}</h3>
              <p className="mt-1 text-xs text-[var(--gray-600)]">{t("Atualize a data e hora da consulta selecionada.", "Update the date and time of the selected consultation.")}</p>
            </div>
            <div className="space-y-3 px-4 py-4">
              <div className="text-xs text-[var(--gray-600)]">
                {t("Consulta:", "Consultation:")}{" "}
                <span className="font-semibold text-[var(--text)]">{consultationToReschedule?.custom_id || consultationToReschedule?.id || "-"}</span>
                {" · "}
                {t("Paciente:", "Patient:")}{" "}
                <span className="font-semibold text-[var(--text)]">{consultationToReschedule?.patient_name || "-"}</span>
              </div>
              <label className="space-y-1">
                <span className="text-xs text-[var(--gray-600)]">{t("Nova data/hora", "New date/time")}</span>
                <input
                  type="datetime-local"
                  value={newScheduledFor}
                  onChange={(e) => { setNewScheduledFor(e.target.value); if (rescheduleError) setRescheduleError(null) }}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
                  autoFocus
                />
              </label>
              {rescheduleError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{rescheduleError}</div>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
              <button type="button" onClick={closeRescheduleModal} disabled={rescheduling} className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60">
                {t("Cancelar", "Cancel")}
              </button>
              <button type="button" onClick={confirmReschedule} disabled={rescheduling} className="inline-flex items-center rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60">
                {rescheduling ? t("Atualizando...", "Updating...") : t("Atualizar data/hora", "Update date/time")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Credit note modal */}
      {creditNoteModalOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={closeCreditNoteModal} />
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--text)]">{t("Solicitar nota de crédito", "Request credit note")}</h3>
              <p className="mt-1 text-xs text-[var(--gray-600)]">{t("O pedido vai para a fila da Contabilidade, que aprova ou rejeita.", "The request goes to the Accounting queue, which approves or rejects it.")}</p>
            </div>
            <div className="space-y-3 px-4 py-4">
              <div className="text-xs text-[var(--gray-600)]">
                {t("Fatura:", "Invoice:")}{" "}
                <span className="font-semibold text-[var(--text)]">{creditNoteRow?.invoice_code || "-"}</span>
                {" · "}
                {t("Paciente:", "Patient:")}{" "}
                <span className="font-semibold text-[var(--text)]">{creditNoteRow?.patient_name || "-"}</span>
              </div>
              <label className="space-y-1">
                <span className="text-xs text-[var(--gray-600)]">{t("Motivo (opcional)", "Reason (optional)")}</span>
                <textarea
                  value={creditNoteReason}
                  onChange={(e) => { setCreditNoteReason(e.target.value); if (creditNoteError) setCreditNoteError(null) }}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
                  placeholder={t("Ex.: cobrança em duplicado, valor incorreto...", "E.g.: duplicate charge, wrong amount...")}
                  autoFocus
                />
              </label>
              {creditNoteError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{creditNoteError}</div>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
              <button type="button" onClick={closeCreditNoteModal} disabled={creditNoteSubmitting} className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60">
                {t("Cancelar", "Cancel")}
              </button>
              <button type="button" onClick={confirmCreditNote} disabled={creditNoteSubmitting} className="inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60">
                {creditNoteSubmitting ? t("A solicitar...", "Requesting...") : t("Solicitar", "Request")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Invoice review modal */}
      {invoiceReviewOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={closeInvoiceReview} />
          <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">
                    {invoiceReviewMode === "issue"
                      ? t("Conferir fatura original", "Review original invoice")
                      : invoiceReviewMode === "proforma"
                        ? t("Conferir fatura proforma", "Review proforma invoice")
                        : t("Conferir rascunho de fatura", "Review draft invoice")}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--gray-600)]">
                    {t("Confirme os itens da entrada antes de gravar o documento.", "Confirm the encounter items before saving the document.")}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground">{invoicePreview?.consultation_code || invoiceReviewRow?.custom_id || invoiceReviewRow?.id || "-"}</div>
                  <div>{invoicePreview?.patient_name || invoiceReviewRow?.patient_name || "-"}</div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {invoiceReviewError ? (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{invoiceReviewError}</div>
              ) : null}

              <div className="mb-3 grid gap-2 text-sm md:grid-cols-4">
                {[
                  { label: t("Data da entrada", "Encounter date"), value: invoicePreview?.entry_date || "-" },
                  { label: t("Itens selecionados", "Selected items"), value: invoiceReviewTotals.count },
                  { label: t("IVA", "VAT"), value: <MoneyValue value={invoiceReviewTotals.vat_amount} /> },
                  { label: t("Total", "Total"), value: <MoneyValue value={invoiceReviewTotals.total} />, bold: true },
                ].map((item, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card px-3 py-2">
                    <div className="text-[11px] font-semibold text-muted-foreground">{item.label}</div>
                    <div className={item.bold ? "font-semibold text-foreground" : "text-foreground"}>{item.value}</div>
                  </div>
                ))}
              </div>

              {invoicePreview?.items?.length ? (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted text-xs font-semibold text-muted-foreground">
                      <tr>
                        <th className="w-12 px-3 py-2 text-left">{t("Incluir", "Include")}</th>
                        <th className="px-3 py-2 text-left">{t("Categoria", "Category")}</th>
                        <th className="px-3 py-2 text-left">{t("Origem", "Source")}</th>
                        <th className="px-3 py-2 text-left">{t("Descrição", "Description")}</th>
                        <th className="px-3 py-2 text-right">{t("Qtd", "Qty")}</th>
                        <th className="px-3 py-2 text-right">{t("Preço", "Price")}</th>
                        <th className="px-3 py-2 text-right">{t("IVA", "VAT")}</th>
                        <th className="px-3 py-2 text-right">{t("Total", "Total")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {invoicePreview.items.map((item) => {
                        const checked = selectedInvoiceItems.has(item.key)
                        return (
                          <tr key={item.key} className={checked ? "bg-card" : "bg-muted/40 text-muted-foreground"}>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => toggleInvoicePreviewItem(item.key, e.target.checked)}
                                className="h-4 w-4 rounded border-border accent-violet-600"
                                aria-label={`${t("Incluir", "Include")} ${item.description}`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div>{item.source}</div>
                              {item.source_code ? <div className="text-[11px] text-muted-foreground">{item.source_code}</div> : null}
                            </td>
                            <td className="min-w-[220px] px-3 py-2">
                              <div className="font-medium text-foreground">{item.description}</div>
                              <div className="text-[11px] text-muted-foreground">{item.item_type_label}</div>
                            </td>
                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-right"><MoneyValue value={item.unit_price} /></td>
                            <td className="px-3 py-2 text-right"><MoneyValue value={item.vat_amount} /></td>
                            <td className="px-3 py-2 text-right font-semibold"><MoneyValue value={item.total} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                  {t("Não há itens faturáveis para esta entrada.", "There are no billable items for this encounter.")}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-foreground">
                <span className="font-semibold">{t("Total selecionado:", "Selected total:")}</span>{" "}
                <MoneyValue value={invoiceReviewTotals.total} />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button type="button" onClick={() => { setSelectedInvoiceItems(new Set(invoicePreview?.items.map((item) => item.key) || [])); setInvoiceReviewError(null) }} disabled={invoiceReviewSubmitting || !invoicePreview?.items?.length} className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-60">
                  {t("Selecionar todos", "Select all")}
                </button>
                <button type="button" onClick={() => { setSelectedInvoiceItems(new Set()); setInvoiceReviewError(null) }} disabled={invoiceReviewSubmitting || !invoicePreview?.items?.length} className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-60">
                  {t("Limpar seleção", "Clear selection")}
                </button>
                <button type="button" onClick={closeInvoiceReview} disabled={invoiceReviewSubmitting} className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-60">
                  {t("Cancelar", "Cancel")}
                </button>
                <button type="button" onClick={confirmInvoiceReview} disabled={invoiceReviewSubmitting || invoiceReviewTotals.count === 0} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60">
                  <FileCheck2 size={13} />
                  {invoiceReviewSubmitting
                    ? t("A gravar...", "Saving...")
                    : invoiceReviewMode === "issue"
                      ? t("Emitir original", "Issue original")
                      : invoiceReviewMode === "proforma"
                        ? t("Gravar proforma", "Save proforma")
                        : t("Emitir rascunho", "Issue draft")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  )
}
