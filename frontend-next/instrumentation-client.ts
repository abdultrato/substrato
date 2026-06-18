/**
 * Next.js client instrumentation hook.
 *
 * This file runs before the React tree mounts, which makes it the only reliable
 * place to recover from stale or timed-out app/layout chunks in local dev.
 */

const CHUNK_RECOVERY_KEY = "substrato_chunk_recovery"
const CHUNK_RECOVERY_TTL_MS = 30_000

const CHUNK_FAILURE_PATTERNS = [
  /ChunkLoadError/i,
  /Loading chunk .+ failed/i,
  /Loading CSS chunk .+ failed/i,
  /timeout: .+\/_next\/static\/chunks\//i,
  /\/_next\/static\/chunks\//i,
]

type ChunkRecoveryState = {
  href: string
  at: number
}

declare global {
  interface Window {
    __substratoChunkRecoveryInstalled?: boolean
  }
}

function stringifyError(value: unknown): string {
  if (typeof value === "string") return value
  if (value instanceof Error) {
    return [value.name, value.message, value.stack].filter(Boolean).join("\n")
  }
  if (value && typeof value === "object") {
    try {
      const maybeError = value as { name?: unknown; message?: unknown; stack?: unknown }
      return [maybeError.name, maybeError.message, maybeError.stack]
        .filter((item) => typeof item === "string" && item)
        .join("\n")
    } catch {
      return ""
    }
  }
  return ""
}

function getErrorEventTargetUrl(event: Event): string {
  const target = event.target
  if (!target || !(target instanceof HTMLElement)) return ""
  if (target instanceof HTMLScriptElement) return target.src || ""
  if (target instanceof HTMLLinkElement) return target.href || ""
  return ""
}

export function isRecoverableChunkError(value: unknown): boolean {
  const text = stringifyError(value)
  return CHUNK_FAILURE_PATTERNS.some((pattern) => pattern.test(text))
}

function readRecoveryState(storage: Storage): ChunkRecoveryState | null {
  try {
    const raw = storage.getItem(CHUNK_RECOVERY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ChunkRecoveryState>
    if (typeof parsed.href !== "string" || typeof parsed.at !== "number") return null
    return { href: parsed.href, at: parsed.at }
  } catch {
    return null
  }
}

export function shouldAttemptChunkRecovery(storage: Storage, href: string, now = Date.now()): boolean {
  const previous = readRecoveryState(storage)
  if (!previous) return true
  if (previous.href !== href) return true
  return now - previous.at > CHUNK_RECOVERY_TTL_MS
}

function markRecoveryAttempt(storage: Storage, href: string, now = Date.now()) {
  try {
    storage.setItem(CHUNK_RECOVERY_KEY, JSON.stringify({ href, at: now }))
  } catch {
    // sessionStorage can be unavailable in strict browser privacy modes.
  }
}

function clearExpiredRecoveryAttempt(storage: Storage, now = Date.now()) {
  const previous = readRecoveryState(storage)
  if (!previous) return
  if (now - previous.at > CHUNK_RECOVERY_TTL_MS) {
    try {
      storage.removeItem(CHUNK_RECOVERY_KEY)
    } catch {
      // ignore
    }
  }
}

function recoverFromChunkFailure(event: Event | PromiseRejectionEvent) {
  const storage = window.sessionStorage
  const href = window.location.href

  if (!shouldAttemptChunkRecovery(storage, href)) return

  event.preventDefault()
  markRecoveryAttempt(storage, href)
  window.location.reload()
}

function installChunkRecovery() {
  if (typeof window === "undefined") return
  if (window.__substratoChunkRecoveryInstalled) return

  window.__substratoChunkRecoveryInstalled = true

  window.addEventListener(
    "error",
    (event) => {
      const errorEvent = event as ErrorEvent
      const targetUrl = getErrorEventTargetUrl(event)
      const candidates = [errorEvent.error, errorEvent.message, errorEvent.filename, targetUrl]

      if (candidates.some(isRecoverableChunkError)) {
        recoverFromChunkFailure(event)
      }
    },
    true
  )

  window.addEventListener("unhandledrejection", (event) => {
    if (isRecoverableChunkError(event.reason)) {
      recoverFromChunkFailure(event)
    }
  })

  window.setTimeout(() => {
    clearExpiredRecoveryAttempt(window.sessionStorage)
  }, CHUNK_RECOVERY_TTL_MS)
}

installChunkRecovery()


