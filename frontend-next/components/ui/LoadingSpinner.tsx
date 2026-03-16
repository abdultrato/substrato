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
                className="animate-spin rounded-full border-4 border-border border-t-primary"
            />
            {label && (
                <span className="text-sm text-muted-foreground">
                    {label}
                </span>
            )}
        </div>
    )

    if ( fullScreen ) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                {spinner}
            </div>
        )
    }

    return spinner
}
