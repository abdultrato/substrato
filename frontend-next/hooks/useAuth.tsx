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
    logout,
    SessionUser,
    setSessionUser,
} from "@/lib/session"
import { usePathname } from "next/navigation"
import { fetchCurrentUser } from "@/lib/auth"
import { useIdleSession } from "@/hooks/useIdleSession"
import { rememberLastVisitedPath } from "@/lib/lastVisited"

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
    const pathname = usePathname()

    // Memoriza a última página visitada para retomar após fim de sessão.
    useEffect(() => {
        if (!user || !pathname) return
        const search = typeof window !== "undefined" ? window.location.search : ""
        rememberLastVisitedPath(`${pathname}${search}`)
    }, [user, pathname])

    const refreshUser = useCallback(async () => {
        try {
            const data = await fetchCurrentUser()
            setUser(data)
            setSessionUser(data)
        } catch {
            // Evita derrubar a sessão em falhas transitórias (rede/latência).
            const stored = getSessionUser()
            if (stored) {
                setUser(stored)
                return
            }
            logout()
            setUser(null)
        }
    }, [])

    const signIn = useCallback((u: SessionUser) => {
        // Persistimos no sessionStorage (expira ao fechar o navegador) e no estado em memória
        // para evitar loop de redirecionamento em páginas protegidas.
        setUser(u)
        setSessionUser(u)
    }, [])

    useEffect(() => {
        const stored = getSessionUser()

        if (stored) {
            setUser(stored)
            // Libera render imediatamente e revalida sessão em background.
            setLoading(false)
            refreshUser().catch(() => {
                // Erro já tratado em refreshUser.
            })
            return
        }

        setLoading(false)
    }, [refreshUser])

    const signOut = useCallback(() => {
        logout()
        setUser(null)
    }, [])

    // Sessão por atividade: renova enquanto há interação real; termina (com
    // aviso) após 30 min de inatividade real e redireciona para o login.
    useIdleSession({
        enabled: !!user,
        onTimeout: () => {
            signOut()
            if (typeof window !== "undefined") {
                const next = encodeURIComponent(window.location.pathname + window.location.search)
                window.location.href = `/login?reason=idle&next=${next}`
            }
        },
    })

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
