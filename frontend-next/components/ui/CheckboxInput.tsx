"use client"

import { InputHTMLAttributes, forwardRef } from "react"

interface Props extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
}

const CheckboxInput = forwardRef<HTMLInputElement, Props>(
    ( { label, className = "", ...props }, ref ) => {
        return (
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                    ref={ref}
                    type="checkbox"
                    {...props}
                    className={`h-4 w-4 rounded border-border bg-background accent-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 ${className}`}
                />
                {label && <span className="text-sm text-foreground-2">{label}</span>}
            </label>
        )
    }
)

CheckboxInput.displayName = "CheckboxInput"

export default CheckboxInput
