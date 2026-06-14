"use client"

import { ReactNode } from "react"
import { useLanguage } from "@/hooks/useLanguage"

interface Props {
    title?: string
    subtitle?: string
    actions?: ReactNode
    children: ReactNode
    transparent?: boolean
}

export default function Card ( {
    title,
    subtitle,
    actions,
    children,
    transparent = false,
}: Props ) {
    const { tr } = useLanguage()

    return (
        <div className={`rounded-lg border border-border ${transparent ? "bg-transparent" : "bg-card shadow-sm"}`}>
            {( title || actions ) && (
                <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                    <div>
                        {title && (
                            <h3 className="font-display text-sm font-semibold text-foreground">
                                {tr(title)}
                            </h3>
                        )}
                        {subtitle && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                {tr(subtitle)}
                            </p>
                        )}
                    </div>

                    {actions && <div>{actions}</div>}
                </div>
            )}

            <div className="p-4">{children}</div>
        </div>
    )
}
