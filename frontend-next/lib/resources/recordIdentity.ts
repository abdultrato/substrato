export type ResourceRecord = Record<string, any>

function usablePrimaryId(value: unknown): string | number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value !== "string") return null
  const clean = value.trim()
  return clean ? clean : null
}

export function primaryRecordId(row: ResourceRecord | null | undefined): string | number | null {
  if (!row || typeof row !== "object") return null
  return usablePrimaryId(row.id) ?? usablePrimaryId(row.pk)
}

export function buildRecordDetailHref(basePath: string, row: ResourceRecord | null | undefined): string | null {
  const id = primaryRecordId(row)
  if (id === null) return null
  const cleanBase = String(basePath || "").replace(/\/+$/, "")
  if (!cleanBase) return null
  return `${cleanBase}/${encodeURIComponent(String(id))}`
}
