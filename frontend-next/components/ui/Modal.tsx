"use client"

import { ReactNode, useEffect } from "react"
import { X } from "lucide-react"

interface Props {
    open: boolean
    onClose: () => void
    title?: string
    children: ReactNode
    width?: "sm" | "md" | "lg" | "xl"
}

const widths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
}

export default function Modal ( {
    open,
    onClose,
    title,
    children,
    width = "md",
}: Props ) {
    useEffect( () => {
        const handler = ( e: KeyboardEvent ) => {
            if ( e.key === "Escape" ) onClose()
        }
        if ( open ) window.addEventListener( "keydown", handler )
        return () => window.removeEventListener( "keydown", handler )
    }, [open, onClose] )

    if ( !open ) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
                onClick={onClose}
            />

            <div
                className={`relative w-full ${widths[width]} rounded-2xl border border-border bg-card shadow-lg animate-scale-in`}
            >
                {( title || onClose ) && (
                    <div className="flex items-center justify-between border-b border-border px-4 py-2">
                        {title && (
                            <h3 className="text-sm font-semibold text-foreground">
                                {title}
                            </h3>
                        )}

                        <button
                            onClick={onClose}
                            className="rounded-lg p-1 text-foreground-2 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                <div className="p-4">{children}</div>
            </div>
        </div>
    )
}
