"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  Package,
  Scissors,
  Stethoscope,
  User,
  Users,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const DONE_STATUSES = new Set([
  "SURGERY_COMPLETED", "CONCLUIDA", "CLOSED", "IN_RECOVERY",
  "RECOVERED", "REPORT_PENDING", "BILLING_PENDING",
])

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho", REQUESTED: "Solicitada", UNDER_ASSESSMENT: "Em avaliação",
  FINANCIAL_PENDING: "Financeiro pendente", AUTHORIZED: "Autorizada",
  AGENDADA: "Agendada", PATIENT_CHECKED_IN: "Check-in",
  PREOPERATIVE_PREPARATION: "Preparação pré-op.", PREPARED: "Preparada",
  IN_OPERATING_ROOM: "Em sala operatória", ANESTHESIA_STARTED: "Anestesia iniciada",
  SURGERY_STARTED: "Cirurgia iniciada", EM_ANDAMENTO: "Em andamento",
  SURGERY_COMPLETED: "Cirurgia realizada", CONCLUIDA: "Concluída",
  IN_RECOVERY: "Em recuperação", RECOVERED: "Recuperado",
  REPORT_PENDING: "Relatório pendente", BILLING_PENDING: "Faturação pendente",
  CLOSED: "Fechada", POSTPONED: "Adiada", CANCELADA: "Cancelada",
}

const PRIORITY_LABEL: Record<string, string> = {
  EMERGENCY: "Emergência", URGENT: "Urgente", ELECTIVE: "Eletiva", SCHEDULED: "Agendada",
}

const PRIORITY_BADGE: Record<string, string> = {
  EMERGENCY: "border-rose-300/70 bg-rose-50/80 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300",
  URGENT: "border-amber-300/70 bg-amber-50/80 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300",
  ELECTIVE: "border-emerald-300/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300",
  SCHEDULED: "border-blue-300/70 bg-blue-50/80 text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300",
}

const SURGERY_SIZE_LABEL: Record<string, string> = {
  PEQUENA: "Pequena cirurgia",
  GRANDE: "Grande cirurgia",
}

const CLASS_LABEL: Record<string, string> = {
  MINOR: "Minor", INTERMEDIATE: "Intermediária", MAJOR: "Major", COMPLEX: "Complexa",
}

function statusAccent(s: string) {
  if (DONE_STATUSES.has(s)) return "bg-emerald-400"
  if (["IN_OPERATING_ROOM", "SURGERY_STARTED", "EM_ANDAMENTO"].includes(s)) return "bg-sky-400"
  if (["CANCELADA", "CANCELLED"].includes(s)) return "bg-rose-400"
  if (["AUTHORIZED", "AGENDADA"].includes(s)) return "bg-violet-400"
  return "bg-amber-400"
}

function statusBadge(s: string) {
  if (DONE_STATUSES.has(s)) return "border-emerald-300/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
  if (["CANCELADA", "CANCELLED"].includes(s)) return "border-rose-300/70 bg-rose-50/80 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300"
  if (["IN_OPERATING_ROOM", "SURGERY_STARTED", "EM_ANDAMENTO"].includes(s)) return "border-sky-300/70 bg-sky-50/80 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300"
  return "border-amber-300/70 bg-amber-50/80 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
}

function fmtDate(v: any) {
  if (!v) return null
  try { return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(v)) }
  catch { return String(v) }
}

function fmtMoney(v: any) {
  const n = parseFloat(v || "0")
  if (!n) return null
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MT"
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">{label}</span>
      <span className={`text-[12px] font-medium text-[var(--text)] ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  )
}

function SurfaceCard({ title, icon, accent = "bg-sky-400", children }: {
  title: string; icon: React.ReactNode; accent?: string; children: React.ReactNode
}) {
  return (
    <section className={`relative overflow-hidden ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="flex flex-col gap-2.5 px-3 py-3 pl-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
          {icon}<span>{title}</span>
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
  const [consumptions, setConsumptions] = useState<{ id: number; product_name: string; quantity: string; unit_cost: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      await apiFetch<any>(`/surgery/small_surgery/${id}/sync-consumptions/`, { method: "POST" }).catch(() => {})
      const [res, cons] = await Promise.all([
        apiFetch<Record<string, any>>(`/surgery/small_surgery/${id}/`, { clientCache: safeRefreshToken === 0 }),
        apiFetch<any>(`/surgery/consumos/?surgery=${id}&limit=100`),
      ])
      setData(res)
      const consList: any[] = Array.isArray(cons) ? cons : (cons.results || [])
      setConsumptions(consList.map((c: any) => ({
        id: c.id,
        product_name: c.product_name || c.material_name || `#${c.product}`,
        quantity: String(c.quantity || "1"),
        unit_cost: String(c.unit_cost || c.charged_price || "0.00"),
      })))
    } catch (e: any) { setError(e?.message || "Erro ao carregar.") }
    finally { setLoading(false) }
  }, [id, safeRefreshToken])

  useEffect(() => { load() }, [load])

  const markDone = useCallback(async () => {
    if (!data) return
    setMarking(true)
    try {
      const updated = await apiFetch<Record<string, any>>(`/surgery/small_surgery/${id}/`, {
        method: "PATCH", body: JSON.stringify({ status: "SURGERY_COMPLETED" }),
      })
      setData(updated)
    } catch (e: any) { alert(e?.message || "Erro.") }
    finally { setMarking(false) }
  }, [data, id])

  if (loading) return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
      <div className="flex h-40 items-center justify-center text-sm text-[var(--gray-500)]">Carregando...</div>
    </AppLayout>
  )

  if (!data) return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error || "Não encontrado."}</div>
    </AppLayout>
  )

  const status = data.status || ""
  const isDone = DONE_STATUSES.has(status)
  const code = data.custom_id || `#${data.id}`

  // derived fields
  const surgeonNames: { id: number; name: string }[] = data.surgeon_names || []
  const procedureNames: string[] = data.procedure_names || []
  // prefer sum of procedure base_prices; fall back to surgery-level estimated_price
  const estimatedPrice = parseFloat(data.procedures_price_total || data.estimated_price || "0")
  const vatPct = parseFloat(data.procedures_vat_percentage || data.vat_percentage || "0")
  const priceWithVat = estimatedPrice > 0 ? estimatedPrice * (1 + vatPct / 100) : 0

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
      <div className="mx-auto w-full max-w-5xl space-y-3 px-1">

        {/* header */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${statusAccent(status)}`} />
          <div className="flex items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href="/surgery/small-surgeries" className="hover:text-foreground">Pequenas cirurgias</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">{code}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="font-display text-base font-semibold text-foreground">
                  {procedureNames.length > 0 ? procedureNames.join(", ") : (data.procedure || code)}
                </h1>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${statusBadge(status)}`}>
                  {STATUS_LABEL[status] || status}
                </span>
                {data.priority ? (
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${PRIORITY_BADGE[data.priority] || ""}`}>
                    {PRIORITY_LABEL[data.priority] || data.priority}
                  </span>
                ) : null}
                {data.surgery_size ? (
                  <span className="rounded-full border border-violet-200 bg-violet-50/80 px-2 py-0.5 text-[9px] font-semibold text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300">
                    {SURGERY_SIZE_LABEL[data.surgery_size] || data.surgery_size}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {priceWithVat > 0 && (
                <div className="flex flex-col items-end gap-0.5 border-r border-white/30 pr-3 dark:border-white/10">
                  <span className="text-[10px] text-[var(--gray-500)]">Total c/ IVA {vatPct > 0 ? `(${vatPct}%)` : ""}</span>
                  <span className="text-[13px] font-semibold text-violet-700 dark:text-violet-300">
                    {priceWithVat.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT
                  </span>
                </div>
              )}
              {!isDone ? (
                <button onClick={markDone} disabled={marking}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <CheckCircle2 size={12} />
                  {marking ? "A marcar..." : "Marcar realizada"}
                </button>
              ) : (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <CheckCircle2 size={12} /> Realizada
                </span>
              )}
              <Link href={`/surgery/small-surgeries/${id}/edit`}
                className="inline-flex h-7 items-center rounded-md border border-border bg-card px-2.5 text-[11px] font-medium text-foreground transition hover:bg-muted">
                Editar
              </Link>
              <Link href="/surgery/small-surgeries"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted">
                <ArrowLeft size={11} /> Voltar
              </Link>
            </div>
          </div>
        </section>

        {/* masonry — CSS columns so cards flow naturally into the shortest column */}
        <div style={{ columns: "2", columnGap: "0.75rem" }}>

          <div style={{ breakInside: "avoid", marginBottom: "0.75rem" }}>
            <SurfaceCard title="Paciente" icon={<User size={13} />} accent="bg-sky-400">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="col-span-2">
                  <Field label="Nome" value={data.patient_name} />
                </div>
                {data.specialty_name && <Field label="Especialidade" value={data.specialty_name} />}
              </div>
            </SurfaceCard>
          </div>

          <div style={{ breakInside: "avoid", marginBottom: "0.75rem" }}>
            <SurfaceCard title="Procedimentos" icon={<Scissors size={13} />} accent="bg-violet-400">
              <div className="flex flex-col gap-1.5">
                {procedureNames.length > 0
                  ? procedureNames.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/20 px-2.5 py-1.5 dark:bg-white/[0.03]">
                      <Scissors size={11} className="shrink-0 text-violet-400" />
                      <span className="text-[12px] font-medium text-[var(--text)]">{p}</span>
                    </div>
                  ))
                  : <span className="text-[12px] text-[var(--gray-400)]">{data.procedure || "—"}</span>
                }
              </div>
            </SurfaceCard>
          </div>

          {surgeonNames.length > 0 && (
            <div style={{ breakInside: "avoid", marginBottom: "0.75rem" }}>
              <SurfaceCard title="Cirurgiões" icon={<Stethoscope size={13} />} accent="bg-emerald-400">
                <div className="flex flex-col gap-1.5">
                  {surgeonNames.map(s => (
                    <div key={s.id} className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/20 px-2.5 py-1.5 dark:bg-white/[0.03]">
                      <Stethoscope size={11} className="shrink-0 text-[var(--gray-400)]" />
                      <span className="text-[12px] font-medium text-[var(--text)]">{s.name}</span>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            </div>
          )}

          <div style={{ breakInside: "avoid", marginBottom: "0.75rem" }}>
            <SurfaceCard title="Financeiro" icon={<CreditCard size={13} />} accent="bg-teal-400">
              <div className="grid gap-2">
                {estimatedPrice > 0 ? (
                  <>
                    <Field label="Preço base" value={estimatedPrice.toLocaleString("pt-PT", { minimumFractionDigits: 2 }) + " MT"} />
                    {vatPct > 0 && <Field label="IVA" value={`${vatPct}%`} />}
                    {priceWithVat > 0 && (
                      <div className="mt-1 flex items-center justify-between rounded-lg border border-teal-200/50 bg-teal-50/40 px-3 py-2 dark:border-teal-700/20 dark:bg-teal-900/10">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Total c/ IVA</span>
                        <span className="text-[13px] font-semibold text-teal-700 dark:text-teal-300">
                          {priceWithVat.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} MT
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-[11px] italic text-[var(--gray-400)]">Preço não definido</span>
                )}
                {data.invoice_code && <Field label="Fatura" value={data.invoice_code} />}
              </div>
            </SurfaceCard>
          </div>

          {data.ward_name && (
            <div style={{ breakInside: "avoid", marginBottom: "0.75rem" }}>
              <SurfaceCard title="Bloco operatório" icon={<Building2 size={13} />} accent="bg-cyan-400">
                <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/20 px-2.5 py-2 dark:bg-white/[0.03]">
                  <Building2 size={11} className="shrink-0 text-[var(--gray-400)]" />
                  <span className="text-[12px] font-medium text-[var(--text)]">{data.ward_name}</span>
                </div>
              </SurfaceCard>
            </div>
          )}

          {consumptions.length > 0 && (
            <div style={{ breakInside: "avoid", marginBottom: "0.75rem" }}>
              <SurfaceCard title="Materiais e produtos" icon={<Package size={13} />} accent="bg-amber-400">
                <div className="flex flex-col gap-1">
                  {consumptions.map(c => {
                    const total = parseFloat(c.unit_cost) * parseFloat(c.quantity)
                    return (
                      <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/20 bg-white/20 px-2.5 py-1.5 dark:bg-white/[0.03]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Package size={11} className="shrink-0 text-amber-400" />
                          <span className="truncate text-[12px] font-medium text-[var(--text)]">{c.product_name}</span>
                          {parseFloat(c.quantity) > 1 && (
                            <span className="shrink-0 rounded-full bg-amber-200/60 px-1.5 py-px text-[9px] font-bold text-amber-700 dark:bg-amber-800/30 dark:text-amber-300">×{c.quantity}</span>
                          )}
                        </div>
                        {total > 0 && (
                          <span className="shrink-0 text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                            {total.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} MT
                          </span>
                        )}
                      </div>
                    )
                  })}
                  {(() => {
                    const grand = consumptions.reduce((s, c) => s + parseFloat(c.unit_cost) * parseFloat(c.quantity), 0)
                    return grand > 0 ? (
                      <div className="mt-1 flex items-center justify-between rounded-lg border border-amber-200/50 bg-amber-50/40 px-3 py-1.5 dark:border-amber-700/20 dark:bg-amber-900/10">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Total materiais</span>
                        <span className="text-[12px] font-semibold text-amber-700 dark:text-amber-300">
                          {grand.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} MT
                        </span>
                      </div>
                    ) : null
                  })()}
                </div>
              </SurfaceCard>
            </div>
          )}

          {(data.preoperative_diagnosis || data.postoperative_diagnosis) && (
            <div style={{ breakInside: "avoid", marginBottom: "0.75rem" }}>
              <SurfaceCard title="Diagnósticos" icon={<Stethoscope size={13} />} accent="bg-amber-400">
                <div className="grid gap-2">
                  {data.preoperative_diagnosis && <Field label="Pré-operatório" value={data.preoperative_diagnosis} />}
                  {data.postoperative_diagnosis && <Field label="Pós-operatório" value={data.postoperative_diagnosis} />}
                </div>
              </SurfaceCard>
            </div>
          )}

          <div style={{ breakInside: "avoid", marginBottom: "0.75rem" }}>
            <SurfaceCard title="Auditoria" icon={<CalendarClock size={13} />} accent="bg-slate-400">
              <div className="grid gap-2">
                <Field label="Código" value={code} mono />
                <Field label="Criado em" value={fmtDate(data.created_at)} />
                <Field label="Atualizado em" value={fmtDate(data.updated_at)} />
              </div>
            </SurfaceCard>
          </div>

        </div>

        {/* cronologia full-width */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${statusAccent(status)}`} />
          <div className="px-4 py-3 pl-5">
            <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
              <Clock3 size={13} />
              <span>Cronologia cirúrgica</span>
              <span className={`ml-2 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${statusBadge(status)}`}>
                {STATUS_LABEL[status] || status}
              </span>
            </div>
            <div className="flex items-start gap-0">
              {[
                { label: "Agendada", date: data.scheduled_for, dotColor: "bg-violet-400", lineColor: "bg-violet-400", textColor: "text-violet-600 dark:text-violet-400" },
                { label: "Iniciada", date: data.started_at, dotColor: "bg-sky-400", lineColor: "bg-sky-400", textColor: "text-sky-600 dark:text-sky-400" },
                { label: "Terminada", date: data.ended_at, dotColor: "bg-amber-400", lineColor: "bg-amber-400", textColor: "text-amber-600 dark:text-amber-400" },
                { label: "Concluída", date: data.completed_at, dotColor: "bg-emerald-400", lineColor: "bg-emerald-400", textColor: "text-emerald-600 dark:text-emerald-400" },
                { label: "Cancelada", date: data.canceled_at, dotColor: "bg-rose-400", lineColor: "bg-rose-400", textColor: "text-rose-600 dark:text-rose-400" },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex flex-1 flex-col">
                  <div className="flex items-center">
                    <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 shadow-sm ${
                      step.date ? `border-white/60 ${step.dotColor} dark:border-white/20` : "border-white/40 bg-white/30 dark:border-white/10 dark:bg-white/[0.06]"}`}>
                      {step.date
                        ? <CheckCircle2 size={13} className="text-white" />
                        : <span className="h-2 w-2 rounded-full bg-[var(--gray-300)] dark:bg-white/20" />}
                    </span>
                    {i < arr.length - 1 && (
                      <span className={`h-0.5 flex-1 ${step.date ? `${step.lineColor} opacity-60` : "bg-white/25 dark:bg-white/10"}`} />
                    )}
                  </div>
                  <div className="mt-2 pr-2">
                    <p className={`text-[11px] font-semibold ${step.date ? step.textColor : "text-[var(--gray-400)]"}`}>{step.label}</p>
                    <p className={`mt-0.5 text-[10px] ${step.date ? "text-[var(--gray-500)]" : "text-[var(--gray-300)]"}`}>
                      {step.date ? fmtDate(step.date) : "Pendente"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </AppLayout>
  )
}
