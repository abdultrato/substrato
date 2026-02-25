"use client"

import { InputHTMLAttributes, forwardRef } from "react"

interface Props extends InputHTMLAttributes<HTMLInputElement> {
    error?: string
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
}

const TextInput = forwardRef<HTMLInputElement, Props>(
    ( { error, leftIcon, rightIcon, className = "", ...props }, ref ) => {
        return (
            <div className="relative w-full">
                {leftIcon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {leftIcon}
                    </span>
                )}

                <input
                    ref={ref}
                    {...props}
                    className={`
            w-full rounded-lg border px-3 py-2 text-sm outline-none transition bg-white
            ${leftIcon ? "pl-10" : ""}
            ${rightIcon ? "pr-10" : ""}
            ${error
                            ? "border-red-500 focus:ring-2 focus:ring-red-200"
                            : "border-gray-300 focus:ring-2 focus:ring-blue-200"
                        }
            ${className}
          `}
                />

                {rightIcon && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {rightIcon}
                    </span>
                )}
            </div>
        )
    }
)

TextInput.displayName = "TextInput"

export default TextInput
