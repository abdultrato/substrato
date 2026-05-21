export type WorkspaceScope = "education" | "healthcare" | "neutral"

export const WORKSPACE_SCOPE_STORAGE_KEY = "substrato.activeWorkspaceScope"

const EDUCATION_PATH_PREFIX = "/education"
const HEALTHCARE_SWITCH_PATH_PREFIX = "/healthcare"
const NEUTRAL_PATH_PREFIXES = [
  "/workspaces",
  "/resources",
  "/modules",
  "/ai",
  "/admin",
  "/login",
  "/auth",
  "/profile",
  "/settings",
]

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

  if (isPrefixMatch(normalized, EDUCATION_PATH_PREFIX)) {
    return "education"
  }
  if (isPrefixMatch(normalized, HEALTHCARE_SWITCH_PATH_PREFIX)) {
    return "healthcare"
  }
  if (NEUTRAL_PATH_PREFIXES.some((prefix) => isPrefixMatch(normalized, prefix))) {
    return "neutral"
  }
  if (normalized === "/") {
    return "neutral"
  }
  return "healthcare"
}

export function isOperationalScope(scope: WorkspaceScope): scope is "education" | "healthcare" {
  return scope === "education" || scope === "healthcare"
}

export function readStoredWorkspaceScope(): WorkspaceScope | null {
  if (typeof window === "undefined") return null
  const value = (window.localStorage.getItem(WORKSPACE_SCOPE_STORAGE_KEY) || "").trim()
  if (value === "education" || value === "healthcare") return value
  return null
}

export function writeStoredWorkspaceScope(scope: WorkspaceScope): void {
  if (typeof window === "undefined") return
  if (!isOperationalScope(scope)) return
  window.localStorage.setItem(WORKSPACE_SCOPE_STORAGE_KEY, scope)
}

export function resolveWorkspaceScope(pathname: string, storedScope: WorkspaceScope | null): WorkspaceScope {
  const inferred = inferWorkspaceScopeFromPath(pathname)
  const normalized = normalizePathname(pathname)

  // Explicit workspace routes always switch scope.
  if (isPrefixMatch(normalized, EDUCATION_PATH_PREFIX)) return "education"
  if (isPrefixMatch(normalized, HEALTHCARE_SWITCH_PATH_PREFIX)) return "healthcare"

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
  return modules.filter((group) => group.key !== "education")
}

export function isPathAllowedForScope(pathname: string, scope: WorkspaceScope): boolean {
  if (scope === "neutral") return true

  const normalized = normalizePathname(pathname)
  if (normalized === "/") return false
  if (NEUTRAL_PATH_PREFIXES.some((prefix) => isPrefixMatch(normalized, prefix))) return true

  const isEducationPath = isPrefixMatch(normalized, EDUCATION_PATH_PREFIX)
  return scope === "education" ? isEducationPath : !isEducationPath
}

export function workspaceHomeForScope(scope: WorkspaceScope): string {
  if (scope === "education") return "/education"
  if (scope === "healthcare") return "/healthcare"
  return "/workspaces"
}
