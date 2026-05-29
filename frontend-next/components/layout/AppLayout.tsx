"use client"

import { ReactNode, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import useAuthGuard from "@/hooks/useAuthGuard"
import Sidebar from "./Sidebar"
import Header from "./Header"
import Footer from "./Footer"
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
}

export default function AppLayout ( {
    children,
    requiredGroups,
    rightAside,
    rightAsideWidth = "20rem",
}: Props ) {
    const sidebarDesktopWidth = "16rem"
    const { loading } = useAuthGuard()
    const { user } = useAuth()
    const { t } = useLanguage()
    const pathname = usePathname() || "/"
    const router = useRouter()
    const activeScope = useWorkspaceScope()
    const [navOpen, setNavOpen] = useState( false )
    const [desktopSidebarVisible, setDesktopSidebarVisible] = useState( true )
    const [accessResolutionReady, setAccessResolutionReady] = useState( true )
    const [showRestrictionNotice, setShowRestrictionNotice] = useState( false )
    const footerLeftOffset = desktopSidebarVisible ? sidebarDesktopWidth : "0px"
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
        if ( typeof window === "undefined" ) return
        const stored = window.localStorage.getItem( "substrato.desktopSidebarVisible" )
        if ( stored === null ) return
        setDesktopSidebarVisible( stored === "1" )
    }, [] )

    useEffect( () => {
        if ( typeof window === "undefined" ) return
        window.localStorage.setItem(
            "substrato.desktopSidebarVisible",
            desktopSidebarVisible ? "1" : "0",
        )
    }, [desktopSidebarVisible] )

    function handleMenuClick () {
        if ( typeof window !== "undefined" && window.innerWidth < 768 ) {
            setNavOpen( true )
            return
        }
        setDesktopSidebarVisible( ( prev ) => !prev )
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
            <div className="flex min-h-screen flex-col md:flex-row">
                <Sidebar
                    user={user}
                    open={navOpen}
                    onClose={() => setNavOpen( false )}
                    className={desktopSidebarVisible ? "" : "md:hidden"}
                />

                <div className="flex min-w-0 flex-1 flex-col">
                    <Header user={user} onMenuClick={handleMenuClick} />

                <main className="substrato-app-surface flex-1 overflow-x-auto bg-background px-3 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-4 md:px-5 md:py-4 md:pb-14">
                        <div className="page-transition">
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
                </div>

                {rightAside ? (
                    <aside
                        className="hidden flex-col border-l border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 md:flex"
                        style={{ width: rightAsideWidth }}
                    >
                        <AutoTranslateTree>{rightAside}</AutoTranslateTree>
                    </aside>
                ) : null}

                <Footer
                    leftOffset={footerLeftOffset}
                    rightOffset={rightAside ? rightAsideWidth : "0px"}
                />
            </div>
        )
    }

    return (
        <div className="flex h-screen min-h-screen overflow-hidden flex-col md:flex-row">
            <Sidebar
                user={user}
                open={navOpen}
                onClose={() => setNavOpen( false )}
                className={`h-screen overflow-y-auto md:sticky md:top-0 ${desktopSidebarVisible ? "" : "md:hidden"}`}
            />

            <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
                <Header user={user} onMenuClick={handleMenuClick} />

                <main className="substrato-app-surface flex-1 overflow-x-auto overflow-y-auto bg-background px-3 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-4 md:px-5 md:py-4 md:pb-14">
                    <div className="page-transition">
                        <AutoTranslateTree>{children}</AutoTranslateTree>
                    </div>
                </main>
            </div>

            {rightAside ? (
                <aside
                    className="hidden h-screen flex-col overflow-y-auto border-l border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 md:sticky md:top-0 md:flex"
                    style={{ width: rightAsideWidth }}
                >
                    <AutoTranslateTree>{rightAside}</AutoTranslateTree>
                </aside>
            ) : null}

            <Footer
                leftOffset={footerLeftOffset}
                rightOffset={rightAside ? rightAsideWidth : "0px"}
            />
        </div>
    )
}
