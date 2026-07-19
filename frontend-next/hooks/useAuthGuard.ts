"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "./useAuth"
import { getSmartPostLoginTarget } from "@/lib/loginRedirect"
import { isSafeInternalPath } from "@/lib/lastVisited"

interface Options {
    redirectTo?: string
    requireAuth?: boolean
}

/**
 * Hook para proteger páginas privadas ou públicas.
 *
 * requireAuth = true  → página privada
 * requireAuth = false → página pública (ex: login)
 */
export default function useAuthGuard ( options: Options = {} ) {
    const { redirectTo = "/login", requireAuth = true } = options

    const router = useRouter()
    const pathname = usePathname()

    const { user, authenticated, loading } = useAuth()

    useEffect( () => {
        if ( loading ) return

        // página privada sem login
        if ( requireAuth && !authenticated ) {
            const search = typeof window !== "undefined" ? window.location.search : ""
            router.replace( `${redirectTo}?next=${encodeURIComponent( `${pathname}${search}` )}` )
            return
        }

        // página pública com login (ex: login page)
        if ( !requireAuth && authenticated ) {
            const rawNext =
                typeof window !== "undefined"
                    ? new URLSearchParams(window.location.search).get("next")
                    : null
            const explicitNext = isSafeInternalPath(rawNext) ? rawNext : null
            router.replace( getSmartPostLoginTarget( user, explicitNext ) )
        }
    }, [authenticated, loading, pathname, redirectTo, requireAuth, router, user] )

    return {
        authenticated,
        loading,
    }
}
