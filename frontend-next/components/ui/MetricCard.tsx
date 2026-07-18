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
  inlineNowrap,
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
  /** Mostra rótulo e valor na mesma linha, sem quebra. */
  inlineNowrap?: boolean
}) {
  const { tr } = useLanguage()
  const Icon = icon as any

  const pad = dense ? "px-1.5 py-0.5" : "px-3 py-2.5"
  const nowrapBase = inlineNowrap ? "min-w-0 whitespace-nowrap" : ""
  const base = `relative block overflow-hidden rounded-xl border-t border-r border-b border-white/20 border-l-4 bg-white/30 ${pad} ${nowrapBase} shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-t-white/10 dark:border-r-white/10 dark:border-b-white/10 ${accentClass ?? "border-l-border/70"}`
  const interactive = href
    ? "group cursor-pointer transition hover:border-[var(--primary-300)]/60 hover:bg-white/45 dark:hover:bg-white/[0.08]"
    : ""

  const content = inlineNowrap ? (
    <div className={`flex min-w-0 items-center ${dense ? "gap-1" : "gap-2"}`}>
      {Icon ? (
        <span className={`flex ${dense ? "h-5 w-5 rounded-md" : "h-8 w-8 rounded-lg"} shrink-0 items-center justify-center ${iconClass ?? "bg-muted text-muted-foreground"}`}>
          <Icon size={dense ? 11 : 16} strokeWidth={2} />
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-between gap-1.5">
        <span className={`${dense ? "text-[9px]" : "text-[10px]"} min-w-0 truncate font-semibold uppercase tracking-wide text-muted-foreground`}>
          {tr(label)}
        </span>
        <span className={`shrink-0 font-display ${dense ? "text-xs" : "text-xl"} font-bold leading-tight text-foreground tabular-nums`}>
          {value}
        </span>
      </div>
    </div>
  ) : (
    <div className={`flex items-center ${dense ? "gap-1" : "gap-2.5"}`}>
      {Icon ? (
        <span className={`flex ${dense ? "h-5 w-5 rounded-md" : "h-8 w-8 rounded-lg"} shrink-0 items-center justify-center ${iconClass ?? "bg-muted text-muted-foreground"}`}>
          <Icon size={dense ? 11 : 16} strokeWidth={2} />
        </span>
      ) : null}
      <div className="min-w-0">
        <div className={`${dense ? "text-[8px]" : "text-[10px]"} truncate font-semibold uppercase tracking-wide text-muted-foreground`}>
          {tr(label)}
        </div>
        <div className={`font-display ${dense ? "text-xs" : "text-xl"} font-bold leading-tight text-foreground tabular-nums`}>
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
