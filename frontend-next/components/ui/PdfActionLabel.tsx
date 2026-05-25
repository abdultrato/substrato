"use client"

import type { ReactNode } from "react"
import { FileDown, Loader2 } from "lucide-react"

type Props = {
  children: ReactNode
  loading?: boolean
  loadingLabel?: ReactNode
  iconSize?: number
  className?: string
}

export default function PdfActionLabel({
  children,
  loading = false,
  loadingLabel,
  iconSize = 15,
  className = "",
}: Props) {
  const Icon = loading ? Loader2 : FileDown

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`.trim()}>
      <Icon
        aria-hidden="true"
        size={iconSize}
        className={`shrink-0 ${loading ? "animate-spin" : ""}`.trim()}
      />
      <span>{loading && loadingLabel !== undefined ? loadingLabel : children}</span>
    </span>
  )
}
