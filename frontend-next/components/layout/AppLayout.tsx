"use client"

import { ReactNode, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import useAuthGuard from "@/hooks/useAuthGuard"
import Sidebar from "./Sidebar"
import Header from "./Header"
import Footer from "./Footer"
import ModuleSubNav from "./ModuleSubNav"
import SectionSubNav from "./SectionSubNav"
import AccessDenied from "@/components/auth/AccessDenied"
import AutoTranslateTree from "@/components/i18n/AutoTranslateTree"
import { useLanguage } from "@/hooks/useLanguage"
import { getDefaultWorkspaceHref, userHasAnyGroup } from "@/lib/rbac"
import { useWorkspaceScope } from "@/hooks/useWorkspaceScope"
import {
    isOperationalScope,
    isPathAllowedForScope,
    workspaceHomeForScope,
} from "@/lib/workspaceScope"
import {
    normalizeNavigationPath,
} from "@/lib/accessRedirect"

interface Props {
    children: ReactNode
    requiredGroups?: string[]
    accessRestrictionMode?: "data" | "page"
    rightAside?: ReactNode
    rightAsideWidth?: string
    subNav?: ReactNode
    /** Quando true, o conteúdo ocupa toda a largura disponível (sem o limite de 85vw). */
    fullWidth?: boolean
}

export default function AppLayout ( {
    children,
    requiredGroups,
    accessRestrictionMode = "data",
    rightAside,
    rightAsideWidth = "20rem",
    fullWidth = false,
    subNav,
}: Props ) {
    const { loading } = useAuthGuard()
    const { user } = useAuth()
    const { t } = useLanguage()
    const pathname = usePathname() || "/"
    const router = useRouter()
    const activeScope = useWorkspaceScope()
    const [navOpen, setNavOpen] = useState( false )
    const [accessResolutionReady, setAccessResolutionReady] = useState( true )
    const [showRestrictionNotice, setShowRestrictionNotice] = useState( false )
    const [subNavVisible, setSubNavVisible] = useState( true )
    const mainRef = useRef<HTMLElement>( null )
    const lastScrollY = useRef( 0 )
    const lockUntil = useRef( 0 )
    const contentFrameStyle = {
        "--layout-right": rightAside ? rightAsideWidth : "0px",
    } as CSSProperties
    const mustRedirectByScope =
        isOperationalScope(activeScope) &&
        (pathname === "/" || !isPathAllowedForScope(pathname, activeScope))
    const scopeHome = workspaceHomeForScope(activeScope)
    const currentPath = useMemo(
        () => normalizeNavigationPath(pathname),
        [pathname],
    )

    const isUnauthorized =
        !!user &&
        !!requiredGroups?.length &&
        !userHasAnyGroup(user, requiredGroups)
    const shouldBlockPageForUnauthorized =
        isUnauthorized && accessRestrictionMode === "page"
    const defaultWorkspaceHref = getDefaultWorkspaceHref(user)
    const isScopeRestricted = mustRedirectByScope && pathname !== scopeHome
    const hasAccessRestriction = isScopeRestricted || shouldBlockPageForUnauthorized
    const restrictionRedirectTarget = isScopeRestricted ? scopeHome : defaultWorkspaceHref

    useEffect(() => {
        if (!hasAccessRestriction) {
            setAccessResolutionReady(true)
            setShowRestrictionNotice(false)
            return
        }

        setAccessResolutionReady(false)
        const normalizedTarget = normalizeNavigationPath(restrictionRedirectTarget)
        if (currentPath !== normalizedTarget) {
            setShowRestrictionNotice(false)
            router.replace(restrictionRedirectTarget)
            setAccessResolutionReady(true)
            return
        }

        setShowRestrictionNotice(true)
        setAccessResolutionReady(true)
    }, [currentPath, hasAccessRestriction, restrictionRedirectTarget, router])

    useEffect( () => {
        if ( typeof window === "undefined" ) return
        function onResize () {
            if ( window.innerWidth >= 768 ) setNavOpen( false )
        }
        window.addEventListener( "resize", onResize )
        return () => window.removeEventListener( "resize", onResize )
    }, [] )

    useEffect( () => {
        if ( typeof document === "undefined" ) return
        document.body.style.overflow = navOpen ? "hidden" : ""
        return () => {
            document.body.style.overflow = ""
        }
    }, [navOpen] )

    useEffect( () => {
        const el = mainRef.current
        if ( !el ) return
        function onScroll () {
            if ( Date.now() < lockUntil.current ) return
            const y = el.scrollTop
            const delta = y - lastScrollY.current
            if ( Math.abs( delta ) < 6 ) return
            const next = delta < 0 || y < 40
            setSubNavVisible( ( prev ) => {
                if ( prev === next ) return prev
                lockUntil.current = Date.now() + 400
                return next
            } )
            lastScrollY.current = y
        }
        el.addEventListener( "scroll", onScroll, { passive: true } )
        return () => el.removeEventListener( "scroll", onScroll )
    }, [] )

    function handleMenuClick () {
        setNavOpen( true )
    }

    if ( loading ) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
                {t("Carregando...", "Loading...")}
            </div>
        )
    }

    // Auth guard will redirect, but avoid rendering protected shells while it's happening.
    if ( !user ) return null

    if (hasAccessRestriction && !accessResolutionReady) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
                {t("A validar acesso...", "Validating access...")}
            </div>
        )
    }

    if (hasAccessRestriction && !showRestrictionNotice) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
                {t("Redirecionando...", "Redirecting...")}
            </div>
        )
    }

    if (hasAccessRestriction && showRestrictionNotice) {
        return (
            <div className="h-screen overflow-hidden">
                <Sidebar
                    user={user}
                    open={navOpen}
                    onClose={() => setNavOpen( false )}
                    className="md:fixed md:left-0 md:top-0 md:h-screen"
                />

                <div
                    className="flex h-screen min-w-0 flex-col md:ml-16 md:mr-[var(--layout-right)]"
                    style={contentFrameStyle}
                >
                    <div className="sticky top-0 z-[200] shrink-0">
                        <Header user={user} onMenuClick={handleMenuClick} />
                    </div>

                    <main data-no-scroll-arrows className="substrato-app-surface min-h-0 flex-1 min-w-0 overflow-x-hidden overflow-y-auto px-2 py-2 sm:px-3 md:px-4 md:py-3">
                        <div className="page-transition mx-auto w-workspace max-w-workspace">
                            <AutoTranslateTree>
                                <AccessDenied
                                    requiredGroups={isUnauthorized ? requiredGroups : undefined}
                                    user={user}
                                    fallbackHref={restrictionRedirectTarget}
                                    title={
                                        isUnauthorized
                                            ? t("Acesso restrito", "Access restricted")
                                            : t("Área fora do escopo", "Out-of-scope area")
                                    }
                                    subtitle={
                                        isUnauthorized
                                            ? t(
                                                "A sua conta não tem permissão para abrir esta página.",
                                                "Your account is not allowed to open this page.",
                                            )
                                            : t(
                                                "Este caminho está fora da área de trabalho selecionada.",
                                                "This path is outside the selected workspace.",
                                            )
                                    }
                                />
                            </AutoTranslateTree>
                        </div>
                    </main>
                    <Footer />
                </div>

                {rightAside ? (
                    <aside
                        className="hidden h-screen flex-col overflow-y-auto border-l border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 z-[99999] md:fixed md:right-0 md:top-0 md:flex md:z-[99999]"
                        style={{ width: rightAsideWidth }}
                    >
                        <AutoTranslateTree>{rightAside}</AutoTranslateTree>
                    </aside>
                ) : null}
            </div>
        )
    }

    return (
        <div className="h-screen overflow-hidden">
            <Sidebar
                user={user}
                open={navOpen}
                onClose={() => setNavOpen( false )}
                className="md:fixed md:left-0 md:top-0 md:h-screen"
            />

            <div
                className="flex h-screen min-w-0 flex-col md:ml-16 md:mr-[var(--layout-right)]"
                style={contentFrameStyle}
            >
                <div className="sticky top-0 z-[200] shrink-0">
                    <Header user={user} onMenuClick={handleMenuClick} scrolledDown={!subNavVisible} />

                    <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            subNavVisible ? "max-h-32 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
                        }`}
                    >
                        {subNav ?? (
                            <>
                                <SectionSubNav />
                                <ModuleSubNav />
                            </>
                        )}
                    </div>
                </div>

                <main ref={mainRef} data-no-scroll-arrows className="substrato-app-surface min-h-0 flex-1 min-w-0 overflow-x-hidden overflow-y-auto px-2 py-2 sm:px-3 md:px-4 md:py-3">
                    <div className={`page-transition ${fullWidth ? "w-full" : "mx-auto w-workspace max-w-workspace"}`}>
                        {isUnauthorized ? (
                            <div className="mx-auto mb-3 w-full max-w-workspace rounded-2xl border border-amber-300/60 bg-amber-50/85 px-4 py-3 text-sm text-amber-950 shadow-sm backdrop-blur-sm dark:border-amber-500/30 dark:bg-amber-950/25 dark:text-amber-100">
                                <div className="font-semibold">
                                    {t("Acesso limitado nesta página.", "Limited access on this page.")}
                                </div>
                                <p className="mt-1 text-[13px] text-amber-900/90 dark:text-amber-100/85">
                                    {t(
                                        "A página continua disponível, mas os dados e ações protegidos dependem do seu grupo.",
                                        "The page remains available, but protected data and actions still depend on your group.",
                                    )}
                                </p>
                                <p className="mt-2 text-xs text-amber-900/80 dark:text-amber-100/75">
                                    {t("Requer", "Requires")}: {requiredGroups?.join(", ") || "—"}
                                    {" · "}
                                    {t("Seus grupos", "Your groups")}: {user?.groups?.join(", ") || "—"}
                                </p>
                            </div>
                        ) : null}
                        <AutoTranslateTree>{children}</AutoTranslateTree>
                    </div>
                </main>
                <Footer />
            </div>

            {rightAside ? (
                <aside
                    className="hidden h-screen flex-col overflow-y-auto border-l border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 z-[99999] md:fixed md:right-0 md:top-0 md:flex md:z-[99999]"
                    style={{ width: rightAsideWidth }}
                >
                    <AutoTranslateTree>{rightAside}</AutoTranslateTree>
                </aside>
            ) : null}
        </div>
    )
}
