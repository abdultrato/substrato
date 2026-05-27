"use client"

import { useLanguage } from "@/hooks/useLanguage"
import { fieldLabel, isInternalField } from "@/lib/ui/fieldLabels"

function fmtValue(key: string, value: any, tr: (value: string) => string): string {
  if (value === null || value === undefined || value === "") return "-"
  if (typeof value === "boolean") return value ? tr("Sim") : tr("Não")
  if (typeof value === "number") return String(value)

  // ISO-ish dates
  if (typeof value === "string") {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime()) && /T|\d{4}-\d{2}-\d{2}/.test(value)) {
      return d.toLocaleString()
    }
    return tr(value)
  }

  if (typeof value === "object") {
    // Avoid dumping nested objects in the details view; show an identifier.
    const anyObj = value as any
    if (anyObj.id_custom) return String(anyObj.id_custom)
    if (anyObj.custom_id) return String(anyObj.custom_id)
    if (anyObj.id) return String(anyObj.id)
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  return String(value)
}

export default function ResourceDetailsCard({
  endpoint,
  data,
}: {
  endpoint: string
  data: Record<string, any>
}) {
  const { tr } = useLanguage()
  const entries = Object.entries(data || {})
    .filter(([k]) => !isInternalField(k))
    .filter(([k]) => k !== "tenant" && k !== "created_by" && k !== "updated_by" && k !== "deleted_by")

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="grid gap-0 divide-y divide-border">
        {entries.map(([k, v]) => (
          <div key={k} className="grid grid-cols-1 gap-1 px-4 py-3 transition-colors duration-150 hover:bg-[var(--gray-50)] md:grid-cols-3 md:gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {fieldLabel({ endpoint, name: k })}
            </div>
            <div className="md:col-span-2">
              <div className="whitespace-pre-wrap text-sm text-foreground">
                {fmtValue(k, v, tr)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
