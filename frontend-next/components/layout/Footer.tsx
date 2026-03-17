"use client"

import { useMemo } from "react"
import Link from "next/link"
import type { CSSProperties } from "react"

type Props = {
  rightOffset?: string
}

function systemVersionLabel(): string {
  return (process.env.NEXT_PUBLIC_SYSTEM_VERSION_LABEL || "beta").trim()
}

function currentYear(): number {
  return new Date().getFullYear()
}

export default function Footer({ rightOffset = "0px" }: Props) {
  const version = useMemo(() => systemVersionLabel(), [])
  const versionText = version ? `Versão ${version}` : "Versão"
  const year = useMemo(() => currentYear(), [])

  return (
    <footer
      className="chrome-surface fixed bottom-0 left-0 right-0 z-40 border-t text-xs text-white shadow-sm backdrop-blur md:left-64 md:right-[var(--layout-right)]"
      style={
        {
          // Used by the Tailwind arbitrary value on md:right-[var(--layout-right)].
          "--layout-right": rightOffset,
        } as CSSProperties
      }
    >
      <div className="flex h-10 items-center justify-between px-3 md:px-4">
        <div className="flex items-center gap-2">
          <span className="text-white/80">© {year}</span>
          <span className="hidden sm:inline text-white/70">Plataforma</span>
          <Link
            href="/substrato"
            className="font-semibold text-white transition hover:text-white/90 underline-offset-4 hover:underline"
          >
            Substrato
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <span className="chrome-pill rounded-full border px-2 py-0.5 font-semibold">
            {versionText}
          </span>
        </div>
      </div>
    </footer>
  )
}
