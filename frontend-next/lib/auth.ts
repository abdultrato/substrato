import { apiFetch } from "./api/index"
import { setSessionUser } from "./session"

export async function login(username: string, password: string) {
  const res = await fetch("/api/v1/auth/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include",
  })

  if (!res.ok) throw new Error("Invalid credentials")

  try {
    const user = await apiFetch("/auth/user/")
    setSessionUser(user)
    return user
  } catch {
    return null
  }
}

export async function fetchCurrentUser() {
  return apiFetch("/auth/user/")
}

export function getUser() {
  return JSON.parse(typeof localStorage !== 'undefined' ? (localStorage.getItem("sessionUser") || "null") : "null")
}

export function isAuthenticated() {
  return !!getUser()
}

export function logout() {
  try {
    fetch("/api/v1/auth/logout/", { method: "POST", credentials: "include" })
  } catch (e) {
    // ignore
  }
  if (typeof localStorage !== 'undefined') localStorage.removeItem("sessionUser")
}
