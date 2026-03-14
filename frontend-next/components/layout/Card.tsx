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
            className={`bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] ${padding ? "p-4 md:p-6" : ""
                } ${className}`}
        >
            {children}
        </div>
    )
}
