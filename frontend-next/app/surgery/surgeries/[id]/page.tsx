"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Edit3,
  FileText,
  Receipt,
  Scissors,
  Stethoscope,
  User,
  Users,
  X,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { formatInvoiceStatus } from "@/lib/billingStatus"
import { GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"
import { surgeryProcedureGroupLabel } from "@/lib/surgeryLabels"

const GLASS =
  "rounded-lg border border-white/45 bg-white/55 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"

const TERMINAL_STATUSES = new Set([
  "SURGERY_COMPLETED",
  "CONCLUIDA",
  "IN_RECOVERY",
  "RECOVERED",
  "REPORT_PENDING",
  "BILLING_PENDING",
  "CLOSED",
  "CANCELADA",
  "CANCELLED",
])

const DONE_STATUSES = new Set([
  "SURGERY_COMPLETED",
  "CONCLUIDA",
  "IN_RECOVERY",
  "RECOVERED",
  "REPORT_PENDING",
  "BILLING_PENDING",
  "CLOSED",
])

const STATUS_LABEL: Record<string, string> = {
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
  RECOVERED: "Recuperada",
  REPORT_PENDING: "Relatório pendente",
  BILLING_PENDING: "Faturação pendente",
  CLOSED: "Fechada",
  POSTPONED: "Adiada",
  CANCELADA: "Cancelada",
}

const SIZE_LABEL: Record<string, string> = {
  PEQUENA: "Pequena",
  GRANDE: "Grande",
}

const PRIORITY_LABEL: Record<string, string> = {
  ELECTIVE: "Eletiva",
  URGENT: "Urgente",
  EMERGENCY: "Emergência",
}

const CLASS_LABEL: Record<string, string> = {
  MINOR: "Pequena",
  MAJOR: "Maior",
  ELECTIVE: "Eletiva",
  EMERGENCY: "Urgência",
  AMBULATORY: "Ambulatória",
  INPATIENT: "Internamento",
  DAY_SURGERY: "Hospital de dia",
}

type PersonRef = {
  id?: number
  name?: string
}

type Surgery = {
  id: number
  custom_id?: string
  patient?: number
  patient_name?: string
  surgical_request?: number | null
  surgical_request_code?: string | null
  specialty?: number | null
  specialty_name?: string | null
  surgeon_name?: string | null
  surgeon_names?: PersonRef[]
  operating_room_name?: string | null
  ward_name?: string | null
  procedure?: string | null
  procedure_names?: string[]
  procedure_details?: { id?: number; name?: string; surgery_type?: string | null }[]
  description?: string | null
  preoperative_diagnosis?: string | null
  postoperative_diagnosis?: string | null
  estimated_price?: string | number | null
  vat_percentage?: string | number | null
  applies_vat_by_default?: boolean
  procedures_price_total?: string | number | null
  procedures_vat_percentage?: string | number | null
  scheduled_for?: string | null
  started_at?: string | null
  ended_at?: string | null
  completed_at?: string | null
  ward_referral_requested_at?: string | null
  canceled_at?: string | null
  status?: string
  surgery_size?: string | null
  priority?: string | null
  classification?: string | null
  invoice_id?: number | null
  invoice_code?: string | null
  invoice_status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

function toNumber(value: unknown) {
  const n = Number.parseFloat(String(value ?? "0").replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

function fmtDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function money(value: number) {
  if (!value) return "0 MT"
  return `${value.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MT`
}

function statusBadge(status: string) {
  if (DONE_STATUSES.has(status)) {
    return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300"
  }
  if (["CANCELADA", "CANCELLED"].includes(status)) {
    return "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300"
  }
  if (["IN_OPERATING_ROOM", "ANESTHESIA_STARTED", "SURGERY_STARTED", "EM_ANDAMENTO"].includes(status)) {
    return "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-300"
  }
  return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300"
}

function invoiceStatusLabel(status?: string | null, hasInvoice = false) {
  return formatInvoiceStatus(status, { hasInvoice })
}

function Field({ label, value, mono = false }: { label: string; value?: ReactNode; mono?: boolean }) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div className="min-w-0 rounded-md border border-white/35 bg-white/35 px-1.5 py-1 dark:border-white/10 dark:bg-white/[0.03]">
      <dt className="truncate text-[8px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 min-w-0 break-words text-[10px] font-semibold leading-tight text-foreground ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  )
}

function InfoCard({
  title,
  icon,
  accent,
  children,
  wide = false,
}: {
  title: string
  icon: ReactNode
  accent: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <section className={`relative overflow-hidden ${GLASS} ${wide ? "lg:col-span-2" : ""}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
        <div className="flex items-center gap-1.5 border-b border-white/35 pb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground dark:border-white/10">
          {icon}
          <h2>{title}</h2>
        </div>
        {children}
      </div>
    </section>
  )
}

function HeaderMetric({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  const content = (
    <>
      <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <span className="truncate text-[12px] font-bold text-foreground">{value || "—"}</span>
    </>
  )
  const className =
    "flex min-w-[5.8rem] flex-1 flex-col justify-center rounded-md border border-white/35 bg-white/35 px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.03]"

  return href ? (
    <Link href={href} className={`${className} transition hover:border-rose-300 hover:bg-rose-50/70 dark:hover:border-rose-800/60 dark:hover:bg-rose-950/20`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}

function Timeline({ surgery, status }: { surgery: Surgery; status: string }) {
  const steps = [
    { label: "Criada", date: surgery.created_at, active: true },
    { label: "Agendada", date: surgery.scheduled_for },
    { label: "Iniciada", date: surgery.started_at },
    { label: "Terminada", date: surgery.ended_at },
    { label: "Concluída", date: surgery.completed_at || (DONE_STATUSES.has(status) ? surgery.updated_at : null) },
    { label: "Enfermaria", date: surgery.ward_referral_requested_at },
    { label: "Cancelada", date: surgery.canceled_at, danger: true },
    { label: "Actualizada", date: surgery.updated_at, active: true },
  ]

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-8">
      {steps.map((step, index) => {
        const done = Boolean(step.date || step.active)
        const dangerDone = Boolean(step.danger && step.date)
        return (
          <div key={`${step.label}-${index}`} className="min-w-0 rounded-md border border-white/35 bg-white/30 px-1.5 py-1 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                  dangerDone
                    ? "border-rose-300 bg-rose-500 text-white"
                    : done
                      ? "border-emerald-300 bg-emerald-500 text-white"
                      : "border-muted-foreground/20 bg-muted text-muted-foreground"
                }`}
              >
                {dangerDone ? <X size={11} /> : done ? <Check size={11} /> : "v"}
              </span>
              <span className="truncate text-[9px] font-bold text-foreground">{step.label}</span>
            </div>
            <p className="mt-0.5 truncate text-[8px] text-muted-foreground">{fmtDate(step.date) || "Pendente"}</p>
          </div>
        )
      })}
    </div>
  )
}

export default function SurgeryDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [surgery, setSurgery] = useState<Surgery | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [billing, setBilling] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<Surgery>(`/surgery/surgery/${id}/`, { clientCache: safeRefreshToken === 0 })
      setSurgery(data)
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar a cirurgia.")
    } finally {
      setLoading(false)
    }
  }, [id, safeRefreshToken])

  useEffect(() => {
    load()
  }, [load])

  const financial = useMemo(() => {
    const base = toNumber(surgery?.procedures_price_total || surgery?.estimated_price)
    const vat = toNumber(surgery?.procedures_vat_percentage || surgery?.vat_percentage)
    const total = surgery?.applies_vat_by_default === false ? base : base * (1 + vat / 100)
    return { base, vat, total }
  }, [surgery])

  const createInvoice = useCallback(async () => {
    if (!id) return
    setBilling(true)
    try {
      await apiFetch(`/surgery/surgery/${id}/create-invoice/`, {
        method: "POST",
        body: JSON.stringify({ emitir: true }),
      })
      await load()
    } catch (err: any) {
      alert(err?.message || "Não foi possível gerar a fatura.")
    } finally {
      setBilling(false)
    }
  }, [id, load])

  if (loading) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Carregando...</div>
      </AppLayout>
    )
  }

  if (!surgery) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error || "Cirurgia não encontrada."}
        </div>
      </AppLayout>
    )
  }

  const status = surgery.status || "REQUESTED"
  const code = surgery.custom_id || `#${surgery.id}`
  const procedureNames = surgery.procedure_names || []
  const procedureGroupLabel = surgeryProcedureGroupLabel(surgery.procedure_details || [], surgery.surgery_size)
  const surgeons = surgery.surgeon_names || []
  const canEdit = !TERMINAL_STATUSES.has(status)

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <main className="mx-auto w-full max-w-[99vw] space-y-2 px-1 pb-2">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-rose-500" />
          <div className="space-y-2 px-3 py-2 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Link href="/surgery/" className="hover:text-foreground">Cirurgia</Link>
                  <span>/</span>
                  <Link href="/surgery/surgeries/" className="hover:text-foreground">Cirurgias</Link>
                  <span>/</span>
                  <span className="font-semibold text-foreground">{code}</span>
                </div>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300">
                    <Scissors size={16} />
                  </span>
                  <div className="min-w-0">
                    <h1 className="truncate text-base font-bold text-foreground">
                      {surgery.patient_name || procedureNames[0] || code}
                    </h1>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {procedureNames.length ? procedureNames.join(", ") : surgery.procedure || "Procedimento cirúrgico"}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadge(status)}`}>
                    {STATUS_LABEL[status] || status}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <Link
                  href="/surgery/surgeries/"
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] font-semibold text-foreground transition hover:bg-muted"
                >
                  <ArrowLeft size={12} /> Voltar
                </Link>
                {canEdit ? (
                  <Link
                    href={`/surgery/surgeries/${id}/edit/`}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] font-semibold text-foreground transition hover:bg-muted"
                  >
                    <Edit3 size={12} /> Editar
                  </Link>
                ) : null}
                {surgery.invoice_id ? (
                  <Link
                    href={`/billing/invoices/${surgery.invoice_id}/`}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                  >
                    <Receipt size={12} /> Fatura
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={createInvoice}
                    disabled={billing}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2.5 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300"
                  >
                    <Receipt size={12} /> {billing ? "A faturar..." : "Faturar"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex w-full flex-wrap gap-1.5">
              <HeaderMetric label="Porte" value={procedureGroupLabel || SIZE_LABEL[surgery.surgery_size || ""] || surgery.surgery_size} />
              <HeaderMetric label="Prioridade" value={PRIORITY_LABEL[surgery.priority || ""] || surgery.priority} />
              <HeaderMetric label="Classificação" value={CLASS_LABEL[surgery.classification || ""] || surgery.classification} />
              <HeaderMetric label="Sala" value={surgery.operating_room_name || "—"} />
              <HeaderMetric label="Agendada para" value={fmtDate(surgery.scheduled_for) || "—"} />
              <HeaderMetric label="Total c/ IVA" value={money(financial.total)} />
              <HeaderMetric label="Fatura" value={surgery.invoice_code || "Pendente"} href={surgery.invoice_id ? `/billing/invoices/${surgery.invoice_id}/` : undefined} />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <InfoCard title="Paciente e cirurgia" icon={<User size={13} />} accent="bg-sky-500">
            <dl className="grid grid-cols-2 gap-1.5">
              <Field label="Paciente" value={surgery.patient_name} />
              <Field label="Código" value={code} mono />
              <Field label="Especialidade" value={surgery.specialty_name} />
              <Field label="Pedido cirúrgico" value={surgery.surgical_request_code} mono />
            </dl>
          </InfoCard>

          <InfoCard title="Equipa e sala" icon={<Users size={13} />} accent="bg-violet-500">
            <dl className="grid grid-cols-2 gap-1.5">
              <Field
                label="Cirurgiões"
                value={surgeons.length ? surgeons.map((surgeon) => surgeon.name).filter(Boolean).join(", ") : surgery.surgeon_name}
              />
              <Field label="Sala operatória" value={surgery.operating_room_name} />
              <Field label="Enfermaria" value={surgery.ward_name} />
              <Field label="Data" value={fmtDate(surgery.scheduled_for)} />
            </dl>
          </InfoCard>

          <InfoCard title="Procedimentos" icon={<Scissors size={13} />} accent="bg-rose-500">
            <div className="space-y-1.5">
              {procedureNames.length ? (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {procedureNames.map((name, index) => (
                    <div key={`${name}-${index}`} className="flex min-w-0 items-center gap-1.5 rounded-md border border-white/35 bg-white/35 px-1.5 py-1 text-[10px] font-semibold leading-tight text-foreground dark:border-white/10 dark:bg-white/[0.03]">
                      <Scissors size={11} className="shrink-0 text-rose-500" />
                      <span className="min-w-0 truncate">{name}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <Field label="Procedimento em texto livre" value={surgery.procedure} />
            </div>
          </InfoCard>

          <InfoCard title="Diagnóstico" icon={<Stethoscope size={13} />} accent="bg-amber-500">
            <dl className="grid grid-cols-1 gap-1.5">
              <Field label="Pré-operatório" value={surgery.preoperative_diagnosis} />
              <Field label="Pós-operatório" value={surgery.postoperative_diagnosis} />
            </dl>
          </InfoCard>

          <InfoCard title="Faturação" icon={<CreditCard size={13} />} accent="bg-emerald-500">
            <dl className="grid grid-cols-2 gap-1.5">
              <Field label="Base" value={money(financial.base)} />
              <Field label="IVA" value={`${financial.vat.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}%`} />
              <Field label="Total" value={money(financial.total)} />
              <Field label="Estado da fatura" value={invoiceStatusLabel(surgery.invoice_status, Boolean(surgery.invoice_id))} />
              <Field label="Código da fatura" value={surgery.invoice_code} mono />
            </dl>
          </InfoCard>

          <InfoCard title="Registo" icon={<FileText size={13} />} accent="bg-cyan-500">
            <dl className="grid grid-cols-2 gap-1.5">
              <Field label="Criada em" value={fmtDate(surgery.created_at)} />
              <Field label="Actualizada em" value={fmtDate(surgery.updated_at)} />
              <Field label="Iniciada em" value={fmtDate(surgery.started_at)} />
              <Field label="Terminada em" value={fmtDate(surgery.ended_at)} />
            </dl>
          </InfoCard>

          {surgery.description ? (
            <InfoCard title="Descrição e notas" icon={<BadgeCheck size={13} />} accent="bg-slate-500" wide>
              <p className="whitespace-pre-wrap rounded-md border border-white/35 bg-white/35 px-1.5 py-1 text-[10px] leading-tight text-foreground dark:border-white/10 dark:bg-white/[0.03]">
                {surgery.description}
              </p>
            </InfoCard>
          ) : null}

          <InfoCard title="Cronologia" icon={<Clock3 size={13} />} accent="bg-emerald-500" wide>
            <Timeline surgery={surgery} status={status} />
          </InfoCard>
        </div>
      </main>
    </AppLayout>
  )
}
