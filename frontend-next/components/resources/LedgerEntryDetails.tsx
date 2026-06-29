"use client"

import type { ReactNode } from "react"
import { BookOpenCheck, CalendarDays, ClipboardList, Hash } from "lucide-react"

import { useLanguage } from "@/hooks/useLanguage"

function formatDate(value: any, isPt: boolean): string {
  if (!value) return "-"
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  try {
    return new Intl.DateTimeFormat(isPt ? "pt-PT" : "en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date)
  } catch {
    return String(value)
  }
}

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

export default function LedgerEntryDetails({
  data,
  actions,
}: {
  endpoint: string
  data: Record<string, any>
  actions?: ReactNode
}) {
  const { t, language } = useLanguage()
  const isPt = language !== "en"

  const code = String(data?.custom_id || data?.id_custom || "").trim()
  const title = String(data?.name || "").trim() || String(data?.external_reference || "").trim() || (code ? code : t("Lançamento", "Entry"))
  const description = String(data?.description || "").trim()
  const confirmed = data?.confirmed === true

  return (
    <div className="space-y-3">
      <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
        <span className={`absolute left-0 top-0 h-full w-1.5 ${confirmed ? "bg-emerald-500" : "bg-amber-500"}`} />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-600 shadow-sm dark:bg-white/10 dark:text-white">
              <BookOpenCheck size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                {t("Lançamento contabilístico", "Ledger entry")}
              </p>
              <h2 className="truncate text-lg font-bold leading-tight text-[var(--text)]">{title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${
                confirmed
                  ? "border-emerald-300/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-300/50 bg-amber-500/15 text-amber-700 dark:text-amber-400"
              }`}
            >
              {confirmed ? t("Confirmado", "Posted") : t("Rascunho", "Draft")}
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

      <div className="grid gap-2 sm:grid-cols-2">
        <MetaItem icon={<CalendarDays size={15} />} label={t("Data da transação", "Transaction date")} value={formatDate(data?.date, isPt)} />
        <MetaItem icon={<Hash size={15} />} label={t("Referência externa", "External reference")} value={String(data?.external_reference || "")} />
      </div>

      <section className="rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center gap-2 border-b border-white/20 px-4 py-2.5 dark:border-white/10">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
            <ClipboardList size={15} />
          </span>
          <h3 className="text-sm font-semibold text-[var(--text)]">{t("Descrição", "Description")}</h3>
        </div>
        <div className="px-4 py-3">
          {description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-black dark:text-white">{description}</p>
          ) : (
            <p className="text-sm italic text-[var(--gray-500)]">{t("Sem descrição.", "No description.")}</p>
          )}
        </div>
      </section>
    </div>
  )
}
