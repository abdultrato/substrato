"use client"

import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { SessionUser } from "@/lib/session"
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

    const composed =
        `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || ""
    const name = ( user?.full_name || composed || user?.username || "Utilizador" ).trim()
    const fotoUrl = user?.foto_url || null

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
        <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-card/85 px-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70">
            <h1 className="font-display text-sm font-semibold tracking-wide text-foreground">
                Substrato
            </h1>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/70 text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
                    title={isDark ? "Modo claro" : "Modo escuro"}
                >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={toggle}
                        className="flex items-center gap-2 text-sm text-foreground-2 transition-colors hover:text-foreground"
                    >
                        {fotoUrl ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={fotoUrl}
                                    alt={name}
                                    className="h-8 w-8 rounded-full border border-border object-cover shadow-sm"
                                />
                            </>
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm text-xs font-semibold">
                                {name.charAt( 0 ).toUpperCase()}
                            </div>
                        )}

                        <span className="hidden sm:block">{name}</span>

                        <ChevronDown size={16} />
                    </button>

                    {open && (
                        <div className="absolute right-0 z-50 mt-1.5 w-56 rounded-2xl border border-border bg-card p-1 shadow-lg">
                            <Link
                                href="/perfil"
                                onClick={() => setOpen(false)}
                                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-foreground-2 transition-colors hover:bg-muted hover:text-primary"
                            >
                                <User size={16} />
                                Perfil
                            </Link>

                            <Link
                                href="/definicoes"
                                onClick={() => setOpen(false)}
                                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-foreground-2 transition-colors hover:bg-muted hover:text-primary"
                            >
                                <Settings size={16} />
                                Definições
                            </Link>

                            <div className="my-1 border-t border-border" />

                            <button
                                onClick={signOut}
                                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-300"
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
