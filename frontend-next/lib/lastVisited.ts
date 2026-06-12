// Guarda e recupera a última página visitada para retomar a sessão após
// expiração/término. Apenas caminhos internos são aceites (anti open-redirect).

const STORAGE_KEY = "substrato:ultima_pagina"

const EXCLUDED_PATHS = ["/login", "/access-denied"]

export function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value) return false
  // Apenas caminhos relativos internos: "/x..." mas não "//host" nem esquemas.
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("://")
}

export function rememberLastVisitedPath(path: string) {
  if (!isSafeInternalPath(path)) return
  if (EXCLUDED_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`))) return
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, path)
  } catch {
    // armazenamento indisponível (modo privado, etc.)
  }
}

export function getLastVisitedPath(): string | null {
  try {
    const value = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
    return isSafeInternalPath(value) ? value : null
  } catch {
    return null
  }
}
