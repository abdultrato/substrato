import schema from "@/schema.generated.json"
import { fieldLabel, isInternalField } from "@/lib/ui/fieldLabels"
import { canonicalCollectionPath } from "@/lib/openapi/endpointResolver"
import { normalizeEducationEndpoint } from "@/lib/education/ui"

type HttpMethod = "post" | "put" | "patch"

type OpenApiSchema =
  | { type: "string"; format?: string; enum?: string[] }
  | { type: "integer" | "number" }
  | { type: "boolean" }
  | { type: "array"; items?: OpenApiSchema }
  | { $ref: string }
  | { anyOf?: OpenApiSchema[]; oneOf?: OpenApiSchema[] }
  | Record<string, any>

export type FormField = {
  name: string
  label: string
  required: boolean
  readOnly?: boolean
  type:
    | "text"
    | "number"
    | "integer"
    | "boolean"
    | "date"
    | "datetime"
    | "select"
    | "json"
    | "array-string"
    // M2M / array de FKs (ex.: painel.tests) — renderizado como seletor de
    // múltiplos (pesquisar + adicionar/remover).
    | "array-relation"
  enumValues?: string[]
  enumLabels?: string[]
}

type FormSpec = {
  fields: FormField[]
  submitFields: FormField[]
}

const ALWAYS_READONLY_FIELDS = new Set([
  "id",
  "id_custom",
  // Multi-tenant: never allow tenant to be chosen via UI forms.
  // Backend derives/enforces it from `request.tenant` for non-superusers.
  "tenant",
  "tenant_id",
  "inquilino",
  "criado_por",
  "atualizado_por",
  "criado_em",
  "atualizado_em",
  "deletado",
  "deletado_em",
  "deletado_por",
  "versao",
  // English/system fields (some modules still expose these as writable in OpenAPI)
  "created_at",
  "updated_at",
  "custom_id",
  "deleted",
  "deleted_at",
  "version",
  "created_by",
  "updated_by",
  "deleted_by",
])

// Resolve $ref inside components.schemas
function resolveRef(ref: string): any {
  const match = ref.match(/^#\/components\/schemas\/(.+)$/)
  if (!match) return null
  const name = match[1]
  return (schema as any).components?.schemas?.[name] ?? null
}

function normalizeSchema(s: any): any {
  if (!s) return null
  if (s.$ref) return normalizeSchema(resolveRef(s.$ref))
  if (Array.isArray(s.allOf) && s.allOf.length) {
    const merged: Record<string, any> = {
      type: "object",
      properties: {},
      required: [],
    }
    for (const part of s.allOf) {
      const resolved = normalizeSchema(part)
      if (!resolved || typeof resolved !== "object") continue
      if (resolved.properties && typeof resolved.properties === "object") {
        Object.assign(merged.properties, resolved.properties)
      }
      if (Array.isArray(resolved.required)) {
        merged.required = Array.from(new Set([...(merged.required as string[]), ...resolved.required]))
      }
    }
    if (Object.keys(merged.properties).length) return merged
  }
  if (Array.isArray(s.oneOf) && s.oneOf.length) {
    const preferred = s.oneOf.find((item: any) => {
      const resolved = normalizeSchema(item)
      return !!resolved?.properties || resolved?.type === "object"
    })
    return normalizeSchema(preferred || s.oneOf[0])
  }
  if (Array.isArray(s.anyOf) && s.anyOf.length) {
    const preferred = s.anyOf.find((item: any) => {
      const resolved = normalizeSchema(item)
      return !!resolved?.properties || resolved?.type === "object"
    })
    return normalizeSchema(preferred || s.anyOf[0])
  }
  return s
}

function mapType(prop: any): FormField["type"] {
  const t = prop.type
  if (t === "boolean") return "boolean"
  if (t === "integer") return "integer"
  if (t === "number") return "number"
  if (t === "object") return "json"
  if (t === "array" && prop.items?.type === "string") return "array-string"
  if (t === "array" && (prop.items?.type === "integer" || prop.items?.type === "number")) {
    return "array-relation"
  }
  if (t === "string") {
    if (prop.enum?.length) return "select"
    if (prop.format === "date") return "date"
    if (prop.format === "date-time") return "datetime"
    return "text"
  }
  return "text"
}

function extractEnumLabels(prop: any): string[] | undefined {
  if (!prop) return undefined

  const explicit = prop?.["x-enumNames"] || prop?.["x-choices"]
  if (Array.isArray(explicit) && explicit.length) return explicit.map(String)

  // drf-spectacular embeds choice labels in `description` like:
  // "* `CODE` - Label"
  const desc = typeof prop?.description === "string" ? prop.description : ""
  const values = Array.isArray(prop?.enum) ? (prop.enum as any[]) : []
  if (!desc || !values.length) return undefined

  const map = new Map<string, string>()
  for (const line of desc.split("\n")) {
    const m = line.match(/^\s*\*\s*`([^`]+)`\s*-\s*(.+?)\s*$/)
    if (!m) continue
    map.set(String(m[1]), String(m[2]))
  }

  if (!map.size) return undefined

  return values.map((v) => map.get(String(v)) || String(v))
}

function schemaToFields(
  reqSchema: any,
  requiredList: string[] = [],
  endpoint?: string
): FormField[] {
  const s = normalizeSchema(reqSchema)
  if (!s?.properties) return []
  return Object.entries(s.properties).map(([name, raw]) => {
    const prop = normalizeSchema(raw)
    const required = requiredList.includes(name)
    const label = fieldLabel({ endpoint, name, title: prop?.title })
    const type = mapType(prop)
    return {
      name,
      label,
      required,
      type,
      readOnly: !!prop?.readOnly,
      enumValues: prop?.enum,
      enumLabels: extractEnumLabels(prop),
    }
  })
}

function collectionItemSchema(responseSchema: any): any {
  const normalized = normalizeSchema(responseSchema)
  if (!normalized) return null

  if (normalized.type === "array") {
    return normalizeSchema(normalized.items)
  }

  const results = normalizeSchema(normalized.properties?.results)
  if (results?.type === "array") {
    return normalizeSchema(results.items)
  }

  if (normalized.properties) return normalized
  return null
}

function normalizePath(path: string): string {
  const p = String(path || "").split("?")[0].split("#")[0]
  if (!p) return "/"
  const withSlash = p.startsWith("/") ? p : `/${p}`
  return withSlash.replace(/\/+$/, "") || "/"
}

function pathSegments(path: string): string[] {
  const n = normalizePath(path)
  return n.split("/").filter(Boolean)
}

function normalizeEndpointAlias(endpoint: string): string {
  const normalized = normalizePath(canonicalCollectionPath(endpoint))
  const educationEndpoint = normalizePath(normalizeEducationEndpoint(normalized))
  if (educationEndpoint !== normalized) return educationEndpoint
  if (normalized === "/medical-records/registro") return "/medical_records/record"
  if (normalized.startsWith("/medical-records/registro/")) {
    return normalized.replace("/medical-records/registro", "/medical_records/record")
  }
  if (normalized === "/medical-records" || normalized.startsWith("/medical-records/")) {
    return normalized.replace("/medical-records", "/medical_records")
  }
  return normalized
}

function matchesTemplate(template: string, actual: string): boolean {
  const t = pathSegments(template)
  const a = pathSegments(actual)
  if (t.length !== a.length) return false
  for (let i = 0; i < t.length; i++) {
    const seg = t[i]
    if (seg.startsWith("{") && seg.endsWith("}")) continue
    if (seg !== a[i]) return false
  }
  return true
}

function findPathItem(endpoint: string) {
  const paths = (schema as any).paths || {}
  const canonicalEndpoint = normalizeEndpointAlias(endpoint)
  const candidates = [
    `/api/v1${canonicalEndpoint}`,
    `/api/v1${canonicalEndpoint}`.replace(/\/$/, ""),
    canonicalEndpoint,
    canonicalEndpoint.replace(/\/$/, ""),
    `/api/v1${endpoint}`,
    `/api/v1${endpoint}`.replace(/\/$/, ""),
    endpoint,
    endpoint.replace(/\/$/, ""),
  ]
  for (const key of Object.keys(paths)) {
    for (const cand of candidates) {
      if (matchesTemplate(key, cand)) {
        return { key, item: (paths as any)[key] }
      }
    }
  }
  return null
}

export function buildFormSpec(endpoint: string, method: HttpMethod): FormSpec | null {
  const found = findPathItem(endpoint)
  const op = found?.item?.[method]
  const req = op?.requestBody?.content?.["application/json"]?.schema
  if (!req) return null
  const canonicalEndpoint = normalizeEndpointAlias(endpoint)

  const reqNorm = normalizeSchema(req)
  const reqRequired = (reqNorm?.required || []) as string[]
  const reqFields = schemaToFields(reqNorm, reqRequired, canonicalEndpoint)
  if (!reqFields.length) return null
  const reqFieldNames = new Set(reqFields.map((f) => f.name))

  // Prefer the write response schema; fallback to GET response schema.
  const resp =
    op?.responses?.["200"] ||
    op?.responses?.["201"] ||
    found?.item?.get?.responses?.["200"] ||
    found?.item?.get?.responses?.["201"]
  const respSchema = resp?.content?.["application/json"]?.schema
  const respNorm = normalizeSchema(respSchema)
  const respRequired = (respNorm?.required || []) as string[]
  const respFields = schemaToFields(respNorm, respRequired, canonicalEndpoint)

  const baseFields = respFields.length ? respFields : reqFields

  // Merge: expose all response fields, but only submit writable request fields.
  const fields: FormField[] = baseFields.map((f) => {
    const inReq = reqFieldNames.has(f.name)
    const readOnly =
      ALWAYS_READONLY_FIELDS.has(f.name) ||
      isInternalField(f.name) ||
      f.readOnly ||
      !inReq
    return {
      ...f,
      required: inReq ? reqRequired.includes(f.name) : false,
      readOnly,
    }
  })

  // Include request-only fields (rare) that might not appear in response schema.
  for (const f of reqFields) {
    if (fields.some((x) => x.name === f.name)) continue
    fields.push({
      ...f,
      readOnly: ALWAYS_READONLY_FIELDS.has(f.name) || isInternalField(f.name) ? true : false,
    })
  }

  const submitFields = fields.filter((f) => !f.readOnly)
  return { fields, submitFields }
}

export function buildListFields(endpoint: string): FormField[] {
  const found = findPathItem(endpoint)
  const op = found?.item?.get
  const resp = op?.responses?.["200"] || op?.responses?.["201"]
  const respSchema = resp?.content?.["application/json"]?.schema
  const itemSchema = collectionItemSchema(respSchema)
  if (!itemSchema?.properties) return []

  const canonicalEndpoint = normalizeEndpointAlias(endpoint)
  const required = (itemSchema.required || []) as string[]
  return schemaToFields(itemSchema, required, canonicalEndpoint)
}
