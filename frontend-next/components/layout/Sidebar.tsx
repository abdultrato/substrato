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
    Pill,
    Calculator,
    Shield,
    Layers,
    Activity,
    BarChart3,
    CalendarClock,
} from "lucide-react"

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

    function hasAccess ( item: NavItem ) {
        if ( !item.groups ) return true
        return userHasAnyGroup( user, item.groups )
    }

    return (
        <aside className="w-64 bg-white border-r hidden md:flex flex-col">
            <div className="p-6 font-bold text-gray-800 tracking-wide">
                SUBSTRATO
            </div>

            <nav className="flex flex-col gap-1 px-3">
                {NAV_ITEMS.filter( hasAccess ).map( ( item ) => {
                    const Icon = item.icon
                    const active = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
                ${active
                                    ? "bg-gray-900 text-white"
                                    : "text-gray-700 hover:bg-gray-100"
                                }
              `}
                        >
                            <Icon size={18} />
                            {item.label}
                        </Link>
                    )
                } )}
            </nav>

            <div className="mt-auto p-4 text-xs text-gray-400">
                Substrato Platform
            </div>
        </aside>
    )
}
