"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import useAuth from "@/hooks/useAuth"

export default function ProtectedLayout ( {
    children,
}: {
    children: React.ReactNode
} ) {
    const router = useRouter()
    const { isAuthenticated } = useAuth()
    const [ready, setReady] = useState( false )

    useEffect( () => {
        if ( isAuthenticated === false ) {
            router.replace( "/login" )
        } else {
            setReady( true )
        }
    }, [isAuthenticated, router] )

    if ( !ready ) return null

    return <>{children}</>
}
