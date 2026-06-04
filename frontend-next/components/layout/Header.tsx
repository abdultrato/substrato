"use client"

import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { SessionUser } from "@/lib/session"
import { useAuth } from "@/hooks/useAuth"
import useTheme from "@/hooks/useTheme"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefresh } from "@/hooks/useSafeDataRefresh"
import { AlignJustify, ChevronDown, LogOut, Moon, RefreshCw, Settings, Sun, User } from "lucide-react"

interface Props {
    user: SessionUser | null
    onMenuClick?: () => void
}

export default function Header({ user, onMenuClick }: Props) {
    const { signOut } = useAuth()
    const { isDark, toggle: toggleTheme } = useTheme()
    const { t } = useLanguage()
    const { refreshNow, isRefreshing, lastRefreshAt, hasUnsavedInput } = useSafeDataRefresh()
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    const composed =
        `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || ""
    const name = (user?.full_name || composed || user?.username || t("Utilizador", "User")).trim()
    const fotoUrl = user?.foto_url || user?.photo_url || null
    function toggle() {
        setOpen((v) => !v)
    }

    // fechar ao clicar fora
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }

        if (open) document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [open])

    return (
        <header className="sticky top-0 z-40 flex h-14 flex-nowrap items-center justify-between gap-2 overflow-visible border-b border-border bg-card/95 px-2 text-sm leading-none shadow-sm backdrop-blur sm:gap-3 sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <button
                    type="button"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground-2 shadow-sm transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                    onClick={onMenuClick}
                    aria-label={t("Mostrar ou ocultar menu lateral", "Show or hide sidebar")}
                    title={t("Mostrar ou ocultar menu lateral", "Show or hide sidebar")}
                >
                    <AlignJustify size={18} />
                </button>
                <Link
                    href="/"
                    className="group flex min-w-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                    title={t("Ir para o dashboard", "Go to dashboard")}
                >
                    <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md shadow-sm transition-transform group-hover:scale-105"
                        aria-hidden
                        style={{ backgroundColor: "#fff" }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/static/img/logo.png"
                            alt="Substrato"
                            className="block h-full max-h-7 w-full max-w-7 object-contain p-1"
                        />
                    </div>
                    <div className="hidden min-w-0 font-display text-sm font-bold leading-tight tracking-tight text-foreground min-[360px]:block">
                        Substrato
                    </div>
                </Link>
            </div>

            <div className="ml-auto flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => void refreshNow("manual")}
                    disabled={isRefreshing}
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground-2 shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-wait disabled:opacity-70"
                    aria-label={t("Atualizar dados sem recarregar", "Refresh data without reloading")}
                    title={
                        hasUnsavedInput
                            ? t(
                                "Atualizar dados em segundo plano sem perder campos ainda não gravados",
                                "Refresh data in the background without losing unsaved fields"
                            )
                            : lastRefreshAt
                              ? t("Atualizar dados", "Refresh data")
                              : t("Atualizar dados sem recarregar", "Refresh data without reloading")
                    }
                >
                    <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
                    {hasUnsavedInput ? (
                        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-300" />
                    ) : null}
                </button>

                <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground-2 shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                    aria-label={isDark ? t("Mudar para modo claro", "Switch to light mode") : t("Mudar para modo escuro", "Switch to dark mode")}
                    title={isDark ? t("Modo claro", "Light mode") : t("Modo escuro", "Dark mode")}
                >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={toggle}
                        className="flex min-h-9 items-center gap-2 rounded-md border border-transparent px-1.5 text-sm leading-tight text-foreground-2 transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                    >
                        {fotoUrl ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={fotoUrl}
                                    alt={name}
                                    className="block h-8 w-8 rounded-full border border-white/30 object-cover shadow-sm"
                                />
                            </>
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
                                {name.charAt(0).toUpperCase()}
                            </div>
                        )}

                        <span className="hidden max-w-[11rem] truncate sm:block">{name}</span>

                        <ChevronDown size={16} />
                    </button>

                    {open && (
                        <div className="absolute right-0 z-50 mt-1.5 w-56 max-w-[calc(100vw-1rem)] rounded-lg border border-border bg-card p-1 text-foreground shadow-lg">
                            <Link
                                href="/profile"
                                onClick={() => setOpen(false)}
                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground-2 transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <User size={16} />
                                {t("Perfil", "Profile")}
                            </Link>

                            <Link
                                href="/settings"
                                onClick={() => setOpen(false)}
                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground-2 transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <Settings size={16} />
                                {t("Configurações", "Settings")}
                            </Link>

                            <div className="my-1 border-t border-border" />

                            <button
                                onClick={signOut}
                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                            >
                                <LogOut size={16} />
                                {t("Terminar sessão", "Sign out")}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
