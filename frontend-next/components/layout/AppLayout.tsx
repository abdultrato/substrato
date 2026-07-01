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
    INTERNAL_NAVIGATION_INTENT_KEY,
    createInternalNavigationIntent,
    getPathFromSameOriginHref,
    normalizeNavigationPath,
    serializeInternalNavigationIntent,
    shouldShowRestrictionNotice,
} from "@/lib/accessRedirect"

interface Props {
    children: ReactNode
    requiredGroups?: string[]
    rightAside?: ReactNode
    rightAsideWidth?: string
    subNav?: ReactNode
}

export default function AppLayout ( {
    children,
    requiredGroups,
    rightAside,
    rightAsideWidth = "20rem",
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
    const defaultWorkspaceHref = getDefaultWorkspaceHref(user)
    const isScopeRestricted = mustRedirectByScope && pathname !== scopeHome
    const hasAccessRestriction = isScopeRestricted || isUnauthorized
    const restrictionRedirectTarget = isScopeRestricted ? scopeHome : defaultWorkspaceHref

    useEffect(() => {
        if (typeof window === "undefined") return

        function persistNavigationIntent(targetPath: string) {
            const intent = createInternalNavigationIntent(targetPath)
            window.sessionStorage.setItem(
                INTERNAL_NAVIGATION_INTENT_KEY,
                serializeInternalNavigationIntent(intent),
            )
        }

        function handleAnchorClick(event: MouseEvent) {
            if (event.defaultPrevented || event.button !== 0) return
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

            const originTarget = event.target
            if (!(originTarget instanceof Element)) return

            const anchor = originTarget.closest("a[href]")
            if (!anchor) return

            const targetAttr = anchor.getAttribute("target")
            if (targetAttr && targetAttr !== "_self") return
            if (anchor.hasAttribute("download")) return

            const href = anchor.getAttribute("href")
            if (!href || href.startsWith("#")) return

            const nextPath = getPathFromSameOriginHref(href, window.location.origin)
            if (!nextPath) return
            persistNavigationIntent(nextPath)
        }

        const originalPushState = window.history.pushState
        const originalReplaceState = window.history.replaceState

        function wrapHistoryMethod(
            method: typeof window.history.pushState,
        ): typeof window.history.pushState {
            return function wrappedHistoryMethod(data, unused, url) {
                if (url) {
                    const nextPath = getPathFromSameOriginHref(
                        typeof url === "string" ? url : url.toString(),
                        window.location.origin,
                    )
                    if (nextPath) persistNavigationIntent(nextPath)
                }
                return method.call(this, data, unused, url)
            }
        }

        window.history.pushState = wrapHistoryMethod(originalPushState)
        window.history.replaceState = wrapHistoryMethod(originalReplaceState)
        document.addEventListener("click", handleAnchorClick, true)

        return () => {
            window.history.pushState = originalPushState
            window.history.replaceState = originalReplaceState
            document.removeEventListener("click", handleAnchorClick, true)
        }
    }, [])

    useEffect(() => {
        if (!hasAccessRestriction) {
            setAccessResolutionReady(true)
            setShowRestrictionNotice(false)
            return
        }

        if (typeof window === "undefined") return

        setAccessResolutionReady(false)
        const rawIntent = window.sessionStorage.getItem(INTERNAL_NAVIGATION_INTENT_KEY)
        const manualPathAttempt = shouldShowRestrictionNotice({
            currentPath,
            intentRaw: rawIntent,
        })

        const normalizedTarget = normalizeNavigationPath(restrictionRedirectTarget)
        if (!manualPathAttempt && currentPath !== normalizedTarget) {
            window.sessionStorage.removeItem(INTERNAL_NAVIGATION_INTENT_KEY)
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
                    <div className="sticky top-0 z-40 shrink-0">
                        <Header user={user} onMenuClick={handleMenuClick} />
                    </div>

                    <main data-no-scroll-arrows className="substrato-app-surface min-h-0 flex-1 min-w-0 overflow-x-hidden overflow-y-auto px-2 py-2 sm:px-3 md:px-4 md:py-3">
                        <div className="page-transition mx-auto w-workspace max-w-workspace">
                            <AutoTranslateTree>
                                <AccessDenied
                                    requiredGroups={isUnauthorized ? requiredGroups : undefined}
                                    user={user}
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
                        className="hidden h-screen flex-col overflow-y-auto border-l border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 md:fixed md:right-0 md:top-0 md:flex"
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
                <div className="sticky top-0 z-40 shrink-0">
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
                    <div className="page-transition mx-auto w-workspace max-w-workspace">
                        <AutoTranslateTree>{children}</AutoTranslateTree>
                    </div>
                </main>
                <Footer />
            </div>

            {rightAside ? (
                <aside
                    className="hidden h-screen flex-col overflow-y-auto border-l border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 md:fixed md:right-0 md:top-0 md:flex"
                    style={{ width: rightAsideWidth }}
                >
                    <AutoTranslateTree>{rightAside}</AutoTranslateTree>
                </aside>
            ) : null}
        </div>
    )
}
