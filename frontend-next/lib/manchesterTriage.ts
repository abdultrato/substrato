/**
 * Protocolo de Manchester — Ministério da Saúde de Moçambique
 *
 * Verde      → Não urgente         (NAO_URGENTE, NORMAL, ROTINA, POUCO_URGENTE)
 * Amarelo    → Urgente             (PRIORITARIO, URGENTE)
 * Vermelho   → Urgentíssimo        (MUITO_URGENTE, URGENTISSIMO)
 * Emergência → Piscante R+A        (EMERGENCIA)
 */

export type ManchesterLevel = "verde" | "amarelo" | "vermelho" | "emergencia"

const STATUS_MAP: Record<string, ManchesterLevel> = {
  NAO_URGENTE:   "verde",
  NORMAL:        "verde",
  ROTINA:        "verde",
  POUCO_URGENTE: "verde",
  PRIORITARIO:   "amarelo",
  URGENTE:       "amarelo",
  MUITO_URGENTE: "vermelho",
  URGENTISSIMO:  "vermelho",
  EMERGENCIA:    "emergencia",
}

export type ManchesterMeta = {
  level:      ManchesterLevel
  label:      string
  /** Classes Tailwind para o badge (borda + fundo + texto) */
  badgeClass: string
  /** Classe extra para animação (apenas emergência) */
  animClass:  string
  /** Classe para a borda esquerda dos cards */
  accentClass: string
}

const META: Record<ManchesterLevel, ManchesterMeta> = {
  verde: {
    level:       "verde",
    label:       "Não urgente",
    badgeClass:  "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300",
    animClass:   "",
    accentClass: "border-l-green-500 dark:border-l-green-400",
  },
  amarelo: {
    level:       "amarelo",
    label:       "Urgente",
    badgeClass:  "border-yellow-400 bg-yellow-50 text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300",
    animClass:   "",
    accentClass: "border-l-yellow-500 dark:border-l-yellow-400",
  },
  vermelho: {
    level:       "vermelho",
    label:       "Urgentíssimo",
    badgeClass:  "border-red-400 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300",
    animClass:   "",
    accentClass: "border-l-red-600 dark:border-l-red-400",
  },
  emergencia: {
    level:       "emergencia",
    label:       "Emergência",
    badgeClass:  "border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-900/30 dark:text-red-300",
    animClass:   "manchester-emergency",
    accentClass: "border-l-red-600 dark:border-l-red-400 manchester-emergency-border",
  },
}

function normalize(value?: string | null): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s-]+/g, "_")
}

export function getManchesterMeta(
  status?: string | null,
  display?: string | null,
): ManchesterMeta {
  const key = normalize(status)
  const level = STATUS_MAP[key] ?? null

  if (level) {
    const meta = META[level]
    // Se vier display customizado do servidor, usa-o como label
    const label = display?.trim() || meta.label
    return { ...meta, label }
  }

  // Fallback: tenta inferir pelo display ou devolve verde
  const d = normalize(display)
  if (d.includes("EMERG"))        return { ...META.emergencia, label: display?.trim() || "Emergência" }
  if (d.includes("URGENTISSIMO") || d.includes("MUITO"))
                                   return { ...META.vermelho,   label: display?.trim() || "Urgentíssimo" }
  if (d.includes("URGENTE") || d.includes("PRIORITAR"))
                                   return { ...META.amarelo,    label: display?.trim() || "Urgente" }

  return { ...META.verde, label: display?.trim() || status?.trim() || "Não urgente" }
}
