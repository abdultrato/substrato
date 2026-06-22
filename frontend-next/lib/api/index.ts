import { logout as clearSession } from "../session"
import { beginRequestActivity, finishRequestActivity } from "../requestActivity"
import { reportFrontendApiError, reportFrontendTelemetry } from "../monitoring/telemetry"
import { getCurrentLanguage, toBackendLanguage } from "../language"
import { canonicalizeEndpointPath } from "@/lib/openapi/endpointResolver"
import { sanitizeValidationMessage, summarizeApiErrorPayload } from "@/lib/resources/formErrors"

export type ApiFetchOptions = RequestInit & {
  responseType?: "json" | "blob" | "text"
  /**
   * Timeout em ms para abortar a requisição. Default: 0 (sem timeout automático).
   */
  timeoutMs?: number
  /**
   * Número de tentativas extras quando a requisição for abortada por timeout.
   * Default: 1.
   */
  retryOnTimeout?: number
  /**
   * Habilita/desabilita cache client-side para GET JSON.
   * Default: true.
   */
  clientCache?: boolean
  /**
   * TTL do cache client-side em ms.
   * Default: 15000.
   */
  clientCacheTtlMs?: number
  /**
   * Janela extra (ms) para retornar cache expirado enquanto revalida em background.
   * Default: 120000.
   */
  staleWhileRevalidateMs?: number
  /**
   * Permite servir cache expirado por curto período enquanto revalida em background.
   * Default: true.
   */
  staleWhileRevalidate?: boolean
}
export type ApiListMeta = {
  total?: number
  page?: number
  perPage?: number
  totalPages?: number
  next?: string | null
  previous?: string | null
}

function rewriteUrl(url: string): string {
  const resolved = canonicalizeEndpointPath(url)
  const u = resolved.startsWith("/") ? resolved : `/${resolved}`

  // Telemetria de erros e listagem canónicas (sem alias PT para evitar ambiguidades).
  if (u === "/monitoring/error" || u === "/monitoring/error/") return "/monitoring/error"
  if (u.startsWith("/monitoring/error/")) return u
  if (u === "/monitoring/telemetry" || u === "/monitoring/telemetry/") return "/monitoring/telemetry"
  if (u.startsWith("/monitoring/telemetry/")) return u

  // Audit endpoints are canonical as /audit on the backend.
  if (u === "/audit" || u.startsWith("/audit/")) return u

  // Canonical frontend URLs are English; rewrite to backend resources where needed.
  if (u === "/consultations" || u === "/consultations/") return "/consultations/consultation"
  if (u.startsWith("/consultations/")) {
    const rest = u.slice("/consultations/".length)
    const firstSeg = rest.split("/")[0] || ""
    const isNumericId = /^\d+$/.test(firstSeg)
    const isConsultationCollectionAction = new Set(["schedule", "price"]).has(firstSeg)
    if (isNumericId || isConsultationCollectionAction) {
      return u.replace("/consultations", "/consultations/consultation")
    }
  }

  const mappings: Array<[string, string]> = [
    ["/patients", "/clinical/patient"],
    ["/exams", "/clinical/exam"],
    ["/medical-exams", "/clinical/medicalexam"],
    ["/requests", "/clinical/labrequest"],
    ["/invoices", "/billing/invoice"],
    ["/invoice-items", "/billing/invoiceitem"],
    ["/companies", "/external_entities/empresa"],
    ["/entities", "/external_entities/empresa"],
    ["/payments/payment", "/payments/payment"],
    ["/payments/receipt", "/payments/receipt"],
    ["/payments/transaction", "/payments/transaction"],
    ["/payments/reconciliation", "/payments/reconciliation"],
    ["/payments", "/payments/payment"],
    ["/receipts", "/payments/receipt"],
    ["/transactions", "/payments/transaction"],
    ["/reconciliations", "/payments/reconciliation"],
    ["/medical-records/registro", "/medical_records/record"],
    ["/medical-records/record", "/medical_records/record"],
    ["/medical-records", "/medical_records"],

  ]

  for (const [from, to] of mappings) {
    if (u === from || u.startsWith(`${from}/`)) {
      return u.replace(from, to)
    }
  }

  return u
}

let _refreshInFlight: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (_refreshInFlight) return _refreshInFlight
  _refreshInFlight = (async () => {
    try {
      const res = await fetch("/api/v1/auth/refresh/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": toBackendLanguage(getCurrentLanguage()),
        },
        credentials: "include",
      })
      // Tokens são enviados em cookies HttpOnly; corpo contém apenas session_id.
      return res.ok ? "refreshed" : null
    } catch {
      return null
    }
  })().finally(() => {
    _refreshInFlight = null
  })
  return _refreshInFlight
}

function buildHeaders(options: ApiFetchOptions): HeadersInit {
  const headers = new Headers(options.headers || {})
  const hasContentType = headers.has("Content-Type")
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData

  if (!hasContentType && !isFormData) {
    headers.set("Content-Type", "application/json")
  }

  if (!headers.has("Accept-Language")) {
    headers.set("Accept-Language", toBackendLanguage(getCurrentLanguage()))
  }

  return headers
}

function shouldSkipErrorTelemetry(url?: string): boolean {
  return !!url && url.includes("/monitoring/telemetry")
}

function emitApiErrorTelemetry(params: {
  requestUrl?: string
  method?: string
  statusCode: number
  message: string
  responseBody?: unknown
}) {
  if (typeof window === "undefined") return
  if (shouldSkipErrorTelemetry(params.requestUrl)) return
  reportFrontendApiError({
    requestUrl: params.requestUrl || "",
    method: params.method || "GET",
    statusCode: params.statusCode,
    message: params.message,
    responseBody: params.responseBody,
  })
}

async function parseError(
  res: Response,
  context?: { requestUrl?: string; method?: string }
): Promise<Error> {
  const withStatus = (error: Error): Error => {
    ;(error as Error & { status?: number }).status = res.status
    return error
  }

  try {
    const contentType = res.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const j = await res.json()
      // DRF ValidationError costuma vir como {campo: ["msg"], ...}
      if (!j?.detail && !j?.message && j && typeof j === "object" && !Array.isArray(j)) {
        const entries = Object.entries(j)
        if (entries.length) {
          const [field, value] = entries[0]
          const firstMessage =
            Array.isArray(value) && value.length
              ? String(value[0])
              : typeof value === "string"
                ? value
                : JSON.stringify(value)
          const err = new Error(`${field}: ${sanitizeValidationMessage(firstMessage)}`)
            ; (err as any).validation = j
          emitApiErrorTelemetry({
            requestUrl: context?.requestUrl,
            method: context?.method,
            statusCode: res.status,
            message: err.message,
            responseBody: j,
          })
          return withStatus(err)
        }
      }
      const msg = summarizeApiErrorPayload(j, res.statusText, { endpoint: context?.requestUrl })
      const err = new Error(msg || res.statusText)
        ; (err as any).validation = j?.validationErrors || j
        ; (err as any).problem = j
      emitApiErrorTelemetry({
        requestUrl: context?.requestUrl,
        method: context?.method,
        statusCode: res.status,
        message: err.message,
        responseBody: j,
      })
      return withStatus(err)
    }
    const text = await res.text()
    emitApiErrorTelemetry({
      requestUrl: context?.requestUrl,
      method: context?.method,
      statusCode: res.status,
      message: text || res.statusText,
      responseBody: text,
    })
    return withStatus(new Error(text || res.statusText))
  } catch {
    emitApiErrorTelemetry({
      requestUrl: context?.requestUrl,
      method: context?.method,
      statusCode: res.status,
      message: res.statusText || "Erro de API",
    })
    return withStatus(new Error(res.statusText))
  }
}

export async function apiFetch<T = any>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const rewritten = rewriteUrl(url)
  const responseType = options.responseType || "json"
  // Por padrão não abortamos requisições automaticamente (0 = sem timeout).
  // Chamadores podem fornecer `timeoutMs` quando desejarem comportamento de timeout.
  const timeoutMs = options.timeoutMs ?? 0
  const maxRetries = Math.max(0, (options.retryOnTimeout ?? 1))
  const method = methodOf(options)

  const useClientCache = shouldUseClientCache(rewritten, options, responseType)
  const cacheKey = useClientCache ? buildClientCacheKey(rewritten, responseType) : null
  const cacheTtlMs = options.clientCacheTtlMs ?? DEFAULT_CLIENT_CACHE_TTL_MS
  const staleWhileRevalidateMs = options.staleWhileRevalidateMs ?? DEFAULT_STALE_WHILE_REVALIDATE_MS
  const allowStaleWhileRevalidate = options.staleWhileRevalidate !== false

  if (cacheKey) {
    const cached = readClientCache(cacheKey)
    if (cached.hit && cached.state === "fresh") {
      return cached.value as T
    }
    if (cached.hit && cached.state === "stale" && allowStaleWhileRevalidate) {
      if (!inFlightGetRequests.has(cacheKey)) {
        const refreshCacheGeneration = clientCacheGeneration
        const refreshPromise = runRequest(false)
          .then((result) => {
            if (refreshCacheGeneration === clientCacheGeneration) {
              writeClientCache(cacheKey, result, cacheTtlMs, staleWhileRevalidateMs)
            }
            return result
          })
          .catch(() => cached.value)
          .finally(() => {
            inFlightGetRequests.delete(cacheKey)
          })
        inFlightGetRequests.set(cacheKey, refreshPromise as Promise<unknown>)
      }
      return cached.value as T
    }
    const inFlight = inFlightGetRequests.get(cacheKey)
    if (inFlight) {
      return (await inFlight) as T
    }
  }

  async function runRequest(trackActivity = true): Promise<T> {
    const requestActivity = trackActivity ? beginRequestActivity(rewritten, method) : null

    try {
      // Use o signal fornecido ou crie um novo controller
      // Tentativas: primeira + retries em caso de AbortError por timeout
      let attempt = 0
      let lastErr: any = null
      for (; attempt <= maxRetries; attempt++) {
        // Use o signal fornecido ou crie um novo controller a cada tentativa
        const shouldCreateController = !options.signal
        const controller = shouldCreateController ? new AbortController() : undefined
        const signal = options.signal || controller?.signal

        let timer: ReturnType<typeof setTimeout> | undefined = undefined

        const doFetch = async (): Promise<Response> => {
          return fetch(`/api/v1${rewritten}`, {
            ...options,
            credentials: "include",
            headers: buildHeaders(options),
            signal,
          })
        }

        try {
          // Apenas define timeout se criamos o controller
          if (shouldCreateController && timeoutMs > 0) {
            timer = setTimeout(() => controller?.abort(), timeoutMs)
          }

          let res: Response
          try {
            res = await doFetch()
          } catch (err) {
            // Se abort foi causado pelo nosso controller, tentar novamente (se houver retries)
            if ((err as any)?.name === "AbortError") {
              lastErr = err
              // limpeza e log para diagnóstico
              if (timer) {
                clearTimeout(timer)
              }
              console.warn(`[apiFetch] AbortError on attempt ${attempt + 1}/${maxRetries + 1} for ${rewritten}`)
              // se ainda restam tentativas, esperar um pequeno backoff e tentar de novo
              if (attempt < maxRetries) {
                const backoff = 200 * (attempt + 1)
                await new Promise((r) => setTimeout(r, backoff))
                continue
              }
              const e = new Error("Requisição abortada.")
                ; (e as any).name = "AbortError"
              throw e
            }
            if (!shouldSkipErrorTelemetry(rewritten)) {
              reportFrontendTelemetry({
                event_type: "frontend.network_error",
                message: (err as any)?.message || "Falha de rede",
                error_name: (err as any)?.name || "NetworkError",
                exception_class: (err as any)?.name || "NetworkError",
                request_url: rewritten,
                request_method: method,
                metadata: {
                  stage: "doFetch",
                },
              })
            }
            throw err
          }

          if (res.status === 401) {
            const newAccess = await refreshAccessToken()
            if (newAccess) {
              try {
                res = await doFetch()
              } catch (err) {
                if ((err as any)?.name === "AbortError") {
                  lastErr = err
                  if (attempt < maxRetries) {
                    const backoff = 200 * (attempt + 1)
                    await new Promise((r) => setTimeout(r, backoff))
                    continue
                  }
                  throw new Error("Requisição abortada.")
                }
                throw err
              }
            } else {
              // Redirect por sessão expirada desactivado temporariamente.
              // Para reactivar: descomentar clearSession() e window.location.href abaixo.
              throw new Error("Sessão expirada. Faça login novamente.")
            }
          }

          if (!res.ok) {
            throw await parseError(res, {
              requestUrl: rewritten,
              method,
            })
          }

          if (res.status === 204) {
            if (method !== "GET") invalidateClientCacheByPath(rewritten)
            return null as unknown as T
          }

          let parsed: T
          if (responseType === "blob") parsed = (await res.blob()) as unknown as T
          else if (responseType === "text") parsed = (await res.text()) as unknown as T
          else {
            try {
              parsed = (await res.json()) as unknown as T
            } catch {
              parsed = null as unknown as T
            }
          }

          if (method !== "GET") invalidateClientCacheByPath(rewritten)
          return parsed
        } finally {
          // Apenas limpa timer se o criamos
          if (timer) clearTimeout(timer)
          // Não faz abort aqui pois a requisição já foi completada
        }
      }

      if (lastErr) throw lastErr
      throw new Error("Falha ao processar a requisição.")
    } finally {
      if (requestActivity) finishRequestActivity(requestActivity)
    }
  }

  if (!cacheKey) {
    return runRequest()
  }

  const requestCacheGeneration = clientCacheGeneration
  const requestPromise = runRequest()
    .then((result) => {
      if (requestCacheGeneration === clientCacheGeneration) {
        writeClientCache(cacheKey, result, cacheTtlMs, staleWhileRevalidateMs)
      }
      return result
    })
    .finally(() => {
      inFlightGetRequests.delete(cacheKey)
    })

  inFlightGetRequests.set(cacheKey, requestPromise as Promise<unknown>)
  return (await requestPromise) as T
}

const DEFAULT_CLIENT_CACHE_TTL_MS = 30000
const DEFAULT_STALE_WHILE_REVALIDATE_MS = 300000

type ClientCacheEntry = {
  value: unknown
  expiresAt: number
  staleUntil: number
}

const clientGetCache = new Map<string, ClientCacheEntry>()
const inFlightGetRequests = new Map<string, Promise<unknown>>()
let clientCacheGeneration = 0

function methodOf(options: ApiFetchOptions): string {
  return (options.method || "GET").toUpperCase()
}

function shouldUseClientCache(
  rewritten: string,
  options: ApiFetchOptions,
  responseType: "json" | "blob" | "text"
): boolean {
  if (methodOf(options) !== "GET") return false
  if (responseType !== "json") return false
  if (options.cache === "no-store") return false
  if (options.signal) return false
  if (options.clientCache === false) return false
  if (rewritten.startsWith("/auth/")) return false
  return true
}

function buildClientCacheKey(
  rewritten: string,
  responseType: "json" | "blob" | "text"
): string {
  return `GET:${rewritten}:${responseType}`
}

function readClientCache(
  key: string
): { hit: true; state: "fresh" | "stale"; value: unknown } | { hit: false } {
  const cached = clientGetCache.get(key)
  if (!cached) return { hit: false }
  const now = Date.now()
  if (cached.expiresAt > now) {
    return { hit: true, state: "fresh", value: cached.value }
  }
  if (cached.staleUntil > now) {
    return { hit: true, state: "stale", value: cached.value }
  }
  if (cached.staleUntil <= now) {
    clientGetCache.delete(key)
    return { hit: false }
  }
  return { hit: false }
}

function writeClientCache(
  key: string,
  value: unknown,
  ttlMs: number,
  staleWhileRevalidateMs: number
) {
  const safeTtlMs = Math.max(1000, ttlMs)
  const safeSWRMs = Math.max(0, staleWhileRevalidateMs)
  const now = Date.now()
  clientGetCache.set(key, {
    value,
    expiresAt: now + safeTtlMs,
    staleUntil: now + safeTtlMs + safeSWRMs,
  })
}

function normalizeCachePath(path: string): string {
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`
  const noQuery = withLeadingSlash.split("?")[0]
  const trimmedTrailingSlash = noQuery.replace(/\/+$/, "")
  return trimmedTrailingSlash || "/"
}

function invalidateClientCacheByPath(path: string) {
  const target = normalizeCachePath(path)
  let invalidated = false
  for (const key of clientGetCache.keys()) {
    const parts = key.split(":")
    const cachedPath = normalizeCachePath(parts[1] || "")
    if (cachePathMatchesMutation(cachedPath, target)) {
      clientGetCache.delete(key)
      invalidated = true
    }
  }
  for (const key of inFlightGetRequests.keys()) {
    const parts = key.split(":")
    const cachedPath = normalizeCachePath(parts[1] || "")
    if (cachePathMatchesMutation(cachedPath, target)) {
      inFlightGetRequests.delete(key)
      invalidated = true
    }
  }
  if (invalidated) clientCacheGeneration += 1
}

function cachePathMatchesMutation(cachedPath: string, target: string): boolean {
  return (
    cachedPath === target ||
    cachedPath.startsWith(`${target}/`) ||
    target.startsWith(`${cachedPath}/`)
  )
}

function unwrapMaybeData(v: any): any {
  // Some endpoints (or legacy wrappers) may return {data: ...}.
  if (v && typeof v === "object" && "data" in v) return (v as any).data
  return v
}

export function extractResults<T = any>(res: any): T[] {
  const r = unwrapMaybeData(res)
  if (Array.isArray(r)) return r as T[]
  if (r && typeof r === "object" && Array.isArray((r as any).results)) {
    return (r as any).results as T[]
  }
  return []
}

export function extractListMeta(res: any): ApiListMeta {
  const r = unwrapMaybeData(res)

  if (Array.isArray(r)) {
    return {
      total: r.length,
      page: 1,
      perPage: r.length,
      totalPages: 1,
      next: null,
      previous: null,
    }
  }

  const meta = (r as any)?.meta
  const links = (r as any)?.links

  const total: number | undefined =
    typeof (r as any)?.count === "number"
      ? (r as any).count
      : typeof (r as any)?.total === "number"
        ? (r as any).total
        : typeof meta?.total === "number"
          ? meta.total
          : undefined

  const page: number | undefined =
    typeof (r as any)?.page === "number"
      ? (r as any).page
      : typeof meta?.page === "number"
        ? meta.page
        : undefined

  const perPage: number | undefined =
    typeof (r as any)?.per_page === "number"
      ? (r as any).per_page
      : typeof meta?.per_page === "number"
        ? meta.per_page
        : undefined

  const totalPagesRaw: number | undefined =
    typeof (r as any)?.total_pages === "number"
      ? (r as any).total_pages
      : typeof meta?.total_pages === "number"
        ? meta.total_pages
        : undefined

  const next: string | null | undefined =
    (r as any)?.next ?? links?.next ?? null
  const previous: string | null | undefined =
    (r as any)?.previous ?? links?.previous ?? null

  const totalPages =
    typeof totalPagesRaw === "number"
      ? totalPagesRaw
      : typeof total === "number" && typeof perPage === "number" && perPage > 0
        ? Math.max(1, Math.ceil(total / perPage))
        : undefined

  return { total, page, perPage, totalPages, next, previous }
}

export function extractTotalCount(res: any): number {
  const meta = extractListMeta(res)
  if (typeof meta.total === "number") return meta.total
  const items = extractResults<any>(res)
  return Array.isArray(items) ? items.length : 0
}

function addQueryParams(
  url: string,
  params: Record<string, string | number | boolean | null | undefined>
): string {
  const u = url.startsWith("/") ? url : `/${url}`
  const parsed = new URL(u, "http://local")

  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue
    parsed.searchParams.set(k, String(v))
  }

  const qs = parsed.searchParams.toString()
  return `${parsed.pathname}${qs ? `?${qs}` : ""}${parsed.hash || ""}`
}

function isProbablyPaginated(res: any): boolean {
  const r = unwrapMaybeData(res)
  if (!r || typeof r !== "object" || Array.isArray(r)) return false
  if (!Array.isArray((r as any).results)) return false

  // DRF default pagination or our corporate pagination shapes.
  return (
    typeof (r as any).count === "number" ||
    typeof (r as any).total === "number" ||
    typeof (r as any).page === "number" ||
    typeof (r as any).per_page === "number" ||
    typeof (r as any).total_pages === "number" ||
    "next" in r ||
    "previous" in r ||
    ((r as any).meta && typeof (r as any).meta === "object") ||
    ((r as any).links && typeof (r as any).links === "object")
  )
}

export async function apiFetchList<T = any>(
  url: string,
  opts: {
    page?: number
    pageSize?: number
    query?: Record<string, string | number | boolean | null | undefined>
    /**
     * Quando o backend devolve a coleção inteira (sem paginação no servidor),
     * fatia para a janela da página pedida (no máximo `pageSize` itens) e
     * preenche a meta (total/totalPages) a partir do tamanho real. Opt-in:
     * só usar em listas com UI de paginação — NÃO em chamadas que carregam
     * muitas opções para dropdowns/seleções.
     */
    clientPaginate?: boolean
  } & ApiFetchOptions = {}
): Promise<{ items: T[]; meta: ApiListMeta; raw: any }> {
  const { page, pageSize, query, clientPaginate, ...fetchOptions } = opts
  const cleanedUrl = String(url || "")
    .replace(/\{page\}/g, "")
    .replace(/\{search\}/g, "")
    .replace(/\{page_size\}/g, "")

  const urlWithPagingOrQuery =
    page || pageSize || (query && Object.keys(query).length)
      ? addQueryParams(cleanedUrl, {
          page,
          page_size: pageSize,
          ...(query || {}),
        })
      : cleanedUrl

  const raw = await apiFetch<any>(urlWithPagingOrQuery, fetchOptions)
  const items = extractResults<T>(raw)
  const meta = extractListMeta(raw)

  if (clientPaginate && pageSize && pageSize > 0) {
    const total = typeof meta.total === "number" ? meta.total : items.length
    // O servidor já paginou se devolveu menos itens do que o total.
    const serverPaginated = total > items.length
    if (!serverPaginated) {
      const currentPage = page && page > 0 ? page : 1
      const start = (currentPage - 1) * pageSize
      return {
        items: items.slice(start, start + pageSize),
        meta: {
          ...meta,
          total: items.length,
          page: currentPage,
          perPage: pageSize,
          totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
        },
        raw,
      }
    }
  }

  return { items, meta, raw }
}

export async function apiFetchAll<T = any>(
  url: string,
  opts: { pageSize?: number; maxPages?: number } & ApiFetchOptions = {}
): Promise<T[]> {
  const { pageSize = 100, maxPages = 50, ...fetchOptions } = opts

  const first = await apiFetch<any>(addQueryParams(url, { page: 1, page_size: pageSize }), fetchOptions)
  const unwrapped = unwrapMaybeData(first)
  if (Array.isArray(unwrapped)) return unwrapped as T[]

  if (!isProbablyPaginated(first)) {
    // Not a conventional paginated response. Best effort: treat as single-page results.
    return extractResults<T>(first)
  }

  const all: T[] = []

  // Page 1
  const firstItems = extractResults<T>(first)
  all.push(...firstItems)

  const firstMeta = extractListMeta(first)
  const totalPagesKnown = firstMeta.totalPages

  // If API signals there are no further pages, stop early.
  if (totalPagesKnown === 1) return all
  if (firstMeta.next === null && typeof totalPagesKnown !== "number") {
    // Explicit "no next" and no total pages: single page.
    return all
  }

  for (let page = 2; page <= maxPages; page++) {
    if (typeof totalPagesKnown === "number" && page > totalPagesKnown) break

    const { items, meta } = await apiFetchList<T>(url, {
      page,
      pageSize,
      ...fetchOptions,
    })

    if (!items.length) break
    all.push(...items)

    // Prefer explicit navigation signals.
    if (meta.next === null || meta.next === "") break

    // Fallback heuristic when server does not expose meta.
    if (
      meta.next === undefined &&
      meta.previous === undefined &&
      meta.totalPages === undefined &&
      meta.total === undefined &&
      items.length < pageSize
    ) {
      break
    }
  }

  return all
}

export function __clearApiClientCacheForTests() {
  clearApiClientCache()
}

export function clearApiClientCache() {
  clientGetCache.clear()
  inFlightGetRequests.clear()
  clientCacheGeneration += 1
}
