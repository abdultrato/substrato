import { ReactNode } from "react"
import { Inbox } from "lucide-react"

interface Props {
    title?: string
    description?: string
    action?: ReactNode
    icon?: ReactNode
}

export default function EmptyState ( {
    title = "Nada encontrado",
    description = "Não existem dados para exibir neste momento.",
    action,
    icon,
}: Props ) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-10 px-3">
            <div className="mb-4 text-muted-foreground/50">
                {icon ?? <Inbox size={42} />}
            </div>

            <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
                {title}
            </h3>

            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {description}
            </p>

            {action && <div className="mt-6">{action}</div>}
        </div>
    )
}
