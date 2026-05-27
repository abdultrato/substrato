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
        <div className="mb-4 flex flex-col gap-3 border-b border-border pb-3 md:flex-row md:items-end md:justify-between">
            <div>
                <h1 className="font-display text-2xl font-semibold text-foreground">
                    {tr(title)}
                </h1>

                {subtitle && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {tr(subtitle)}
                    </p>
                )}
            </div>

            {actions && (
                <div className="flex flex-wrap items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    )
}
