"use client"

import { InputHTMLAttributes, forwardRef } from "react"

interface Props extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
}

const FormCheckbox = forwardRef<HTMLInputElement, Props>(
    ( { label, error, className = "", ...props }, ref ) => {
        return (
            <div className="flex flex-col gap-1">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                        ref={ref}
                        type="checkbox"
                        {...props}
                        className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${className}`}
                    />
                    {label}
                </label>

                {error && (
                    <span className="text-xs text-red-500">{error}</span>
                )}
            </div>
        )
    }
)

FormCheckbox.displayName = "FormCheckbox"

export default FormCheckbox
