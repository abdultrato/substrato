import schema from "@/schema.generated.json"

export type CountryOption = {
  code: string
  label: string
}

function extractLabelsFromDescription(
  description: unknown,
  values: string[]
): string[] | undefined {
  const desc = typeof description === "string" ? description : ""
  if (!desc || !values.length) return undefined

  const map = new Map<string, string>()
  for (const line of desc.split("\n")) {
    const m = line.match(/^\s*\*\s*`([^`]+)`\s*-\s*(.+?)\s*$/)
    if (!m) continue
    map.set(String(m[1]), String(m[2]))
  }

  if (!map.size) return undefined
  return values.map((v) => map.get(String(v)) || String(v))
}

export function getCountryOptions(locales: string[] = ["pt"]): CountryOption[] {
  if (typeof Intl === "undefined") return []

  const enumSchema = (schema as any)?.components?.schemas?.EnderecoPaisEnum
  const codes = Array.isArray(enumSchema?.enum) ? (enumSchema.enum as string[]) : []
  const enumLabels = extractLabelsFromDescription(enumSchema?.description, codes)

  const DisplayNames = (Intl as any).DisplayNames as
    | (new (locales: string[], options: { type: "region" }) => {
        of: (code: string) => string | undefined
      })
    | undefined

  const dn = DisplayNames ? new DisplayNames(locales, { type: "region" }) : null

  const options = codes
    .map((code, idx) => ({
      code,
      label: enumLabels?.[idx] || dn?.of(code) || code,
    }))
    .filter((o) => !!o.code)

  options.sort((a, b) =>
    a.label.localeCompare(b.label, locales[0] || undefined, {
      sensitivity: "base",
    })
  )

  return options
}
