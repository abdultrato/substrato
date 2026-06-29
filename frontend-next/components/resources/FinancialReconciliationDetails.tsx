"use client"

import type { ReactNode } from "react"
import { CheckCircle2, FileText, Hash, Scale } from "lucide-react"

import MoneyValue from "@/components/ui/MoneyValue"
import { useLanguage } from "@/hooks/useLanguage"

function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  if (!value || value === "-") return null
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">{label}</p>
        <p className="truncate text-sm font-medium text-[var(--text)]">{value}</p>
      </div>
    </div>
  )
}

export default function FinancialReconciliationDetails({
  data,
  actions,
}: {
  endpoint: string
  data: Record<string, any>
  actions?: ReactNode
}) {
  const { t } = useLanguage()

  const invoice = String(data?.invoice_code || "").trim() || (data?.invoice ? `#${data.invoice}` : "-")
  const code = String(data?.custom_id || data?.id_custom || "").trim()
  const reconciled = data?.reconciled === true
  const discrepancy = Number(data?.discrepancy || 0)
  const hasDiff = Math.abs(discrepancy) > 0.0001

  return (
    <div className="space-y-3">
      <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
        <span className={`absolute left-0 top-0 h-full w-1.5 ${reconciled ? "bg-emerald-500" : "bg-amber-500"}`} />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-600 shadow-sm dark:bg-white/10 dark:text-white">
              <Scale size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                {t("Conciliação financeira", "Financial reconciliation")}
              </p>
              <h2 className="truncate text-lg font-bold leading-tight text-[var(--text)]">{invoice}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${
                reconciled
                  ? "border-emerald-300/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-300/50 bg-amber-500/15 text-amber-700 dark:text-amber-400"
              }`}
            >
              {reconciled ? t("Conciliado", "Reconciled") : t("Pendente", "Pending")}
            </span>
            {code ? (
              <span className="rounded-full border border-[var(--primary-300)]/60 bg-[var(--primary-500)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--primary-700)] backdrop-blur-sm">
                {code}
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

      <div className="grid gap-2 sm:grid-cols-3">
        <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 px-4 py-3 pl-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <span className="absolute left-0 top-0 h-full w-1.5 bg-sky-500" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">{t("Valor contabilístico", "Accounting value")}</p>
          <p className="text-lg font-bold text-black dark:text-white"><MoneyValue value={data?.accounting_value} /></p>
        </section>
        <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 px-4 py-3 pl-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <span className="absolute left-0 top-0 h-full w-1.5 bg-emerald-500" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">{t("Valor recebido", "Received amount")}</p>
          <p className="text-lg font-bold text-black dark:text-white"><MoneyValue value={data?.received_amount} /></p>
        </section>
        <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 px-4 py-3 pl-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <span className={`absolute left-0 top-0 h-full w-1.5 ${hasDiff ? "bg-rose-500" : "bg-slate-400"}`} />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">{t("Discrepância", "Discrepancy")}</p>
          <p className={`text-lg font-bold ${hasDiff ? "text-rose-600 dark:text-rose-400" : "text-black dark:text-white"}`}><MoneyValue value={data?.discrepancy} /></p>
        </section>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <MetaItem icon={<FileText size={15} />} label={t("Fatura", "Invoice")} value={invoice} />
        <MetaItem icon={<Hash size={15} />} label={t("Referência externa", "External reference")} value={String(data?.external_reference || "")} />
      </div>
    </div>
  )
}
