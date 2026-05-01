"use client"

import { ReactNode, useEffect, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import useAuthGuard from "@/hooks/useAuthGuard"
import Sidebar from "./Sidebar"
import Header from "./Header"
import Footer from "./Footer"
import AccessDenied from "@/components/auth/AccessDenied"
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
    const { loading } = useAuthGuard()
    const { user } = useAuth()
    const [navOpen, setNavOpen] = useState( false )

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

    if ( loading ) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
                Carregando...
            </div>
        )
    }

    // Auth guard will redirect, but avoid rendering protected shells while it's happening.
    if ( !user ) return null

    if ( requiredGroups?.length && !userHasAnyGroup( user, requiredGroups ) ) {
        return (
            <div className="flex min-h-screen flex-col md:flex-row">
                <Sidebar user={user} open={navOpen} onClose={() => setNavOpen( false )} />

                <div className="flex flex-1 flex-col">
                    <Header user={user} onMenuClick={() => setNavOpen( true )} />

                    <main className="flex-1 px-3 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))] md:px-3 md:py-3 md:pb-14">
                        <div className="page-transition">
                            <AccessDenied requiredGroups={requiredGroups} user={user} />
                        </div>
                    </main>
                </div>

                {rightAside ? (
                    <aside
                        className="hidden flex-col border-l border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 md:flex"
                        style={{ width: rightAsideWidth }}
                    >
                        {rightAside}
                    </aside>
                ) : null}

                <Footer rightOffset={rightAside ? rightAsideWidth : "0px"} />
            </div>
        )
    }

    return (
        <div className="flex h-screen min-h-screen overflow-hidden flex-col md:flex-row">
            <Sidebar
                user={user}
                open={navOpen}
                onClose={() => setNavOpen( false )}
                className="h-screen overflow-y-auto md:sticky md:top-0"
            />

            <div className="flex flex-1 flex-col h-screen overflow-hidden">
                <Header user={user} onMenuClick={() => setNavOpen( true )} />

                <main className="flex-1 overflow-y-auto px-3 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))] md:px-3 md:py-3 md:pb-14">
                    <div className="page-transition">
                        {children}
                    </div>
                </main>
            </div>

            {rightAside ? (
                <aside
                    className="hidden h-screen flex-col overflow-y-auto border-l border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 md:sticky md:top-0 md:flex"
                    style={{ width: rightAsideWidth }}
                >
                    {rightAside}
                </aside>
            ) : null}

            <Footer rightOffset={rightAside ? rightAsideWidth : "0px"} />
        </div>
    )
}
