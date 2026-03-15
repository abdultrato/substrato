import Link from "next/link"

export default function ActionTile({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string
  description: string
  href: string
  icon: any
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm transition hover:border-[var(--gray-300)] hover:text-[var(--hover-accent)]"
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[var(--gray-100)] transition group-hover:scale-110" />

      <div className="relative flex items-start gap-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--gray-100)] p-1.5 text-[var(--gray-700)] shadow-sm transition group-hover:text-[var(--hover-accent)]">
          <Icon size={16} />
        </div>

        <div>
          <div className="font-display text-sm font-semibold text-[var(--text)] transition group-hover:text-[var(--hover-accent)]">
            {title}
          </div>
          <div className="mt-1 text-xs leading-5 text-[var(--gray-500)]">
            {description}
          </div>
        </div>
      </div>
    </Link>
  )
}
