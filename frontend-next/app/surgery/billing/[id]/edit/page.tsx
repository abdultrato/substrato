"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CalendarClock,
  Check,
  CircleDollarSign,
  FileText,
  Loader2,
  PackageCheck,
  Receipt,
  Save,
  Scissors,
  ShieldCheck,
  Tags,
  User,
} from "lucide-react"

import { SearchableRelationSelect } from "@/components/form/AutoForm"
import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"
import type { RelationOption, RelationTarget } from "@/lib/resources/relationOptions"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type Row = Record<string, any>

type FormState = {
  surgery: string
  authorization: string
  procedure_item: string
  consumption: string
  invoice: string
  event_type: string
  billing_mode: string
  description: string
  quantity: string
  unit_price: string
  vat_percentage: string
  applies_vat: boolean
  billable: boolean
  status: string
  billed_at: string
  notes: string
}

const ENDPOINT = "/surgery/faturacao"
const ROUTE_BASE = "/surgery/billing"
const GLASS = "rounded-lg border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const INPUT = "h-7 w-full rounded-md border border-border bg-card/70 px-2 text-[11px] text-foreground outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-violet-800"
const LABEL = "mb-0.5 block text-[8px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]"

const RELATION_TARGETS: Record<string, RelationTarget> = {
  surgery: { endpoint: "/surgery/surgery/", labelFields: ["custom_id", "patient_name", "procedure", "scheduled_for", "id"] },
  authorization: { endpoint: "/surgery/autorizacoes/", labelFields: ["custom_id", "patient_name", "surgery_code", "status", "id"] },
  procedure_item: { endpoint: "/surgery/procedimentos_realizados/", labelFields: ["custom_id", "description", "surgery_code", "id"] },
  consumption: { endpoint: "/surgery/consumos/", labelFields: ["custom_id", "material_name", "product_name", "surgery_code", "id"] },
  invoice: { endpoint: "/billing/invoice/", labelFields: ["custom_id", "patient_name", "total", "status", "id"] },
}

const EVENT_OPTIONS = [
  ["ROOM_FEE", "Taxa de sala"],
  ["SURGEON_FEE", "Honorário do cirurgião"],
  ["ANESTHETIST_FEE", "Honorário do anestesista"],
  ["TEAM_FEE", "Honorário da equipa"],
  ["SURGICAL_PROCEDURE", "Procedimento cirúrgico"],
  ["SURGICAL_MATERIAL", "Material cirúrgico"],
  ["IMPLANT", "Implante"],
  ["INTRAOPERATIVE_MEDICATION", "Medicamento intraoperatório"],
  ["ANESTHESIA", "Anestesia"],
  ["RECOVERY", "Recuperação"],
  ["INPATIENT_CARE", "Internamento"],
  ["ICU", "UCI"],
  ["PREOPERATIVE_EXAM", "Exame pré-operatório"],
  ["INTRAOPERATIVE_EXAM", "Exame intraoperatório"],
  ["PATHOLOGY_SPECIMEN", "Amostra de patologia"],
  ["ADJUSTMENT", "Ajuste"],
] as const

const STATUS_OPTIONS = [
  ["DRAFT", "Rascunho"],
  ["READY", "Pronto para faturar"],
  ["INVOICED", "Faturado"],
  ["CANCELLED", "Cancelado"],
  ["ADJUSTED", "Ajustado"],
] as const

const MODE_OPTIONS = [
  ["PACKAGE", "Pacote"],
  ["ITEMIZED", "Detalhado"],
  ["HYBRID", "Híbrido"],
] as const

const INITIAL_FORM: FormState = {
  surgery: "",
  authorization: "",
  procedure_item: "",
  consumption: "",
  invoice: "",
  event_type: "SURGICAL_PROCEDURE",
  billing_mode: "HYBRID",
  description: "",
  quantity: "1.00",
  unit_price: "0.00",
  vat_percentage: "5.00",
  applies_vat: true,
  billable: true,
  status: "DRAFT",
  billed_at: "",
  notes: "",
}

function asId(value: unknown): string {
  if (value === undefined || value === null || value === "") return ""
  return String(value)
}

function toDecimalString(value: unknown, fallback = "0.00"): string {
  const parsed = Number(value ?? fallback)
  if (!Number.isFinite(parsed)) return fallback
  return parsed.toFixed(2)
}

function dateTimeLocal(value: unknown): string {
  if (!value) return ""
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toIsoOrNull(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function num(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function fmtMoney(value: unknown): string {
  return `${num(value).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`
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

function option(value: unknown, label: unknown): RelationOption[] {
  const id = asId(value)
  const text = String(label || "").trim()
  return id ? [{ value: id, label: text || "Registo selecionado" }] : []
}

function formFromRow(row: Row): FormState {
  return {
    surgery: asId(row.surgery),
    authorization: asId(row.authorization),
    procedure_item: asId(row.procedure_item),
    consumption: asId(row.consumption),
    invoice: asId(row.invoice),
    event_type: String(row.event_type || "SURGICAL_PROCEDURE"),
    billing_mode: String(row.billing_mode || "HYBRID"),
    description: String(row.description || ""),
    quantity: toDecimalString(row.quantity, "1.00"),
    unit_price: toDecimalString(row.unit_price),
    vat_percentage: toDecimalString(row.vat_percentage, "5.00"),
    applies_vat: row.applies_vat !== false,
    billable: row.billable !== false,
    status: String(row.status || "DRAFT"),
    billed_at: dateTimeLocal(row.billed_at),
    notes: String(row.notes || ""),
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  )
}

function Info({ label, value, icon }: { label: string; value: unknown; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-card/35 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-0.5 truncate text-[11px] font-semibold text-foreground">{String(value || "—")}</div>
    </div>
  )
}

function Card({
  title,
  icon,
  children,
  className = "",
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`relative overflow-visible ${GLASS} ${className}`}>
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

export default function SurgeryBillingEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = routeParamToString((params as any)?.id)

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [row, setRow] = useState<Row | null>(null)
  const [surgery, setSurgery] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const eventLabel = EVENT_OPTIONS.find(([value]) => value === form.event_type)?.[1] || form.event_type
  const statusLabel = STATUS_OPTIONS.find(([value]) => value === form.status)?.[1] || form.status
  const lineTotal = num(form.quantity) * num(form.unit_price)
  const vatValue = form.applies_vat ? lineTotal * (num(form.vat_percentage) / 100) : 0
  const totalWithVat = lineTotal + vatValue
  const relationOptions = {
    surgery: option(form.surgery, row?.surgery_code || surgery?.custom_id || surgery?.procedure),
    authorization: option(form.authorization, row?.authorization_code),
    procedure_item: option(form.procedure_item, row?.procedure_item_code),
    consumption: option(form.consumption, row?.consumption_code),
    invoice: option(form.invoice, row?.invoice_code),
  }
  const relationTargets = useMemo<Record<string, RelationTarget>>(() => {
    const surgeryFilter = form.surgery ? { surgery: Number(form.surgery) } : undefined
    return {
      ...RELATION_TARGETS,
      authorization: { ...RELATION_TARGETS.authorization, staticFilters: surgeryFilter },
      procedure_item: { ...RELATION_TARGETS.procedure_item, staticFilters: surgeryFilter },
      consumption: { ...RELATION_TARGETS.consumption, staticFilters: surgeryFilter },
    }
  }, [form.surgery])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const nextRow = await apiFetch<Row>(`${ENDPOINT}/${id}/`)
      setRow(nextRow)
      setForm(formFromRow(nextRow))
      setSurgery(nextRow?.surgery ? await apiFetch<Row>(`/surgery/surgery/${nextRow.surgery}/`).catch(() => null) : null)
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar item de faturação.")
      setRow(null)
      setSurgery(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSurgeryChange(value: unknown) {
    const nextId = asId(value)
    update("surgery", nextId)
    if (!nextId) {
      setSurgery(null)
      return
    }
    setSurgery(await apiFetch<Row>(`/surgery/surgery/${nextId}/`).catch(() => null))
  }

  function buildPayload() {
    return {
      surgery: form.surgery ? Number(form.surgery) : null,
      authorization: form.authorization ? Number(form.authorization) : null,
      procedure_item: form.procedure_item ? Number(form.procedure_item) : null,
      consumption: form.consumption ? Number(form.consumption) : null,
      invoice: form.invoice ? Number(form.invoice) : null,
      event_type: form.event_type,
      billing_mode: form.billing_mode,
      description: form.description,
      quantity: form.quantity,
      unit_price: form.unit_price,
      vat_percentage: form.vat_percentage,
      applies_vat: form.applies_vat,
      billable: form.billable,
      status: form.status,
      billed_at: toIsoOrNull(form.billed_at),
      notes: form.notes,
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!id) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await apiFetch<Row>(`${ENDPOINT}/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(buildPayload()),
      })
      setSaved(true)
      window.setTimeout(() => router.push(`${ROUTE_BASE}/${id}`), 450)
    } catch (err: any) {
      setError(err?.message || "Erro ao guardar item de faturação.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </div>
      </AppLayout>
    )
  }

  if (error && !row) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
        <div className="mx-auto w-full max-w-[99vw] px-1 py-1">
          <div className="flex items-center gap-2 rounded-lg border border-rose-300/50 bg-rose-50/60 px-3 py-2 text-sm text-rose-700">
            <AlertCircle size={14} /> {error}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[99vw] space-y-1 px-0.5 py-0.5">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-col gap-1 px-2 py-1.5 pl-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href={ROUTE_BASE} className="hover:text-foreground">Faturação</Link>
                <span>/</span>
                <Link href={`${ROUTE_BASE}/${id}`} className="font-mono hover:text-foreground">{row?.custom_id || `#${id}`}</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">Editar</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <h1 className="font-display text-[14px] font-semibold leading-tight text-foreground">
                  Editar item de faturação
                </h1>
                <span className="rounded-full border border-cyan-300 bg-cyan-50 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-700 dark:border-cyan-700/30 dark:bg-cyan-900/20 dark:text-cyan-300">
                  {eventLabel}
                </span>
                <span className="rounded-full border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
                  {statusLabel}
                </span>
                <span className="rounded-full border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                  {fmtMoney(totalWithVat)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1">
              {saved ? (
                <span className="inline-flex h-6 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <Check size={11} /> Guardado
                </span>
              ) : null}
              <Link href={`${ROUTE_BASE}/${id}`} className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-card px-2 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <ArrowLeft size={11} /> Voltar
              </Link>
              <button type="submit" disabled={saving} className="inline-flex h-6 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
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

        <section className="grid grid-cols-2 gap-1 md:grid-cols-4">
          <Info label="Subtotal" value={fmtMoney(lineTotal)} icon={<Banknote size={10} />} />
          <Info label="IVA" value={form.applies_vat ? fmtMoney(vatValue) : "Isento"} icon={<Receipt size={10} />} />
          <Info label="Total" value={fmtMoney(totalWithVat)} icon={<CircleDollarSign size={10} />} />
          <Info label="Faturável" value={form.billable ? "Sim" : "Não"} icon={<Check size={10} />} />
        </section>

        <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
          <Card title="Linha faturável" icon={<Receipt size={12} />}>
            <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
              <Field label="Descrição">
                <input value={form.description} onChange={(event) => update("description", event.target.value)} className={INPUT} required={form.billable} />
              </Field>
              <Field label="Tipo de evento">
                <select value={form.event_type} onChange={(event) => update("event_type", event.target.value)} className={INPUT}>
                  {EVENT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Modo de faturação">
                <select value={form.billing_mode} onChange={(event) => update("billing_mode", event.target.value)} className={INPUT}>
                  {MODE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Estado">
                <select value={form.status} onChange={(event) => update("status", event.target.value)} className={INPUT}>
                  {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Quantidade">
                <input type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} className={INPUT} />
              </Field>
              <Field label="Preço unitário">
                <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(event) => update("unit_price", event.target.value)} className={INPUT} />
              </Field>
              <Field label="IVA (%)">
                <input type="number" min="0" step="0.01" value={form.vat_percentage} onChange={(event) => update("vat_percentage", event.target.value)} className={INPUT} disabled={!form.applies_vat} />
              </Field>
              <Field label="Faturado em">
                <input type="datetime-local" value={form.billed_at} onChange={(event) => update("billed_at", event.target.value)} className={INPUT} />
              </Field>
              <label className="flex h-7 items-center gap-2 rounded-md border border-border bg-card/50 px-2 text-[11px] text-foreground">
                <input type="checkbox" checked={form.applies_vat} onChange={(event) => update("applies_vat", event.target.checked)} />
                Aplicar IVA
              </label>
              <label className="flex h-7 items-center gap-2 rounded-md border border-border bg-card/50 px-2 text-[11px] text-foreground">
                <input type="checkbox" checked={form.billable} onChange={(event) => update("billable", event.target.checked)} />
                Item faturável
              </label>
            </div>
          </Card>

          <Card title="Vínculos clínicos e fiscais" icon={<ShieldCheck size={12} />} className="z-50">
            <div className="grid grid-cols-1 gap-1.5">
              <Field label="Cirurgia">
                <SearchableRelationSelect fieldName="surgery" value={form.surgery} onChange={handleSurgeryChange} target={relationTargets.surgery} initialOptions={relationOptions.surgery} placeholder="Pesquisar cirurgia..." />
              </Field>
              <Field label="Autorização">
                <SearchableRelationSelect fieldName="authorization" value={form.authorization} onChange={(value) => update("authorization", asId(value))} target={relationTargets.authorization} initialOptions={relationOptions.authorization} placeholder="Pesquisar autorização..." />
              </Field>
              <Field label="Procedimento realizado">
                <SearchableRelationSelect fieldName="procedure_item" value={form.procedure_item} onChange={(value) => update("procedure_item", asId(value))} target={relationTargets.procedure_item} initialOptions={relationOptions.procedure_item} placeholder="Pesquisar procedimento..." />
              </Field>
              <Field label="Consumo">
                <SearchableRelationSelect fieldName="consumption" value={form.consumption} onChange={(value) => update("consumption", asId(value))} target={relationTargets.consumption} initialOptions={relationOptions.consumption} placeholder="Pesquisar consumo..." />
              </Field>
              <Field label="Fatura">
                <SearchableRelationSelect fieldName="invoice" value={form.invoice} onChange={(value) => update("invoice", asId(value))} target={relationTargets.invoice} initialOptions={relationOptions.invoice} placeholder="Pesquisar fatura..." />
              </Field>
            </div>
          </Card>

          <Card title="Contexto" icon={<Scissors size={12} />}>
            <div className="grid grid-cols-2 gap-1">
              <Info label="Cirurgia" value={row?.surgery_code || surgery?.custom_id || (form.surgery ? `#${form.surgery}` : "—")} icon={<Scissors size={9} />} />
              <Info label="Paciente" value={row?.patient_name || surgery?.patient_name} icon={<User size={9} />} />
              <Info label="Procedimento" value={surgery?.procedure} icon={<FileText size={9} />} />
              <Info label="Agendada" value={fmtDateTime(surgery?.scheduled_for)} icon={<CalendarClock size={9} />} />
            </div>
          </Card>

          <Card title="Observações" icon={<PackageCheck size={12} />}>
            <Field label="Notas">
              <textarea
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                rows={4}
                className="min-h-[78px] w-full rounded-md border border-border bg-card/70 px-2 py-1.5 text-[11px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-violet-400 focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
                placeholder="Observações sobre faturação, ajuste, fatura ou consumo..."
              />
            </Field>
          </Card>
        </div>
      </form>
    </AppLayout>
  )
}
