"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { SessionUser } from "@/lib/session"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import {
    Briefcase as BriefcaseIcon,

    Users,
    FileText,
    FlaskConical,
    ClipboardList,
    Receipt,
    Microscope,
    Droplet,
    HeartPulse,
    Stethoscope,
    ScrollText,
    Baby,
    Scissors,
    Pill,
    PackageSearch,
    Calculator,
    Shield,
    Layers,
    Activity,
    BarChart3,
    CalendarClock,
    CreditCard,
    Bell,
    Bug,
    Settings,
    Moon,
    Sun,
} from "lucide-react"
import useTheme from "@/hooks/useTheme"

interface Props {
    user: SessionUser | null
    open?: boolean
    onClose?: () => void
    className?: string
}

interface NavItem {
    href: string
    label: string
    icon: any
    groups?: string[]
    desc?: string
}

const ALL_GROUPS = Object.values(GROUPS)

/**
 * Definição dos menus com RBAC
 */
const NAV_ITEMS: NavItem[] = [
    { href: "/", label: "Dashboard", icon: ClipboardList, desc: "Visão geral e indicadores", groups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE] },
    { href: "/reception", label: "Recepção", icon: BriefcaseIcon, desc: "Triagem e atendimento", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO] },
    { href: "/patients", label: "Pacientes", icon: Users, desc: "Cadastro e histórico", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.ENFERMAGEM, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL] },
    { href: "/consultations", label: "Consultas", icon: CalendarClock, desc: "Agenda clínica", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.CONTABILIDADE] },
    { href: "/requests", label: "Requisições", icon: FileText, desc: "Pedidos clínicos", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL] },
    { href: "/medical-records", label: "Prontuário", icon: ScrollText, desc: "Histórico médico", groups: [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL] },
    { href: "/medicine", label: "Medicina", icon: Stethoscope, desc: "Atendimento médico", groups: [GROUPS.ADMIN, GROUPS.MEDICINA] },
    { href: "/nursing", label: "Enfermagem", icon: HeartPulse, desc: "Cuidados de enfermagem", groups: [GROUPS.ADMIN, GROUPS.ENFERMAGEM] },
    { href: "/laboratory", label: "Laboratório", icon: Microscope, desc: "Análises clínicas", groups: [GROUPS.ADMIN, GROUPS.LABORATORIO] },
    { href: "/exams", label: "Exames", icon: FlaskConical, desc: "Catálogo de exames", groups: [GROUPS.ADMIN] },
    { href: "/banco-sangue", label: "Banco de Sangue", icon: Droplet, desc: "Estoque e transfusões", groups: [GROUPS.ADMIN, GROUPS.LABORATORIO] },
    { href: "/maternity", label: "Maternidade", icon: Baby, desc: "Gestação e parto", groups: [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL] },
    { href: "/surgery", label: "Cirurgia", icon: Scissors, desc: "Procedimentos cirúrgicos", groups: [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL] },
    { href: "/occupational-medicine", label: "Med. Ocupacional", icon: BriefcaseIcon, desc: "Saúde no trabalho", groups: [GROUPS.ADMIN, GROUPS.MEDICINA_OCUPACIONAL] },
    { href: "/farmacia", label: "Farmácia", icon: Pill, desc: "Dispensação e estoque", groups: [GROUPS.ADMIN, GROUPS.FARMACIA] },
    { href: "/farmacia/requisicoes-materiais", label: "Req. Materiais", icon: PackageSearch, desc: "Solicitar e acompanhar avio de materiais", groups: ALL_GROUPS },
    { href: "/payments", label: "Pagamentos", icon: CreditCard, desc: "Recebimentos", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE] },
    { href: "/invoices", label: "Faturas", icon: Receipt, desc: "Emissão e revisão", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE] },
    { href: "/receipts", label: "Recibos", icon: Receipt, desc: "Comprovativos", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE] },
    { href: "/contabilidade", label: "Contabilidade", icon: Calculator, desc: "Lançamentos e relatórios", groups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE] },
    { href: "/entidades", label: "Empresas", icon: BriefcaseIcon, desc: "Convênios e clientes", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA_OCUPACIONAL] },
    { href: "/resources/human-resources", label: "Recursos Humanos", icon: BriefcaseIcon, desc: "Equipa e funcionários", groups: [GROUPS.ADMIN, GROUPS.RECURSOS_HUMANOS] },
    { href: "/statistics", label: "Estatísticas", icon: BarChart3, desc: "Indicadores e relatórios", groups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE] },
    { href: "/modules/equipment", label: "Equipamentos", icon: Settings, desc: "Ativos e manutenção", groups: ALL_GROUPS },
    { href: "/modules", label: "Módulos", icon: Layers, desc: "Configuração de módulos", groups: [GROUPS.ADMIN, GROUPS.LABORATORIO] },
    { href: "/notifications", label: "Notificações", icon: Bell, desc: "Centro de avisos", groups: [GROUPS.ADMIN] },
    { href: "/audit", label: "Auditoria", icon: Activity, desc: "Trilha de eventos", groups: [GROUPS.ADMIN] },
    { href: "/monitoring", label: "Monitoramento", icon: Bug, desc: "Saúde do sistema", groups: [GROUPS.ADMIN] },
    { href: "/resources", label: "Recursos API", icon: Layers, desc: "Endpoints disponíveis", groups: [GROUPS.ADMIN] },
    { href: "/admin", label: "Administração", icon: Shield, desc: "Painel administrativo", groups: [GROUPS.ADMIN] },
]

export default function Sidebar({ user, open = false, onClose, className }: Props) {
    const pathname = usePathname()
    const router = useRouter()
    const { isDark, toggle: toggleTheme } = useTheme()
    const prefetchedRoutesRef = useRef<Set<string>>(new Set())

    const hasAccess = useCallback((item: NavItem) => {
        if (!item.groups) return true
        return userHasAnyGroup(user, item.groups)
    }, [user])

    const visibleItems = useMemo(
        () => NAV_ITEMS.filter(hasAccess),
        [hasAccess]
    )

    const prefetchRoute = useCallback((href: string) => {
        if (!href || prefetchedRoutesRef.current.has(href)) return
        prefetchedRoutesRef.current.add(href)
        router.prefetch(href)
    }, [router])

    useEffect(() => {
        if (typeof window === "undefined") return

        const allowed = new Set(visibleItems.map((item) => item.href))
        const priority = [
            "/",
            "/patients",
            "/reception",
            "/consultations",
            "/requests",
            "/laboratory",
            "/invoices",
            "/farmacia",
        ].filter((href) => allowed.has(href))

        if (!priority.length) return

        if ("requestIdleCallback" in window && "cancelIdleCallback" in window) {
            const idleId = window.requestIdleCallback(
                () => {
                    for (const href of priority) prefetchRoute(href)
                },
                { timeout: 1200 }
            )
            return () => window.cancelIdleCallback(idleId)
        }

        const timerId = window.setTimeout(() => {
            for (const href of priority) prefetchRoute(href)
        }, 220)
        return () => window.clearTimeout(timerId)
    }, [prefetchRoute, visibleItems])

    const menu = (
        <div className="chrome-surface flex h-full w-64 flex-col border-r pb-12 backdrop-blur">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/20 bg-white/5 px-3 py-3 backdrop-blur">
                <Link
                    href="/"
                    onClick={onClose}
                    className="group flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                    title="Ir para o dashboard"
                >
                    <img
                        src="/static/img/logo.png"
                        alt="Substrato"
                        className="h-9 w-9 rounded-xl object-contain p-1 shadow-sm transition-transform group-hover:scale-105"
                        style={{ backgroundColor: "#fff" }}
                    />
                    <div className="min-w-0">
                        <div className="font-display text-sm font-bold tracking-tight text-white">
                            Substrato
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">
                            Plataforma clínica
                        </div>
                    </div>
                </Link>
                <button
                    type="button"
                    onClick={onClose}
                    className="md:hidden rounded-md p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Fechar menu"
                >
                    ✕
                </button>
            </div>

            <nav className="flex flex-1 flex-col gap-0.5 px-2 pt-4 pb-6 overflow-y-auto">
                {visibleItems.map((item) => {
                    const Icon = item.icon
                    const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href + "/"))

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch
                            onClick={onClose}
                            onMouseEnter={() => prefetchRoute(item.href)}
                            onFocus={() => prefetchRoute(item.href)}
                            title={item.desc}
                            aria-current={active ? "page" : undefined}
                            className={`group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                                active
                                    ? "bg-white/20 text-white shadow-sm before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-x-2 before:-translate-y-1/2 before:rounded-r-full before:bg-white"
                                    : "text-white/85 hover:bg-white/10 hover:text-white hover:translate-x-[1px]"
                            }`}
                        >
                            <Icon size={16} className={active ? "text-white" : "text-white/75 group-hover:text-white"} />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            <div className="border-t border-white/15 p-2">
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex w-full items-center justify-between rounded-xl border border-white/20 bg-white/5 px-2.5 py-2 text-xs font-semibold text-white/90 transition-all hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                    title={isDark ? "Modo claro" : "Modo escuro"}
                >
                    <span className="flex items-center gap-2">
                        {isDark ? <Sun size={15} /> : <Moon size={15} />}
                        Tema
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-white/60">
                        {isDark ? "Claro" : "Escuro"}
                    </span>
                </button>
            </div>
        </div>
    )

    return (
        <>
            <aside className={`hidden md:flex ${className || ""}`}>{menu}</aside>

            <div className={`md:hidden fixed inset-0 z-40 pointer-events-none ${open ? "" : ""}`}>
                <div
                    className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                    onClick={onClose}
                />
                <div
                    className={`absolute inset-y-0 left-0 w-72 max-w-[90vw] shadow-2xl transition-transform duration-200 pointer-events-auto ${open ? "translate-x-0" : "-translate-x-full"}`}
                >
                    {menu}
                </div>
            </div>
        </>
    )
}
