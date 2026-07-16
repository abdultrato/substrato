import React from "react"
import Link from "next/link"
import { useLanguage } from "@/hooks/useLanguage"

export default function MetricCard({
  label,
  value,
  hint,
  accentClass,
  icon,
  iconClass,
  href,
  dense,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  accentClass?: string
  /** Ícone opcional exibido num chip colorido. */
  icon?: any
  /** Classe de cor do chip do ícone (ex.: "bg-sky-500/15 text-sky-600"). */
  iconClass?: string
  /** Quando definido, o cartão vira um link clicável para o recurso correspondente. */
  href?: string
  /** Versão compacta (menor padding e valor). */
  dense?: boolean
}) {
  const { tr } = useLanguage()
  const Icon = icon as any

  const pad = dense ? "px-2.5 py-1.5" : "px-3 py-2.5"
  const base = `relative block overflow-hidden rounded-xl border-t border-r border-b border-white/20 border-l-4 bg-white/30 ${pad} shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-t-white/10 dark:border-r-white/10 dark:border-b-white/10 ${accentClass ?? "border-l-border/70"}`
  const interactive = href
    ? "group cursor-pointer transition hover:border-[var(--primary-300)]/60 hover:bg-white/45 dark:hover:bg-white/[0.08]"
    : ""

  const content = (
    <div className={`flex items-center ${dense ? "gap-2" : "gap-2.5"}`}>
      {Icon ? (
        <span className={`flex ${dense ? "h-7 w-7" : "h-8 w-8"} shrink-0 items-center justify-center rounded-lg ${iconClass ?? "bg-muted text-muted-foreground"}`}>
          <Icon size={dense ? 15 : 16} strokeWidth={2} />
        </span>
      ) : null}
      <div className="min-w-0">
        <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {tr(label)}
        </div>
        <div className={`font-display ${dense ? "text-base" : "text-xl"} font-bold leading-tight text-foreground tabular-nums`}>
          {value}
        </div>
        {hint ? (
          <div className="mt-0.5 text-[10px] text-muted-foreground">{tr(hint)}</div>
        ) : null}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className={`${base} ${interactive}`}>
        {content}
      </Link>
    )
  }

  return <div className={base}>{content}</div>
}
