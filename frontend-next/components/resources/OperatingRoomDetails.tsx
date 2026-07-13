"use client"

import type { ReactNode } from "react"
import { Clock3, DoorOpen, Lock, MapPin, Settings2, ShieldCheck, Sparkles, StickyNote, Users, Wrench } from "lucide-react"

import { useLanguage } from "@/hooks/useLanguage"

const STATUSES: Record<string, { label: string; labelEn: string; bar: string; dot: string; badge: string }> = {
  AVAILABLE:   { label: "Disponível",  labelEn: "Available",   bar: "bg-emerald-500", dot: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400" },
  RESERVED:    { label: "Reservada",   labelEn: "Reserved",    bar: "bg-sky-500",     dot: "bg-sky-500",     badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-400" },
  OCCUPIED:    { label: "Ocupada",     labelEn: "Occupied",    bar: "bg-amber-500",   dot: "bg-amber-500",   badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400" },
  IN_USE:      { label: "Em uso",      labelEn: "In use",      bar: "bg-orange-500",  dot: "bg-orange-500",  badge: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/30 dark:bg-orange-900/20 dark:text-orange-400" },
  CLEANING:    { label: "Em limpeza",  labelEn: "Cleaning",    bar: "bg-cyan-500",    dot: "bg-cyan-500",    badge: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-700/30 dark:bg-cyan-900/20 dark:text-cyan-400" },
  MAINTENANCE: { label: "Manutenção",  labelEn: "Maintenance", bar: "bg-violet-500",  dot: "bg-violet-500",  badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-400" },
  BLOCKED:     { label: "Bloqueada",   labelEn: "Blocked",     bar: "bg-rose-500",    dot: "bg-rose-500",    badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-400" },
  INACTIVE:    { label: "Inativa",     labelEn: "Inactive",    bar: "bg-slate-400",   dot: "bg-slate-400",   badge: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/40 dark:bg-slate-800/40 dark:text-slate-300" },
}

const ROOM_TYPES: Record<string, { label: string; labelEn: string }> = {
  GENERAL:        { label: "Geral", labelEn: "General" },
  MINOR:          { label: "Pequena cirurgia", labelEn: "Minor" },
  OPERATING_ROOM: { label: "Sala operatória", labelEn: "Operating room" },
  MAJOR:          { label: "Grande cirurgia", labelEn: "Major" },
  ENDOSCOPY:      { label: "Endoscopia", labelEn: "Endoscopy" },
  DELIVERY_OR:    { label: "Bloco de parto", labelEn: "Delivery" },
  OBSTETRIC:      { label: "Obstétrica", labelEn: "Obstetric" },
  EMERGENCY_OR:   { label: "Urgência", labelEn: "Emergency" },
  HYBRID:         { label: "Híbrida", labelEn: "Hybrid" },
  OTHER:          { label: "Outra", labelEn: "Other" },
}

function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === "") return null
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

function workingHoursEntries(value: any): [string, string][] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return []
  return Object.entries(value)
    .filter(([, hours]) => hours !== null && hours !== undefined && String(hours).trim() !== "")
    .map(([day, hours]) => [day, String(hours)])
}

export default function OperatingRoomDetails({
  data,
  actions,
}: {
  endpoint: string
  data: Record<string, any>
  actions?: ReactNode
}) {
  const { t } = useLanguage()

  const name = String(data?.name || "").trim() || t("Sala operatória", "Operating room")
  const code = String(data?.code || data?.custom_id || "").trim()
  const statusKey = String(data?.status || "").toUpperCase()
  const status = STATUSES[statusKey] || STATUSES.INACTIVE
  const type = ROOM_TYPES[String(data?.room_type || "").toUpperCase()]
  const capacity = Number(data?.capacity) || 0
  const sterile = Boolean(data?.sterile)
  const cleaningClass = String(data?.cleaning_class || "").trim()
  const location = String(data?.location || "").trim()
  const blocked = statusKey === "BLOCKED"
  const blockedReason = String(data?.blocked_reason || "").trim()
  const notes = String(data?.notes || "").trim()
  const equipmentNames: { id: number; name: string }[] = Array.isArray(data?.equipment_names) ? data.equipment_names : []
  const hours = workingHoursEntries(data?.working_hours)

  return (
    <div className="space-y-3">
      {/* Cabeçalho */}
      <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
        <span className={`absolute left-0 top-0 h-full w-1.5 ${status.bar}`} />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/20">
              <DoorOpen size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                {t("Sala operatória", "Operating room")}
              </p>
              <h2 className="truncate text-lg font-bold leading-tight text-[var(--text)]">{name}</h2>
              {code ? <p className="truncate font-mono text-[11px] text-[var(--gray-500)]">{code}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {type ? (
              <span className="rounded-full bg-teal-500/12 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                {t(type.label, type.labelEn)}
              </span>
            ) : null}
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${status.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {t(status.label, status.labelEn)}
            </span>
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/20 px-4 py-2.5 pl-5 dark:border-white/10">
            {actions}
          </div>
        ) : null}
      </section>

      {/* Bloqueio, se aplicável */}
      {blocked && blockedReason ? (
        <section className="relative overflow-hidden rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 pl-5 shadow-sm dark:border-rose-700/30 dark:bg-rose-900/15">
          <span className="absolute left-0 top-0 h-full w-1.5 bg-rose-500" />
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-400">
              <Lock size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">
                {t("Motivo do bloqueio", "Blocking reason")}
              </p>
              <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{blockedReason}</p>
            </div>
          </div>
        </section>
      ) : null}

      {/* Identificação e localização */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <MetaItem icon={<MapPin size={15} />} label={t("Localização", "Location")} value={location} />
        <MetaItem icon={<Users size={15} />} label={t("Capacidade", "Capacity")} value={capacity > 0 ? String(capacity) : ""} />
        <MetaItem
          icon={<ShieldCheck size={15} />}
          label={t("Esterilização", "Sterilization")}
          value={sterile ? t("Esterilizada", "Sterile") : t("Não esterilizada", "Not sterile")}
        />
        <MetaItem icon={<Sparkles size={15} />} label={t("Classe de limpeza", "Cleaning class")} value={cleaningClass} />
      </div>

      {/* Equipamentos */}
      <section className="rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center justify-between gap-2 border-b border-white/20 px-4 py-2.5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
              <Wrench size={15} />
            </span>
            <h3 className="text-sm font-semibold text-[var(--text)]">{t("Equipamentos disponíveis", "Available equipment")}</h3>
          </div>
          {equipmentNames.length ? (
            <span className="rounded-full border border-[var(--primary-300)]/50 bg-[var(--primary-500)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--primary-700)]">
              {equipmentNames.length}
            </span>
          ) : null}
        </div>
        <div className="px-4 py-3">
          {equipmentNames.length ? (
            <div className="flex flex-wrap gap-1.5">
              {equipmentNames.map((eq) => (
                <span
                  key={eq.id}
                  className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/20 px-2.5 py-1 text-xs font-medium text-[var(--text)] dark:border-white/10 dark:bg-white/[0.06]"
                >
                  <Settings2 size={11} className="text-[var(--gray-500)]" />
                  {eq.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--gray-500)]">
              {t("Nenhum equipamento associado a esta sala.", "No equipment linked to this room.")}
            </p>
          )}
        </div>
      </section>

      {/* Horário de funcionamento, se preenchido */}
      {hours.length ? (
        <section className="rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center gap-2 border-b border-white/20 px-4 py-2.5 dark:border-white/10">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
              <Clock3 size={15} />
            </span>
            <h3 className="text-sm font-semibold text-[var(--text)]">{t("Horário de funcionamento", "Working hours")}</h3>
          </div>
          <div className="grid gap-1.5 px-4 py-3 sm:grid-cols-2">
            {hours.map(([day, value]) => (
              <div key={day} className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-sm dark:border-white/10">
                <span className="capitalize text-[var(--gray-500)]">{day}</span>
                <span className="font-medium text-[var(--text)]">{value}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Observações */}
      {notes ? (
        <section className="rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center gap-2 border-b border-white/20 px-4 py-2.5 dark:border-white/10">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
              <StickyNote size={15} />
            </span>
            <h3 className="text-sm font-semibold text-[var(--text)]">{t("Observações", "Notes")}</h3>
          </div>
          <div className="px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">{notes}</p>
          </div>
        </section>
      ) : null}
    </div>
  )
}
