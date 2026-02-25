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
        <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <div className="mb-4 text-gray-300">
                {icon ?? <Inbox size={42} />}
            </div>

            <h3 className="text-base font-semibold text-gray-700">
                {title}
            </h3>

            <p className="text-sm text-gray-500 mt-1 max-w-sm">
                {description}
            </p>

            {action && <div className="mt-6">{action}</div>}
        </div>
    )
}
