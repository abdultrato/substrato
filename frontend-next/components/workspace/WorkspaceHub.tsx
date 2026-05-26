"use client"

import Link from "next/link"
import { ArrowRight, ShieldCheck, type LucideIcon } from "lucide-react"

import ActionTile from "@/components/ui/ActionTile"
import Card from "@/components/ui/Card"
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
  description: string
  href: string
  icon: LucideIcon
}

type WorkspaceHubProps = {
  title: string
  subtitle: string
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
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <div className="flex items-center gap-2">
            {secondaryCta ? (
              <Link
                href={secondaryCta.href}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              >
                {secondaryCta.label}
                <ArrowRight size={15} />
              </Link>
            ) : null}
            <Link
              href={adminHref}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
            >
              <ShieldCheck size={15} />
              {t("Administração", "Administration")}
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        <Card title={noteTitle}>
          <div className="text-sm text-foreground-2 space-y-1">
            {notes.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
