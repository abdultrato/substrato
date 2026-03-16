"use client"

import {
    ReactNode,
    useEffect,
    useRef,
    useState,
} from "react"

interface Props {
    title?: string
    message?: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void | Promise<void>
    children: ReactNode
    danger?: boolean
}

export default function ConfirmDialog ( {
    title = "Confirmar ação",
    message = "Tem certeza que deseja continuar?",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    onConfirm,
    children,
    danger = true,
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
                onClick={() => setOpen( true )}
                className="cursor-pointer inline-flex"
            >
                {children}
            </span>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-fade-in"
                    onMouseDown={handleBackdropClick}
                >
                    <div
                        ref={modalRef}
                        className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-lg animate-scale-in"
                    >
                        <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
                            {title}
                        </h3>

                        <p className="mt-1.5 text-sm text-muted-foreground">{message}</p>

                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setOpen( false )}
                                disabled={loading}
                                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground-2 shadow-sm transition-colors hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                            >
                                {cancelText}
                            </button>

                            <button
                                onClick={handleConfirm}
                                disabled={loading}
                                className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-card ${danger
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-primary hover:bg-primary-hover"
                                    }`}
                            >
                                {loading ? "Processando..." : confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
