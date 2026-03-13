import { getAccessToken, getRefreshToken, setTokens } from "@/lib/tokens"

type ApiFetchOptions = RequestInit & {
  responseType?: "json" | "blob" | "text"
}

function rewriteUrl(url: string): string {
  const u = url.startsWith("/") ? url : `/${url}`

  // Legacy/friendly aliases used across the UI.
  const aliases: Array<[string, string]> = [
    ["/pacientes", "/clinico/paciente"],
    ["/exames", "/clinico/exame"],
    ["/requisicoes", "/clinico/requisicaoanalise"],
    ["/faturas", "/faturamento/fatura"],
    ["/consultas", "/consultas/consulta"],
  ]

  for (const [from, to] of aliases) {
    if (u === from || u.startsWith(`${from}/`)) {
      return u.replace(from, to)
    }
  }

  return u
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null

  const res = await fetch("/api/v1/auth/refresh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  })

  if (!res.ok) return null

  const data = (await res.json()) as any
  if (data?.access) setTokens({ access: data.access })
  return data?.access || null
}

function buildHeaders(options: ApiFetchOptions): HeadersInit {
  const headers: Record<string, string> = {}

  const access = getAccessToken()
  if (access) headers["Authorization"] = `Bearer ${access}`

  // Default JSON headers unless caller overrides or sends FormData.
  const hasContentType =
    !!(options.headers as any)?.["Content-Type"] ||
    !!(options.headers as any)?.["content-type"]
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData

  if (!hasContentType && !isFormData) {
    headers["Content-Type"] = "application/json"
  }

  return { ...headers, ...(options.headers || {}) }
}

async function parseError(res: Response): Promise<Error> {
  try {
    const contentType = res.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const j = await res.json()
      const msg =
        j?.detail ||
        j?.message ||
        (typeof j === "string" ? j : JSON.stringify(j))
      return new Error(msg || res.statusText)
    }
    const text = await res.text()
    return new Error(text || res.statusText)
  } catch {
    return new Error(res.statusText)
  }
}

export async function apiFetch<T = any>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const rewritten = rewriteUrl(url)
  const responseType = options.responseType || "json"

  const doFetch = async (): Promise<Response> => {
    return fetch(`/api/v1${rewritten}`, {
      ...options,
      credentials: "include",
      headers: buildHeaders(options),
    })
  }

  let res = await doFetch()

  if (res.status === 401) {
    const newAccess = await refreshAccessToken()
    if (newAccess) {
      res = await doFetch()
    }
  }

  if (!res.ok) throw await parseError(res)

  if (res.status === 204) return null as unknown as T

  if (responseType === "blob") return (await res.blob()) as unknown as T
  if (responseType === "text") return (await res.text()) as unknown as T

  try {
    return (await res.json()) as unknown as T
  } catch {
    return null as unknown as T
  }
}
