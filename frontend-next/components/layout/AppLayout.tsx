"use client"

import { ReactNode, useEffect, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import useAuthGuard from "@/hooks/useAuthGuard"
import Sidebar from "./Sidebar"
import Header from "./Header"
import Footer from "./Footer"
import AccessDenied from "@/components/auth/AccessDenied"
import AutoTranslateTree from "@/components/i18n/AutoTranslateTree"
import { useLanguage } from "@/hooks/useLanguage"
import { userHasAnyGroup } from "@/lib/rbac"

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
    const [navOpen, setNavOpen] = useState( false )
    const [desktopSidebarVisible, setDesktopSidebarVisible] = useState( true )
    const footerLeftOffset = desktopSidebarVisible ? sidebarDesktopWidth : "0px"

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

    if ( requiredGroups?.length && !userHasAnyGroup( user, requiredGroups ) ) {
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

                    <main className="flex-1 overflow-x-auto px-2 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-3 md:px-4 md:py-3 md:pb-14">
                        <div className="page-transition">
                            <AutoTranslateTree>
                                <AccessDenied requiredGroups={requiredGroups} user={user} />
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

                <main className="flex-1 overflow-x-auto overflow-y-auto px-2 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-3 md:px-4 md:py-3 md:pb-14">
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
