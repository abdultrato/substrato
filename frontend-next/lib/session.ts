export type SessionUser = {
  id: number
  username?: string
  full_name?: string
  first_name?: string
  last_name?: string
  email?: string
  telefone?: string
  foto_url?: string | null
  groups?: string[]
}

import { clearTokens } from "./tokens"

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null
  // Prefer localStorage to survive reloads on mobile browsers.
  if (typeof localStorage !== "undefined") return localStorage
  if (typeof sessionStorage !== "undefined") return sessionStorage
  return null
}

export function getSessionUser(): SessionUser | null {
  const storage = getStorage()
  if (!storage) return null
  const s = storage.getItem("sessionUser")
  if (!s) return null
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

export function setSessionUser(u: any) {
  const storage = getStorage()
  if (!storage) return
  storage.setItem("sessionUser", JSON.stringify(u))
}

export function clearSessionUser() {
  if (typeof localStorage !== "undefined") localStorage.removeItem("sessionUser")
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("sessionUser")
}

export function getFullName(): string | null {
  const u = getSessionUser()
  if (!u) return null
  const composed =
    [u.first_name || "", u.last_name || ""].join(" ").trim() || null
  return u.full_name || composed || (u.username || null)
}

export function isAuthenticated() {
  return !!getSessionUser()
}

export function logout() {
  try {
    fetch("/api/v1/auth/logout/", { method: "POST", credentials: "include" })
  } catch {}
  clearTokens()
  clearSessionUser()
}
