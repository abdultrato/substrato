"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

const HOLD_DELAY = 500
const CONTINUOUS_STEP = 10
const THRESHOLD = 4

type Props = {
  /** Região rolável (vertical) à qual as setas pertencem. */
  targetRef: RefObject<HTMLElement | null>
}

/**
 * Setas de rolagem verticais que vivem DENTRO da estrutura do nav/aside.
 * Por serem descendentes do `aside`, passar o cursor por cima mantém o hover
 * (o sidebar não colapsa). Toque curto = avança uma página; pressionar e
 * segurar (>0.5s) = rola levemente de forma contínua até soltar ou chegar ao fim.
 */
export default function NavScrollArrows({ targetRef }: Props) {
  const [canUp, setCanUp] = useState(false)
  const [canDown, setCanDown] = useState(false)

  const recompute = useCallback(() => {
    const el = targetRef.current
    if (!el) {
      setCanUp(false)
      setCanDown(false)
      return
    }
    const max = el.scrollHeight - el.clientHeight
    setCanUp(el.scrollTop > THRESHOLD)
    setCanDown(el.scrollTop < max - THRESHOLD)
  }, [targetRef])

  useEffect(() => {
    const el = targetRef.current
    if (!el) return
    recompute()
    el.addEventListener("scroll", recompute, { passive: true })
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(recompute) : null
    ro?.observe(el)
    const mo = typeof MutationObserver !== "undefined" ? new MutationObserver(recompute) : null
    mo?.observe(el, { childList: true, subtree: true })
    window.addEventListener("resize", recompute)
    return () => {
      el.removeEventListener("scroll", recompute)
      ro?.disconnect()
      mo?.disconnect()
      window.removeEventListener("resize", recompute)
    }
  }, [recompute, targetRef])

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const raf = useRef(0)
  const didContinuous = useRef(false)

  const stop = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    if (raf.current) {
      cancelAnimationFrame(raf.current)
      raf.current = 0
    }
  }, [])

  useEffect(() => () => stop(), [stop])

  const startHold = useCallback((dir: -1 | 1) => {
    const el = targetRef.current
    if (!el) return
    const tick = () => {
      const before = el.scrollTop
      el.scrollTop = before + dir * CONTINUOUS_STEP
      if (el.scrollTop === before) {
        raf.current = 0
        return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, [targetRef])

  const onPointerDown = useCallback((dir: -1 | 1) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    didContinuous.current = false
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null
      didContinuous.current = true
      startHold(dir)
    }, HOLD_DELAY)
  }, [startHold])

  const onClick = useCallback((dir: -1 | 1) => () => {
    if (didContinuous.current) {
      didContinuous.current = false
      return
    }
    const el = targetRef.current
    if (!el) return
    const step = Math.max(80, Math.round(el.clientHeight * 0.8))
    el.scrollBy({ top: dir * step, behavior: "smooth" })
  }, [targetRef])

  // Barras retangulares, largura total do nav e altura de um módulo (h-10),
  // elegantes e integradas na estrutura do aside.
  const btnClass =
    "pointer-events-auto absolute inset-x-0 z-20 flex h-10 items-center justify-center bg-card/95 text-muted-foreground backdrop-blur transition-colors hover:bg-muted hover:text-foreground supports-[backdrop-filter]:bg-card/85"

  return (
    <>
      {canUp ? (
        <button
          type="button"
          aria-label="Rolar para cima"
          tabIndex={-1}
          className={`${btnClass} top-0 border-b border-border/70`}
          onPointerDown={onPointerDown(-1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onClick={onClick(-1)}
        >
          <ChevronUp size={16} />
        </button>
      ) : null}
      {canDown ? (
        <button
          type="button"
          aria-label="Rolar para baixo"
          tabIndex={-1}
          className={`${btnClass} bottom-0 border-t border-border/70`}
          onPointerDown={onPointerDown(1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onClick={onClick(1)}
        >
          <ChevronDown size={16} />
        </button>
      ) : null}
    </>
  )
}
