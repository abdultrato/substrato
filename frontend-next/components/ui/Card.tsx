"use client"

import { ReactNode } from "react"
import { useLanguage } from "@/hooks/useLanguage"

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
    const { tr } = useLanguage()

    return (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
            {( title || actions ) && (
                <div className="flex items-start justify-between px-3 pt-2.5 pb-1.5">
                    <div>
                        {title && (
                            <h3 className="text-sm font-semibold text-foreground">
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

            <div className="px-3 pb-3 pt-2">{children}</div>
        </div>
    )
}
