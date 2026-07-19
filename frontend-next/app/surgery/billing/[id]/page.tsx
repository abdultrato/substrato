"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  FileText,
  Loader2,
  PackageCheck,
  Receipt,
  Scissors,
  ShieldCheck,
  Tags,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type Row = Record<string, any>

const ENDPOINT = "/surgery/faturacao"
const ROUTE_BASE = "/surgery/billing"
const GLASS = "rounded-lg border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const EVENT_LABEL: Record<string, string> = {
  ROOM_FEE: "Taxa de sala",
  SURGEON_FEE: "Honorário do cirurgião",
  ANESTHETIST_FEE: "Honorário do anestesista",
  TEAM_FEE: "Honorário da equipa",
  SURGICAL_PROCEDURE: "Procedimento cirúrgico",
  SURGICAL_MATERIAL: "Material cirúrgico",
  IMPLANT: "Implante",
  INTRAOPERATIVE_MEDICATION: "Medicamento intraoperatório",
  ANESTHESIA: "Anestesia",
  RECOVERY: "Recuperação",
  INPATIENT_CARE: "Internamento",
  ICU: "UCI",
  PREOPERATIVE_EXAM: "Exame pré-operatório",
  INTRAOPERATIVE_EXAM: "Exame intraoperatório",
  PATHOLOGY_SPECIMEN: "Amostra de patologia",
  ADJUSTMENT: "Ajuste",
}

const STATUS: Record<string, { label: string; bar: string; badge: string }> = {
  DRAFT: { label: "Rascunho", bar: "bg-slate-400", badge: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700/30 dark:bg-slate-900/20 dark:text-slate-300" },
  READY: { label: "Pronto para faturar", bar: "bg-blue-500", badge: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300" },
  INVOICED: { label: "Faturado", bar: "bg-emerald-500", badge: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300" },
  CANCELLED: { label: "Cancelado", bar: "bg-rose-500", badge: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300" },
  ADJUSTED: { label: "Ajustado", bar: "bg-amber-500", badge: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300" },
}

const MODE_LABEL: Record<string, string> = {
  PACKAGE: "Pacote",
  ITEMIZED: "Detalhado",
  HYBRID: "Híbrido",
}

function num(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function fmtMoney(value: unknown): string {
  return `${num(value).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`
}

function fmtNumber(value: unknown): string {
  return num(value).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

function text(value: unknown, fallback = "—"): string {
  const result = String(value || "").trim()
  return result || fallback
}

function mapped(map: Record<string, string>, value: unknown, fallback = "—"): string {
  const key = String(value || "")
  return key ? map[key] || key : fallback
}

function Field({ label, value, icon, mono = false }: { label: string; value: unknown; icon?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-card/35 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-0.5 truncate text-[11px] font-semibold text-foreground ${mono ? "font-mono" : ""}`}>
        {text(value)}
      </div>
    </div>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-card/35 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-0.5 truncate text-[12px] font-bold text-foreground">{value}</div>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={`relative overflow-hidden ${GLASS}`}>
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

export default function SurgeryBillingDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const [data, setData] = useState<Row | null>(null)
  const [surgery, setSurgery] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const row = await apiFetch<Row>(`${ENDPOINT}/${id}/`)
      setData(row)
      setSurgery(row?.surgery ? await apiFetch<Row>(`/surgery/surgery/${row.surgery}/`).catch(() => null) : null)
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar item de faturação.")
      setData(null)
      setSurgery(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </div>
      </AppLayout>
    )
  }

  if (error || !data) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
        <div className="mx-auto w-full max-w-[99vw] px-1 py-1">
          <div className="flex items-center gap-2 rounded-lg border border-rose-300/50 bg-rose-50/60 px-3 py-2 text-sm text-rose-700">
            <AlertCircle size={14} /> {error || "Item de faturação não encontrado."}
          </div>
        </div>
      </AppLayout>
    )
  }

  const status = STATUS[String(data.status || "").toUpperCase()] || STATUS.DRAFT
  const lineTotal = num(data.line_total)
  const totalWithVat = num(data.total_with_vat || data.line_total)
  const vatValue = Math.max(0, totalWithVat - lineTotal)

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
      <div className="mx-auto w-full max-w-[99vw] space-y-1 px-0.5 py-0.5">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${status.bar}`} />
          <div className="flex flex-col gap-1 px-2 py-1.5 pl-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href={ROUTE_BASE} className="hover:text-foreground">Faturação</Link>
                <span>/</span>
                <span className="font-mono text-foreground">{data.custom_id || `#${id}`}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <h1 className="font-display text-[14px] font-semibold leading-tight text-foreground">
                  {data.description || "Item de faturação cirúrgica"}
                </h1>
                <span className={`inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-semibold ${status.badge}`}>
                  {status.label}
                </span>
                <span className="inline-flex h-6 items-center rounded-full border border-cyan-300 bg-cyan-50 px-2 text-[10px] font-semibold text-cyan-700 dark:border-cyan-700/30 dark:bg-cyan-900/20 dark:text-cyan-300">
                  {mapped(EVENT_LABEL, data.event_type)}
                </span>
                <span className="inline-flex h-6 items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                  {fmtMoney(totalWithVat)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1">
              <Link href={ROUTE_BASE} className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-card px-2 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <ArrowLeft size={11} /> Voltar
              </Link>
              <Link href={`${ROUTE_BASE}/${id}/edit`} className="inline-flex h-6 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                <Edit3 size={11} /> Editar
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-1 md:grid-cols-5">
          <Metric label="Quantidade" value={fmtNumber(data.quantity)} icon={<Tags size={11} />} />
          <Metric label="Preço unitário" value={fmtMoney(data.unit_price)} icon={<CircleDollarSign size={11} />} />
          <Metric label="Subtotal" value={fmtMoney(lineTotal)} icon={<Banknote size={11} />} />
          <Metric label="IVA" value={data.applies_vat ? fmtMoney(vatValue) : "Isento"} icon={<Receipt size={11} />} />
          <Metric label="Total com IVA" value={fmtMoney(totalWithVat)} icon={<CheckCircle2 size={11} />} />
        </section>

        <div className="grid grid-cols-1 gap-1 lg:grid-cols-[1fr_1fr]">
          <Card title="Linha faturável" icon={<Receipt size={12} />}>
            <div className="grid grid-cols-2 gap-1">
              <Field label="Código" value={data.custom_id || `#${id}`} icon={<FileText size={9} />} mono />
              <Field label="Modo de faturação" value={mapped(MODE_LABEL, data.billing_mode)} />
              <Field label="Faturável" value={data.billable === false ? "Não" : "Sim"} />
              <Field label="Faturado em" value={fmtDateTime(data.billed_at)} icon={<CalendarClock size={9} />} />
              <Field label="IVA aplicado" value={data.applies_vat ? `${fmtNumber(data.vat_percentage)}%` : "Não aplicado"} />
              <Field label="Fatura" value={data.invoice_code || (data.invoice ? `#${data.invoice}` : "—")} icon={<Receipt size={9} />} mono />
            </div>
          </Card>

          <Card title="Contexto cirúrgico" icon={<Scissors size={12} />}>
            <div className="grid grid-cols-2 gap-1">
              <Field label="Cirurgia" value={data.surgery_code || surgery?.custom_id || (data.surgery ? `#${data.surgery}` : "—")} icon={<Scissors size={9} />} mono />
              <Field label="Paciente" value={data.patient_name || surgery?.patient_name} icon={<User size={9} />} />
              <Field label="Procedimento" value={surgery?.procedure} icon={<FileText size={9} />} />
              <Field label="Agendada" value={fmtDateTime(surgery?.scheduled_for)} icon={<CalendarClock size={9} />} />
              <Field label="Autorização" value={data.authorization_code || (data.authorization ? `#${data.authorization}` : "—")} icon={<ShieldCheck size={9} />} mono />
              <Field label="Fatura da cirurgia" value={surgery?.invoice_code || data.invoice_code || "—"} icon={<Receipt size={9} />} mono />
            </div>
          </Card>

          <Card title="Origem do item" icon={<PackageCheck size={12} />}>
            <div className="grid grid-cols-2 gap-1">
              <Field label="Procedimento realizado" value={data.procedure_item_code || (data.procedure_item ? `#${data.procedure_item}` : "—")} mono />
              <Field label="Consumo" value={data.consumption_code || (data.consumption ? `#${data.consumption}` : "—")} mono />
              <Field label="Tipo de evento" value={mapped(EVENT_LABEL, data.event_type)} />
              <Field label="Estado" value={status.label} />
            </div>
          </Card>

          <Card title="Observações" icon={<FileText size={12} />}>
            <p className="min-h-[70px] rounded-md border border-border/60 bg-card/35 px-2 py-1.5 text-[11px] leading-relaxed text-foreground">
              {data.notes || "Sem observações registadas."}
            </p>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
