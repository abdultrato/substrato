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
            <div className="space-y-4 md:space-y-5">
                <div>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                        Dashboard
                    </h2>
                    <p className="text-sm text-muted-foreground">Visão geral dos últimos 7 dias.</p>
                </div>

                {error && (
                    <div className="text-sm text-rose-600 dark:text-rose-300">
                        Não foi possível carregar os dados.
                    </div>
                )}

                {!stats && !error && (
                    <div className="text-sm text-muted-foreground">
                        Carregando métricas...
                    </div>
                )}

                {stats && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Pacientes"
                            value={stats.patients}
                            icon={Users}
                            href="/patients"
                        />

                        <StatCard
                            title="Requisições Pendentes"
                            value={stats.pending_requests}
                            icon={ClipboardList}
                            href="/requests"
                        />

                        <StatCard
                            title="Exames Hoje"
                            value={stats.exams_today}
                            icon={FlaskConical}
                            href="/laboratory/requests"
                        />

                        <StatCard
                            title="Faturamento Hoje"
                            value={<MoneyValue value={stats.billing_today} />}
                            icon={Receipt}
                            href="/invoices"
                        />
                    </div>
                )}

                <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                    <CardSection title="Funil de receita" subtitle="7 dias">
                        <div className="grid gap-3 md:grid-cols-3">
                            {funnel.map((item) => (
                                <div key={item.label} className="rounded-2xl border border-border bg-card p-3 shadow-sm transition-colors hover:bg-muted/40">
                                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        {item.label}
                                    </div>
                                    <div className="mt-1 font-display text-lg font-bold text-foreground">
                                        {item.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardSection>

                    <CardSection title="Alertas">
                        {alerts.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Sem alertas.</div>
                        ) : (
                            <ul className="space-y-2 text-sm">
                                {alerts.map((a) => (
                                    <li
                                        key={a.label}
                                        className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                                    >
                                        <span>{a.label}</span>
                                        <span className="font-semibold">{a.value}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardSection>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                    <CardSection title="Últimos eventos">
                        {events.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Sem eventos recentes.</div>
                        ) : (
                            <ul className="space-y-2 text-sm">
                                {events.map((ev) => (
                                    <li
                                        key={ev.id}
                                        className="rounded-xl border border-border bg-card/70 px-3 py-2 shadow-sm transition-colors hover:bg-muted/40"
                                    >
                                        <div className="font-semibold text-foreground">{ev.title}</div>
                                        {ev.detail ? (
                                            <div className="text-xs text-muted-foreground mt-0.5">{ev.detail}</div>
                                        ) : null}
                                        {ev.at ? (
                                            <div className="text-[11px] text-muted-foreground mt-0.5">{ev.at}</div>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardSection>

                    <CardSection title="Atalhos">
                        <div className="grid gap-1.5 text-sm">
                            {quickLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    title={link.desc}
                                    className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-sm transition-all hover:border-primary/40 hover:bg-muted hover:translate-x-[1px]"
                                >
                                    <div className="flex items-center gap-2">
                                        <link.icon size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                        <span className="font-medium text-foreground">{link.label}</span>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                                        {link.desc}
                                    </span>
                                </Link>
                            ))}
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
    icon: Icon,
    href,
}: {
    title: string
    value: number | string | JSX.Element
    icon: any
    href?: string
}) {
    const content = (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted/40">
            <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="mt-1 font-display text-2xl font-semibold text-foreground">{value}</p>
            </div>

            <div className="rounded-xl border border-border bg-muted p-3 text-foreground-2 shadow-sm">
                <Icon size={22} />
            </div>
        </div>
    )

    return href ? <Link href={href}>{content}</Link> : content
}

function CardSection({
    title,
    subtitle,
    children,
}: {
    title: string
    subtitle?: string
    children: React.ReactNode
}) {
    return (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-baseline justify-between gap-3">
                <div className="font-display text-base font-semibold tracking-tight text-foreground">
                    {title}
                </div>
                {subtitle ? (
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {subtitle}
                    </div>
                ) : null}
            </div>
            <div className="mt-3">{children}</div>
        </div>
    )
}

const quickLinks = [
    { href: "/patients", label: "Registrar Paciente", icon: UserPlus, desc: "Cadastro e triagem de pacientes" },
    { href: "/requests/new", label: "Criar Requisição", icon: ClipboardList, desc: "Fluxo de laboratório" },
    { href: "/consultations", label: "Agendar Consulta", icon: CalendarClock, desc: "Agendamento clínico e faturamento" },
    { href: "/invoices", label: "Faturas", icon: Receipt, desc: "Emitir e revisar faturas" },
]
