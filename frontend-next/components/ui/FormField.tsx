import { ReactNode } from "react"

interface Props {
    label?: string
    htmlFor?: string
    error?: string
    hint?: string
    required?: boolean
    children: ReactNode
}

export default function FormField ( {
    label,
    htmlFor,
    error,
    hint,
    required,
    children,
}: Props ) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label
                    htmlFor={htmlFor}
                    className="text-sm font-semibold text-foreground-2"
                >
                    {label}
                    {required && (
                        <span className="text-red-500 ml-1">*</span>
                    )}
                </label>
            )}

            {children}

            {hint && !error && (
                <p className="text-xs text-muted-foreground">{hint}</p>
            )}

            {error && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">
                    {error}
                </p>
            )}
        </div>
    )
}
