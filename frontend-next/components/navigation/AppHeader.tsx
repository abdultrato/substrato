"use client"

import { useState } from "react"
import { Menu, Bell, UserCircle2, LogOut } from "lucide-react"

interface Props {
    onMenuClick?: () => void
    userName?: string
}

export default function AppHeader ( { onMenuClick, userName }: Props ) {
    const [open, setOpen] = useState( false )

    return (
        <header className="h-14 border-b bg-white flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 rounded hover:bg-gray-100"
                >
                    <Menu size={20} />
                </button>

                <span className="font-semibold text-gray-700">
                    Sistema Laboratorial
                </span>
            </div>

            <div className="flex items-center gap-4">
                <button className="relative p-2 rounded hover:bg-gray-100">
                    <Bell size={20} />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                <div className="relative">
                    <button
                        onClick={() => setOpen( !open )}
                        className="flex items-center gap-2 hover:bg-gray-100 rounded px-2 py-1"
                    >
                        <UserCircle2 size={24} />
                        <span className="hidden md:block text-sm">
                            {userName || "Usuário"}
                        </span>
                    </button>

                    {open && (
                        <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-md">
                            <button className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full">
                                <UserCircle2 size={16} />
                                Perfil
                            </button>

                            <button className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-red-600">
                                <LogOut size={16} />
                                Sair
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
