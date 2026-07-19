"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Clock3,
  FileText,
  Loader2,
  Save,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type Row = Record<string, any>

const ENDPOINT = "/surgery/equipa_cirurgica"
const ROUTE_BASE = "/surgery/teams"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const INPUT =
  "h-9 w-full rounded-lg border border-white/30 bg-white/50 px-3 text-sm text-foreground shadow-sm backdrop-blur-sm transition placeholder:text-muted-foreground focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25 dark:border-white/10 dark:bg-white/10"
const TEXTAREA =
  "min-h-[92px] w-full rounded-lg border border-white/30 bg-white/50 px-3 py-2 text-sm text-foreground shadow-sm backdrop-blur-sm transition placeholder:text-muted-foreground focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25 dark:border-white/10 dark:bg-white/10"

const ROLES: { value: string; label: string }[] = [
  { value: "MAIN_SURGEON", label: "Cirurgião principal" },
  { value: "SURGEON", label: "Cirurgião" },
  { value: "ASSISTANT_SURGEON", label: "Cirurgião assistente" },
  { value: "ASSISTANT", label: "Assistente" },
  { value: "ANESTHETIST", label: "Anestesista" },
  { value: "SCRUB_NURSE", label: "Instrumentista" },
  { value: "CIRCULATING_NURSE", label: "Circulante" },
  { value: "RECOVERY_NURSE", label: "Enfermeiro de recuperação" },
  { value: "ORDERLY", label: "Maqueiro" },
  { value: "PERFUSIONIST", label: "Perfusionista" },
  { value: "OTHER", label: "Outro" },
]

function roleLabel(value?: string | null): string {
  return ROLES.find((role) => role.value === value)?.label || value || "—"
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toIsoOrNull(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border border-white/20 bg-white/25 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-xs font-semibold text-foreground">{value || "—"}</div>
    </div>
  )
}

function FormCard({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={`${GLASS} overflow-hidden`}>
      <div className="flex items-center gap-2 border-b border-white/20 px-4 py-3 dark:border-white/10">
        <span className="text-teal-600 dark:text-teal-300">{icon}</span>
        <h2 className="text-sm font-bold text-foreground">{label}</h2>
      </div>
      <div className="grid gap-3 p-4">{children}</div>
    </section>
  )
}

export default function SurgeryTeamMemberEditPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const router = useRouter()

  const [row, setRow] = useState<Row | null>(null)
  const [surgery, setSurgery] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [role, setRole] = useState("ASSISTANT")
  const [lead, setLead] = useState(false)
  const [present, setPresent] = useState(true)
  const [entryAt, setEntryAt] = useState("")
  const [exitAt, setExitAt] = useState("")
  const [responsibility, setResponsibility] = useState("")
  const [notes, setNotes] = useState("")

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const nextRow = await apiFetch<Row>(`${ENDPOINT}/${id}/`)
      setRow(nextRow)
      setRole(String(nextRow.role || "ASSISTANT"))
      setLead(Boolean(nextRow.lead))
      setPresent(Boolean(nextRow.present))
      setEntryAt(toDateTimeLocal(nextRow.entry_at))
      setExitAt(toDateTimeLocal(nextRow.exit_at))
      setResponsibility(String(nextRow.responsibility || ""))
      setNotes(String(nextRow.notes || ""))

      if (nextRow.surgery) {
        const nextSurgery = await apiFetch<Row>(`/surgery/surgery/${nextRow.surgery}/`).catch(() => null)
        setSurgery(nextSurgery)
      }
    } catch (err: any) {
      setError(err?.message || "Falha ao carregar membro da equipa cirúrgica.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (event: FormEvent) => {
    event.preventDefault()
    if (!id) return
    setFormError(null)

    if (entryAt && exitAt) {
      const start = new Date(entryAt).getTime()
      const end = new Date(exitAt).getTime()
      if (Number.isFinite(start) && Number.isFinite(end) && end < start) {
        setFormError("A saída não pode ser anterior à entrada.")
        return
      }
    }

    setSaving(true)
    try {
      await apiFetch(`${ENDPOINT}/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          role,
          lead,
          present,
          entry_at: toIsoOrNull(entryAt),
          exit_at: toIsoOrNull(exitAt),
          responsibility,
          notes,
        }),
      })
      router.push(`${ROUTE_BASE}/${id}`)
    } catch (err: any) {
      setFormError(err?.message || "Falha ao guardar alterações.")
    } finally {
      setSaving(false)
    }
  }, [entryAt, exitAt, id, lead, notes, present, responsibility, role, router])

  if (loading) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </div>
      </AppLayout>
    )
  }

  if (error || !row) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-2 rounded-xl border border-rose-300/50 bg-rose-50/60 px-4 py-3 text-sm text-rose-700">
            <AlertCircle size={14} /> {error || "Membro não encontrado."}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
      <form onSubmit={save} className="mx-auto w-full max-w-6xl space-y-2 px-1 py-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-teal-500" />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
          <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 pl-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href={ROUTE_BASE} className="hover:text-foreground">Equipa cirúrgica</Link>
                <span>/</span>
                <Link href={`${ROUTE_BASE}/${id}`} className="font-mono hover:text-foreground">{row.custom_id || `#${row.id}`}</Link>
              </div>
              <h1 className="mt-1 text-lg font-bold leading-tight text-foreground">Editar membro da equipa</h1>
              <p className="text-[11px] text-muted-foreground">
                {row.employee_name || "Profissional por definir"} · {row.surgery_code || `#${row.surgery}`} · {roleLabel(role)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Link href={`${ROUTE_BASE}/${id}`} className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted">
                <ArrowLeft size={11} /> Voltar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-teal-300 bg-teal-50 px-3 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-100 disabled:opacity-60 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Guardar
              </button>
            </div>
          </div>
        </section>

        {formError ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-300/50 bg-rose-50/60 px-4 py-3 text-sm text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertCircle size={14} /> {formError}
          </div>
        ) : null}

        <div className="grid gap-2 lg:grid-cols-[0.9fr_1.1fr]">
          <FormCard label="Contexto fixo" icon={<Stethoscope size={16} />}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Profissional" value={row.employee_name} />
              <Field label="Cirurgia" value={row.surgery_code || `#${row.surgery}`} />
              <Field label="Paciente" value={surgery?.patient_name || surgery?.patient_detail?.name} />
              <Field label="Estado da cirurgia" value={surgery?.status} />
            </div>
          </FormCard>

          <FormCard label="Função e presença" icon={<Users size={16} />}>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Função na cirurgia</span>
                <select value={role} onChange={(event) => setRole(event.target.value)} className={INPUT}>
                  {ROLES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                <button
                  type="button"
                  onClick={() => setLead((value) => !value)}
                  className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${lead ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-white/30 bg-white/40 text-muted-foreground hover:bg-white/60 dark:border-white/10 dark:bg-white/10"}`}
                >
                  <BadgeCheck size={13} /> Responsável
                </button>
                <button
                  type="button"
                  onClick={() => setPresent((value) => !value)}
                  className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${present ? "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300" : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300"}`}
                >
                  <UserCheck size={13} /> {present ? "Presente" : "Ausente"}
                </button>
              </div>
            </div>
          </FormCard>
        </div>

        <FormCard label="Horários da sala" icon={<Clock3 size={16} />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Entrada em sala</span>
              <input type="datetime-local" value={entryAt} onChange={(event) => setEntryAt(event.target.value)} className={INPUT} />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Saída de sala</span>
              <input type="datetime-local" value={exitAt} onChange={(event) => setExitAt(event.target.value)} className={INPUT} />
            </label>
          </div>
        </FormCard>

        <FormCard label="Responsabilidade e notas" icon={<FileText size={16} />}>
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Responsabilidade</span>
              <textarea value={responsibility} onChange={(event) => setResponsibility(event.target.value)} className={TEXTAREA} />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Notas</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={TEXTAREA} />
            </label>
          </div>
        </FormCard>
      </form>
    </AppLayout>
  )
}
