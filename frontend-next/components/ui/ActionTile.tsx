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
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-100 transition group-hover:scale-110" />

      <div className="relative flex items-start gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 shadow-sm">
          <Icon size={18} />
        </div>

        <div>
          <div className="font-display text-sm font-semibold text-slate-900">
            {title}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-600">
            {description}
          </div>
        </div>
      </div>
    </Link>
  )
}

