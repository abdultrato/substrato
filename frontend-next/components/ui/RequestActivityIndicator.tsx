"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import {
  subscribeRequestActivity,
} from "@/lib/requestActivity"
import type { RequestActivityStartEvent } from "@/lib/requestActivity"

const SHOW_DELAY_MS = 250

function pickLatest(events: RequestActivityStartEvent[]): RequestActivityStartEvent | null {
  if (!events.length) return null
  return events.reduce((latest, current) =>
    current.startedAt > latest.startedAt ? current : latest
  )
}

export default function RequestActivityIndicator() {
  const [pending, setPending] = useState<Record<string, RequestActivityStartEvent>>({})
  const [visible, setVisible] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    return subscribeRequestActivity((event) => {
      if (event.phase === "start") {
        setPending((prev) => ({ ...prev, [event.id]: event }))
        return
      }

      setPending((prev) => {
        if (!prev[event.id]) return prev
        const next = { ...prev }
        delete next[event.id]
        return next
      })
    })
  }, [])

  const pendingEntries = useMemo(() => Object.values(pending), [pending])
  const pendingCount = pendingEntries.length
  const latest = useMemo(() => pickLatest(pendingEntries), [pendingEntries])

  useEffect(() => {
    if (!pendingCount) {
      setVisible(false)
      return
    }

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [pendingCount])

  useEffect(() => {
    if (!visible || !latest) return
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [visible, latest])

  if (!visible || !latest) return null

  const elapsedSeconds = Math.max(
    1,
    Math.floor((now - latest.startedAt) / 1000)
  )

  return (
    <div className="fixed right-4 top-4 z-[9998] w-[min(92vw,26rem)] animate-scale-in rounded-2xl border border-primary/30 bg-card/95 p-3 shadow-lg backdrop-blur">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 rounded-lg bg-primary/15 p-1.5 text-primary">
          <Sparkles size={14} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Loader2 size={14} className="animate-spin text-primary" />
            <span className="truncate">{latest.title}</span>
          </div>

          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {latest.detail}
          </p>

          <p className="mt-2 text-[11px] text-foreground/75">
            {pendingCount > 1
              ? `${pendingCount} tarefas em processamento. Não precisa repetir as ações.`
              : "Estamos a processar o pedido. Não precisa repetir a ação."}
          </p>

          <p className="mt-1 text-[11px] text-muted-foreground">
            Em execução há {elapsedSeconds}s
          </p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/15">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  )
}
