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
    setSessionUser,
} from "@/lib/session"
import { fetchCurrentUser } from "@/lib/auth"

interface AuthContextType {
    user: SessionUser | null
    loading: boolean
    authenticated: boolean
    isAuthenticated: boolean
    refreshUser: () => Promise<void>
    signIn: (user: SessionUser) => void
    signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * ===============================
 * PROVIDER
 * ===============================
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null)
    const [loading, setLoading] = useState(true)

    const refreshUser = useCallback(async () => {
        try {
            const data = await fetchCurrentUser()
            setUser(data)
            setSessionUser(data)
        } catch {
            logout()
            setUser(null)
        }
    }, [])

    const signIn = useCallback((u: SessionUser) => {
        // O login persiste no localStorage; aqui sincronizamos o estado em memória
        // para evitar loop de redirecionamento em páginas protegidas.
        setUser(u)
        setSessionUser(u)
    }, [])

    useEffect(() => {
        const stored = getSessionUser()

        if (stored && isAuthenticated()) {
            setUser(stored)
            refreshUser().finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [refreshUser])

    const signOut = useCallback(() => {
        logout()
        setUser(null)
    }, [])

    const contextValue: AuthContextType = {
        user,
        loading,
        authenticated: !!user,
        isAuthenticated: !!user,
        refreshUser,
        signIn,
        signOut,
    }

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    )
}

/**
 * ===============================
 * HOOK
 * ===============================
 */
export function useAuth() {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error("useAuth must be used within AuthProvider")
    }

    return context
}

export default useAuth
