"use client"

import { SelectHTMLAttributes, forwardRef } from "react"

interface Option {
    value: string | number
    label: string
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
    options: Option[]
    placeholder?: string
    error?: string
}

const SelectInput = forwardRef<HTMLSelectElement, Props>(
    ( { options, placeholder, error, className = "", ...props }, ref ) => {
        return (
            <select
                ref={ref}
                {...props}
                className={`
          w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-tight text-foreground shadow-sm outline-none transition-colors
          ${error ? "border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/20" : "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"}
          ${className}
        `}
            >
                {placeholder && (
                    <option value="">
                        {placeholder}
                    </option>
                )}

                {options.map( opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ) )}
            </select>
        )
    }
)

SelectInput.displayName = "SelectInput"

export default SelectInput
