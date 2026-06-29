"use client"

import type { ReactNode } from "react"
import { CalendarDays, Hash, Landmark, Tag } from "lucide-react"

import { useLanguage } from "@/hooks/useLanguage"

const TYPE_META: Record<string, { label: string; accent: string; badge: string }> = {
  ATI: { label: "Ativo", accent: "bg-emerald-500", badge: "border-emerald-300/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  PAS: { label: "Passivo", accent: "bg-rose-500", badge: "border-rose-300/50 bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  REC: { label: "Receita", accent: "bg-sky-500", badge: "border-sky-300/50 bg-sky-500/15 text-sky-700 dark:text-sky-400" },
  DES: { label: "Despesa", accent: "bg-amber-500", badge: "border-amber-300/50 bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  PAT: { label: "Patrimônio", accent: "bg-violet-500", badge: "border-violet-300/50 bg-violet-500/15 text-violet-700 dark:text-violet-400" },
}

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

function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
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

export default function AccountDetails({
  data,
  actions,
}: {
  endpoint: string
  data: Record<string, any>
  actions?: ReactNode
}) {
  const { t, language } = useLanguage()
  const isPt = language !== "en"

  const name = String(data?.name || data?.nome || "").trim() || t("Conta", "Account")
  const code = String(data?.custom_id || data?.id_custom || data?.id || "").trim()
  const type = String(data?.type || data?.tipo || "").toUpperCase()
  const meta = TYPE_META[type]
  const description = String(data?.description || data?.descricao || "").trim()

  return (
    <div className="space-y-3">
      {/* Cabeçalho */}
      <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
        <span className={`absolute left-0 top-0 h-full w-1.5 ${meta?.accent || "bg-slate-400"}`} />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-600 shadow-sm dark:bg-white/10 dark:text-white">
              <Landmark size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                {t("Conta contábil", "Account")}
              </p>
              <h2 className="truncate text-lg font-bold leading-tight text-[var(--text)]">{name}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {meta ? (
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${meta.badge}`}>
                {meta.label}
              </span>
            ) : null}
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

      {/* Metadados */}
      <div className="grid gap-2 sm:grid-cols-3">
        <MetaItem icon={<Tag size={15} />} label={t("Tipo", "Type")} value={meta?.label || type || "-"} />
        <MetaItem icon={<Hash size={15} />} label={t("Código", "Code")} value={code} />
        <MetaItem icon={<CalendarDays size={15} />} label={t("Criada em", "Created at")} value={formatDateTime(data?.created_at, isPt)} />
      </div>

      {description ? (
        <section className="rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center gap-2 border-b border-white/20 px-4 py-2.5 dark:border-white/10">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
              <Tag size={15} />
            </span>
            <h3 className="text-sm font-semibold text-[var(--text)]">{t("Descrição", "Description")}</h3>
          </div>
          <div className="px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-black dark:text-white">{description}</p>
          </div>
        </section>
      ) : null}
    </div>
  )
}
