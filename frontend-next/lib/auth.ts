import { apiFetch } from "./api/index"
import { getSessionUser, setSessionUser } from "./session"

const backendBase =
  (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "").replace(/\/$/, "")

function apiUrl(path: string) {
  return backendBase ? `${backendBase}${path}` : path
}

export async function login(username: string, password: string) {
  // Timeout aumentado para 15s com AbortController separados para cada requisição
  // evita "signal is aborted without reason" (problema de reaproveitar o mesmo AbortController)
  const LOGIN_TIMEOUT_MS = 15000

  // 1. POST para login - seu próprio timeout
  const loginController = new AbortController()
  const loginTimer = setTimeout(() => loginController.abort(), LOGIN_TIMEOUT_MS)

  try {
    const res = await fetch(apiUrl("/api/v1/auth/login/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include",
      signal: loginController.signal,
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
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Timeout no login (backend demorou muito, excedeu 15s)")
    }
    throw e
  } finally {
    clearTimeout(loginTimer)
  }

  // 2. GET para obter dados do usuário - seu próprio timeout independente
  const userController = new AbortController()
  const userTimer = setTimeout(() => userController.abort(), LOGIN_TIMEOUT_MS)

  try {
    // Evita camada extra de refresh/retry na apiFetch para reduzir latência no login.
    const userRes = await fetch(apiUrl("/api/v1/auth/user/"), {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: userController.signal,
    })

    if (!userRes.ok) throw new Error("Falha ao obter sessão")

    const user = await userRes.json()
    if (!user) throw new Error("Falha ao obter sessão")
    setSessionUser(user)
    return user
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Timeout ao buscar perfil (backend demorou muito, excedeu 15s)")
    }
    throw e
  } finally {
    clearTimeout(userTimer)
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
