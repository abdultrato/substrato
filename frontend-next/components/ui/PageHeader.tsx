"use client"

import { ReactNode } from "react"
import { useLanguage } from "@/hooks/useLanguage"

interface Props {
    title: string
    subtitle?: string
    actions?: ReactNode
    /** Ícone opcional exibido num chip colorido ao lado do título. */
    icon?: any
    /** Classe de cor do chip do ícone (ex.: "bg-emerald-500/15 text-emerald-600"). */
    iconClass?: string
}

export default function PageHeader ( {
    title,
    subtitle,
    actions,
    icon,
    iconClass,
}: Props ) {
    const { tr } = useLanguage()
    const Icon = icon as any

    return (
        <div className="mb-3 flex flex-col gap-2.5 border-b border-border/60 pb-2.5 md:flex-row md:items-end md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
                {Icon ? (
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass ?? "bg-muted text-muted-foreground"}`}>
                        <Icon size={20} strokeWidth={2} />
                    </span>
                ) : null}
                <div className="min-w-0">
                    <h1 className="break-words font-display text-xl font-semibold text-foreground sm:text-2xl">
                        {tr(title)}
                    </h1>

                    {subtitle && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {tr(subtitle)}
                        </p>
                    )}
                </div>
            </div>

            {actions && (
                <div data-page-actions className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
                    {actions}
                </div>
            )}
        </div>
    )
}
