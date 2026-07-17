export type WorkspaceScope = "education" | "healthcare" | "transport-logistics" | "neutral"

export const WORKSPACE_SCOPE_STORAGE_KEY = "substrato.activeWorkspaceScope"
export const WORKSPACE_SCOPE_CHANGED_EVENT = "substrato.workspaceScopeChanged"

const NEUTRAL_PATH_PREFIXES = [
  "/workspaces",
  "/credit-financing",
  "/resources",
  "/modules",
  "/ai",
  "/admin",
  "/login",
  "/auth",
  "/profile",
  "/settings",
]

const EDUCATION_PATH_PREFIXES = ["/education"]
const HEALTHCARE_PATH_PREFIXES = [
  "/healthcare",
  "/reception",
  "/patients",
  "/consultations",
  "/requests",
  "/medical-records",
  "/medicine",
  "/pharmacy",
  "/clinical-pharmacy",
  "/telemedicine",
  "/public-health",
  "/dental",
  "/veterinary",
  "/physiotherapy",
  "/occupational-therapy",
  "/physical-therapy",
  "/radiology",
  "/pathology",
  "/cardiology",
  "/neurology",
  "/ophthalmology",
  "/nursing",
  "/clinical-laboratory",
  "/exams",
  "/bloodbank",
  "/maternity",
  "/surgery",
  "/occupational-medicine",
]
const TRANSPORT_LOGISTICS_PATH_PREFIXES = [
  "/transportation",
  "/warehouse",
  "/pharmacy/material-requests",
  "/equipment/equipments",
]
const HEALTHCARE_MODULE_KEYS = new Set([
  "clinical",
  "reception",
  "consultations",
  "medical_records",
  "clinical_laboratory",
  "pharmacy",
  "telemedicine",
  "public_health",
  "dental",
  "veterinary",
  "physiotherapy",
  "pathology",
  "radiology",
  "bloodbank",
  "nursing",
  "maternity",
  "surgery",
])
const TRANSPORT_LOGISTICS_MODULE_KEYS = new Set(["transportation", "warehouse"])

function normalizePathname(pathname: string): string {
  const raw = (pathname || "").trim()
  if (!raw) return "/"
  return raw.startsWith("/") ? raw : `/${raw}`
}

function isPrefixMatch(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function inferWorkspaceScopeFromPath(pathname: string): WorkspaceScope {
  const normalized = normalizePathname(pathname)

  if (EDUCATION_PATH_PREFIXES.some((prefix) => isPrefixMatch(normalized, prefix))) {
    return "education"
  }
  if (HEALTHCARE_PATH_PREFIXES.some((prefix) => isPrefixMatch(normalized, prefix))) {
    return "healthcare"
  }
  if (TRANSPORT_LOGISTICS_PATH_PREFIXES.some((prefix) => isPrefixMatch(normalized, prefix))) {
    return "transport-logistics"
  }
  if (NEUTRAL_PATH_PREFIXES.some((prefix) => isPrefixMatch(normalized, prefix))) {
    return "neutral"
  }
  if (normalized === "/") {
    return "neutral"
  }
  return "healthcare"
}

export function isOperationalScope(scope: WorkspaceScope): scope is "education" | "healthcare" | "transport-logistics" {
  return scope === "education" || scope === "healthcare" || scope === "transport-logistics"
}

export function readStoredWorkspaceScope(): WorkspaceScope | null {
  if (typeof window === "undefined") return null
  const value = (window.localStorage.getItem(WORKSPACE_SCOPE_STORAGE_KEY) || "").trim()
  if (value === "education" || value === "healthcare" || value === "transport-logistics") return value
  return null
}

export function writeStoredWorkspaceScope(scope: WorkspaceScope): void {
  if (typeof window === "undefined") return
  if (!isOperationalScope(scope)) return
  window.localStorage.setItem(WORKSPACE_SCOPE_STORAGE_KEY, scope)
  window.dispatchEvent(new CustomEvent(WORKSPACE_SCOPE_CHANGED_EVENT, { detail: scope }))
}

export function resolveWorkspaceScope(pathname: string, storedScope: WorkspaceScope | null): WorkspaceScope {
  const inferred = inferWorkspaceScopeFromPath(pathname)
  const normalized = normalizePathname(pathname)

  // Explicit workspace routes always switch scope.
  if (EDUCATION_PATH_PREFIXES.some((prefix) => isPrefixMatch(normalized, prefix))) return "education"
  if (HEALTHCARE_PATH_PREFIXES.some((prefix) => isPrefixMatch(normalized, prefix))) return "healthcare"
  if (TRANSPORT_LOGISTICS_PATH_PREFIXES.some((prefix) => isPrefixMatch(normalized, prefix))) return "transport-logistics"
  if (isPrefixMatch(normalized, "/credit-financing")) return "neutral"

  // For all other routes, preserve selected workspace when available.
  if (storedScope === "education" || storedScope === "healthcare") return storedScope

  if (inferred !== "neutral") return inferred
  return "neutral"
}

type ModuleGroupLike = {
  key: string
  label: string
  resources: Array<{ key: string; label: string; endpoint: string; adminListHref?: string }>
}

export function filterModulesByWorkspaceScope<T extends ModuleGroupLike>(
  modules: T[],
  scope: WorkspaceScope
): T[] {
  if (scope === "neutral") return modules
  if (scope === "education") {
    return modules.filter((group) => group.key === "education")
  }
  if (scope === "transport-logistics") {
    return modules.filter((group) => TRANSPORT_LOGISTICS_MODULE_KEYS.has(group.key))
  }
  return modules.filter((group) => HEALTHCARE_MODULE_KEYS.has(group.key))
}

export function isPathAllowedForScope(pathname: string, scope: WorkspaceScope): boolean {
  if (scope === "neutral") return true

  const normalized = normalizePathname(pathname)
  if (normalized === "/") return false
  if (NEUTRAL_PATH_PREFIXES.some((prefix) => isPrefixMatch(normalized, prefix))) return true

  return pathMatchesWorkspaceScope(normalized, scope)
}

export function workspaceHomeForScope(scope: WorkspaceScope): string {
  if (scope === "education") return "/education"
  if (scope === "healthcare") return "/healthcare"
  if (scope === "transport-logistics") return "/transportation"
  return "/workspaces"
}

export function pathMatchesWorkspaceScope(pathname: string, scope: WorkspaceScope): boolean {
  if (scope === "neutral") return true

  const normalized = normalizePathname(pathname)
  if (isPrefixMatch(normalized, "/workspaces")) return true
  if (scope === "education") {
    return EDUCATION_PATH_PREFIXES.some((prefix) => isPrefixMatch(normalized, prefix))
  }
  if (scope === "healthcare") {
    return HEALTHCARE_PATH_PREFIXES.some((prefix) => isPrefixMatch(normalized, prefix))
  }
  return TRANSPORT_LOGISTICS_PATH_PREFIXES.some((prefix) => isPrefixMatch(normalized, prefix))
}
