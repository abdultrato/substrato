"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/hooks/useLanguage"
import { useWorkspaceScope } from "@/hooks/useWorkspaceScope"
import { userHasAnyGroup } from "@/lib/rbac"
import { NAV_ITEMS, NAV_SECTIONS, type NavItem } from "@/components/layout/Sidebar"

function normalize(pathname: string | null | undefined): string {
    const value = (pathname || "").trim()
    if (!value || value === "/") return "/"
    return value.endsWith("/") ? value.slice(0, -1) : value
}

function matches(pathname: string, href: string): boolean {
    const current = normalize(pathname)
    const target = normalize(href)
    if (current === target) return true
    if (target === "/") return current === "/"
    return current.startsWith(`${target}/`)
}

/**
 * Nível intermédio da navegação: quando uma secção principal está ativa, mostra
 * os módulos dessa secção (general → particular). Os submódulos do módulo ativo
 * ficam por baixo, no ModuleSubNav.
 */
export default function SectionSubNav() {
    const pathname = usePathname() || "/"
    const { user } = useAuth()
    const { t } = useLanguage()
    const activeScope = useWorkspaceScope()
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)
    const scrollerRef = useRef<HTMLDivElement>(null)

    const hasAccess = useCallback(
        (item: NavItem) => (!item.groups ? true : userHasAnyGroup(user, item.groups)),
        [user],
    )

    const matchesScope = useCallback(
        (item: NavItem) => {
            if (activeScope === "neutral") return true
            if (item.href === "/workspaces") return true
            const isEducation = item.href === "/education" || item.href.startsWith("/education/")
            return activeScope === "education" ? isEducation : !isEducation
        },
        [activeScope],
    )

    // Resolve a secção ativa (a que contém o caminho atual) e os seus módulos
    // acessíveis. Deduplica hrefs repetidos entre secções pela ordem natural.
    const { modules } = useMemo(() => {
        const itemByHref = new Map(NAV_ITEMS.map((item) => [item.href, item]))

        const sections = NAV_SECTIONS.map((section) => {
            const items = section.hrefs
                .map((href) => itemByHref.get(href))
                .filter((item): item is NavItem => Boolean(item))
                .filter((item) => hasAccess(item) && matchesScope(item))
            return { ...section, items }
        }).filter((section) => section.items.length > 0)

        const active =
            sections.find((section) => section.items.some((item) => matches(pathname, item.href))) ||
            null

        return { modules: active ? active.items : [] }
    }, [pathname, hasAccess, matchesScope])

    const updateScrollState = useCallback(() => {
        const el = scrollerRef.current
        if (!el) return
        const max = el.scrollWidth - el.clientWidth
        setCanScrollLeft(el.scrollLeft > 4)
        setCanScrollRight(el.scrollLeft < max - 4)
    }, [])

    const scrollBy = useCallback(
        (direction: "left" | "right") => {
            const el = scrollerRef.current
            if (!el) return
            const distance = Math.max(220, Math.floor(el.clientWidth * 0.72))
            el.scrollBy({ left: direction === "right" ? distance : -distance, behavior: "smooth" })
            window.setTimeout(updateScrollState, 260)
        },
        [updateScrollState],
    )

    useEffect(() => {
        const el = scrollerRef.current
        if (!el) return
        updateScrollState()
        el.addEventListener("scroll", updateScrollState, { passive: true })
        window.addEventListener("resize", updateScrollState)
        return () => {
            el.removeEventListener("scroll", updateScrollState)
            window.removeEventListener("resize", updateScrollState)
        }
    }, [modules, updateScrollState])

    // Só faz sentido mostrar quando há mais de um módulo para escolher.
    if (modules.length < 2) return null

    return (
        <nav className="shrink-0 border-b border-border/70 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <div className="flex items-center gap-1.5 px-2 py-1 sm:px-3 md:px-4">
                <button
                    type="button"
                    onClick={() => scrollBy("left")}
                    disabled={!canScrollLeft}
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-0 ${
                        canScrollLeft ? "" : "invisible"
                    }`}
                    aria-label={t("Mostrar módulos anteriores", "Show previous modules")}
                >
                    <ChevronLeft size={16} />
                </button>

                <div
                    ref={scrollerRef}
                    className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {modules.map((item) => {
                        const Icon = item.icon as any
                        const active = matches(pathname, item.href)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-colors ${
                                    active
                                        ? "border-primary/40 bg-primary-soft text-foreground"
                                        : "border-transparent text-foreground-2 hover:border-border hover:bg-muted hover:text-foreground"
                                }`}
                            >
                                {Icon ? <Icon size={13} className="shrink-0" /> : null}
                                {t(item.label, item.labelEn || item.label)}
                            </Link>
                        )
                    })}
                </div>

                <button
                    type="button"
                    onClick={() => scrollBy("right")}
                    disabled={!canScrollRight}
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-0 ${
                        canScrollRight ? "" : "invisible"
                    }`}
                    aria-label={t("Mostrar próximos módulos", "Show next modules")}
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </nav>
    )
}
