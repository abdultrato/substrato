"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  CalendarClock,
  CreditCard,
  Loader2,
  Save,
  Scissors,
  Stethoscope,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { SearchableRelationSelect } from "@/components/form/AutoForm"
import type { RelationTarget } from "@/lib/resources/relationOptions"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"

const GLASS = "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const T_PATIENT: RelationTarget = { endpoint: "/clinical/patient/", labelFields: ["name", "document_number", "custom_id"] }
const T_SURGEON: RelationTarget = { endpoint: "/consultations/doctors/", labelFields: ["name", "custom_id"] }
const T_ROOM: RelationTarget = { endpoint: "/surgery/centro_cirurgico/", labelFields: ["name", "custom_id"] }
const T_SPECIALTY: RelationTarget = { endpoint: "/consultations/specialties/", labelFields: ["name"] }
const T_REQUEST: RelationTarget = { endpoint: "/surgery/pedido_cirurgico/", labelFields: ["custom_id", "id"] }

const STATUS_CHOICES = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "REQUESTED", label: "Solicitada" },
  { value: "UNDER_ASSESSMENT", label: "Em avaliação" },
  { value: "FINANCIAL_PENDING", label: "Financeiro pendente" },
  { value: "AUTHORIZED", label: "Autorizada" },
  { value: "AGENDADA", label: "Agendada" },
  { value: "PATIENT_CHECKED_IN", label: "Check-in" },
  { value: "PREOPERATIVE_PREPARATION", label: "Preparação pré-op." },
  { value: "PREPARED", label: "Preparada" },
  { value: "IN_OPERATING_ROOM", label: "Em sala operatória" },
  { value: "ANESTHESIA_STARTED", label: "Anestesia iniciada" },
  { value: "SURGERY_STARTED", label: "Cirurgia iniciada" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "SURGERY_COMPLETED", label: "Cirurgia realizada" },
  { value: "CONCLUIDA", label: "Concluída" },
  { value: "IN_RECOVERY", label: "Em recuperação" },
  { value: "RECOVERED", label: "Recuperado" },
  { value: "REPORT_PENDING", label: "Relatório pendente" },
  { value: "BILLING_PENDING", label: "Faturação pendente" },
  { value: "CLOSED", label: "Fechada" },
  { value: "POSTPONED", label: "Adiada" },
  { value: "CANCELADA", label: "Cancelada" },
]

const PRIORITY_CHOICES = [
  { value: "EMERGENCY", label: "Emergência" },
  { value: "URGENT", label: "Urgente" },
  { value: "ELECTIVE", label: "Eletiva" },
  { value: "SCHEDULED", label: "Agendada" },
]

const CLASSIFICATION_CHOICES = [
  { value: "MINOR", label: "Minor" },
  { value: "INTERMEDIATE", label: "Intermediária" },
  { value: "MAJOR", label: "Major" },
  { value: "COMPLEX", label: "Complexa" },
]

function SurfaceCard({ title, icon, accent = "bg-sky-400", children }: {
  title: string; icon: React.ReactNode; accent?: string; children: React.ReactNode
}) {
  return (
    <section className={`relative overflow-hidden ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="flex flex-col gap-3 px-3 py-3 pl-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
          {icon}<span>{title}</span>
        </div>
        {children}
      </div>
    </section>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full rounded-lg border border-white/30 bg-white/40 px-2.5 py-1.5 text-[12px] text-[var(--text)] placeholder-[var(--gray-400)] backdrop-blur-sm focus:border-[var(--primary-400)] focus:outline-none dark:border-white/10 dark:bg-white/[0.06]"
const selectCls = `${inputCls} cursor-pointer`

export default function SmallSurgeryEditPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // form state
  const [patient, setPatient] = useState<number | null>(null)
  const [surgeon, setSurgeon] = useState<number | null>(null)
  const [operatingRoom, setOperatingRoom] = useState<number | null>(null)
  const [specialty, setSpecialty] = useState<number | null>(null)
  const [procedure, setProcedure] = useState("")
  const [description, setDescription] = useState("")
  const [preDiag, setPreDiag] = useState("")
  const [posDiag, setPosDiag] = useState("")
  const [status, setStatus] = useState("DRAFT")
  const [priority, setPriority] = useState("ELECTIVE")
  const [classification, setClassification] = useState("")
  const [scheduledFor, setScheduledFor] = useState("")
  const [startedAt, setStartedAt] = useState("")
  const [endedAt, setEndedAt] = useState("")
  const [completedAt, setCompletedAt] = useState("")
  const [estimatedPrice, setEstimatedPrice] = useState("0.00")
  const [vatPct, setVatPct] = useState("16.00")
  const [code, setCode] = useState("")

  const toDatetimeLocal = (v: any) => {
    if (!v) return ""
    try { return new Date(v).toISOString().slice(0, 16) } catch { return "" }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await apiFetch<Record<string, any>>(`/surgery/small_surgery/${id}/`)
      setCode(d.custom_id || `#${d.id}`)
      setPatient(d.patient ?? null)
      setSurgeon(d.surgeon ?? null)
      setOperatingRoom(d.operating_room ?? null)
      setSpecialty(d.specialty ?? null)
      setProcedure(d.procedure || "")
      setDescription(d.description || "")
      setPreDiag(d.preoperative_diagnosis || "")
      setPosDiag(d.postoperative_diagnosis || "")
      setStatus(d.status || "DRAFT")
      setPriority(d.priority || "ELECTIVE")
      setClassification(d.classification || "")
      setScheduledFor(toDatetimeLocal(d.scheduled_for || d.agendada_para))
      setStartedAt(toDatetimeLocal(d.started_at))
      setEndedAt(toDatetimeLocal(d.ended_at))
      setCompletedAt(toDatetimeLocal(d.completed_at))
      setEstimatedPrice(d.estimated_price || "0.00")
      setVatPct(d.vat_percentage || "16.00")
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await apiFetch(`/surgery/small_surgery/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          patient,
          surgeon: surgeon ?? null,
          operating_room: operatingRoom ?? null,
          specialty: specialty ?? null,
          procedure,
          description,
          preoperative_diagnosis: preDiag,
          postoperative_diagnosis: posDiag,
          status,
          priority,
          classification: classification || null,
          scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          started_at: startedAt ? new Date(startedAt).toISOString() : null,
          ended_at: endedAt ? new Date(endedAt).toISOString() : null,
          completed_at: completedAt ? new Date(completedAt).toISOString() : null,
          estimated_price: estimatedPrice,
          vat_percentage: vatPct,
        }),
      })
      setSuccess(true)
      setTimeout(() => router.push(`/surgery/small-surgeries/${id}`), 800)
    } catch (e: any) {
      setError(e?.message || "Erro ao guardar.")
    } finally {
      setSaving(false)
    }
  }, [id, patient, surgeon, operatingRoom, specialty, procedure, description, preDiag, posDiag, status, priority, classification, scheduledFor, startedAt, endedAt, completedAt, estimatedPrice, vatPct, router])

  if (loading) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
        <div className="flex h-40 items-center justify-center text-sm text-[var(--gray-500)]">Carregando...</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
      <div className="mx-auto w-full max-w-5xl space-y-3 px-1">

        {/* header */}
        <section className={`relative overflow-hidden ${GLASS} h-[72px]`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex h-full items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href="/surgery/small-surgeries" className="hover:text-foreground">Pequenas cirurgias</Link>
                <span>/</span>
                <Link href={`/surgery/small-surgeries/${id}`} className="hover:text-foreground">{code}</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">Editar</span>
              </div>
              <h1 className="mt-0.5 font-display text-base font-semibold text-foreground">Editar cirurgia</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={save}
                disabled={saving || success}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                {saving ? "A guardar..." : success ? "Guardado!" : "Guardar"}
              </button>
              <Link
                href={`/surgery/small-surgeries/${id}`}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted"
              >
                <ArrowLeft size={11} />
                Cancelar
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-rose-300/50 bg-rose-50/60 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {/* grid 2 cols */}
        <div className="grid grid-cols-2 items-start gap-3">

          {/* col esquerda */}
          <div className="flex flex-col gap-3">

            <SurfaceCard title="Paciente e equipa" icon={<User size={13} />} accent="bg-sky-400">
              <FieldRow label="Paciente *">
                <SearchableRelationSelect
                  fieldName="patient"
                  target={T_PATIENT}
                  value={patient}
                  onChange={(v) => setPatient(v as number)}
                  placeholder="Pesquisar paciente..."
                />
              </FieldRow>
              <FieldRow label="Cirurgião">
                <SearchableRelationSelect
                  fieldName="surgeon"
                  target={T_SURGEON}
                  value={surgeon}
                  onChange={(v) => setSurgeon(v as number | null)}
                  placeholder="Pesquisar cirurgião..."
                />
              </FieldRow>
              <FieldRow label="Sala operatória">
                <SearchableRelationSelect
                  fieldName="operating_room"
                  target={T_ROOM}
                  value={operatingRoom}
                  onChange={(v) => setOperatingRoom(v as number | null)}
                  placeholder="Pesquisar sala..."
                />
              </FieldRow>
              <FieldRow label="Especialidade">
                <SearchableRelationSelect
                  fieldName="specialty"
                  target={T_SPECIALTY}
                  value={specialty}
                  onChange={(v) => setSpecialty(v as number | null)}
                  placeholder="Pesquisar especialidade..."
                />
              </FieldRow>
            </SurfaceCard>

            <SurfaceCard title="Procedimento" icon={<Scissors size={13} />} accent="bg-violet-400">
              <FieldRow label="Procedimento">
                <input className={inputCls} value={procedure} onChange={e => setProcedure(e.target.value)} placeholder="Nome do procedimento" />
              </FieldRow>
              <FieldRow label="Descrição">
                <textarea className={`${inputCls} resize-none`} rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição livre" />
              </FieldRow>
              <div className="grid grid-cols-2 gap-2">
                <FieldRow label="Prioridade">
                  <select className={selectCls} value={priority} onChange={e => setPriority(e.target.value)}>
                    {PRIORITY_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </FieldRow>
                <FieldRow label="Classificação">
                  <select className={selectCls} value={classification} onChange={e => setClassification(e.target.value)}>
                    <option value="">—</option>
                    {CLASSIFICATION_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </FieldRow>
              </div>
            </SurfaceCard>

            <SurfaceCard title="Diagnósticos" icon={<Stethoscope size={13} />} accent="bg-amber-400">
              <FieldRow label="Diagnóstico pré-operatório">
                <textarea className={`${inputCls} resize-none`} rows={2} value={preDiag} onChange={e => setPreDiag(e.target.value)} placeholder="Diagnóstico antes da cirurgia" />
              </FieldRow>
              <FieldRow label="Diagnóstico pós-operatório">
                <textarea className={`${inputCls} resize-none`} rows={2} value={posDiag} onChange={e => setPosDiag(e.target.value)} placeholder="Diagnóstico após a cirurgia" />
              </FieldRow>
            </SurfaceCard>

          </div>

          {/* col direita */}
          <div className="flex flex-col gap-3">

            <SurfaceCard title="Estado" icon={<Scissors size={13} />} accent="bg-emerald-400">
              <FieldRow label="Estado">
                <select className={selectCls} value={status} onChange={e => setStatus(e.target.value)}>
                  {STATUS_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </FieldRow>
            </SurfaceCard>

            <SurfaceCard title="Datas" icon={<CalendarClock size={13} />} accent="bg-indigo-400">
              <FieldRow label="Agendada para">
                <input type="datetime-local" className={inputCls} value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} />
              </FieldRow>
              <FieldRow label="Iniciada em">
                <input type="datetime-local" className={inputCls} value={startedAt} onChange={e => setStartedAt(e.target.value)} />
              </FieldRow>
              <FieldRow label="Terminada em">
                <input type="datetime-local" className={inputCls} value={endedAt} onChange={e => setEndedAt(e.target.value)} />
              </FieldRow>
              <FieldRow label="Concluída em">
                <input type="datetime-local" className={inputCls} value={completedAt} onChange={e => setCompletedAt(e.target.value)} />
              </FieldRow>
            </SurfaceCard>

            <SurfaceCard title="Financeiro" icon={<CreditCard size={13} />} accent="bg-teal-400">
              <div className="grid grid-cols-2 gap-2">
                <FieldRow label="Preço estimado (MT)">
                  <input type="number" step="0.01" className={inputCls} value={estimatedPrice} onChange={e => setEstimatedPrice(e.target.value)} />
                </FieldRow>
                <FieldRow label="IVA (%)">
                  <input type="number" step="0.01" className={inputCls} value={vatPct} onChange={e => setVatPct(e.target.value)} />
                </FieldRow>
              </div>
            </SurfaceCard>

          </div>
        </div>

        {/* acções rodapé */}
        <div className="flex justify-end gap-2 pb-4">
          <Link
            href={`/surgery/small-surgeries/${id}`}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-3 text-[11px] text-muted-foreground transition hover:bg-muted"
          >
            <ArrowLeft size={11} />
            Cancelar
          </Link>
          <button
            onClick={save}
            disabled={saving || success}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-4 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
            {saving ? "A guardar..." : success ? "Guardado!" : "Guardar alterações"}
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
