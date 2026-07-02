"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  Search,
  Stethoscope,
  User,
  X,
  XCircle,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

const GLASS = "rounded-xl border border-amber-200/60 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const inputCls = "w-full rounded-lg border border-white/30 bg-white/40 px-2.5 py-1.5 text-[12px] text-[var(--text)] placeholder-[var(--gray-400)] backdrop-blur-sm focus:border-amber-400 focus:outline-none dark:border-white/10 dark:bg-white/[0.06]"
const textareaCls = `${inputCls} resize-none`

const ASA_OPTIONS = [
  { value: "ASA_I", label: "ASA I", description: "Paciente saudável." },
  { value: "ASA_II", label: "ASA II", description: "Doença sistémica ligeira." },
  { value: "ASA_III", label: "ASA III", description: "Doença sistémica grave." },
  { value: "ASA_IV", label: "ASA IV", description: "Risco de vida constante." },
  { value: "ASA_V", label: "ASA V", description: "Moribundo sem cirurgia." },
  { value: "ASA_VI", label: "ASA VI", description: "Morte cerebral, dador." },
  { value: "UNKNOWN", label: "Desconhecido", description: "Classificação ainda não definida." },
]

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pendente" },
  { value: "IN_PROGRESS", label: "Em curso" },
  { value: "FIT", label: "Apto" },
  { value: "TEMPORARILY_UNFIT", label: "Temporariamente inapto" },
  { value: "UNFIT", label: "Inapto" },
  { value: "REQUIRES_EXAMS", label: "Requer exames" },
]

const STEPS = [
  { id: 1, label: "Paciente e pedido", icon: <User size={12} /> },
  { id: 2, label: "Avaliação clínica", icon: <Stethoscope size={12} /> },
  { id: 3, label: "Exames e conclusão", icon: <ClipboardCheck size={12} /> },
]

type SearchValue = { id: number; label: string; meta?: string }
type SurgicalContextValue = { kind: "request" | "surgery"; id: number; label: string }
type ProcedureSummary = { key: string; label: string }

function listRows(payload: any): any[] {
  return Array.isArray(payload) ? payload : (payload?.results || [])
}

function uniqueRowsById(rows: any[]): any[] {
  const seen = new Set<number>()
  const result: any[] = []
  for (const row of rows) {
    const id = Number(row?.id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    result.push(row)
  }
  return result
}

function splitProcedureText(value: string): string[] {
  return String(value || "")
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
}

function buildProcedureSummaries(surgeries: any[], requestedProcedure?: string): ProcedureSummary[] {
  const summaries: ProcedureSummary[] = []
  const seen = new Set<string>()

  function push(label: string, id?: number | string) {
    const clean = String(label || "").trim()
    if (!clean) return
    const key = id ? `id:${id}` : `text:${clean.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    summaries.push({ key, label: clean })
  }

  for (const surgery of surgeries) {
    const procedureIds = Array.isArray(surgery?.procedures) ? surgery.procedures : []
    const names = Array.isArray(surgery?.procedure_names) && surgery.procedure_names.length
      ? surgery.procedure_names
      : splitProcedureText(surgery?.procedure || "")

    if (names.length) {
      names.forEach((name: string, index: number) => push(name, procedureIds[index]))
      continue
    }

    if (surgery?.procedure) push(surgery.procedure)
  }

  splitProcedureText(requestedProcedure || "").forEach((name) => push(name))
  return summaries
}

function labelSurgerySize(value: string): string {
  if (value === "GRANDE") return "Grande"
  if (value === "PEQUENA") return "Pequena"
  return value || ""
}


function FieldRow({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      {children}
    </div>
  )
}

function SurfaceCard({
  title,
  subtitle,
  icon,
  accent,
  children,
}: {
  title: string
  subtitle?: string
  icon: React.ReactNode
  accent: string
  children: React.ReactNode
}) {
  return (
    <section className={`relative overflow-hidden ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="px-3 py-3 pl-4">
        <div className="mb-3 flex items-start gap-2">
          <span className="mt-0.5 text-[var(--gray-500)]">{icon}</span>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">{title}</div>
            {subtitle ? <p className="mt-0.5 text-[11px] text-[var(--gray-400)]">{subtitle}</p> : null}
          </div>
        </div>
        {children}
      </div>
    </section>
  )
}

function DropdownPortal({
  anchorRef,
  portalRef,
  open,
  children,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>
  portalRef: React.RefObject<HTMLDivElement | null>
  open: boolean
  children: React.ReactNode
}) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open || !anchorRef.current) return

    function update() {
      if (!anchorRef.current) return
      const rect = anchorRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }

    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [anchorRef, open])

  if (!open || !mounted || !pos) return null

  return createPortal(
    <div
      ref={portalRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="rounded-xl border border-amber-200 bg-white shadow-xl backdrop-blur-md dark:border-white/20 dark:bg-zinc-900/90"
    >
      {children}
    </div>,
    document.body
  )
}

function SearchSelect({
  label,
  endpoint,
  value,
  onChange,
  required,
  placeholder,
  extraParams,
  getOptionLabel,
}: {
  label: string
  endpoint: string
  value: SearchValue | null
  onChange: (value: SearchValue | null) => void
  required?: boolean
  placeholder?: string
  extraParams?: Record<string, string>
  getOptionLabel?: (item: any) => string
}) {
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)

  const buildLabel = useCallback((item: any) => {
    if (getOptionLabel) return getOptionLabel(item)
    return item?.name || item?.display_name || item?.full_name || item?.custom_id || `#${item?.id}`
  }, [getOptionLabel])

  const search = useCallback(async (searchText: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: "20",
        ...(extraParams ?? {}),
      })
      if (searchText.trim()) params.set("search", searchText.trim())
      const response = await apiFetch<any>(`${endpoint}?${params.toString()}`)
      setOptions(Array.isArray(response) ? response : (response.results || []))
    } catch {
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [endpoint, extraParams])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => { search(query) }, 250)
    return () => clearTimeout(timer)
  }, [open, query, search])

  useEffect(() => {
    function handle(event: MouseEvent) {
      const target = event.target as Node
      if (ref.current?.contains(target) || portalRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  function selectOption(item: any) {
    onChange({ id: item.id, label: buildLabel(item) })
    setOpen(false)
    setQuery("")
  }

  return (
    <FieldRow label={label} required={required}>
      <div ref={ref}>
        <div
          className={`${inputCls} flex cursor-pointer items-center justify-between gap-2`}
          onClick={() => setOpen((current) => !current)}
        >
          <span className={value ? "text-foreground" : "text-[var(--gray-400)]"}>
            {value?.label || placeholder || `Selecionar ${label.toLowerCase()}...`}
          </span>
          <div className="flex items-center gap-1">
            {value ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onChange(null)
                  setOpen(false)
                }}
                className="rounded-full p-0.5 text-[var(--gray-400)] transition hover:bg-white/60 hover:text-rose-500 dark:hover:bg-white/10"
              >
                <X size={10} />
              </button>
            ) : null}
            <Search size={10} className="shrink-0 text-[var(--gray-400)]" />
          </div>
        </div>

        <DropdownPortal anchorRef={ref} portalRef={portalRef} open={open}>
          <div className="border-b border-amber-100 px-2 py-1.5 dark:border-white/10">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar..."
              className="w-full bg-transparent text-[12px] text-[var(--text)] outline-none placeholder-[var(--gray-400)]"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-2 text-[11px] text-[var(--gray-500)]">Carregando...</div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-[var(--gray-400)]">Sem resultados</div>
            ) : (
              options.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    selectOption(item)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition hover:bg-amber-50/70 dark:hover:bg-white/10"
                >
                  <span className="truncate text-[var(--text)]">{buildLabel(item)}</span>
                </button>
              ))
            )}
          </div>
        </DropdownPortal>
      </div>
    </FieldRow>
  )
}

function MultiSearchSelect({
  label,
  endpoint,
  values,
  onChange,
  placeholder,
  extraParams,
  getOptionLabel,
  getOptionMeta,
}: {
  label: string
  endpoint: string
  values: SearchValue[]
  onChange: (values: SearchValue[]) => void
  placeholder?: string
  extraParams?: Record<string, string>
  getOptionLabel?: (item: any) => string
  getOptionMeta?: (item: any) => string
}) {
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)

  const selectedIds = useMemo(() => new Set(values.map((item) => item.id)), [values])

  const buildLabel = useCallback((item: any) => {
    if (getOptionLabel) return getOptionLabel(item)
    return item?.name || item?.display_name || item?.full_name || item?.custom_id || `#${item?.id}`
  }, [getOptionLabel])

  const buildMeta = useCallback((item: any) => {
    if (getOptionMeta) return getOptionMeta(item)
    return [item?.custom_id, item?.code].filter(Boolean).join(" · ")
  }, [getOptionMeta])

  const search = useCallback(async (searchText: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: "20",
        ...(extraParams ?? {}),
      })
      if (searchText.trim()) params.set("search", searchText.trim())
      const response = await apiFetch<any>(`${endpoint}?${params.toString()}`)
      setOptions(Array.isArray(response) ? response : (response.results || []))
    } catch {
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [endpoint, extraParams])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => { search(query) }, 250)
    return () => clearTimeout(timer)
  }, [open, query, search])

  useEffect(() => {
    function handle(event: MouseEvent) {
      const target = event.target as Node
      if (ref.current?.contains(target) || portalRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  function addOption(item: any) {
    if (selectedIds.has(item.id)) return
    onChange([
      ...values,
      {
        id: item.id,
        label: buildLabel(item),
        meta: buildMeta(item) || undefined,
      },
    ])
    setQuery("")
    setOpen(false)
  }

  function removeOption(id: number) {
    onChange(values.filter((item) => item.id !== id))
  }

  const visibleOptions = options.filter((item) => !selectedIds.has(item.id))

  return (
    <FieldRow label={label}>
      <div ref={ref} className="space-y-2">
        <div
          className={`${inputCls} flex items-center gap-2`}
          onClick={() => setOpen(true)}
        >
          <Search size={10} className="shrink-0 text-[var(--gray-400)]" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder || `Pesquisar ${label.toLowerCase()}...`}
            className="w-full bg-transparent text-[12px] text-[var(--text)] outline-none placeholder-[var(--gray-400)]"
          />
          {loading ? <Loader2 size={11} className="shrink-0 animate-spin text-[var(--gray-400)]" /> : null}
        </div>

        {values.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {values.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-200"
              >
                <span className="max-w-[180px] truncate">{item.label}</span>
                {item.meta ? <span className="text-violet-500/80 dark:text-violet-300/80">{item.meta}</span> : null}
                <button
                  type="button"
                  onClick={() => removeOption(item.id)}
                  className="rounded-full p-0.5 transition hover:bg-violet-100 dark:hover:bg-violet-800/40"
                >
                  <X size={9} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card/30 px-3 py-2 text-[11px] text-[var(--gray-400)]">
            Nenhum item seleccionado.
          </div>
        )}

        <DropdownPortal anchorRef={ref} portalRef={portalRef} open={open}>
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-2 text-[11px] text-[var(--gray-500)]">Carregando...</div>
            ) : visibleOptions.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-[var(--gray-400)]">Sem resultados</div>
            ) : (
              visibleOptions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    addOption(item)
                  }}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-[12px] transition hover:bg-amber-50/70 dark:hover:bg-white/10"
                >
                  <span className="truncate text-[var(--text)]">{buildLabel(item)}</span>
                  {buildMeta(item) ? (
                    <span className="truncate text-[10px] text-[var(--gray-400)]">{buildMeta(item)}</span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </DropdownPortal>
      </div>
    </FieldRow>
  )
}

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STEPS.map((item, index) => {
        const done = step > item.id
        const active = step === item.id
        return (
          <div key={item.id} className="flex items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                done
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300"
                  : active
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-white/40 text-[var(--gray-500)] dark:bg-white/[0.05]"
              }`}
            >
              <span
                className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                  done
                    ? "bg-amber-500 text-white"
                    : active
                      ? "bg-white/25 text-white"
                      : "bg-white/70 text-[var(--gray-500)] dark:bg-white/10"
                }`}
              >
                {done ? <Check size={9} /> : item.id}
              </span>
              {item.icon}
              {item.label}
            </div>
            {index < STEPS.length - 1 ? <span className="h-px w-5 bg-amber-200 dark:bg-white/10" /> : null}
          </div>
        )
      })}
    </div>
  )
}

function BoolCard({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string
  description: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-start gap-2 rounded-xl border p-3 text-left transition ${
        checked
          ? "border-emerald-300 bg-emerald-50/70 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"
          : "border-white/30 bg-white/25 text-[var(--gray-600)] hover:border-amber-300 dark:border-white/10 dark:bg-white/[0.03]"
      }`}
    >
      <span
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          checked ? "bg-emerald-500 text-white" : "border-2 border-[var(--gray-300)] dark:border-white/20"
        }`}
      >
        {checked ? <Check size={11} /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold">{label}</span>
        <span className="block text-[10px] opacity-75">{description}</span>
      </span>
    </button>
  )
}

export default function NewPreoperativeAssessmentPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [patient, setPatient] = useState<SearchValue | null>(null)
  const [selectedContext, setSelectedContext] = useState<SurgicalContextValue | null>(null)
  const [evaluator, setEvaluator] = useState<SearchValue | null>(null)
  const [assessedAt, setAssessedAt] = useState("")

  // patient → scheduled requests/surgeries → procedures/surgeries of the selected context
  const [patientRequests, setPatientRequests] = useState<any[]>([])
  const [scheduledSurgeries, setScheduledSurgeries] = useState<any[]>([])
  const [loadingContext, setLoadingContext] = useState(false)
  const [selectedSurgeries, setSelectedSurgeries] = useState<any[]>([])

  const [asaClass, setAsaClass] = useState("UNKNOWN")
  const [surgicalRisk, setSurgicalRisk] = useState("")
  const [medicalEvaluation, setMedicalEvaluation] = useState("")
  const [anestheticEvaluation, setAnestheticEvaluation] = useState("")
  const [status, setStatus] = useState("PENDING")

  const [examResultsReviewed, setExamResultsReviewed] = useState(false)
  const [fitForSurgery, setFitForSurgery] = useState<boolean | null>(null)
  const [consentSigned, setConsentSigned] = useState(false)
  const [observations, setObservations] = useState("")
  const [selectedLaboratoryExams, setSelectedLaboratoryExams] = useState<SearchValue[]>([])
  const [selectedMedicalExams, setSelectedMedicalExams] = useState<SearchValue[]>([])

  const requestLookup = useMemo(
    () => new Map(patientRequests.map((request) => [request.id, request])),
    [patientRequests]
  )

  const requestOptions = useMemo(() => {
    const seen = new Set<number>()
    const options: any[] = []

    for (const surgery of scheduledSurgeries) {
      const requestId = Number(surgery?.surgical_request)
      if (!requestId || seen.has(requestId)) continue
      seen.add(requestId)
      options.push(
        requestLookup.get(requestId) ?? {
          id: requestId,
          custom_id: surgery?.surgical_request_code || `#${requestId}`,
          requested_procedure: surgery?.procedure || "",
          clinical_diagnosis: "",
          status: "AGENDADA",
          priority: surgery?.priority || "",
        }
      )
    }

    return options
  }, [requestLookup, scheduledSurgeries])

  const standaloneSurgeries = useMemo(
    () => scheduledSurgeries.filter((surgery) => !Number(surgery?.surgical_request)),
    [scheduledSurgeries]
  )

  const selectedRequestRow = useMemo(() => {
    if (selectedContext?.kind !== "request") return null
    return requestLookup.get(selectedContext.id) ?? requestOptions.find((request) => request.id === selectedContext.id) ?? null
  }, [selectedContext, requestLookup, requestOptions])

  const contextSurgeries = useMemo(() => {
    if (!selectedContext) return []
    if (selectedContext.kind === "request") {
      return scheduledSurgeries.filter((surgery) => Number(surgery?.surgical_request) === selectedContext.id)
    }
    return scheduledSurgeries.filter((surgery) => Number(surgery?.id) === selectedContext.id)
  }, [selectedContext, scheduledSurgeries])

  const contextProcedures = useMemo(
    () => buildProcedureSummaries(contextSurgeries, selectedRequestRow?.requested_procedure),
    [contextSurgeries, selectedRequestRow?.requested_procedure]
  )

  // step 1: patient change → refresh scheduled requests/surgeries
  useEffect(() => {
    setSelectedContext(null)
    setPatientRequests([])
    setScheduledSurgeries([])
    setSelectedSurgeries([])

    if (!patient?.id) return

    let active = true
    setLoadingContext(true)

    async function loadPatientContext() {
      try {
        const [reqPayload, surgPayload] = await Promise.all([
          apiFetch<any>(`/surgery/surgical_request/?patient=${patient.id}&page_size=200&ordering=-created_at`).catch(() => null),
          apiFetch<any>(`/surgery/surgery/?patient=${patient.id}&page_size=200&ordering=-scheduled_for&status=AGENDADA`).catch(() => null),
        ])
        if (!active) return
        const reqs = uniqueRowsById(
          listRows(reqPayload).filter((row) => row.patient === patient.id || Number(row.patient) === patient.id)
        ).filter((row) => !["CANCELLED", "REJECTED"].includes(String(row?.status || "")))
        const surgs = uniqueRowsById(
          listRows(surgPayload).filter((row) => row.patient === patient.id || Number(row.patient) === patient.id)
        )
        setPatientRequests(reqs)
        setScheduledSurgeries(surgs)
      } finally {
        if (active) setLoadingContext(false)
      }
    }

    loadPatientContext().catch(() => { if (active) setLoadingContext(false) })
    return () => { active = false }
  }, [patient?.id])

  const canNextStepOne = !!patient
  const canNextStepTwo = !!asaClass && !!status

  async function submit() {
    setSaving(true)
    setError(null)

    try {
      const body: Record<string, any> = {
        patient: patient?.id,
        status,
        asa_class: asaClass || undefined,
        surgical_risk: surgicalRisk || undefined,
        medical_evaluation: medicalEvaluation || undefined,
        anesthetic_evaluation: anestheticEvaluation || undefined,
        exam_results_reviewed: examResultsReviewed,
        consent_signed: consentSigned,
        observations: observations || undefined,
        assessed_at: assessedAt || undefined,
      }

      if (fitForSurgery !== null) body.fit_for_surgery = fitForSurgery
      if (evaluator) body.evaluator = evaluator.id
      if (selectedContext?.kind === "request") body.surgical_request = selectedContext.id
      const first = selectedSurgeries[0]
      if (first) body.proposed_surgery = first.id
      // exams: send PKs — backend creates LabRequest + MedicalRequest automatically
      if (selectedLaboratoryExams.length) body.laboratory_exams = selectedLaboratoryExams.map(e => e.id)
      if (selectedMedicalExams.length)    body.medical_exams    = selectedMedicalExams.map(e => e.id)

      const response = await apiFetch<any>("/surgery/avaliacao_pre_operatoria/", {
        method: "POST",
        body: JSON.stringify(body),
      })
      router.push(`/surgery/preoperative-assessments/${response.id}`)
    } catch (err: any) {
      setError(err?.message || "Erro ao guardar avaliação pré-operatória.")
      setSaving(false)
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
      <div className="mx-auto w-full max-w-2xl space-y-2 px-1 py-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-amber-400" />
          <div className="flex flex-col gap-2 px-3 py-3 pl-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href="/surgery/preoperative-assessments" className="hover:text-foreground">Avaliações pré-op.</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">Nova</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <Stethoscope size={13} className="text-amber-500" />
                <h1 className="font-display text-sm font-semibold text-foreground">Registar avaliação pré-operatória</h1>
              </div>
              <p className="mt-1 max-w-xl text-[11px] text-[var(--gray-500)]">
                Registe a aptidão clínica e anestésica do paciente antes da cirurgia, no mesmo padrão visual dos restantes fluxos do módulo.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                href="/surgery/preoperative-assessments"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted"
              >
                <ArrowLeft size={11} /> Cancelar
              </Link>
            </div>
          </div>
        </section>

        <section className={`${GLASS} px-3 py-2.5`}>
          <StepBar step={step} />
        </section>

        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-300/50 bg-rose-50/70 px-4 py-3 text-sm text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertCircle size={14} /> {error}
          </div>
        ) : null}

        {step === 1 ? (
          <SurfaceCard
            title="1 · Paciente e pedido"
            subtitle="Seleccione o paciente; depois escolha o pedido ou cirurgia marcada e, em seguida, as cirurgias do contexto."
            icon={<User size={13} />}
            accent="bg-sky-400"
          >
            {/* ── Paciente + Avaliador ── */}
            <div className="grid gap-3 sm:grid-cols-2">
              <SearchSelect
                label="Paciente"
                endpoint="/clinical/patient/"
                value={patient}
                onChange={setPatient}
                required
                placeholder="Pesquisar paciente..."
                getOptionLabel={(item) => [item?.name, item?.document_number].filter(Boolean).join(" - ")}
              />
              <SearchSelect
                label="Avaliador"
                endpoint="/consultations/doctors/"
                value={evaluator}
                onChange={setEvaluator}
                placeholder="Pesquisar médico avaliador..."
                getOptionLabel={(item) => [item?.name, item?.profession_name].filter(Boolean).join(" - ")}
              />
            </div>

            {/* ── Pedidos/cirurgias agendadas do paciente ── */}
            <div className="mt-4">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">Pedidos e cirurgias agendadas</span>
                {loadingContext && <Loader2 size={10} className="animate-spin text-[var(--gray-400)]" />}
              </div>
              {!patient ? (
                <div className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-2.5 text-[11px] text-[var(--gray-400)]">
                  Seleccione um paciente para ver os pedidos e cirurgias não realizadas.
                </div>
              ) : loadingContext ? (
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-2.5 text-[11px] text-[var(--gray-400)]">
                  <Loader2 size={11} className="animate-spin" /> A carregar contexto cirúrgico...
                </div>
              ) : (
                <div className="space-y-3">
                  {requestOptions.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--gray-500)]">
                        Pedidos com cirurgias marcadas
                      </p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {requestOptions.map((req) => {
                          const selected = selectedContext?.kind === "request" && selectedContext.id === req.id
                          return (
                            <button
                              key={req.id}
                              type="button"
                              onClick={() => {
                                setSelectedSurgeries([])
                                setSelectedContext(selected ? null : { kind: "request", id: req.id, label: req.custom_id })
                              }}
                              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-[11px] transition ${
                                selected ? "border-sky-400 bg-sky-50 dark:border-sky-600/50 dark:bg-sky-900/20" : "border-border bg-card/60 hover:border-sky-300"
                              }`}
                            >
                              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${selected ? "bg-sky-500 text-white" : "border-2 border-[var(--gray-300)]"}`}>
                                {selected && <Check size={9} />}
                              </span>
                              <span>
                                <span className="block font-semibold text-foreground">{req.custom_id}</span>
                                <span className="block text-[10px] text-[var(--gray-500)]">
                                  {[req.requested_procedure || req.clinical_diagnosis, req.status, req.priority].filter(Boolean).join(" · ")}
                                </span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {standaloneSurgeries.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--gray-500)]">
                        Cirurgias marcadas sem pedido formal
                      </p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {standaloneSurgeries.map((surgery) => {
                          const selected = selectedContext?.kind === "surgery" && selectedContext.id === surgery.id
                          const firstProcedure = surgery?.procedure_names?.[0] || surgery?.procedure || "—"
                          return (
                            <button
                              key={surgery.id}
                              type="button"
                              onClick={() => {
                                setSelectedSurgeries([])
                                setSelectedContext(selected ? null : { kind: "surgery", id: surgery.id, label: surgery.custom_id })
                              }}
                              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-[11px] transition ${
                                selected ? "border-amber-400 bg-amber-50 dark:border-amber-600/50 dark:bg-amber-900/20" : "border-border bg-card/60 hover:border-amber-300"
                              }`}
                            >
                              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${selected ? "bg-amber-500 text-white" : "border-2 border-[var(--gray-300)]"}`}>
                                {selected && <Check size={9} />}
                              </span>
                              <span>
                                <span className="block font-semibold text-foreground">{surgery.custom_id}</span>
                                <span className="block truncate text-[10px] text-[var(--gray-500)]">
                                  {[firstProcedure, labelSurgerySize(surgery?.surgery_size), surgery?.status].filter(Boolean).join(" · ")}
                                </span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {requestOptions.length === 0 && standaloneSurgeries.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 px-3 py-2.5 text-[11px] text-amber-600 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-400">
                      Nenhum pedido com cirurgia marcada nem cirurgia agendada foi encontrado para este paciente.
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">Procedimentos do contexto seleccionado</span>
              </div>
              {!selectedContext ? (
                <div className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-2.5 text-[11px] text-[var(--gray-400)]">
                  Seleccione primeiro um pedido ou uma cirurgia marcada para ver os procedimentos correspondentes.
                </div>
              ) : contextProcedures.length === 0 ? (
                <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 px-3 py-2.5 text-[11px] text-amber-600 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-400">
                  Nenhum procedimento cirúrgico foi encontrado neste contexto.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {contextProcedures.map((procedure) => (
                    <span
                      key={procedure.key}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
                    >
                      {procedure.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">
                  {selectedContext?.kind === "request" ? "Cirurgias do pedido seleccionado" : "Cirurgias do contexto seleccionado"}
                </span>
                {contextSurgeries.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = contextSurgeries.every((surgery) => selectedSurgeries.some((item) => item.id === surgery.id))
                      setSelectedSurgeries(
                        allSelected
                          ? []
                          : contextSurgeries.map((surgery) => ({ id: surgery.id, label: surgery.custom_id }))
                      )
                    }}
                    className="text-[10px] font-semibold text-sky-600 hover:underline dark:text-sky-400"
                  >
                    {contextSurgeries.every((surgery) => selectedSurgeries.some((item) => item.id === surgery.id))
                      ? "Desseleccionar todas"
                      : "Seleccionar todas"}
                  </button>
                ) : null}
              </div>

              {!selectedContext ? (
                <div className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-2.5 text-[11px] text-[var(--gray-400)]">
                  Seleccione primeiro um pedido ou uma cirurgia marcada para abrir a selecção de cirurgias.
                </div>
              ) : contextSurgeries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 px-3 py-2.5 text-[11px] text-amber-600 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-400">
                  Nenhuma cirurgia agendada foi encontrada neste contexto.
                </div>
              ) : (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {contextSurgeries.map((surgery) => {
                    const selected = selectedSurgeries.some((item) => item.id === surgery.id)
                    const firstProcedure = surgery?.procedure_names?.[0] || surgery?.procedure || "—"
                    const size = labelSurgerySize(surgery?.surgery_size)
                    return (
                      <button
                        key={surgery.id}
                        type="button"
                        onClick={() => setSelectedSurgeries((previous) =>
                          selected
                            ? previous.filter((item) => item.id !== surgery.id)
                            : [...previous, { id: surgery.id, label: surgery.custom_id }]
                        )}
                        className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-[11px] transition ${
                          selected ? "border-violet-400 bg-violet-50 dark:border-violet-600/50 dark:bg-violet-900/20" : "border-border bg-card/60 hover:border-violet-300"
                        }`}
                      >
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${selected ? "bg-violet-500 text-white" : "border-2 border-[var(--gray-300)]"}`}>
                          {selected && <Check size={9} />}
                        </span>
                        <span>
                          <span className="block font-semibold text-foreground">{surgery.custom_id}</span>
                          <span className="block truncate text-[10px] text-[var(--gray-500)]">
                            {[firstProcedure, size, surgery?.status].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-3">
              <FieldRow label="Avaliado em">
                <input type="datetime-local" className={inputCls} value={assessedAt}
                  onChange={(e) => setAssessedAt(e.target.value)} />
              </FieldRow>
            </div>
          </SurfaceCard>
        ) : null}

        {step === 2 ? (
          <SurfaceCard
            title="2 · Avaliação clínica"
            subtitle="Classificação ASA, risco cirúrgico e parecer clínico."
            icon={<Stethoscope size={13} />}
            accent="bg-emerald-400"
          >
            <FieldRow label="Classificação ASA" required>
              <div className="grid gap-2 sm:grid-cols-3">
                {ASA_OPTIONS.map((option) => {
                  const selected = asaClass === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAsaClass(option.value)}
                      className={`rounded-lg border px-3 py-2 text-left transition ${
                        selected
                          ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-600/60 dark:bg-amber-900/20 dark:text-amber-200"
                          : "border-white/30 bg-white/25 hover:border-amber-300 dark:border-white/10 dark:bg-white/[0.03]"
                      }`}
                    >
                      <div className={`text-[11px] font-semibold ${selected ? "text-amber-800 dark:text-amber-200" : "text-foreground"}`}>{option.label}</div>
                      <div className="mt-0.5 text-[10px] text-[var(--gray-500)]">{option.description}</div>
                    </button>
                  )
                })}
              </div>
            </FieldRow>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <FieldRow label="Risco cirúrgico">
                <input
                  className={inputCls}
                  placeholder="Ex.: Baixo, moderado, alto..."
                  value={surgicalRisk}
                  onChange={(event) => setSurgicalRisk(event.target.value)}
                />
              </FieldRow>
              <FieldRow label="Estado da avaliação" required>
                <select className={inputCls} value={status} onChange={(event) => setStatus(event.target.value)}>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </FieldRow>
            </div>

            <div className="mt-3 grid gap-3">
              <FieldRow label="Avaliação médica">
                <textarea
                  rows={4}
                  className={textareaCls}
                  value={medicalEvaluation}
                  onChange={(event) => setMedicalEvaluation(event.target.value)}
                  placeholder="Resumo clínico, comorbilidades e factores de risco..."
                />
              </FieldRow>
              <FieldRow label="Avaliação anestésica">
                <textarea
                  rows={4}
                  className={textareaCls}
                  value={anestheticEvaluation}
                  onChange={(event) => setAnestheticEvaluation(event.target.value)}
                  placeholder="Via aérea, necessidade anestésica, recomendações e precauções..."
                />
              </FieldRow>
            </div>
          </SurfaceCard>
        ) : null}

        {step === 3 ? (
          <SurfaceCard
            title="3 · Exames e conclusão"
            subtitle="Exames médicos, exames laboratoriais, consentimento, aptidão e observações finais."
            icon={<ClipboardCheck size={13} />}
            accent="bg-violet-400"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <MultiSearchSelect
                label="Exames laboratoriais"
                endpoint="/clinical_laboratory/test/"
                values={selectedLaboratoryExams}
                onChange={setSelectedLaboratoryExams}
                placeholder="Pesquisar exame laboratorial..."
                extraParams={{ active: "true" }}
                getOptionLabel={(item) => item?.name || item?.code || `#${item?.id}`}
                getOptionMeta={(item) => [
                  item?.code,
                  item?.sector_name,
                  item?.sample_type,
                ].filter(Boolean).join(" · ")}
              />
              <MultiSearchSelect
                label="Exames médicos"
                endpoint="/clinical/medicalexam/"
                values={selectedMedicalExams}
                onChange={setSelectedMedicalExams}
                placeholder="Pesquisar exame médico..."
                getOptionLabel={(item) => item?.name || item?.custom_id || `#${item?.id}`}
                getOptionMeta={(item) => [
                  item?.method,
                  item?.sector,
                ].filter(Boolean).join(" · ")}
              />
            </div>

            <div className="mt-3 rounded-xl border border-violet-200/60 bg-violet-50/50 px-3 py-2.5 text-[11px] text-violet-700 dark:border-violet-800/30 dark:bg-violet-900/10 dark:text-violet-200">
              Ao guardar, os exames seleccionados geram automaticamente requisições no fluxo clínico já existente.
              Os laboratoriais seguem para receção, enfermagem e laboratório; os médicos ficam na fila de requisições clínicas para encaminhamento.
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <BoolCard
                label="Exames revistos"
                description="Confirma que os resultados laboratoriais e complementares já foram analisados."
                checked={examResultsReviewed}
                onToggle={() => setExamResultsReviewed((current) => !current)}
              />
              <BoolCard
                label="Consentimento assinado"
                description="Marca o consentimento informado como obtido antes do procedimento."
                checked={consentSigned}
                onToggle={() => setConsentSigned((current) => !current)}
              />
            </div>

            <div className="mt-3 rounded-xl border border-white/30 bg-white/25 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">Aptidão para cirurgia</div>
              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setFitForSurgery(true)}
                  className={`rounded-lg border px-3 py-2 text-[11px] font-semibold transition ${
                    fitForSurgery === true
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : "border-white/30 bg-white/25 text-[var(--gray-600)] hover:border-emerald-300 dark:border-white/10 dark:bg-white/[0.03]"
                  }`}
                >
                  <span className="inline-flex items-center gap-1"><CheckCircle2 size={11} /> Apto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFitForSurgery(false)}
                  className={`rounded-lg border px-3 py-2 text-[11px] font-semibold transition ${
                    fitForSurgery === false
                      ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300"
                      : "border-white/30 bg-white/25 text-[var(--gray-600)] hover:border-rose-300 dark:border-white/10 dark:bg-white/[0.03]"
                  }`}
                >
                  <span className="inline-flex items-center gap-1"><XCircle size={11} /> Inapto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFitForSurgery(null)}
                  className={`rounded-lg border px-3 py-2 text-[11px] font-semibold transition ${
                    fitForSurgery === null
                      ? "border-slate-300 bg-slate-50 text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-slate-200"
                      : "border-white/30 bg-white/25 text-[var(--gray-600)] hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03]"
                  }`}
                >
                  Não definido
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
              <FieldRow label="Observações clínicas">
                <textarea
                  rows={4}
                  className={textareaCls}
                  value={observations}
                  onChange={(event) => setObservations(event.target.value)}
                  placeholder="Notas finais, exames pendentes, cuidados adicionais e condicionantes..."
                />
              </FieldRow>
              <div className="rounded-xl border border-violet-200/60 bg-violet-50/50 p-3 dark:border-violet-800/30 dark:bg-violet-900/10">
                <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                  <FileText size={11} /> Resumo
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[var(--gray-500)]">Paciente</span>
                    <span className="text-right font-semibold text-foreground">{patient?.label || "—"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[var(--gray-500)]">Avaliador</span>
                    <span className="text-right font-semibold text-foreground">{evaluator?.label || "—"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[var(--gray-500)]">ASA</span>
                    <span className="text-right font-semibold text-foreground">{asaClass || "—"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[var(--gray-500)]">Estado</span>
                    <span className="text-right font-semibold text-foreground">
                      {STATUS_OPTIONS.find((option) => option.value === status)?.label || status}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[var(--gray-500)]">Exames LAB</span>
                    <span className="text-right font-semibold text-foreground">{selectedLaboratoryExams.length}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[var(--gray-500)]">Exames MED</span>
                    <span className="text-right font-semibold text-foreground">{selectedMedicalExams.length}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[var(--gray-500)]">Aptidão</span>
                    <span className="text-right font-semibold text-foreground">
                      {fitForSurgery === true ? "Apto" : fitForSurgery === false ? "Inapto" : "Não definido"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </SurfaceCard>
        ) : null}

        <section className={`${GLASS} px-3 py-2.5`}>
          <div className="flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((current) => current - 1)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] text-muted-foreground transition hover:bg-muted"
              >
                <ArrowLeft size={13} /> Anterior
              </button>
            ) : (
              <Link
                href="/surgery/preoperative-assessments"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] text-muted-foreground transition hover:bg-muted"
              >
                <ArrowLeft size={13} /> Cancelar
              </Link>
            )}

            {step < STEPS.length ? (
              <button
                type="button"
                disabled={step === 1 ? !canNextStepOne : !canNextStepTwo}
                onClick={() => setStep((current) => current + 1)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-600 px-4 text-[12px] font-semibold text-white transition hover:bg-amber-700 disabled:opacity-40 dark:bg-amber-500/80 dark:hover:bg-amber-500"
              >
                Seguinte <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving || !canNextStepOne || !canNextStepTwo}
                onClick={submit}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-600 px-4 text-[12px] font-semibold text-white transition hover:bg-amber-700 disabled:opacity-40 dark:bg-amber-500/80 dark:hover:bg-amber-500"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {saving ? "A guardar..." : "Guardar avaliação"}
              </button>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
