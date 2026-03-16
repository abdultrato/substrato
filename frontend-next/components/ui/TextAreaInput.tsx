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
          w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm leading-tight text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition-colors
          ${error ? "border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/20" : "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"}
          ${className}
        `}
            />
        )
    }
)

TextAreaInput.displayName = "TextAreaInput"

export default TextAreaInput
