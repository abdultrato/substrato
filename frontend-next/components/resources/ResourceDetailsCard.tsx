"use client"

import { useMemo } from "react"

import { useLanguage } from "@/hooks/useLanguage"
import { useRelationLabels } from "@/hooks/useRelationLabels"
import { fieldLabel, isInternalField } from "@/lib/ui/fieldLabels"
import { canonicalCollectionPath } from "@/lib/openapi/endpointResolver"

function readableObjectLabel(value: Record<string, any>): string {
  const candidates = [
    "full_name",
    "display_name",
    // Itens de requisição/guia de colheita: mostrar o nome do exame.
    "exam_name",
    "medical_exam_name",
    "sample_name",
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

function requestedTestLabel(value: Record<string, any>): string {
  const candidates = ["test_name", "name", "nome", "title", "description", "descricao"]
  for (const key of candidates) {
    const candidate = value[key]
    if (candidate !== null && candidate !== undefined && String(candidate).trim()) {
      return String(candidate).trim()
    }
  }
  return readableObjectLabel(value)
}

function institutionLabel(value: Record<string, any>): string {
  const candidates = ["name", "nome", "title", "descricao", "description"]
  for (const key of candidates) {
    const candidate = value[key]
    if (candidate !== null && candidate !== undefined && String(candidate).trim()) {
      return String(candidate).trim()
    }
  }
  return readableObjectLabel(value)
}

function normalizeEndpointPath(value: string): string {
  const clean = String(value || "").split("?")[0].split("#")[0].trim()
  const prefixed = clean.startsWith("/") ? clean : `/${clean}`
  return prefixed.replace(/\/+$/, "") + "/"
}

// Amostra com o frasco herdado dos exames: "Nome — Tubo EDTA (vol. mín. 2 ml)".
function sampleDetailLabel(value: Record<string, any>): string {
  const name = String(value?.name || value?.nome || "").trim()
  const bottle = String(value?.bottle_type_display || value?.bottle_type || "").trim()
  const volume = String(value?.minimum_volume_ml ?? "").trim()
  const fasting = value?.fasting_required
    ? ` — jejum ${Number(value?.fasting_hours || 0) > 0 ? `${value.fasting_hours}h` : "obrigatório"}`
    : ""
  const parts = [name || readableObjectLabel(value)]
  if (bottle) parts.push(`— ${bottle}`)
  if (volume && Number(volume) > 0) parts.push(`(vol. mín. ${volume} ml)`)
  return parts.join(" ") + fasting
}

// Aliases legados e campos redundantes que não devem poluir o detalhe.
const HIDDEN_DETAIL_FIELDS_BY_ENDPOINT: Record<string, Set<string>> = {
  "/clinical/labrequest/": new Set([
    // aliases legados (duplicam campos canónicos)
    "id_custom",
    "paciente_nome",
    "paciente_codigo",
    "paciente_código",
    "empresa_solicitante_nome",
    "empresa_executora_externa_nome",
    "tipo",
    "estado",
    "status_clinico",
    "estado_clinico",
    "estado_clínico",
    "prioridade",
    "possui_resultado_critico",
    "possui_resultado_crítico",
    "exames",
    "exames_laboratoriais",
    "exames_medicos",
    "exames_médicos",
    "exams_medicos",
    "itens",
    "guia_coleta",
    "guia_colheita",
    // redundantes: o FK correspondente já é resolvido para o nome
    "patient_name",
    "patient_code",
    "requesting_company_name",
    "external_executing_company_name",
    "occupational_profile_name",
    "requesting_physician_name",
    // IDs crus de amostras (sample_details já mostra os detalhes)
    "samples",
  ]),
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
        if (key === "requested_tests") return requestedTestLabel(item as Record<string, any>)
        if (key === "tenant") return institutionLabel(item as Record<string, any>)
        if (key === "sample_details" || key === "sample_options") {
          return sampleDetailLabel(item as Record<string, any>)
        }
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
  const showReceptionCheckinAudit = normalizeEndpointPath(endpoint) === "/reception/checkin/"
  const hiddenDetailFields = HIDDEN_DETAIL_FIELDS_BY_ENDPOINT[canonicalCollectionPath(endpoint)]
  const entries = useMemo(
    () =>
      Object.entries(data || {})
        .filter(([k]) => !isInternalField(k) || (showReceptionCheckinAudit && RECEPTION_CHECKIN_VISIBLE_INTERNAL_FIELDS.has(k)))
        .filter(([k]) => {
          if (showReceptionCheckinAudit) return k !== "deleted_by"
          return k !== "tenant" && k !== "created_by" && k !== "updated_by" && k !== "deleted_by"
        })
        .filter(([k]) => !hiddenDetailFields?.has(k)),
    [data, showReceptionCheckinAudit, hiddenDetailFields]
  )
  // Resolve FKs escalares e M2M/array (ex.: sector, painel.tests) para nomes.
  // Passa apenas os campos visíveis para não buscar relações ocultas.
  const visibleRecord = useMemo(() => Object.fromEntries(entries), [entries])
  const { resolve } = useRelationLabels(endpoint, useMemo(() => [visibleRecord], [visibleRecord]))

  function renderEntryValue(fieldName: string, value: any): string {
    return resolve(fieldName, value, (item) => fmtValue(fieldName, item, tr, endpoint), {
      more: (count) => `+${count} ${tr("itens")}`,
    })
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="grid gap-0 divide-y divide-border">
        {entries.map(([k, v]) => {
          const displayValue = renderEntryValue(k, v)
          return (
            <div key={k} className="grid grid-cols-1 gap-1 px-4 py-3 transition-colors duration-150 hover:bg-[var(--gray-50)] md:grid-cols-3 md:gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {fieldLabel({ endpoint, name: k })}
              </div>
              <div className="md:col-span-2">
                <div className="whitespace-pre-wrap text-sm text-foreground">
                  {displayValue}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
