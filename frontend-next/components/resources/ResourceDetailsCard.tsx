"use client"

import { useLanguage } from "@/hooks/useLanguage"
import { fieldLabel, isInternalField } from "@/lib/ui/fieldLabels"

function readableObjectLabel(value: Record<string, any>): string {
  const candidates = [
    "name",
    "nome",
    "title",
    "titulo",
    "description",
    "descricao",
    "id_custom",
    "custom_id",
    "codigo",
    "code",
    "id",
  ]

  for (const key of candidates) {
    const candidate = value[key]
    if (candidate !== null && candidate !== undefined && String(candidate).trim()) {
      return String(candidate)
    }
  }

  return ""
}

function fmtValue(
  key: string,
  value: any,
  tr: (value: string) => string,
  endpoint = "",
  depth = 0
): string {
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

  if (Array.isArray(value)) {
    if (!value.length) return "-"
    const visible = value.slice(0, 5)
    const lines = visible.map((item, index) => {
      if (item && typeof item === "object") {
        const label = readableObjectLabel(item as Record<string, any>)
        return label || `${tr("Item")} ${index + 1}`
      }
      return fmtValue(key, item, tr, endpoint, depth + 1)
    })
    if (value.length > visible.length) {
      lines.push(`+${value.length - visible.length} ${tr("itens")}`)
    }
    return lines.join("\n")
  }

  if (typeof value === "object") {
    const label = readableObjectLabel(value as Record<string, any>)
    if (label) return label

    if (depth >= 1) {
      return `${Object.keys(value).length} ${tr("campos")}`
    }

    const lines = Object.entries(value as Record<string, any>)
      .filter(([nestedKey]) => !isInternalField(nestedKey))
      .slice(0, 6)
      .map(([nestedKey, nestedValue]) => {
        const labelText = fieldLabel({ endpoint, name: nestedKey })
        return `${labelText}: ${fmtValue(nestedKey, nestedValue, tr, endpoint, depth + 1)}`
      })

    return lines.length ? lines.join("\n") : "-"
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
                {fmtValue(k, v, tr, endpoint)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
