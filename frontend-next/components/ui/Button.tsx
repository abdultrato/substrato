"use client"

import { ButtonHTMLAttributes } from "react"
import { Loader2 } from "lucide-react"

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost" | "outline"
    size?: "sm" | "md" | "lg"
    loading?: boolean
    fullWidth?: boolean
}

export default function Button ( {
    children,
    variant = "primary",
    size = "md",
    loading,
    fullWidth,
    className = "",
    disabled,
    type = "button",
    ...props
}: Props) {
    const base =
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none"

    const variants = {
        primary:
            "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
        secondary:
            "border border-border bg-card text-foreground shadow-sm hover:bg-muted",
        outline:
            "border border-border bg-transparent text-foreground-2 shadow-none hover:bg-muted hover:text-foreground",
        danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        ghost:
            "bg-transparent text-foreground-2 shadow-none hover:bg-muted hover:text-foreground",
    }

    const sizes = {
        sm: "h-8 px-2.5 text-xs",
        md: "h-9 px-3 text-sm",
        lg: "h-10 px-4 text-sm",
    }

    return (
        <button
            type={type}
            aria-busy={loading ? "true" : undefined}
            className={`
        ${base}
        ${variants[variant]}
        ${sizes[size]}
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
