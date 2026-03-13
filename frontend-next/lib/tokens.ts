const ACCESS_KEY = "auth.accessToken"
const REFRESH_KEY = "auth.refreshToken"

export function getAccessToken(): string | null {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(tokens: { access?: string; refresh?: string }) {
  if (typeof localStorage === "undefined") return
  if (tokens.access) localStorage.setItem(ACCESS_KEY, tokens.access)
  if (tokens.refresh) localStorage.setItem(REFRESH_KEY, tokens.refresh)
}

export function clearTokens() {
  if (typeof localStorage === "undefined") return
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

