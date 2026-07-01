"use client"

import Link from "next/link"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { usePathname } from "next/navigation"
import { SessionUser } from "@/lib/session"
import { useAuth } from "@/hooks/useAuth"
import useTheme from "@/hooks/useTheme"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefresh } from "@/hooks/useSafeDataRefresh"
import { useWorkspaceScope } from "@/hooks/useWorkspaceScope"
import { userHasAnyGroup } from "@/lib/rbac"
import { AlignJustify, ChevronDown, ChevronLeft, ChevronRight, LogOut, Moon, RefreshCw, Settings, Sun, User, X } from "lucide-react"
import { NAV_ITEMS, NAV_SECTIONS, type NavItem } from "@/components/layout/Sidebar"
import { abortActiveRequests, subscribeRequestActivity } from "@/lib/requestActivity"

interface Props {
    user: SessionUser | null
    onMenuClick?: () => void
    scrolledDown?: boolean
}

export default function Header({ user, onMenuClick, scrolledDown = false }: Props) {
    const { signOut } = useAuth()
    const { isDark, toggle: toggleTheme } = useTheme()
    const { t } = useLanguage()
    const pathname = usePathname()
    const activeScope = useWorkspaceScope()
    const { refreshNow, isRefreshing, lastRefreshAt, hasUnsavedInput } = useSafeDataRefresh()
    const [open, setOpen] = useState(false)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)
    const [activeRequestCount, setActiveRequestCount] = useState(0)
    const activeRequestIdsRef = useRef(new Set<string>())
    const menuRef = useRef<HTMLDivElement>(null)
    const navScrollerRef = useRef<HTMLDivElement>(null)

    const composed =
        `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || ""
    const name = (user?.full_name || composed || user?.username || t("Utilizador", "User")).trim()
    const fotoUrl = user?.foto_url || user?.photo_url || null
    function toggle() {
        setOpen((v) => !v)
    }

    const hasAccess = useCallback((item: NavItem) => {
        if (!item.groups) return true
        return userHasAnyGroup(user, item.groups)
    }, [user])

    const itemMatchesWorkspaceScope = useCallback((item: NavItem) => {
        if (activeScope === "neutral") return true
        if (item.href === "/workspaces") return true
        const isEducationItem =
            item.href === "/education" || item.href.startsWith("/education/")
        return activeScope === "education" ? isEducationItem : !isEducationItem
    }, [activeScope])

    const visibleItems = useMemo(
        () => NAV_ITEMS.filter((item) => hasAccess(item) && itemMatchesWorkspaceScope(item)),
        [hasAccess, itemMatchesWorkspaceScope]
    )

    const sectionedItems = useMemo(() => {
        const remaining = new Set(visibleItems.map((item) => item.href))
        const sections = NAV_SECTIONS.map((section) => {
            const items = section.hrefs
                .map((href) => visibleItems.find((item) => item.href === href))
                .filter((item): item is NavItem => Boolean(item))
            items.forEach((item) => remaining.delete(item.href))
            return { ...section, items }
        }).filter((section) => section.items.length > 0)

        const otherItems = visibleItems.filter((item) => remaining.has(item.href))
        if (otherItems.length) {
            sections.push({
                label: "Outros",
                labelEn: "Other",
                hrefs: otherItems.map((item) => item.href),
                items: otherItems,
            })
        }

        return sections
    }, [visibleItems])

    const updateNavScrollState = useCallback(() => {
        const scroller = navScrollerRef.current
        if (!scroller) return
        const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth
        setCanScrollLeft(scroller.scrollLeft > 4)
        setCanScrollRight(scroller.scrollLeft < maxScrollLeft - 4)
    }, [])

    const scrollHeaderNav = useCallback((direction: "left" | "right") => {
        const scroller = navScrollerRef.current
        if (!scroller) return
        const distance = Math.max(220, Math.floor(scroller.clientWidth * 0.72))
        scroller.scrollBy({
            left: direction === "right" ? distance : -distance,
            behavior: "smooth",
        })
        window.setTimeout(updateNavScrollState, 260)
    }, [updateNavScrollState])

    // fechar ao clicar fora
    useEffect(() => {
        return subscribeRequestActivity((event) => {
            if (event.phase === "start") activeRequestIdsRef.current.add(event.id)
            else activeRequestIdsRef.current.delete(event.id)
            setActiveRequestCount(activeRequestIdsRef.current.size)
        })
    }, [])

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }

        if (open) document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [open])

    useEffect(() => {
        const scroller = navScrollerRef.current
        if (!scroller) return

        updateNavScrollState()
        scroller.addEventListener("scroll", updateNavScrollState, { passive: true })
        window.addEventListener("resize", updateNavScrollState)
        return () => {
            scroller.removeEventListener("scroll", updateNavScrollState)
            window.removeEventListener("resize", updateNavScrollState)
        }
    }, [sectionedItems, updateNavScrollState])

    return (
        <header className="relative overflow-visible border-b border-border/70 bg-gradient-to-r from-card/95 via-card/90 to-primary/[0.04] text-sm leading-none shadow-[0_1px_12px_rgba(15,23,42,0.07)] backdrop-blur-xl dark:from-card/95 dark:via-card/90 dark:to-primary/[0.07]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
            <div className="flex h-11 flex-nowrap items-center justify-between gap-2 px-2 sm:gap-2 sm:px-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground-2 shadow-sm transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 md:hidden"
                        onClick={onMenuClick}
                        aria-label={t("Abrir menu lateral", "Open sidebar")}
                        title={t("Abrir menu lateral", "Open sidebar")}
                    >
                        <AlignJustify size={18} />
                    </button>
                    <Link
                        href="/"
                        className="group flex min-w-0 items-center gap-2 rounded-lg px-1 outline-none transition-colors hover:bg-primary/[0.05] focus-visible:ring-2 focus-visible:ring-ring/25"
                        title={t("Ir para o dashboard", "Go to dashboard")}
                    >
                        <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/15 bg-primary/[0.06] shadow-sm transition-transform group-hover:scale-105"
                            aria-hidden
                        >
                            <span
                                className="block h-full w-full"
                                style={{
                                    backgroundImage: "var(--substrato-logo-url)",
                                    backgroundRepeat: "no-repeat",
                                    backgroundSize: "80%",
                                    backgroundPosition: "center",
                                }}
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
                        onClick={() => {
                            if (activeRequestCount > 0 || isRefreshing) {
                                abortActiveRequests()
                                return
                            }
                            void refreshNow("manual")
                        }}
                        className={`group relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 ${
                            activeRequestCount > 0 || isRefreshing
                                ? "border-rose-400/50 bg-rose-500/10 text-rose-600 hover:border-rose-500/70 hover:bg-rose-500/15 dark:text-rose-300"
                                : "border-border/80 bg-background/80 text-foreground-2 hover:-translate-y-px hover:border-primary/35 hover:bg-primary/8 hover:text-primary hover:shadow-md"
                        }`}
                        aria-label={
                            activeRequestCount > 0 || isRefreshing
                                ? t("Abortar ação em processamento", "Abort action in progress")
                                : t("Atualizar dados sem recarregar", "Refresh data without reloading")
                        }
                        title={
                            activeRequestCount > 0 || isRefreshing
                                ? t("Clique para abortar a ação em processamento", "Click to abort the action in progress")
                                : hasUnsavedInput
                                ? t(
                                    "Atualizar dados em segundo plano sem perder campos ainda não gravados",
                                    "Refresh data in the background without losing unsaved fields"
                                )
                                : lastRefreshAt
                                  ? t("Atualizar dados", "Refresh data")
                                  : t("Atualizar dados sem recarregar", "Refresh data without reloading")
                        }
                    >
                        {activeRequestCount > 0 || isRefreshing ? (
                            <>
                                <RefreshCw size={22} className="absolute animate-spin opacity-35" strokeWidth={1.5} />
                                <X size={15} className="relative z-10" strokeWidth={2.4} />
                                {activeRequestCount > 1 ? (
                                    <span className="absolute right-0.5 top-0.5 min-w-3 rounded-full bg-rose-500 px-0.5 text-center text-[8px] font-bold leading-3 text-white">
                                        {activeRequestCount > 9 ? "9+" : activeRequestCount}
                                    </span>
                                ) : null}
                            </>
                        ) : (
                            <RefreshCw size={15} className="transition-transform duration-300 group-hover:rotate-45" />
                        )}
                        {hasUnsavedInput && activeRequestCount === 0 && !isRefreshing ? (
                            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-300" />
                        ) : null}
                    </button>

                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-background/80 text-foreground-2 shadow-sm transition-all hover:-translate-y-px hover:border-primary/30 hover:bg-primary/[0.06] hover:text-foreground hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                        aria-label={isDark ? t("Mudar para modo claro", "Switch to light mode") : t("Mudar para modo escuro", "Switch to dark mode")}
                        title={isDark ? t("Modo claro", "Light mode") : t("Modo escuro", "Dark mode")}
                    >
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    </button>

                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={toggle}
                            className="flex min-h-9 items-center gap-2 rounded-lg border border-transparent bg-background/30 px-1.5 text-sm leading-tight text-foreground-2 transition-all hover:border-primary/20 hover:bg-primary/[0.05] hover:text-foreground hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
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
            </div>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${scrolledDown ? "max-h-0 opacity-0 pointer-events-none" : "max-h-12 opacity-100"}`}>
            <div className="flex h-7 items-center gap-0.5 border-t border-border/50 bg-background/35 px-1 shadow-inner">
                <button
                    type="button"
                    onClick={() => scrollHeaderNav("left")}
                    disabled={!canScrollLeft}
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-0 ${
                        canScrollLeft ? "" : "invisible"
                    }`}
                    aria-label={t("Mostrar links anteriores", "Show previous links")}
                    title={t("Mostrar links anteriores", "Show previous links")}
                >
                    <ChevronLeft size={16} />
                </button>

                <div
                    ref={navScrollerRef}
                    className="flex min-w-0 flex-1 snap-x items-center gap-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {sectionedItems.map((section) => {
                        // Só as secções principais no topo; os módulos de cada
                        // secção surgem no subcabeçalho (SectionSubNav) quando ativa.
                        const target = section.items[0]
                        if (!target) return null
                        const active = section.items.some(
                            (item) =>
                                pathname === item.href ||
                                (item.href !== "/" && pathname?.startsWith(item.href + "/")),
                        )
                        return (
                            <Link
                                key={section.label}
                                href={target.href}
                                className={`inline-flex h-6 shrink-0 snap-start items-center rounded-md border px-2.5 text-xs font-semibold transition-colors ${
                                    active
                                        ? "border-primary/35 bg-gradient-to-b from-primary/15 to-primary/8 text-primary shadow-sm"
                                        : "border-transparent text-foreground-2 hover:border-primary/20 hover:bg-primary/[0.05] hover:text-foreground"
                                }`}
                            >
                                {t(section.label, section.labelEn)}
                            </Link>
                        )
                    })}
                </div>

                <button
                    type="button"
                    onClick={() => scrollHeaderNav("right")}
                    disabled={!canScrollRight}
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-0 ${
                        canScrollRight ? "" : "invisible"
                    }`}
                    aria-label={t("Mostrar próximos links", "Show next links")}
                    title={t("Mostrar próximos links", "Show next links")}
                >
                    <ChevronRight size={16} />
                </button>
            </div>
            </div>
        </header>
    )
}
