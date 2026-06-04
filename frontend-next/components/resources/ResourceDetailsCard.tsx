"use client"

import { useEffect, useMemo, useState } from "react"

import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import {
  relationOptionFromRow,
  relationTargetForField,
  type RelationTarget,
} from "@/lib/resources/relationOptions"
import { fieldLabel, isInternalField } from "@/lib/ui/fieldLabels"

function readableObjectLabel(value: Record<string, any>): string {
  const candidates = [
    "full_name",
    "display_name",
    "name",
    "nome",
    "username",
    "email",
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

function relationIdFromScalar(value: any): string | null {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null
  if (typeof value !== "string") return null
  const text = value.trim()
  return /^\d+$/.test(text) ? text : null
}

function relationLookupKey(fieldName: string, value: any): string | null {
  const id = relationIdFromScalar(value)
  return id ? `${fieldName}:${id}` : null
}

function relationDetailEndpoint(target: RelationTarget, id: string): string {
  const base = target.endpoint.split("?")[0].replace(/\/?$/, "/")
  return `${base}${encodeURIComponent(id)}/`
}

function normalizeEndpointPath(value: string): string {
  const clean = String(value || "").split("?")[0].split("#")[0].trim()
  const prefixed = clean.startsWith("/") ? clean : `/${clean}`
  return prefixed.replace(/\/+$/, "") + "/"
}

const RECEPTION_CHECKIN_VISIBLE_INTERNAL_FIELDS = new Set([
  "id",
  "custom_id",
  "tenant",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
])

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
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [relationLabels, setRelationLabels] = useState<Record<string, string>>({})
  const showReceptionCheckinAudit = normalizeEndpointPath(endpoint) === "/reception/checkin/"
  const entries = useMemo(
    () =>
      Object.entries(data || {})
        .filter(([k]) => !isInternalField(k) || (showReceptionCheckinAudit && RECEPTION_CHECKIN_VISIBLE_INTERNAL_FIELDS.has(k)))
        .filter(([k]) => {
          if (showReceptionCheckinAudit) return k !== "deleted_by"
          return k !== "tenant" && k !== "created_by" && k !== "updated_by" && k !== "deleted_by"
        }),
    [data, showReceptionCheckinAudit]
  )
  const relationLookups = useMemo(
    () =>
      entries
        .map(([fieldName, value]) => {
          const id = relationIdFromScalar(value)
          if (!id) return null
          const target = relationTargetForField(fieldName, endpoint)
          if (!target) return null
          return {
            key: `${fieldName}:${id}`,
            id,
            target,
          }
        })
        .filter(Boolean) as Array<{ key: string; id: string; target: RelationTarget }>,
    [entries, endpoint]
  )

  useEffect(() => {
    let mounted = true

    async function loadRelationLabels() {
      if (!relationLookups.length) {
        setRelationLabels({})
        return
      }

      const loaded: Record<string, string> = {}
      await Promise.all(
        relationLookups.map(async ({ key, id, target }) => {
          try {
            const row = await apiFetch<Record<string, any>>(relationDetailEndpoint(target, id), {
              clientCache: safeRefreshToken === 0,
              clientCacheTtlMs: 60000,
            })
            const option = relationOptionFromRow(row, target)
            if (option) loaded[key] = option.label
          } catch {
            // Keep the original scalar visible when the relation endpoint is unavailable.
          }
        })
      )

      if (mounted) setRelationLabels(loaded)
    }

    loadRelationLabels().catch(() => {
      if (mounted) setRelationLabels({})
    })

    return () => {
      mounted = false
    }
  }, [relationLookups, safeRefreshToken])

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="grid gap-0 divide-y divide-border">
        {entries.map(([k, v]) => {
          const resolvedLabel = relationLabels[relationLookupKey(k, v) || ""]
          return (
            <div key={k} className="grid grid-cols-1 gap-1 px-4 py-3 transition-colors duration-150 hover:bg-[var(--gray-50)] md:grid-cols-3 md:gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {fieldLabel({ endpoint, name: k })}
              </div>
              <div className="md:col-span-2">
                <div className="whitespace-pre-wrap text-sm text-foreground">
                  {resolvedLabel || fmtValue(k, v, tr, endpoint)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
