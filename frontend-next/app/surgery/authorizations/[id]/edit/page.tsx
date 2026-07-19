"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileText,
  Loader2,
  PackageCheck,
  Save,
  Scissors,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react"

import { SearchableRelationSelect } from "@/components/form/AutoForm"
import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"
import type { RelationOption, RelationTarget } from "@/lib/resources/relationOptions"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type Row = Record<string, any>

type FormState = {
  patient: string
  surgery: string
  surgical_request: string
  preoperative_assessment: string
  status: string
  valid_until: string
  quotation_amount: string
  approved_amount: string
  initial_payment_amount: string
  budget_approved: boolean
  initial_payment_received: boolean
  insurance_authorized: boolean
  special_materials_approved: boolean
  room_available: boolean
  team_available: boolean
  preoperative_assessment_completed: boolean
  consent_signed: boolean
  rejected_reason: string
  notes: string
}

const ENDPOINT = "/surgery/autorizacoes"
const ROUTE_BASE = "/surgery/authorizations"
const GLASS = "rounded-lg border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const INPUT = "h-7 w-full rounded-md border border-border bg-card/70 px-2 text-[11px] text-foreground outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-violet-800"
const LABEL = "mb-0.5 block text-[8px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]"

const STATUS_OPTIONS = [
  ["PENDING", "Pendente"],
  ["APPROVED", "Aprovada"],
  ["PARTIALLY_APPROVED", "Parcialmente aprovada"],
  ["REJECTED", "Rejeitada"],
  ["EXPIRED", "Expirada"],
  ["CANCELLED", "Cancelada"],
] as const

const RELATION_TARGETS: Record<string, RelationTarget> = {
  patient: { endpoint: "/clinical/patient/", labelFields: ["name", "document_number", "custom_id", "id"] },
  surgery: { endpoint: "/surgery/surgery/", labelFields: ["custom_id", "patient_name", "procedure", "scheduled_for", "id"] },
  surgical_request: { endpoint: "/surgery/pedido_cirurgico/", labelFields: ["custom_id", "patient_name", "requested_procedure", "clinical_diagnosis", "id"] },
  preoperative_assessment: { endpoint: "/surgery/avaliacao_pre_operatoria/", labelFields: ["custom_id", "patient_name", "surgical_request_code", "surgery_code", "status", "id"] },
}

const INITIAL_FORM: FormState = {
  patient: "",
  surgery: "",
  surgical_request: "",
  preoperative_assessment: "",
  status: "PENDING",
  valid_until: "",
  quotation_amount: "0.00",
  approved_amount: "0.00",
  initial_payment_amount: "0.00",
  budget_approved: false,
  initial_payment_received: false,
  insurance_authorized: false,
  special_materials_approved: false,
  room_available: false,
  team_available: false,
  preoperative_assessment_completed: false,
  consent_signed: false,
  rejected_reason: "",
  notes: "",
}

function asId(value: unknown): string {
  if (value === undefined || value === null || value === "") return ""
  return String(value)
}

function boolValue(value: unknown): boolean {
  return Boolean(value)
}

function dateValue(value: unknown): string {
  if (!value) return ""
  return String(value).slice(0, 10)
}

function numberText(value: unknown): string {
  if (value === undefined || value === null || value === "") return "0.00"
  return String(value)
}

function numberValue(value: string): number {
  const parsed = parseFloat(value || "0")
  return Number.isFinite(parsed) ? parsed : 0
}

function fmtMoney(value: string): string {
  return `${numberValue(value).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`
}

function fmtDateTime(value: unknown): string {
  if (!value) return "—"
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function option(value: unknown, label: unknown): RelationOption[] {
  const id = asId(value)
  const text = String(label || "").trim()
  return id ? [{ value: id, label: text || "Registo selecionado" }] : []
}

function listRows(payload: any): Row[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  return []
}

function firstRow(payload: any): Row | null {
  return listRows(payload)[0] || null
}

function mergeOptions(...groups: RelationOption[][]): RelationOption[] {
  const seen = new Set<string>()
  const merged: RelationOption[] = []
  for (const group of groups) {
    for (const item of group) {
      if (!item.value || seen.has(item.value)) continue
      seen.add(item.value)
      merged.push(item)
    }
  }
  return merged
}

function rowOption(row: Row | null | undefined, fields: string[]): RelationOption[] {
  if (!row?.id) return []
  const label = fields.map((field) => row[field]).filter(Boolean).join(" · ")
  return [{ value: String(row.id), label: label || row.custom_id || `#${row.id}` }]
}

function compactJson(value: unknown): string {
  if (!value) return "—"
  if (typeof value === "string") return value || "—"
  if (Array.isArray(value)) {
    if (value.length === 0) return "—"
    return value
      .slice(0, 4)
      .map((item) => {
        if (!item || typeof item !== "object") return String(item)
        const row = item as Row
        return row.name || row.nome || row.drug || row.medication || row.product_name || row.dose || JSON.stringify(row)
      })
      .join(" · ")
  }
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function formFromRow(row: Row): FormState {
  return {
    patient: asId(row.patient),
    surgery: asId(row.surgery),
    surgical_request: asId(row.surgical_request),
    preoperative_assessment: asId(row.preoperative_assessment),
    status: String(row.status || "PENDING"),
    valid_until: dateValue(row.valid_until),
    quotation_amount: numberText(row.quotation_amount),
    approved_amount: numberText(row.approved_amount),
    initial_payment_amount: numberText(row.initial_payment_amount),
    budget_approved: boolValue(row.budget_approved),
    initial_payment_received: boolValue(row.initial_payment_received),
    insurance_authorized: boolValue(row.insurance_authorized),
    special_materials_approved: boolValue(row.special_materials_approved),
    room_available: boolValue(row.room_available),
    team_available: boolValue(row.team_available),
    preoperative_assessment_completed: boolValue(row.preoperative_assessment_completed),
    consent_signed: boolValue(row.consent_signed),
    rejected_reason: String(row.rejected_reason || ""),
    notes: String(row.notes || ""),
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  )
}

function TextInput({
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={INPUT}
    />
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex h-7 min-w-0 items-center gap-1.5 rounded-md border border-border/70 bg-card/40 px-2 text-[11px] font-semibold text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 shrink-0"
      />
      <span className="truncate">{label}</span>
    </label>
  )
}

function DecisionItem({ label, met, detail }: { label: string; met: boolean; detail: string }) {
  return (
    <div className="flex min-w-0 items-start gap-1.5 rounded-md border border-border/70 bg-card/40 px-2 py-1">
      {met ? (
        <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-600" />
      ) : (
        <XCircle size={12} className="mt-0.5 shrink-0 text-amber-600" />
      )}
      <div className="min-w-0">
        <div className="truncate text-[9px] font-semibold text-foreground">{label}</div>
        <div className="truncate text-[8px] text-muted-foreground">{detail}</div>
      </div>
    </div>
  )
}

function Card({
  title,
  icon,
  children,
  className = "",
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`relative overflow-visible ${GLASS} ${className}`}>
      <span className="absolute left-0 top-0 h-full w-1 bg-violet-400" />
      <div className="space-y-1.5 px-2 py-1.5 pl-3">
        <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--gray-500)]">
          {icon}
          <span>{title}</span>
        </div>
        {children}
      </div>
    </section>
  )
}

function HistoryValue({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-card/35 px-2 py-1">
      <div className="truncate text-[8px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="truncate text-[10px] font-semibold text-foreground">{String(value || "—")}</div>
    </div>
  )
}

function ContextMiniCard({
  label,
  value,
  detail,
}: {
  label: string
  value: unknown
  detail?: unknown
}) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-card/35 px-2 py-1">
      <div className="truncate text-[8px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="truncate text-[10px] font-semibold text-foreground">{String(value || "—")}</div>
      {detail ? <div className="truncate text-[9px] text-muted-foreground">{String(detail)}</div> : null}
    </div>
  )
}

function ContextList({
  title,
  empty,
  rows,
  render,
}: {
  title: string
  empty: string
  rows: Row[]
  render: (row: Row) => React.ReactNode
}) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-card/25 px-2 py-1.5">
      <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</div>
      {rows.length > 0 ? (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3">
          {rows.slice(0, 6).map((item) => (
            <div key={item.id || item.custom_id || JSON.stringify(item)} className="min-w-0 rounded border border-border/50 bg-background/35 px-1.5 py-1">
              {render(item)}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-muted-foreground">{empty}</div>
      )}
    </div>
  )
}

export default function SurgeryAuthorizationEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = routeParamToString((params as any)?.id)

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [row, setRow] = useState<Row | null>(null)
  const [surgery, setSurgery] = useState<Row | null>(null)
  const [requestRow, setRequestRow] = useState<Row | null>(null)
  const [assessmentRow, setAssessmentRow] = useState<Row | null>(null)
  const [requestOptions, setRequestOptions] = useState<RelationOption[]>([])
  const [assessmentOptions, setAssessmentOptions] = useState<RelationOption[]>([])
  const [consumptions, setConsumptions] = useState<Row[]>([])
  const [documents, setDocuments] = useState<Row[]>([])
  const [auditEvents, setAuditEvents] = useState<Row[]>([])
  const [anesthesiaRecords, setAnesthesiaRecords] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const hasOrigin = Boolean(form.surgery || form.surgical_request)
  const hasPaymentCoverage = Boolean(form.initial_payment_received || form.insurance_authorized)
  const approvalRequirements = [
    { label: "Origem clínica", met: hasOrigin, detail: hasOrigin ? "Cirurgia ou pedido associado" : "Escolha cirurgia ou pedido" },
    { label: "Orçamento", met: form.budget_approved, detail: form.budget_approved ? "Aprovado" : "Pendente" },
    { label: "Pagamento/seguro", met: hasPaymentCoverage, detail: hasPaymentCoverage ? "Cobertura confirmada" : "Sem confirmação" },
    { label: "Pré-operatório", met: form.preoperative_assessment_completed, detail: form.preoperative_assessment_completed ? "Concluído" : "Pendente" },
    { label: "Consentimento", met: form.consent_signed, detail: form.consent_signed ? "Assinado" : "Por assinar" },
  ]
  const missingApprovalRequirements = approvalRequirements.filter((item) => !item.met)
  const canApprove = missingApprovalRequirements.length === 0
  const needsRejectedReason = form.status === "REJECTED" && !form.rejected_reason.trim()
  const statusLabel = STATUS_OPTIONS.find(([value]) => value === form.status)?.[1] || form.status

  const relationOptions = {
    patient: option(form.patient, row?.patient_name || row?.patient_display || row?.patient_code),
    surgery: mergeOptions(option(form.surgery, row?.surgery_code || row?.surgery_display || row?.custom_id), rowOption(surgery, ["custom_id", "patient_name", "procedure"])),
    surgical_request: mergeOptions(
      option(form.surgical_request, row?.surgical_request_code || row?.surgical_request_display),
      rowOption(requestRow, ["custom_id", "patient_name", "requested_procedure", "clinical_diagnosis"]),
      requestOptions,
    ),
    preoperative_assessment: mergeOptions(
      option(form.preoperative_assessment, row?.preoperative_assessment_code || row?.preoperative_assessment_display),
      rowOption(assessmentRow, ["custom_id", "patient_name", "surgical_request_code", "status"]),
      assessmentOptions,
    ),
  }
  const requestTarget: RelationTarget = {
    ...RELATION_TARGETS.surgical_request,
    staticFilters: form.patient ? { patient: Number(form.patient) } : undefined,
  }
  const assessmentTarget: RelationTarget = {
    ...RELATION_TARGETS.preoperative_assessment,
    staticFilters: form.surgical_request
      ? { surgical_request: Number(form.surgical_request) }
      : form.patient
        ? { patient: Number(form.patient) }
        : undefined,
  }

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const nextRow = await apiFetch<Row>(`${ENDPOINT}/${id}/`)
      setRow(nextRow)

      const surgeryId = nextRow.surgery
      const requestId = nextRow.surgical_request
      const assessmentId = nextRow.preoperative_assessment
      const patientId = nextRow.patient

      const [
        surgeryPayload,
        requestPayload,
        assessmentPayload,
        requestListPayload,
        assessmentListPayload,
        consumptionsPayload,
        documentsPayload,
        auditPayload,
        anesthesiaPayload,
      ] = await Promise.all([
        surgeryId ? apiFetch<Row>(`/surgery/surgery/${surgeryId}/`).catch(() => null) : Promise.resolve(null),
        requestId ? apiFetch<Row>(`/surgery/pedido_cirurgico/${requestId}/`).catch(() => null) : Promise.resolve(null),
        assessmentId ? apiFetch<Row>(`/surgery/avaliacao_pre_operatoria/${assessmentId}/`).catch(() => null) : Promise.resolve(null),
        patientId ? apiFetch<any>(`/surgery/pedido_cirurgico/?patient=${patientId}&page_size=50&ordering=-created_at`).catch(() => null) : Promise.resolve(null),
        patientId ? apiFetch<any>(`/surgery/avaliacao_pre_operatoria/?patient=${patientId}&page_size=50&ordering=-assessed_at`).catch(() => null) : Promise.resolve(null),
        surgeryId ? apiFetch<any>(`/surgery/consumos/?surgery=${surgeryId}&limit=100`).catch(() => null) : Promise.resolve(null),
        apiFetch<any>(`/surgery/documentos/?authorization=${id}&limit=100`).catch(() => null),
        surgeryId || requestId
          ? apiFetch<any>(`/surgery/auditoria/?${new URLSearchParams({
              ...(surgeryId ? { surgery: String(surgeryId) } : {}),
              ...(requestId ? { surgical_request: String(requestId) } : {}),
              limit: "50",
            })}`).catch(() => null)
          : Promise.resolve(null),
        surgeryId ? apiFetch<any>(`/surgery/anestesia/?surgery=${surgeryId}&limit=50`).catch(() => null) : Promise.resolve(null),
      ])

      const effectivePatientId = nextRow.patient || surgeryPayload?.patient || null
      const effectiveRequestId = nextRow.surgical_request || surgeryPayload?.surgical_request || null
      const resolvedRequest = requestPayload || (
        effectiveRequestId
          ? await apiFetch<Row>(`/surgery/pedido_cirurgico/${effectiveRequestId}/`).catch(() => null)
          : null
      )
      const extraAssessments = await Promise.all([
        surgeryId ? apiFetch<any>(`/surgery/avaliacao_pre_operatoria/?proposed_surgery=${surgeryId}&page_size=25&ordering=-assessed_at`).catch(() => null) : Promise.resolve(null),
        effectiveRequestId ? apiFetch<any>(`/surgery/avaliacao_pre_operatoria/?surgical_request=${effectiveRequestId}&page_size=25&ordering=-assessed_at`).catch(() => null) : Promise.resolve(null),
      ])
      const combinedAssessments = [
        ...listRows(assessmentListPayload),
        ...extraAssessments.flatMap((payload) => listRows(payload)),
      ].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
      const resolvedAssessment = assessmentPayload
        || combinedAssessments.find((item) => Number(item.proposed_surgery) === Number(surgeryId))
        || combinedAssessments.find((item) => Number(item.surgical_request) === Number(effectiveRequestId))
        || firstRow(extraAssessments[0])
        || firstRow(extraAssessments[1])
        || null

      setSurgery(surgeryPayload)
      setRequestRow(resolvedRequest)
      setAssessmentRow(resolvedAssessment)
      setForm({
        ...formFromRow(nextRow),
        patient: asId(effectivePatientId),
        surgical_request: asId(effectiveRequestId || resolvedRequest?.id),
        preoperative_assessment: asId(nextRow.preoperative_assessment || resolvedAssessment?.id),
      })
      setRequestOptions(listRows(requestListPayload).map((item) => ({
        value: String(item.id),
        label: [item.custom_id, item.patient_name, item.requested_procedure, item.status].filter(Boolean).join(" · "),
      })))
      setAssessmentOptions(combinedAssessments.map((item) => ({
        value: String(item.id),
        label: [item.custom_id, item.patient_name, item.surgical_request_code, item.status].filter(Boolean).join(" · "),
      })))
      setConsumptions(listRows(consumptionsPayload))
      setDocuments(listRows(documentsPayload))
      setAuditEvents(listRows(auditPayload))
      setAnesthesiaRecords(listRows(anesthesiaPayload))
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar autorização cirúrgica.")
      setSurgery(null)
      setRequestRow(null)
      setAssessmentRow(null)
      setRequestOptions([])
      setAssessmentOptions([])
      setConsumptions([])
      setDocuments([])
      setAuditEvents([])
      setAnesthesiaRecords([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!id) return
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const payload = {
        patient: form.patient ? Number(form.patient) : null,
        surgery: form.surgery ? Number(form.surgery) : null,
        surgical_request: form.surgical_request ? Number(form.surgical_request) : null,
        preoperative_assessment: form.preoperative_assessment ? Number(form.preoperative_assessment) : null,
        status: form.status,
        valid_until: form.valid_until || null,
        quotation_amount: form.quotation_amount || "0.00",
        approved_amount: form.approved_amount || "0.00",
        initial_payment_amount: form.initial_payment_amount || "0.00",
        budget_approved: form.budget_approved,
        initial_payment_received: form.initial_payment_received,
        insurance_authorized: form.insurance_authorized,
        special_materials_approved: form.special_materials_approved,
        room_available: form.room_available,
        team_available: form.team_available,
        preoperative_assessment_completed: form.preoperative_assessment_completed,
        consent_signed: form.consent_signed,
        rejected_reason: form.rejected_reason,
        notes: form.notes,
      }

      await apiFetch<Row>(`${ENDPOINT}/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      setSaved(true)
      window.setTimeout(() => router.push(`${ROUTE_BASE}/${id}`), 450)
    } catch (err: any) {
      setError(err?.message || "Erro ao guardar autorização cirúrgica.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </div>
      </AppLayout>
    )
  }

  if (error && !row) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
        <div className="mx-auto w-full max-w-[99vw] px-1 py-1">
          <div className="flex items-center gap-2 rounded-lg border border-rose-300/50 bg-rose-50/60 px-3 py-2 text-sm text-rose-700">
            <AlertCircle size={14} /> {error}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[99vw] space-y-1 px-0.5 py-0.5">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-col gap-1 px-2 py-1.5 pl-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-[var(--gray-500)]">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href={ROUTE_BASE} className="hover:text-foreground">Autorizações</Link>
                <span>/</span>
                <Link href={`${ROUTE_BASE}/${id}`} className="font-mono hover:text-foreground">
                  {row?.custom_id || `#${id}`}
                </Link>
                <span>/</span>
                <span className="font-semibold text-foreground">Editar</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <h1 className="font-display text-[14px] font-semibold leading-tight text-foreground">
                  Editar autorização cirúrgica
                </h1>
                <span className="rounded-full border border-violet-300/70 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300">
                  {statusLabel}
                </span>
                <span className="rounded-full border border-blue-300/70 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
                  Aprovado {fmtMoney(form.approved_amount)}
                </span>
                <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
                  canApprove
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                    : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
                }`}>
                  {canApprove ? "Pronta para aprovar" : `${missingApprovalRequirements.length} pendências`}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1">
              {saved ? (
                <span className="inline-flex h-6 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <Check size={11} />
                  Guardada
                </span>
              ) : null}
              <Link
                href={`${ROUTE_BASE}/${id}`}
                className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-card px-2 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft size={11} />
                Voltar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-6 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Guardar
              </button>
            </div>
          </div>
        </section>

        <section className={`relative overflow-visible ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-emerald-500" />
          <div className="space-y-1.5 px-2 py-1.5 pl-3">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--gray-500)]">
                  <ClipboardCheck size={12} />
                  <span>Resumo de decisão</span>
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Confirme origem clínica, cobertura, avaliação e consentimento antes de aprovar.
                </p>
              </div>
              <div className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold ${
                canApprove
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                  : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
              }`}>
                {canApprove ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                {canApprove ? "Sem pendências críticas" : "Rever antes de aprovar"}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 md:grid-cols-5">
              {approvalRequirements.map((item) => (
                <DecisionItem key={item.label} label={item.label} met={item.met} detail={item.detail} />
              ))}
            </div>
            {form.status === "APPROVED" && !canApprove ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300">
                Pendências incompatíveis com aprovação final: {missingApprovalRequirements.map((item) => item.label).join(", ")}.
              </div>
            ) : null}
            {needsRejectedReason ? (
              <div className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
                Informe o motivo de rejeição antes de guardar uma autorização rejeitada.
              </div>
            ) : null}
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
          <Card title="Origem da autorização" icon={<Scissors size={12} />} className="z-50">
            <div className="grid grid-cols-1 gap-1.5">
              <Field label="Cirurgia">
                <SearchableRelationSelect
                  fieldName="surgery"
                  value={form.surgery}
                  onChange={(value) => update("surgery", asId(value))}
                  target={RELATION_TARGETS.surgery}
                  initialOptions={relationOptions.surgery}
                  placeholder="Pesquisar cirurgia..."
                />
              </Field>
              <Field label="Pedido cirúrgico">
                <SearchableRelationSelect
                  fieldName="surgical_request"
                  value={form.surgical_request}
                  onChange={(value) => update("surgical_request", asId(value))}
                  target={requestTarget}
                  initialOptions={relationOptions.surgical_request}
                  placeholder="Pesquisar pedido..."
                />
              </Field>
              <Field label="Avaliação pré-operatória">
                <SearchableRelationSelect
                  fieldName="preoperative_assessment"
                  value={form.preoperative_assessment}
                  onChange={(value) => update("preoperative_assessment", asId(value))}
                  target={assessmentTarget}
                  initialOptions={relationOptions.preoperative_assessment}
                  placeholder="Pesquisar avaliação..."
                />
              </Field>
              {!hasOrigin ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300">
                  Selecione pelo menos uma origem clínica para manter rastreabilidade.
                </div>
              ) : null}
            </div>
          </Card>

          <Card title="Paciente e validade" icon={<User size={12} />} className="z-40">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="col-span-2">
                <Field label="Paciente">
                  <SearchableRelationSelect
                    fieldName="patient"
                    value={form.patient}
                    onChange={(value) => update("patient", asId(value))}
                    target={RELATION_TARGETS.patient}
                    initialOptions={relationOptions.patient}
                    placeholder="Pesquisar paciente..."
                  />
                </Field>
              </div>
              <Field label="Estado">
                <select value={form.status} onChange={(event) => update("status", event.target.value)} className={INPUT}>
                  {STATUS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Válida até">
                <TextInput type="date" value={form.valid_until} onChange={(value) => update("valid_until", value)} />
              </Field>
            </div>
          </Card>

          <Card title="Valores" icon={<CreditCard size={12} />}>
            <div className="grid grid-cols-3 gap-1.5">
              <Field label="Valor orçamentado">
                <TextInput type="number" value={form.quotation_amount} onChange={(value) => update("quotation_amount", value)} />
              </Field>
              <Field label="Valor aprovado">
                <TextInput type="number" value={form.approved_amount} onChange={(value) => update("approved_amount", value)} />
              </Field>
              <Field label="Pagamento inicial">
                <TextInput type="number" value={form.initial_payment_amount} onChange={(value) => update("initial_payment_amount", value)} />
              </Field>
            </div>
          </Card>

          <Card title="Checklist de liberação" icon={<ShieldCheck size={12} />}>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              <ToggleRow label="Orçamento aprovado" checked={form.budget_approved} onChange={(value) => update("budget_approved", value)} />
              <ToggleRow label="Pagamento inicial recebido" checked={form.initial_payment_received} onChange={(value) => update("initial_payment_received", value)} />
              <ToggleRow label="Seguro autorizou" checked={form.insurance_authorized} onChange={(value) => update("insurance_authorized", value)} />
              <ToggleRow label="Materiais especiais aprovados" checked={form.special_materials_approved} onChange={(value) => update("special_materials_approved", value)} />
              <ToggleRow label="Sala disponível" checked={form.room_available} onChange={(value) => update("room_available", value)} />
              <ToggleRow label="Equipa disponível" checked={form.team_available} onChange={(value) => update("team_available", value)} />
              <ToggleRow label="Avaliação pré-op. concluída" checked={form.preoperative_assessment_completed} onChange={(value) => update("preoperative_assessment_completed", value)} />
              <ToggleRow label="Consentimento assinado" checked={form.consent_signed} onChange={(value) => update("consent_signed", value)} />
            </div>
          </Card>

          <Card title="Rejeição e observações" icon={<FileText size={12} />} className="md:col-span-2">
            <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
              <Field label="Motivo de rejeição">
                <textarea
                  value={form.rejected_reason}
                  onChange={(event) => update("rejected_reason", event.target.value)}
                  rows={3}
                  className={`min-h-[62px] w-full rounded-md border px-2 py-1.5 text-[11px] text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-1 ${
                    form.status === "REJECTED"
                      ? "border-rose-300 bg-rose-50/80 focus:border-rose-400 focus:ring-rose-200 dark:border-rose-700/40 dark:bg-rose-900/20 dark:focus:ring-rose-800"
                      : "border-border bg-card/70 focus:border-violet-400 focus:ring-violet-200 dark:focus:ring-violet-800"
                  }`}
                  placeholder={form.status === "REJECTED" ? "Descreva o motivo da rejeição." : "Usar apenas quando a autorização for rejeitada."}
                />
              </Field>
              <Field label="Observações">
                <textarea
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  rows={3}
                  className="min-h-[62px] w-full rounded-md border border-border bg-card/70 px-2 py-1.5 text-[11px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-violet-400 focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
                  placeholder="Notas financeiras, operacionais ou de autorização..."
                />
              </Field>
            </div>
          </Card>

          <Card title="Histórico e contexto" icon={<ClipboardCheck size={12} />} className="md:col-span-2">
            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 xl:grid-cols-8">
                <HistoryValue label="Código" value={row?.custom_id || `#${id}`} />
                <HistoryValue label="Paciente" value={row?.patient_name} />
                <HistoryValue label="Cirurgia" value={row?.surgery_code || (row?.surgery ? `#${row.surgery}` : "—")} />
                <HistoryValue label="Pedido" value={row?.surgical_request_code || (row?.surgical_request ? `#${row.surgical_request}` : "—")} />
                <HistoryValue label="Avaliação" value={row?.preoperative_assessment_code || (row?.preoperative_assessment ? `#${row.preoperative_assessment}` : "—")} />
                <HistoryValue label="Criada" value={fmtDateTime(row?.created_at)} />
                <HistoryValue label="Atualizada" value={fmtDateTime(row?.updated_at)} />
                <HistoryValue label="Aprovada" value={fmtDateTime(row?.approved_at)} />
              </div>

              <div className="grid grid-cols-1 gap-1 lg:grid-cols-3">
                <div className="space-y-1">
                  <ContextMiniCard
                    label="Pedido cirúrgico"
                    value={requestRow?.custom_id || row?.surgical_request_code}
                    detail={requestRow?.requested_procedure || requestRow?.clinical_diagnosis}
                  />
                  <ContextMiniCard
                    label="Prioridade / estado"
                    value={[requestRow?.priority, requestRow?.status].filter(Boolean).join(" · ")}
                    detail={requestRow?.requesting_doctor_name || requestRow?.specialty_name}
                  />
                  <ContextMiniCard
                    label="Diagnóstico"
                    value={requestRow?.clinical_diagnosis || surgery?.preoperative_diagnosis}
                  />
                </div>

                <div className="space-y-1">
                  <ContextMiniCard
                    label="Avaliação pré-operatória"
                    value={assessmentRow?.custom_id || row?.preoperative_assessment_code}
                    detail={[assessmentRow?.asa_class, assessmentRow?.status].filter(Boolean).join(" · ")}
                  />
                  <ContextMiniCard
                    label="Risco / aptidão"
                    value={[assessmentRow?.surgical_risk, assessmentRow?.fit_for_surgery === true ? "Apto" : assessmentRow?.fit_for_surgery === false ? "Não apto" : ""].filter(Boolean).join(" · ")}
                    detail={assessmentRow?.evaluator_name}
                  />
                  <ContextMiniCard
                    label="Avaliação clínica"
                    value={assessmentRow?.medical_evaluation || assessmentRow?.anesthetic_evaluation}
                  />
                </div>

                <div className="space-y-1">
                  <ContextMiniCard
                    label="Cirurgia"
                    value={surgery?.custom_id || row?.surgery_code}
                    detail={[surgery?.procedure, surgery?.status].filter(Boolean).join(" · ")}
                  />
                  <ContextMiniCard
                    label="Agenda"
                    value={fmtDateTime(surgery?.scheduled_for)}
                    detail={surgery?.operating_room_name || surgery?.surgeon_name}
                  />
                  <ContextMiniCard
                    label="Procedimentos"
                    value={Array.isArray(surgery?.procedures_detail)
                      ? surgery?.procedures_detail?.map((item: Row) => item.name || item.procedure_name || item.custom_id).filter(Boolean).join(" · ")
                      : surgery?.procedure}
                  />
                </div>
              </div>

              <ContextList
                title="Materiais e consumos"
                empty="Sem materiais ou consumos associados à cirurgia."
                rows={consumptions}
                render={(item) => (
                  <>
                    <div className="truncate text-[10px] font-semibold text-foreground">
                      {item.product_name || item.material_name || item.product_code || `Produto #${item.product || item.id}`}
                    </div>
                    <div className="truncate text-[9px] text-muted-foreground">
                      Qtd. {item.quantity || item.effective_quantity || "—"} · {fmtMoney(String(item.charged_price || item.unit_cost || "0.00"))}
                    </div>
                  </>
                )}
              />

              <ContextList
                title="Medicamentos e anestesia"
                empty="Sem fármacos registados em anestesia."
                rows={anesthesiaRecords}
                render={(item) => (
                  <>
                    <div className="truncate text-[10px] font-semibold text-foreground">
                      {item.custom_id || item.anesthesia_type || "Anestesia"}
                    </div>
                    <div className="truncate text-[9px] text-muted-foreground">
                      {compactJson(item.medications)}
                    </div>
                  </>
                )}
              />

              <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
                <ContextList
                  title="Documentos"
                  empty="Sem documentos associados à autorização."
                  rows={documents}
                  render={(item) => (
                    <>
                      <div className="truncate text-[10px] font-semibold text-foreground">{item.title || item.custom_id || `#${item.id}`}</div>
                      <div className="truncate text-[9px] text-muted-foreground">
                        {[item.document_type, item.status, item.external_reference].filter(Boolean).join(" · ")}
                      </div>
                    </>
                  )}
                />
                <ContextList
                  title="Eventos"
                  empty="Sem eventos de auditoria ligados ao pedido/cirurgia."
                  rows={auditEvents}
                  render={(item) => (
                    <>
                      <div className="truncate text-[10px] font-semibold text-foreground">{item.action || item.event_type || item.custom_id}</div>
                      <div className="truncate text-[9px] text-muted-foreground">
                        {[item.actor_name, fmtDateTime(item.occurred_at), item.new_state].filter(Boolean).join(" · ")}
                      </div>
                    </>
                  )}
                />
              </div>
            </div>
          </Card>
        </div>
      </form>
    </AppLayout>
  )
}
