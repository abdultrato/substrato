export const INTERNAL_NAVIGATION_INTENT_KEY = "substrato.internalNavigationIntent"
export const INTERNAL_NAVIGATION_INTENT_MAX_AGE_MS = 12000

export type InternalNavigationIntent = {
  path: string
  at: number
}

function trimTrailingSlash(pathname: string): string {
  if (!pathname || pathname === "/") return "/"
  return pathname.endsWith("/") ? pathname.replace(/\/+$/, "") || "/" : pathname
}

export function normalizeNavigationPath(rawPath: string): string {
  if (!rawPath) return "/"

  try {
    const parsed = rawPath.startsWith("http://") || rawPath.startsWith("https://")
      ? new URL(rawPath)
      : new URL(rawPath, "http://local.substrato")

    const pathname = trimTrailingSlash(parsed.pathname || "/")
    const search = parsed.search || ""
    return `${pathname}${search}`
  } catch {
    const fallback = rawPath.startsWith("/") ? rawPath : `/${rawPath}`
    const [pathOnly, query = ""] = fallback.split("?", 2)
    const normalizedPath = trimTrailingSlash(pathOnly)
    return query ? `${normalizedPath}?${query}` : normalizedPath
  }
}

export function createInternalNavigationIntent(
  targetPath: string,
  nowMs: number = Date.now(),
): InternalNavigationIntent {
  return {
    path: normalizeNavigationPath(targetPath),
    at: nowMs,
  }
}

export function serializeInternalNavigationIntent(
  intent: InternalNavigationIntent,
): string {
  return JSON.stringify(intent)
}

export function parseInternalNavigationIntent(
  raw: string | null,
): InternalNavigationIntent | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<InternalNavigationIntent>
    if (!parsed || typeof parsed.path !== "string" || typeof parsed.at !== "number") {
      return null
    }
    return {
      path: normalizeNavigationPath(parsed.path),
      at: parsed.at,
    }
  } catch {
    return null
  }
}

export function shouldShowRestrictionNotice({
  currentPath,
  intentRaw,
  nowMs = Date.now(),
  maxAgeMs = INTERNAL_NAVIGATION_INTENT_MAX_AGE_MS,
}: {
  currentPath: string
  intentRaw: string | null
  nowMs?: number
  maxAgeMs?: number
}): boolean {
  const intent = parseInternalNavigationIntent(intentRaw)
  if (!intent) return true

  if (nowMs < intent.at || nowMs - intent.at > maxAgeMs) {
    return true
  }

  return normalizeNavigationPath(currentPath) !== intent.path
}

export function getPathFromSameOriginHref(
  href: string,
  currentOrigin: string,
): string | null {
  if (!href) return null

  if (href.startsWith("/")) {
    return normalizeNavigationPath(href)
  }

  try {
    const parsed = new URL(href, currentOrigin)
    if (parsed.origin !== currentOrigin) return null
    return normalizeNavigationPath(`${parsed.pathname}${parsed.search}`)
  } catch {
    return null
  }
}
