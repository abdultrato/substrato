"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileText,
  Loader2,
  Save,
  Scissors,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { SearchableRelationSelect } from "@/components/form/AutoForm"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import type { RelationTarget } from "@/lib/resources/relationOptions"

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const INPUT = "h-8 w-full rounded-lg border border-border bg-card/70 px-2.5 text-[12px] text-foreground outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-violet-800"
const LABEL = "mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]"

const STATUS_OPTIONS = [
  ["PENDING", "Pendente"],
  ["APPROVED", "Aprovada"],
  ["PARTIALLY_APPROVED", "Parcialmente aprovada"],
  ["REJECTED", "Rejeitada"],
  ["EXPIRED", "Expirada"],
  ["CANCELLED", "Cancelada"],
] as const

const RELATION_TARGETS: Record<string, RelationTarget> = {
  patient: { endpoint: "/clinical/patient/", labelFields: ["name", "document_number", "custom_id", "id"] },
  surgery: { endpoint: "/surgery/surgery/", labelFields: ["custom_id", "patient_name", "procedure", "scheduled_for", "id"] },
  surgical_request: { endpoint: "/surgery/pedido_cirurgico/", labelFields: ["custom_id", "patient_name", "requested_procedure", "id"] },
  preoperative_assessment: { endpoint: "/surgery/avaliacao_pre_operatoria/", labelFields: ["custom_id", "patient_name", "surgery_code", "id"] },
}

type FormState = {
  patient: string
  surgery: string
  surgical_request: string
  preoperative_assessment: string
  status: string
  valid_until: string
  quotation_amount: string
  approved_amount: string
  initial_payment_amount: string
  budget_approved: boolean
  initial_payment_received: boolean
  insurance_authorized: boolean
  special_materials_approved: boolean
  room_available: boolean
  team_available: boolean
  preoperative_assessment_completed: boolean
  consent_signed: boolean
  rejected_reason: string
  notes: string
}

const INITIAL_FORM: FormState = {
  patient: "",
  surgery: "",
  surgical_request: "",
  preoperative_assessment: "",
  status: "PENDING",
  valid_until: "",
  quotation_amount: "0.00",
  approved_amount: "0.00",
  initial_payment_amount: "0.00",
  budget_approved: false,
  initial_payment_received: false,
  insurance_authorized: false,
  special_materials_approved: false,
  room_available: false,
  team_available: false,
  preoperative_assessment_completed: false,
  consent_signed: false,
  rejected_reason: "",
  notes: "",
}

function asId(value: unknown): string {
  if (value === undefined || value === null || value === "") return ""
  return String(value)
}

function numberValue(value: string): number {
  const parsed = parseFloat(value || "0")
  return Number.isFinite(parsed) ? parsed : 0
}

function fmtMoney(value: string): string {
  return `${numberValue(value).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`
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
}: {
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={INPUT}
    />
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
  compact = false,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  compact?: boolean
}) {
  return (
    <label className={`flex items-center gap-2 rounded-lg border border-border/70 bg-card/40 px-2.5 text-[12px] font-semibold text-foreground ${compact ? "h-7" : "h-8"}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4"
      />
      {label}
    </label>
  )
}

function DecisionItem({
  label,
  met,
  detail,
}: {
  label: string
  met: boolean
  detail: string
}) {
  return (
    <div className="flex min-w-0 items-start gap-1.5 rounded-lg border border-border/70 bg-card/40 px-2 py-1.5">
      {met ? (
        <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-600" />
      ) : (
        <XCircle size={13} className="mt-0.5 shrink-0 text-amber-600" />
      )}
      <div className="min-w-0">
        <div className="truncate text-[10px] font-semibold text-foreground">{label}</div>
        <div className="truncate text-[9px] text-muted-foreground">{detail}</div>
      </div>
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

export default function SurgeryAuthorizationCreatePage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const hasOrigin = Boolean(form.surgery || form.surgical_request)
  const hasPaymentCoverage = Boolean(form.initial_payment_received || form.insurance_authorized)
  const approvalRequirements = [
    { label: "Origem clínica", met: hasOrigin, detail: hasOrigin ? "Cirurgia ou pedido associado" : "Escolha cirurgia ou pedido" },
    { label: "Orçamento", met: form.budget_approved, detail: form.budget_approved ? "Aprovado" : "Pendente" },
    { label: "Pagamento/seguro", met: hasPaymentCoverage, detail: hasPaymentCoverage ? "Cobertura confirmada" : "Sem confirmação" },
    { label: "Pré-operatório", met: form.preoperative_assessment_completed, detail: form.preoperative_assessment_completed ? "Concluído" : "Pendente" },
    { label: "Consentimento", met: form.consent_signed, detail: form.consent_signed ? "Assinado" : "Por assinar" },
  ]
  const missingApprovalRequirements = approvalRequirements.filter((item) => !item.met)
  const canApprove = missingApprovalRequirements.length === 0
  const needsRejectedReason = form.status === "REJECTED" && !form.rejected_reason.trim()

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const payload = {
        patient: form.patient ? Number(form.patient) : null,
        surgery: form.surgery ? Number(form.surgery) : null,
        surgical_request: form.surgical_request ? Number(form.surgical_request) : null,
        preoperative_assessment: form.preoperative_assessment ? Number(form.preoperative_assessment) : null,
        status: form.status,
        valid_until: form.valid_until || null,
        quotation_amount: form.quotation_amount || "0.00",
        approved_amount: form.approved_amount || "0.00",
        initial_payment_amount: form.initial_payment_amount || "0.00",
        budget_approved: form.budget_approved,
        initial_payment_received: form.initial_payment_received,
        insurance_authorized: form.insurance_authorized,
        special_materials_approved: form.special_materials_approved,
        room_available: form.room_available,
        team_available: form.team_available,
        preoperative_assessment_completed: form.preoperative_assessment_completed,
        consent_signed: form.consent_signed,
        rejected_reason: form.rejected_reason,
        notes: form.notes,
      }

      const created = await apiFetch<{ id?: number }>("/surgery/autorizacoes/", {
        method: "POST",
        body: JSON.stringify(payload),
      })
      setSaved(true)
      window.setTimeout(() => router.push(created?.id ? `/surgery/authorizations/${created.id}` : "/surgery/authorizations"), 500)
    } catch (err: any) {
      setError(err?.message || "Erro ao criar autorização cirúrgica.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE]}>
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[99vw] space-y-1 px-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-col gap-1.5 px-2.5 py-1.5 pl-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href="/surgery/authorizations" className="hover:text-foreground">Autorizações</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">Nova</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="font-display text-[15px] font-semibold leading-tight text-foreground">
                  Nova autorização cirúrgica
                </h1>
                <span className="rounded-full border border-violet-300/70 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300">
                  {STATUS_OPTIONS.find(([value]) => value === form.status)?.[1] || form.status}
                </span>
                <span className="rounded-full border border-blue-300/70 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
                  Aprovado {fmtMoney(form.approved_amount)}
                </span>
                <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
                  canApprove
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                    : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
                }`}>
                  {canApprove ? "Pronta para aprovar" : `${missingApprovalRequirements.length} pendências`}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1">
              {saved ? (
                <span className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <Check size={11} />
                  Criada
                </span>
              ) : null}
              <Link
                href="/surgery/authorizations"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft size={11} />
                Voltar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Guardar
              </button>
            </div>
          </div>
        </section>

        <section className={`relative overflow-visible ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-emerald-500" />
          <div className="space-y-2 px-2.5 py-2 pl-4">
            <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                  <ClipboardCheck size={12} />
                  <span>Resumo de decisão</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  A autorização deve nascer de uma cirurgia ou pedido e só deve ser aprovada quando a cobertura, avaliação e consentimento estiverem fechados.
                </p>
              </div>
              <div className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold ${
                canApprove
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                  : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
              }`}>
                {canApprove ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                {canApprove ? "Sem pendências críticas" : "Rever antes de aprovar"}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-5">
              {approvalRequirements.map((item) => (
                <DecisionItem key={item.label} label={item.label} met={item.met} detail={item.detail} />
              ))}
            </div>
            {form.status === "APPROVED" && !canApprove ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] font-semibold text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300">
                Existem pendências incompatíveis com uma aprovação final: {missingApprovalRequirements.map((item) => item.label).join(", ")}.
              </div>
            ) : null}
            {needsRejectedReason ? (
              <div className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1.5 text-[11px] font-semibold text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
                Informe o motivo de rejeição antes de guardar uma autorização rejeitada.
              </div>
            ) : null}
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
          <Card title="Origem da autorização" icon={<Scissors size={12} />} className="z-50">
            <div className="grid grid-cols-1 gap-2">
              <Field label="Cirurgia">
                <SearchableRelationSelect
                  fieldName="surgery"
                  value={form.surgery}
                  onChange={(value) => update("surgery", asId(value))}
                  target={RELATION_TARGETS.surgery}
                  placeholder="Pesquisar cirurgia..."
                />
              </Field>
              <Field label="Pedido cirúrgico">
                <SearchableRelationSelect
                  fieldName="surgical_request"
                  value={form.surgical_request}
                  onChange={(value) => update("surgical_request", asId(value))}
                  target={RELATION_TARGETS.surgical_request}
                  placeholder="Pesquisar pedido..."
                />
              </Field>
              <Field label="Avaliação pré-operatória">
                <SearchableRelationSelect
                  fieldName="preoperative_assessment"
                  value={form.preoperative_assessment}
                  onChange={(value) => update("preoperative_assessment", asId(value))}
                  target={RELATION_TARGETS.preoperative_assessment}
                  placeholder="Pesquisar avaliação..."
                />
              </Field>
              {!hasOrigin ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-[10px] font-semibold text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300">
                  Selecione pelo menos uma origem clínica para a autorização ficar rastreável.
                </div>
              ) : null}
            </div>
          </Card>

          <Card title="Paciente e validade" icon={<User size={12} />} className="z-40">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Field label="Paciente">
                  <SearchableRelationSelect
                    fieldName="patient"
                    value={form.patient}
                    onChange={(value) => update("patient", asId(value))}
                    target={RELATION_TARGETS.patient}
                    placeholder="Pesquisar paciente..."
                  />
                </Field>
              </div>
              <Field label="Estado">
                <select value={form.status} onChange={(event) => update("status", event.target.value)} className={INPUT}>
                  {STATUS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Válida até">
                <TextInput type="date" value={form.valid_until} onChange={(value) => update("valid_until", value)} />
              </Field>
            </div>
          </Card>

          <Card title="Valores" icon={<CreditCard size={12} />}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Valor orçamentado">
                <TextInput type="number" value={form.quotation_amount} onChange={(value) => update("quotation_amount", value)} />
              </Field>
              <Field label="Valor aprovado">
                <TextInput type="number" value={form.approved_amount} onChange={(value) => update("approved_amount", value)} />
              </Field>
              <Field label="Pagamento inicial">
                <TextInput type="number" value={form.initial_payment_amount} onChange={(value) => update("initial_payment_amount", value)} />
              </Field>
            </div>
          </Card>

          <Card title="Checklist de liberação" icon={<ShieldCheck size={12} />} className="md:col-span-2">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
              <ToggleRow compact label="Orçamento aprovado" checked={form.budget_approved} onChange={(value) => update("budget_approved", value)} />
              <ToggleRow compact label="Pagamento inicial recebido" checked={form.initial_payment_received} onChange={(value) => update("initial_payment_received", value)} />
              <ToggleRow compact label="Seguro autorizou" checked={form.insurance_authorized} onChange={(value) => update("insurance_authorized", value)} />
              <ToggleRow compact label="Materiais especiais aprovados" checked={form.special_materials_approved} onChange={(value) => update("special_materials_approved", value)} />
              <ToggleRow compact label="Sala disponível" checked={form.room_available} onChange={(value) => update("room_available", value)} />
              <ToggleRow compact label="Equipa disponível" checked={form.team_available} onChange={(value) => update("team_available", value)} />
              <ToggleRow compact label="Avaliação pré-op. concluída" checked={form.preoperative_assessment_completed} onChange={(value) => update("preoperative_assessment_completed", value)} />
              <ToggleRow compact label="Consentimento assinado" checked={form.consent_signed} onChange={(value) => update("consent_signed", value)} />
            </div>
          </Card>

          <Card title="Rejeição e observações" icon={<FileText size={12} />} className="md:col-span-2">
            <div className="grid grid-cols-1 gap-2">
              <Field label="Motivo de rejeição">
                <textarea
                  value={form.rejected_reason}
                  onChange={(event) => update("rejected_reason", event.target.value)}
                  rows={3}
                  className={`min-h-[64px] w-full rounded-lg border px-2.5 py-2 text-[12px] text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-1 ${
                    form.status === "REJECTED"
                      ? "border-rose-300 bg-rose-50/80 focus:border-rose-400 focus:ring-rose-200 dark:border-rose-700/40 dark:bg-rose-900/20 dark:focus:ring-rose-800"
                      : "border-border bg-card/70 focus:border-violet-400 focus:ring-violet-200 dark:focus:ring-violet-800"
                  }`}
                  placeholder={form.status === "REJECTED" ? "Descreva o motivo clínico, financeiro ou administrativo da rejeição." : "Usar apenas quando a autorização for rejeitada."}
                />
              </Field>
              <Field label="Observações">
                <textarea
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  rows={4}
                  className="min-h-[76px] w-full rounded-lg border border-border bg-card/70 px-2.5 py-2 text-[12px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-violet-400 focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
                  placeholder="Notas financeiras, operacionais ou de autorização..."
                />
              </Field>
            </div>
          </Card>
        </div>
      </form>
    </AppLayout>
  )
}
