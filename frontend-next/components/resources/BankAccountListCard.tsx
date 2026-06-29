"use client"

import Link from "next/link"
import { Building2, ChevronRight, Wallet } from "lucide-react"

import MoneyValue from "@/components/ui/MoneyValue"
import { useLanguage } from "@/hooks/useLanguage"

export default function BankAccountListCard({
  row,
  href,
}: {
  row: Record<string, any>
  href?: string | null
}) {
  const { t } = useLanguage()

  const bank = String(row?.bank_name || "").trim() || t("Conta bancária", "Bank account")
  const number = String(row?.account_number || row?.iban || "").trim()
  const isActive = row?.active !== false
  const currency = String(row?.currency || "").trim()

  const card = (
    <div className="group relative h-full overflow-hidden rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 pl-2.5 shadow-sm backdrop-blur-sm transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
      <span className={`absolute left-0 top-0 h-full w-1 ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
      <div className="flex items-center gap-1.5">
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
          <Building2 size={11} />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[11px] font-bold text-black dark:text-white">{bank}</h3>
        <ChevronRight size={13} className="shrink-0 text-[var(--gray-400)] transition group-hover:text-[var(--primary-600)]" />
      </div>
      {number ? <p className="mt-0.5 truncate pl-0.5 text-[10px] font-medium text-[var(--gray-600)] dark:text-[var(--gray-300)]">{number}</p> : null}
      <div className="mt-0.5 flex items-center justify-between gap-1 pl-0.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-black dark:text-white">
          <Wallet size={11} className="text-[var(--gray-500)]" />
          <MoneyValue value={row?.current_balance} />
          {currency ? <span className="text-[9px] font-medium text-[var(--gray-500)]">{currency}</span> : null}
        </span>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} title={isActive ? t("Ativa", "Active") : t("Inativa", "Inactive")} />
      </div>
    </div>
  )

  if (!href) return card
  return (
    <Link href={href} className="block h-full">
      {card}
    </Link>
  )
}
