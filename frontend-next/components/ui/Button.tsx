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
        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold leading-tight shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

    const variants = {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary:
            "bg-card text-foreground border border-border hover:bg-muted",
        danger: "bg-red-600 text-white hover:bg-red-700",
        ghost:
            "bg-transparent text-foreground-2 shadow-none hover:bg-muted hover:text-foreground",
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
