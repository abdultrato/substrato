"use client"

import Link from "next/link"
import { ChevronRight, Scale } from "lucide-react"

import MoneyValue from "@/components/ui/MoneyValue"
import { useLanguage } from "@/hooks/useLanguage"

export default function LedgerMovementListCard({
  row,
  href,
}: {
  row: Record<string, any>
  href?: string | null
}) {
  const { t } = useLanguage()

  const account = String(row?.account_name || "").trim() || (row?.account ? `#${row.account}` : t("Conta", "Account"))
  const debit = Number(row?.debit || 0)
  const credit = Number(row?.credit || 0)
  const isDebit = debit > 0
  const value = isDebit ? row?.debit : credit > 0 ? row?.credit : row?.debit
  const entryCode = String(row?.entry_code || "").trim()

  const card = (
    <div className="group relative h-full overflow-hidden rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 pl-2.5 shadow-sm backdrop-blur-sm transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
      <span className={`absolute left-0 top-0 h-full w-1 ${isDebit ? "bg-sky-500" : "bg-emerald-500"}`} />
      <div className="flex items-center gap-1.5">
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
          <Scale size={11} />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[11px] font-bold text-black dark:text-white">{account}</h3>
        <ChevronRight size={13} className="shrink-0 text-[var(--gray-400)] transition group-hover:text-[var(--primary-600)]" />
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-1 pl-0.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-black dark:text-white">
          <span className={`rounded px-1 text-[8px] font-bold ${isDebit ? "bg-sky-500/20 text-sky-700 dark:text-sky-300" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"}`}>
            {isDebit ? "D" : "C"}
          </span>
          <MoneyValue value={value} />
        </span>
        {entryCode ? <span className="truncate text-[9px] font-semibold text-[var(--gray-500)]">{entryCode}</span> : null}
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
