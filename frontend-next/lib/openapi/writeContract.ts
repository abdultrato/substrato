import { buildFormSpec } from "@/lib/openapi/formBuilder"

type WriteMethod = "post" | "put" | "patch"

const cache = new Map<string, boolean>()

function key(endpoint: string, method: WriteMethod): string {
  return `${method}:${endpoint}`
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
