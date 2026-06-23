"use client"

import { ReactNode } from "react"
import { useLanguage } from "@/hooks/useLanguage"

interface Props {
    title?: string
    subtitle?: string
    actions?: ReactNode
    children: ReactNode
    transparent?: boolean
    glass?: boolean
}

export default function Card ( {
    title,
    subtitle,
    actions,
    children,
    transparent = false,
    glass = false,
}: Props ) {
    const { tr } = useLanguage()

    const surfaceClass = transparent
        ? "rounded-lg border border-border bg-transparent"
        : glass
            ? "rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
            : "rounded-lg border border-border bg-card shadow-sm"

    return (
        <div className={surfaceClass}>
            {( title || actions ) && (
                <div className="flex items-start justify-between gap-2 border-b border-border/60 px-3 py-2">
                    <div>
                        {title && (
                            <h3 className="font-display text-sm font-semibold text-foreground">
                                {tr(title)}
                            </h3>
                        )}
                        {subtitle && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {tr(subtitle)}
                            </p>
                        )}
                    </div>

                    {actions && <div>{actions}</div>}
                </div>
            )}

            <div className="p-3">{children}</div>
        </div>
    )
}
