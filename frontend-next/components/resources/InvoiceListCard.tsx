"use client"

import Link from "next/link"
import { CalendarDays, ChevronRight, Receipt } from "lucide-react"

import { useLanguage } from "@/hooks/useLanguage"
import { invoiceStatusMeta } from "@/lib/billingStatus"

const ORIGIN_LABELS: Record<string, string> = {
  CLI: "Clínica",
  FAR: "Farmácia",
  ENF: "Enfermagem",
  CON: "Consulta",
  CIR: "Cirurgia",
  MIX: "Misto",
}

function formatMoney(value: any): string {
  const n = typeof value === "string" ? parseFloat(value) : Number(value)
  if (!Number.isFinite(n)) return "—"
  return n.toLocaleString("pt-PT", { style: "currency", currency: "MZN" })
}

function formatDate(value: any, isPt: boolean): string {
  if (!value) return "-"
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  try {
    return new Intl.DateTimeFormat(isPt ? "pt-PT" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date)
  } catch {
    return String(value)
  }
}

export default function InvoiceListCard({
  row,
  href,
}: {
  row: Record<string, any>
  href?: string | null
}) {
  const { t, language } = useLanguage()
  const isPt = language !== "en"

  const code = String(row?.custom_id || row?.id_custom || row?.id || "").trim()
  const title = code ? `#${code}` : t("Fatura", "Invoice")
  const status = String(row?.status || "").toUpperCase()
  const meta = invoiceStatusMeta(status)
  const origin = String(row?.origin || "").toUpperCase()
  const originLabel = ORIGIN_LABELS[origin]
  const total = formatMoney(row?.total ?? row?.total_a_pagar)
  const date = formatDate(row?.created_at, isPt)

  const card = (
    <div className="group relative h-full overflow-hidden rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 pl-2.5 shadow-sm backdrop-blur-sm transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
      <span className={`absolute left-0 top-0 h-full w-1 ${meta?.accent || "bg-slate-400"}`} />
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${meta ? meta.badge : "bg-[var(--primary-500)]/15 text-[var(--primary-700)]"}`}>
          <Receipt size={11} />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[11px] font-bold text-black dark:text-white">{title}</h3>
        <ChevronRight size={13} className="shrink-0 text-[var(--gray-400)] transition group-hover:text-[var(--primary-600)]" />
      </div>
      <div className="mt-1 flex items-center justify-between gap-1 pl-0.5">
        <div className="flex min-w-0 items-center gap-1">
          {meta ? (
            <span className={`shrink-0 rounded border px-1 py-px text-[9px] font-semibold ${meta.badge}`}>{meta.label}</span>
          ) : null}
          {originLabel ? (
            <span className="truncate text-[9px] font-semibold text-[var(--gray-500)]">{originLabel}</span>
          ) : null}
        </div>
        <span className="shrink-0 text-[10px] font-bold text-[var(--gray-700)] dark:text-[var(--gray-300)]">{total}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1 pl-0.5">
        <CalendarDays size={11} className="text-[var(--gray-400)]" />
        <span className="text-[10px] text-[var(--gray-500)]">{date}</span>
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
