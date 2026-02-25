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
          w-full rounded-lg border px-3 py-2 text-sm outline-none transition bg-white
          ${error ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-gray-300 focus:ring-2 focus:ring-blue-200"}
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
