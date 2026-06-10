"use client"

import { useEffect, useRef } from "react"

import { refreshSession } from "@/lib/auth"
import { publish } from "@/lib/toast"

const MINUTE = 60 * 1000
const ACTIVITY_KEY = "lastUserActivity"

function idleMs(): number {
  const raw = Number(process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES)
  const minutes = Number.isFinite(raw) && raw >= 1 ? raw : 30
  return minutes * MINUTE
}

/**
 * Mantém a sessão viva enquanto há atividade real (rato/teclado/scroll/toque/
 * cliques) renovando periodicamente o token, e termina a sessão após N minutos
 * (default 30) de inatividade real — com aviso antes.
 *
 * A atividade é partilhada entre abas via localStorage, para que trabalhar numa
 * aba não deslogue outra aba "parada".
 */
export function useIdleSession({
  enabled,
  onTimeout,
}: {
  enabled: boolean
  onTimeout: () => void
}) {
  const lastActivityRef = useRef(Date.now())
  const lastRefreshRef = useRef(Date.now())
  const warnedRef = useRef(false)
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    const IDLE = idleMs()
    const WARN = Math.min(MINUTE, Math.floor(IDLE / 6)) // avisa ~1 min antes
    const REFRESH_EVERY = Math.max(MINUTE, Math.floor(IDLE / 3)) // renova enquanto ativo
    const CHECK = 30 * 1000

    const now0 = Date.now()
    lastActivityRef.current = now0
    lastRefreshRef.current = now0
    warnedRef.current = false

    const readShared = (): number => {
      try {
        return Number(localStorage.getItem(ACTIVITY_KEY)) || 0
      } catch {
        return 0
      }
    }
    const writeShared = (ts: number) => {
      try {
        localStorage.setItem(ACTIVITY_KEY, String(ts))
      } catch {
        // localStorage indisponível: degrada para atividade só nesta aba.
      }
    }

    let lastWrite = 0
    const markActivity = () => {
      const now = Date.now()
      lastActivityRef.current = now
      warnedRef.current = false
      // Throttle de escrita partilhada (1s) para não martelar o localStorage.
      if (now - lastWrite >= 1000) {
        lastWrite = now
        writeShared(now)
      }
    }

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "wheel",
    ]

    const onVisible = () => {
      if (document.visibilityState === "visible") void tick()
    }

    let timer = 0
    const cleanup = () => {
      window.clearInterval(timer)
      events.forEach((e) => window.removeEventListener(e, markActivity))
      document.removeEventListener("visibilitychange", onVisible)
    }

    const tick = async () => {
      const now = Date.now()
      const last = Math.max(lastActivityRef.current, readShared())
      const idle = now - last

      if (idle >= IDLE) {
        cleanup()
        onTimeoutRef.current()
        return
      }

      if (idle >= IDLE - WARN && !warnedRef.current) {
        warnedRef.current = true
        publish({
          id: Date.now(),
          type: "warning",
          duration: WARN,
          message: "A sua sessão vai expirar por inatividade. Interaja com a página para continuar.",
        })
      }

      // Renova só se houve atividade desde a última renovação (sessão deslizante
      // apenas com utilizador ativo). Falhas transitórias são toleradas: o
      // apiFetch renova/redireciona em 401 e o timer de inatividade trata o resto.
      if (last > lastRefreshRef.current && now - lastRefreshRef.current >= REFRESH_EVERY) {
        lastRefreshRef.current = now
        await refreshSession()
      }
    }

    events.forEach((e) => window.addEventListener(e, markActivity, { passive: true }))
    document.addEventListener("visibilitychange", onVisible)
    timer = window.setInterval(() => {
      void tick()
    }, CHECK)

    return cleanup
  }, [enabled])
}

export default useIdleSession
