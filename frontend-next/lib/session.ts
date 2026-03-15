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

export function getSessionUser(): SessionUser | null {
  if (typeof localStorage === "undefined") return null
  const s = localStorage.getItem("sessionUser")
  return s ? JSON.parse(s) : null
}

export function setSessionUser(u: any) {
  if (typeof localStorage === "undefined") return
  localStorage.setItem("sessionUser", JSON.stringify(u))
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
  if (typeof localStorage !== 'undefined') localStorage.removeItem("sessionUser")
}
