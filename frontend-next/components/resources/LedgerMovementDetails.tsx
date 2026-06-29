"use client"

import type { ReactNode } from "react"
import { BookOpenCheck, Landmark, Scale } from "lucide-react"

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

export default function LedgerMovementDetails({
  data,
  actions,
}: {
  endpoint: string
  data: Record<string, any>
  actions?: ReactNode
}) {
  const { t } = useLanguage()

  const account = String(data?.account_name || "").trim() || (data?.account ? `#${data.account}` : "-")
  const entryCode = String(data?.entry_code || "").trim() || (data?.entry ? `#${data.entry}` : "-")
  const code = String(data?.custom_id || data?.id_custom || "").trim()
  const debit = Number(data?.debit || 0)
  const credit = Number(data?.credit || 0)
  const isDebit = debit > 0

  return (
    <div className="space-y-3">
      <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
        <span className={`absolute left-0 top-0 h-full w-1.5 ${isDebit ? "bg-sky-500" : "bg-emerald-500"}`} />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-600 shadow-sm dark:bg-white/10 dark:text-white">
              <Scale size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                {t("Movimento contabilístico", "Ledger movement")}
              </p>
              <h2 className="truncate text-lg font-bold leading-tight text-[var(--text)]">{account}</h2>
            </div>
          </div>
          {code ? (
            <span className="rounded-full border border-[var(--primary-300)]/60 bg-[var(--primary-500)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--primary-700)] backdrop-blur-sm">
              {code}
            </span>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/20 px-4 py-2.5 pl-5 dark:border-white/10">
            {actions}
          </div>
        ) : null}
      </section>

      {/* Débito / Crédito */}
      <div className="grid gap-2 sm:grid-cols-2">
        <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 px-4 py-3 pl-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <span className="absolute left-0 top-0 h-full w-1.5 bg-sky-500" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">{t("Débito", "Debit")}</p>
          <p className="text-lg font-bold text-black dark:text-white"><MoneyValue value={data?.debit} /></p>
        </section>
        <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 px-4 py-3 pl-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <span className="absolute left-0 top-0 h-full w-1.5 bg-emerald-500" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">{t("Crédito", "Credit")}</p>
          <p className="text-lg font-bold text-black dark:text-white"><MoneyValue value={data?.credit} /></p>
        </section>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <MetaItem icon={<Landmark size={15} />} label={t("Conta contábil", "Account")} value={account} />
        <MetaItem icon={<BookOpenCheck size={15} />} label={t("Lançamento", "Entry")} value={entryCode} />
      </div>
    </div>
  )
}
