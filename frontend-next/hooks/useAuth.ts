"use client"

import {
    useEffect,
    useState,
    createContext,
    useContext,
    useCallback,
} from "react"
import {
    getSessionUser,
    isAuthenticated,
    logout,
    SessionUser,
} from "@/lib/session"
import { fetchCurrentUser } from "@/lib/auth"

interface AuthContextType {
    user: SessionUser | null
    loading: boolean
    authenticated: boolean
    refreshUser: () => Promise<void>
    signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>( undefined )

/**
 * ===============================
 * PROVIDER
 * ===============================
 */
export function AuthProvider ( { children }: { children: React.ReactNode } ) {
    const [user, setUser] = useState<SessionUser | null>( null )
    const [loading, setLoading] = useState( true )

    const refreshUser = useCallback( async () => {
        try {
            const data = await fetchCurrentUser()
            setUser( data )
        } catch {
            logout()
            setUser( null )
        }
    }, [] )

    useEffect( () => {
        const stored = getSessionUser()

        if ( stored && isAuthenticated() ) {
            setUser( stored )
            refreshUser().finally( () => setLoading( false ) )
        } else {
            setLoading( false )
        }
    }, [refreshUser] )

    const signOut = useCallback( () => {
        logout()
        setUser( null )
    }, [] )

    return (
        <AuthContext.Provider
      value= {{
        user,
            loading,
            authenticated: !!user,
                refreshUser,
                signOut,
      }
}
    >
    { children }
    </AuthContext.Provider>
  )
}

/**
 * ===============================
 * HOOK
 * ===============================
 */
export function useAuth () {
    const context = useContext( AuthContext )

    if ( !context ) {
        throw new Error( "useAuth must be used within AuthProvider" )
    }

    return context
}
