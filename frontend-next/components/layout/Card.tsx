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
            className={`bg-white rounded-xl shadow-sm border border-gray-200 ${padding ? "p-4 md:p-6" : ""
                } ${className}`}
        >
            {children}
        </div>
    )
}
