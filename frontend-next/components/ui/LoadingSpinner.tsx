"use client"

interface Props {
    size?: number
    fullScreen?: boolean
    label?: string
}

export default function LoadingSpinner ( {
    size = 28,
    fullScreen = false,
    label = "Carregando...",
}: Props ) {
    const spinner = (
        <div className="flex flex-col items-center gap-3">
            <div
                style={{ width: size, height: size }}
                className="border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"
            />
            {label && (
                <span className="text-sm text-gray-500">
                    {label}
                </span>
            )}
        </div>
    )

    if ( fullScreen ) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                {spinner}
            </div>
        )
    }

    return spinner
}
