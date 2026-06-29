"use client"

import Link from "next/link"
import { ChevronRight, Landmark } from "lucide-react"

import { useLanguage } from "@/hooks/useLanguage"

const TYPE_META: Record<string, { label: string; accent: string; badge: string }> = {
  ATI: { label: "Ativo", accent: "bg-emerald-500", badge: "border-emerald-300/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  PAS: { label: "Passivo", accent: "bg-rose-500", badge: "border-rose-300/50 bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  REC: { label: "Receita", accent: "bg-sky-500", badge: "border-sky-300/50 bg-sky-500/15 text-sky-700 dark:text-sky-400" },
  DES: { label: "Despesa", accent: "bg-amber-500", badge: "border-amber-300/50 bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  PAT: { label: "Patrimônio", accent: "bg-violet-500", badge: "border-violet-300/50 bg-violet-500/15 text-violet-700 dark:text-violet-400" },
}

export default function AccountListCard({
  row,
  href,
}: {
  row: Record<string, any>
  href?: string | null
}) {
  const { t } = useLanguage()

  const name = String(row?.name || row?.nome || "").trim() || t("Conta", "Account")
  const code = String(row?.custom_id || row?.id_custom || row?.id || "").trim()
  const type = String(row?.type || row?.tipo || "").toUpperCase()
  const meta = TYPE_META[type]

  const card = (
    <div className="group relative h-full overflow-hidden rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 pl-2.5 shadow-sm backdrop-blur-sm transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
      <span className={`absolute left-0 top-0 h-full w-1 ${meta?.accent || "bg-slate-400"}`} />
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${meta ? meta.badge : "bg-[var(--primary-500)]/15 text-[var(--primary-700)]"}`}>
          <Landmark size={11} />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[11px] font-bold text-black dark:text-white">{name}</h3>
        <ChevronRight size={13} className="shrink-0 text-[var(--gray-400)] transition group-hover:text-[var(--primary-600)]" />
      </div>
      <div className="mt-1 flex items-center gap-1 pl-0.5">
        {meta ? (
          <span className={`rounded border px-1 py-px text-[9px] font-semibold ${meta.badge}`}>{meta.label}</span>
        ) : null}
        {code ? (
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
