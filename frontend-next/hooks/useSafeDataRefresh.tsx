"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

import { clearApiClientCache } from "@/lib/api"
import {
  emitSafeDataRefresh,
  subscribeSafeDataRefresh,
  type SafeDataRefreshReason,
} from "@/lib/safeDataRefresh"

type SafeDataRefreshContextValue = {
  refreshNow: (reason?: SafeDataRefreshReason) => Promise<void>
  isRefreshing: boolean
  lastRefreshAt: number | null
  hasUnsavedInput: boolean
  autoRefreshMs: number
}

const SafeDataRefreshContext = createContext<SafeDataRefreshContextValue | null>(null)
const AUTO_REFRESH_MS = 30000
const MIN_REFRESH_GAP_MS = 2500

function isEditableElement(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName.toLowerCase()
  if (tag === "textarea" || tag === "select") return true
  if (tag !== "input") return false
  const input = target as HTMLInputElement
  return !["button", "submit", "reset", "hidden", "image"].includes(input.type)
}

function activeElementIsEditable(): boolean {
  if (typeof document === "undefined") return false
  return isEditableElement(document.activeElement)
}

export function SafeDataRefreshProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null)
  const [hasUnsavedInput, setHasUnsavedInput] = useState(false)
  const refreshingRef = useRef(false)
  const lastRefreshRef = useRef(0)
  const hasUnsavedInputRef = useRef(false)

  const refreshNow = useCallback(
    async (reason: SafeDataRefreshReason = "manual") => {
      const now = Date.now()
      if (refreshingRef.current) return
      if (reason !== "manual" && now - lastRefreshRef.current < MIN_REFRESH_GAP_MS) return

      const preserveDraft = hasUnsavedInputRef.current || activeElementIsEditable()

      refreshingRef.current = true
      setIsRefreshing(true)
      try {
        clearApiClientCache()
        emitSafeDataRefresh(reason)
        await queryClient.invalidateQueries()
        await queryClient.refetchQueries({ type: "active" }, { cancelRefetch: false })
        if (!preserveDraft) {
          router.refresh()
        }
        const finishedAt = Date.now()
        lastRefreshRef.current = finishedAt
        setLastRefreshAt(finishedAt)
      } finally {
        refreshingRef.current = false
        setIsRefreshing(false)
      }
    },
    [queryClient, router]
  )

  useEffect(() => {
    hasUnsavedInputRef.current = hasUnsavedInput
  }, [hasUnsavedInput])

  useEffect(() => {
    setHasUnsavedInput(false)
  }, [pathname])

  useEffect(() => {
    function markDirty(event: Event) {
      if (!isEditableElement(event.target)) return
      setHasUnsavedInput(true)
    }

    function markCleanSoon() {
      window.setTimeout(() => setHasUnsavedInput(false), 0)
    }

    document.addEventListener("input", markDirty, true)
    document.addEventListener("change", markDirty, true)
    document.addEventListener("submit", markCleanSoon, true)
    document.addEventListener("reset", markCleanSoon, true)

    return () => {
      document.removeEventListener("input", markDirty, true)
      document.removeEventListener("change", markDirty, true)
      document.removeEventListener("submit", markCleanSoon, true)
      document.removeEventListener("reset", markCleanSoon, true)
    }
  }, [])

  useEffect(() => {
    function guardBrowserReload(event: BeforeUnloadEvent) {
      if (!hasUnsavedInputRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", guardBrowserReload)
    return () => window.removeEventListener("beforeunload", guardBrowserReload)
  }, [])

  useEffect(() => {
    function refreshIfSafe(reason: SafeDataRefreshReason) {
      if (document.visibilityState !== "visible") return
      if (hasUnsavedInputRef.current || activeElementIsEditable()) return
      void refreshNow(reason)
    }

    const interval = window.setInterval(() => refreshIfSafe("auto"), AUTO_REFRESH_MS)
    const onFocus = () => refreshIfSafe("focus")
    const onVisibilityChange = () => refreshIfSafe("visibility")

    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [refreshNow])

  const value = useMemo<SafeDataRefreshContextValue>(
    () => ({
      refreshNow,
      isRefreshing,
      lastRefreshAt,
      hasUnsavedInput,
      autoRefreshMs: AUTO_REFRESH_MS,
    }),
    [hasUnsavedInput, isRefreshing, lastRefreshAt, refreshNow]
  )

  return (
    <SafeDataRefreshContext.Provider value={value}>
      {children}
    </SafeDataRefreshContext.Provider>
  )
}

export function useSafeDataRefresh() {
  const ctx = useContext(SafeDataRefreshContext)
  if (!ctx) {
    throw new Error("useSafeDataRefresh must be used inside SafeDataRefreshProvider")
  }
  return ctx
}

export function useSafeDataRefreshSignal(): number {
  const [token, setToken] = useState(0)

  useEffect(
    () =>
      subscribeSafeDataRefresh(() => {
        setToken((value) => value + 1)
      }),
    []
  )

  return token
}
