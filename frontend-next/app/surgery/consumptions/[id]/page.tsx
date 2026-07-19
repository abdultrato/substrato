"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Edit3,
  FileText,
  Package,
  PackageCheck,
  RotateCcw,
  Scissors,
  ShieldAlert,
  Stethoscope,
  User,
  XCircle,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const MATERIAL_STATUS_LABEL: Record<string, string> = {
  RESERVED: "Reservado",
  PREPARED: "Preparado",
  SENT_TO_OR: "Enviado para sala",
  USED: "Usado",
  PARTIALLY_USED: "Parcialmente usado",
  RETURNED: "Devolvido",
  DISCARDED: "Descartado",
  STERILIZATION_REQUIRED: "Esterilização necessária",
  BILLED: "Faturado",
}

const BILLING_STATUS_LABEL: Record<string, string> = {
  NOT_BILLABLE: "Não faturável",
  PENDING: "Pendente",
  BILLABLE: "Faturável",
  BILLED: "Faturado",
  ADJUSTED: "Ajustado",
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

type Consumption = {
  id: number
  custom_id?: string | null
  surgery?: number | null
  material?: number | null
  product?: number | null
  consumed_by?: number | null
  quantity?: string | number | null
  unit_cost?: string | number | null
  charged_price?: string | number | null
  total_cost?: string | number | null
  line_total?: string | number | null
  batch_number?: string | null
  expiry_date?: string | null
  consumed_at?: string | null
  material_status?: string | null
  billing_status?: string | null
  inventory_deducted?: boolean | null
  returned_quantity?: string | number | null
  notes?: string | null
  surgery_code?: string | null
  material_name?: string | null
  product_name?: string | null
  consumed_by_name?: string | null
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
  priority?: string | null
  scheduled_for?: string | null
  started_at?: string | null
  ended_at?: string | null
  operating_room_name?: string | null
  surgeon_names?: Array<{ id: number; name: string }> | null
  surgeon_name?: string | null
  invoice_code?: string | null
  invoice_status?: string | null
}

function numberValue(value: string | number | null | undefined): number {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? "0"))
  return Number.isFinite(parsed) ? parsed : 0
}

function fmtNumber(value: string | number | null | undefined, digits = 2): string {
  return numberValue(value).toLocaleString("pt-PT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function fmtMoney(value: string | number | null | undefined): string {
  return `${fmtNumber(value)} MT`
}

function fmtDate(value: string | null | undefined, withTime = true): string | null {
  if (!value) return null
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function materialBadge(status?: string | null): string {
  if (status === "USED" || status === "BILLED") return "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
  if (status === "PARTIALLY_USED") return "border-cyan-300/70 bg-cyan-50 text-cyan-700 dark:border-cyan-700/30 dark:bg-cyan-900/20 dark:text-cyan-300"
  if (status === "RETURNED" || status === "STERILIZATION_REQUIRED") return "border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
  if (status === "DISCARDED") return "border-rose-300/70 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300"
  return "border-violet-300/70 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300"
}

function billingBadge(status?: string | null): string {
  if (status === "BILLED") return "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
  if (status === "BILLABLE") return "border-blue-300/70 bg-blue-50 text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300"
  if (status === "PENDING") return "border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
  if (status === "ADJUSTED") return "border-orange-300/70 bg-orange-50 text-orange-700 dark:border-orange-700/30 dark:bg-orange-900/20 dark:text-orange-300"
  return "border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/10 dark:text-gray-300"
}

function itemName(item: Consumption): string {
  return (item.material_name || item.product_name || "Material não identificado").replace(/^Farmacia Teste \d+ - /, "")
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
      <div className="space-y-1.5 px-2.5 py-2 pl-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
          {icon}
          <span>{title}</span>
        </div>
        {children}
      </div>
    </section>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-border/60 bg-card/45 px-2 py-1">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">{label}</div>
        <div className="truncate text-[12px] font-semibold text-foreground">{value}</div>
      </div>
    </div>
  )
}

export default function SurgeryConsumptionDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)

  const [data, setData] = useState<Consumption | null>(null)
  const [surgery, setSurgery] = useState<SurgeryContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const consumption = await apiFetch<Consumption>(`/surgery/consumos/${id}/`)
      setData(consumption)

      if (consumption.surgery) {
        const surgeryData = await apiFetch<SurgeryContext>(`/surgery/surgery/${consumption.surgery}/`).catch(() => null)
        setSurgery(surgeryData)
      } else {
        setSurgery(null)
      }
    } catch (err: any) {
      setData(null)
      setSurgery(null)
      setError(err?.message || "Erro ao carregar consumo cirúrgico.")
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
          {error || "Consumo não encontrado."}
        </div>
      </AppLayout>
    )
  }

  const code = data.custom_id || `#${data.id}`
  const materialStatus = data.material_status || ""
  const billingStatus = data.billing_status || ""
  const returnedQty = numberValue(data.returned_quantity)
  const effectiveQty = Math.max(numberValue(data.quantity) - returnedQty, 0)
  const procedureNames = surgery?.procedure_names?.length ? surgery.procedure_names.join(", ") : surgery?.procedure
  const surgeons = surgery?.surgeon_names?.length
    ? surgery.surgeon_names.map((item) => item.name).join(", ")
    : surgery?.surgeon_name

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-[98vw] space-y-1 px-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="space-y-1 px-2.5 py-1.5 pl-4">
            <div className="flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                  <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                  <span>/</span>
                  <Link href="/surgery/consumptions" className="hover:text-foreground">Consumos</Link>
                  <span>/</span>
                  <span className="font-semibold text-foreground">{code}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <h1 className="font-display text-[15px] font-semibold leading-tight text-foreground">{itemName(data)}</h1>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${materialBadge(materialStatus)}`}>
                    {MATERIAL_STATUS_LABEL[materialStatus] || materialStatus || "Sem estado"}
                  </span>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${billingBadge(billingStatus)}`}>
                    {BILLING_STATUS_LABEL[billingStatus] || billingStatus || "Sem faturação"}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1">
                <Link
                  href="/surgery/consumptions"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <ArrowLeft size={11} />
                  Voltar
                </Link>
                <Link
                  href={`/surgery/consumptions/${data.id}/edit`}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300"
                >
                  <Edit3 size={11} />
                  Editar consumo
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
              <Metric label="Qtd. consumida" value={fmtNumber(data.quantity)} icon={<Package size={13} />} />
              <Metric label="Qtd. efectiva" value={fmtNumber(effectiveQty)} icon={<PackageCheck size={13} />} />
              <Metric label="Preço cobrado" value={fmtMoney(data.charged_price)} icon={<CreditCard size={13} />} />
              <Metric label="Total" value={fmtMoney(data.line_total)} icon={<PackageCheck size={13} />} />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-1 xl:grid-cols-[1.15fr_0.85fr]">
          <SurfaceCard title="Consumo e rastreabilidade" icon={<Package size={12} />} accent="bg-violet-400">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-4">
              <Field label="Código" value={code} mono />
              <Field label="Consumido em" value={fmtDate(data.consumed_at)} />
              <Field label="Registado por" value={data.consumed_by_name || (data.consumed_by ? `#${data.consumed_by}` : null)} />
              <Field label="Stock" value={data.inventory_deducted ? "Baixado" : "Não baixado"} />
              <Field label="Lote" value={data.batch_number} mono />
              <Field label="Validade" value={fmtDate(data.expiry_date, false)} />
              <Field label="Material" value={data.material_name || (data.material ? `#${data.material}` : null)} />
              <Field label="Produto" value={data.product_name || (data.product ? `#${data.product}` : null)} />
            </div>

            <div className="grid grid-cols-1 gap-1 md:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--gray-500)]">
                  {data.inventory_deducted ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
                  Movimento de stock
                </div>
                <p className="mt-1 text-[12px] text-foreground">
                  {data.inventory_deducted
                    ? "O consumo já foi abatido ao stock."
                    : "Ainda não há baixa de stock marcada neste registo."}
                </p>
              </div>

              <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--gray-500)]">
                  {returnedQty > 0 ? <RotateCcw size={12} /> : <XCircle size={12} />}
                  Devolução
                </div>
                <p className="mt-1 text-[12px] text-foreground">
                  {returnedQty > 0
                    ? `${fmtNumber(returnedQty)} unidade(s) devolvida(s).`
                    : "Sem devolução registada."}
                </p>
              </div>

              <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--gray-500)]">
                  <CalendarClock size={12} />
                  Auditoria
                </div>
                <p className="mt-1 text-[12px] text-foreground">
                  Atualizado {fmtDate(data.updated_at) || fmtDate(data.created_at) || "sem data"}.
                </p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard title="Faturação" icon={<CreditCard size={12} />} accent="bg-blue-400">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Field label="Estado" value={BILLING_STATUS_LABEL[billingStatus] || billingStatus} />
              <Field label="Custo unitário" value={fmtMoney(data.unit_cost)} />
              <Field label="Custo total" value={fmtMoney(data.total_cost)} />
              <Field label="Preço cobrado" value={fmtMoney(data.charged_price)} />
              <Field label="Total faturável" value={fmtMoney(data.line_total)} />
              <Field label="Fatura" value={surgery?.invoice_code} mono />
            </div>
            {surgery?.invoice_status ? (
              <div className="rounded-lg border border-blue-200/70 bg-blue-50/70 px-3 py-2 text-[12px] text-blue-800 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
                Estado da fatura vinculada: {surgery.invoice_status}
              </div>
            ) : null}
          </SurfaceCard>
        </div>

        <div className="grid grid-cols-1 gap-1 xl:grid-cols-[0.9fr_1.1fr]">
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
              <Field label="Paciente" value={surgery?.patient_name} />
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

          <SurfaceCard title="Observações" icon={<FileText size={12} />} accent="bg-amber-400">
            {data.notes ? (
              <p className="whitespace-pre-wrap rounded-lg border border-border/70 bg-card/50 px-2.5 py-1.5 text-[12px] leading-5 text-foreground">
                {data.notes}
              </p>
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-6 text-center text-[12px] text-[var(--gray-500)]">
                Sem observações registadas para este consumo.
              </p>
            )}
          </SurfaceCard>
        </div>
      </div>
    </AppLayout>
  )
}
