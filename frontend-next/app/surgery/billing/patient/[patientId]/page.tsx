"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Loader2,
  Receipt,
  Scissors,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch, apiFetchList } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type BillingItem = {
  id: number
  custom_id?: string
  surgery?: number | string | null
  invoice?: number | string | null
  surgery_code?: string
  patient_name?: string
  invoice_code?: string
  event_type?: string
  description?: string
  quantity?: string | number
  unit_price?: string | number
  vat_percentage?: string | number
  applies_vat?: boolean
  billable?: boolean
  status?: string
  billed_at?: string | null
  line_total?: string | number
  total_with_vat?: string | number
}

type SurgeryRow = {
  id: number
  patient?: number | string | null
  patient_name?: string
  custom_id?: string
  procedure?: string
  scheduled_for?: string | null
}

type ReceiptRow = {
  id: number
  number?: string
  custom_id?: string
  invoice?: number | string | null
}

type Step = "none" | "quotation" | "proforma" | "invoice" | "receipt"
type View = "UNBILLED" | "BILLED"

const ENDPOINT = "/surgery/faturacao/"
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

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  READY: "Pronto para faturar",
  INVOICED: "Faturado",
  CANCELLED: "Cancelado",
  ADJUSTED: "Ajustado",
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

function eventLabel(value: unknown): string {
  const key = String(value || "")
  return key ? EVENT_LABEL[key] || key : "Evento cirúrgico"
}

function statusLabel(value: unknown): string {
  const key = String(value || "")
  return key ? STATUS_LABEL[key] || key : "Sem estado"
}

function isUnbilled(item: BillingItem): boolean {
  return item.billable !== false && item.status !== "INVOICED" && num(item.unit_price) > 0
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-card/35 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-0.5 truncate text-[12px] font-semibold text-foreground">{value}</div>
    </div>
  )
}

function StepButton({
  label,
  active,
  done,
  disabled,
  onClick,
}: {
  label: string
  active: boolean
  done: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        done
          ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
          : active
            ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300"
            : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {done ? <Check size={11} /> : null}
      {label}
    </button>
  )
}

export default function SurgeryPatientBillingPage() {
  const params = useParams()
  const patientId = decodeURIComponent(routeParamToString((params as any)?.patientId))
  const [items, setItems] = useState<BillingItem[]>([])
  const [surgeries, setSurgeries] = useState<Record<string, SurgeryRow>>({})
  const [receiptsByInvoice, setReceiptsByInvoice] = useState<Record<string, ReceiptRow>>({})
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [view, setView] = useState<View>("UNBILLED")
  const [step, setStep] = useState<Step>("none")
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    setError(null)
    try {
      const { items: surgeriesForPatient } = /^\d+$/.test(patientId)
        ? await apiFetchList<SurgeryRow>("/surgery/surgery/", { pageSize: 200, query: { patient: patientId } })
        : { items: [] as SurgeryRow[] }
      const knownSurgeryIds = new Set(surgeriesForPatient.map((surgery) => String(surgery.id)))
      const { items: allItems } = await apiFetchList<BillingItem>(ENDPOINT, { pageSize: 500 })
      const missingSurgeryIds = Array.from(new Set(allItems.map((item) => String(item.surgery || "")).filter((id) => id && !knownSurgeryIds.has(id))))
      const fetchedSurgeries = await Promise.all(
        missingSurgeryIds.map(async (surgeryId) => {
          const row = await apiFetch<SurgeryRow>(`/surgery/surgery/${surgeryId}/`).catch(() => null)
          return [surgeryId, row] as const
        })
      )
      const surgeryMap = {
        ...Object.fromEntries(surgeriesForPatient.map((surgery) => [String(surgery.id), surgery])),
        ...Object.fromEntries(fetchedSurgeries.filter(([, row]) => Boolean(row))),
      } as Record<string, SurgeryRow>
      const patientItems = allItems.filter((item) => {
        const surgery = surgeryMap[String(item.surgery || "")]
        if (/^\d+$/.test(patientId)) return String(surgery?.patient || "") === patientId
        return String(item.patient_name || "").toLowerCase() === patientId.toLowerCase()
      })
      const invoiceIds = Array.from(new Set(patientItems.map((item) => String(item.invoice || "")).filter(Boolean)))
      const receiptPairs = await Promise.all(
        invoiceIds.map(async (invoiceId) => {
          const { items: receipts } = await apiFetchList<ReceiptRow>("/payments/receipt/", {
            pageSize: 1,
            query: { invoice: invoiceId },
          }).catch(() => ({ items: [] as ReceiptRow[] }))
          return [invoiceId, receipts[0] || null] as const
        })
      )
      setSurgeries(surgeryMap)
      setItems(patientItems)
      setReceiptsByInvoice(Object.fromEntries(receiptPairs.filter(([, receipt]) => Boolean(receipt))) as Record<string, ReceiptRow>)
      setSelected(new Set(patientItems.filter(isUnbilled).map((item) => item.id)))
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar faturação do paciente.")
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { load() }, [load])

  const patientName = useMemo(() => {
    const firstItem = items[0]
    const firstSurgery = Object.values(surgeries).find((surgery) => String(surgery.patient || "") === patientId)
    return firstSurgery?.patient_name || firstItem?.patient_name || "Paciente não identificado"
  }, [items, patientId, surgeries])

  const unbilled = useMemo(() => items.filter(isUnbilled), [items])
  const billed = useMemo(() => items.filter((item) => item.status === "INVOICED"), [items])
  const visibleItems = view === "UNBILLED" ? unbilled : billed
  const selectedItems = useMemo(() => unbilled.filter((item) => selected.has(item.id)), [selected, unbilled])
  const selectedTotal = selectedItems.reduce((sum, item) => sum + num(item.total_with_vat || item.line_total), 0)

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setStep("none")
    setNotice(null)
  }

  function advance(next: Step) {
    setStep(next)
    setNotice(
      "Etapa preparada com os eventos selecionados. Falta endpoint backend para gravar cotação/proforma/fatura/recibo por paciente e itens selecionados sem saltar etapas."
    )
  }

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
      <div className="mx-auto w-full max-w-[99vw] space-y-1 px-0.5 py-0.5">
        <section className={`relative z-30 overflow-visible ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="space-y-1 px-2 py-1.5 pl-3">
            <div className="flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                  <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                  <span>/</span>
                  <Link href={ROUTE_BASE} className="hover:text-foreground">Faturação</Link>
                  <span>/</span>
                  <span className="font-semibold text-foreground">Paciente</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <h1 className="font-display text-[14px] font-semibold leading-tight text-foreground">{patientName}</h1>
                  <span className="rounded-full border border-amber-300/70 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300">
                    {unbilled.length} não faturados
                  </span>
                  <span className="rounded-full border border-emerald-300/70 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                    {billed.length} faturados
                  </span>
                </div>
              </div>

              <Link href={ROUTE_BASE} className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <ArrowLeft size={11} /> Voltar
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-1 md:grid-cols-5">
              <Metric label="Selecionados" value={String(selectedItems.length)} icon={<CheckCircle2 size={11} />} />
              <Metric label="Valor selecionado" value={fmtMoney(selectedTotal)} icon={<Banknote size={11} />} />
              <Metric label="Não faturados" value={fmtMoney(unbilled.reduce((sum, item) => sum + num(item.total_with_vat || item.line_total), 0))} icon={<CircleDollarSign size={11} />} />
              <Metric label="Faturados" value={fmtMoney(billed.reduce((sum, item) => sum + num(item.total_with_vat || item.line_total), 0))} icon={<Receipt size={11} />} />
              <Metric label="Eventos" value={String(items.length)} icon={<Scissors size={11} />} />
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <button type="button" onClick={() => setView("UNBILLED")} className={`h-7 rounded-md border px-2 text-[10px] font-semibold ${view === "UNBILLED" ? "border-violet-300 bg-violet-50 text-violet-700" : "border-border bg-card text-muted-foreground"}`}>
                Não faturados
              </button>
              <button type="button" onClick={() => setView("BILLED")} className={`h-7 rounded-md border px-2 text-[10px] font-semibold ${view === "BILLED" ? "border-violet-300 bg-violet-50 text-violet-700" : "border-border bg-card text-muted-foreground"}`}>
                Faturados
              </button>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {view === "UNBILLED" ? "Selecione os eventos antes de avançar para cotação." : "Eventos já vinculados a faturação."}
              </span>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertCircle size={13} className="mr-1 inline-block" />
            {error}
          </div>
        ) : null}

        {view === "UNBILLED" ? (
          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 bg-amber-400" />
            <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 pl-3">
              <StepButton label="Gerar cotação" active={step === "none"} done={step !== "none"} disabled={!selectedItems.length} onClick={() => advance("quotation")} />
              <StepButton label="Gerar fatura proforma" active={step === "quotation"} done={["proforma", "invoice", "receipt"].includes(step)} disabled={step !== "quotation"} onClick={() => advance("proforma")} />
              <StepButton label="Gerar fatura" active={step === "proforma"} done={["invoice", "receipt"].includes(step)} disabled={step !== "proforma"} onClick={() => advance("invoice")} />
              <StepButton label="Gerar recibo" active={step === "invoice"} done={step === "receipt"} disabled={step !== "invoice"} onClick={() => advance("receipt")} />
              {notice ? <span className="ml-auto text-[10px] font-medium text-amber-700 dark:text-amber-300">{notice}</span> : null}
            </div>
          </section>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            Carregando eventos...
          </div>
        ) : (
          <section className="space-y-1">
            {visibleItems.map((item) => {
              const surgery = surgeries[String(item.surgery || "")]
              const invoiceId = String(item.invoice || "")
              const receipt = invoiceId ? receiptsByInvoice[invoiceId] : null
              const checked = selected.has(item.id)
              return (
                <article key={item.id} className={`${GLASS} relative overflow-hidden`}>
                  <span className={`absolute left-0 top-0 h-full w-1 ${view === "UNBILLED" ? "bg-amber-400" : "bg-emerald-400"}`} />
                  <div className="grid grid-cols-[auto_1fr] gap-2 px-2 py-1.5 pl-3">
                    {view === "UNBILLED" ? (
                      <input type="checkbox" checked={checked} onChange={() => toggle(item.id)} className="mt-1" />
                    ) : (
                      <CheckCircle2 size={14} className="mt-1 text-emerald-600" />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="font-mono text-[10px] font-semibold text-violet-700 dark:text-violet-300">{item.custom_id || `#${item.id}`}</span>
                        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-700 dark:border-cyan-700/30 dark:bg-cyan-900/20 dark:text-cyan-300">
                          {eventLabel(item.event_type)}
                        </span>
                        <span className="rounded-full border border-border bg-card px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <div className="mt-0.5 grid grid-cols-1 gap-1 text-[10px] text-muted-foreground md:grid-cols-[1fr_160px_160px_130px_120px]">
                        <span className="truncate"><FileText size={10} className="mr-1 inline-block" />{item.description || "Evento cirúrgico"}</span>
                        <span className="truncate"><CalendarClock size={10} className="mr-1 inline-block" />{fmtDateTime(surgery?.scheduled_for || item.billed_at)}</span>
                        <span className="truncate"><Scissors size={10} className="mr-1 inline-block" />{surgery?.custom_id || item.surgery_code || "Sem cirurgia"}</span>
                        <span className="truncate">{fmtNumber(item.quantity)} x {fmtMoney(item.unit_price)}</span>
                        <span className="text-right font-bold text-foreground">{fmtMoney(item.total_with_vat || item.line_total)}</span>
                      </div>
                      {view === "BILLED" ? (
                        <div className="mt-1 flex flex-wrap items-center gap-1 border-t border-border/50 pt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {item.invoice_code ? `Fatura ${item.invoice_code}` : invoiceId ? `Fatura #${invoiceId}` : "Sem fatura vinculada"}
                          </span>
                          {invoiceId ? (
                            <Link href={`/billing/invoices/${invoiceId}/`} className="ml-auto inline-flex h-6 items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2 text-[10px] font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300">
                              <Receipt size={11} /> Ver fatura
                            </Link>
                          ) : null}
                          {invoiceId ? (
                            receipt ? (
                              <Link href={`/payments/receipts/${receipt.id}/`} className="inline-flex h-6 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                                <CheckCircle2 size={11} /> Ver recibo
                              </Link>
                            ) : (
                              <Link href={`/payments/receipts/new?invoice=${invoiceId}`} className="inline-flex h-6 items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 text-[10px] font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
                                <Banknote size={11} /> Gerar recibo
                              </Link>
                            )
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
            {!visibleItems.length ? (
              <section className={`${GLASS} px-3 py-6 text-center text-[12px] text-muted-foreground`}>
                Nenhum evento {view === "UNBILLED" ? "não faturado com preço definido" : "faturado"} para este paciente.
              </section>
            ) : null}
          </section>
        )}
      </div>
    </AppLayout>
  )
}
