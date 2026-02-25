"use client"

import { TextareaHTMLAttributes, forwardRef } from "react"

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string
    error?: string
    rows?: number
}

const FormTextarea = forwardRef<HTMLTextAreaElement, Props>(
    ( { label, error, rows = 3, className = "", ...props }, ref ) => {
        return (
            <div className="flex flex-col gap-1">
                {label && (
                    <label className="text-sm font-medium text-gray-700">
                        {label}
                    </label>
                )}

                <textarea
                    ref={ref}
                    rows={rows}
                    {...props}
                    className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring focus:border-blue-300 resize-none ${error ? "border-red-500" : "border-gray-300"
                        } ${className}`}
                />

                {error && (
                    <span className="text-xs text-red-500">{error}</span>
                )}
            </div>
        )
    }
)

FormTextarea.displayName = "FormTextarea"

export default FormTextarea
