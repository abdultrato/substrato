"use client"

import { InputHTMLAttributes, forwardRef } from "react"

interface Props extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
}

const FormInput = forwardRef<HTMLInputElement, Props>(
    ( { label, error, className = "", ...props }, ref ) => {
        return (
            <div className="flex flex-col gap-1">
                {label && (
                    <label className="text-sm font-medium text-gray-700">
                        {label}
                    </label>
                )}

                <input
                    ref={ref}
                    {...props}
                    className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring focus:border-blue-300 ${error ? "border-red-500" : "border-gray-300"
                        } ${className}`}
                />

                {error && (
                    <span className="text-xs text-red-500">{error}</span>
                )}
            </div>
        )
    }
)

FormInput.displayName = "FormInput"

export default FormInput
