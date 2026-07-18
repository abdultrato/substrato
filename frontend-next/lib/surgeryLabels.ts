export type SurgeryProcedureLabelInput = {
  surgery_type?: string | null
}

export function surgeryProcedureGroupLabel(
  procedures?: SurgeryProcedureLabelInput[] | null,
  fallbackSize?: string | null,
) {
  const normalized = (procedures || [])
    .map((item) => String(item.surgery_type || "").toUpperCase())
    .filter(Boolean)

  if (normalized.length <= 1) {
    const size = normalized[0] || String(fallbackSize || "").toUpperCase()
    if (size === "GRANDE") return "Grande cirurgia"
    if (size === "PEQUENA") return "Pequena cirurgia"
    return size || "Cirurgia"
  }

  const hasSmall = normalized.some((size) => size === "PEQUENA")
  const hasLarge = normalized.some((size) => size === "GRANDE")
  const hasAmbas = normalized.some((size) => size === "AMBAS")

  if (hasSmall && hasLarge) return "Múltiplas cirurgias"
  if (hasLarge && !hasSmall && !hasAmbas) return "Múltiplas grandes cirurgias"
  if (hasSmall && !hasLarge && !hasAmbas) return "Múltiplas pequenas cirurgias"

  const fallback = String(fallbackSize || "").toUpperCase()
  if (fallback === "GRANDE") return "Múltiplas grandes cirurgias"
  if (fallback === "PEQUENA") return "Múltiplas pequenas cirurgias"
  return "Múltiplas cirurgias"
}
