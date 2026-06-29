"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { Activity, CalendarDays, ChevronRight, Droplet, Gauge, HeartPulse, Thermometer, Wind } from "lucide-react"

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

function hasValue(value: any): boolean {
  return value !== null && value !== undefined && String(value).trim() !== ""
}

function Metric({ icon, value, unit }: { icon: ReactNode; value: any; unit?: string }) {
  if (!hasValue(value)) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/25 bg-white/30 px-1.5 py-0.5 text-[11px] font-semibold text-black dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
      {icon}
      {String(value)}
      {unit ? <span className="text-[9px] font-medium text-[var(--gray-500)]">{unit}</span> : null}
    </span>
  )
}

export default function NursingVitalSignListCard({
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
  const date = formatDate(row?.collected_at, isPt)

  const card = (
    <div className="group relative h-full overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm transition hover:border-[var(--primary-300)]/60 hover:bg-white/45 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
      <span className="absolute left-0 top-0 h-full w-1.5 bg-rose-500" />
      <div className="flex items-start gap-3 px-4 py-3 pl-5">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
          <Activity size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-bold text-[var(--text)]">{patientName}</h3>
            <ChevronRight size={16} className="shrink-0 text-[var(--gray-400)] transition group-hover:text-[var(--primary-600)]" />
          </div>
          {code ? (
            <span className="mt-1 inline-block rounded-full border border-[var(--primary-300)]/60 bg-[var(--primary-500)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--primary-700)]">
              {code}
            </span>
          ) : null}
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Metric icon={<Thermometer size={11} />} value={row?.temperature_c} unit="°C" />
            <Metric icon={<Gauge size={11} />} value={row?.blood_pressure} unit="mmHg" />
            <Metric icon={<HeartPulse size={11} />} value={row?.heart_rate} unit="bpm" />
            <Metric icon={<Wind size={11} />} value={row?.respiratory_rate} unit="rpm" />
            <Metric icon={<Droplet size={11} />} value={row?.oxygen_saturation} unit="%" />
          </div>
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
