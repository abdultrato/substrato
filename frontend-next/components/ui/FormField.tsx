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
                    className="text-sm font-medium text-gray-700"
                >
                    {label}
                    {required && (
                        <span className="text-red-500 ml-1">*</span>
                    )}
                </label>
            )}

            {children}

            {hint && !error && (
                <p className="text-xs text-gray-500">{hint}</p>
            )}

            {error && (
                <p className="text-xs text-red-600 mt-1">
                    {error}
                </p>
            )}
        </div>
    )
}
