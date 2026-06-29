import React from "react"
import Link from "next/link"
import { useLanguage } from "@/hooks/useLanguage"

export default function MetricCard({
  label,
  value,
  hint,
  accentClass,
  href,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  accentClass?: string
  /** Quando definido, o cartão vira um link clicável para o recurso correspondente. */
  href?: string
}) {
  const { tr } = useLanguage()

  const base = `relative block overflow-hidden rounded-xl border border-l-4 border-white/20 bg-white/30 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10 ${accentClass ?? "border-l-border/70"}`
  const interactive = href
    ? "group cursor-pointer transition hover:border-[var(--primary-300)]/60 hover:bg-white/45 dark:hover:bg-white/[0.08]"
    : ""

  const content = (
    <>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {tr(label)}
      </div>
      <div className="mt-0.5 font-display text-xl font-bold text-foreground tabular-nums">
        {value}
      </div>
      {hint ? (
        <div className="mt-0.5 text-[10px] text-muted-foreground">{tr(hint)}</div>
      ) : null}
    </>
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
