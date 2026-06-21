const CLINICAL_STATUS_LABELS: Record<string, string> = {
  NAO_URGENTE: "Não urgente",
  NORMAL: "Normal",
  ROTINA: "Rotina",
  POUCO_URGENTE: "Pouco urgente",
  PRIORITARIO: "Prioritário",
  URGENTE: "Urgente",
  MUITO_URGENTE: "Muito urgente",
  URGENTISSIMO: "Urgentíssimo",
  EMERGENCIA: "Emergência",
}

function cleanValue(value?: string | null): string {
  return String(value || "").trim()
}

export function getClinicalStatusLabel(
  value?: string | null,
  display?: string | null
): string {
  const explicitDisplay = cleanValue(display)
  if (explicitDisplay) return explicitDisplay

  const normalizedValue = cleanValue(value)
  if (!normalizedValue) return ""

  return CLINICAL_STATUS_LABELS[normalizedValue] || normalizedValue
}
