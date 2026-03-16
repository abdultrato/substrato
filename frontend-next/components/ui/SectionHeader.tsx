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
                <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                    {title}
                </h2>
                {subtitle && (
                    <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                )}
            </div>

            {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
    )
}
