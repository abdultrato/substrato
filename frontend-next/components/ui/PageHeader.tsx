import { ReactNode } from "react"

interface Props {
    title: string
    subtitle?: string
    actions?: ReactNode
}

export default function PageHeader ( {
    title,
    subtitle,
    actions,
}: Props ) {
    return (
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="text-xl font-semibold text-[var(--text)]">
                    {title}
                </h1>

                {subtitle && (
                    <p className="text-sm text-[var(--gray-500)] mt-0.5">
                        {subtitle}
                    </p>
                )}
            </div>

            {actions && (
                <div className="flex items-center gap-1.5">
                    {actions}
                </div>
            )}
        </div>
    )
}
