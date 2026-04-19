import { logout as clearSession } from "../session"

export type ApiFetchOptions = RequestInit & {
  responseType?: "json" | "blob" | "text"
  /**
   * Timeout em ms para abortar a requisição. Default: 8000.
   */
  timeoutMs?: number
  /**
   * Número de tentativas extras quando a requisição for abortada por timeout.
   * Default: 1 (uma nova tentativa).
   */
  retryOnTimeout?: number
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
  const u = url.startsWith("/") ? url : `/${url}`

  // Friendly aliases kept at the UI layer, rewritten to the English API routes.
  if (u === "/consultations" || u === "/consultations/") return "/consultations/consultation"
  if (u.startsWith("/consultations/")) {
    const rest = u.slice("/consultations/".length)
    const firstSeg = rest.split("/")[0] || ""
    const isNumericId = /^\d+$/.test(firstSeg)
    const isConsultationCollectionAction = new Set(["agenda", "preco"]).has(firstSeg)
    if (isNumericId || isConsultationCollectionAction) {
      return u.replace("/consultations", "/consultations/consultation")
    }
  }

  const aliases: Array<[string, string]> = [
    ["/patients", "/clinical/patient"],
    ["/pacientes", "/clinical/patient"],
    ["/pacientes/", "/clinical/patient"],
    ["/exams", "/clinical/exam"],
    ["/exames", "/clinical/exam"],
    ["/exames/", "/clinical/exam"],
    ["/medical-exams", "/clinical/medicalexam"],
    ["/exames-medicos", "/clinical/medicalexam"],
    ["/exames-medicos/", "/clinical/medicalexam"],
    ["/lab-requests", "/clinical/labrequest"],
    ["/requisicoes", "/clinical/labrequest"],
    ["/requisicoes/", "/clinical/labrequest"],
    ["/invoices", "/billing/invoice"],
    ["/faturas", "/billing/invoice"],
    ["/faturas/", "/billing/invoice"],
    ["/companies", "/entities/company"],
    ["/entidades/empresa", "/entities/company"],
    ["/entidades", "/entities/company"],
    ["/entidades/", "/entities/company"],
    ["/payments/payment", "/payments/payment"],
    ["/pagamentos", "/payments/payment"],
    ["/pagamentos/", "/payments/payment"],
    ["/payments/recibo", "/payments/recibo"],
    ["/recibos", "/payments/recibo"],
    ["/recibos/", "/payments/recibo"],
    ["/payments/transaction", "/payments/transaction"],
    ["/transactions", "/payments/transaction"],
    ["/transactions/", "/payments/transaction"],
    ["/billing/invoiceitem", "/billing/invoiceitem"],
    ["/itens-fatura", "/billing/invoiceitem"],
    ["/itens-fatura/", "/billing/invoiceitem"],
    ["/recepcao", "/reception"],
    ["/recepcao/", "/reception"],
    ["/recepcao/workspace", "/reception/workspace"],
    ["/prontuario", "/medical_records"],
    ["/prontuario/", "/medical_records"],
    ["/prontuario/registro", "/medical_records/record"],
    ["/prontuario/registro/", "/medical_records/record/"],
  ]

  for (const [from, to] of aliases) {
    if (u === from || u.startsWith(`${from}/`)) {
      return u.replace(from, to)
    }
  }

  return u
}

async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch("/api/v1/auth/refresh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  })

  if (!res.ok) return null

  // Tokens são enviados em cookies HttpOnly; corpo contém apenas session_id.
  return "refreshed"
}

function buildHeaders(options: ApiFetchOptions): HeadersInit {
  const headers: Record<string, string> = {}

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
          const err = new Error(`${field}: ${firstMessage}`)
            ; (err as any).validation = j
          return withStatus(err)
        }
      }
      const msg =
        j?.detail ||
        j?.message ||
        (typeof j === "string" ? j : JSON.stringify(j))
      const err = new Error(msg || res.statusText)
        ; (err as any).validation = j
      return withStatus(err)
    }
    const text = await res.text()
    return withStatus(new Error(text || res.statusText))
  } catch {
    return withStatus(new Error(res.statusText))
  }
}

export async function apiFetch<T = any>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const rewritten = rewriteUrl(url)
  // Log rewritten URL for debugging routing mismatches (dev-time only)
  try {
    // eslint-disable-next-line no-console
    console.debug(`[apiFetch] requesting /api/v1${rewritten} from ${url}`)
  } catch {
    // ignore
  }
  const responseType = options.responseType || "json"
  // Por padrão não abortamos requisições automaticamente (0 = sem timeout).
  // Chamadores podem fornecer `timeoutMs` quando desejarem comportamento de timeout.
  const timeoutMs = options.timeoutMs ?? 0
  const maxRetries = Math.max(0, (options.retryOnTimeout ?? 1))

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
          // Sessão inválida/expirada: limpa client-side e envia para login.
          try {
            clearSession()
          } catch {
            // ignore
          }
          if (typeof window !== "undefined") {
            const next = encodeURIComponent(window.location.pathname + window.location.search)
            window.location.href = `/login?next=${next}`
          }
          throw new Error("Sessão expirada. Faça login novamente.")
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
    } finally {
      // Apenas limpa timer se o criamos
      if (timer) clearTimeout(timer)
      // Não faz abort aqui pois a requisição já foi completada
    }
  }
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
  opts: { page?: number; pageSize?: number } & ApiFetchOptions = {}
): Promise<{ items: T[]; meta: ApiListMeta; raw: any }> {
  const { page, pageSize, ...fetchOptions } = opts
  const urlWithPaging =
    page || pageSize
      ? addQueryParams(url, { page, page_size: pageSize })
      : url

  const raw = await apiFetch<any>(urlWithPaging, fetchOptions)
  return {
    items: extractResults<T>(raw),
    meta: extractListMeta(raw),
    raw,
  }
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
