interface Props {
    title: string
    subtitle?: string
    actions?: React.ReactNode
}

export default function PageHeader ( { title, subtitle, actions }: Props ) {
    return (
        <div className="mb-4 flex flex-col gap-3 border-b border-border pb-3 md:flex-row md:items-end md:justify-between">
            <div>
                <h1 className="font-display text-2xl font-semibold text-foreground">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                )}
            </div>

            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    )
}
