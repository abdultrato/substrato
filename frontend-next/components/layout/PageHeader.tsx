interface Props {
    title: string
    subtitle?: string
    actions?: React.ReactNode
}

export default function PageHeader ( { title, subtitle, actions }: Props ) {
    return (
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
                {subtitle && (
                    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                )}
            </div>

            {actions && <div className="flex gap-2">{actions}</div>}
        </div>
    )
}
