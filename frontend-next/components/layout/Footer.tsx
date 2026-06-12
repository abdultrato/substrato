"use client"

import { useMemo } from "react"
import Link from "next/link"
import type { CSSProperties } from "react"
import { useLanguage } from "@/hooks/useLanguage"
import GlobalLanguageSwitch from "@/components/i18n/GlobalLanguageSwitch"
import { PageActivityReportMenuWithDirection } from "./PageActivityReportMenu"

type Props = {
  leftOffset?: string
  rightOffset?: string
}

function systemVersionLabel(): string {
  return (process.env.NEXT_PUBLIC_SYSTEM_VERSION_LABEL || "").trim()
}

function currentYear(): number {
  return new Date().getFullYear()
}

export default function Footer({ leftOffset = "16rem", rightOffset = "0px" }: Props) {
  const { t } = useLanguage()
  const version = useMemo(() => systemVersionLabel(), [])
  const versionText = version
    ? `${t("Versão", "Version")} ${version}`
    : t("Em desenvolvimento", "In development")
  const year = useMemo(() => currentYear(), [])

  return (
    <footer
      data-substrato-fixed-footer
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 text-xs text-muted-foreground shadow-sm backdrop-blur md:left-[var(--layout-left)] md:right-[var(--layout-right)]"
      style={
        {
          // Used by the Tailwind arbitrary values on md:left/right.
          "--layout-left": leftOffset,
          "--layout-right": rightOffset,
        } as CSSProperties
      }
    >
      <div className="flex h-10 min-w-0 items-center justify-between gap-2 px-2 sm:px-3 md:px-4">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <span>© {year}</span>
          <span className="hidden sm:inline">{t("Plataforma", "Platform")}</span>
          <Link
            href="/substrato"
            className="truncate font-semibold text-foreground transition hover:text-primary no-underline"
          >
            Substrato
          </Link>
        </div>

        <div className="ml-1 flex shrink-0 items-center gap-1 sm:gap-2">
          <PageActivityReportMenuWithDirection direction="up" />
          <GlobalLanguageSwitch compact />
          <span className="hidden rounded-full border border-border bg-background px-2 py-0.5 font-semibold text-foreground-2 sm:inline-flex">
            {versionText}
          </span>
        </div>
      </div>
    </footer>
  )
}
