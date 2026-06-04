interface Props {
    children: React.ReactNode
    className?: string
}

export default function PageContainer ( { children, className }: Props ) {
    return (
        <div className={`mx-auto w-full max-w-7xl ${className || ""}`}>
            {children}
        </div>
    )
}
