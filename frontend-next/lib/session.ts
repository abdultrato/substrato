export type SessionUser = {
  id: number
  username?: string
  full_name?: string
  groups?: string[]
}

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
  return u.full_name || (u.username || null)
}

export function isAuthenticated() {
  return !!getSessionUser()
}

export function logout() {
  try {
    fetch("/api/v1/auth/logout/", { method: "POST", credentials: "include" })
  } catch {}
  if (typeof localStorage !== 'undefined') localStorage.removeItem("sessionUser")
}
