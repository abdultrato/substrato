"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  subscribeRequestActivity,
} from "@/lib/requestActivity"
import type { RequestActivityStartEvent } from "@/lib/requestActivity"

const SHOW_DELAY_MS = 650
const FLUSH_INTERVAL_MS = 80

export default function RequestActivityIndicator() {
  const [pendingEntries, setPendingEntries] = useState<RequestActivityStartEvent[]>([])
  const [visible, setVisible] = useState(false)
  const pendingRef = useRef<Map<string, RequestActivityStartEvent>>(new Map())
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushPending = useCallback(() => {
    flushTimerRef.current = null
    setPendingEntries(Array.from(pendingRef.current.values()))
  }, [])

  const scheduleFlush = useCallback((immediate = false) => {
    if (immediate) {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
      flushPending()
      return
    }
    if (flushTimerRef.current) return
    flushTimerRef.current = setTimeout(() => flushPending(), FLUSH_INTERVAL_MS)
  }, [flushPending])

  useEffect(() => {
    return subscribeRequestActivity((event) => {
      if (event.phase === "start") {
        pendingRef.current.set(event.id, event)
        scheduleFlush()
        return
      }
      if (!pendingRef.current.has(event.id)) return
      pendingRef.current.delete(event.id)
      scheduleFlush()
    })
  }, [scheduleFlush])

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    }
  }, [])

  const pendingCount = pendingEntries.length

  useEffect(() => {
    if (!pendingCount) {
      setVisible(false)
      return
    }

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [pendingCount])

  if (!visible || !pendingCount) return null

  return (
    <div
      className="fixed right-4 top-4 z-[9998] animate-scale-in rounded-xl border border-primary/20 bg-card/95 px-3 py-2 shadow-lg backdrop-blur"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="relative h-7 w-7 shrink-0" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border-2 border-primary/15" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-primary/60 border-t-primary" />
          <div className="absolute inset-[8px] rounded-full bg-primary/25 animate-pulse" />
        </div>

        <span className="text-sm font-semibold text-foreground">Espere...</span>
      </div>
    </div>
  )
}
