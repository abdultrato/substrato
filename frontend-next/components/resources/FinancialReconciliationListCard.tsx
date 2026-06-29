"use client"

import Link from "next/link"
import { CheckCircle2, ChevronRight, Scale } from "lucide-react"

import MoneyValue from "@/components/ui/MoneyValue"
import { useLanguage } from "@/hooks/useLanguage"

export default function FinancialReconciliationListCard({
  row,
  href,
}: {
  row: Record<string, any>
  href?: string | null
}) {
  const { t } = useLanguage()

  const invoice = String(row?.invoice_code || "").trim() || (row?.invoice ? `#${row.invoice}` : t("Fatura", "Invoice"))
  const code = String(row?.custom_id || row?.id_custom || "").trim()
  const reconciled = row?.reconciled === true
  const discrepancy = Number(row?.discrepancy || 0)
  const hasDiff = Math.abs(discrepancy) > 0.0001

  const card = (
    <div className="group relative h-full overflow-hidden rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 pl-2.5 shadow-sm backdrop-blur-sm transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
      <span className={`absolute left-0 top-0 h-full w-1 ${reconciled ? "bg-emerald-500" : "bg-amber-500"}`} />
      <div className="flex items-center gap-1.5">
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
          {reconciled ? <CheckCircle2 size={11} /> : <Scale size={11} />}
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[11px] font-bold text-black dark:text-white">{invoice}</h3>
        <ChevronRight size={13} className="shrink-0 text-[var(--gray-400)] transition group-hover:text-[var(--primary-600)]" />
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-1 pl-0.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-black dark:text-white">
          <MoneyValue value={row?.received_amount} />
        </span>
        {hasDiff ? (
          <span className="truncate text-[9px] font-semibold text-rose-600 dark:text-rose-400">
            Δ <MoneyValue value={row?.discrepancy} />
          </span>
        ) : code ? (
          <span className="truncate text-[9px] font-semibold text-[var(--gray-500)]">{code}</span>
        ) : null}
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
