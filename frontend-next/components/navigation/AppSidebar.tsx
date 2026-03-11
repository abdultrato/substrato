"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Briefcase as BriefcaseIcon,
    LayoutDashboard,
    Users,
    ClipboardList,
    FlaskConical,
    FileText,
    Building2,
    BarChart3,
    Settings,
} from "lucide-react"

interface Item {
    label: string
    href: string
    icon: any
}

const items: Item[] = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Recepção", href: "/recepcao", icon: BriefcaseIcon },
    { label: "Pacientes", href: "/pacientes", icon: Users },
    { label: "Requisições", href: "/requisicoes", icon: ClipboardList },
    { label: "Exames", href: "/exames", icon: FlaskConical },
    { label: "Faturas", href: "/faturas", icon: FileText },
    { label: "Entidades", href: "/entidades", icon: Building2 },
    { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
    { label: "Configurações", href: "/configuracoes", icon: Settings },
]

export default function AppSidebar () {
    const pathname = usePathname()

    return (
        <aside className="hidden md:flex md:flex-col w-64 border-r bg-white">
            <div className="h-14 flex items-center px-6 font-semibold text-gray-700 border-b">
                CLIDIS
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
                {items.map( ( item ) => {
                    const Icon = item.icon
                    const active = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
                ${active
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-100"}
              `}
                        >
                            <Icon size={18} />
                            {item.label}
                        </Link>
                    )
                } )}
            </nav>
        </aside>
    )
}
