import schema from "@/schema.generated.json"

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
  type:
    | "text"
    | "number"
    | "integer"
    | "boolean"
    | "date"
    | "datetime"
    | "select"
    | "array-string"
  enumValues?: string[]
  enumLabels?: string[]
}

type FormSpec = {
  fields: FormField[]
}

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
  if (s.oneOf?.length) return normalizeSchema(s.oneOf[0])
  if (s.anyOf?.length) return normalizeSchema(s.anyOf[0])
  return s
}

function mapType(prop: any): FormField["type"] {
  const t = prop.type
  if (t === "boolean") return "boolean"
  if (t === "integer") return "integer"
  if (t === "number") return "number"
  if (t === "array" && prop.items?.type === "string") return "array-string"
  if (t === "string") {
    if (prop.enum?.length) return "select"
    if (prop.format === "date") return "date"
    if (prop.format === "date-time") return "datetime"
    return "text"
  }
  return "text"
}

function schemaToFields(reqSchema: any, requiredList: string[] = []): FormField[] {
  const s = normalizeSchema(reqSchema)
  if (!s?.properties) return []
  return Object.entries(s.properties).map(([name, raw]) => {
    const prop = normalizeSchema(raw)
    const required = requiredList.includes(name)
    const label = prop?.title || name
    const type = mapType(prop)
    return {
      name,
      label,
      required,
      type,
      enumValues: prop?.enum,
      enumLabels: prop?.["x-enumNames"] || prop?.["x-choices"],
    }
  })
}

function findPathObject(endpoint: string, method: HttpMethod) {
  const paths = (schema as any).paths || {}
  const candidates = [
    `/api/v1${endpoint}`,
    `/api/v1${endpoint}`.replace(/\/$/, ""),
    endpoint,
    endpoint.replace(/\/$/, ""),
  ]
  for (const key of Object.keys(paths)) {
    for (const cand of candidates) {
      if (key === cand) {
        const obj = (paths as any)[key]
        if (obj?.[method]) return obj[method]
      }
    }
  }
  return null
}

export function buildFormSpec(endpoint: string, method: HttpMethod): FormSpec | null {
  const pathObj = findPathObject(endpoint, method)
  const req = pathObj?.requestBody?.content?.["application/json"]?.schema
  if (!req) return null
  const required = req.required || []
  const fields = schemaToFields(req, required as string[])
  return { fields }
}
