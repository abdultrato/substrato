"use client"

import { ReactNode } from "react"
import { useLanguage } from "@/hooks/useLanguage"

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
    const { tr } = useLanguage()

    return (
        <div className="mb-3 flex flex-col gap-2.5 border-b border-border/60 pb-2.5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
                <h1 className="break-words font-display text-xl font-semibold text-foreground sm:text-2xl">
                    {tr(title)}
                </h1>

                {subtitle && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {tr(subtitle)}
                    </p>
                )}
            </div>

            {actions && (
                <div data-page-actions className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
                    {actions}
                </div>
            )}
        </div>
    )
}
