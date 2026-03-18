import { apiFetch } from "./api/index"
import { getSessionUser, setSessionUser } from "./session"

export async function login(username: string, password: string) {
  const res = await fetch("/api/v1/auth/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include",
  })

  if (!res.ok) throw new Error("Invalid credentials")

  const user = await apiFetch("/auth/user/")
  if (!user) throw new Error("Falha ao obter sessão")
  setSessionUser(user)
  return user
}

export async function fetchCurrentUser() {
  return apiFetch("/auth/user/")
}

export function getUser() {
  return getSessionUser()
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
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem("sessionUser")
}
