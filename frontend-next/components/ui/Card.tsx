import { ReactNode } from "react"

interface Props {
    title?: string
    subtitle?: string
    actions?: ReactNode
    children: ReactNode
}

export default function Card ( {
    title,
    subtitle,
    actions,
    children,
}: Props ) {
    return (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm">
            {( title || actions ) && (
                <div className="flex items-start justify-between px-3 pt-2.5 pb-1.5">
                    <div>
                        {title && (
                            <h3 className="text-sm font-semibold text-[var(--text)]">
                                {title}
                            </h3>
                        )}
                        {subtitle && (
                            <p className="text-xs text-[var(--gray-500)] mt-1">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {actions && <div>{actions}</div>}
                </div>
            )}

            <div className="px-3 pb-3 pt-2">{children}</div>
        </div>
    )
}
