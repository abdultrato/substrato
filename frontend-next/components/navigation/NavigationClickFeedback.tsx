"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

const NAV_PENDING_TIMEOUT_MS = 15000

type PendingState = {
  element: HTMLElement
  indicator: HTMLSpanElement
  restorePosition: boolean
  timeoutId: ReturnType<typeof setTimeout>
}

function normalizeInternalHref(rawHref: string | null | undefined): string | null {
  const href = String(rawHref || "").trim()
  if (!href || href.startsWith("#")) return null
  if (href.startsWith("javascript:")) return null
  if (href.startsWith("/")) {
    if (href.startsWith("//")) return null
    return href.split("#")[0]
  }

  try {
    const parsed = new URL(href, window.location.origin)
    if (parsed.origin !== window.location.origin) return null
    return `${parsed.pathname}${parsed.search}`.split("#")[0]
  } catch {
    return null
  }
}

function resolveNavigationTarget(target: EventTarget | null): { element: HTMLElement; href: string } | null {
  if (!(target instanceof Element)) return null

  const anchor = target.closest("a[href]") as HTMLAnchorElement | null
  if (anchor) {
    if (anchor.hasAttribute("download")) return null
    if (anchor.target && anchor.target !== "_self") return null
    const href = normalizeInternalHref(anchor.getAttribute("href"))
    if (!href) return null
    return { element: anchor, href }
  }

  const container = target.closest("[data-nav-href], [data-route-href]") as HTMLElement | null
  if (!container) return null
  const href = normalizeInternalHref(
    container.getAttribute("data-nav-href") || container.getAttribute("data-route-href")
  )
  if (!href) return null
  return { element: container, href }
}

function createIndicatorLabel(): string {
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en")
  return isEnglish ? "Loading..." : "A processar..."
}

export default function NavigationClickFeedback() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const pendingRef = useRef<PendingState | null>(null)

  const clearPendingState = (force = false) => {
    const current = pendingRef.current
    if (!current) return

    if (!force && !document.contains(current.element)) {
      pendingRef.current = null
      return
    }

    clearTimeout(current.timeoutId)
    current.element.classList.remove("nav-click-pending")
    if (current.indicator.parentElement === current.element) {
      current.element.removeChild(current.indicator)
    }
    if (current.restorePosition) {
      current.element.style.position = ""
    }
    pendingRef.current = null
  }

  useEffect(() => {
    clearPendingState(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = resolveNavigationTarget(event.target)
      if (!target) return

      clearPendingState(true)

      const computed = window.getComputedStyle(target.element)
      const restorePosition = computed.position === "static" && !target.element.style.position
      if (restorePosition) {
        target.element.style.position = "relative"
      }

      const indicator = document.createElement("span")
      indicator.className = "nav-click-pending-indicator"
      indicator.setAttribute("aria-hidden", "true")

      const badge = document.createElement("span")
      badge.className = "nav-click-pending-badge"

      const spinner = document.createElement("span")
      spinner.className = "nav-click-pending-spinner"

      const label = document.createElement("span")
      label.className = "nav-click-pending-label"
      label.textContent = createIndicatorLabel()

      badge.appendChild(spinner)
      badge.appendChild(label)
      indicator.appendChild(badge)

      target.element.classList.add("nav-click-pending")
      target.element.appendChild(indicator)

      const timeoutId = setTimeout(() => clearPendingState(true), NAV_PENDING_TIMEOUT_MS)
      pendingRef.current = {
        element: target.element,
        indicator,
        restorePosition,
        timeoutId,
      }
    }

    document.addEventListener("click", onClickCapture, true)
    return () => {
      document.removeEventListener("click", onClickCapture, true)
      clearPendingState(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
