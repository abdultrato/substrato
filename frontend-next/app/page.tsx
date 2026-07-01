"use client"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useEffect, useState } from "react"
import http from "@/lib/http"
import { GROUPS } from "@/lib/rbac"
import MoneyValue from "@/components/ui/MoneyValue"
import Link from "next/link"
import {
    ClipboardList,
    FlaskConical,
    Receipt,
    Users,
    UserPlus,
    CalendarClock,
    LayoutDashboard,
    TrendingUp,
    AlertTriangle,
    Activity,
    ArrowRight,
} from "lucide-react"

interface DashboardStats {
    patients: number
    pending_requests: number
    exams_today: number
    billing_today: number
}

type AnalyticsKpis = Record<string, any>

type EventItem = {
    id: string | number
    title: string
    detail?: string
    at?: string
}

const DASHBOARD_TIMEOUT_MS = 5000

const GLASS =
    "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

export default function DashboardPage() {
    const { loading } = useAuthGuard()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [error, setError] = useState(false)
    const [kpis, setKpis] = useState<AnalyticsKpis>({})
    const [events, setEvents] = useState<EventItem[]>([])

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                const { data } = await http.get("/dashboard/stats/", { timeoutMs: DASHBOARD_TIMEOUT_MS, retryOnTimeout: 0 })
                if (mounted) {
                    const normalized = normalizeDashboardStats(data)
                    setStats(normalized)
                }
            } catch {
                if (mounted) {
                    setError(true)
                }
            }
        }
        load()
        return () => { mounted = false }
    }, [])

    useEffect(() => {
        let alive = true
        async function loadAnalytics() {
            try {
                const { data } = await http.get("/dashboard/analytics/?dias=7", { timeoutMs: DASHBOARD_TIMEOUT_MS, retryOnTimeout: 0 })
                if (alive) setKpis(data?.kpis || {})
            } catch {
                // silencioso
            }
        }
        async function loadEvents() {
            try {
                const { data } = await http.get("/dashboard/events/?limit=10", { timeoutMs: DASHBOARD_TIMEOUT_MS, retryOnTimeout: 0 })
                if (alive) setEvents(Array.isArray(data) ? data : [])
            } catch {
                // silencioso
            }
        }
        loadAnalytics()
        loadEvents()
        return () => { alive = false }
    }, [])

    if (loading) return null

    const alerts: { label: string; value: number | string }[] = []
    if (stats?.pending_requests) alerts.push({ label: "Requisições pendentes", value: stats.pending_requests })
    if (stats?.exams_today === 0) alerts.push({ label: "Sem exames hoje", value: "-" })
    if (kpis["Faturas em aberto"]) alerts.push({ label: "Faturas em aberto", value: kpis["Faturas em aberto"] })

    const funnel = [
        { label: "Consultas/Exames (últ. 7d)", value: kpis["Requisições (no período)"] ?? "—" },
        { label: "Faturas pagas (últ. 7d)", value: kpis["Faturas pagas (no período)"] ?? "—" },
        { label: "Valor pago confirmado (últ. 7d)", value: <MoneyValue value={kpis["Valor pago confirmado (no período)"]} /> },
    ]

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.CONTABILIDADE]}>
            <div className="space-y-2">

                {/* ── Hero ── */}
                <section className={`relative overflow-hidden ${GLASS}`}>
                    <span className="absolute left-0 top-0 h-full w-1 bg-indigo-500" />
                    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 pl-4">
                        <div className="flex min-w-0 items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
                                <LayoutDashboard size={17} />
                            </span>
                            <div>
                                <h1 className="text-lg font-bold leading-tight text-foreground">Painel</h1>
                                <p className="text-[11px] text-muted-foreground">Visão geral dos últimos 7 dias</p>
                            </div>
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                        Não foi possível carregar os dados.
                    </div>
                )}

                {!stats && !error && (
                    <div className="text-sm text-muted-foreground">
                        Carregando métricas...
                    </div>
                )}

                {/* ── Métricas ── */}
                {stats && (
                    <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
                        <StatCard title="Pacientes" value={stats.patients} icon={Users} accent="bg-sky-500" href="/patients" />
                        <StatCard title="Requisições pendentes" value={stats.pending_requests} icon={ClipboardList} accent="bg-amber-500" href="/requests" />
                        <StatCard title="Exames hoje" value={stats.exams_today} icon={FlaskConical} accent="bg-violet-500" href="/clinical-laboratory/orders" />
                        <StatCard title="Faturamento hoje" value={<MoneyValue value={stats.billing_today} />} icon={Receipt} accent="bg-emerald-500" href="/invoices" />
                    </div>
                )}

                {/* ── Funil + Alertas ── */}
                <div className="grid gap-1.5 lg:grid-cols-[2fr_1fr]">
                    <CardSection title="Funil de receita" subtitle="7 dias" icon={TrendingUp} accent="bg-emerald-500">
                        <div className="grid gap-1.5 sm:grid-cols-3">
                            {funnel.map((item) => (
                                <div key={item.label} className="rounded-lg border border-white/20 bg-white/40 px-3 py-2 transition hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                        {item.label}
                                    </div>
                                    <div className="mt-0.5 font-display text-lg font-bold leading-tight text-foreground tabular-nums">
                                        {item.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardSection>

                    <CardSection title="Alertas" icon={AlertTriangle} accent="bg-amber-500">
                        {alerts.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Sem alertas.</div>
                        ) : (
                            <ul className="space-y-1.5 text-sm">
                                {alerts.map((a) => (
                                    <li
                                        key={a.label}
                                        className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                                    >
                                        <span className="text-xs">{a.label}</span>
                                        <span className="text-sm font-semibold tabular-nums">{a.value}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardSection>
                </div>

                {/* ── Eventos + Atalhos ── */}
                <div className="grid gap-1.5 lg:grid-cols-[1.4fr_1fr]">
                    <CardSection title="Últimos eventos" icon={Activity} accent="bg-sky-500">
                        {events.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Sem eventos recentes.</div>
                        ) : (
                            <ul className="space-y-1.5 text-sm">
                                {events.map((ev) => (
                                    <li
                                        key={ev.id}
                                        className="rounded-lg border border-white/20 bg-white/40 px-3 py-1.5 transition hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                                    >
                                        <div className="text-sm font-semibold leading-tight text-foreground">{ev.title}</div>
                                        {ev.detail ? (
                                            <div className="mt-px text-xs text-muted-foreground">{ev.detail}</div>
                                        ) : null}
                                        {ev.at ? (
                                            <div className="mt-px text-[10px] text-muted-foreground">{ev.at}</div>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardSection>

                    <CardSection title="Atalhos" icon={ArrowRight} accent="bg-violet-500">
                        <div className="grid gap-1.5 text-sm">
                            {quickLinks.map((link) => {
                                const LinkIcon = link.icon as any
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        title={link.desc}
                                        className="group flex items-center gap-2.5 rounded-lg border border-white/20 bg-white/40 px-3 py-1.5 transition hover:border-violet-300/50 hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                                    >
                                        <span
                                            aria-hidden
                                            className="pointer-events-none flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                        >
                                            <LinkIcon size={13} strokeWidth={2} />
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{link.label}</span>
                                        <ArrowRight size={13} className="shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                                    </Link>
                                )
                            })}
                        </div>
                    </CardSection>
                </div>
            </div>
        </AppLayout>
    )
}

function normalizeDashboardStats(raw: any): DashboardStats {
    return {
        patients: Number(raw?.patients ?? raw?.pacientes ?? 0),
        pending_requests: Number(raw?.pending_requests ?? raw?.requisicoes_pendentes ?? 0),
        exams_today: Number(raw?.exams_today ?? raw?.exams_hoje ?? raw?.exames_hoje ?? 0),
        billing_today: Number(raw?.billing_today ?? raw?.faturamento_hoje ?? 0),
    }
}

function StatCard({
    title,
    value,
    icon,
    accent,
    href,
}: {
    title: string
    value: number | string | JSX.Element
    icon: any
    accent: string
    href?: string
}) {
    const Icon = icon as any
    const content = (
        <div className={`group relative overflow-hidden ${GLASS} transition hover:shadow-md`}>
            <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
            <div className="flex items-center gap-2.5 px-3 py-2 pl-4">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${accent} text-white shadow-sm`}>
                    <Icon size={15} />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
                    <p className="font-display text-xl font-bold leading-tight text-foreground tabular-nums">{value}</p>
                </div>
            </div>
        </div>
    )

    return href ? <Link href={href}>{content}</Link> : content
}

function CardSection({
    title,
    subtitle,
    icon,
    accent = "bg-slate-400",
    children,
}: {
    title: string
    subtitle?: string
    icon?: any
    accent?: string
    children: React.ReactNode
}) {
    const Icon = icon as any
    return (
        <section className={`relative overflow-hidden ${GLASS}`}>
            <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
            <div className="px-3 py-2 pl-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                        {Icon ? (
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${accent.replace("-500", "-500/10")} text-foreground/60`}>
                                <Icon size={12} />
                            </span>
                        ) : null}
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {title}
                        </div>
                    </div>
                    {subtitle ? (
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {subtitle}
                        </div>
                    ) : null}
                </div>
                <div className="mt-2">{children}</div>
            </div>
        </section>
    )
}

const quickLinks = [
    { href: "/patients", label: "Registrar paciente", icon: UserPlus, desc: "Cadastro e triagem de pacientes" },
    { href: "/requests/new", label: "Criar requisição", icon: ClipboardList, desc: "Fluxo de laboratório" },
    { href: "/consultations", label: "Agendar consulta", icon: CalendarClock, desc: "Agendamento clínico e faturamento" },
    { href: "/invoices", label: "Faturas", icon: Receipt, desc: "Emitir e revisar faturas" },
]
