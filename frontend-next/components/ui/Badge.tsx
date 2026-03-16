interface Props {
    children: React.ReactNode
    variant?: "default" | "success" | "warning" | "danger" | "info"
}

export default function Badge ( {
    children,
    variant = "default",
}: Props ) {
    const variants = {
        default: "border-border bg-muted text-foreground-2",
        success:
            "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
        warning:
            "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
        danger:
            "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
        info:
            "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
    }

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${variants[variant]}`}
        >
            {children}
        </span>
    )
}
