"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Layers,
  Loader2,
  Save,
  Search,
  Stethoscope,
  User,
  XCircle,
} from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

/* ── constants ─────────────────────────────────────────────────── */

const GLASS = "rounded-xl border border-amber-200/60 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const inputCls = "w-full rounded-lg border border-white/30 bg-white/40 px-2.5 py-1.5 text-[12px] text-[var(--text)] placeholder-[var(--gray-400)] backdrop-blur-sm focus:border-amber-400 focus:outline-none dark:border-white/10 dark:bg-white/[0.06]"
const textareaCls = inputCls + " resize-none"

const ASA_OPTIONS = [
  { value: "ASA_I",   label: "ASA I",   desc: "Paciente saudável" },
  { value: "ASA_II",  label: "ASA II",  desc: "Doença sistémica ligeira" },
  { value: "ASA_III", label: "ASA III", desc: "Doença sistémica grave" },
  { value: "ASA_IV",  label: "ASA IV",  desc: "Risco de vida constante" },
  { value: "ASA_V",   label: "ASA V",   desc: "Moribundo, sem cirurgia morre" },
  { value: "ASA_VI",  label: "ASA VI",  desc: "Morte cerebral, dador" },
  { value: "UNKNOWN", label: "Desconhecido", desc: "" },
]

const ASA_COLOR: Record<string, string> = {
  ASA_I:   "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  ASA_II:  "border-lime-300 bg-lime-50 text-lime-700 dark:border-lime-700/40 dark:bg-lime-900/20 dark:text-lime-300",
  ASA_III: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  ASA_IV:  "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",
  ASA_V:   "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300",
  ASA_VI:  "border-rose-400 bg-rose-100 text-rose-800 dark:border-rose-600/40 dark:bg-rose-900/30 dark:text-rose-200",
  UNKNOWN: "border-gray-200 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400",
}

const STATUS_OPTIONS = [
  { value: "PENDING",           label: "Pendente" },
  { value: "IN_PROGRESS",       label: "Em curso" },
  { value: "FIT",               label: "Apto" },
  { value: "TEMPORARILY_UNFIT", label: "Temporariamente inapto" },
  { value: "UNFIT",             label: "Inapto" },
  { value: "REQUIRES_EXAMS",    label: "Requer exames" },
]

const STEPS = [
  { id: 1, label: "Paciente & pedido",    icon: <User size={14} /> },
  { id: 2, label: "Avaliação clínica",    icon: <Stethoscope size={14} /> },
  { id: 3, label: "Exames & conclusão",   icon: <ClipboardCheck size={14} /> },
]

/* ── helpers ────────────────────────────────────────────────────── */

function FieldRow({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function DropdownPortal({ anchorRef, open, children }: {
  anchorRef: React.RefObject<HTMLDivElement | null>
  open: boolean
  children: React.ReactNode
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  useEffect(() => {
    if (open && anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width })
    }
  }, [open, anchorRef])
  if (!open || typeof document === "undefined") return null
  return createPortal(
    <div style={{ position: "absolute", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}>
      {children}
    </div>,
    document.body
  )
}

function SearchSelect({
  label, endpoint, valueKey = "id", labelKey = "name", value, onChange, required, placeholder,
  extraParams,
}: {
  label: string; endpoint: string; valueKey?: string; labelKey?: string
  value: { id: number; label: string } | null
  onChange: (v: { id: number; label: string } | null) => void
  required?: boolean; placeholder?: string
  extraParams?: Record<string, string>
}) {
  const [q, setQ] = useState("")
  const [opts, setOpts] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const search = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ limit: "20", ...(query ? { search: query } : {}), ...extraParams })
      const d = await apiFetch<any>(`${endpoint}?${p}`)
      setOpts(d.results ?? d)
    } catch { setOpts([]) }
    finally { setLoading(false) }
  }, [endpoint, extraParams])

  useEffect(() => { if (open) search(q) }, [open])
  useEffect(() => {
    const t = setTimeout(() => { if (open) search(q) }, 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const getLabel = (o: any) => {
    if (labelKey === "name") return o.name || o.display_name || o.full_name || `#${o.id}`
    return o[labelKey] || `#${o.id}`
  }

  return (
    <FieldRow label={label} required={required}>
      <div ref={ref} className="relative">
        <div
          onClick={() => setOpen(v => !v)}
          className={`${inputCls} flex cursor-pointer items-center justify-between gap-2`}
        >
          <span className={value ? "text-foreground" : "text-[var(--gray-400)]"}>
            {value ? value.label : (placeholder || `Seleccionar ${label.toLowerCase()}...`)}
          </span>
          <Search size={10} className="shrink-0 text-[var(--gray-400)]" />
        </div>
        <DropdownPortal anchorRef={ref} open={open}>
          <div className="rounded-xl border border-border bg-card shadow-xl">
            <div className="p-1.5">
              <input
                autoFocus
                className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px] focus:outline-none"
                placeholder="Pesquisar..."
                value={q} onChange={e => setQ(e.target.value)}
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {loading
                ? <div className="px-3 py-2 text-[11px] text-[var(--gray-500)]">Carregando...</div>
                : opts.length === 0
                  ? <div className="px-3 py-2 text-[11px] text-[var(--gray-400)]">Sem resultados</div>
                  : opts.map(o => (
                      <button key={o[valueKey]} type="button"
                        onClick={() => { onChange({ id: o[valueKey], label: getLabel(o) }); setOpen(false); setQ("") }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-muted first:rounded-t-xl last:rounded-b-xl">
                        {getLabel(o)}
                      </button>
                    ))
              }
            </div>
            {value && (
              <div className="border-t border-border p-1.5">
                <button type="button" onClick={() => { onChange(null); setOpen(false) }}
                  className="flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-rose-500 hover:bg-rose-50/60">
                  <XCircle size={11} /> Limpar
                </button>
              </div>
            )}
          </div>
        </DropdownPortal>
      </div>
    </FieldRow>
  )
}

/* ── step indicator ─────────────────────────────────────────────── */

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => {
        const done = step > s.id
        const active = step === s.id
        return (
          <div key={s.id} className="flex items-center">
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
              done    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              : active ? "bg-amber-500 text-white shadow-sm"
              : "text-[var(--gray-400)]"
            }`}>
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                done    ? "bg-amber-500 text-white"
                : active ? "bg-white/30 text-white"
                : "bg-[var(--gray-200)] text-[var(--gray-500)] dark:bg-white/10"
              }`}>
                {done ? <Check size={9} /> : s.id}
              </span>
              {s.label}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-1 h-px w-6 ${step > s.id ? "bg-amber-400" : "bg-[var(--gray-200)] dark:bg-white/10"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── main page ──────────────────────────────────────────────────── */

export default function NewPreoperativeAssessmentPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* step 1 */
  const [patient, setPatient] = useState<{ id: number; label: string } | null>(null)
  const [surgicalRequest, setSurgicalRequest] = useState<{ id: number; label: string } | null>(null)
  const [proposedSurgery, setProposedSurgery] = useState<{ id: number; label: string } | null>(null)
  const [evaluator, setEvaluator] = useState<{ id: number; label: string } | null>(null)
  const [assessedAt, setAssessedAt] = useState("")

  /* step 2 */
  const [asaClass, setAsaClass] = useState("")
  const [surgicalRisk, setSurgicalRisk] = useState("")
  const [medicalEvaluation, setMedicalEvaluation] = useState("")
  const [anestheticEvaluation, setAnestheticEvaluation] = useState("")
  const [status, setStatus] = useState("PENDING")

  /* step 3 */
  const [requiredExams, setRequiredExams] = useState("")
  const [examResultsReviewed, setExamResultsReviewed] = useState(false)
  const [fitForSurgery, setFitForSurgery] = useState<boolean | null>(null)
  const [consentSigned, setConsentSigned] = useState(false)
  const [observations, setObservations] = useState("")

  const canNext1 = !!patient
  const canNext2 = !!asaClass && !!status

  async function submit() {
    setSaving(true); setError(null)
    try {
      const body: any = {
        patient: patient?.id,
        status,
        asa_class: asaClass || undefined,
        surgical_risk: surgicalRisk || undefined,
        medical_evaluation: medicalEvaluation || undefined,
        anesthetic_evaluation: anestheticEvaluation || undefined,
        exam_results_reviewed: examResultsReviewed,
        fit_for_surgery: fitForSurgery,
        consent_signed: consentSigned,
        observations: observations || undefined,
        assessed_at: assessedAt || undefined,
      }
      if (surgicalRequest) body.surgical_request = surgicalRequest.id
      if (proposedSurgery) body.proposed_surgery = proposedSurgery.id
      if (evaluator) body.evaluator = evaluator.id
      if (requiredExams.trim()) {
        try { body.required_exams = JSON.parse(requiredExams) }
        catch { body.required_exams = requiredExams.split(",").map(s => s.trim()).filter(Boolean) }
      }
      const d = await apiFetch<any>("/surgery/avaliacao_pre_operatoria/", {
        method: "POST", body: JSON.stringify(body),
      })
      router.push(`/surgery/preoperative-assessments/${d.id}`)
    } catch (e: any) {
      setError(e?.message || "Erro ao guardar.")
      setSaving(false)
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
      <div className="mx-auto w-full max-w-3xl space-y-3 px-1 py-1">

        {/* ── HERO HEADER ─────────────────────────────────────── */}
        <header className="relative overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-br from-amber-50/80 via-white/60 to-amber-100/40 shadow-sm backdrop-blur-md dark:border-white/10 dark:from-amber-900/20 dark:via-slate-800/40 dark:to-slate-900/60">
          <span className="pointer-events-none absolute -right-6 -top-6 select-none text-[120px] leading-none opacity-[0.05] dark:opacity-[0.07]" aria-hidden>🩺</span>
          <div className="relative px-5 pt-4 pb-4">
            {/* breadcrumb */}
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Layers size={9} className="shrink-0" />
              <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
              <span>/</span>
              <Link href="/surgery/preoperative-assessments" className="hover:text-foreground">Avaliações pré-op.</Link>
              <span>/</span>
              <span className="font-semibold text-foreground">Nova avaliação</span>
            </div>

            {/* title row */}
            <div className="mt-1.5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 dark:bg-amber-400/10">
                    <Stethoscope size={18} className="text-amber-700 dark:text-amber-300" strokeWidth={1.8} />
                  </span>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                    Registar avaliação pré-operatória
                  </h1>
                </div>
                <p className="mt-1 max-w-lg text-[11px] text-muted-foreground">
                  Avaliação de aptidão clínica e anestésica antes da intervenção cirúrgica.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Link href="/surgery/preoperative-assessments"
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card/70 px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted">
                  <ArrowLeft size={11} /> Voltar
                </Link>
              </div>
            </div>

            {/* step bar */}
            <div className="mt-3 border-t border-white/30 pt-3 dark:border-white/10">
              <StepBar step={step} />
            </div>
          </div>
        </header>
        {/* ── /HERO HEADER ─────────────────────────────────── */}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-300/50 bg-rose-50/70 px-4 py-2.5 text-sm text-rose-700">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* ── STEP 1: Paciente & pedido ─────────────────────── */}
        {step === 1 && (
          <section className={`${GLASS} p-4 space-y-3`}>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              <User size={13} /> Paciente & pedido cirúrgico
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SearchSelect
                label="Paciente" required
                endpoint="/patients/patient/"
                labelKey="name"
                value={patient} onChange={setPatient}
                placeholder="Seleccionar paciente..."
              />
              <SearchSelect
                label="Avaliador (médico)"
                endpoint="/staff/staff/"
                labelKey="name"
                value={evaluator} onChange={setEvaluator}
                placeholder="Seleccionar médico..."
              />
              <SearchSelect
                label="Pedido cirúrgico"
                endpoint="/surgery/pedido_cirurgico/"
                labelKey="custom_id"
                valueKey="id"
                value={surgicalRequest} onChange={setSurgicalRequest}
                placeholder="Seleccionar pedido..."
              />
              <SearchSelect
                label="Cirurgia proposta"
                endpoint="/surgery/surgery/"
                labelKey="custom_id"
                valueKey="id"
                value={proposedSurgery} onChange={setProposedSurgery}
                placeholder="Seleccionar cirurgia..."
              />
            </div>
            <FieldRow label="Data da avaliação">
              <input type="datetime-local" className={inputCls} value={assessedAt}
                onChange={e => setAssessedAt(e.target.value)} />
            </FieldRow>
          </section>
        )}

        {/* ── STEP 2: Avaliação clínica ─────────────────────── */}
        {step === 2 && (
          <section className={`${GLASS} p-4 space-y-4`}>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              <Stethoscope size={13} /> Avaliação clínica & anestésica
            </p>

            {/* ASA selector */}
            <FieldRow label="Classe ASA" required>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                {ASA_OPTIONS.map(o => (
                  <button key={o.value} type="button"
                    onClick={() => setAsaClass(o.value)}
                    title={o.desc}
                    className={`rounded-lg border px-2 py-2 text-center text-[10px] font-semibold transition ${
                      asaClass === o.value
                        ? (ASA_COLOR[o.value] ?? "border-amber-300 bg-amber-50 text-amber-700") + " ring-2 ring-amber-300/50"
                        : "border-border bg-card/60 text-[var(--gray-500)] hover:border-amber-300"
                    }`}>
                    {o.label}
                    {o.desc && <span className="mt-0.5 block text-[8px] font-normal opacity-70 leading-tight">{o.desc.split(" ").slice(0, 3).join(" ")}</span>}
                  </button>
                ))}
              </div>
            </FieldRow>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldRow label="Risco cirúrgico">
                <input className={inputCls} placeholder="ex: Baixo, Moderado, Alto..."
                  value={surgicalRisk} onChange={e => setSurgicalRisk(e.target.value)} />
              </FieldRow>
              <FieldRow label="Estado da avaliação" required>
                <select className={inputCls} value={status} onChange={e => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FieldRow>
            </div>

            <FieldRow label="Avaliação médica">
              <textarea rows={3} className={textareaCls} placeholder="Observações da avaliação médica..."
                value={medicalEvaluation} onChange={e => setMedicalEvaluation(e.target.value)} />
            </FieldRow>
            <FieldRow label="Avaliação anestésica">
              <textarea rows={3} className={textareaCls} placeholder="Observações da avaliação anestésica..."
                value={anestheticEvaluation} onChange={e => setAnestheticEvaluation(e.target.value)} />
            </FieldRow>
          </section>
        )}

        {/* ── STEP 3: Exames & conclusão ────────────────────── */}
        {step === 3 && (
          <section className={`${GLASS} p-4 space-y-4`}>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              <ClipboardCheck size={13} /> Exames & conclusão
            </p>

            <FieldRow label="Exames necessários (separados por vírgula ou JSON)">
              <textarea rows={2} className={textareaCls}
                placeholder="ex: Hemograma, Coagulação, ECG, Rx tórax..."
                value={requiredExams} onChange={e => setRequiredExams(e.target.value)} />
            </FieldRow>

            {/* boolean toggles */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {/* exam results reviewed */}
              <button type="button" onClick={() => setExamResultsReviewed(v => !v)}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left text-[12px] font-semibold transition ${
                  examResultsReviewed
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                    : "border-border bg-card/60 text-[var(--gray-500)] hover:border-amber-300"
                }`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  examResultsReviewed ? "bg-emerald-500 text-white" : "border-2 border-[var(--gray-300)]"
                }`}>
                  {examResultsReviewed && <Check size={11} />}
                </span>
                Exames revistos
              </button>

              {/* consent signed */}
              <button type="button" onClick={() => setConsentSigned(v => !v)}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left text-[12px] font-semibold transition ${
                  consentSigned
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                    : "border-border bg-card/60 text-[var(--gray-500)] hover:border-amber-300"
                }`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  consentSigned ? "bg-emerald-500 text-white" : "border-2 border-[var(--gray-300)]"
                }`}>
                  {consentSigned && <Check size={11} />}
                </span>
                Consentimento assinado
              </button>

              {/* fit for surgery — tri-state */}
              <div className="flex flex-col gap-1 rounded-xl border border-border bg-card/60 p-3">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Apto para cirurgia</span>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setFitForSurgery(true)}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-semibold transition ${
                      fitForSurgery === true
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20"
                        : "border-border text-[var(--gray-500)] hover:border-emerald-300"
                    }`}>
                    <CheckCircle2 size={11} /> Sim
                  </button>
                  <button type="button" onClick={() => setFitForSurgery(false)}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-semibold transition ${
                      fitForSurgery === false
                        ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20"
                        : "border-border text-[var(--gray-500)] hover:border-rose-300"
                    }`}>
                    <XCircle size={11} /> Não
                  </button>
                  <button type="button" onClick={() => setFitForSurgery(null)}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-semibold transition ${
                      fitForSurgery === null
                        ? "border-gray-300 bg-gray-50 text-gray-600 dark:border-white/20 dark:bg-white/10"
                        : "border-border text-[var(--gray-500)] hover:border-gray-300"
                    }`}>
                    — N/D
                  </button>
                </div>
              </div>
            </div>

            <FieldRow label="Observações">
              <textarea rows={3} className={textareaCls} placeholder="Notas adicionais sobre a avaliação..."
                value={observations} onChange={e => setObservations(e.target.value)} />
            </FieldRow>

            {/* summary */}
            <div className="rounded-xl border border-white/30 bg-white/30 p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Resumo</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <span className="text-[var(--gray-500)]">Paciente</span>
                <span className="font-semibold text-foreground truncate">{patient?.label || "—"}</span>
                <span className="text-[var(--gray-500)]">Avaliador</span>
                <span className="font-semibold text-foreground truncate">{evaluator?.label || "—"}</span>
                <span className="text-[var(--gray-500)]">Classe ASA</span>
                <span className="font-semibold text-foreground">{asaClass || "—"}</span>
                <span className="text-[var(--gray-500)]">Estado</span>
                <span className="font-semibold text-foreground">{STATUS_OPTIONS.find(o => o.value === status)?.label || "—"}</span>
                <span className="text-[var(--gray-500)]">Aptidão</span>
                <span className="font-semibold text-foreground">
                  {fitForSurgery === true ? "✓ Apto" : fitForSurgery === false ? "✗ Inapto" : "— Não definido"}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ── navigation ───────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          {step > 1 ? (
            <button type="button" onClick={() => setStep(s => s - 1)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] text-muted-foreground transition hover:bg-muted">
              <ArrowLeft size={13} /> Anterior
            </button>
          ) : (
            <Link href="/surgery/preoperative-assessments"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] text-muted-foreground transition hover:bg-muted">
              <ArrowLeft size={13} /> Cancelar
            </Link>
          )}

          {step < STEPS.length ? (
            <button type="button"
              disabled={step === 1 ? !canNext1 : step === 2 ? !canNext2 : false}
              onClick={() => setStep(s => s + 1)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-600 px-4 text-[12px] font-semibold text-white transition hover:bg-amber-700 disabled:opacity-40 dark:bg-amber-500/80 dark:hover:bg-amber-500">
              Seguinte <ArrowRight size={13} />
            </button>
          ) : (
            <button type="button" disabled={saving || !canNext1 || !canNext2} onClick={submit}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-600 px-4 text-[12px] font-semibold text-white transition hover:bg-amber-700 disabled:opacity-40 dark:bg-amber-500/80 dark:hover:bg-amber-500">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? "A guardar..." : "Guardar avaliação"}
            </button>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
