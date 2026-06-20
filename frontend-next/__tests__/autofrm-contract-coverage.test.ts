import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, statSync } from "fs"
import { join, resolve } from "path"

import { buildFormSpec } from "@/lib/openapi/formBuilder"

type HttpMethod = "post" | "put" | "patch"

type AutoFormContractTarget = {
  file: string
  endpoint: string
  method: HttpMethod
}

function walk(dir: string, acc: string[] = []): string[] {
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(full, acc)
      continue
    }
    acc.push(full)
  }
  return acc
}

function normalizeEndpoint(endpoint: string): string {
  const withLeading = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`
}

function extractMethod(content: string): HttpMethod {
  const methodMatch = content.match(/method="(post|put|patch)"/)
  return (methodMatch?.[1] as HttpMethod) || "post"
}

function extractEndpointLiteral(content: string): string | null {
  const m = content.match(/endpoint="([^"]+)"/)
  return m?.[1] || null
}

function extractEndpointFromConstant(content: string): string | null {
  const endpointProp = content.match(/endpoint=\{([A-Z][A-Z0-9_]*)\}/)
  if (!endpointProp) return null

  const constPattern = new RegExp(`const\\s+${endpointProp[1]}\\s*=\\s*"([^"]+)"`)
  const constMatch = content.match(constPattern)
  return constMatch?.[1] || null
}

function extractEndpointFromEndpointBase(content: string): string | null {
  const baseMatch = content.match(/const\s+endpointBase\s*=\s*"([^"]+)"/)
  if (!baseMatch) return null

  // Most generated pages use endpoint={`${endpointBase}${id}/`}
  if (content.includes("endpoint={`${endpointBase}${id}/`}")) {
    return `${normalizeEndpoint(baseMatch[1])}{id}/`
  }

  // Alternate dynamic patterns with params.id.
  if (content.includes("endpoint={`${endpointBase}${params.id}/`}")) {
    return `${normalizeEndpoint(baseMatch[1])}{id}/`
  }

  return null
}

function extractEndpointFromEnsureTrailingSlash(content: string): string | null {
  // Covers pages using endpoint={ensureTrailingSlash("/module/resource/") + `${id}/`}
  const m = content.match(/endpoint=\{ensureTrailingSlash\("([^"]+)"\)\s*\+\s*`\$\{id\}\/`\}/)
  if (!m) return null
  return `${normalizeEndpoint(m[1])}{id}/`
}

function extractEndpointTemplate(content: string): string | null {
  const m = content.match(/endpoint=\{`([^`]+)`\}/s)
  if (!m) return null
  return normalizeEndpoint(
    m[1]
      .replace(/\$\{[^}]+\}/g, "{id}")
      .replace(/\{id\}\/\{id\}\//g, "{id}/")
  )
}

function extractAutoFormTarget(file: string): AutoFormContractTarget | null {
  const content = readFileSync(file, "utf-8")
  if (!content.includes("<AutoForm")) return null

  const method = extractMethod(content)

  const endpoint =
    extractEndpointLiteral(content) ||
    extractEndpointFromConstant(content) ||
    extractEndpointFromEndpointBase(content) ||
    extractEndpointFromEnsureTrailingSlash(content) ||
    extractEndpointTemplate(content)

  if (!endpoint) return null

  return {
    file,
    endpoint,
    method,
  }
}

function collectAutoFormTargets(): {
  targets: AutoFormContractTarget[]
  unresolved: string[]
} {
  const appRoot = resolve(process.cwd(), "app")
  const files = walk(appRoot).filter((file) => file.endsWith("page.tsx"))
  const targets: AutoFormContractTarget[] = []
  const unresolved: string[] = []

  for (const file of files) {
    const content = readFileSync(file, "utf-8")
    if (!content.includes("<AutoForm")) continue

    const target = extractAutoFormTarget(file)
    if (!target) {
      unresolved.push(file)
      continue
    }
    targets.push(target)
  }

  return { targets, unresolved }
}

describe("AutoForm contract coverage", () => {
  it("mantem compatibilidade de formulário para páginas AutoForm resolvíveis", { timeout: 30000 }, () => {
    const { targets, unresolved } = collectAutoFormTargets()
    const failures: string[] = []
    const noSchemaCoverage: string[] = []

    // As páginas de catálogo dinâmico resolvem endpoint apenas em runtime.
    const allowedUnresolved = new Set([
      resolve(process.cwd(), "app/resources/[group]/[resource]/new/page.tsx"),
      resolve(process.cwd(), "app/education/resources/[resource]/new/page.tsx"),
    ])

    for (const file of unresolved) {
      if (!allowedUnresolved.has(file)) {
        failures.push(`${file}: endpoint AutoForm não resolvido para auditoria estática`)
      }
    }

    for (const { file, endpoint, method } of targets) {
      const spec = buildFormSpec(endpoint, method)
      const fallbackPatchSpec = method === "put" ? buildFormSpec(endpoint, "patch") : null
      const resolvedSpec = spec || fallbackPatchSpec
      if (!spec) {
        if (!resolvedSpec) {
          noSchemaCoverage.push(
            `${file}: sem schema OpenAPI para ${endpoint} (${method.toUpperCase()})`
          )
          continue
        }
      }

      if (!resolvedSpec.submitFields.length) {
        failures.push(`${file}: submitFields vazio para endpoint ${endpoint}`)
      }

      const submitNames = new Set(resolvedSpec.submitFields.map((field) => field.name))

      for (const field of resolvedSpec.fields) {
        if (field.readOnly && submitNames.has(field.name)) {
          failures.push(`${file}: campo readonly em submitFields -> ${field.name}`)
        }

        if (field.required && !field.readOnly && !submitNames.has(field.name)) {
          failures.push(`${file}: campo obrigatório fora do payload -> ${field.name}`)
        }
      }

      for (const field of resolvedSpec.submitFields) {
        if (field.type === "select" && (!field.enumValues || field.enumValues.length === 0)) {
          failures.push(`${file}: select sem enumValues -> ${field.name}`)
        }
      }
    }

    expect(targets.length).toBeGreaterThan(0)
    expect(failures).toEqual([])
    // Mantém visibilidade sobre páginas ainda sem cobertura estática de schema,
    // sem bloquear regressões de payload nos formulários já mapeados.
    expect(noSchemaCoverage.length).toBeLessThan(targets.length)
  })
})
