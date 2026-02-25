interface Props {
    children: React.ReactNode
    className?: string
}

export default function PageContainer ( { children, className }: Props ) {
    return (
        <div className={`p-4 md:p-6 max-w-7xl mx-auto ${className || ""}`}>
            {children}
        </div>
    )
}
