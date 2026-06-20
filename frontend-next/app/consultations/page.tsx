"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MoneyValue from "@/components/ui/MoneyValue"
import PdfActionLabel from "@/components/ui/PdfActionLabel"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import SearchableSelect from "@/components/ui/SearchableSelect"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { CalendarPlus, FileCheck2, FileText, Info, Loader2, Receipt } from "lucide-react"

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

// Quando faltam <= 30 min para o atendimento (ou já passou da hora), a consulta
// deixa de estar "agendada/re-agendada" e passa para "marcadas".
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
  // "Relógio" que avança periodicamente para reclassificar consultas cujo
  // horário entra na janela de 30 min (sem precisar recarregar a página).
  const [nowTick, setNowTick] = useState(() => Date.now())

  const [consultations, setConsultations] = useState<ConsultationRow[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])

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
    return () => {
      mounted = false
    }
  }, [loadData, localizeErrorMessage, t])

  // Avança o relógio a cada 30s para reavaliar a janela dos 30 min e mover
  // consultas de "Agendada/Re-Agendada" para "Marcadas" quando a hora chega.
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
      ? current.toISOString().slice(0, 16) // yyyy-mm-ddThh:mm
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
      if (checked) {
        next.add(key)
      } else {
        next.delete(key)
      }
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
    if (!c.scheduled_for) return true // sem hora = atendimento imediato (marcada)
    const ts = new Date(c.scheduled_for).getTime()
    if (Number.isNaN(ts)) return true
    return ts <= nowTick + DUE_SOON_MS
  }, [nowTick])

  const isRescheduled = (c: ConsultationRow) => Boolean(c.reschedule_count && c.reschedule_count > 0)

  // Marcada = atendimento imediato OU já dentro da janela de 30 min (inclui
  // agendadas/re-agendadas cujo horário está a chegar).
  const markedConsultations = useMemo(
    () => consultations.filter((c) => c.status === "MARCADA" && isDueSoon(c)),
    [consultations, isDueSoon]
  )
  // Agendada = marcada para data/hora futura (a mais de 30 min) e não remarcada.
  const scheduledConsultations = useMemo(
    () => consultations.filter((c) => c.status === "MARCADA" && !isRescheduled(c) && !isDueSoon(c)),
    [consultations, isDueSoon]
  )
  // Re-agendada = remarcada e ainda a mais de 30 min do atendimento.
  const rescheduledConsultations = useMemo(
    () => consultations.filter((c) => c.status === "MARCADA" && isRescheduled(c) && !isDueSoon(c)),
    [consultations, isDueSoon]
  )
  // Realizada = consulta concluída.
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
    // Nota de crédito: só após a fatura original (emitir original OU concluir, que emite a original).
    const hasPendingCreditNote = Boolean(r.has_pending_credit_note_request)
    const canRequestCreditNote = canWrite && (r.status === "CONCLUIDA" || invoiceIssued) && !hasPendingCreditNote
    const loadingReview = invoiceReviewLoading === r.id
    return (
      <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">{r.patient_name || "-"}</div>
            <div className="text-[11px] text-slate-500">{r.custom_id || r.id}</div>
          </div>
          <MoneyValue value={r.price} />
        </div>

        <div className="mt-2 space-y-0.5 text-xs text-slate-600">
          <div>{r.specialty_name || r.type || "-"}</div>
          <div>{r.doctor_name ? `${t("Médico", "Doctor")}: ${r.doctor_name}` : t("Sem médico", "No doctor")}</div>
          <div>{t("Agendada", "Scheduled")}: {fmtDate(r.scheduled_for)}</div>
          <div>{t("Horário", "Schedule")}: {formatScheduleTypeLabel(r.schedule_type)}</div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
          <span className="text-[11px] font-semibold text-slate-700">{r.invoice_code || t("Sem fatura", "No invoice")}</span>
          {r.invoice_status ? (
            <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              {r.invoice_status}
            </span>
          ) : null}
          {isProformaInvoice ? (
            <span className="rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
              {t("Proforma", "Proforma")}
            </span>
          ) : null}
          {canPrepareInvoice ? (
            <div className="grid w-full grid-cols-1 gap-1.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => openInvoiceReview(r, "draft")}
                disabled={loadingReview}
                className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <FileText size={12} />
                {r.invoice_id ? t("Rever rascunho", "Review draft") : t("Emitir rascunho", "Issue draft")}
              </button>
              <button
                type="button"
                onClick={() => openInvoiceReview(r, "issue")}
                disabled={loadingReview}
                className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
              >
                <Receipt size={12} />
                {t("Emitir original", "Issue original")}
              </button>
            </div>
          ) : null}
          {canReviewProformaInvoice ? (
            <button
              type="button"
              onClick={() => openInvoiceReview(r, "proforma")}
              disabled={loadingReview}
              className="flex w-full items-center justify-center gap-1 whitespace-nowrap rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-800 transition hover:bg-violet-100 disabled:opacity-50"
            >
              <FileText size={12} />
              {t("Rever fatura proforma", "Review proforma invoice")}
            </button>
          ) : null}
          {r.invoice_id ? (
            <button
              type="button"
              onClick={() => openConsultationInvoicePdf(Number(r.invoice_id))}
              disabled={invoicePdfId === Number(r.invoice_id)}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <PdfActionLabel loading={invoicePdfId === Number(r.invoice_id)} loadingLabel={t("PDF...", "PDF...")}>
                {t("PDF Fatura", "Invoice PDF")}
              </PdfActionLabel>
            </button>
          ) : null}
          {hasPendingCreditNote ? (
            <div className="flex w-full items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
              <Info size={12} className="mt-0.5 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-amber-800">{t("Nota de crédito solicitada", "Credit note requested")}</p>
                <p className="text-[10px] text-amber-700">{t("Aguardando resposta da Contabilidade.", "Awaiting Accounting response.")}</p>
              </div>
            </div>
          ) : canRequestCreditNote ? (
            <button
              type="button"
              onClick={() => openCreditNoteModal(r)}
              className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              {t("Solicitar nota de crédito", "Request credit note")}
            </button>
          ) : null}
        </div>

        {canWrite && (r.status === "MARCADA" || (r.status !== "CANCELADA" && r.status !== "CONCLUIDA" && r.status !== "PAGA")) ? (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
            <ConfirmDialog
              title={t("Cancelar consulta", "Cancel consultation")}
              message={t("Cancelar esta consulta?", "Cancel this consultation?")}
              confirmText={t("Cancelar consulta", "Cancel consultation")}
              onConfirm={() => cancelConsultation(r.id)}
            >
              <button
                type="button"
                className="inline-flex items-center rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-50"
              >
                {t("Cancelar", "Cancel")}
              </button>
            </ConfirmDialog>
          </div>
        ) : canWrite && r.status === "PAGA" && hasPendingCreditNote ? (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
            <ConfirmDialog
              title={t("Cancelar nota de crédito solicitada", "Cancel credit note request")}
              message={t("Cancelar o pedido de nota de crédito pendente?", "Cancel the pending credit note request?")}
              confirmText={t("Cancelar pedido", "Cancel request")}
              danger
              onConfirm={() => cancelCreditNoteRequest(r.id)}
            >
              <button
                type="button"
                className="inline-flex items-center rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-50"
              >
                {t("Cancelar nota de crédito solicitada", "Cancel credit note request")}
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

  const renderConsultationColumn = useCallback((title: string, rows: ConsultationRow[]) => (
    <Card title={`${title} (${rows.length})`} transparent>
      {loading ? (
        <div className="text-sm text-gray-500">{t("Carregando...", "Loading...")}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
          {t("Nenhuma consulta.", "No consultations.")}
        </div>
      ) : (
        <div className="space-y-2">{rows.map(renderConsultationCard)}</div>
      )}
    </Card>
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
    return () => {
      mounted = false
    }
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
      <div className="space-y-6">
        <PageHeader
          title={t("Consultas", "Consultations")}
        />

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
          </div>
        ) : null}

        {canWrite ? (
          <Card title={t("Marcar consulta", "Schedule consultation")} transparent>
            {formError ? (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {formError}
              </div>
            ) : null}
            <form onSubmit={createConsultation} className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-gray-600">{t("Paciente", "Patient")}</label>
                <SearchableSelect
                  value={patientId}
                  onChange={setPatientId}
                  options={patientOptions}
                  placeholder={t("Selecione", "Select")}
                  searchPlaceholder={t("Pesquisar paciente...", "Search patient...")}
                  emptyMessage={t("Nenhum paciente encontrado.", "No patient found.")}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">{t("Médico (opcional)", "Doctor (optional)")}</label>
                <SearchableSelect
                  value={doctorId}
                  onChange={setDoctorId}
                  options={doctorOptions}
                  allowClear
                  placeholder={t("Sem médico", "No doctor")}
                  searchPlaceholder={t("Pesquisar médico...", "Search doctor...")}
                  emptyMessage={t("Nenhum médico encontrado.", "No doctor found.")}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">{t("Especialidade", "Specialty")}</label>
                <SearchableSelect
                  value={specialtyId}
                  onChange={setSpecialtyId}
                  options={specialtyOptions}
                  placeholder={t("Selecione", "Select")}
                  searchPlaceholder={t("Pesquisar especialidade...", "Search specialty...")}
                  emptyMessage={t("Nenhuma especialidade encontrada.", "No specialty found.")}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">
                  {t("Preço c/ IVA", "Price incl. VAT")}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    value={pricePreview?.price_with_vat || ""}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm"
                    placeholder={specialtyId ? t("Calculando...", "Calculating...") : t("Selecione uma especialidade", "Select a specialty")}
                  />

                  <div className="flex flex-col items-start">
                    {pricePreview?.manual_holiday ? (
                      <span className="text-[11px] text-amber-700">{t("Feriado marcado", "Holiday marked")}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-gray-600">{t("Agendada para (opcional)", "Scheduled for (optional)")}</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="datetime-local"
                    value={scheduledForInput}
                    onChange={(e) => setScheduledForInput(e.target.value)}
                    className="min-w-[12rem] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={setScheduledNow}
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    {t("Agora", "Now")}
                  </button>
                  <label
                    htmlFor="manualHoliday-manual"
                    className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                  >
                    <input
                      id="manualHoliday-manual"
                      type="checkbox"
                      checked={manualHoliday}
                      onChange={(e) => setManualHoliday(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-2 focus:ring-slate-400"
                    />
                    <span className="text-xs font-semibold text-gray-700">{t("Feriado", "Holiday")}</span>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <button
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary-hsl))] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-all duration-150 hover:bg-[hsl(var(--primary-hover-hsl))] hover:shadow-[var(--shadow-md)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[10rem]"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarPlus className="h-4 w-4 shrink-0" />
                  )}
                  <span>{saving ? t("A marcar...", "Scheduling...") : t("Marcar consulta", "Schedule consultation")}</span>
                </button>
              </div>
            </form>
          </Card>
        ) : (
          <Card title={t("Modo leitura", "Read-only mode")} subtitle={t("Contabilidade pode ver, mas não alterar.", "Accounting can view, but cannot edit.")}>
            <div className="text-sm text-gray-600">
              {t(
                "Este módulo está disponível para auditoria e estatística. Para criar ou editar consultas, use uma conta com permissão clínica.",
                "This module is available for auditing and statistics. To create or edit consultations, use an account with clinical permissions."
              )}
            </div>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {renderConsultationColumn(t("Consultas Marcadas", "Marked (walk-in)"), markedConsultations)}
          {renderConsultationColumn(t("Consultas Agendadas", "Scheduled"), scheduledConsultations)}
          {renderConsultationColumn(t("Consultas Re-Agendadas", "Rescheduled"), rescheduledConsultations)}
          {renderConsultationColumn(t("Consultas Realizadas", "Completed"), completedConsultations)}
        </div>
      </div>

      {rescheduleModalOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={closeRescheduleModal}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {t("Remarcar consulta", "Reschedule consultation")}
              </h3>
              <p className="mt-1 text-xs text-[var(--gray-600)]">
                {t("Atualize a data e hora da consulta selecionada.", "Update the date and time of the selected consultation.")}
              </p>
            </div>

            <div className="space-y-3 px-4 py-4">
              <div className="text-xs text-[var(--gray-600)]">
                {t("Consulta:", "Consultation:")}{" "}
                <span className="font-semibold text-[var(--text)]">
                  {consultationToReschedule?.custom_id || consultationToReschedule?.id || "-"}
                </span>
                {" · "}
                {t("Paciente:", "Patient:")}{" "}
                <span className="font-semibold text-[var(--text)]">
                  {consultationToReschedule?.patient_name || "-"}
                </span>
              </div>

              <label className="space-y-1">
                <span className="text-xs text-[var(--gray-600)]">
                  {t("Nova data/hora", "New date/time")}
                </span>
                <input
                  type="datetime-local"
                  value={newScheduledFor}
                  onChange={(e) => {
                    setNewScheduledFor(e.target.value)
                    if (rescheduleError) setRescheduleError(null)
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  autoFocus
                />
              </label>
              {rescheduleError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {rescheduleError}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
              <button
                type="button"
                onClick={closeRescheduleModal}
                disabled={rescheduling}
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
              >
                {t("Cancelar", "Cancel")}
              </button>
              <button
                type="button"
                onClick={confirmReschedule}
                disabled={rescheduling}
                className="inline-flex items-center rounded-lg bg-[var(--primary-700)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--primary-800)] disabled:opacity-60"
              >
                {rescheduling ? t("Atualizando...", "Updating...") : t("Atualizar data/hora", "Update date/time")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {creditNoteModalOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={closeCreditNoteModal}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {t("Solicitar nota de crédito", "Request credit note")}
              </h3>
              <p className="mt-1 text-xs text-[var(--gray-600)]">
                {t(
                  "O pedido vai para a fila da Contabilidade, que aprova ou rejeita.",
                  "The request goes to the Accounting queue, which approves or rejects it."
                )}
              </p>
            </div>

            <div className="space-y-3 px-4 py-4">
              <div className="text-xs text-[var(--gray-600)]">
                {t("Fatura:", "Invoice:")}{" "}
                <span className="font-semibold text-[var(--text)]">
                  {creditNoteRow?.invoice_code || "-"}
                </span>
                {" · "}
                {t("Paciente:", "Patient:")}{" "}
                <span className="font-semibold text-[var(--text)]">
                  {creditNoteRow?.patient_name || "-"}
                </span>
              </div>

              <label className="space-y-1">
                <span className="text-xs text-[var(--gray-600)]">
                  {t("Motivo (opcional)", "Reason (optional)")}
                </span>
                <textarea
                  value={creditNoteReason}
                  onChange={(e) => {
                    setCreditNoteReason(e.target.value)
                    if (creditNoteError) setCreditNoteError(null)
                  }}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  placeholder={t("Ex.: cobrança em duplicado, valor incorreto...", "E.g.: duplicate charge, wrong amount...")}
                  autoFocus
                />
              </label>
              {creditNoteError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {creditNoteError}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
              <button
                type="button"
                onClick={closeCreditNoteModal}
                disabled={creditNoteSubmitting}
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
              >
                {t("Cancelar", "Cancel")}
              </button>
              <button
                type="button"
                onClick={confirmCreditNote}
                disabled={creditNoteSubmitting}
                className="inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
              >
                {creditNoteSubmitting ? t("A solicitar...", "Requesting...") : t("Solicitar", "Request")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {invoiceReviewOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={closeInvoiceReview}
          />
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
                    {t(
                      "Confirme os itens da entrada antes de gravar o documento. Os checkboxes permitem desfazer ou refazer qualquer seleção.",
                      "Confirm the encounter items before saving the document. Checkboxes can undo or redo any selection."
                    )}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <div className="font-semibold">{invoicePreview?.consultation_code || invoiceReviewRow?.custom_id || invoiceReviewRow?.id || "-"}</div>
                  <div>{invoicePreview?.patient_name || invoiceReviewRow?.patient_name || "-"}</div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {invoiceReviewError ? (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {invoiceReviewError}
                </div>
              ) : null}

              <div className="mb-3 grid gap-2 text-sm md:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-[11px] font-semibold text-slate-500">{t("Data da entrada", "Encounter date")}</div>
                  <div className="text-slate-900">{invoicePreview?.entry_date || "-"}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-[11px] font-semibold text-slate-500">{t("Itens selecionados", "Selected items")}</div>
                  <div className="text-slate-900">{invoiceReviewTotals.count}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-[11px] font-semibold text-slate-500">{t("IVA", "VAT")}</div>
                  <div className="text-slate-900"><MoneyValue value={invoiceReviewTotals.vat_amount} /></div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-[11px] font-semibold text-slate-500">{t("Total", "Total")}</div>
                  <div className="font-semibold text-slate-900"><MoneyValue value={invoiceReviewTotals.total} /></div>
                </div>
              </div>

              {invoicePreview?.items?.length ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
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
                    <tbody className="divide-y divide-slate-200">
                      {invoicePreview.items.map((item) => {
                        const checked = selectedInvoiceItems.has(item.key)
                        return (
                          <tr key={item.key} className={checked ? "bg-white" : "bg-slate-50 text-slate-500"}>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => toggleInvoicePreviewItem(item.key, e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-400"
                                aria-label={`${t("Incluir", "Include")} ${item.description}`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-slate-800">{item.source}</div>
                              {item.source_code ? <div className="text-[11px] text-slate-500">{item.source_code}</div> : null}
                            </td>
                            <td className="min-w-[220px] px-3 py-2">
                              <div className="font-medium text-slate-900">{item.description}</div>
                              <div className="text-[11px] text-slate-500">{item.item_type_label}</div>
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
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
                  {t("Não há itens faturáveis para esta entrada.", "There are no billable items for this encounter.")}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-700">
                <span className="font-semibold">{t("Total selecionado:", "Selected total:")}</span>{" "}
                <MoneyValue value={invoiceReviewTotals.total} />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvoiceItems(new Set(invoicePreview?.items.map((item) => item.key) || []))
                    setInvoiceReviewError(null)
                  }}
                  disabled={invoiceReviewSubmitting || !invoicePreview?.items?.length}
                  className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
                >
                  {t("Selecionar todos", "Select all")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvoiceItems(new Set())
                    setInvoiceReviewError(null)
                  }}
                  disabled={invoiceReviewSubmitting || !invoicePreview?.items?.length}
                  className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
                >
                  {t("Limpar seleção", "Clear selection")}
                </button>
                <button
                  type="button"
                  onClick={closeInvoiceReview}
                  disabled={invoiceReviewSubmitting}
                  className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
                >
                  {t("Cancelar", "Cancel")}
                </button>
                <button
                  type="button"
                  onClick={confirmInvoiceReview}
                  disabled={invoiceReviewSubmitting || invoiceReviewTotals.count === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-700)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--primary-800)] disabled:opacity-60"
                >
                  <FileCheck2 size={14} />
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
