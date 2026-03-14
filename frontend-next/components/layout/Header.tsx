"use client"

import { useState, useRef, useEffect } from "react"
import { SessionUser, getFullName } from "@/lib/session"
import { useAuth } from "@/hooks/useAuth"
import useTheme from "@/hooks/useTheme"
import { ChevronDown, LogOut, Moon, Settings, Sun, User } from "lucide-react"

interface Props {
    user: SessionUser | null
}

export default function Header ( { user }: Props ) {
    const { signOut } = useAuth()
    const { isDark, toggle: toggleTheme } = useTheme()
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
        <header className="sticky top-0 z-40 h-14 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between px-6">
            <h1 className="font-semibold text-[var(--text)]">
                Substrato
            </h1>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] transition hover:bg-[var(--gray-100)]"
                    aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
                    title={isDark ? "Modo claro" : "Modo escuro"}
                >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={toggle}
                        className="flex items-center gap-2 text-sm text-[var(--gray-700)] hover:text-[var(--text)]"
                    >
                        <div className="w-8 h-8 rounded-full bg-[var(--primary-600)] text-white flex items-center justify-center text-xs font-semibold">
                            {name.charAt( 0 ).toUpperCase()}
                        </div>

                        <span className="hidden sm:block">{name}</span>

                        <ChevronDown size={16} />
                    </button>

                    {open && (
                        <div className="absolute right-0 mt-3 w-48 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg py-1 z-50">
                            <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--gray-700)] hover:bg-[var(--gray-100)]">
                                <User size={16} />
                                Perfil
                            </button>

                            <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--gray-700)] hover:bg-[var(--gray-100)]">
                                <Settings size={16} />
                                Definições
                            </button>

                            <div className="border-t border-[var(--border)] my-1" />

                            <button
                                onClick={signOut}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-500/10"
                            >
                                <LogOut size={16} />
                                Terminar sessão
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
