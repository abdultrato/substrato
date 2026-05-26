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
    { label: "Painel", href: "/", icon: LayoutDashboard },
    { label: "Recepção", href: "/reception", icon: BriefcaseIcon },
    { label: "Pacientes", href: "/patients", icon: Users },
    { label: "Requisições", href: "/requests", icon: ClipboardList },
    { label: "Exames", href: "/exams", icon: FlaskConical },
    { label: "Faturas", href: "/invoices", icon: FileText },
    { label: "Empresas", href: "/entities", icon: Building2 },
    { label: "Estatísticas", href: "/statistics", icon: BarChart3 },
    { label: "Definições", href: "/settings", icon: Settings },
]

export default function AppSidebar() {
    const pathname = usePathname()

    return (
        <aside className="hidden md:flex md:flex-col w-64 border-r bg-white">
            <div className="h-14 flex items-center px-6 font-semibold text-gray-700 border-b">
                CLIDIS
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
                {items.map((item) => {
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
                })}
            </nav>
        </aside>
    )
}
