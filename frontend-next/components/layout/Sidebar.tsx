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
    Moon,
    Sun,
} from "lucide-react"
import useTheme from "@/hooks/useTheme"

interface Props {
    user: SessionUser | null
}

interface NavItem {
    href: string
    label: string
    icon: any
    groups?: string[]
}

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
        href: "/recepcao",
        label: "Recepção",
        icon: BriefcaseIcon,
        groups: [GROUPS.ADMIN, GROUPS.RECEPCAO],
    },
    {
        href: "/laboratorio",
        label: "Laboratório",
        icon: Microscope,
        groups: [GROUPS.ADMIN, GROUPS.LABORATORIO],
    },
    {
        href: "/enfermagem",
        label: "Enfermagem",
        icon: HeartPulse,
        groups: [GROUPS.ADMIN, GROUPS.ENFERMAGEM],
    },
    {
        href: "/medicina",
        label: "Medicina",
        icon: Stethoscope,
        groups: [GROUPS.ADMIN, GROUPS.MEDICINA],
    },
    {
        href: "/prontuario",
        label: "Prontuário",
        icon: ScrollText,
        groups: [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL],
    },
    {
        href: "/maternidade",
        label: "Maternidade",
        icon: Baby,
        groups: [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL],
    },
    {
        href: "/cirurgia",
        label: "Cirurgia",
        icon: Scissors,
        groups: [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL],
    },
    {
        href: "/medicina-ocupacional",
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
        href: "/pagamentos",
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
        href: "/consultas",
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
        href: "/recursos/recursos_humanos",
        label: "Recursos Humanos",
        icon: BriefcaseIcon,
        groups: [GROUPS.ADMIN, GROUPS.RECURSOS_HUMANOS],
    },
    {
        href: "/estatisticas",
        label: "Estatísticas",
        icon: BarChart3,
        groups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE],
    },
    {
        href: "/auditoria",
        label: "Auditoria",
        icon: Activity,
        groups: [GROUPS.ADMIN],
    },
    {
        href: "/notificacoes",
        label: "Notificações",
        icon: Bell,
        groups: [GROUPS.ADMIN],
    },
    {
        href: "/monitoramento",
        label: "Monitoramento",
        icon: Bug,
        groups: [GROUPS.ADMIN],
    },
    {
        href: "/pacientes",
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
        href: "/requisicoes",
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
        href: "/exames",
        label: "Exames",
        icon: FlaskConical,
        groups: [GROUPS.ADMIN],
    },
    {
        href: "/faturas",
        label: "Faturas",
        icon: Receipt,
        groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE],
    },
    {
        href: "/recibos",
        label: "Recibos",
        icon: Receipt,
        groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE],
    },
    {
        href: "/modulos",
        label: "Módulos",
        icon: Layers,
        groups: [GROUPS.ADMIN],
    },
    {
        href: "/recursos",
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

export default function Sidebar ( { user }: Props ) {
    const pathname = usePathname()
    const { isDark, toggle: toggleTheme } = useTheme()

    function hasAccess ( item: NavItem ) {
        if ( !item.groups ) return true
        return userHasAnyGroup( user, item.groups )
    }

    return (
        <aside className="hidden w-64 flex-col border-r border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75 md:flex">
            <div className="px-3 py-3 font-display text-xs font-semibold tracking-[0.32em] text-foreground/80">
                SUBSTRATO
            </div>

            <nav className="flex flex-col gap-1 px-2.5">
                {NAV_ITEMS.filter( hasAccess ).map( ( item ) => {
                    const Icon = item.icon
                    const active = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background
                ${active
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-foreground-2 hover:bg-muted hover:text-foreground"
                                }
              `}
                        >
                            <Icon size={16} />
                            {item.label}
                        </Link>
                    )
                } )}
            </nav>

            <div className="mt-auto p-2.5">
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-card/70 px-2.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
                    title={isDark ? "Modo claro" : "Modo escuro"}
                >
                    <span className="flex items-center gap-2">
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                        Tema
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                        {isDark ? "Claro" : "Escuro"}
                    </span>
                </button>

                <div className="mt-2 text-xs text-muted-foreground">
                    Substrato Platform
                </div>
            </div>
        </aside>
    )
}
