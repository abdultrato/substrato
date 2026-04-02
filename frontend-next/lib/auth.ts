import { apiFetch } from "./api/index"
import { getSessionUser, setSessionUser } from "./session"

const backendBase =
  (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "").replace(/\/$/, "")

function apiUrl(path: string) {
  return backendBase ? `${backendBase}${path}` : path
}

export async function login(username: string, password: string) {
  // Timeout curto para evitar ficar 20s esperando resposta do backend.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)

  try {
    const res = await fetch(apiUrl("/api/v1/auth/login/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include",
      signal: controller.signal,
    })

    if (!res.ok) {
      try {
        const body = await res.json()
        const detail = body?.detail || body?.message
        throw new Error(detail || "Credenciais inválidas")
      } catch {
        throw new Error("Credenciais inválidas")
      }
    }

    // Evita camada extra de refresh/retry na apiFetch para reduzir latência no login.
    const userRes = await fetch(apiUrl("/api/v1/auth/user/"), {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })

    if (!userRes.ok) throw new Error("Falha ao obter sessão")

    const user = await userRes.json()
    if (!user) throw new Error("Falha ao obter sessão")
    setSessionUser(user)
    return user
  } finally {
    clearTimeout(timer)
  }
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
