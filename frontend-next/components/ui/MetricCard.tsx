export default function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-semibold text-[var(--text)]">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-[var(--gray-500)]">{hint}</div>
      ) : null}
    </div>
  )
}
