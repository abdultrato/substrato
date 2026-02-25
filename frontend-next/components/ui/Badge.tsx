interface Props {
    children: React.ReactNode
    variant?: "default" | "success" | "warning" | "danger" | "info"
}

export default function Badge ( {
    children,
    variant = "default",
}: Props ) {
    const variants = {
        default: "bg-gray-100 text-gray-700",
        success: "bg-green-100 text-green-700",
        warning: "bg-yellow-100 text-yellow-800",
        danger: "bg-red-100 text-red-700",
        info: "bg-blue-100 text-blue-700",
    }

    return (
        <span
            className={`px-2 py-1 text-xs rounded-md font-medium ${variants[variant]}`}
        >
            {children}
        </span>
    )
}
