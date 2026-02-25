"use client"

import { ButtonHTMLAttributes } from "react"
import { Loader2 } from "lucide-react"

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost"
    loading?: boolean
    fullWidth?: boolean
}

export default function Button ( {
    children,
    variant = "primary",
    loading,
    fullWidth,
    className = "",
    disabled,
    ...props
}: Props ) {
    const base =
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition"

    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700",
        secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
        danger: "bg-red-600 text-white hover:bg-red-700",
        ghost: "text-gray-700 hover:bg-gray-100",
    }

    return (
        <button
            className={`
        ${base}
        ${variants[variant]}
        ${fullWidth ? "w-full" : ""}
        ${( disabled || loading ) && "opacity-60 cursor-not-allowed"}
        ${className}
      `}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <Loader2 className="animate-spin" size={16} />}
            {children}
        </button>
    )
}
