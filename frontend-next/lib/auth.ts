import { apiFetch } from "./api/index"
import { beginRequestActivity, finishRequestActivity } from "./requestActivity"
import { getSessionUser, setSessionUser } from "./session"
import { getCurrentLanguage, toBackendLanguage } from "./language"

const backendBase =
  (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "").replace(/\/$/, "")

const DEFAULT_AUTH_REQUEST_TIMEOUT_MS = 60_000
const configuredAuthRequestTimeoutMs = Number(process.env.NEXT_PUBLIC_AUTH_REQUEST_TIMEOUT_MS)
const AUTH_REQUEST_TIMEOUT_MS =
  Number.isFinite(configuredAuthRequestTimeoutMs) && configuredAuthRequestTimeoutMs > 0
    ? configuredAuthRequestTimeoutMs
    : DEFAULT_AUTH_REQUEST_TIMEOUT_MS
const AUTH_REQUEST_TIMEOUT_SECONDS = Math.ceil(AUTH_REQUEST_TIMEOUT_MS / 1000)

function apiUrl(path: string) {
  return backendBase ? `${backendBase}${path}` : path
}

function authTimeoutMessage(action: "login" | "profile") {
  const label = action === "login" ? "login" : "buscar perfil"
  return `Timeout ao ${label} (backend demorou muito, excedeu ${AUTH_REQUEST_TIMEOUT_SECONDS}s)`
}

export async function login(username: string, password: string) {
  // AbortController separados evitam reaproveitar signal abortado entre login e perfil.
  // 1. POST para login - seu próprio timeout
  const loginController = new AbortController()
  const loginTimer = setTimeout(() => loginController.abort(), AUTH_REQUEST_TIMEOUT_MS)
  const loginActivity = beginRequestActivity("/auth/login/", "POST")

  try {
    const res = await fetch(apiUrl("/api/v1/auth/login/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": toBackendLanguage(getCurrentLanguage()),
      },
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
      throw new Error(authTimeoutMessage("login"))
    }
    throw e
  } finally {
    clearTimeout(loginTimer)
    finishRequestActivity(loginActivity)
  }

  // 2. GET para obter dados do usuário - seu próprio timeout independente
  const userController = new AbortController()
  const userTimer = setTimeout(() => userController.abort(), AUTH_REQUEST_TIMEOUT_MS)
  const userActivity = beginRequestActivity("/auth/user/", "GET")

  try {
    // Evita camada extra de refresh/retry na apiFetch para reduzir latência no login.
    const userRes = await fetch(apiUrl("/api/v1/auth/user/"), {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": toBackendLanguage(getCurrentLanguage()),
      },
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
      throw new Error(authTimeoutMessage("profile"))
    }
    throw e
  } finally {
    clearTimeout(userTimer)
    finishRequestActivity(userActivity)
  }
}

export async function fetchCurrentUser() {
  return apiFetch("/auth/user/")
}

/**
 * Renova a sessão (desliza a janela de 30 min). O backend rotaciona o refresh
 * token e atualiza os cookies HttpOnly + a sessão server-side. Best-effort.
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("/api/v1/auth/refresh/"), {
      method: "POST",
      credentials: "include",
      headers: { "Accept-Language": toBackendLanguage(getCurrentLanguage()) },
      cache: "no-store",
    })
    return res.ok
  } catch {
    return false
  }
}

export function getUser() {
  return getSessionUser()
}

export function isAuthenticated() {
  return !!getUser()
}

export function logout() {
  try {
    fetch("/api/v1/auth/logout/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Accept-Language": toBackendLanguage(getCurrentLanguage()),
      },
    })
  } catch (e) {
    // ignore
  }
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem("sessionUser")
}
