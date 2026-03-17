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
    pacientes: number
    requisicoes_pendentes: number
    exames_hoje: number
    faturamento_hoje: number
}

type AnalyticsKpis = Record<string, any>

type EventItem = {
    id: string | number
    title: string
    detail?: string
    at?: string
}

export default function DashboardPage () {
    const { loading } = useAuthGuard()
    const [stats, setStats] = useState<DashboardStats | null>( null )
    const [error, setError] = useState( false )
    const [kpis, setKpis] = useState<AnalyticsKpis>({})
    const [events, setEvents] = useState<EventItem[]>([])

    useEffect( () => {
        async function load () {
            try {
                const { data } = await http.get( "/dashboard/stats/" )
                setStats( data )
            } catch {
                setError( true )
            }
        }
        load()
    }, [] )

    useEffect( () => {
        let alive = true
        async function loadAnalytics () {
            try {
                const { data } = await http.get( "/dashboard/analytics/?dias=7" )
                if ( alive ) setKpis( data?.kpis || {} )
            } catch {
                // silencioso
            }
        }
        async function loadEvents () {
            try {
                const { data } = await http.get( "/dashboard/events/?limit=10" )
                if ( alive ) setEvents( Array.isArray( data ) ? data : [] )
            } catch {
                // silencioso
            }
        }
        loadAnalytics()
        loadEvents()
        return () => { alive = false }
    }, [] )

    if ( loading ) return null

    const alerts: { label: string; value: number | string }[] = []
    if ( stats?.requisicoes_pendentes ) alerts.push( { label: "Requisições pendentes", value: stats.requisicoes_pendentes } )
    if ( stats?.exames_hoje === 0 ) alerts.push( { label: "Sem exames hoje", value: "-" } )
    if ( kpis["Faturas em aberto"] ) alerts.push( { label: "Faturas em aberto", value: kpis["Faturas em aberto"] } )

    const funnel = [
        { label: "Consultas/Exames (últ. 7d)", value: kpis["Requisições (no período)"] ?? "—" },
        { label: "Faturas pagas (últ. 7d)", value: kpis["Faturas pagas (no período)"] ?? "—" },
        { label: "Valor pago confirmado (últ. 7d)", value: <MoneyValue value={kpis["Valor pago confirmado (no período)"]} /> },
    ]

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.CONTABILIDADE]}>
            <div className="space-y-4 md:space-y-5">
                <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                    Dashboard
                </h2>

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
                            value={stats.pacientes}
                            icon={Users}
                        />

                        <StatCard
                            title="Requisições Pendentes"
                            value={stats.requisicoes_pendentes}
                            icon={ClipboardList}
                        />

                        <StatCard
                            title="Exames Hoje"
                            value={stats.exames_hoje}
                            icon={FlaskConical}
                        />

                        <StatCard
                            title="Faturamento Hoje"
                            value={<MoneyValue value={stats.faturamento_hoje} />}
                            icon={Receipt}
                        />
                    </div>
                )}

                <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                    <CardSection title="Funil de receita (7d)" description="Do atendimento até o recebimento.">
                        <div className="grid gap-3 md:grid-cols-3">
                            {funnel.map((item) => (
                                <div key={item.label} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {item.label}
                                    </div>
                                    <div className="mt-1 text-lg font-semibold text-foreground">
                                        {item.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardSection>

                    <CardSection title="Alertas" description="Pendências que exigem atenção imediata.">
                        {alerts.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Sem alertas críticos.</div>
                        ) : (
                            <ul className="space-y-2 text-sm">
                                {alerts.map((a) => (
                                    <li
                                        key={a.label}
                                        className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900"
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
                    <CardSection title="Últimos eventos" description="Movimentações recentes nos módulos.">
                        {events.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Sem eventos recentes.</div>
                        ) : (
                            <ul className="space-y-2 text-sm">
                                {events.map( ( ev ) => (
                                    <li
                                        key={ev.id}
                                        className="rounded-xl border border-border bg-card/70 px-3 py-2 shadow-sm"
                                    >
                                        <div className="font-semibold text-foreground">{ev.title}</div>
                                        {ev.detail ? (
                                            <div className="text-xs text-muted-foreground mt-0.5">{ev.detail}</div>
                                        ) : null}
                                        {ev.at ? (
                                            <div className="text-[11px] text-muted-foreground mt-0.5">{ev.at}</div>
                                        ) : null}
                                    </li>
                                ) ) }
                            </ul>
                        )}
                    </CardSection>

                    <CardSection title="Atalhos rápidos" description="Ações frequentes de atendimento.">
                        <div className="grid gap-2 text-sm">
                            {quickLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 shadow-sm transition hover:bg-muted"
                                >
                                    <div className="flex items-center gap-2">
                                        <link.icon size={16} />
                                        <span className="font-medium text-foreground">{link.label}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{link.desc}</span>
                                </Link>
                            ))}
                        </div>
                    </CardSection>
                </div>
            </div>
        </AppLayout>
    )
}

function StatCard ( {
    title,
    value,
    icon: Icon,
}: {
    title: string
    value: number | string | JSX.Element
    icon: any
} ) {
    return (
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
}

function CardSection({
    title,
    description,
    children,
}: {
    title: string
    description?: string
    children: React.ReactNode
}) {
    return (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold text-foreground">{title}</div>
                    {description ? (
                        <div className="text-xs text-muted-foreground">{description}</div>
                    ) : null}
                </div>
            </div>
            <div className="mt-3">{children}</div>
        </div>
    )
}

const quickLinks = [
    { href: "/pacientes", label: "Registrar paciente", icon: UserPlus, desc: "Cadastro e triagem" },
    { href: "/requisicoes/nova", label: "Criar requisição", icon: ClipboardList, desc: "Fluxo laboratorial" },
    { href: "/consultas", label: "Agendar consulta", icon: CalendarClock, desc: "Médico + faturamento" },
    { href: "/faturas", label: "Faturas", icon: Receipt, desc: "Emissão e revisão" },
]
