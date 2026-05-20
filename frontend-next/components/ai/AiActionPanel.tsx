"use client"

import Link from "next/link"
import { CheckCircle2, Download, ExternalLink } from "lucide-react"

import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import { useLanguage } from "@/hooks/useLanguage"

export type AiSuggestedAction = {
  id: number
  action_type: string
  requires_confirmation: boolean
  status: string
  href?: string
  result_href?: string
  label_pt?: string
  label_en?: string
  confirmation_summary?: string
  result_summary?: string
}

type Props = {
  actions: AiSuggestedAction[]
  confirmingId?: number | null
  results?: Record<number, AiSuggestedAction>
  onConfirm: (action: AiSuggestedAction) => Promise<void>
}

function ActionLink({ href, label }: { href: string; label: string }) {
  if (href.startsWith("/api/")) {
    return (
      <a
        href={href}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover"
      >
        <Download size={14} />
        {label}
      </a>
    )
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover"
    >
      <ExternalLink size={14} />
      {label}
    </Link>
  )
}

export default function AiActionPanel({ actions, confirmingId, results, onConfirm }: Props) {
  const { t, isPortuguese } = useLanguage()
  if (!actions.length) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action) => {
        const result = results?.[action.id]
        const effective = result || action
        const href = effective.result_href || effective.href || ""
        const label = (isPortuguese ? action.label_pt : action.label_en) || action.confirmation_summary || action.action_type

        if (href && (!action.requires_confirmation || result)) {
          return (
            <ActionLink
              key={action.id}
              href={href}
              label={result ? t("Transferir relatório", "Download report") : label}
            />
          )
        }

        if (action.requires_confirmation && action.status === "pending_confirmation") {
          return (
            <Button
              key={action.id}
              type="button"
              loading={confirmingId === action.id}
              onClick={() => onConfirm(action)}
              className="rounded-xl px-3 py-1.5 text-xs"
            >
              <CheckCircle2 size={14} />
              {label}
            </Button>
          )
        }

        return (
          <Badge key={action.id} variant={effective.status === "confirmed" ? "success" : "warning"}>
            {effective.result_summary || label}
          </Badge>
        )
      })}
    </div>
  )
}
