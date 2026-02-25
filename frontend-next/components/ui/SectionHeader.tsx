import { ReactNode } from "react"

interface Props {
    title: string
    subtitle?: string
    action?: ReactNode
}

export default function SectionHeader ( { title, subtitle, action }: Props ) {
    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                {subtitle && (
                    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                )}
            </div>

            {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
    )
}
