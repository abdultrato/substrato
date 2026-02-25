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
        <div className="bg-white rounded-xl border shadow-sm">
            {( title || actions ) && (
                <div className="flex items-start justify-between px-5 pt-4 pb-2">
                    <div>
                        {title && (
                            <h3 className="text-sm font-semibold text-gray-800">
                                {title}
                            </h3>
                        )}
                        {subtitle && (
                            <p className="text-xs text-gray-500 mt-1">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {actions && <div>{actions}</div>}
                </div>
            )}

            <div className="px-5 pb-5 pt-2">{children}</div>
        </div>
    )
}
