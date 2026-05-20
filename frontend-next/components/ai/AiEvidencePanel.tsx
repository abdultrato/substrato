"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"

export type AiSource = {
  type?: string
  label?: string
  href?: string
}

export default function AiEvidencePanel({ sources }: { sources: AiSource[] }) {
  if (!sources.length) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sources.map((source) => (
        <Link
          key={`${source.label}-${source.href}`}
          href={source.href || "#"}
          prefetch={false}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted"
        >
          <ExternalLink size={13} />
          {source.label || source.type || "source"}
        </Link>
      ))}
    </div>
  )
}
