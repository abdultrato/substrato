"use client"

import Link from "next/link"
import { CalendarDays, ChevronRight, Stethoscope } from "lucide-react"

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
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  } catch {
    return String(value)
  }
}

export default function NursingPrescriptionListCard({
  row,
  href,
}: {
  row: Record<string, any>
  href?: string | null
}) {
  const { t, language } = useLanguage()
  const isPt = language !== "en"

  const patientName = String(row?.patient_name || "").trim() || (row?.patient ? `#${row.patient}` : t("Paciente", "Patient"))
  const code = String(row?.custom_id || row?.id_custom || "").trim()
  const wardName = String(row?.ward_name || "").trim()
  const description = String(row?.description || "").trim()
  const date = formatDate(row?.prescription_date, isPt)
  const isActive = Boolean(row?.active)
  const barColor = isActive ? "bg-emerald-500" : "bg-slate-400"

  const card = (
    <div className="group relative h-full overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm transition hover:border-[var(--primary-300)]/60 hover:bg-white/45 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
      <span className={`absolute left-0 top-0 h-full w-1.5 ${barColor}`} />
      <div className="flex items-start gap-3 px-4 py-3 pl-5">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
          <Stethoscope size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-bold text-[var(--text)]">{patientName}</h3>
            <ChevronRight size={16} className="shrink-0 text-[var(--gray-400)] transition group-hover:text-[var(--primary-600)]" />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                isActive
                  ? "border-emerald-300/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "border-white/30 bg-white/30 text-[var(--gray-600)] dark:border-white/10 dark:bg-white/[0.06] dark:text-[var(--gray-300)]"
              }`}
            >
              {isActive ? t("Ativa", "Active") : t("Inativa", "Inactive")}
            </span>
            {code ? (
              <span className="rounded-full border border-[var(--primary-300)]/60 bg-[var(--primary-500)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--primary-700)]">
                {code}
              </span>
            ) : null}
            {wardName ? (
              <span className="truncate text-[11px] text-[var(--gray-500)]">{wardName}</span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-relaxed text-black dark:text-white">
              {description}
            </p>
          ) : null}
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[var(--gray-500)]">
            <CalendarDays size={12} /> {date}
          </div>
        </div>
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
