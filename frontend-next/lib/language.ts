export type AppLanguage = "pt" | "en"

export const LANGUAGE_STORAGE_KEY = "substrato_language"
export const LANGUAGE_EXPLICIT_STORAGE_KEY = "substrato_language_explicit"
export const LANGUAGE_COOKIE_NAME = "django_language"
export const DEFAULT_LANGUAGE: AppLanguage = "pt"

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function normalizeLanguage(input?: string | null): AppLanguage {
  const value = (input || "").trim().toLowerCase()
  if (value.startsWith("en")) return "en"
  return "pt"
}

export function getStoredLanguage(): AppLanguage {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE

  let explicitSelection = false
  try {
    explicitSelection = window.localStorage.getItem(LANGUAGE_EXPLICIT_STORAGE_KEY) === "1"
  } catch {
    explicitSelection = false
  }

  // Product rule: Portuguese is the default. A stored/cookie language only
  // counts after the user has explicitly used the language switch.
  if (!explicitSelection) return DEFAULT_LANGUAGE

  try {
    const local = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (local) return normalizeLanguage(local)
  } catch {
    // ignore
  }

  const cookieValue = readCookie(LANGUAGE_COOKIE_NAME)
  if (cookieValue) return normalizeLanguage(cookieValue)

  return DEFAULT_LANGUAGE
}

export function persistLanguageClient(language: AppLanguage, options: { explicit?: boolean } = {}): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = language
    document.cookie = `${LANGUAGE_COOKIE_NAME}=${encodeURIComponent(language)}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
      if (options.explicit) {
        window.localStorage.setItem(LANGUAGE_EXPLICIT_STORAGE_KEY, "1")
      }
    } catch {
      // ignore
    }
  }
}

export function getCurrentLanguage(): AppLanguage {
  return getStoredLanguage()
}

export function toBackendLanguage(language: AppLanguage): "pt" | "en" {
  return language === "en" ? "en" : "pt"
}
