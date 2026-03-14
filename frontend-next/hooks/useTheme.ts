"use client"

import { useEffect, useMemo, useState } from "react"

import useLocalStorage from "@/hooks/useLocalStorage"

export type ThemePreference = "system" | "light" | "dark"

const STORAGE_KEY = "substrato_theme"

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false
  if (typeof window.matchMedia !== "function") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export default function useTheme() {
  const [preference, setPreference] = useLocalStorage<ThemePreference>(
    STORAGE_KEY,
    "system"
  )
  const [systemDark, setSystemDark] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const mqlAny = mql as unknown as {
      addEventListener?: (type: string, listener: () => void) => void
      removeEventListener?: (type: string, listener: () => void) => void
      addListener?: (listener: () => void) => void
      removeListener?: (listener: () => void) => void
    }

    const update = () => setSystemDark(mql.matches)
    update()

    // Safari < 14 uses addListener/removeListener.
    if (typeof mqlAny.addEventListener === "function" && typeof mqlAny.removeEventListener === "function") {
      mqlAny.addEventListener("change", update)
      return () => mqlAny.removeEventListener!("change", update)
    }
    // eslint-disable-next-line deprecation/deprecation
    mqlAny.addListener?.(update)
    // eslint-disable-next-line deprecation/deprecation
    return () => mqlAny.removeListener?.(update)
  }, [])

  const isDark = preference === "dark" || (preference === "system" && systemDark)

  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.classList.toggle("dark", isDark)
  }, [isDark])

  const effectiveTheme = useMemo(() => (isDark ? "dark" : "light"), [isDark])

  function toggle() {
    setPreference((prev) => {
      const prevIsDark = prev === "dark" || (prev === "system" && systemDark)
      return prevIsDark ? "light" : "dark"
    })
  }

  function setSystem() {
    setPreference("system")
  }

  return {
    preference,
    effectiveTheme,
    isDark,
    toggle,
    setPreference,
    setSystem,
  }
}
