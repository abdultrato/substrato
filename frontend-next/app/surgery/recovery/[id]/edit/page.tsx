"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  CalendarClock,
  Check,
  Droplets,
  FileText,
  HeartPulse,
  Loader2,
  MapPin,
  Save,
  Scissors,
  Stethoscope,
  Syringe,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { SearchableRelationSelect } from "@/components/form/AutoForm"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"
import type { RelationOption, RelationTarget } from "@/lib/resources/relationOptions"

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const INPUT = "h-8 w-full rounded-lg border border-border bg-card/70 px-2.5 text-[12px] text-foreground outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-violet-800"
const LABEL = "mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]"

const STATUS_OPTIONS = [
  ["WAITING_PATIENT", "Aguardando paciente"],
  ["ADMITTED", "Admitido"],
  ["MONITORING", "Em vigilância"],
  ["STABLE", "Estável"],
  ["UNSTABLE", "Instável"],
  ["READY_DISCHARGE", "Alta preparada"],
  ["DISCHARGED", "Alta"],
  ["TRANSFERRED_WARD", "Transferido para enfermaria"],
  ["TRANSFERRED_ICU", "Transferido para UCI"],
  ["TRANSFERRED", "Transferido"],
  ["CLOSED", "Fechado"],
] as const

const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS) as Record<string, string>

const RELATION_TARGETS: Record<string, RelationTarget> = {
  surgery: { endpoint: "/surgery/surgery/", labelFields: ["custom_id", "patient_name", "procedure", "scheduled_for", "id"] },
  nurse: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", "id"] },
}

type RecoveryRecord = {
  id: number
  custom_id?: string | null
  surgery?: number | string | null
  nurse?: number | string | null
  admitted_at?: string | null
  discharged_at?: string | null
  status?: string | null
  consciousness_level?: string | null
  pain_score?: number | null
  aldrete_score?: number | null
  vital_signs?: Record<string, any> | null
  nausea_vomiting?: boolean | null
  bleeding?: boolean | null
  complications?: string | null
  destination?: string | null
  notes?: string | null
  surgery_code?: string | null
  patient_name?: string | null
  nurse_name?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type FormState = {
  surgery: string
  nurse: string
  admitted_at: string
  discharged_at: string
  status: string
  consciousness_level: string
  pain_score: string
  aldrete_score: string
  ta: string
  fc: string
  spo2: string
  temp: string
  fr: string
  nausea_vomiting: boolean
  bleeding: boolean
  complications: string
  destination: string
  notes: string
}

function asId(value: unknown): string {
  if (value === undefined || value === null || value === "") return ""
  return String(value)
}

function toDateTimeLocal(value?: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIsoOrNull(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function clampScore(value: string): number {
  const parsed = parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(10, parsed))
}

function relationOption(value: string, label?: string | null): RelationOption[] {
  if (!value) return []
  return [{ value, label: label || `Registo #${value}` }]
}

function fmtDate(value?: string | null): string {
  if (!value) return "Sem data"
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function valueFromVitals(vitals: Record<string, any> | null | undefined, keys: string[]): string {
  if (!vitals) return ""
  for (const key of keys) {
    const value = vitals[key]
    if (value !== undefined && value !== null && value !== "") return String(value)
  }
  return ""
}

function buildForm(row: RecoveryRecord): FormState {
  const vitals = row.vital_signs || {}
  return {
    surgery: asId(row.surgery),
    nurse: asId(row.nurse),
    admitted_at: toDateTimeLocal(row.admitted_at),
    discharged_at: toDateTimeLocal(row.discharged_at),
    status: row.status || "ADMITTED",
    consciousness_level: row.consciousness_level || "",
    pain_score: String(row.pain_score ?? 0),
    aldrete_score: String(row.aldrete_score ?? 0),
    ta: valueFromVitals(vitals, ["ta", "pa", "bp"]),
    fc: valueFromVitals(vitals, ["fc", "hr"]),
    spo2: valueFromVitals(vitals, ["spo2"]),
    temp: valueFromVitals(vitals, ["temp"]),
    fr: valueFromVitals(vitals, ["fr", "rr"]),
    nausea_vomiting: !!row.nausea_vomiting,
    bleeding: !!row.bleeding,
    complications: row.complications || "",
    destination: row.destination || "",
    notes: row.notes || "",
  }
}

function buildVitals(form: FormState): Record<string, string> {
  const vitals: Record<string, string> = {}
  if (form.ta.trim()) vitals.ta = form.ta.trim()
  if (form.fc.trim()) vitals.fc = form.fc.trim()
  if (form.spo2.trim()) vitals.spo2 = form.spo2.trim()
  if (form.temp.trim()) vitals.temp = form.temp.trim()
  if (form.fr.trim()) vitals.fr = form.fr.trim()
  return vitals
}

function scoreTone(score: number, kind: "aldrete" | "pain") {
  if (kind === "aldrete") {
    if (score >= 9) return "text-emerald-700 dark:text-emerald-300"
    if (score >= 7) return "text-amber-700 dark:text-amber-300"
    return "text-rose-700 dark:text-rose-300"
  }
  if (score <= 3) return "text-emerald-700 dark:text-emerald-300"
  if (score <= 6) return "text-amber-700 dark:text-amber-300"
  return "text-rose-700 dark:text-rose-300"
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

function Card({ title, icon, children, className = "" }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`relative overflow-visible ${GLASS} ${className}`}>
      <span className="absolute left-0 top-0 h-full w-1 bg-violet-400" />
      <div className="space-y-2 px-2.5 py-2 pl-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
          {icon}
          <span>{title}</span>
        </div>
        {children}
      </div>
    </section>
  )
}

function HistoryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-card/40 px-1.5 py-1">
      <div className="text-[8px] font-semibold uppercase tracking-[0.1em] text-[var(--gray-500)]">{label}</div>
      <div className="mt-0.5 truncate text-[10px] font-semibold leading-tight text-foreground">{value || "—"}</div>
    </div>
  )
}

export default function SurgeryRecoveryEditPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const router = useRouter()

  const [row, setRow] = useState<RecoveryRecord | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<RecoveryRecord>(`/surgery/recuperacao/${id}/`)
      setRow(data)
      setForm(buildForm(data))
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar recuperação.")
      setRow(null)
      setForm(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form) return

    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const payload = {
        surgery: form.surgery ? Number(form.surgery) : null,
        nurse: form.nurse ? Number(form.nurse) : null,
        admitted_at: toIsoOrNull(form.admitted_at),
        discharged_at: toIsoOrNull(form.discharged_at),
        status: form.status,
        consciousness_level: form.consciousness_level,
        pain_score: clampScore(form.pain_score),
        aldrete_score: clampScore(form.aldrete_score),
        vital_signs: buildVitals(form),
        nausea_vomiting: form.nausea_vomiting,
        bleeding: form.bleeding,
        complications: form.complications,
        destination: form.destination,
        notes: form.notes,
      }

      await apiFetch(`/surgery/recuperacao/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      setSaved(true)
      window.setTimeout(() => router.push(`/surgery/recovery/${id}`), 500)
    } catch (err: any) {
      setError(err?.message || "Erro ao guardar recuperação.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
        <div className="flex h-40 items-center justify-center gap-2 text-sm text-[var(--gray-500)]">
          <Loader2 size={16} className="animate-spin" />
          Carregando...
        </div>
      </AppLayout>
    )
  }

  if (!row || !form) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error || "Recuperação não encontrada."}
        </div>
      </AppLayout>
    )
  }

  const painScore = clampScore(form.pain_score)
  const aldreteScore = clampScore(form.aldrete_score)

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[99vw] space-y-1 px-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-col gap-1.5 px-2.5 py-1.5 pl-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href="/surgery/recovery" className="hover:text-foreground">Recuperação</Link>
                <span>/</span>
                <Link href={`/surgery/recovery/${id}`} className="font-semibold text-foreground hover:text-violet-600">
                  {row.custom_id || `#${row.id}`}
                </Link>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="font-display text-[15px] font-semibold leading-tight text-foreground">
                  Editar recuperação pós-anestésica
                </h1>
                <span className="rounded-full border border-violet-300/70 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300">
                  {STATUS_LABEL[form.status] || form.status}
                </span>
                <span className={`rounded-full border border-border bg-card px-1.5 py-0.5 text-[9px] font-semibold ${scoreTone(aldreteScore, "aldrete")}`}>
                  Aldrete {aldreteScore}/10
                </span>
                <span className={`rounded-full border border-border bg-card px-1.5 py-0.5 text-[9px] font-semibold ${scoreTone(painScore, "pain")}`}>
                  Dor {painScore}/10
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1">
              {saved ? (
                <span className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <Check size={11} />
                  Guardado
                </span>
              ) : null}
              <Link
                href={`/surgery/recovery/${id}`}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft size={11} />
                Voltar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Guardar
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
          <Card title="Cirurgia e admissão" icon={<Scissors size={12} />} className="z-50">
            <div className="grid grid-cols-1 gap-2">
              <Field label="Cirurgia">
                <SearchableRelationSelect
                  fieldName="surgery"
                  value={form.surgery}
                  onChange={(value) => update("surgery", asId(value))}
                  target={RELATION_TARGETS.surgery}
                  initialOptions={relationOption(form.surgery, row.surgery_code)}
                  placeholder="Pesquisar cirurgia..."
                />
              </Field>
              <Field label="Enfermeiro">
                <SearchableRelationSelect
                  fieldName="nurse"
                  value={form.nurse}
                  onChange={(value) => update("nurse", asId(value))}
                  target={RELATION_TARGETS.nurse}
                  initialOptions={relationOption(form.nurse, row.nurse_name)}
                  placeholder="Pesquisar enfermeiro..."
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Admitido em">
                  <TextInput type="datetime-local" value={form.admitted_at} onChange={(value) => update("admitted_at", value)} />
                </Field>
                <Field label="Alta em">
                  <TextInput type="datetime-local" value={form.discharged_at} onChange={(value) => update("discharged_at", value)} />
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Estado clínico" icon={<HeartPulse size={12} />}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Estado">
                <select value={form.status} onChange={(event) => update("status", event.target.value)} className={INPUT}>
                  {STATUS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Consciência">
                <TextInput value={form.consciousness_level} onChange={(value) => update("consciousness_level", value)} placeholder="Ex.: alerta e orientado" />
              </Field>
              <Field label="Aldrete">
                <TextInput type="number" value={form.aldrete_score} onChange={(value) => update("aldrete_score", value)} />
              </Field>
              <Field label="Dor">
                <TextInput type="number" value={form.pain_score} onChange={(value) => update("pain_score", value)} />
              </Field>
            </div>
          </Card>

          <Card title="Sinais vitais" icon={<Stethoscope size={12} />}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="TA">
                <TextInput value={form.ta} onChange={(value) => update("ta", value)} placeholder="120/80" />
              </Field>
              <Field label="FC">
                <TextInput value={form.fc} onChange={(value) => update("fc", value)} placeholder="bpm" />
              </Field>
              <Field label="SpO2">
                <TextInput value={form.spo2} onChange={(value) => update("spo2", value)} placeholder="%" />
              </Field>
              <Field label="Temperatura">
                <TextInput value={form.temp} onChange={(value) => update("temp", value)} placeholder="°C" />
              </Field>
              <Field label="FR">
                <TextInput value={form.fr} onChange={(value) => update("fr", value)} placeholder="irpm" />
              </Field>
            </div>
          </Card>

          <Card title="Intercorrências" icon={<AlertTriangle size={12} />}>
            <div className="grid grid-cols-1 gap-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex h-8 items-center gap-2 rounded-lg border border-border/70 bg-card/40 px-2.5 text-[12px] font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={form.nausea_vomiting}
                    onChange={(event) => update("nausea_vomiting", event.target.checked)}
                    className="h-4 w-4"
                  />
                  <AlertTriangle size={12} />
                  Náuseas/vómitos
                </label>
                <label className="flex h-8 items-center gap-2 rounded-lg border border-border/70 bg-card/40 px-2.5 text-[12px] font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={form.bleeding}
                    onChange={(event) => update("bleeding", event.target.checked)}
                    className="h-4 w-4"
                  />
                  <Droplets size={12} />
                  Sangramento
                </label>
              </div>
              <Field label="Complicações">
                <textarea
                  value={form.complications}
                  onChange={(event) => update("complications", event.target.value)}
                  rows={3}
                  className="min-h-[72px] w-full rounded-lg border border-border bg-card/70 px-2.5 py-2 text-[12px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-violet-400 focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
                  placeholder="Intercorrências observadas..."
                />
              </Field>
            </div>
          </Card>

          <Card title="Alta e destino" icon={<MapPin size={12} />}>
            <div className="grid grid-cols-1 gap-2">
              <Field label="Destino após alta">
                <TextInput value={form.destination} onChange={(value) => update("destination", value)} placeholder="Ex.: enfermaria, UCI, domicílio" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/70 bg-card/40 px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--gray-500)]">
                    <Activity size={12} />
                    Aldrete
                  </div>
                  <p className={`mt-1 text-[18px] font-semibold leading-none ${scoreTone(aldreteScore, "aldrete")}`}>{aldreteScore}/10</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-card/40 px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--gray-500)]">
                    <Syringe size={12} />
                    Dor
                  </div>
                  <p className={`mt-1 text-[18px] font-semibold leading-none ${scoreTone(painScore, "pain")}`}>{painScore}/10</p>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Observações" icon={<FileText size={12} />}>
            <textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              rows={5}
              className="min-h-[112px] w-full rounded-lg border border-border bg-card/70 px-2.5 py-2 text-[12px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-violet-400 focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
              placeholder="Notas de recuperação, orientações ou plano de alta..."
            />
          </Card>
        </div>

        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />
          <div className="space-y-1 px-2 py-1.5 pl-4">
            <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">
              <CalendarClock size={11} />
              <span>Histórico e contexto</span>
            </div>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 xl:grid-cols-8">
              <HistoryItem label="Criado em" value={fmtDate(row.created_at)} />
              <HistoryItem label="Atualizado em" value={fmtDate(row.updated_at)} />
              <HistoryItem label="Admissão" value={fmtDate(row.admitted_at)} />
              <HistoryItem label="Alta" value={fmtDate(row.discharged_at)} />
              <HistoryItem label="Cirurgia" value={row.surgery_code || `#${row.surgery}`} />
              <HistoryItem label="Paciente" value={row.patient_name} />
              <HistoryItem label="Enfermeiro" value={row.nurse_name} />
              <HistoryItem label="Estado" value={STATUS_LABEL[row.status || ""] || row.status || "Sem estado"} />
            </div>
          </div>
        </section>
      </form>
    </AppLayout>
  )
}
