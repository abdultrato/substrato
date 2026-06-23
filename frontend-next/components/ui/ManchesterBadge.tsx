"use client"

import { getManchesterMeta } from "@/lib/manchesterTriage"

export default function ManchesterBadge({
  status,
  display,
  className = "",
}: {
  status?: string | null
  display?: string | null
  className?: string
}) {
  if (!status && !display) return null
  const meta = getManchesterMeta(status, display)

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.badgeClass} ${meta.animClass} ${className}`}
    >
      {meta.label}
    </span>
  )
}
