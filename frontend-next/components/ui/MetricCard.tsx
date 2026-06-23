import React from "react"
import { useLanguage } from "@/hooks/useLanguage"

export default function MetricCard({
  label,
  value,
  hint,
  accentClass,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  accentClass?: string
}) {
  const { tr } = useLanguage()

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-l-4 border-white/20 bg-white/30 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10 ${accentClass ?? "border-l-border/70"}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {tr(label)}
      </div>
      <div className="mt-0.5 font-display text-xl font-bold text-foreground tabular-nums">
        {value}
      </div>
      {hint ? (
        <div className="mt-0.5 text-[10px] text-muted-foreground">{tr(hint)}</div>
      ) : null}
    </div>
  )
}
