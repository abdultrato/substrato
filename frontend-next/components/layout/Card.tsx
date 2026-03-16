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
            className={`rounded-2xl border border-border bg-card shadow-sm ${padding ? "p-4 md:p-6" : ""
                } ${className}`}
        >
            {children}
        </div>
    )
}
