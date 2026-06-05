import { describe, expect, it } from "vitest"

import { buildFormSpec } from "@/lib/openapi/formBuilder"
import schema from "@/schema.generated.json"

const INTERNAL_FIELDS = new Set([
  "id",
  "id_custom",
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

function resolveRef(ref: string): any {
  const match = ref.match(/^#\/components\/schemas\/(.+)$/)
  if (!match) return null
  return (schema as any).components?.schemas?.[match[1]] ?? null
}

function normalizeSchema(value: any): any {
  if (!value) return null
  if (value.$ref) return normalizeSchema(resolveRef(value.$ref))
  if (Array.isArray(value.allOf) && value.allOf.length) {
    const merged: Record<string, any> = { type: "object", properties: {}, required: [] }
    for (const part of value.allOf) {
      const resolved = normalizeSchema(part)
      if (!resolved || typeof resolved !== "object") continue
      if (resolved.properties && typeof resolved.properties === "object") {
        Object.assign(merged.properties, resolved.properties)
      }
      if (Array.isArray(resolved.required)) {
        merged.required = Array.from(new Set([...(merged.required as string[]), ...resolved.required]))
      }
    }
    return Object.keys(merged.properties).length ? merged : value
  }
  if (Array.isArray(value.oneOf) && value.oneOf.length) return normalizeSchema(value.oneOf[0])
  if (Array.isArray(value.anyOf) && value.anyOf.length) return normalizeSchema(value.anyOf[0])
  return value
}

function requestSchemaForOperation(operation: any): any {
  return normalizeSchema(operation?.requestBody?.content?.["application/json"]?.schema)
}

function writableRequestFields(operation: any): string[] {
  const requestSchema = requestSchemaForOperation(operation)
  const properties = requestSchema?.properties || {}
  return Object.entries(properties)
    .filter(([name, raw]) => {
      const prop = normalizeSchema(raw)
      return !INTERNAL_FIELDS.has(name) && !prop?.readOnly
    })
    .map(([name]) => name)
}

function isCrudResourcePath(path: string): boolean {
  const parts = path.replace(/^\/api\/v1\//, "").split("/").filter(Boolean)
  if (parts.length === 2) return true
  return parts.length === 3 && parts[2].startsWith("{") && parts[2].endsWith("}")
}

describe("formBuilder aliases", () => {
  it("resolve schema para alias de prontuario/registro", () => {
    const spec = buildFormSpec("/medical-records/registro/", "post")
    expect(spec).not.toBeNull()
    expect((spec?.fields.length || 0) > 0).toBe(true)
  })

  it("resolve schema para alias kebab/plural de lab-exams e preserva campos obrigatorios", () => {
    const spec = buildFormSpec("/clinical/lab-exams/", "post")
    expect(spec).not.toBeNull()

    const sampleType = spec?.submitFields.find((field) => field.name === "sample_type")
    expect(sampleType).toBeDefined()
    expect(sampleType?.required).toBe(true)
  })

  it("aceita endpoint com prefixo /api/v1 sem duplicar nem perder spec", () => {
    const spec = buildFormSpec("/api/v1/clinical/lab-exams/", "post")
    expect(spec).not.toBeNull()
    expect((spec?.submitFields.length || 0) > 0).toBe(true)
  })

  it("mantem tenant de check-in como campo interno fora do envio manual", () => {
    const spec = buildFormSpec("/reception/checkin/", "post")
    expect(spec).not.toBeNull()

    const tenant = spec?.fields.find((field) => field.name === "tenant")
    expect(tenant?.readOnly).toBe(true)
    expect(spec?.submitFields.some((field) => field.name === "tenant")).toBe(false)
  })

  it("inclui todos os campos gravaveis que o backend declara nos contratos de escrita", () => {
    const failures: string[] = []
    const paths = (schema as any).paths || {}

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!isCrudResourcePath(path)) continue
      for (const method of ["post", "put", "patch"] as const) {
        const operation = (pathItem as any)?.[method]
        if (!operation?.requestBody) continue

        const expectedFields = writableRequestFields(operation)
        if (!expectedFields.length) continue

        const spec = buildFormSpec(path, method)
        if (!spec) {
          failures.push(`${method.toUpperCase()} ${path}: sem FormSpec`)
          continue
        }

        const submitNames = new Set(spec.submitFields.map((field) => field.name))
        for (const fieldName of expectedFields) {
          if (!submitNames.has(fieldName)) {
            failures.push(`${method.toUpperCase()} ${path}: campo fora do payload -> ${fieldName}`)
          }
        }
      }
    }

    expect(failures).toEqual([])
  })
})
