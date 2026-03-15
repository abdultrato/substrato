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
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-medium leading-tight transition"

    const variants = {
        primary: "bg-[var(--primary-600)] text-white hover:bg-[var(--primary-700)]",
        secondary:
            "bg-[var(--gray-100)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--gray-200)]",
        danger: "bg-red-600 text-white hover:bg-red-700",
        ghost:
            "text-[var(--gray-700)] hover:bg-[var(--gray-100)] hover:text-[var(--hover-accent)]",
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
