import Link from "next/link"
import { useLanguage } from "@/hooks/useLanguage"

export default function ActionTile({
  title,
  description,
  href,
  icon,
  accentClass,
  iconClass,
}: {
  title: string
  description?: string
  href: string
  icon: any
  /** Barra lateral colorida (ex.: "border-l-sky-500"). */
  accentClass?: string
  /** Classe de cor do chip do ícone (ex.: "bg-sky-500/15 text-sky-600"). */
  iconClass?: string
}) {
  const { tr } = useLanguage()
  const Icon = icon as any

  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 rounded-xl border-t border-r border-b border-white/20 bg-white/25 px-3 py-2 shadow-sm backdrop-blur-sm transition-all hover:border-t-[var(--primary-300)] hover:border-r-[var(--primary-300)] hover:border-b-[var(--primary-300)] hover:bg-white/45 hover:shadow-md dark:border-t-white/10 dark:border-r-white/10 dark:border-b-white/10 dark:bg-white/5 dark:hover:border-t-[var(--primary-600)] dark:hover:border-r-[var(--primary-600)] dark:hover:border-b-[var(--primary-600)] dark:hover:bg-white/10 ${accentClass ? `border-l-4 ${accentClass}` : "border-l border-l-white/20 dark:border-l-white/10"}`}
    >
      <span
        aria-hidden
        className={`pointer-events-none flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm transition-colors ${iconClass ?? "bg-muted text-muted-foreground group-hover:bg-[var(--primary-100)] group-hover:text-orange-600 dark:group-hover:bg-[var(--primary-900)] dark:group-hover:text-orange-500"}`}
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
