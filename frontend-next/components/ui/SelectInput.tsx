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
          w-full rounded-lg border px-2.5 py-1 text-sm leading-tight outline-none transition bg-[var(--card)] text-[var(--text)]
          ${error ? "border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-[var(--border)] focus:border-[var(--primary-500)] focus:ring-2 focus:ring-red-500/10"}
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
