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
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn"
                    onMouseDown={handleBackdropClick}
                >
                    <div
                        ref={modalRef}
                        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-scaleIn"
                    >
                        <h3 className="text-lg font-semibold">{title}</h3>

                        <p className="text-sm text-gray-600 mt-2">{message}</p>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setOpen( false )}
                                disabled={loading}
                                className="px-4 py-2 text-sm rounded border hover:bg-gray-100 transition disabled:opacity-50"
                            >
                                {cancelText}
                            </button>

                            <button
                                onClick={handleConfirm}
                                disabled={loading}
                                className={`px-4 py-2 text-sm rounded text-white transition disabled:opacity-50 ${danger
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-gray-900 hover:bg-black"
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
