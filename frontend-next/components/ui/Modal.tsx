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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />

            <div
                className={`relative bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-lg w-full ${widths[width]} mx-4`}
            >
                {( title || onClose ) && (
                    <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
                        {title && (
                            <h3 className="text-sm font-semibold text-[var(--text)]">
                                {title}
                            </h3>
                        )}

                        <button
                            onClick={onClose}
                            className="p-1 rounded hover:bg-[var(--gray-100)] text-[var(--text)]"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                <div className="p-5">{children}</div>
            </div>
        </div>
    )
}
