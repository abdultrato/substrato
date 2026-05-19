"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import {
    LayoutDashboard,
    Users,
    ClipboardList,
    FlaskConical,
    FileText,
    Briefcase,
    Building2,
    BarChart3,
    Settings,
} from "lucide-react"

interface Props {
    open: boolean
    onClose: () => void
}

const items = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Recepção", href: "/reception", icon: Briefcase },
    { label: "Pacientes", href: "/patients", icon: Users },
    { label: "Requisições", href: "/requests", icon: ClipboardList },
    { label: "Exames", href: "/exams", icon: FlaskConical },
    { label: "Faturas", href: "/invoices", icon: FileText },
    { label: "Empresas", href: "/entities", icon: Building2 },
    { label: "Estatísticas", href: "/statistics", icon: BarChart3 },
    { label: "Definições", href: "/settings", icon: Settings },
]

export default function MobileSidebar({ open, onClose }: Props) {
    const pathname = usePathname()

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex">
            <div
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />

            <aside className="relative w-64 bg-white h-full shadow-lg flex flex-col">
                <div className="h-14 flex items-center justify-between px-4 border-b">
                    <span className="font-semibold text-gray-700">CLIDIS</span>
                    <button onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                    {items.map((item) => {
                        const Icon = item.icon
                        const active = pathname === item.href

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
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
        </div>
    )
}
