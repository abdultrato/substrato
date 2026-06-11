"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import MoneyValue from "@/components/ui/MoneyValue"
import PdfActionLabel from "@/components/ui/PdfActionLabel"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { FileCheck2, FileText, Receipt } from "lucide-react"

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
  invoice_id?: number | null
  invoice_code?: string
  invoice_status?: string
}

type InvoiceIssueMode = "draft" | "issue"

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
  total: string
}

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
      setFormError(localizeErrorMessage(e?.message) || t("Falha ao criar consulta.", "Failed to create consultation."))
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

  const columns = useMemo(
    () => {
      const formatScheduleType = (value?: string) => {
        if (!value) return t("Normal", "Normal")
        if (value === "FIM_SEMANA") return t("Fim de semana", "Weekend")
        if (value === "FORA_EXPEDIENTE") return t("Fora de expediente", "After hours")
        if (value === "FERIADO_MANUAL") return t("Feriado", "Holiday")
        return t("Normal", "Normal")
      }

      const formatStatus = (value?: string) => {
        if (!value) return "-"
        if (value === "MARCADA") return t("Marcada", "Scheduled")
        if (value === "CONCLUIDA") return t("Concluída", "Completed")
        if (value === "CANCELADA") return t("Cancelada", "Canceled")
        return value
      }

      return [
        { header: t("Código", "Code"), render: (r: ConsultationRow) => r.custom_id || r.id },
        { header: t("Paciente", "Patient"), render: (r: ConsultationRow) => r.patient_name || "-" },
        { header: t("Médico", "Doctor"), render: (r: ConsultationRow) => r.doctor_name || "—" },
        { header: t("Tipo", "Type"), render: (r: ConsultationRow) => r.type || "-" },
        { header: t("Especialidade", "Specialty"), render: (r: ConsultationRow) => r.specialty_name || r.type || "-" },
        { header: t("Estado", "Status"), render: (r: ConsultationRow) => formatStatus(r.status) },
        { header: t("Horário", "Schedule"), render: (r: ConsultationRow) => formatScheduleType(r.schedule_type) },
        { header: t("Agendada", "Scheduled"), render: (r: ConsultationRow) => fmtDate(r.scheduled_for) },
        { header: t("Preço", "Price"), render: (r: ConsultationRow) => <MoneyValue value={r.price} />, className: "text-right" },
        {
          header: t("Fatura", "Invoice"),
          render: (r: ConsultationRow) => {
            const hasInvoice = Boolean(r.invoice_id)
            const canPrepareInvoice = canInvoice && r.status !== "CANCELADA" && (!r.invoice_status || r.invoice_status === "RASC")
            const loadingReview = invoiceReviewLoading === r.id
            return (
              <div className="min-w-[190px] space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-800">
                    {r.invoice_code || "—"}
                  </span>
                  {r.invoice_status ? (
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                      {r.invoice_status}
                    </span>
                  ) : null}
                </div>

                {canPrepareInvoice ? (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => openInvoiceReview(r, "draft")}
                      disabled={loadingReview}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <FileText size={12} />
                      {hasInvoice ? t("Rever rascunho", "Review draft") : t("Emitir rascunho", "Issue draft")}
                    </button>
                    <button
                      type="button"
                      onClick={() => openInvoiceReview(r, "issue")}
                      disabled={loadingReview}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <Receipt size={12} />
                      {t("Emitir original", "Issue original")}
                    </button>
                  </div>
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
              </div>
            )
          },
        },
        {
          header: t("Ações", "Actions"),
          render: (r: ConsultationRow) => (
            <div className="flex flex-wrap gap-2">
              {canWrite && r.status === "MARCADA" ? (
                <button
                  type="button"
                  onClick={() => openRescheduleModal(r)}
                  className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  {t("Remarcar", "Reschedule")}
                </button>
              ) : null}

              {canWrite && r.status === "MARCADA" ? (
                <ConfirmDialog
                  title={t("Concluir consulta", "Complete consultation")}
                  message={t("Marcar esta consulta como concluída?", "Mark this consultation as completed?")}
                  confirmText={t("Concluir", "Complete")}
                  danger={false}
                  onConfirm={() => completeConsultation(r.id)}
                >
                  <button
                    type="button"
                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    {t("Concluir", "Complete")}
                  </button>
                </ConfirmDialog>
              ) : null}

              {canWrite && r.status !== "CANCELADA" && r.status !== "CONCLUIDA" ? (
                <ConfirmDialog
                  title={t("Cancelar consulta", "Cancel consultation")}
                  message={t("Cancelar esta consulta?", "Cancel this consultation?")}
                  confirmText={t("Cancelar consulta", "Cancel consultation")}
                  onConfirm={() => cancelConsultation(r.id)}
                >
                  <button
                    type="button"
                    className="inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                  >
                    {t("Cancelar", "Cancel")}
                  </button>
                </ConfirmDialog>
              ) : null}

          </div>
        ),
      },
      ]
    },
    [
      canInvoice,
      canWrite,
      cancelConsultation,
      completeConsultation,
      invoicePdfId,
      invoiceReviewLoading,
      openConsultationInvoicePdf,
      openInvoiceReview,
      openRescheduleModal,
      t,
    ]
  )

  const scheduleTypeLabel = useMemo(() => {
    const scheduleType = pricePreview?.schedule_type
    if (!scheduleType) return t("Normal", "Normal")
    if (scheduleType === "FIM_SEMANA") return t("Fim de semana", "Weekend")
    if (scheduleType === "FORA_EXPEDIENTE") return t("Fora de expediente", "After hours")
    if (scheduleType === "FERIADO_MANUAL") return t("Feriado", "Holiday")
    return t("Normal", "Normal")
  }, [pricePreview?.schedule_type, t])

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
          <Card
            title={t("Criar consulta", "Create consultation")}
            subtitle={t("Crie a consulta e, se necessário, emita a fatura.", "Create the consultation and issue the invoice if needed.")}
          >
            {formError ? (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {formError}
              </div>
            ) : null}
            <form onSubmit={createConsultation} className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-gray-600">{t("Paciente", "Patient")}</label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  required
                >
                  <option value="">{t("Selecione", "Select")}</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || `${t("Paciente", "Patient")} ${p.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">{t("Médico (opcional)", "Doctor (optional)")}</label>
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                >
                  <option value="">{t("Sem médico", "No doctor")}</option>
                  {doctors.map((m) => {
                    const detail = m.role_name || m.profession_name
                    const label = [m.name || `${t("Médico", "Doctor")} ${m.id}`, detail].filter(Boolean).join(" · ")
                    return (
                      <option key={m.id} value={m.id}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">{t("Especialidade", "Specialty")}</label>
                <select
                  value={specialtyId}
                  onChange={(e) => setSpecialtyId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  required
                >
                  <option value="">{t("Selecione", "Select")}</option>
                  {specialties
                    .filter((x) => x.active !== false)
                    .map((esp) => (
                      <option key={esp.id} value={esp.id}>
                        {esp.name || `${t("Especialidade", "Specialty")} ${esp.id}`}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">
                  {t("Preço", "Price")} {pricePreview?.currency ? `(${pricePreview.currency})` : "(MZN)"}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    value={pricePreview?.price_final || ""}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm"
                    placeholder={specialtyId ? t("Calculando...", "Calculating...") : t("Selecione uma especialidade", "Select a specialty")}
                  />

                  <div className="flex flex-col items-start">
                    <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-gray-700">
                      {scheduleTypeLabel}
                    </span>
                    {pricePreview?.price_multiplier ? (
                      <span className="text-[11px] text-gray-500">x{pricePreview.price_multiplier}</span>
                    ) : null}
                    {pricePreview?.manual_holiday ? (
                      <span className="text-[11px] text-amber-700">{t("Feriado marcado", "Holiday marked")}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">{t("Agendada para (opcional)", "Scheduled for (optional)")}</label>
                <input
                  type="datetime-local"
                  value={scheduledForInput}
                  onChange={(e) => setScheduledForInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                />
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm">
                <input
                  id="manualHoliday-manual"
                  type="checkbox"
                  checked={manualHoliday}
                  onChange={(e) => setManualHoliday(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-2 focus:ring-slate-400"
                />
                <div className="flex flex-col leading-tight">
                  <label htmlFor="manualHoliday-manual" className="text-xs font-semibold text-gray-700">{t("Feriado", "Holiday")}</label>
                  <span className="text-[11px] text-gray-500">
                    {t(
                      "Marca 2x o valor quando não for fim de semana/fora de expediente.",
                      "Applies 2x pricing when it's not weekend/after hours."
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-end">
                <button
                  disabled={saving}
                  className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-black disabled:opacity-60"
                >
                  {saving ? t("Salvando...", "Saving...") : t("Criar consulta", "Create consultation")}
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

        <Card title={t("Lista de consultas", "Consultations list")} subtitle={t("Consultas do tenant atual.", "Consultations for the current tenant.")}>
          {loading ? (
            <div className="text-sm text-gray-500">{t("Carregando...", "Loading...")}</div>
          ) : (
            <DataTable<ConsultationRow>
              columns={columns as any}
              data={consultations}
              emptyMessage={t("Nenhuma consulta encontrada.", "No consultations found.")}
            />
          )}
        </Card>
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
                      : t("Conferir rascunho de fatura", "Review draft invoice")}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--gray-600)]">
                    {t(
                      "Confirme os itens da entrada antes de emitir. Os checkboxes permitem desfazer ou refazer qualquer seleção.",
                      "Confirm the encounter items before issuing. Checkboxes can undo or redo any selection."
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
                    ? t("Emitindo...", "Issuing...")
                    : invoiceReviewMode === "issue"
                      ? t("Emitir original", "Issue original")
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
