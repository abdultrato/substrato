"use client"

import { Languages } from "lucide-react"
import { useLanguage } from "@/hooks/useLanguage"

type Props = {
  compact?: boolean
}

export default function GlobalLanguageSwitch({ compact = false }: Props) {
  const { toggleLanguage, switchButtonLabel } = useLanguage()

  return (
    <button
      type="button"
      onClick={() => {
        void toggleLanguage()
      }}
      className={[
        "inline-flex items-center rounded-lg border border-white/25 bg-white/15 text-xs font-semibold text-white shadow-sm transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
        compact ? "h-8 gap-1 px-2" : "gap-2 px-3 py-1.5",
      ].join(" ")}
      aria-label={switchButtonLabel}
      title={switchButtonLabel}
    >
      <Languages size={14} />
      <span className={compact ? "hidden sm:inline" : ""}>{switchButtonLabel}</span>
    </button>
  )
}
