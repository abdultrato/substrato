interface Props {
    children: React.ReactNode
    className?: string
    padding?: boolean
}

export default function Card ( {
    children,
    className = "",
    padding = true,
}: Props ) {
    return (
        <div
            className={`rounded-lg border border-border bg-card shadow-sm ${padding ? "p-4 md:p-5" : ""
                } ${className}`}
        >
            {children}
        </div>
    )
}
