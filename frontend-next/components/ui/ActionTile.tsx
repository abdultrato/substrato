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
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-border hover:text-primary"
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-muted transition-transform group-hover:scale-110" />

      <div className="relative flex items-start gap-3">
        <div className="rounded-xl border border-border bg-muted p-1.5 text-foreground-2 shadow-sm transition-colors group-hover:text-primary">
          <Icon size={16} />
        </div>

        <div>
          <div className="font-display text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
            {title}
          </div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </div>
        </div>
      </div>
    </Link>
  )
}
