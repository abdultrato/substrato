"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

const warmedRoutes = new Set<string>()

function getInternalHref(target: EventTarget | null): string | null {
  if (!target || !(target instanceof Element)) return null

  const anchor = target.closest("a[href]") as HTMLAnchorElement | null
  if (!anchor) return null
  if (anchor.hasAttribute("download")) return null
  if (anchor.target && anchor.target !== "_self") return null

  const href = (anchor.getAttribute("href") || "").trim()
  if (!href || !href.startsWith("/")) return null
  if (href.startsWith("//")) return null

  return href.split("#")[0]
}

export default function NavigationWarmup() {
  const router = useRouter()

  useEffect(() => {
    const warmRoute = (event: Event) => {
      const href = getInternalHref(event.target)
      if (!href || warmedRoutes.has(href)) return
      warmedRoutes.add(href)
      router.prefetch(href)
    }

    document.addEventListener("pointerdown", warmRoute, { capture: true, passive: true })
    document.addEventListener("focusin", warmRoute, true)

    return () => {
      document.removeEventListener("pointerdown", warmRoute, true)
      document.removeEventListener("focusin", warmRoute, true)
    }
  }, [router])

  return null
}
