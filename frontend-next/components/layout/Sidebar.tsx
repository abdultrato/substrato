"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
    Calculator,
    Shield,
    Layers,
    Activity,
    BarChart3,
    CalendarClock,
    CreditCard,
    Bell,
    Bug,
    Wrench,
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
}

const ALL_GROUPS = Object.values(GROUPS)

/**
 * Definição dos menus com RBAC
 */
const NAV_ITEMS: NavItem[] = [
    {
        href: "/",
        label: "Dashboard",
        icon: ClipboardList,
        groups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE],
    },
    {
        href: "/reception",
        label: "Recepção",
        icon: BriefcaseIcon,
        groups: [GROUPS.ADMIN, GROUPS.RECEPCAO],
    },
    {
        href: "/laboratory",
        label: "Laboratório",
        icon: Microscope,
        groups: [GROUPS.ADMIN, GROUPS.LABORATORIO],
    },
    {
        href: "/banco-sangue",
        label: "Banco de Sangue",
        icon: Droplet,
        groups: [GROUPS.ADMIN, GROUPS.LABORATORIO],
    },
    {
        href: "/nursing",
        label: "Enfermagem",
        icon: HeartPulse,
        groups: [GROUPS.ADMIN, GROUPS.ENFERMAGEM],
    },
    {
        href: "/medicine",
        label: "Medicina",
        icon: Stethoscope,
        groups: [GROUPS.ADMIN, GROUPS.MEDICINA],
    },
    {
        href: "/medical-records",
        label: "Prontuário",
        icon: ScrollText,
        groups: [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL],
    },
    {
        href: "/maternity",
        label: "Maternidade",
        icon: Baby,
        groups: [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL],
    },
    {
        href: "/surgery",
        label: "Cirurgia",
        icon: Scissors,
        groups: [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL],
    },
    {
        href: "/occupational-medicine",
        label: "Med. Ocupacional",
        icon: BriefcaseIcon,
        groups: [GROUPS.ADMIN, GROUPS.MEDICINA_OCUPACIONAL],
    },
    {
        href: "/farmacia",
        label: "Farmácia",
        icon: Pill,
        groups: [GROUPS.ADMIN, GROUPS.FARMACIA],
    },
    {
        href: "/payments",
        label: "Pagamentos",
        icon: CreditCard,
        groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE],
    },
    {
        href: "/contabilidade",
        label: "Contabilidade",
        icon: Calculator,
        groups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE],
    },
    {
        href: "/consultations",
        label: "Consultas",
        icon: CalendarClock,
        groups: [
            GROUPS.ADMIN,
            GROUPS.RECEPCAO,
            GROUPS.MEDICINA,
            GROUPS.MEDICINA_OCUPACIONAL,
            GROUPS.CONTABILIDADE,
        ],
    },
    {
        href: "/resources/human-resources",
        label: "Recursos Humanos",
        icon: BriefcaseIcon,
        groups: [GROUPS.ADMIN, GROUPS.RECURSOS_HUMANOS],
    },
    {
        href: "/statistics",
        label: "Estatísticas",
        icon: BarChart3,
        groups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE],
    },
    {
        href: "/audit",
        label: "Auditoria",
        icon: Activity,
        groups: [GROUPS.ADMIN],
    },
    {
        href: "/notifications",
        label: "Notificações",
        icon: Bell,
        groups: [GROUPS.ADMIN],
    },
    {
        href: "/monitoring",
        label: "Monitoramento",
        icon: Bug,
        groups: [GROUPS.ADMIN],
    },
    {
        href: "/patients",
        label: "Pacientes",
        icon: Users,
        groups: [
            GROUPS.ADMIN,
            GROUPS.RECEPCAO,
            GROUPS.ENFERMAGEM,
            GROUPS.MEDICINA,
            GROUPS.MEDICINA_OCUPACIONAL,
        ],
    },
    {
        href: "/requests",
        label: "Requisições",
        icon: FileText,
        groups: [
            GROUPS.ADMIN,
            GROUPS.RECEPCAO,
            GROUPS.MEDICINA,
            GROUPS.MEDICINA_OCUPACIONAL,
        ],
    },
    {
        href: "/entidades",
        label: "Empresas",
        icon: BriefcaseIcon,
        groups: [
            GROUPS.ADMIN,
            GROUPS.RECEPCAO,
            GROUPS.MEDICINA_OCUPACIONAL,
        ],
    },
    {
        href: "/modules/equipment",
        label: "Equipamentos",
        icon: Wrench,
        groups: ALL_GROUPS,
    },
    {
        href: "/exams",
        label: "Exames",
        icon: FlaskConical,
        groups: [GROUPS.ADMIN],
    },
    {
        href: "/invoices",
        label: "Faturas",
        icon: Receipt,
        groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE],
    },
    {
        href: "/receipts",
        label: "Recibos",
        icon: Receipt,
        groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE],
    },
    {
        href: "/modules",
        label: "Módulos",
        icon: Layers,
        groups: [GROUPS.ADMIN, GROUPS.LABORATORIO],
    },
    {
        href: "/resources",
        label: "Recursos API",
        icon: Layers,
        groups: [GROUPS.ADMIN],
    },
    {
        href: "/admin",
        label: "Administração",
        icon: Shield,
        groups: [GROUPS.ADMIN],
    },
]

export default function Sidebar({ user, open = false, onClose, className }: Props) {
    const pathname = usePathname()
    const { isDark, toggle: toggleTheme } = useTheme()

    function hasAccess(item: NavItem) {
        if (!item.groups) return true
        return userHasAnyGroup(user, item.groups)
    }

    const menu = (
        <div className="chrome-surface flex h-full w-64 flex-col border-r pb-12 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/20 bg-white/5 px-3 py-3 backdrop-blur">
                <div className="flex items-center gap-3">
                    <img
                        src="/static/img/logo.png"
                        alt="Logo do Substrato"
                        className="h-9 w-9 rounded-xl object-contain p-1 shadow-sm"
                        style={{ backgroundColor: "#fff" }}
                    />
                    <div className="min-w-0">
                        <div className="font-display text-xs font-semibold tracking-[0.32em] text-white/90">
                            SUBSTRATO
                        </div>
                        <div className="text-[11px] text-white/70">
                            Plataforma clínica integrada
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="md:hidden text-white/70 hover:text-white"
                    aria-label="Fechar menu"
                >
                    ✕
                </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 px-2.5 pt-6 pb-6 overflow-y-auto">
                {NAV_ITEMS.filter(hasAccess).map((item) => {
                    const Icon = item.icon
                    const active = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className={`
                flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent
                ${active
                                    ? "bg-white/20 text-white shadow-sm"
                                    : "text-white hover:bg-white/10 hover:text-white"
                                }
              `}
                        >
                            <Icon size={16} />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="border-t border-white/15 p-2.5">
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex w-full items-center justify-between rounded-xl border border-white/25 bg-white/10 px-2.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                    aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
                    title={isDark ? "Modo claro" : "Modo escuro"}
                >
                    <span className="flex items-center gap-2">
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                        Tema
                    </span>
                    <span className="text-[11px] font-medium text-white/80">
                        {isDark ? "Claro" : "Escuro"}
                    </span>
                </button>

                <div className="mt-2 text-xs text-white/70">
                    Logo principal sincronizada com a identidade do sistema
                </div>
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
