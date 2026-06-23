"use client"

import Link from "next/link"
import { ArrowRight, ShieldCheck, type LucideIcon } from "lucide-react"

import ActionTile from "@/components/ui/ActionTile"
import MetricCard from "@/components/ui/MetricCard"
import PageHeader from "@/components/ui/PageHeader"
import { useLanguage } from "@/hooks/useLanguage"

type WorkspaceMetric = {
  label: string
  value: string | number
  hint?: string
}

type WorkspaceAction = {
  title: string
  description?: string
  href: string
  icon: LucideIcon
}

type WorkspaceHubProps = {
  title: string
  subtitle?: string
  adminHref: string
  secondaryCta?: { href: string; label: string }
  metrics: WorkspaceMetric[]
  actions: WorkspaceAction[]
  noteTitle?: string
  notes?: string[]
}

export default function WorkspaceHub({
  title,
  subtitle,
  adminHref,
  secondaryCta,
  metrics,
  actions,
  noteTitle,
  notes = [],
}: WorkspaceHubProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-3">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <div className="flex items-center gap-2">
            {secondaryCta ? (
              <Link
                href={secondaryCta.href}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground-2 transition hover:bg-muted hover:text-foreground"
              >
                {secondaryCta.label}
                <ArrowRight size={13} />
              </Link>
            ) : null}
            <Link
              href={adminHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground-2 transition hover:bg-muted hover:text-foreground"
            >
              <ShieldCheck size={13} />
              {t("Admin", "Admin")}
            </Link>
          </div>
        }
      />

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((item) => (
          <ActionTile
            key={item.href}
            title={item.title}
            description={item.description}
            href={item.href}
            icon={item.icon}
          />
        ))}
      </div>

      {noteTitle && notes.length ? (
        <section className="rounded-xl border border-white/20 bg-white/25 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <p className="mb-1.5 text-xs font-semibold text-foreground">{noteTitle}</p>
          <div className="space-y-0.5 text-xs text-muted-foreground">
            {notes.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
