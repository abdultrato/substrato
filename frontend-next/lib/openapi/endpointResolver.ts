import schema from "@/schema.generated.json"

type OpenApiDoc = Record<string, any>

const OPENAPI = schema as OpenApiDoc

// Legacy generated frontend routes that drifted from backend canonical aliases.
// Keep this map explicit and conservative: only add routes confirmed in backend routing.
const STATIC_COLLECTION_ALIASES: Record<string, string> = {
  "/audit_activities/user-activities/": "/audit/atividade/",
  "/external_entities/companies/": "/external_entities/empresa/",
  "/incidents/incidents/": "/equipment/incident/",
  "/inspections/daily-inspections/": "/equipment/daily_inspection/",
  "/tenants/tenant-feature-flags/": "/tenants/featureflagtenant/",
  "/accounting/legacy-entries/": "/accounting/entry/",
  "/accounting/legacy-movements/": "/accounting/movement/",
  "/clinical/results/": "/clinical/resultitem/",
  "/nursing/procedimento/": "/nursing/procedure/",
  "/ai_assistant/ai-investigations/": "/ai/assistant/investigations/",
  "/ai_assistant/ai-operational-tasks/": "/ai/assistant/tasks/",
  "/ai_assistant/ai-sessions/": "/ai/assistant/sessions/",
}

function normalizePath(path: string): string {
  const clean = String(path || "").split("?")[0].split("#")[0]
  if (!clean) return "/"
  const withSlash = clean.startsWith("/") ? clean : `/${clean}`
  const squashed = withSlash.replace(/\/{2,}/g, "/")
  return squashed || "/"
}

function splitPathAndSuffix(url: string): { path: string; suffix: string } {
  const value = String(url || "")
  if (!value) return { path: "/", suffix: "" }
  const q = value.indexOf("?")
  const h = value.indexOf("#")
  const cut =
    q === -1
      ? h
      : h === -1
        ? q
        : Math.min(q, h)
  if (cut === -1) return { path: value, suffix: "" }
  return { path: value.slice(0, cut), suffix: value.slice(cut) }
}

function stripApiPrefix(path: string): string {
  const p = normalizePath(path)
  if (p === "/api/v1") return "/"
  if (p.startsWith("/api/v1/")) return p.replace(/^\/api\/v1/, "")
  return p
}

function camelToKebab(value: string): string {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase()
}

function pluralizeSimple(value: string): string {
  if (!value) return value
  if (value.endsWith("y")) return `${value.slice(0, -1)}ies`
  if (/(s|x|z)$/.test(value)) return `${value}es`
  return `${value}s`
}

function extractRefName(raw: any, components: Record<string, any>, depth = 0): string | null {
  if (!raw || typeof raw !== "object") return null
  if (depth > 8) return null

  if (typeof raw.$ref === "string") {
    const match = raw.$ref.match(/^#\/components\/schemas\/(.+)$/)
    if (!match) return null
    const name = match[1]
    const resolved = components?.[name]
    if (!resolved || typeof resolved !== "object") return name
    // For direct model refs, keep the name as canonical model hint.
    if (resolved.type === "object" && resolved.properties) return name
    return extractRefName(resolved, components, depth + 1) || name
  }

  if (raw.type === "array" && raw.items) {
    return extractRefName(raw.items, components, depth + 1)
  }

  const composites = [
    ...(Array.isArray(raw.allOf) ? raw.allOf : []),
    ...(Array.isArray(raw.oneOf) ? raw.oneOf : []),
    ...(Array.isArray(raw.anyOf) ? raw.anyOf : []),
  ]
  for (const part of composites) {
    const ref = extractRefName(part, components, depth + 1)
    if (ref) return ref
  }

  if (raw.type === "object" && raw.properties && raw.properties.results) {
    const resultRef = extractRefName(raw.properties.results, components, depth + 1)
    if (resultRef) return resultRef
  }

  return null
}

function normalizeAliasPath(value: string): string {
  const p = normalizePath(value)
  return p.endsWith("/") ? p : `${p}/`
}

function buildEndpointAliasEntries(): Array<{ alias: string; canonical: string }> {
  const paths = OPENAPI?.paths || {}
  const components = OPENAPI?.components?.schemas || {}
  const aliases = new Map<string, string>()

  const add = (alias: string, canonical: string) => {
    const a = normalizeAliasPath(stripApiPrefix(alias))
    const c = normalizeAliasPath(stripApiPrefix(canonical))
    if (!a || !c) return
    aliases.set(a, c)
  }

  for (const [rawPath, rawItem] of Object.entries(paths)) {
    if (typeof rawPath !== "string" || !rawPath.startsWith("/api/v1/")) continue
    if (rawPath.includes("{") || rawPath.includes("}")) continue
    if (!rawItem || typeof rawItem !== "object") continue

    const parsed = normalizeAliasPath(stripApiPrefix(rawPath))
    const parts = parsed.split("/").filter(Boolean)
    if (parts.length < 2) continue
    const modulePath = parts.slice(0, -1).join("/")
    const moduleUnderscore = modulePath.replace(/\//g, "_")
    const resource = parts[parts.length - 1]
    const canonical = `/${parts.join("/")}/`

    add(canonical, canonical)
    add(`/${modulePath}/${pluralizeSimple(resource)}/`, canonical)
    if (moduleUnderscore !== modulePath) {
      add(`/${moduleUnderscore}/${resource}/`, canonical)
      add(`/${moduleUnderscore}/${pluralizeSimple(resource)}/`, canonical)
    }

    const methods = rawItem as Record<string, any>
    const candidates: any[] = []

    for (const method of ["post", "put", "patch"]) {
      const op = methods[method]
      const req =
        op?.requestBody?.content?.["application/json"]?.schema ||
        op?.requestBody?.content?.["multipart/form-data"]?.schema ||
        op?.requestBody?.content?.["application/x-www-form-urlencoded"]?.schema
      if (req) candidates.push(req)
    }

    for (const code of ["200", "201"]) {
      const resp = methods?.get?.responses?.[code]?.content?.["application/json"]?.schema
      if (resp) candidates.push(resp)
    }

    let refName: string | null = null
    for (const candidate of candidates) {
      refName = extractRefName(candidate, components)
      if (refName) break
    }
    if (!refName) continue

    const kebab = camelToKebab(refName)
    const kebabPlural = pluralizeSimple(kebab)
    const kebabUnderscore = kebab.replace(/-/g, "_")
    const kebabPluralUnderscore = kebabPlural.replace(/-/g, "_")

    add(`/${modulePath}/${kebab}/`, canonical)
    add(`/${modulePath}/${kebabPlural}/`, canonical)
    add(`/${modulePath}/${kebabUnderscore}/`, canonical)
    add(`/${modulePath}/${kebabPluralUnderscore}/`, canonical)

    if (moduleUnderscore !== modulePath) {
      add(`/${moduleUnderscore}/${kebab}/`, canonical)
      add(`/${moduleUnderscore}/${kebabPlural}/`, canonical)
      add(`/${moduleUnderscore}/${kebabUnderscore}/`, canonical)
      add(`/${moduleUnderscore}/${kebabPluralUnderscore}/`, canonical)
    }
  }

  return Array.from(aliases.entries())
    .map(([alias, canonical]) => ({ alias, canonical }))
    .sort((a, b) => b.alias.length - a.alias.length)
}

const ENDPOINT_ALIAS_ENTRIES = buildEndpointAliasEntries()

export function canonicalizeEndpointPath(pathOrUrl: string): string {
  const { path, suffix } = splitPathAndSuffix(pathOrUrl)
  const basePath = stripApiPrefix(path)
  const normalized = normalizeAliasPath(basePath)

  for (const [legacy, canonical] of Object.entries(STATIC_COLLECTION_ALIASES)) {
    if (!normalized.startsWith(legacy)) continue
    const remainder = normalized.slice(legacy.length)
    const resolved = `${canonical}${remainder}`.replace(/\/{2,}/g, "/")
    return `${resolved}${suffix}`
  }

  for (const { alias, canonical } of ENDPOINT_ALIAS_ENTRIES) {
    if (!normalized.startsWith(alias)) continue
    const remainder = normalized.slice(alias.length)
    const resolved = `${canonical}${remainder}`.replace(/\/{2,}/g, "/")
    return `${resolved}${suffix}`
  }

  return `${normalized}${suffix}`
}

export function canonicalCollectionPath(pathOrUrl: string): string {
  return normalizeAliasPath(stripApiPrefix(canonicalizeEndpointPath(pathOrUrl)))
}
