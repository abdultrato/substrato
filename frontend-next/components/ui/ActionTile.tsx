import Link from "next/link"
import { useLanguage } from "@/hooks/useLanguage"

export default function ActionTile({
  title,
  description,
  href,
  icon,
}: {
  title: string
  description?: string
  href: string
  icon: any
}) {
  const { tr } = useLanguage()
  const Icon = icon as any

  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/25 px-3 py-2 shadow-sm backdrop-blur-sm transition-all hover:border-[var(--primary-300)] hover:bg-white/45 hover:shadow-md dark:bg-white/5 dark:border-white/10 dark:hover:border-[var(--primary-600)] dark:hover:bg-white/10"
    >
      <span
        aria-hidden
        className="pointer-events-none flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground shadow-sm transition-colors group-hover:bg-[var(--primary-100)] group-hover:text-[var(--primary-600)] dark:group-hover:bg-[var(--primary-900)] dark:group-hover:text-[var(--primary-300)]"
      >
        <Icon size={14} strokeWidth={2} />
      </span>

      <div className="min-w-0">
        <div className="text-xs font-semibold text-foreground transition-colors group-hover:text-[var(--primary-700)] dark:group-hover:text-[var(--primary-400)]">
          {tr(title)}
        </div>
        {description ? (
          <div className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground">
            {tr(description)}
          </div>
        ) : null}
      </div>
    </Link>
  )
}
