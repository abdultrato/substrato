"use client"

import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  LogIn,
  Mail,
  Phone,
  Workflow,
  type LucideIcon,
} from "lucide-react"

import AutoTranslateTree from "@/components/i18n/AutoTranslateTree"
import {
  DOMAIN_GROUPS,
  DOMAIN_MODULES,
  domainModuleDefinitionsForDomain,
  type DomainModuleStatus,
} from "@/lib/domainModules"
import { getModuleIcon } from "@/lib/moduleIcons"

type StatusTone = {
  label: string
  icon: LucideIcon
  chip: string
}

const statusTones: Record<DomainModuleStatus, StatusTone> = {
  implemented: {
    label: "Implementados",
    icon: CheckCircle2,
    chip: "border-emerald-200/50 bg-emerald-100/30 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300",
  },
  partial: {
    label: "Parciais",
    icon: Workflow,
    chip: "border-sky-200/50 bg-sky-100/30 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300",
  },
  planned: {
    label: "Planeados",
    icon: Clock,
    chip: "border-amber-200/50 bg-amber-100/30 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300",
  },
}

const domainBars = [
  "border-l-sky-500 dark:border-l-sky-400",
  "border-l-emerald-500 dark:border-l-emerald-400",
  "border-l-violet-500 dark:border-l-violet-400",
  "border-l-amber-500 dark:border-l-amber-400",
  "border-l-rose-500 dark:border-l-rose-400",
  "border-l-indigo-500 dark:border-l-indigo-400",
  "border-l-teal-500 dark:border-l-teal-400",
  "border-l-fuchsia-500 dark:border-l-fuchsia-400",
]

const moduleStatusCounts = DOMAIN_MODULES.reduce<Record<DomainModuleStatus, number>>(
  (acc, item) => {
    acc[item.status] += 1
    return acc
  },
  { implemented: 0, partial: 0, planned: 0 }
)

const totalModules = DOMAIN_MODULES.length
const totalResources = DOMAIN_MODULES.reduce((acc, item) => acc + item.resources.length, 0)
const plannedModules = DOMAIN_MODULES.filter((item) => item.status === "planned").slice(0, 6)

const statPill =
  "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold backdrop-blur-xl"

const glassChip =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/[0.05] px-2.5 text-xs font-medium text-foreground backdrop-blur-xl transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"

function StatusChip({ status, count }: { status: DomainModuleStatus; count: number }) {
  const tone = statusTones[status]
  const Icon = tone.icon
  return (
    <span className={`${statPill} ${tone.chip}`}>
      <Icon size={11} /> {tone.label} <strong className="text-[11px]">{count}</strong>
    </span>
  )
}

export default function SubstratoAboutPage() {
  return (
    <AutoTranslateTree>
      <main className="min-h-screen text-foreground">
        <div className="mx-auto max-w-7xl space-y-1.5 px-3 py-3 sm:px-4 lg:px-6">
          {/* Cabeçalho fundido: identidade + pílulas + acções + contactos num só bloco translúcido */}
          <section className="relative overflow-hidden rounded-2xl border border-indigo-200/25 bg-gradient-to-br from-indigo-100/[0.05] via-white/[0.015] to-sky-100/[0.03] shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-indigo-800/20 dark:from-indigo-950/[0.05] dark:via-white/[0.01] dark:to-sky-950/[0.03]">
            <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-indigo-400/15 blur-3xl" />
            <div className="relative flex flex-wrap items-center gap-2.5 px-3 py-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-md shadow-indigo-500/25">
                  <Layers size={15} />
                </span>
                <div className="min-w-0">
                  <h1 className="text-base font-bold leading-tight text-foreground">Plataforma Substrato</h1>
                  <p className="text-[10px] text-muted-foreground">
                    {DOMAIN_GROUPS.length} domínios · {totalModules} módulos · {totalResources} recursos ligados
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`${statPill} border-indigo-200/50 bg-indigo-100/30 text-indigo-700 dark:border-indigo-700/30 dark:bg-indigo-900/20 dark:text-indigo-300`}>
                  <Layers size={11} /> Domínios <strong className="text-[11px]">{DOMAIN_GROUPS.length}</strong>
                </span>
                <StatusChip status="implemented" count={moduleStatusCounts.implemented} />
                <StatusChip status="partial" count={moduleStatusCounts.partial} />
                <StatusChip status="planned" count={moduleStatusCounts.planned} />
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <Link
                  href="/login"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-600 px-3 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-sky-700"
                >
                  <LogIn size={13} />
                  Entrar
                </Link>
                <Link href="/modules" className={glassChip}>
                  <Layers size={13} />
                  Ver módulos
                </Link>
              </div>
            </div>

            <div className="relative flex flex-wrap items-center gap-1.5 border-t border-white/15 px-3 py-1.5 dark:border-white/[0.06]">
              <a href="mailto:substratosys@gmail.com" className={glassChip}>
                <Mail size={13} className="text-indigo-500 dark:text-indigo-400" />
                substratosys@gmail.com
              </a>
              <a href="tel:+258847778476" className={glassChip}>
                <Phone size={13} className="text-indigo-500 dark:text-indigo-400" />
                +258 84 777 8476
              </a>
            </div>
          </section>

          {/* Mapa de domínios */}
          <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">
            {DOMAIN_GROUPS.map((domain, index) => {
              const modules = domainModuleDefinitionsForDomain(domain.key)
              const implemented = modules.filter((item) => item.status === "implemented").length
              const partial = modules.filter((item) => item.status === "partial").length
              const planned = modules.filter((item) => item.status === "planned").length
              const Icon = getModuleIcon(domain.key)
              const bar = domainBars[index % domainBars.length]

              return (
                <Link
                  key={domain.key}
                  href={`/modules/${domain.key}`}
                  className={`group flex min-w-0 flex-col rounded-xl border border-l-4 border-white/20 bg-white/25 p-2 shadow-sm backdrop-blur-sm transition hover:border-[var(--primary-300)] hover:bg-white/40 dark:border-white/10 dark:bg-white/5 dark:hover:border-[var(--primary-600)] dark:hover:bg-white/[0.08] ${bar}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                        <Icon size={12} />
                      </span>
                      <span className="line-clamp-1 text-xs font-semibold text-foreground">{domain.label}</span>
                    </div>
                    <ArrowRight
                      size={13}
                      className="mt-0.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  </div>

                  <p className="mt-1 line-clamp-2 min-h-[1.9rem] text-[11px] leading-snug text-muted-foreground">
                    {domain.description}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <span className={`${statPill} ${statusTones.implemented.chip}`}>
                      <CheckCircle2 size={11} /> <strong className="text-[11px]">{implemented}</strong>
                    </span>
                    <span className={`${statPill} ${statusTones.partial.chip}`}>
                      <Workflow size={11} /> <strong className="text-[11px]">{partial}</strong>
                    </span>
                    <span className={`${statPill} ${statusTones.planned.chip}`}>
                      <Clock size={11} /> <strong className="text-[11px]">{planned}</strong>
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{modules.length} módulos</span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Próximos módulos */}
          {plannedModules.length ? (
            <>
              <div className="flex items-center gap-2 px-1 pt-1">
                <Clock size={13} className="text-amber-600 dark:text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wide text-foreground">Próximos módulos</h2>
                <span className="text-[10px] text-muted-foreground">{moduleStatusCounts.planned} planeados</span>
              </div>
              <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">
                {plannedModules.map((module) => {
                  const domain = DOMAIN_GROUPS.find((item) => item.key === module.domain)
                  const Icon = getModuleIcon(module.key)
                  return (
                    <div
                      key={module.key}
                      className="flex min-w-0 flex-col rounded-xl border border-l-4 border-white/20 border-l-amber-500 bg-white/25 p-2 shadow-sm backdrop-blur-sm dark:border-white/10 dark:border-l-amber-400 dark:bg-white/5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                            <Icon size={12} />
                          </span>
                          <span className="line-clamp-1 text-xs font-semibold text-foreground">{module.label}</span>
                        </div>
                        <span className={`${statPill} ${statusTones.planned.chip} shrink-0`}>
                          <Clock size={11} /> Planeado
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 min-h-[1.9rem] text-[11px] leading-snug text-muted-foreground">
                        {module.description}
                      </p>
                      <div className="mt-1.5 text-[10px] text-muted-foreground">{domain?.label || module.domain}</div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}
        </div>
      </main>
    </AutoTranslateTree>
  )
}
