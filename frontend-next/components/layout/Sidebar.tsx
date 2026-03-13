"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SessionUser } from "@/lib/session"
import {
    Briefcase as BriefcaseIcon,

    Users,
    FileText,
    FlaskConical,
    ClipboardList,
    Receipt,
    Shield,
    Layers,
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
    },
    {
        href: "/recepcao",
        label: "Recepção",
        icon: BriefcaseIcon,
        groups: ["Administrador", "Recepcionista"],
    },
    {
        href: "/pacientes",
        label: "Pacientes",
        icon: Users,
        groups: ["Administrador", "Recepcionista", "Enfermeiro"],
    },
    {
        href: "/requisicoes",
        label: "Requisições",
        icon: FileText,
        groups: ["Administrador", "Recepcionista", "Técnico de Laboratório"],
    },
    {
        href: "/exames",
        label: "Exames",
        icon: FlaskConical,
        groups: ["Administrador", "Técnico de Laboratório"],
    },
    {
        href: "/faturas",
        label: "Faturas",
        icon: Receipt,
        groups: ["Administrador", "Recepcionista"],
    },
    {
        href: "/modulos",
        label: "Módulos",
        icon: Layers,
        groups: ["Administrador"],
    },
    {
        href: "/recursos",
        label: "Recursos API",
        icon: Layers,
        groups: ["Administrador"],
    },
    {
        href: "/admin",
        label: "Administração",
        icon: Shield,
        groups: ["Administrador"],
    },
]

export default function Sidebar ( { user }: Props ) {
    const pathname = usePathname()

    const userGroups = user?.groups ?? []

    function hasAccess ( item: NavItem ) {
        if ( !item.groups ) return true
        return item.groups.some( ( g ) => userGroups.includes( g ) )
    }

    return (
        <aside className="w-64 bg-white border-r hidden md:flex flex-col">
            <div className="p-6 font-bold text-gray-800 tracking-wide">
                CLIDIS
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
                Sistema Laboratorial v1.0
            </div>
        </aside>
    )
}
