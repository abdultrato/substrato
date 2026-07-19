"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  CalendarClock,
  Droplets,
  Edit3,
  FileText,
  HeartPulse,
  MapPin,
  Scissors,
  Stethoscope,
  Syringe,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const STATUS_LABEL: Record<string, string> = {
  WAITING_PATIENT: "Aguardando paciente",
  ADMITTED: "Admitido",
  MONITORING: "Em vigilância",
  STABLE: "Estável",
  UNSTABLE: "Instável",
  READY_DISCHARGE: "Alta preparada",
  DISCHARGED: "Alta",
  TRANSFERRED_WARD: "Transferido para enfermaria",
  TRANSFERRED_ICU: "Transferido para UCI",
  TRANSFERRED: "Transferido",
  CLOSED: "Fechado",
}

const SURGERY_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  REQUESTED: "Solicitada",
  UNDER_ASSESSMENT: "Em avaliação",
  FINANCIAL_PENDING: "Financeiro pendente",
  AUTHORIZED: "Autorizada",
  AGENDADA: "Agendada",
  PATIENT_CHECKED_IN: "Check-in",
  PREOPERATIVE_PREPARATION: "Preparação pré-op.",
  PREPARED: "Preparada",
  IN_OPERATING_ROOM: "Em sala operatória",
  ANESTHESIA_STARTED: "Anestesia iniciada",
  SURGERY_STARTED: "Cirurgia iniciada",
  EM_ANDAMENTO: "Em andamento",
  SURGERY_COMPLETED: "Cirurgia realizada",
  CONCLUIDA: "Concluída",
  IN_RECOVERY: "Em recuperação",
  RECOVERED: "Recuperado",
  REPORT_PENDING: "Relatório pendente",
  BILLING_PENDING: "Faturação pendente",
  CLOSED: "Fechada",
  POSTPONED: "Adiada",
  CANCELADA: "Cancelada",
}

const SURGERY_SIZE_LABEL: Record<string, string> = {
  PEQUENA: "Pequena cirurgia",
  GRANDE: "Grande cirurgia",
}

type RecoveryRecord = {
  id: number
  custom_id?: string | null
  surgery?: number | null
  nurse?: number | null
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

type SurgeryContext = {
  id: number
  custom_id?: string | null
  patient_name?: string | null
  procedure?: string | null
  procedure_names?: string[] | null
  surgery_size?: string | null
  status?: string | null
  scheduled_for?: string | null
  started_at?: string | null
  ended_at?: string | null
  operating_room_name?: string | null
  surgeon_name?: string | null
  surgeon_names?: Array<{ id: number; name: string }> | null
}

function fmtDate(value?: string | null): string | null {
  if (!value) return null
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

function statusBadge(status?: string | null) {
  if (status === "STABLE" || status === "READY_DISCHARGE" || status === "DISCHARGED") {
    return "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
  }
  if (status === "UNSTABLE" || status === "TRANSFERRED_ICU") {
    return "border-rose-300/70 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300"
  }
  if (status === "MONITORING") {
    return "border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
  }
  return "border-violet-300/70 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300"
}

function aldreteTone(score: number) {
  if (score >= 9) return "text-emerald-700 dark:text-emerald-300"
  if (score >= 7) return "text-amber-700 dark:text-amber-300"
  return "text-rose-700 dark:text-rose-300"
}

function painTone(score: number) {
  if (score <= 3) return "text-emerald-700 dark:text-emerald-300"
  if (score <= 6) return "text-amber-700 dark:text-amber-300"
  return "text-rose-700 dark:text-rose-300"
}

function vitalEntries(vitals?: Record<string, any> | null): Array<{ label: string; value: string }> {
  if (!vitals || typeof vitals !== "object") return []
  const mapping: Array<[string, string, string]> = [
    ["ta", "TA", ""],
    ["bp", "TA", ""],
    ["pa", "TA", ""],
    ["fc", "FC", " bpm"],
    ["hr", "FC", " bpm"],
    ["spo2", "SpO2", "%"],
    ["temp", "Temp.", " C"],
    ["fr", "FR", " irpm"],
    ["rr", "FR", " irpm"],
  ]
  const items: Array<{ label: string; value: string }> = []
  const seen = new Set<string>()
  for (const [key, label, suffix] of mapping) {
    const raw = vitals[key]
    if (raw === undefined || raw === null || raw === "" || seen.has(label)) continue
    items.push({ label, value: `${raw}${suffix}` })
    seen.add(label)
  }
  for (const [key, raw] of Object.entries(vitals)) {
    if (raw === undefined || raw === null || raw === "" || mapping.some(([mapped]) => mapped === key)) continue
    items.push({ label: key, value: String(raw) })
  }
  return items
}

function surgeryHref(surgery: SurgeryContext | null, fallbackId?: number | null): string {
  const id = surgery?.id || fallbackId
  if (!id) return "/surgery"
  if (surgery?.surgery_size === "GRANDE") return `/surgery/large-surgeries/${id}`
  if (surgery?.surgery_size === "PEQUENA") return `/surgery/small-surgeries/${id}`
  return `/surgery/surgeries/${id}`
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (!value && value !== 0) return null
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">{label}</div>
      <div className={`mt-0.5 break-words text-[12px] font-medium text-foreground ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  )
}

function SurfaceCard({
  title,
  icon,
  accent = "bg-violet-400",
  children,
}: {
  title: string
  icon: React.ReactNode
  accent?: string
  children: React.ReactNode
}) {
  return (
    <section className={`relative overflow-hidden ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
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

function Metric({ label, value, icon, tone = "" }: { label: string; value: string; icon: React.ReactNode; tone?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-border/60 bg-card/45 px-2 py-1">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">{label}</div>
        <div className={`truncate text-[12px] font-semibold ${tone || "text-foreground"}`}>{value}</div>
      </div>
    </div>
  )
}

export default function SurgeryRecoveryDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)

  const [data, setData] = useState<RecoveryRecord | null>(null)
  const [surgery, setSurgery] = useState<SurgeryContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const recovery = await apiFetch<RecoveryRecord>(`/surgery/recuperacao/${id}/`)
      setData(recovery)
      if (recovery.surgery) {
        const surgeryData = await apiFetch<SurgeryContext>(`/surgery/surgery/${recovery.surgery}/`).catch(() => null)
        setSurgery(surgeryData)
      } else {
        setSurgery(null)
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar recuperação.")
      setData(null)
      setSurgery(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
        <div className="flex h-40 items-center justify-center text-sm text-[var(--gray-500)]">Carregando...</div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error || "Registo de recuperação não encontrado."}
        </div>
      </AppLayout>
    )
  }

  const status = data.status || ""
  const code = data.custom_id || `#${data.id}`
  const painScore = Number(data.pain_score || 0)
  const aldreteScore = Number(data.aldrete_score || 0)
  const vitals = vitalEntries(data.vital_signs)
  const procedureNames = surgery?.procedure_names?.length ? surgery.procedure_names.join(", ") : surgery?.procedure
  const surgeons = surgery?.surgeon_names?.length
    ? surgery.surgeon_names.map((item) => item.name).join(", ")
    : surgery?.surgeon_name
  const hasAlert = !!data.bleeding || !!data.nausea_vomiting || !!data.complications || status === "UNSTABLE"

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-[99vw] space-y-1 px-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${status === "UNSTABLE" ? "bg-rose-500" : "bg-violet-500"}`} />
          <div className="space-y-1 px-2.5 py-1.5 pl-4">
            <div className="flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                  <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                  <span>/</span>
                  <Link href="/surgery/recovery" className="hover:text-foreground">Recuperação</Link>
                  <span>/</span>
                  <span className="font-semibold text-foreground">{code}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <h1 className="font-display text-[15px] font-semibold leading-tight text-foreground">
                    {data.patient_name || surgery?.patient_name || "Paciente em recuperação"}
                  </h1>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${statusBadge(status)}`}>
                    {STATUS_LABEL[status] || status || "Sem estado"}
                  </span>
                  {hasAlert ? (
                    <span className="rounded-full border border-rose-300/70 bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
                      Atenção clínica
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1">
                <Link
                  href="/surgery/recovery"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <ArrowLeft size={11} />
                  Voltar
                </Link>
                <Link
                  href={`/surgery/recovery/${data.id}/edit`}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300"
                >
                  <Edit3 size={11} />
                  Editar
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
              <Metric label="Aldrete" value={`${aldreteScore}/10`} icon={<Activity size={13} />} tone={aldreteTone(aldreteScore)} />
              <Metric label="Dor" value={`${painScore}/10`} icon={<Syringe size={13} />} tone={painTone(painScore)} />
              <Metric label="Admissão" value={fmtDate(data.admitted_at) || "Sem data"} icon={<CalendarClock size={13} />} />
              <Metric label="Destino" value={data.destination || "Por definir"} icon={<MapPin size={13} />} />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-1 xl:grid-cols-[1.05fr_0.95fr]">
          <SurfaceCard title="Avaliação pós-anestésica" icon={<HeartPulse size={12} />} accent="bg-violet-400">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-4">
              <Field label="Consciência" value={data.consciousness_level || "Sem registo"} />
              <Field label="Estado" value={STATUS_LABEL[status] || status} />
              <Field label="Admitido em" value={fmtDate(data.admitted_at)} />
              <Field label="Alta em" value={fmtDate(data.discharged_at)} />
              <Field label="Enfermeiro" value={data.nurse_name || (data.nurse ? `#${data.nurse}` : null)} />
              <Field label="Registo" value={code} mono />
            </div>

            <div className="grid grid-cols-1 gap-1 md:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--gray-500)]">
                  <Activity size={12} />
                  Aldrete
                </div>
                <p className={`mt-1 text-[18px] font-semibold leading-none ${aldreteTone(aldreteScore)}`}>{aldreteScore}/10</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--gray-500)]">
                  <Syringe size={12} />
                  Dor
                </div>
                <p className={`mt-1 text-[18px] font-semibold leading-none ${painTone(painScore)}`}>{painScore}/10</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--gray-500)]">
                  <BedDouble size={12} />
                  Alta
                </div>
                <p className="mt-1 text-[12px] font-semibold text-foreground">
                  {data.discharged_at ? "Alta registada" : "Em acompanhamento"}
                </p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard title="Sinais vitais" icon={<Stethoscope size={12} />} accent="bg-sky-400">
            {vitals.length ? (
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {vitals.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-1.5">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">{item.label}</div>
                    <div className="mt-0.5 text-[13px] font-semibold text-foreground">{item.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-6 text-center text-[12px] text-[var(--gray-500)]">
                Sem sinais vitais estruturados neste registo.
              </p>
            )}
          </SurfaceCard>
        </div>

        <div className="grid grid-cols-1 gap-1 xl:grid-cols-[0.9fr_1.1fr]">
          <SurfaceCard title="Intercorrências" icon={<AlertTriangle size={12} />} accent={hasAlert ? "bg-rose-400" : "bg-emerald-400"}>
            <div className="grid grid-cols-1 gap-1 md:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--gray-500)]">
                  <AlertTriangle size={12} />
                  Náuseas/vómitos
                </div>
                <p className={`mt-1 text-[12px] font-semibold ${data.nausea_vomiting ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                  {data.nausea_vomiting ? "Registado" : "Não registado"}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--gray-500)]">
                  <Droplets size={12} />
                  Sangramento
                </div>
                <p className={`mt-1 text-[12px] font-semibold ${data.bleeding ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                  {data.bleeding ? "Registado" : "Não registado"}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--gray-500)]">
                  <MapPin size={12} />
                  Destino
                </div>
                <p className="mt-1 text-[12px] font-semibold text-foreground">{data.destination || "Por definir"}</p>
              </div>
            </div>
            {data.complications ? (
              <p className="whitespace-pre-wrap rounded-lg border border-rose-200 bg-rose-50/70 px-2.5 py-1.5 text-[12px] leading-5 text-rose-800 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
                {data.complications}
              </p>
            ) : null}
          </SurfaceCard>

          <SurfaceCard title="Cirurgia vinculada" icon={<Scissors size={12} />} accent="bg-emerald-400">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Field
                label="Cirurgia"
                value={
                  data.surgery ? (
                    <Link href={surgeryHref(surgery, data.surgery)} className="font-mono text-violet-700 hover:underline dark:text-violet-300">
                      {data.surgery_code || surgery?.custom_id || `#${data.surgery}`}
                    </Link>
                  ) : null
                }
              />
              <Field label="Paciente" value={data.patient_name || surgery?.patient_name} />
              <Field label="Porte" value={surgery?.surgery_size ? SURGERY_SIZE_LABEL[surgery.surgery_size] || surgery.surgery_size : null} />
              <Field label="Estado" value={surgery?.status ? SURGERY_STATUS_LABEL[surgery.status] || surgery.status : null} />
              <Field label="Agendada para" value={fmtDate(surgery?.scheduled_for)} />
              <Field label="Sala" value={surgery?.operating_room_name} />
            </div>
            {procedureNames ? (
              <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">
                  <Stethoscope size={12} />
                  Procedimento
                </div>
                <p className="mt-1 text-[12px] font-medium text-foreground">{procedureNames}</p>
              </div>
            ) : null}
            {surgeons ? (
              <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">
                  <User size={12} />
                  Equipa médica
                </div>
                <p className="mt-1 text-[12px] font-medium text-foreground">{surgeons}</p>
              </div>
            ) : null}
          </SurfaceCard>
        </div>

        <SurfaceCard title="Observações" icon={<FileText size={12} />} accent="bg-amber-400">
          {data.notes ? (
            <p className="whitespace-pre-wrap rounded-lg border border-border/70 bg-card/50 px-2.5 py-1.5 text-[12px] leading-5 text-foreground">
              {data.notes}
            </p>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-4 text-center text-[12px] text-[var(--gray-500)]">
              Sem observações registadas para a recuperação.
            </p>
          )}
        </SurfaceCard>
      </div>
    </AppLayout>
  )
}
