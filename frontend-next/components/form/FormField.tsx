"use client"

import { ReactNode } from "react"

type Props = {
    id: string
    label: string
    required?: boolean
    hint?: string
    error?: string | null
    children: ReactNode
    className?: string
}

export default function FormField( { id, label, required, hint, error, children, className = "" }: Props ) {
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <label htmlFor={id} className="text-sm font-medium text-foreground">
                {label}
                {required ? <span className="text-red-600"> *</span> : null}
            </label>

            {children}

            {error ? (
                <div className="text-xs text-red-700">{error}</div>
            ) : hint ? (
                <div className="text-xs text-muted-foreground">{hint}</div>
            ) : null}
        </div>
    )
}

