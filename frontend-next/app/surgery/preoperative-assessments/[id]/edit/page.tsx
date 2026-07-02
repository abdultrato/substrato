"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { useParams, useRouter } from "next/navigation"
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
  { value: "ASA_I",   label: "ASA I",         description: "Paciente saudável." },
  { value: "ASA_II",  label: "ASA II",        description: "Doença sistémica ligeira." },
  { value: "ASA_III", label: "ASA III",       description: "Doença sistémica grave." },
  { value: "ASA_IV",  label: "ASA IV",        description: "Risco de vida constante." },
  { value: "ASA_V",   label: "ASA V",         description: "Moribundo sem cirurgia." },
  { value: "ASA_VI",  label: "ASA VI",        description: "Morte cerebral, dador." },
  { value: "UNKNOWN", label: "Desconhecido",  description: "Classificação ainda não definida." },
]

const STATUS_OPTIONS = [
  { value: "PENDING",           label: "Pendente" },
  { value: "IN_PROGRESS",       label: "Em curso" },
  { value: "FIT",               label: "Apto" },
  { value: "TEMPORARILY_UNFIT", label: "Temporariamente inapto" },
  { value: "UNFIT",             label: "Inapto" },
  { value: "REQUIRES_EXAMS",    label: "Requer exames" },
]

const STEPS = [
  { id: 1, label: "Paciente e pedido",  icon: <User size={12} /> },
  { id: 2, label: "Avaliação clínica",  icon: <Stethoscope size={12} /> },
  { id: 3, label: "Exames e conclusão", icon: <ClipboardCheck size={12} /> },
]

type SearchValue = { id: number; label: string; meta?: string }
type SurgicalContextValue = { kind: "request" | "surgery"; id: number; label: string }
type ProcedureSummary = { key: string; label: string; matchKeys: string[] }

/* ── helpers ── */
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

function normalizePatientText(value: string): string {
  return String(value || "")
    .split(" - ")[0]
    .trim()
    .toLowerCase()
}

function rowMatchesPatient(row: any, patientId: number, patientName: string): boolean {
  if (Number(row?.patient) === patientId) return true
  return normalizePatientText(row?.patient_name || "") === patientName
}

function splitProcedureText(value: string): string[] {
  return String(value || "")
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
}

function normalizeProcedureText(value: string): string {
  return String(value || "").trim().toLowerCase()
}

function buildProcedureKey(label: string, id?: number | string): string {
  const cleanId = id === undefined || id === null || id === "" ? null : String(id)
  if (cleanId) return `id:${cleanId}`
  return `text:${normalizeProcedureText(label)}`
}

function buildProcedureSummaries(surgeries: any[], requestedProcedure?: string): ProcedureSummary[] {
  const summaries: ProcedureSummary[] = []
  const seen = new Set<string>()

  function push(label: string, id?: number | string) {
    const clean = String(label || "").trim()
    if (!clean) return
    const key = buildProcedureKey(clean, id)
    if (seen.has(key)) return
    seen.add(key)
    const matchKeys = Array.from(new Set([key, buildProcedureKey(clean)]))
    summaries.push({ key, label: clean, matchKeys })
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

function getSurgeryProcedureKeys(surgery: any): string[] {
  const procedureIds = Array.isArray(surgery?.procedures) ? surgery.procedures : []
  const names = Array.isArray(surgery?.procedure_names) && surgery.procedure_names.length
    ? surgery.procedure_names
    : splitProcedureText(surgery?.procedure || "")
  const keys = new Set<string>()

  if (names.length) {
    names.forEach((name: string, index: number) => {
      const id = procedureIds[index]
      keys.add(buildProcedureKey(name, id))
      keys.add(buildProcedureKey(name))
    })
  } else if (surgery?.procedure) {
    splitProcedureText(surgery.procedure).forEach((name) => keys.add(buildProcedureKey(name)))
  }

  return Array.from(keys)
}

function labelSurgerySize(value: string): string {
  if (value === "GRANDE") return "Grande"
  if (value === "PEQUENA") return "Pequena"
  return value || ""
}

function sameStringArray(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

function FieldRow({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">
        {label}{required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      {children}
    </div>
  )
}

function SurfaceCard({ title, subtitle, icon, accent, children }: {
  title: string; subtitle?: string; icon: React.ReactNode; accent: string; children: React.ReactNode
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

function BoolCard({ label, description, checked, onToggle }: {
  label: string; description: string; checked: boolean; onToggle: () => void
}) {
  return (
    <button type="button" onClick={onToggle}
      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
        checked
          ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-700/40 dark:bg-emerald-900/10"
          : "border-amber-200/60 bg-white/20 hover:border-amber-300 dark:border-white/10 dark:bg-white/[0.03]"
      }`}>
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${
        checked ? "bg-emerald-500 text-white" : "border-2 border-[var(--gray-300)]"
      }`}>
        {checked && <Check size={9} />}
      </span>
      <span>
        <span className="block text-[11px] font-semibold text-foreground">{label}</span>
        <span className="block text-[10px] opacity-75">{description}</span>
      </span>
    </button>
  )
}

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => {
        const done = step > s.id
        const active = step === s.id
        return (
          <div key={s.id} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
              active ? "bg-amber-500 text-white" : done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "text-[var(--gray-400)]"
            }`}>
              {done ? <Check size={10} /> : s.icon}
              <span className="hidden sm:inline">{s.label}</span>
              {!done && !active && <span className="sm:hidden">{s.id}</span>}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-4 shrink-0 ${step > s.id ? "bg-emerald-300" : "bg-[var(--gray-200)]"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── DropdownPortal ── */
function DropdownPortal({ anchorRef, portalRef, open, children }: {
  anchorRef: React.RefObject<HTMLDivElement | null>
  portalRef: React.RefObject<HTMLDivElement | null>
  open: boolean; children: React.ReactNode
}) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!open || !anchorRef.current) return
    function update() {
      if (!anchorRef.current) return
      const r = anchorRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update) }
  }, [anchorRef, open])
  if (!open || !mounted || !pos) return null
  return createPortal(
    <div ref={portalRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="rounded-xl border border-amber-200 bg-white shadow-xl backdrop-blur-md dark:border-white/20 dark:bg-zinc-900/90">
      {children}
    </div>, document.body
  )
}

/* ── SearchSelect (single) ── */
function SearchSelect({ label, endpoint, value, onChange, required, placeholder, getOptionLabel }: {
  label: string; endpoint: string; value: SearchValue | null
  onChange: (v: SearchValue | null) => void; required?: boolean
  placeholder?: string; getOptionLabel?: (item: any) => string
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

  const doSearch = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ limit: "20" })
      if (q.trim()) p.set("search", q.trim())
      const r = await apiFetch<any>(`${endpoint}?${p}`)
      setOptions(Array.isArray(r) ? r : (r.results || []))
    } catch { setOptions([]) } finally { setLoading(false) }
  }, [endpoint])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => doSearch(query), 250)
    return () => clearTimeout(t)
  }, [open, query, doSearch])

  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node
      if (ref.current?.contains(t) || portalRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  return (
    <FieldRow label={label} required={required}>
      <div ref={ref}>
        {value ? (
          <div className={`${inputCls} flex items-center justify-between gap-2`}>
            <span className="truncate text-[12px] text-foreground">{value.label}</span>
            <button type="button" onClick={() => onChange(null)} className="shrink-0 text-[var(--gray-400)] hover:text-rose-500">
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className={`${inputCls} flex items-center gap-2`} onClick={() => setOpen(true)}>
            <Search size={10} className="shrink-0 text-[var(--gray-400)]" />
            <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)} placeholder={placeholder || "Pesquisar..."}
              className="flex-1 bg-transparent text-[12px] outline-none placeholder-[var(--gray-400)]" />
            {loading && <Loader2 size={10} className="animate-spin text-[var(--gray-400)]" />}
          </div>
        )}
        <DropdownPortal anchorRef={ref} portalRef={portalRef} open={open && !value}>
          {options.length === 0
            ? <div className="px-3 py-2 text-[11px] text-[var(--gray-400)]">{loading ? "A pesquisar…" : "Sem resultados."}</div>
            : options.map(item => (
              <button key={item.id} type="button"
                onClick={() => { onChange({ id: item.id, label: buildLabel(item) }); setOpen(false); setQuery("") }}
                className="flex w-full items-center gap-2 border-b border-amber-100/60 px-3 py-1.5 text-left text-[11px] last:border-b-0 hover:bg-amber-50/60 dark:border-white/5 dark:hover:bg-white/5">
                <span className="flex-1 text-foreground">{buildLabel(item)}</span>
              </button>
            ))}
        </DropdownPortal>
      </div>
    </FieldRow>
  )
}

/* ── MultiSearchSelect ── */
function MultiSearchSelect({ label, endpoint, values, onChange, placeholder, extraParams, getOptionLabel, getOptionMeta }: {
  label: string; endpoint: string; values: SearchValue[]
  onChange: (v: SearchValue[]) => void; placeholder?: string
  extraParams?: Record<string, string>
  getOptionLabel?: (item: any) => string; getOptionMeta?: (item: any) => string
}) {
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)
  const selectedIds = new Set(values.map(v => v.id))

  const buildLabel = useCallback((item: any) => getOptionLabel ? getOptionLabel(item) : item?.name || item?.custom_id || `#${item?.id}`, [getOptionLabel])
  const buildMeta  = useCallback((item: any) => getOptionMeta  ? getOptionMeta(item)  : "", [getOptionMeta])

  const doSearch = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ limit: "20", ...(extraParams ?? {}) })
      if (q.trim()) p.set("search", q.trim())
      const r = await apiFetch<any>(`${endpoint}?${p}`)
      setOptions(Array.isArray(r) ? r : (r.results || []))
    } catch { setOptions([]) } finally { setLoading(false) }
  }, [endpoint, extraParams])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => doSearch(query), 250)
    return () => clearTimeout(t)
  }, [open, query, doSearch])

  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node
      if (ref.current?.contains(t) || portalRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  const visibleOptions = options.filter(o => !selectedIds.has(o.id))

  return (
    <FieldRow label={label}>
      <div ref={ref} className="space-y-1.5">
        <div className={`${inputCls} flex items-center gap-2`} onClick={() => setOpen(true)}>
          <Search size={10} className="shrink-0 text-[var(--gray-400)]" />
          <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)} placeholder={placeholder || "Pesquisar..."}
            className="flex-1 bg-transparent text-[12px] outline-none placeholder-[var(--gray-400)]" />
          {loading && <Loader2 size={10} className="animate-spin text-[var(--gray-400)]" />}
        </div>
        {values.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {values.map(v => (
              <span key={v.id} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300">
                {v.label}
                <button type="button" onClick={() => onChange(values.filter(x => x.id !== v.id))} className="text-amber-400 hover:text-rose-500"><X size={9} /></button>
              </span>
            ))}
          </div>
        )}
        <DropdownPortal anchorRef={ref} portalRef={portalRef} open={open}>
          {visibleOptions.length === 0
            ? <div className="px-3 py-2 text-[11px] text-[var(--gray-400)]">{loading ? "A pesquisar…" : "Sem resultados."}</div>
            : visibleOptions.map(item => (
              <button key={item.id} type="button"
                onClick={() => { onChange([...values, { id: item.id, label: buildLabel(item), meta: buildMeta(item) || undefined }]); setQuery(""); setOpen(false) }}
                className="flex w-full items-center gap-2 border-b border-amber-100/60 px-3 py-1.5 text-left text-[11px] last:border-b-0 hover:bg-amber-50/60 dark:border-white/5 dark:hover:bg-white/5">
                <span className="flex-1 font-medium text-foreground">{buildLabel(item)}</span>
                {buildMeta(item) && <span className="text-[10px] text-[var(--gray-400)]">{buildMeta(item)}</span>}
              </button>
            ))}
        </DropdownPortal>
      </div>
    </FieldRow>
  )
}

/* ═══════════════════════════════════════════════════════════ */
export default function EditPreoperativeAssessmentPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [original, setOriginal] = useState<any>(null)

  /* step 1 */
  const [patient,         setPatient]         = useState<SearchValue | null>(null)
  const [evaluator,       setEvaluator]       = useState<SearchValue | null>(null)
  const [selectedContext, setSelectedContext] = useState<SurgicalContextValue | null>(null)
  const [assessedAt,      setAssessedAt]      = useState("")
  const [status,          setStatus]          = useState("PENDING")
  const [patientRequests, setPatientRequests] = useState<any[]>([])
  const [scheduledSurgeries, setScheduledSurgeries] = useState<any[]>([])
  const [loadingContext, setLoadingContext] = useState(false)
  const [selectedSurgeries, setSelectedSurgeries] = useState<SearchValue[]>([])
  const [selectedProcedureKeys, setSelectedProcedureKeys] = useState<string[]>([])

  /* step 2 */
  const [asaClass,             setAsaClass]             = useState("UNKNOWN")
  const [surgicalRisk,         setSurgicalRisk]         = useState("")
  const [medicalEvaluation,    setMedicalEvaluation]    = useState("")
  const [anestheticEvaluation, setAnestheticEvaluation] = useState("")

  /* step 3 */
  const [selectedLabExams, setSelectedLabExams] = useState<SearchValue[]>([])
  const [selectedMedExams, setSelectedMedExams] = useState<SearchValue[]>([])
  const [examResultsReviewed, setExamResultsReviewed] = useState(false)
  const [fitForSurgery,       setFitForSurgery]       = useState<boolean | null>(null)
  const [consentSigned,       setConsentSigned]       = useState(false)
  const [observations,        setObservations]        = useState("")
  const previousPatientIdRef = useRef<number | null | undefined>(undefined)
  const hydratedSavedSelectionRef = useRef(false)
  const patientSearchTerm = useMemo(
    () => normalizePatientText(patient?.label || ""),
    [patient?.label]
  )
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
  const filteredContextSurgeries = useMemo(() => {
    if (selectedProcedureKeys.length === 0) return contextSurgeries
    return contextSurgeries.filter((surgery) => {
      const surgeryKeys = getSurgeryProcedureKeys(surgery)
      return selectedProcedureKeys.some((key) => surgeryKeys.includes(key))
    })
  }, [contextSurgeries, selectedProcedureKeys])
  const singleVisibleSurgery = useMemo(
    () => filteredContextSurgeries.length === 1 ? filteredContextSurgeries[0] : null,
    [filteredContextSurgeries]
  )
  const selectContext = useCallback((nextContext: SurgicalContextValue | null) => {
    hydratedSavedSelectionRef.current = true
    setSelectedContext(nextContext)
    setSelectedSurgeries([])
    setSelectedProcedureKeys([])
  }, [])

  /* load existing data */
  useEffect(() => {
    hydratedSavedSelectionRef.current = false
    apiFetch<any>(`/surgery/avaliacao_pre_operatoria/${id}/`)
      .then(d => {
        setOriginal(d)
        if (d.patient && d.patient_name)             setPatient({ id: d.patient, label: d.patient_name })
        if (d.evaluator && d.evaluator_name)         setEvaluator({ id: d.evaluator, label: d.evaluator_name })
        if (d.surgical_request && d.surgical_request_code) {
          setSelectedContext({ kind: "request", id: d.surgical_request, label: d.surgical_request_code })
        } else if (d.proposed_surgery && d.proposed_surgery_code) {
          setSelectedContext({ kind: "surgery", id: d.proposed_surgery, label: d.proposed_surgery_code })
        } else {
          setSelectedContext(null)
        }
        setSelectedSurgeries(
          d.proposed_surgery && d.proposed_surgery_code
            ? [{ id: d.proposed_surgery, label: d.proposed_surgery_code }]
            : []
        )
        if (d.assessed_at) setAssessedAt(d.assessed_at.slice(0, 16))
        setStatus(d.status || "PENDING")
        setAsaClass(d.asa_class || "UNKNOWN")
        setSurgicalRisk(d.surgical_risk || "")
        setMedicalEvaluation(d.medical_evaluation || "")
        setAnestheticEvaluation(d.anesthetic_evaluation || "")
        setExamResultsReviewed(!!d.exam_results_reviewed)
        setFitForSurgery(d.fit_for_surgery === true ? true : d.fit_for_surgery === false ? false : null)
        setConsentSigned(!!d.consent_signed)
        setObservations(d.observations || "")

        // populate exam lists from serializer fields or required_exams
        const labDetails = d.laboratory_exams_details || []
        const medDetails = d.medical_exams_details || []
        if (labDetails.length) {
          setSelectedLabExams(labDetails.map((e: any) => ({ id: e.id, label: e.name || e.code || `#${e.id}`, meta: e.sector_name })))
        }
        if (medDetails.length) {
          setSelectedMedExams(medDetails.map((e: any) => ({ id: e.id, label: e.name || `#${e.id}`, meta: e.method || e.modality })))
        }
        if (!labDetails.length && !medDetails.length && d.required_exams) {
          const raw = d.required_exams
          if (Array.isArray(raw)) {
            setSelectedLabExams(raw.filter((e: any) => typeof e === "string" && e.startsWith("LAB:")).map((e: string, i: number) => ({ id: -(i + 1), label: e.replace(/^LAB:\s*/, "") })))
            setSelectedMedExams(raw.filter((e: any) => typeof e === "string" && e.startsWith("MED:")).map((e: string, i: number) => ({ id: -(i + 1000), label: e.replace(/^MED:\s*/, "") })))
          } else if (typeof raw === "object" && raw !== null) {
            const le = raw.laboratory_exams || []
            const me = raw.medical_exams || []
            setSelectedLabExams(le.map((e: any) => ({ id: e.id, label: e.name || e.custom_id || `#${e.id}`, meta: e.sector_name })))
            setSelectedMedExams(me.map((e: any) => ({ id: e.id, label: e.name || `#${e.id}`, meta: e.method })))
          }
        }
      })
      .catch(e => setError(e?.message || "Erro ao carregar avaliação."))
      .finally(() => setLoadingData(false))
  }, [id])

  useEffect(() => {
    const currentPatientId = patient?.id ?? null
    const previousPatientId = previousPatientIdRef.current

    if (previousPatientId !== undefined && previousPatientId !== currentPatientId) {
      setSelectedContext(null)
      setSelectedSurgeries([])
      setSelectedProcedureKeys([])
    }

    previousPatientIdRef.current = currentPatientId
    setPatientRequests([])
    setScheduledSurgeries([])

    if (!patient?.id) return

    let active = true
    setLoadingContext(true)

    async function loadPatientContext() {
      try {
        const [requestPayload, surgeryPayload] = await Promise.all([
          apiFetch<any>(`/surgery/surgical_request/?patient=${patient.id}&page_size=200&ordering=-created_at`).catch(() => null),
          apiFetch<any>(`/surgery/surgery/?patient=${patient.id}&page_size=200&ordering=-scheduled_for&status=AGENDADA`).catch(() => null),
        ])

        if (!active) return

        setPatientRequests(
          uniqueRowsById(listRows(requestPayload).filter((row) => rowMatchesPatient(row, patient.id, patientSearchTerm)))
            .filter((row) => !["CANCELLED", "REJECTED"].includes(String(row?.status || "")))
        )
        setScheduledSurgeries(
          uniqueRowsById(listRows(surgeryPayload).filter((row) => rowMatchesPatient(row, patient.id, patientSearchTerm)))
        )
      } finally {
        if (active) setLoadingContext(false)
      }
    }

    loadPatientContext().catch(() => {
      if (active) setLoadingContext(false)
    })

    return () => {
      active = false
    }
  }, [patient?.id, patientSearchTerm])

  useEffect(() => {
    if (!original || !patient?.id || loadingContext || hydratedSavedSelectionRef.current) return

    const savedSurgeryId = Number(original?.proposed_surgery || 0)
    const savedRequestId = Number(original?.surgical_request || 0)
    const matchingSurgery = savedSurgeryId
      ? scheduledSurgeries.find((surgery) => Number(surgery?.id) === savedSurgeryId) ?? null
      : null

    let nextContext: SurgicalContextValue | null = null
    if (savedRequestId) {
      nextContext = {
        kind: "request",
        id: savedRequestId,
        label: original?.surgical_request_code || requestLookup.get(savedRequestId)?.custom_id || `#${savedRequestId}`,
      }
    } else if (savedSurgeryId) {
      nextContext = {
        kind: "surgery",
        id: savedSurgeryId,
        label: original?.proposed_surgery_code || matchingSurgery?.custom_id || `#${savedSurgeryId}`,
      }
    }

    const nextSelectedSurgeries = savedSurgeryId
      ? [{ id: savedSurgeryId, label: original?.proposed_surgery_code || matchingSurgery?.custom_id || `#${savedSurgeryId}` }]
      : []

    let nextProcedureKeys: string[] = []
    if (nextContext && matchingSurgery) {
      const targetSurgeries = nextContext.kind === "request"
        ? scheduledSurgeries.filter((surgery) => Number(surgery?.surgical_request) === nextContext.id)
        : scheduledSurgeries.filter((surgery) => Number(surgery?.id) === nextContext.id)
      const targetRequest = nextContext.kind === "request"
        ? requestLookup.get(nextContext.id) ?? requestOptions.find((request) => request.id === nextContext.id) ?? null
        : null
      const availableProcedures = buildProcedureSummaries(targetSurgeries, targetRequest?.requested_procedure)
      const surgeryKeys = new Set(getSurgeryProcedureKeys(matchingSurgery))

      nextProcedureKeys = availableProcedures
        .filter((procedure) => procedure.matchKeys.some((key) => surgeryKeys.has(key)))
        .map((procedure) => procedure.key)
    }

    setSelectedContext((current) => {
      if (!nextContext) return null
      if (current?.kind === nextContext.kind && current.id === nextContext.id && current.label === nextContext.label) return current
      return nextContext
    })
    setSelectedSurgeries((current) => {
      const alreadyLoaded = current.length === nextSelectedSurgeries.length
        && current.every((item, index) => item.id === nextSelectedSurgeries[index]?.id && item.label === nextSelectedSurgeries[index]?.label)
      return alreadyLoaded ? current : nextSelectedSurgeries
    })
    setSelectedProcedureKeys((current) => sameStringArray(current, nextProcedureKeys) ? current : nextProcedureKeys)
    hydratedSavedSelectionRef.current = true
  }, [
    loadingContext,
    original,
    patient?.id,
    requestLookup,
    requestOptions,
    scheduledSurgeries,
  ])

  useEffect(() => {
    const allowedIds = new Set(filteredContextSurgeries.map((surgery) => surgery.id))
    setSelectedSurgeries((previous) => {
      const next = previous.filter((item) => allowedIds.has(item.id))
      return next.length === previous.length ? previous : next
    })
  }, [filteredContextSurgeries])

  useEffect(() => {
    if (!singleVisibleSurgery) return
    setSelectedSurgeries((previous) => {
      if (previous.length === 1 && previous[0]?.id === singleVisibleSurgery.id) return previous
      return [{ id: singleVisibleSurgery.id, label: singleVisibleSurgery.custom_id }]
    })
  }, [singleVisibleSurgery])

  const canNext1 = !!patient
  const canNext2 = !!asaClass && !!status

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, any> = {
        status,
        asa_class: asaClass,
        surgical_risk: surgicalRisk,
        medical_evaluation: medicalEvaluation,
        anesthetic_evaluation: anestheticEvaluation,
        exam_results_reviewed: examResultsReviewed,
        consent_signed: consentSigned,
        observations,
        assessed_at: assessedAt || null,
      }
      if (patient)         body.patient          = patient.id
      if (evaluator)       body.evaluator        = evaluator.id
      if (fitForSurgery !== null) body.fit_for_surgery = fitForSurgery
      body.surgical_request = selectedContext?.kind === "request" ? selectedContext.id : null
      body.proposed_surgery = selectedSurgeries[0]?.id ?? null
      // send exam PKs — backend syncs LabRequest/MedicalRequest automatically
      body.laboratory_exams = selectedLabExams.filter(e => e.id > 0).map(e => e.id)
      body.medical_exams    = selectedMedExams.filter(e => e.id > 0).map(e => e.id)

      await apiFetch(`/surgery/avaliacao_pre_operatoria/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })

      router.push(`/surgery/preoperative-assessments/${id}`)
    } catch (err: any) {
      setError(err?.message || "Erro ao guardar alterações.")
      setSaving(false)
    }
  }

  if (loadingData) return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-[var(--gray-500)]">
        <Loader2 size={16} className="animate-spin" /> A carregar dados...
      </div>
    </AppLayout>
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
      <div className="mx-auto w-full max-w-2xl space-y-2 px-1 py-1">

        {/* ── HERO ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-amber-400" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-400/10 via-transparent to-transparent" />
          <div className="relative flex flex-col gap-2 px-3 py-3 pl-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href="/surgery/preoperative-assessments" className="hover:text-foreground">Avaliações pré-op.</Link>
                <span>/</span>
                <Link href={`/surgery/preoperative-assessments/${id}`} className="hover:text-foreground">{original?.custom_id || `#${id}`}</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">Editar</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <Stethoscope size={13} className="text-amber-500" />
                <h1 className="font-display text-sm font-semibold text-foreground">
                  Editar avaliação pré-operatória
                </h1>
              </div>
              {original?.patient_name && (
                <p className="mt-0.5 text-[11px] text-[var(--gray-500)]">
                  Paciente: <span className="font-semibold text-foreground">{original.patient_name}</span>
                  {original?.custom_id && <span className="ml-2 font-mono text-[10px] text-[var(--gray-400)]">{original.custom_id}</span>}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Link href={`/surgery/preoperative-assessments/${id}`}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:bg-muted">
                <ArrowLeft size={11} /> Cancelar
              </Link>
            </div>
          </div>
        </section>

        {/* step bar */}
        <section className={`${GLASS} px-3 py-2.5`}>
          <StepBar step={step} />
        </section>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-300/50 bg-rose-50/70 px-4 py-3 text-sm text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* ── STEP 1: paciente + pedido + cirurgia ── */}
        {step === 1 && (
          <SurfaceCard title="1 · Paciente e pedido" subtitle="Seleccione o paciente; depois escolha o pedido ou cirurgia marcada e, em seguida, as cirurgias do contexto." icon={<User size={13} />} accent="bg-sky-400">
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

            <div className="mt-3">
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
                        {requestOptions.map((request) => {
                          const selected = selectedContext?.kind === "request" && selectedContext.id === request.id
                          return (
                            <button
                              key={request.id}
                              type="button"
                              onClick={() => {
                                selectContext(selected ? null : { kind: "request", id: request.id, label: request.custom_id })
                              }}
                              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-[11px] transition ${
                                selected ? "border-sky-400 bg-sky-50 dark:border-sky-600/50 dark:bg-sky-900/20" : "border-border bg-card/60 hover:border-sky-300"
                              }`}
                            >
                              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${selected ? "bg-sky-500 text-white" : "border-2 border-[var(--gray-300)]"}`}>
                                {selected && <Check size={9} />}
                              </span>
                              <span>
                                <span className="block font-semibold text-foreground">{request.custom_id}</span>
                                <span className="block text-[10px] text-[var(--gray-500)]">
                                  {[request.requested_procedure || request.clinical_diagnosis, request.status, request.priority].filter(Boolean).join(" · ")}
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
                                selectContext(selected ? null : { kind: "surgery", id: surgery.id, label: surgery.custom_id })
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

            <div className="mt-3">
              <FieldRow label="Procedimentos do contexto seleccionado">
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
                    {contextProcedures.map((procedure) => {
                      const selected = selectedProcedureKeys.includes(procedure.key)
                      return (
                        <button
                          key={procedure.key}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setSelectedProcedureKeys((previous) =>
                            selected
                              ? previous.filter((key) => key !== procedure.key)
                              : [...previous, procedure.key]
                          )}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                            selected
                              ? "border-sky-400 bg-sky-50 text-sky-700 shadow-sm shadow-sky-200/70 dark:border-sky-600/50 dark:bg-sky-900/20 dark:text-sky-200 dark:shadow-none"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300 hover:bg-sky-50/70 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-sky-900/10"
                          }`}
                          title={selected ? "Clique para remover a selecção" : "Clique para seleccionar este procedimento"}
                        >
                          <span
                            className={`inline-flex h-4 w-4 items-center justify-center rounded-full transition ${
                              selected
                                ? "bg-sky-500 text-white"
                                : "border border-slate-300 text-transparent dark:border-white/20"
                            }`}
                          >
                            <Check size={9} />
                          </span>
                          <span>{procedure.label}</span>
                          {selected ? (
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-sky-300/70 bg-white/80 text-sky-600 dark:border-sky-500/40 dark:bg-sky-950/30 dark:text-sky-200">
                              <X size={9} />
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                )}
              </FieldRow>
            </div>

            <div className="mt-3">
              <FieldRow label={filteredContextSurgeries.length === 1
                ? (selectedContext?.kind === "request" ? "Cirurgia do pedido seleccionada" : "Cirurgia do contexto seleccionada")
                : (selectedContext?.kind === "request" ? "Cirurgias do pedido seleccionado" : "Cirurgias do contexto seleccionado")}>
                {!patient ? (
                  <div className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-2.5 text-[11px] text-[var(--gray-400)]">
                    Seleccione um paciente para ver as cirurgias.
                  </div>
                ) : !selectedContext ? (
                  <div className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-2.5 text-[11px] text-[var(--gray-400)]">
                    Seleccione primeiro um pedido ou uma cirurgia marcada para abrir a selecção de cirurgias.
                  </div>
                ) : filteredContextSurgeries.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 px-3 py-2.5 text-[11px] text-amber-600 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-400">
                    Nenhuma cirurgia corresponde aos procedimentos seleccionados neste contexto.
                  </div>
                ) : singleVisibleSurgery ? (
                  <div className="rounded-xl border border-violet-200/70 bg-violet-50/60 px-3 py-2.5 text-[11px] dark:border-violet-700/30 dark:bg-violet-900/10">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white">
                        <Check size={9} />
                      </span>
                      <span>
                        <span className="block font-semibold text-foreground">{singleVisibleSurgery.custom_id}</span>
                        <span className="block text-[10px] text-[var(--gray-500)]">
                          {[
                            singleVisibleSurgery?.procedure_names?.[0] || singleVisibleSurgery?.procedure || "—",
                            labelSurgerySize(singleVisibleSurgery?.surgery_size),
                            singleVisibleSurgery?.status,
                          ].filter(Boolean).join(" · ")}
                        </span>
                        <span className="mt-1 block text-[10px] text-violet-700 dark:text-violet-300">
                          Seleccionada automaticamente por ser a unica cirurgia visivel neste contexto.
                        </span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {filteredContextSurgeries.length > 1 ? (
                      <div className="mb-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const allSelected = filteredContextSurgeries.every((surgery) => selectedSurgeries.some((item) => item.id === surgery.id))
                            setSelectedSurgeries(
                              allSelected
                                ? []
                                : filteredContextSurgeries.map((surgery) => ({ id: surgery.id, label: surgery.custom_id }))
                            )
                          }}
                          className="text-[10px] font-semibold text-sky-600 hover:underline dark:text-sky-400"
                        >
                          {filteredContextSurgeries.every((surgery) => selectedSurgeries.some((item) => item.id === surgery.id))
                            ? "Desseleccionar todas"
                            : "Seleccionar todas"}
                        </button>
                      </div>
                    ) : null}

                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {filteredContextSurgeries.map((surgery) => {
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
                              selected ? "border-violet-400 bg-violet-50 text-violet-800 dark:border-violet-600/50 dark:bg-violet-900/20 dark:text-violet-200" : "border-border bg-card/60 hover:border-violet-300"
                            }`}
                          >
                            <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${selected ? "bg-violet-500 text-white" : "border-2 border-[var(--gray-300)]"}`}>
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
                  </>
                )}
              </FieldRow>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <FieldRow label="Avaliado em">
                <input type="datetime-local" className={inputCls} value={assessedAt} onChange={e => setAssessedAt(e.target.value)} />
              </FieldRow>
              <FieldRow label="Estado" required>
                <select className={inputCls} value={status} onChange={e => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FieldRow>
            </div>
          </SurfaceCard>
        )}

        {/* ── STEP 2: avaliação clínica ── */}
        {step === 2 && (
          <SurfaceCard title="2 · Avaliação clínica" subtitle="Classificação ASA, risco cirúrgico e parecer clínico." icon={<Stethoscope size={13} />} accent="bg-emerald-400">
            <FieldRow label="Classificação ASA" required>
              <div className="grid gap-2 sm:grid-cols-3">
                {ASA_OPTIONS.map(opt => {
                  const sel = asaClass === opt.value
                  return (
                    <button key={opt.value} type="button" onClick={() => setAsaClass(opt.value)}
                      className={`rounded-lg border px-3 py-2 text-left transition ${sel
                        ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-600/60 dark:bg-amber-900/20 dark:text-amber-200"
                        : "border-white/30 bg-white/25 hover:border-amber-300 dark:border-white/10 dark:bg-white/[0.03]"}`}>
                      <div className={`text-[11px] font-semibold ${sel ? "text-amber-800 dark:text-amber-200" : "text-foreground"}`}>{opt.label}</div>
                      <div className="mt-0.5 text-[10px] text-[var(--gray-500)]">{opt.description}</div>
                    </button>
                  )
                })}
              </div>
            </FieldRow>
            <div className="mt-3">
              <FieldRow label="Risco cirúrgico">
                <input className={inputCls} placeholder="Ex.: Baixo, moderado, alto..." value={surgicalRisk} onChange={e => setSurgicalRisk(e.target.value)} />
              </FieldRow>
            </div>
            <div className="mt-3 grid gap-3">
              <FieldRow label="Avaliação médica">
                <textarea rows={4} className={textareaCls} value={medicalEvaluation} onChange={e => setMedicalEvaluation(e.target.value)}
                  placeholder="Resumo clínico, comorbilidades e factores de risco..." />
              </FieldRow>
              <FieldRow label="Avaliação anestésica">
                <textarea rows={4} className={textareaCls} value={anestheticEvaluation} onChange={e => setAnestheticEvaluation(e.target.value)}
                  placeholder="Via aérea, necessidade anestésica, recomendações e precauções..." />
              </FieldRow>
            </div>
          </SurfaceCard>
        )}

        {/* ── STEP 3: exames e conclusão ── */}
        {step === 3 && (
          <SurfaceCard title="3 · Exames e conclusão" subtitle="Exames, consentimento, aptidão e observações finais." icon={<ClipboardCheck size={13} />} accent="bg-violet-400">
            <div className="grid gap-3 sm:grid-cols-2">
              <MultiSearchSelect
                label="Exames laboratoriais"
                endpoint="/clinical_laboratory/test/"
                values={selectedLabExams.filter(e => e.id > 0)}
                onChange={setSelectedLabExams}
                placeholder="Pesquisar análise..."
                extraParams={{ active: "true" }}
                getOptionLabel={item => item?.name || item?.code || `#${item?.id}`}
                getOptionMeta={item => [item?.code, item?.sector_name, item?.sample_type].filter(Boolean).join(" · ")}
              />
              <MultiSearchSelect
                label="Exames médicos"
                endpoint="/clinical/medicalexam/"
                values={selectedMedExams.filter(e => e.id > 0)}
                onChange={setSelectedMedExams}
                placeholder="Pesquisar exame médico..."
                getOptionLabel={item => item?.name || item?.custom_id || `#${item?.id}`}
                getOptionMeta={item => [item?.method, item?.sector].filter(Boolean).join(" · ")}
              />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <BoolCard label="Exames revistos" description="Confirma que os resultados já foram analisados."
                checked={examResultsReviewed} onToggle={() => setExamResultsReviewed(v => !v)} />
              <BoolCard label="Consentimento assinado" description="Consentimento informado obtido."
                checked={consentSigned} onToggle={() => setConsentSigned(v => !v)} />
            </div>

            <div className="mt-3 rounded-xl border border-white/30 bg-white/25 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">Aptidão para cirurgia</div>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  { val: true,  label: "Apto",        icon: <CheckCircle2 size={11} />, cls: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" },
                  { val: false, label: "Inapto",       icon: <XCircle size={11} />,     cls: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300" },
                  { val: null,  label: "Não definido", icon: null,                       cls: "border-slate-300 bg-slate-50 text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-slate-200" },
                ] as const).map(opt => (
                  <button key={String(opt.val)} type="button" onClick={() => setFitForSurgery(opt.val)}
                    className={`rounded-lg border px-3 py-2 text-[11px] font-semibold transition ${
                      fitForSurgery === opt.val ? opt.cls : "border-white/30 bg-white/25 text-[var(--gray-600)] hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03]"
                    }`}>
                    <span className="inline-flex items-center gap-1">{opt.icon} {opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
              <FieldRow label="Observações clínicas">
                <textarea rows={4} className={textareaCls} value={observations} onChange={e => setObservations(e.target.value)}
                  placeholder="Notas finais, exames pendentes, cuidados adicionais..." />
              </FieldRow>
              <div className="rounded-xl border border-violet-200/60 bg-violet-50/50 p-3 dark:border-violet-800/30 dark:bg-violet-900/10">
                <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                  <FileText size={11} /> Resumo
                </div>
                <div className="space-y-1 text-[11px]">
                  {[
                    ["Paciente",  patient?.label || original?.patient_name || "—"],
                    ["Avaliador", evaluator?.label || "—"],
                    ["ASA",       asaClass?.replace("_", " ") || "—"],
                    ["Estado",    STATUS_OPTIONS.find(o => o.value === status)?.label || status],
                    ["Exames LAB", String(selectedLabExams.filter(e => e.id > 0).length)],
                    ["Exames MED", String(selectedMedExams.filter(e => e.id > 0).length)],
                    ["Aptidão",   fitForSurgery === true ? "Apto" : fitForSurgery === false ? "Inapto" : "Não definido"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-2">
                      <span className="text-[var(--gray-500)]">{k}</span>
                      <span className="text-right font-semibold text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SurfaceCard>
        )}

        {/* ── NAV ── */}
        <section className={`${GLASS} px-3 py-2.5`}>
          <div className="flex items-center justify-between gap-3">
            {step > 1
              ? <button type="button" onClick={() => setStep(s => s - 1)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] text-muted-foreground transition hover:bg-muted">
                  <ArrowLeft size={13} /> Anterior
                </button>
              : <Link href={`/surgery/preoperative-assessments/${id}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] text-muted-foreground transition hover:bg-muted">
                  <ArrowLeft size={13} /> Cancelar
                </Link>
            }
            {step < STEPS.length
              ? <button type="button" disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
                  onClick={() => setStep(s => s + 1)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-600 px-4 text-[12px] font-semibold text-white transition hover:bg-amber-700 disabled:opacity-40 dark:bg-amber-500/80 dark:hover:bg-amber-500">
                  Seguinte <ArrowRight size={13} />
                </button>
              : <button type="button" disabled={saving || !canNext2} onClick={submit}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-600 px-4 text-[12px] font-semibold text-white transition hover:bg-amber-700 disabled:opacity-40 dark:bg-amber-500/80 dark:hover:bg-amber-500">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {saving ? "A guardar..." : "Guardar alterações"}
                </button>
            }
          </div>
        </section>

      </div>
    </AppLayout>
  )
}
