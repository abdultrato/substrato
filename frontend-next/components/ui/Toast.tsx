"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"

type ToastType = "success" | "error" | "info"

interface ToastItem {
    id: number
    message: string
    type: ToastType
}

interface ToastContextType {
    show: ( message: string, type?: ToastType ) => void
}

const ToastContext = createContext<ToastContextType | null>( null )

export function useToast () {
    const ctx = useContext( ToastContext )
    if ( !ctx ) throw new Error( "useToast must be used within ToastProvider" )
    return ctx
}

export function ToastProvider ( { children }: { children: ReactNode } ) {
    const [toasts, setToasts] = useState<ToastItem[]>( [] )

    function remove ( id: number ) {
        setToasts( t => t.filter( toast => toast.id !== id ) )
    }

    function show ( message: string, type: ToastType = "info" ) {
        const id = Date.now()
        setToasts( t => [...t, { id, message, type }] )
        setTimeout( () => remove( id ), 4000 )
    }

    const icons = {
        success: <CheckCircle2 size={18} />,
        error: <AlertCircle size={18} />,
        info: <Info size={18} />,
    }

    const styles = {
        success:
            "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200",
        error:
            "border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-200",
        info: "border-border bg-card/90 text-foreground",
    }

    return (
        <ToastContext.Provider value={{ show }}>
            {children}

            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map( toast => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 rounded-2xl border px-3 py-2 shadow-lg backdrop-blur-[2px] ${styles[toast.type]}`}
                    >
                        {icons[toast.type]}
                        <span className="text-sm">{toast.message}</span>
                        <button
                            onClick={() => remove( toast.id )}
                            className="ml-1 rounded-lg p-1 opacity-80 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) )}
            </div>
        </ToastContext.Provider>
    )
}
