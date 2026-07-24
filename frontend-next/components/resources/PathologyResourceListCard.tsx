"use client"

import Link from "next/link"
import { ChevronRight, Microscope } from "lucide-react"

import { fieldLabel, isInternalField } from "@/lib/ui/fieldLabels"

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return ""
  if (typeof value === "boolean") return value ? "Sim" : "Não"
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.length ? `${value.length} itens` : ""
    const record = value as Record<string, unknown>
    return String(record.name || record.nome || record.full_name || record.custom_id || record.id || "")
  }
  const text = String(value)
  const date = new Date(text)
  return !Number.isNaN(date.getTime()) && /T|\d{4}-\d{2}-\d{2}/.test(text)
    ? date.toLocaleDateString("pt-PT")
    : text
}

export default function PathologyResourceListCard({
  row,
  href,
  endpoint,
}: {
  row: Record<string, any>
  href?: string | null
  endpoint: string
}) {
  const title =
    displayValue(row.custom_id) ||
    displayValue(row.accession_number) ||
    displayValue(row.patient_name) ||
    displayValue(row.name) ||
    `Registo #${row.id}`
  const status = displayValue(row.status || row.estado || row.priority || row.result)
  const details = Object.entries(row)
    .filter(([key, value]) => !isInternalField(key) && !["custom_id", "status", "estado"].includes(key) && displayValue(value))
    .slice(0, 3)

  const card = (
    <article className="group relative h-full overflow-hidden rounded-xl border border-fuchsia-200/40 bg-white/35 p-2.5 pl-3.5 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-fuchsia-300/70 hover:shadow-md dark:border-fuchsia-900/30 dark:bg-white/[0.04]">
      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-fuchsia-500 to-violet-600" />
      <div className="flex items-start gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300">
          <Microscope size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <h3 className="line-clamp-2 text-xs font-bold leading-4 text-foreground">{title}</h3>
            <ChevronRight size={14} className="mt-0.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-fuchsia-600" />
          </div>
          {status ? (
            <span className="mt-1 inline-flex rounded-md border border-fuchsia-200/60 bg-fuchsia-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-fuchsia-700 dark:border-fuchsia-800/40 dark:text-fuchsia-300">
              {status}
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-2 grid gap-1 border-t border-fuchsia-100/60 pt-1.5 dark:border-fuchsia-900/30">
        {details.map(([key, value]) => (
          <p key={key} className="flex min-w-0 items-baseline gap-1 text-[10px]">
            <span className="shrink-0 font-semibold text-muted-foreground">{fieldLabel({ endpoint, name: key })}:</span>
            <span className="truncate font-medium text-foreground">{displayValue(value)}</span>
          </p>
        ))}
      </div>
    </article>
  )

  return href ? <Link href={href} className="block h-full">{card}</Link> : card
}
