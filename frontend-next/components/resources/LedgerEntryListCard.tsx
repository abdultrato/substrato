"use client"

import Link from "next/link"
import { BookOpenCheck, CalendarDays, ChevronRight } from "lucide-react"

import { useLanguage } from "@/hooks/useLanguage"

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

export default function LedgerEntryListCard({
  row,
  href,
}: {
  row: Record<string, any>
  href?: string | null
}) {
  const { t, language } = useLanguage()
  const isPt = language !== "en"

  const code = String(row?.custom_id || row?.id_custom || row?.id || "").trim()
  const title = String(row?.name || "").trim() || String(row?.external_reference || "").trim() || (code ? `#${code}` : t("Lançamento", "Entry"))
  const date = formatDate(row?.date || row?.created_at, isPt)
  const confirmed = row?.confirmed === true

  const card = (
    <div className="group relative h-full overflow-hidden rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 pl-2.5 shadow-sm backdrop-blur-sm transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
      <span className={`absolute left-0 top-0 h-full w-1 ${confirmed ? "bg-emerald-500" : "bg-amber-500"}`} />
      <div className="flex items-center gap-1.5">
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
          <BookOpenCheck size={11} />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[11px] font-bold text-black dark:text-white">{title}</h3>
        <ChevronRight size={13} className="shrink-0 text-[var(--gray-400)] transition group-hover:text-[var(--primary-600)]" />
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-1 pl-0.5">
        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--gray-500)]"><CalendarDays size={11} /> {date}</span>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${confirmed ? "bg-emerald-500" : "bg-amber-500"}`} title={confirmed ? t("Confirmado", "Posted") : t("Rascunho", "Draft")} />
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
