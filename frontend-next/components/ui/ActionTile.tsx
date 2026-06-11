import Link from "next/link"
import { useLanguage } from "@/hooks/useLanguage"
import { lucideToDataUrl } from "@/lib/icon-svg"

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
  const iconUrl = lucideToDataUrl(icon)

  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/40 hover:text-primary"
    >
      <div className="relative flex items-start gap-3">
        <span
          aria-hidden
          className="pointer-events-none relative h-8 w-8 shrink-0 rounded-md border border-border bg-muted shadow-sm"
        >
          <span
            className="absolute inset-[6px]"
            style={{
              backgroundColor: "currentColor",
              WebkitMaskImage: `url("${iconUrl}")`,
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
              WebkitMaskPosition: "center",
              maskImage: `url("${iconUrl}")`,
              maskRepeat: "no-repeat",
              maskSize: "contain",
              maskPosition: "center",
            }}
          />
        </span>

        <div>
          <div className="font-display text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
            {tr(title)}
          </div>
          {description ? (
            <div className="mt-1 text-xs leading-5 text-muted-foreground">
              {tr(description)}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
