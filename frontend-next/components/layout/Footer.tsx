"use client"

import Link from "next/link"
import { useLanguage } from "@/hooks/useLanguage"
 

function currentYear(): number {
  return new Date().getFullYear()
}

export default function Footer() {
  const { t } = useLanguage()
  const year = currentYear()
  const environmentLabel =
    process.env.NODE_ENV === "production"
      ? t("Versão beta", "Beta version")
      : t("Em desenvolvimento", "In development")

  return (
    <footer
      data-substrato-footer
      className="shrink-0 border-t border-border bg-card/95 text-xs text-muted-foreground shadow-sm backdrop-blur"
    >
      <div className="flex h-8 min-w-0 items-center justify-between gap-2 px-2 sm:px-3">
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
          <span className="hidden rounded-full border border-border bg-background px-2 py-0.5 font-semibold text-foreground-2 sm:inline-flex">
            {environmentLabel}
          </span>
        </div>
      </div>
    </footer>
  )
}
