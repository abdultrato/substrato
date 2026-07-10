"use client"

import type { ReactNode } from "react"
import { useMemo } from "react"
import { CalendarDays, Receipt, User } from "lucide-react"

import MoneyValue from "@/components/ui/MoneyValue"
import { useLanguage } from "@/hooks/useLanguage"
import { useRelationLabels } from "@/hooks/useRelationLabels"

const STATUS_META: Record<string, { label: string; accent: string; badge: string }> = {
  RASC: { label: "Rascunho", accent: "bg-slate-400", badge: "border-slate-300/50 bg-slate-500/15 text-slate-600 dark:text-slate-300" },
  EMIT: { label: "Emitida", accent: "bg-sky-500", badge: "border-sky-300/50 bg-sky-500/15 text-sky-700 dark:text-sky-400" },
  PAGA: { label: "Paga", accent: "bg-emerald-500", badge: "border-emerald-300/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  CANC: { label: "Cancelada", accent: "bg-rose-500", badge: "border-rose-300/50 bg-rose-500/15 text-rose-600 dark:text-rose-400" },
}

const ORIGIN_LABELS: Record<string, string> = {
  CLI: "Clínica",
  FAR: "Farmácia",
  ENF: "Enfermagem",
  CON: "Consulta",
  CIR: "Cirurgia",
  MIX: "Misto",
}

function formatDateTime(value: any, isPt: boolean): string {
  if (!value) return "-"
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  try {
    return new Intl.DateTimeFormat(isPt ? "pt-PT" : "en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  } catch {
    return String(value)
  }
}

function AmountTile({ label, value, accent, large }: { label: string; value: any; accent: string; large?: boolean }) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 px-4 py-3 pl-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
      <span className={`absolute left-0 top-0 h-full w-1.5 ${accent}`} />
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">{label}</p>
      <p className={`${large ? "text-xl" : "text-base"} font-bold text-black dark:text-white`}>
        <MoneyValue value={value} currency="MZN" />
      </p>
    </section>
  )
}

function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">{label}</p>
        <p className="truncate text-sm font-medium text-[var(--text)]">{value || "-"}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="border-b border-white/20 px-4 py-2.5 dark:border-white/10">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export default function InvoiceDetails({
  endpoint,
  data,
  actions,
}: {
  endpoint: string
  data: Record<string, any>
  actions?: ReactNode
}) {
  const { t, language } = useLanguage()
  const isPt = language !== "en"

  const code = String(data?.custom_id || data?.id_custom || data?.id || "").trim()
  const title = code ? `#${code}` : t("Fatura", "Invoice")
  const status = String(data?.status || "").toUpperCase()
  const meta = STATUS_META[status]
  const origin = String(data?.origin || "").toUpperCase()
  const originLabel = ORIGIN_LABELS[origin] || origin

  const { resolve } = useRelationLabels(endpoint, useMemo(() => [data], [data]))
  const patientLabel = resolve("patient", data?.patient, (v) => (v ? `#${v}` : "-"))

  return (
    <div className="space-y-3">
      {/* Cabeçalho */}
      <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
        <span className={`absolute left-0 top-0 h-full w-1.5 ${meta?.accent || "bg-slate-400"}`} />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-600 shadow-sm dark:bg-white/10 dark:text-white">
              <Receipt size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                {t("Fatura", "Invoice")}
              </p>
              <h2 className="truncate text-lg font-bold leading-tight text-[var(--text)]">{title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {meta ? (
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${meta.badge}`}>
                {meta.label}
              </span>
            ) : null}
            {originLabel ? (
              <span className="rounded-full border border-[var(--primary-300)]/60 bg-[var(--primary-500)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--primary-700)] backdrop-blur-sm">
                {originLabel}
              </span>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/20 px-4 py-2.5 pl-5 dark:border-white/10">
            {actions}
          </div>
        ) : null}
      </section>

      {/* Resumo financeiro */}
      <SectionCard title={t("Resumo financeiro", "Financial summary")}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <AmountTile label={t("Subtotal", "Subtotal")} value={data?.subtotal} accent="bg-slate-400" />
          <AmountTile label={t("IVA", "VAT")} value={data?.vat_amount} accent="bg-amber-500" />
          <AmountTile label={t("Desconto seguro", "Insurance amount")} value={data?.insurance_amount} accent="bg-sky-500" />
          <AmountTile label={t("A cargo do paciente", "Patient amount")} value={data?.patient_amount} accent="bg-violet-500" />
          <AmountTile label={t("Total a pagar", "Total due")} value={data?.total_a_pagar ?? data?.total} accent="bg-emerald-500" large />
        </div>
      </SectionCard>

      {/* Identificação e vínculos */}
      <SectionCard title={t("Identificação", "Identification")}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <MetaItem icon={<User size={15} />} label={t("Paciente", "Patient")} value={patientLabel} />
          <MetaItem icon={<CalendarDays size={15} />} label={t("Criada em", "Created at")} value={formatDateTime(data?.created_at, isPt)} />
          <MetaItem icon={<Receipt size={15} />} label={t("Criada por", "Created by")} value={String(data?.created_by_name || "-")} />
        </div>
      </SectionCard>
    </div>
  )
}
