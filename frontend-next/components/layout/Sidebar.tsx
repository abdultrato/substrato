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
    Microscope,
    HeartPulse,
    Stethoscope,
    Pill,
    BriefcaseMedical,
    Calculator,
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
        href: "/laboratorio",
        label: "Laboratório",
        icon: Microscope,
        groups: ["Administrador", "Técnico de Laboratório"],
    },
    {
        href: "/enfermagem",
        label: "Enfermagem",
        icon: HeartPulse,
        groups: ["Administrador", "Enfermeiro"],
    },
    {
        href: "/medicina",
        label: "Medicina",
        icon: Stethoscope,
        groups: ["Administrador", "Médico"],
    },
    {
        href: "/medicina-ocupacional",
        label: "Med. Ocupacional",
        icon: BriefcaseMedical,
        groups: ["Administrador", "Medicina Ocupacional"],
    },
    {
        href: "/farmacia",
        label: "Farmácia",
        icon: Pill,
        groups: ["Administrador", "Técnico de Farmácia"],
    },
    {
        href: "/contabilidade",
        label: "Contabilidade",
        icon: Calculator,
        groups: ["Administrador", "Contabilidade", "Técnico Administrativo"],
    },
    {
        href: "/pacientes",
        label: "Pacientes",
        icon: Users,
        groups: ["Administrador", "Recepcionista", "Enfermeiro", "Médico", "Medicina Ocupacional"],
    },
    {
        href: "/requisicoes",
        label: "Requisições",
        icon: FileText,
        groups: ["Administrador", "Recepcionista", "Médico", "Medicina Ocupacional"],
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
        groups: ["Administrador", "Recepcionista", "Contabilidade", "Técnico Administrativo"],
    },
    {
        href: "/recibos",
        label: "Recibos",
        icon: Receipt,
        groups: ["Administrador", "Recepcionista", "Contabilidade", "Técnico Administrativo"],
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
