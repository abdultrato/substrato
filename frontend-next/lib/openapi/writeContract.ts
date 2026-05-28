import { buildFormSpec } from "@/lib/openapi/formBuilder"
import { canonicalizeEndpointPath } from "@/lib/openapi/endpointResolver"
import schema from "@/schema.generated.json"

type WriteMethod = "post" | "put" | "patch"
type OpenApiMethod = "get" | "post" | "put" | "patch" | "delete"

const cache = new Map<string, boolean>()
const methodCache = new Map<string, boolean>()

function key(endpoint: string, method: WriteMethod): string {
  return `${method}:${endpoint}`
}

function normalizeEndpoint(endpoint: string): string {
  const canonical = canonicalizeEndpointPath(endpoint)
  const clean = String(canonical || "").split("?")[0].split("#")[0]
  const prefixed = clean.startsWith("/") ? clean : `/${clean}`
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`
}

function matchesTemplate(template: string, actual: string): boolean {
  const templateSegments = template.split("/").filter(Boolean)
  const actualSegments = actual.split("/").filter(Boolean)
  if (templateSegments.length !== actualSegments.length) return false

  return templateSegments.every((segment, index) => {
    if (segment.startsWith("{") && segment.endsWith("}")) return true
    return segment === actualSegments[index]
  })
}

export function hasOpenApiMethod(endpoint: string, method: OpenApiMethod): boolean {
  const normalized = normalizeEndpoint(endpoint)
  const k = `${method}:${normalized}`
  const cached = methodCache.get(k)
  if (cached !== undefined) return cached

  const paths = (schema as any).paths || {}
  const apiPath = `/api/v1${normalized}`
  const candidates = [
    apiPath,
    apiPath.replace(/\/$/, ""),
    normalized,
    normalized.replace(/\/$/, ""),
  ]

  let result = candidates.some((candidate) => !!paths[candidate]?.[method])
  if (!result) {
    result = Object.keys(paths).some(
      (path) => matchesTemplate(path, apiPath) && !!paths[path]?.[method]
    )
  }

  methodCache.set(k, result)
  return result
}

export function hasWriteContract(endpoint: string, method: WriteMethod): boolean {
  const k = key(endpoint, method)
  const cached = cache.get(k)
  if (cached !== undefined) return cached

  let result = !!buildFormSpec(endpoint, method)
  if (!result && method === "put") {
    result = !!buildFormSpec(endpoint, "patch")
  }

  cache.set(k, result)
  return result
}
