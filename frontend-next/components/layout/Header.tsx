"use client"

import { useState, useRef, useEffect } from "react"
import { SessionUser, getFullName } from "@/lib/session"
import { useAuth } from "@/hooks/useAuth"
import { ChevronDown, LogOut, User, Settings } from "lucide-react"

interface Props {
    user: SessionUser | null
}

export default function Header ( { user }: Props ) {
    const { signOut } = useAuth()
    const [open, setOpen] = useState( false )
    const menuRef = useRef<HTMLDivElement>( null )

    const name =
        getFullName() ||
        user?.username ||
        "Utilizador"

    function toggle () {
        setOpen( ( v ) => !v )
    }

    // fechar ao clicar fora
    useEffect( () => {
        function handleClick ( e: MouseEvent ) {
            if ( menuRef.current && !menuRef.current.contains( e.target as Node ) ) {
                setOpen( false )
            }
        }

        if ( open ) document.addEventListener( "mousedown", handleClick )
        return () => document.removeEventListener( "mousedown", handleClick )
    }, [open] )

    return (
        <header className="h-14 border-b bg-white flex items-center justify-between px-6">
            <h1 className="font-semibold text-gray-800">
                Sistema Laboratorial
            </h1>

            <div className="relative" ref={menuRef}>
                <button
                    onClick={toggle}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-black"
                >
                    <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold">
                        {name.charAt( 0 ).toUpperCase()}
                    </div>

                    <span className="hidden sm:block">{name}</span>

                    <ChevronDown size={16} />
                </button>

                {open && (
                    <div className="absolute right-0 mt-3 w-48 bg-white border rounded-lg shadow-lg py-1 z-50">
                        <button className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100">
                            <User size={16} />
                            Perfil
                        </button>

                        <button className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100">
                            <Settings size={16} />
                            Definições
                        </button>

                        <div className="border-t my-1" />

                        <button
                            onClick={signOut}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                            <LogOut size={16} />
                            Terminar sessão
                        </button>
                    </div>
                )}
            </div>
        </header>
    )
}
