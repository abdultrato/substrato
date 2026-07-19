"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CreditCard,
  FileText,
  Loader2,
  Package,
  RotateCcw,
  Save,
  Scissors,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { SearchableRelationSelect } from "@/components/form/AutoForm"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"
import type { RelationOption, RelationTarget } from "@/lib/resources/relationOptions"

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const INPUT = "h-8 w-full rounded-lg border border-border bg-card/70 px-2.5 text-[12px] text-foreground outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
const LABEL = "mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]"

const MATERIAL_STATUS_OPTIONS = [
  ["RESERVED", "Reservado"],
  ["PREPARED", "Preparado"],
  ["SENT_TO_OR", "Enviado para sala"],
  ["USED", "Usado"],
  ["PARTIALLY_USED", "Parcialmente usado"],
  ["RETURNED", "Devolvido"],
  ["DISCARDED", "Descartado"],
  ["STERILIZATION_REQUIRED", "Esterilização necessária"],
  ["BILLED", "Faturado"],
] as const

const BILLING_STATUS_OPTIONS = [
  ["NOT_BILLABLE", "Não faturável"],
  ["PENDING", "Pendente"],
  ["BILLABLE", "Faturável"],
  ["BILLED", "Faturado"],
  ["ADJUSTED", "Ajustado"],
] as const

const SURGERY_DONE_STATUSES = new Set([
  "SURGERY_COMPLETED",
  "CONCLUIDA",
  "CLOSED",
  "IN_RECOVERY",
  "RECOVERED",
  "REPORT_PENDING",
  "BILLING_PENDING",
])

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

const RELATION_TARGETS: Record<string, RelationTarget> = {
  surgery: { endpoint: "/surgery/surgery/", labelFields: ["custom_id", "patient_name", "procedure", "scheduled_for", "id"] },
  material: { endpoint: "/surgery/materiais/", labelFields: ["name", "custom_id", "batch_number", "id"] },
  product: { endpoint: "/pharmacy/product/", labelFields: ["name", "custom_id", "id"] },
  consumed_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", "id"] },
}

type Consumption = {
  id: number
  custom_id?: string | null
  surgery?: number | string | null
  material?: number | string | null
  product?: number | string | null
  consumed_by?: number | string | null
  quantity?: string | number | null
  returned_quantity?: string | number | null
  unit_cost?: string | number | null
  charged_price?: string | number | null
  consumed_at?: string | null
  batch_number?: string | null
  expiry_date?: string | null
  material_status?: string | null
  billing_status?: string | null
  inventory_deducted?: boolean | null
  notes?: string | null
  surgery_code?: string | null
  material_name?: string | null
  product_name?: string | null
  consumed_by_name?: string | null
  line_total?: string | number | null
  created_at?: string | null
  updated_at?: string | null
}

type SurgeryContext = {
  id: number
  custom_id?: string | null
  patient_name?: string | null
  procedure?: string | null
  procedure_names?: string[] | null
  status?: string | null
  scheduled_for?: string | null
}

type ProfessionalProfile = {
  id: number
  user?: number | string | null
  employee?: number | string | null
  role?: string | null
  department?: string | null
}

type FormState = {
  surgery: string
  material: string
  product: string
  consumed_by: string
  quantity: string
  returned_quantity: string
  unit_cost: string
  charged_price: string
  consumed_at: string
  batch_number: string
  expiry_date: string
  material_status: string
  billing_status: string
  inventory_deducted: boolean
  notes: string
}

function asId(value: unknown): string {
  if (value === undefined || value === null || value === "") return ""
  return String(value)
}

function toDateTimeLocal(value?: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIsoOrNull(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function numberValue(value: string | number | null | undefined): number {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? "0"))
  return Number.isFinite(parsed) ? parsed : 0
}

function fmtMoney(value: string | number | null | undefined): string {
  return `${numberValue(value).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`
}

function fmtDate(value?: string | null): string {
  if (!value) return "Sem data"
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

function relationOption(value: string, label?: string | null): RelationOption[] {
  if (!value) return []
  return [{ value, label: label || `Registo #${value}` }]
}

function buildForm(row: Consumption): FormState {
  return {
    surgery: asId(row.surgery),
    material: asId(row.material),
    product: asId(row.product),
    consumed_by: asId(row.consumed_by),
    quantity: String(row.quantity ?? "1.00"),
    returned_quantity: String(row.returned_quantity ?? "0.00"),
    unit_cost: String(row.unit_cost ?? "0.00"),
    charged_price: String(row.charged_price ?? "0.00"),
    consumed_at: toDateTimeLocal(row.consumed_at),
    batch_number: row.batch_number || "",
    expiry_date: row.expiry_date || "",
    material_status: row.material_status || "USED",
    billing_status: row.billing_status || "BILLABLE",
    inventory_deducted: !!row.inventory_deducted,
    notes: row.notes || "",
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

function TextInput({
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={INPUT}
    />
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

function HistoryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-card/40 px-1.5 py-1">
      <div className="text-[8px] font-semibold uppercase tracking-[0.1em] text-[var(--gray-500)]">{label}</div>
      <div className="mt-0.5 truncate text-[10px] font-semibold leading-tight text-foreground">{value || "—"}</div>
    </div>
  )
}

export default function SurgeryConsumptionEditPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const router = useRouter()
  const { user } = useAuth()

  const [row, setRow] = useState<Consumption | null>(null)
  const [surgery, setSurgery] = useState<SurgeryContext | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>("")
  const [currentEmployeeLabel, setCurrentEmployeeLabel] = useState<string>("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<Consumption>(`/surgery/consumos/${id}/`)
      const nextForm = buildForm(data)
      let nextSurgery: SurgeryContext | null = null
      if (data.surgery) {
        nextSurgery = await apiFetch<SurgeryContext>(`/surgery/surgery/${data.surgery}/`).catch(() => null)
      }
      if (user?.id) {
        const profiles = await apiFetch<any>(`/identity/perfilprofissional/?user=${user.id}&active=true&limit=1`).catch(() => null)
        const firstProfile: ProfessionalProfile | null = Array.isArray(profiles)
          ? profiles[0] || null
          : profiles?.results?.[0] || null
        const employeeId = asId(firstProfile?.employee)
        if (employeeId) {
          nextForm.consumed_by = employeeId
          setCurrentEmployeeId(employeeId)
          setCurrentEmployeeLabel(user.full_name || user.username || data.consumed_by_name || `Funcionário #${employeeId}`)
        } else {
          setCurrentEmployeeId("")
          setCurrentEmployeeLabel(data.consumed_by_name || user.full_name || user.username || "")
        }
      }
      setRow(data)
      setSurgery(nextSurgery)
      setForm(nextForm)
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar consumo.")
      setRow(null)
      setSurgery(null)
      setForm(null)
    } finally {
      setLoading(false)
    }
  }, [id, user?.full_name, user?.id, user?.username])

  useEffect(() => {
    load()
  }, [load])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form) return
    const surgeryDone = !!surgery?.status && SURGERY_DONE_STATUSES.has(surgery.status)
    if (surgeryDone) {
      setError("Este consumo não pode ser editado porque a cirurgia já foi realizada.")
      return
    }

    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const payload = {
        surgery: form.surgery ? Number(form.surgery) : null,
        material: form.material ? Number(form.material) : null,
        product: form.product ? Number(form.product) : null,
        consumed_by: form.consumed_by ? Number(form.consumed_by) : null,
        quantity: form.quantity || "1.00",
        returned_quantity: form.returned_quantity || "0.00",
        unit_cost: form.unit_cost || "0.00",
        charged_price: form.charged_price || "0.00",
        consumed_at: toIsoOrNull(form.consumed_at),
        batch_number: form.batch_number,
        expiry_date: form.expiry_date || null,
        material_status: form.material_status,
        billing_status: form.billing_status,
        inventory_deducted: form.inventory_deducted,
        notes: form.notes,
      }

      await apiFetch(`/surgery/consumos/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      setSaved(true)
      window.setTimeout(() => router.push(`/surgery/consumptions/${id}`), 500)
    } catch (err: any) {
      setError(err?.message || "Erro ao guardar consumo.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
        <div className="flex h-40 items-center justify-center gap-2 text-sm text-[var(--gray-500)]">
          <Loader2 size={16} className="animate-spin" />
          Carregando...
        </div>
      </AppLayout>
    )
  }

  if (!row || !form) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error || "Consumo não encontrado."}
        </div>
      </AppLayout>
    )
  }

  const lineTotal = numberValue(form.quantity) * numberValue(form.charged_price)
  const effectiveQty = Math.max(numberValue(form.quantity) - numberValue(form.returned_quantity), 0)
  const surgeryDone = !!surgery?.status && SURGERY_DONE_STATUSES.has(surgery.status)
  const procedureLabel = surgery?.procedure_names?.length ? surgery.procedure_names.join(", ") : surgery?.procedure
  const productLocked = !!row.product

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[99vw] space-y-1 px-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-col gap-1.5 px-2.5 py-1.5 pl-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href="/surgery/consumptions" className="hover:text-foreground">Consumos</Link>
                <span>/</span>
                <Link href={`/surgery/consumptions/${id}`} className="font-semibold text-foreground hover:text-violet-600">
                  {row.custom_id || `#${row.id}`}
                </Link>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="font-display text-[15px] font-semibold leading-tight text-foreground">
                  Editar consumo cirúrgico
                </h1>
                <span className="rounded-full border border-violet-300/70 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300">
                  {row.material_name || row.product_name || "Material"}
                </span>
                <span className="rounded-full border border-blue-300/70 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
                  Total {fmtMoney(lineTotal)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1">
              {saved ? (
                <span className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <Check size={11} />
                  Guardado
                </span>
              ) : null}
              <Link
                href={`/surgery/consumptions/${id}`}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft size={11} />
                Voltar
              </Link>
              <button
                type="submit"
                disabled={saving || surgeryDone}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300"
              >
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

        {surgeryDone ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300">
            Edição bloqueada: apenas consumos de cirurgias ainda não realizadas podem ser alterados.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
          <Card title="Cirurgia e responsável" icon={<Scissors size={12} />} className="z-50">
            <div className="grid grid-cols-1 gap-2">
              <Field label="Cirurgia">
                <SearchableRelationSelect
                  fieldName="surgery"
                  value={form.surgery}
                  onChange={(value) => update("surgery", asId(value))}
                  target={RELATION_TARGETS.surgery}
                  initialOptions={relationOption(form.surgery, row.surgery_code)}
                  readOnly={surgeryDone}
                  placeholder="Pesquisar cirurgia..."
                />
              </Field>
              <Field label="Registado por">
                <SearchableRelationSelect
                  fieldName="consumed_by"
                  value={form.consumed_by}
                  onChange={(value) => update("consumed_by", asId(value))}
                  target={RELATION_TARGETS.consumed_by}
                  initialOptions={relationOption(form.consumed_by, currentEmployeeLabel || row.consumed_by_name)}
                  readOnly
                  placeholder={currentEmployeeId ? "Utilizador atual" : "Sem funcionário RH ligado"}
                />
              </Field>
            </div>
          </Card>

          <Card title="Material ou produto" icon={<Package size={12} />} className="z-40">
            <div className="grid grid-cols-1 gap-2">
              <Field label="Material cirúrgico">
                <SearchableRelationSelect
                  fieldName="material"
                  value={form.material}
                  onChange={(value) => update("material", asId(value))}
                  target={RELATION_TARGETS.material}
                  initialOptions={relationOption(form.material, row.material_name)}
                  readOnly={surgeryDone}
                  placeholder="Pesquisar material..."
                />
              </Field>
              <Field label="Produto de stock">
                {productLocked ? (
                  <div className="flex h-8 items-center rounded-lg border border-border/70 bg-card/40 px-2.5 text-[12px] font-semibold text-foreground">
                    {row.product_name || `Produto #${row.product}`}
                  </div>
                ) : (
                  <SearchableRelationSelect
                    fieldName="product"
                    value={form.product}
                    onChange={(value) => update("product", asId(value))}
                    target={RELATION_TARGETS.product}
                    initialOptions={relationOption(form.product, row.product_name)}
                    readOnly={surgeryDone}
                    placeholder="Pesquisar produto..."
                  />
                )}
              </Field>
            </div>
          </Card>

          <Card title="Quantidades" icon={<RotateCcw size={12} />}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Quantidade">
                <TextInput type="number" value={form.quantity} onChange={(value) => update("quantity", value)} disabled={surgeryDone} />
              </Field>
              <Field label="Devolvida">
                <TextInput type="number" value={form.returned_quantity} onChange={(value) => update("returned_quantity", value)} disabled={surgeryDone} />
              </Field>
              <Field label="Quantidade efectiva">
                <div className="flex h-8 items-center rounded-lg border border-border/70 bg-card/40 px-2.5 text-[12px] font-semibold text-foreground">
                  {effectiveQty.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                </div>
              </Field>
              <Field label="Stock">
                <label className="flex h-8 items-center gap-2 rounded-lg border border-border/70 bg-card/40 px-2.5 text-[12px] font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={form.inventory_deducted}
                    onChange={(event) => update("inventory_deducted", event.target.checked)}
                    className="h-4 w-4"
                    disabled={surgeryDone}
                  />
                  Baixado
                </label>
              </Field>
            </div>
          </Card>

          <Card title="Preços" icon={<CreditCard size={12} />}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Custo unitário">
                <TextInput type="number" value={form.unit_cost} onChange={(value) => update("unit_cost", value)} disabled={surgeryDone} />
              </Field>
              <Field label="Preço cobrado">
                <TextInput type="number" value={form.charged_price} onChange={(value) => update("charged_price", value)} disabled={surgeryDone} />
              </Field>
              <Field label="Total da linha">
                <div className="flex h-8 items-center rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 text-[12px] font-semibold text-blue-800 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
                  {fmtMoney(lineTotal)}
                </div>
              </Field>
              <Field label="Estado de faturação">
                <select value={form.billing_status} onChange={(event) => update("billing_status", event.target.value)} className={INPUT} disabled={surgeryDone}>
                  {BILLING_STATUS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card title="Rastreabilidade" icon={<CalendarClock size={12} />}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Consumido em">
                <TextInput type="datetime-local" value={form.consumed_at} onChange={(value) => update("consumed_at", value)} disabled={surgeryDone} />
              </Field>
              <Field label="Validade">
                <TextInput type="date" value={form.expiry_date} onChange={(value) => update("expiry_date", value)} disabled={surgeryDone} />
              </Field>
              <Field label="Lote">
                <TextInput value={form.batch_number} onChange={(value) => update("batch_number", value)} placeholder="N.º do lote" disabled={surgeryDone} />
              </Field>
              <Field label="Estado do material">
                <select value={form.material_status} onChange={(event) => update("material_status", event.target.value)} className={INPUT} disabled={surgeryDone}>
                  {MATERIAL_STATUS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card title="Observações" icon={<FileText size={12} />}>
            <textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              disabled={surgeryDone}
              rows={5}
              className="min-h-[96px] w-full rounded-lg border border-border bg-card/70 px-2.5 py-2 text-[12px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-violet-400 focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
              placeholder="Observações do consumo, devolução, lote ou ajuste de faturação..."
            />
          </Card>
        </div>

        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />
          <div className="space-y-1 px-2 py-1.5 pl-4">
            <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">
              <CalendarClock size={11} />
              <span>Histórico e contexto</span>
            </div>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 xl:grid-cols-8">
              <HistoryItem label="Criado em" value={fmtDate(row.created_at)} />
              <HistoryItem label="Atualizado em" value={fmtDate(row.updated_at)} />
              <HistoryItem label="Consumido em" value={fmtDate(row.consumed_at)} />
              <HistoryItem label="Cirurgia" value={row.surgery_code || surgery?.custom_id || `#${row.surgery}`} />
              <HistoryItem label="Paciente" value={surgery?.patient_name} />
              <HistoryItem label="Procedimento" value={procedureLabel} />
              <HistoryItem label="Estado" value={surgery?.status ? SURGERY_STATUS_LABEL[surgery.status] || surgery.status : "Sem estado"} />
              <HistoryItem label="Responsável" value={currentEmployeeLabel || row.consumed_by_name} />
            </div>
          </div>
        </section>
      </form>
    </AppLayout>
  )
}
