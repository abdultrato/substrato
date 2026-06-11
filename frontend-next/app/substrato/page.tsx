"use client"

import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
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
  className: string
  iconClassName: string
}

const statusTones: Record<DomainModuleStatus, StatusTone> = {
  implemented: {
    label: "Implementado",
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    iconClassName: "text-emerald-600",
  },
  partial: {
    label: "Parcial",
    icon: Workflow,
    className: "border-sky-200 bg-sky-50 text-sky-800",
    iconClassName: "text-sky-600",
  },
  planned: {
    label: "Planeado",
    icon: Clock,
    className: "border-amber-200 bg-amber-50 text-amber-800",
    iconClassName: "text-amber-600",
  },
}

const operatingLayers = [
  {
    title: "Modelo de domínio",
    body: "A navegação é organizada por domínio de negócio e reutiliza as áreas operacionais já disponíveis no produto.",
    icon: Layers,
  },
  {
    title: "Base multiunidade",
    body: "Tenants, identidade, permissões, auditoria, notificações e integrações ficam separados das áreas clínicas e operacionais.",
    icon: ShieldCheck,
  },
  {
    title: "Fluxos extensíveis",
    body: "Módulos parciais e planeados continuam visíveis para orientar evolução sem quebrar estruturas operacionais estáveis.",
    icon: Workflow,
  },
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

function statusLabel(status: DomainModuleStatus): string {
  return statusTones[status].label
}

function StatusPill({ status }: { status: DomainModuleStatus }) {
  const tone = statusTones[status]
  const Icon = tone.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[0.72rem] font-semibold ${tone.className}`}>
      <Icon className={`h-3.5 w-3.5 ${tone.iconClassName}`} />
      {tone.label}
    </span>
  )
}

export default function SubstratoAboutPage() {
  return (
    <AutoTranslateTree>
      <main className="min-h-screen bg-background text-foreground">
        <section className="border-b border-border bg-card">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-10">
            <div className="flex min-w-0 flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Plataforma Substrato
                </div>
                <div className="space-y-3">
                  <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
                    Sistema operacional modular para saúde, gestão e serviços clínicos
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                    O Substrato reúne atendimento, diagnóstico, hospitalização, cuidados, operações, administração e plataforma num catálogo único de módulos reutilizáveis.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover"
                >
                  Entrar
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/modules"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
                >
                  Ver módulos
                  <Layers className="h-4 w-4" />
                </Link>
                <a
                  href="mailto:substratosys@gmail.com"
                  className="inline-flex items-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
                >
                  substratosys@gmail.com
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Domínios</div>
                <div className="mt-3 text-3xl font-semibold text-foreground">{DOMAIN_GROUPS.length}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Áreas de negócio organizadas para navegação e extensão do produto.</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Módulos</div>
                <div className="mt-3 text-3xl font-semibold text-foreground">{totalModules}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Módulos catalogados, incluindo capacidades completas, parciais e planeadas.</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Recursos ligados</div>
                <div className="mt-3 text-3xl font-semibold text-foreground">{totalResources}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Entradas já conectadas às telas e fluxos operacionais do sistema.</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Estado</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusPill status="implemented" />
                  <StatusPill status="partial" />
                  <StatusPill status="planned" />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {moduleStatusCounts.implemented} implementados, {moduleStatusCounts.partial} parciais e {moduleStatusCounts.planned} planeados.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-3">
            {operatingLayers.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg border border-border bg-background p-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-foreground">{item.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Mapa atual de domínios</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cada bloco resume uma família funcional e aponta para a navegação modular do produto.
                  </p>
                </div>
                <Link
                  href="/modules"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
                >
                  Catálogo completo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {DOMAIN_GROUPS.map((domain) => {
                  const modules = domainModuleDefinitionsForDomain(domain.key)
                  const implemented = modules.filter((item) => item.status === "implemented").length
                  const partial = modules.filter((item) => item.status === "partial").length
                  const planned = modules.filter((item) => item.status === "planned").length
                  const Icon = getModuleIcon(domain.key)

                  return (
                    <Link
                      key={domain.key}
                      href={`/modules/${domain.key}`}
                      className="group rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:bg-muted/40"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg border border-border bg-background p-2 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-base font-semibold text-foreground">{domain.label}</h3>
                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{domain.description}</p>
                          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                            <span><strong className="text-foreground">{implemented}</strong> {statusLabel("implemented")}</span>
                            <span><strong className="text-foreground">{partial}</strong> {statusLabel("partial")}</span>
                            <span><strong className="text-foreground">{planned}</strong> {statusLabel("planned")}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <h2 className="text-base font-semibold text-foreground">Próximos módulos</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Itens planeados permanecem visíveis para deixar clara a direção de evolução do produto.
                </p>
                <div className="mt-4 divide-y divide-border border-y border-border">
                  {plannedModules.map((module) => {
                    const domain = DOMAIN_GROUPS.find((item) => item.key === module.domain)
                    return (
                      <div key={module.key} className="py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground">{module.label}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{domain?.label || module.domain}</div>
                          </div>
                          <StatusPill status={module.status} />
                        </div>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{module.description}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <h2 className="text-base font-semibold text-foreground">Contactos</h2>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <a className="block rounded-md border border-border bg-background px-3 py-2 text-foreground transition hover:bg-muted" href="mailto:substratosys@gmail.com">
                    substratosys@gmail.com
                  </a>
                  <a className="block rounded-md border border-border bg-background px-3 py-2 text-foreground transition hover:bg-muted" href="tel:+258847778476">
                    +258 84 777 8476
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </AutoTranslateTree>
  )
}
