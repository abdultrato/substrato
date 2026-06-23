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
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-2.5 py-1 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="relative h-3.5 w-3.5 shrink-0" aria-hidden="true">
        <div className="absolute inset-0 rounded-full border border-primary/20" />
        <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-r-primary/70 border-t-primary" />
      </div>
      <span className="text-[11px] font-semibold text-primary/80 leading-none">Espere…</span>
    </div>
  )
}
