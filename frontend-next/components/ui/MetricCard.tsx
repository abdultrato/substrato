import React from "react"
import { useLanguage } from "@/hooks/useLanguage"

export default function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: React.ReactNode
  hint?: string
}) {
  const { tr } = useLanguage()

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {tr(label)}
      </div>
      <div className="mt-1 font-display text-2xl font-semibold text-foreground tabular-nums">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-muted-foreground">{tr(hint)}</div>
      ) : null}
    </div>
  )
}
