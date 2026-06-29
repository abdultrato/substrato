"use client"

import type { ReactNode } from "react"
import { Activity, CalendarDays, Droplet, FileText, Gauge, HeartPulse, Thermometer, User, Wind } from "lucide-react"

import { useLanguage } from "@/hooks/useLanguage"

function formatDateTime(value: any, isPt: boolean): string {
  if (!value) return "-"
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  try {
    return new Intl.DateTimeFormat(isPt ? "pt-PT" : "en-GB", {
      day: "2-digit",
      month: "long",
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

function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-white/20 bg-white/25 px-3 py-2.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">{label}</p>
        <p className="truncate text-sm font-medium text-[var(--text)]">{value || "-"}</p>
      </div>
    </div>
  )
}

function VitalStat({
  icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: ReactNode
  label: string
  value: any
  unit?: string
  accent: string
}) {
  const filled = hasValue(value)
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-3 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
      <span className={`absolute left-0 top-0 h-full w-1.5 ${accent}`} />
      <div className="flex items-center gap-1.5 pl-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 pl-1.5 text-lg font-bold leading-tight text-black dark:text-white">
        {filled ? String(value) : "—"}
        {filled && unit ? <span className="ml-1 text-xs font-medium text-[var(--gray-500)]">{unit}</span> : null}
      </p>
    </div>
  )
}

export default function NursingVitalSignDetails({
  data,
  actions,
}: {
  endpoint: string
  data: Record<string, any>
  actions?: ReactNode
}) {
  const { t, language } = useLanguage()
  const isPt = language !== "en"

  const patientName = String(data?.patient_name || "").trim() || (data?.patient ? `#${data.patient}` : "-")
  const recordRef = data?.record ? `#${data.record}` : "-"
  const code = String(data?.custom_id || data?.id_custom || "").trim()
  const collectedAt = formatDateTime(data?.collected_at, isPt)

  return (
    <div className="space-y-3">
      {/* Cartão de cabeçalho */}
      <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
        <span className="absolute left-0 top-0 h-full w-1 bg-[var(--primary-500)]" />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-600 shadow-sm dark:bg-white/10 dark:text-white">
              <Activity size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                {t("Sinais vitais", "Vital signs")}
              </p>
              <h2 className="truncate text-lg font-bold leading-tight text-[var(--text)]">{patientName}</h2>
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

      {/* Metadados */}
      <div className="grid gap-2 sm:grid-cols-3">
        <MetaItem icon={<User size={15} />} label={t("Paciente", "Patient")} value={patientName} />
        <MetaItem icon={<FileText size={15} />} label={t("Registo de enfermagem", "Nursing record")} value={recordRef} />
        <MetaItem icon={<CalendarDays size={15} />} label={t("Coletado em", "Collected at")} value={collectedAt} />
      </div>

      {/* Medições */}
      <section className="rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center gap-2 border-b border-white/20 px-4 py-2.5 dark:border-white/10">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
            <Activity size={15} />
          </span>
          <h3 className="text-sm font-semibold text-[var(--text)]">{t("Medições", "Measurements")}</h3>
        </div>
        <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
          <VitalStat icon={<Thermometer size={12} />} label={t("Temperatura", "Temperature")} value={data?.temperature_c} unit="°C" accent="bg-orange-500" />
          <VitalStat icon={<Gauge size={12} />} label={t("Pressão arterial", "Blood pressure")} value={data?.blood_pressure} unit="mmHg" accent="bg-rose-500" />
          <VitalStat icon={<HeartPulse size={12} />} label={t("Freq. cardíaca", "Heart rate")} value={data?.heart_rate} unit="bpm" accent="bg-red-500" />
          <VitalStat icon={<Wind size={12} />} label={t("Freq. respiratória", "Respiratory rate")} value={data?.respiratory_rate} unit="rpm" accent="bg-sky-500" />
          <VitalStat icon={<Droplet size={12} />} label={t("Saturação O₂", "O₂ saturation")} value={data?.oxygen_saturation} unit="%" accent="bg-cyan-500" />
        </div>
      </section>
    </div>
  )
}
