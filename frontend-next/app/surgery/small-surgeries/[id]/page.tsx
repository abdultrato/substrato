"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  Scissors,
  Stethoscope,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"

const GLASS = "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const DONE_STATUSES = new Set([
  "SURGERY_COMPLETED", "CONCLUIDA", "CLOSED", "IN_RECOVERY",
  "RECOVERED", "REPORT_PENDING", "BILLING_PENDING",
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
  RECOVERED: "Recuperado",
  REPORT_PENDING: "Relatório pendente",
  BILLING_PENDING: "Faturação pendente",
  CLOSED: "Fechada",
  POSTPONED: "Adiada",
  CANCELADA: "Cancelada",
}

const PRIORITY_LABEL: Record<string, string> = {
  EMERGENCY: "Emergência",
  URGENT: "Urgente",
  ELECTIVE: "Eletiva",
  SCHEDULED: "Agendada",
}

function statusAccent(status: string) {
  if (DONE_STATUSES.has(status)) return "bg-emerald-400"
  if (status === "IN_OPERATING_ROOM" || status === "SURGERY_STARTED" || status === "EM_ANDAMENTO") return "bg-sky-400"
  if (status === "CANCELADA" || status === "CANCELLED") return "bg-rose-400"
  if (status === "AUTHORIZED" || status === "AGENDADA") return "bg-violet-400"
  return "bg-amber-400"
}

function statusBadge(status: string) {
  if (DONE_STATUSES.has(status))
    return "border-emerald-300/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
  if (status === "CANCELADA" || status === "CANCELLED")
    return "border-rose-300/70 bg-rose-50/80 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300"
  if (status === "IN_OPERATING_ROOM" || status === "SURGERY_STARTED" || status === "EM_ANDAMENTO")
    return "border-sky-300/70 bg-sky-50/80 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300"
  return "border-amber-300/70 bg-amber-50/80 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
}

function priorityBadge(priority: string) {
  if (priority === "EMERGENCY")
    return "border-red-300/70 bg-red-50/80 text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300"
  if (priority === "URGENT")
    return "border-orange-300/70 bg-orange-50/80 text-orange-700 dark:border-orange-700/30 dark:bg-orange-900/20 dark:text-orange-300"
  return "border-slate-200/70 bg-slate-50/80 text-slate-600 dark:border-slate-700/30 dark:bg-slate-900/20 dark:text-slate-400"
}

function fmtDate(value: any) {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(value))
  } catch { return String(value) }
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">{label}</span>
      <span className="text-[12px] font-medium text-[var(--text)]">{value || "—"}</span>
    </div>
  )
}

function SurfaceCard({
  title, icon, accent = "bg-sky-400", children,
}: {
  title: string
  icon: React.ReactNode
  accent?: string
  children: React.ReactNode
}) {
  return (
    <section className={`relative overflow-hidden ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="flex flex-col gap-2.5 px-3 py-2.5 pl-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
          {icon}
          <span>{title}</span>
        </div>
        {children}
      </div>
    </section>
  )
}

export default function SmallSurgeryDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const router = useRouter()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [data, setData] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<Record<string, any>>(
        `/surgery/small_surgery/${id}/`,
        { clientCache: safeRefreshToken === 0 }
      )
      setData(res)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar cirurgia.")
    } finally {
      setLoading(false)
    }
  }, [id, safeRefreshToken])

  useEffect(() => { load() }, [load])

  const markDone = useCallback(async () => {
    if (!data) return
    setMarking(true)
    try {
      const updated = await apiFetch<Record<string, any>>(`/surgery/small_surgery/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "SURGERY_COMPLETED" }),
      })
      setData(updated)
    } catch (e: any) {
      alert(e?.message || "Erro ao marcar cirurgia.")
    } finally {
      setMarking(false)
    }
  }, [data, id])

  if (loading) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
        <div className="flex h-40 items-center justify-center text-sm text-[var(--gray-500)]">Carregando...</div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error || "Cirurgia não encontrada."}
        </div>
      </AppLayout>
    )
  }

  const status = data.status || ""
  const isDone = DONE_STATUSES.has(status)
  const code = data.custom_id || data.id_custom || `#${data.id}`
  const patientName = data.patient_name || "—"
  const procedure = data.procedure || data.procedimento || "—"
  const surgeonName = data.surgeon_name || data.cirurgiao_nome || "—"
  const specialty = data.specialty || data.especialidade || null
  const priority = data.priority || data.prioridade || ""
  const classification = data.classification || data.classificacao || ""
  const preDiag = data.preoperative_diagnosis || data.diagnostico_pre_operatorio || ""
  const posDiag = data.postoperative_diagnosis || data.diagnostico_pos_operatorio || ""
  const description = data.description || data.descricao || ""
  const estimatedPrice = data.estimated_price || data.preco_estimado || "0.00"
  const vatPct = data.vat_percentage || data.iva || "0.00"

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
      <div className="mx-auto w-full max-w-5xl space-y-3 px-1">

        {/* header */}
        <section className={`relative overflow-hidden ${GLASS} h-[72px]`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${statusAccent(status)}`} />
          <div className="flex h-full items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href="/surgery/small-surgeries" className="hover:text-foreground">Pequenas cirurgias</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">{code}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400">
                  <Scissors size={13} />
                </span>
                <h1 className="truncate font-display text-base font-semibold text-foreground">{procedure}</h1>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${statusBadge(status)}`}>
                  {STATUS_LABEL[status] || status}
                </span>
                {priority ? (
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${priorityBadge(priority)}`}>
                    {PRIORITY_LABEL[priority] || priority}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {!isDone ? (
                <button
                  onClick={markDone}
                  disabled={marking}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                >
                  <CheckCircle2 size={12} />
                  {marking ? "A marcar..." : "Marcar realizada"}
                </button>
              ) : (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <CheckCircle2 size={12} />
                  Realizada
                </span>
              )}
              <Link
                href={`/surgery/small-surgeries/${id}/edit`}
                className="inline-flex h-7 items-center rounded-md border border-border bg-card px-2.5 text-[11px] font-medium text-foreground transition hover:bg-muted"
              >
                Editar
              </Link>
              <Link
                href="/surgery/small-surgeries"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted"
              >
                <ArrowLeft size={11} />
                Voltar
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        {/* masonry 2 cols */}
        <div className="grid grid-cols-2 items-start gap-3">
          {/* col esquerda */}
          <div className="flex flex-col gap-3">

            <SurfaceCard title="Paciente" icon={<User size={13} />} accent="bg-sky-400">
              <div className="grid gap-1.5">
                <Field label="Nome" value={patientName} />
                {specialty ? <Field label="Especialidade" value={specialty} /> : null}
                {classification ? <Field label="Classificação" value={classification} /> : null}
              </div>
            </SurfaceCard>

            <SurfaceCard title="Procedimento" icon={<Scissors size={13} />} accent="bg-violet-400">
              <div className="grid gap-1.5">
                <Field label="Procedimento" value={procedure} />
                {surgeonName !== "—" ? <Field label="Cirurgião" value={surgeonName} /> : null}
                {description ? <Field label="Descrição" value={description} /> : null}
              </div>
            </SurfaceCard>

            {(preDiag || posDiag) ? (
              <SurfaceCard title="Diagnósticos" icon={<Stethoscope size={13} />} accent="bg-amber-400">
                <div className="grid gap-1.5">
                  {preDiag ? <Field label="Pré-operatório" value={preDiag} /> : null}
                  {posDiag ? <Field label="Pós-operatório" value={posDiag} /> : null}
                </div>
              </SurfaceCard>
            ) : null}

          </div>

          {/* col direita */}
          <div className="flex flex-col gap-3">

            <SurfaceCard title="Estado e datas" icon={<Clock3 size={13} />} accent={statusAccent(status)}>
              <div className="grid gap-1.5">
                <Field label="Estado" value={
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge(status)}`}>
                    {STATUS_LABEL[status] || status}
                  </span>
                } />
                <Field label="Agendada para" value={fmtDate(data.scheduled_for || data.agendada_para)} />
                {data.started_at ? <Field label="Iniciada em" value={fmtDate(data.started_at)} /> : null}
                {data.ended_at ? <Field label="Terminada em" value={fmtDate(data.ended_at)} /> : null}
                {data.completed_at ? <Field label="Concluída em" value={fmtDate(data.completed_at)} /> : null}
                {data.canceled_at ? <Field label="Cancelada em" value={fmtDate(data.canceled_at)} /> : null}
              </div>
            </SurfaceCard>

            <SurfaceCard title="Financeiro" icon={<CreditCard size={13} />} accent="bg-emerald-400">
              <div className="grid gap-1.5">
                <Field label="Preço estimado" value={`${estimatedPrice} MT`} />
                <Field label="IVA" value={`${vatPct}%`} />
                {data.invoice_code ? <Field label="Fatura" value={data.invoice_code} /> : null}
                {data.invoice_status ? <Field label="Estado fatura" value={data.invoice_status} /> : null}
              </div>
            </SurfaceCard>

            <SurfaceCard title="Auditoria" icon={<CalendarClock size={13} />} accent="bg-slate-400">
              <div className="grid gap-1.5">
                <Field label="Código" value={code} />
                <Field label="Criado em" value={fmtDate(data.created_at)} />
                <Field label="Atualizado em" value={fmtDate(data.updated_at)} />
              </div>
            </SurfaceCard>

          </div>
        </div>

        {/* status banner */}
        {isDone ? (
          <section className="rounded-xl border border-emerald-300/50 bg-emerald-50/55 p-4 text-sm text-emerald-800 backdrop-blur-sm dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <p>Cirurgia marcada como realizada. Pode prosseguir para relatório operatório e faturação.</p>
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-sky-300/50 bg-sky-50/55 p-4 text-sm text-sky-800 backdrop-blur-sm dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200">
            <div className="flex items-start gap-2">
              <ClipboardList size={16} className="mt-0.5 shrink-0" />
              <p>Cirurgia pendente. Quando concluída, clique em <strong>Marcar realizada</strong> para actualizar o estado.</p>
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  )
}
