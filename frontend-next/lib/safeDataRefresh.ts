export const SAFE_DATA_REFRESH_EVENT = "substrato:safe-data-refresh"

export type SafeDataRefreshReason =
  | "manual"
  | "auto"
  | "focus"
  | "visibility"
  | "mutation"

export type SafeDataRefreshDetail = {
  requestedAt: number
  reason: SafeDataRefreshReason
}

export function emitSafeDataRefresh(reason: SafeDataRefreshReason = "manual") {
  if (typeof window === "undefined") return
  const detail: SafeDataRefreshDetail = {
    requestedAt: Date.now(),
    reason,
  }
  window.dispatchEvent(new CustomEvent<SafeDataRefreshDetail>(SAFE_DATA_REFRESH_EVENT, { detail }))
}

export function subscribeSafeDataRefresh(listener: (detail: SafeDataRefreshDetail) => void) {
  if (typeof window === "undefined") return () => {}

  const handler = (event: Event) => {
    listener((event as CustomEvent<SafeDataRefreshDetail>).detail)
  }

  window.addEventListener(SAFE_DATA_REFRESH_EVENT, handler)
  return () => window.removeEventListener(SAFE_DATA_REFRESH_EVENT, handler)
}
