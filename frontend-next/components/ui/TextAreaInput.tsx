"use client"

import { TextareaHTMLAttributes, forwardRef } from "react"

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: string
}

const TextAreaInput = forwardRef<HTMLTextAreaElement, Props>(
    ( { error, className = "", rows = 3, ...props }, ref ) => {
        return (
            <textarea
                ref={ref}
                rows={rows}
                {...props}
                className={`
          w-full rounded-lg border px-3 py-2 text-sm outline-none transition resize-none
          bg-white
          ${error ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-gray-300 focus:ring-2 focus:ring-blue-200"}
          ${className}
        `}
            />
        )
    }
)

TextAreaInput.displayName = "TextAreaInput"

export default TextAreaInput
