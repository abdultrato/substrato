"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "./useAuth"

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

    const { authenticated, loading } = useAuth()

    useEffect( () => {
        if ( loading ) return

        // página privada sem login
        if ( requireAuth && !authenticated ) {
            router.replace( `${redirectTo}?next=${pathname}` )
            return
        }

        // página pública com login (ex: login page)
        if ( !requireAuth && authenticated ) {
            router.replace( "/" )
        }
    }, [authenticated, loading, pathname, redirectTo, requireAuth, router] )

    return {
        authenticated,
        loading,
    }
}
