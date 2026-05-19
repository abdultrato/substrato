export type FrontendTelemetryPayload = {
  event_type: string
  message: string
  error_name?: string
  exception_class?: string
  stack?: string
  route?: string
  path?: string
  url?: string
  status_code?: number
  duration_ms?: number
  request_url?: string
  request_method?: string
  user_agent?: string
  metadata?: Record<string, unknown>
}

const TELEMETRY_ENDPOINT = "/api/v1/monitoring/telemetry/"
const FRONTEND_METHOD = "FRONTEND"

const recentFingerprints = new Map<string, number>()

function nowMs(): number {
  return Date.now()
}

function cleanupFingerprints(ts: number): void {
  for (const [key, value] of recentFingerprints.entries()) {
    if (ts - value > 60_000) {
      recentFingerprints.delete(key)
    }
  }
}

function fingerprint(payload: FrontendTelemetryPayload): string {
  const route = payload.route || payload.path || ""
  const status = String(payload.status_code || "")
  const message = (payload.message || "").slice(0, 180)
  const kind = payload.event_type || "frontend.error"
  const errorName = payload.error_name || payload.exception_class || ""
  return `${kind}|${status}|${route}|${errorName}|${message}`
}

function shouldSend(payload: FrontendTelemetryPayload): boolean {
  const ts = nowMs()
  cleanupFingerprints(ts)

  const key = fingerprint(payload)
  const previous = recentFingerprints.get(key)
  if (previous && ts - previous < 5_000) {
    return false
  }
  recentFingerprints.set(key, ts)
  return true
}

function buildPayload(payload: FrontendTelemetryPayload): FrontendTelemetryPayload {
  const route = payload.route || (typeof window !== "undefined" ? window.location.pathname : "")

  return {
    ...payload,
    method: FRONTEND_METHOD,
    route,
    path: payload.path || route,
    user_agent:
      payload.user_agent ||
      (typeof navigator !== "undefined" ? navigator.userAgent : ""),
    metadata: {
      source: "frontend",
      ...payload.metadata,
    },
  } as FrontendTelemetryPayload & { method: string }
}

function sendWithBeacon(body: string): boolean {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") {
    return false
  }
  try {
    const blob = new Blob([body], { type: "application/json" })
    return navigator.sendBeacon(TELEMETRY_ENDPOINT, blob)
  } catch {
    return false
  }
}

export function reportFrontendTelemetry(payload: FrontendTelemetryPayload): void {
  try {
    if (typeof window === "undefined") return

    const built = buildPayload(payload)
    if (!shouldSend(built)) return

    const body = JSON.stringify(built)

    if (sendWithBeacon(body)) return

    void fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        "X-Frontend-Telemetry": "1",
      },
      body,
    }).catch(() => {
      // Silencioso por desenho: telemetria nunca deve bloquear UX.
    })
  } catch {
    // ignora qualquer falha de telemetria
  }
}

export function reportFrontendApiError(input: {
  requestUrl: string
  method: string
  statusCode: number
  message: string
  responseBody?: unknown
}): void {
  reportFrontendTelemetry({
    event_type: "frontend.api_error",
    message: input.message || "Erro de API no frontend",
    error_name: "ApiError",
    exception_class: "ApiError",
    status_code: input.statusCode,
    request_url: input.requestUrl,
    request_method: input.method,
    metadata: {
      response_body: input.responseBody,
    },
  })
}
