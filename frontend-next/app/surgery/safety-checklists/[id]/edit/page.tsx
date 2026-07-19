"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  Save,
  Scissors,
  ShieldCheck,
  User,
  X,
} from "lucide-react"

import { SearchableRelationSelect } from "@/components/form/AutoForm"
import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"
import type { RelationOption, RelationTarget } from "@/lib/resources/relationOptions"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type Row = Record<string, any>

type FormState = {
  surgery: string
  completed_by: string
  phase: string
  status: string
  patient_identity_confirmed: boolean
  procedure_confirmed: boolean
  site_marked: boolean
  consent_confirmed: boolean
  anesthesia_safety_checked: boolean
  antibiotic_prophylaxis: boolean
  instrument_count_confirmed: boolean
  specimens_labeled: boolean
  override_reason: string
  notes: string
}

const ENDPOINT = "/surgery/checklist_seguranca"
const ROUTE_BASE = "/surgery/safety-checklists"
const GLASS = "rounded-lg border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const INPUT = "h-7 w-full rounded-md border border-border bg-card/70 px-2 text-[11px] text-foreground outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-violet-800"
const LABEL = "mb-0.5 block text-[8px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]"

const RELATION_TARGETS: Record<string, RelationTarget> = {
  surgery: { endpoint: "/surgery/surgery/", labelFields: ["custom_id", "patient_name", "procedure", "scheduled_for", "id"] },
  completed_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", "document_number", "id"] },
}

const PHASE_OPTIONS = [
  ["SIGN_IN", "Antes da indução"],
  ["TIME_OUT", "Antes da incisão"],
  ["SIGN_OUT", "Antes da saída"],
] as const

const STATUS_OPTIONS = [
  ["PENDING", "Pendente"],
  ["PARTIALLY_COMPLETED", "Parcial"],
  ["COMPLETED", "Concluído"],
  ["FAILED", "Falhou"],
  ["OVERRIDDEN", "Sobrescrito"],
] as const

const CHECK_FIELDS: { key: keyof FormState; label: string; detail: string }[] = [
  { key: "patient_identity_confirmed", label: "Identidade confirmada", detail: "Paciente, pulseira e processo conferidos." },
  { key: "procedure_confirmed", label: "Procedimento confirmado", detail: "Procedimento e lado cirúrgico revistos." },
  { key: "site_marked", label: "Local marcado", detail: "Sítio operatório marcado quando aplicável." },
  { key: "consent_confirmed", label: "Consentimento confirmado", detail: "Consentimento cirúrgico/anestésico disponível." },
  { key: "anesthesia_safety_checked", label: "Segurança anestésica", detail: "Equipamento, via aérea e plano anestésico confirmados." },
  { key: "antibiotic_prophylaxis", label: "Profilaxia antibiótica", detail: "Antibiótico administrado no tempo correto." },
  { key: "instrument_count_confirmed", label: "Contagem de instrumentos", detail: "Compressas, agulhas e instrumental conferidos." },
  { key: "specimens_labeled", label: "Amostras identificadas", detail: "Amostras rotuladas ou confirmado que não há amostras." },
]

const INITIAL_FORM: FormState = {
  surgery: "",
  completed_by: "",
  phase: "SIGN_IN",
  status: "PENDING",
  patient_identity_confirmed: false,
  procedure_confirmed: false,
  site_marked: false,
  consent_confirmed: false,
  anesthesia_safety_checked: false,
  antibiotic_prophylaxis: false,
  instrument_count_confirmed: false,
  specimens_labeled: false,
  override_reason: "",
  notes: "",
}

function asId(value: unknown): string {
  if (value === undefined || value === null || value === "") return ""
  return String(value)
}

function fmtDateTime(value: unknown): string {
  if (!value) return "—"
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

function option(value: unknown, label: unknown): RelationOption[] {
  const id = asId(value)
  const text = String(label || "").trim()
  return id ? [{ value: id, label: text || "Registo selecionado" }] : []
}

function formFromRow(row: Row): FormState {
  return {
    surgery: asId(row.surgery),
    completed_by: asId(row.completed_by),
    phase: String(row.phase || "SIGN_IN"),
    status: String(row.status || "PENDING"),
    patient_identity_confirmed: Boolean(row.patient_identity_confirmed),
    procedure_confirmed: Boolean(row.procedure_confirmed),
    site_marked: Boolean(row.site_marked),
    consent_confirmed: Boolean(row.consent_confirmed),
    anesthesia_safety_checked: Boolean(row.anesthesia_safety_checked),
    antibiotic_prophylaxis: Boolean(row.antibiotic_prophylaxis),
    instrument_count_confirmed: Boolean(row.instrument_count_confirmed),
    specimens_labeled: Boolean(row.specimens_labeled),
    override_reason: String(row.override_reason || ""),
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

function ContextField({ label, value, icon }: { label: string; value: unknown; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-card/35 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-0.5 truncate text-[11px] font-semibold text-foreground">{String(value || "—")}</div>
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

function CheckToggle({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string
  detail: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex min-w-0 items-start gap-2 rounded-md border px-2 py-1.5 text-left transition ${
        checked
          ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-700/30 dark:bg-emerald-900/15"
          : "border-border/70 bg-card/35 hover:border-amber-300"
      }`}
    >
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
        checked ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
      }`}>
        {checked ? <Check size={12} /> : <X size={12} />}
      </span>
      <span className="min-w-0">
        <span className={`block truncate text-[11px] font-semibold ${checked ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
        <span className="line-clamp-2 text-[9px] leading-snug text-muted-foreground">{detail}</span>
      </span>
    </button>
  )
}

export default function SurgerySafetyChecklistEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = routeParamToString((params as any)?.id)

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [row, setRow] = useState<Row | null>(null)
  const [surgery, setSurgery] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const done = useMemo(() => CHECK_FIELDS.filter((field) => Boolean(form[field.key])).length, [form])
  const total = CHECK_FIELDS.length
  const pct = Math.round((done / total) * 100)
  const isComplete = done === total
  const needsOverrideReason = form.status === "OVERRIDDEN" && !form.override_reason.trim()
  const phaseLabel = PHASE_OPTIONS.find(([value]) => value === form.phase)?.[1] || form.phase
  const statusLabel = STATUS_OPTIONS.find(([value]) => value === form.status)?.[1] || form.status

  const relationOptions = {
    surgery: option(form.surgery, row?.surgery_code || surgery?.custom_id || surgery?.procedure),
    completed_by: option(form.completed_by, row?.completed_by_name),
  }

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const nextRow = await apiFetch<Row>(`${ENDPOINT}/${id}/`)
      setRow(nextRow)
      setForm(formFromRow(nextRow))
      setSurgery(nextRow?.surgery ? await apiFetch<Row>(`/surgery/surgery/${nextRow.surgery}/`).catch(() => null) : null)
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar checklist de segurança.")
      setRow(null)
      setSurgery(null)
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
        surgery: form.surgery ? Number(form.surgery) : null,
        completed_by: form.completed_by ? Number(form.completed_by) : null,
        phase: form.phase,
        status: form.status,
        patient_identity_confirmed: form.patient_identity_confirmed,
        procedure_confirmed: form.procedure_confirmed,
        site_marked: form.site_marked,
        consent_confirmed: form.consent_confirmed,
        anesthesia_safety_checked: form.anesthesia_safety_checked,
        antibiotic_prophylaxis: form.antibiotic_prophylaxis,
        instrument_count_confirmed: form.instrument_count_confirmed,
        specimens_labeled: form.specimens_labeled,
        override_reason: form.override_reason,
        notes: form.notes,
      }
      await apiFetch<Row>(`${ENDPOINT}/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      setSaved(true)
      window.setTimeout(() => router.push(`${ROUTE_BASE}/${id}`), 450)
    } catch (err: any) {
      setError(err?.message || "Erro ao guardar checklist de segurança.")
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
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href={ROUTE_BASE} className="hover:text-foreground">Checklist de segurança</Link>
                <span>/</span>
                <Link href={`${ROUTE_BASE}/${id}`} className="font-mono hover:text-foreground">{row?.custom_id || `#${id}`}</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">Editar</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <h1 className="font-display text-[14px] font-semibold leading-tight text-foreground">
                  Editar checklist de segurança
                </h1>
                <span className="rounded-full border border-violet-300/70 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300">
                  {phaseLabel}
                </span>
                <span className="rounded-full border border-blue-300/70 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
                  {statusLabel}
                </span>
                <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
                  isComplete
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                    : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
                }`}>
                  {done}/{total} verificados
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1">
              {saved ? (
                <span className="inline-flex h-6 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <Check size={11} />
                  Guardado
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

        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-emerald-500" />
          <div className="space-y-1.5 px-2 py-1.5 pl-3">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  <ClipboardCheck size={12} />
                  <span>Resumo de segurança</span>
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {isComplete ? "Todos os pontos críticos estão confirmados." : "Complete os pontos pendentes antes de encerrar o checklist."}
                </p>
              </div>
              <div className="min-w-[180px]">
                <div className="mb-0.5 flex items-center justify-between text-[9px] font-semibold text-muted-foreground">
                  <span>Conclusão</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full ${isComplete ? "bg-emerald-500" : done >= 4 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
            {needsOverrideReason ? (
              <div className="flex items-start gap-1.5 rounded-md border border-fuchsia-300 bg-fuchsia-50 px-2 py-1 text-[10px] font-semibold text-fuchsia-800 dark:border-fuchsia-700/30 dark:bg-fuchsia-900/20 dark:text-fuchsia-300">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>Informe o motivo de sobrescrita antes de guardar este estado.</span>
              </div>
            ) : null}
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-1 lg:grid-cols-[1.15fr_0.85fr]">
          <Card title="Verificações" icon={<CheckCircle2 size={12} />}>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {CHECK_FIELDS.map((field) => (
                <CheckToggle
                  key={String(field.key)}
                  label={field.label}
                  detail={field.detail}
                  checked={Boolean(form[field.key])}
                  onChange={(value) => update(field.key, value as never)}
                />
              ))}
            </div>
          </Card>

          <div className="space-y-1">
            <Card title="Identificação" icon={<ShieldCheck size={12} />} className="z-50">
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
                <Field label="Preenchido por">
                  <SearchableRelationSelect
                    fieldName="completed_by"
                    value={form.completed_by}
                    onChange={(value) => update("completed_by", asId(value))}
                    target={RELATION_TARGETS.completed_by}
                    initialOptions={relationOptions.completed_by}
                    placeholder="Pesquisar responsável..."
                  />
                </Field>
                <div className="grid grid-cols-2 gap-1.5">
                  <Field label="Fase">
                    <select value={form.phase} onChange={(event) => update("phase", event.target.value)} className={INPUT}>
                      {PHASE_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Estado">
                    <select value={form.status} onChange={(event) => update("status", event.target.value)} className={INPUT}>
                      {STATUS_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            </Card>

            <Card title="Contexto" icon={<Scissors size={12} />}>
              <div className="grid grid-cols-2 gap-1">
                <ContextField label="Cirurgia" value={row?.surgery_code || surgery?.custom_id || (form.surgery ? `#${form.surgery}` : "—")} icon={<Scissors size={9} />} />
                <ContextField label="Paciente" value={row?.patient_name || surgery?.patient_name} icon={<User size={9} />} />
                <ContextField label="Procedimento" value={surgery?.procedure} icon={<FileText size={9} />} />
                <ContextField label="Agendada" value={fmtDateTime(surgery?.scheduled_for)} icon={<CalendarClock size={9} />} />
              </div>
            </Card>
          </div>
        </div>

        <Card title="Notas e sobrescrita" icon={<FileText size={12} />}>
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
            <Field label="Motivo de sobrescrita">
              <textarea
                value={form.override_reason}
                onChange={(event) => update("override_reason", event.target.value)}
                rows={3}
                className={`min-h-[62px] w-full rounded-md border px-2 py-1.5 text-[11px] text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-1 ${
                  form.status === "OVERRIDDEN"
                    ? "border-fuchsia-300 bg-fuchsia-50/80 focus:border-fuchsia-400 focus:ring-fuchsia-200 dark:border-fuchsia-700/40 dark:bg-fuchsia-900/20 dark:focus:ring-fuchsia-800"
                    : "border-border bg-card/70 focus:border-violet-400 focus:ring-violet-200 dark:focus:ring-violet-800"
                }`}
                placeholder={form.status === "OVERRIDDEN" ? "Explique a razão da sobrescrita." : "Usar apenas se o checklist for sobrescrito."}
              />
            </Field>
            <Field label="Observações">
              <textarea
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                rows={3}
                className="min-h-[62px] w-full rounded-md border border-border bg-card/70 px-2 py-1.5 text-[11px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-violet-400 focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
                placeholder="Notas do checklist de segurança..."
              />
            </Field>
          </div>
        </Card>
      </form>
    </AppLayout>
  )
}
