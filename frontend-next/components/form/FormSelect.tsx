"use client"

import { SelectHTMLAttributes, forwardRef } from "react"

interface Option {
    value: string | number
    label: string
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string
    error?: string
    options: Option[]
    placeholder?: string
}

const FormSelect = forwardRef<HTMLSelectElement, Props>(
    ( { label, error, options, placeholder, className = "", ...props }, ref ) => {
        return (
            <div className="flex flex-col gap-1">
                {label && (
                    <label className="text-sm font-medium text-gray-700">
                        {label}
                    </label>
                )}

                <select
                    ref={ref}
                    {...props}
                    className={`px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring focus:border-blue-300 ${error ? "border-red-500" : "border-gray-300"
                        } ${className}`}
                >
                    {placeholder && (
                        <option value="">{placeholder}</option>
                    )}

                    {options.map( ( opt ) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ) )}
                </select>

                {error && (
                    <span className="text-xs text-red-500">{error}</span>
                )}
            </div>
        )
    }
)

FormSelect.displayName = "FormSelect"

export default FormSelect
