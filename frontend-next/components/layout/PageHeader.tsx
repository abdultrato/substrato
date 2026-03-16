interface Props {
    title: string
    subtitle?: string
    actions?: React.ReactNode
}

export default function PageHeader ( { title, subtitle, actions }: Props ) {
    return (
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                )}
            </div>

            {actions && <div className="flex gap-2">{actions}</div>}
        </div>
    )
}
