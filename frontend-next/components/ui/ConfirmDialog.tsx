"use client"

import {
    ReactNode,
    useEffect,
    useRef,
    useState,
} from "react"
import { createPortal } from "react-dom"

interface Props {
    title?: string
    message?: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void | Promise<void>
    children: ReactNode
    danger?: boolean
    disabled?: boolean
}

export default function ConfirmDialog ( {
    title = "Confirmar ação",
    message = "Tem certeza que deseja continuar?",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    onConfirm,
    children,
    danger = true,
    disabled = false,
}: Props ) {
    const [open, setOpen] = useState( false )
    const [loading, setLoading] = useState( false )
    const modalRef = useRef<HTMLDivElement>( null )

    // fechar com ESC
    useEffect( () => {
        function handleKey ( e: KeyboardEvent ) {
            if ( e.key === "Escape" ) setOpen( false )
        }

        if ( open ) {
            document.addEventListener( "keydown", handleKey )
            document.body.style.overflow = "hidden"
        }

        return () => {
            document.removeEventListener( "keydown", handleKey )
            document.body.style.overflow = "auto"
        }
    }, [open] )

    // fechar clicando fora
    function handleBackdropClick ( e: React.MouseEvent ) {
        if ( modalRef.current && !modalRef.current.contains( e.target as Node ) ) {
            setOpen( false )
        }
    }

    async function handleConfirm () {
        if ( loading ) return
        setLoading( true )
        try {
            await onConfirm()
            setOpen( false )
        } finally {
            setLoading( false )
        }
    }

    return (
        <>
            <span
                onClick={() => {
                    if ( !disabled ) setOpen( true )
                }}
                className={`inline-flex ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
                {children}
            </span>

            {open && typeof document !== "undefined" && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onMouseDown={handleBackdropClick}
                >
                    <div
                        ref={modalRef}
                        className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/30 p-5 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]"
                    >
                        <div className="mb-1 flex items-center gap-2">
                            {danger && (
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-rose-600 text-white shadow-sm shadow-red-500/20">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                                </span>
                            )}
                            <h3 className="text-base font-bold text-foreground">{title}</h3>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                onClick={() => setOpen(false)}
                                disabled={loading}
                                className="inline-flex h-9 items-center rounded-md border border-white/20 bg-white/10 px-4 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={loading}
                                className={`inline-flex h-9 items-center rounded-md px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50 ${
                                    danger
                                        ? "bg-gradient-to-br from-red-600 to-rose-600 shadow-red-500/20"
                                        : "bg-gradient-to-br from-violet-600 to-purple-600 shadow-violet-500/20"
                                }`}
                            >
                                {loading ? "A processar…" : confirmText}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
