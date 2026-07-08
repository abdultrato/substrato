"use client"

import { type LucideIcon } from "lucide-react"

import ActionTile from "@/components/ui/ActionTile"
import MetricCard from "@/components/ui/MetricCard"
import { useLanguage } from "@/hooks/useLanguage"

type WorkspaceMetric = {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  /** Barra lateral colorida (ex.: "border-l-sky-500"). */
  accentClass?: string
  /** Cor do chip do ícone (ex.: "bg-sky-500/15 text-sky-600 dark:text-sky-300"). */
  iconClass?: string
  /** Quando definido, o indicador vira um link clicável para a lista correspondente. */
  href?: string
}

type WorkspaceAction = {
  title: string
  description?: string
  href: string
  icon: LucideIcon
  /** Barra lateral colorida (ex.: "border-l-sky-500"). */
  accentClass?: string
  /** Cor do chip do ícone (ex.: "bg-sky-500/15 text-sky-600 dark:text-sky-300"). */
  iconClass?: string
}

type WorkspaceHubProps = {
  title: string
  subtitle?: string
  icon?: LucideIcon
  /** Cor do chip do ícone no cabeçalho (ex.: "bg-violet-500/15 text-violet-600 dark:text-violet-300"). */
  iconClass?: string
  /** Cor da barra superior do cartão de cabeçalho (ex.: "bg-violet-500"). */
  barClass?: string
  metrics: WorkspaceMetric[]
  actions: WorkspaceAction[]
  noteTitle?: string
  notes?: string[]
}

export default function WorkspaceHub({
  title,
  subtitle,
  icon,
  iconClass,
  barClass,
  metrics,
  actions,
  noteTitle,
  notes = [],
}: WorkspaceHubProps) {
  const { tr } = useLanguage()
  const Icon = icon

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/30 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5 sm:p-5">
        <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${barClass ?? "bg-primary"}`} />

        <div className="flex min-w-0 items-center gap-3">
          {Icon ? (
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass ?? "bg-muted text-muted-foreground"}`}
            >
              <Icon size={20} strokeWidth={2} />
            </span>
          ) : null}
          <div className="min-w-0">
            <h1 className="break-words font-display text-xl font-semibold text-foreground sm:text-2xl">
              {tr(title)}
            </h1>
            {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{tr(subtitle)}</p> : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {metrics.map((item) => (
            <MetricCard
              key={item.label}
              label={item.label}
              value={item.value}
              hint={item.hint}
              icon={item.icon}
              accentClass={item.accentClass}
              iconClass={item.iconClass}
              href={item.href}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-4">
        {actions.map((item) => (
          <ActionTile
            key={item.href}
            title={item.title}
            description={item.description}
            href={item.href}
            icon={item.icon}
            accentClass={item.accentClass}
            iconClass={item.iconClass}
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
