"use client"

import Link from "next/link"
import { ArrowLeft, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

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
  /** Versão compacta: cabeçalho e subcartões mais pequenos, menos espaçamento. */
  dense?: boolean
  /** Quando definido, mostra o botão de voltar no início do cabeçalho. */
  backHref?: string
  backLabel?: string
  /** Renderiza as ações numa linha única, sem quebra. */
  actionsNowrap?: boolean
  /** Conteúdo extra compacto dentro do cartão de cabeçalho, abaixo das métricas. */
  headerPanels?: ReactNode
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
  dense,
  backHref,
  backLabel,
  actionsNowrap,
  headerPanels,
}: WorkspaceHubProps) {
  const { tr } = useLanguage()
  const Icon = icon

  return (
    <div className={dense ? "space-y-1" : "space-y-3"}>
      <div className={`relative overflow-hidden rounded-2xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5 ${dense ? "p-1.5" : "p-4 sm:p-5"}`}>
        <span aria-hidden className={`absolute inset-x-0 top-0 ${dense ? "h-0.5" : "h-1"} ${barClass ?? "bg-primary"}`} />

        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className={`flex min-w-0 items-center ${dense ? "gap-1.5" : "gap-3"}`}>
            {Icon ? (
              <span
                className={`flex ${dense ? "h-6 w-6 rounded-lg" : "h-10 w-10 rounded-xl"} shrink-0 items-center justify-center ${iconClass ?? "bg-muted text-muted-foreground"}`}
              >
                <Icon size={dense ? 13 : 20} strokeWidth={2} />
              </span>
            ) : null}
            <div className="min-w-0">
              <h1 className={`break-words font-display font-semibold text-foreground ${dense ? "text-sm leading-tight" : "text-xl sm:text-2xl"}`}>
                {tr(title)}
              </h1>
              {subtitle ? <p className={`text-muted-foreground ${dense ? "text-xs" : "mt-0.5 text-sm"}`}>{tr(subtitle)}</p> : null}
            </div>
          </div>
          {backHref ? (
            <Link
              href={backHref}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background/80 text-xs font-semibold text-foreground-2 shadow-sm transition hover:bg-muted hover:text-foreground ${dense ? "h-7 px-2" : "h-8 px-3"}`}
            >
              <ArrowLeft size={dense ? 12 : 13} />
              {tr(backLabel ?? "Voltar")}
            </Link>
          ) : null}
        </div>

        <div className={`grid gap-1 ${dense ? "mt-1 grid-cols-4 md:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-12" : "mt-4 grid-cols-2 sm:grid-cols-4"}`}>
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
              dense={dense}
            />
          ))}
        </div>

        {headerPanels ? <div className={dense ? "mt-1" : "mt-3"}>{headerPanels}</div> : null}
      </div>

      <div className={actionsNowrap ? "grid grid-cols-5 gap-1.5" : "grid grid-cols-2 gap-1.5 xl:grid-cols-4"}>
        {actions.map((item) => (
          <ActionTile
            key={item.href}
            title={item.title}
            description={item.description}
            href={item.href}
            icon={item.icon}
            accentClass={item.accentClass}
            iconClass={item.iconClass}
            dense={dense}
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
