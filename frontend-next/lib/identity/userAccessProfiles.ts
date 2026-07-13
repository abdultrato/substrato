import { GROUPS } from "@/lib/rbac"

export type EmployeeAccessSource = {
  role_name?: string | null
  profession_name?: string | null
}

function normalize(value: string): string {
  return String(value || "")
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

const ACCESS_RULES: Array<{ group: string; tokens: string[] }> = [
  {
    group: GROUPS.LABORATORIO,
    tokens: [
      "laboratorio",
      "laboratory",
      "analises clinicas",
      "analises",
      "patologia",
      "lab",
    ],
  },
  {
    group: GROUPS.ENFERMAGEM,
    tokens: [
      "enferm",
      "nurse",
      "midwife",
      "parteira",
      "smi",
      "materno infantil",
      "saude materno infantil",
    ],
  },
  {
    group: GROUPS.MEDICINA,
    tokens: ["medico", "doctor", "clinico", "generalista"],
  },
  {
    group: GROUPS.RECEPCAO,
    tokens: ["recepc", "front desk", "triagem", "check in", "checkin"],
  },
  {
    group: GROUPS.RADIOLOGIA,
    tokens: [
      "radiolog",
      "radiologista",
      "imagiolog",
      "raio x",
      "rx",
      "ecografia",
      "ultrassom",
      "imag",
    ],
  },
  {
    group: GROUPS.FARMACIA,
    tokens: ["farmac", "pharmacy", "dispensa"],
  },
  {
    group: GROUPS.FISIOTERAPIA,
    tokens: ["fisioter", "reabilit", "physio"],
  },
  {
    group: GROUPS.RECURSOS_HUMANOS,
    tokens: ["recursos humanos", "human resources", "gestao de pessoas", "rh"],
  },
]

const GROUP_WORKSPACE_HINTS: Record<string, string> = {
  [GROUPS.LABORATORIO]: "/clinical-laboratory",
  [GROUPS.ENFERMAGEM]: "/nursing",
  [GROUPS.MEDICINA]: "/medicine",
  [GROUPS.RECEPCAO]: "/reception",
  [GROUPS.RADIOLOGIA]: "/radiology",
  [GROUPS.FARMACIA]: "/pharmacy",
  [GROUPS.FISIOTERAPIA]: "/physiotherapy",
  [GROUPS.RECURSOS_HUMANOS]: "/human_resources",
}

export function inferEmployeeAccessGroups(source: EmployeeAccessSource): string[] {
  const haystack = [source.role_name, source.profession_name]
    .map((value) => normalize(String(value || "")))
    .filter(Boolean)
    .join(" ")

  if (!haystack) return []

  const matches = new Set<string>()
  for (const rule of ACCESS_RULES) {
    if (rule.tokens.some((token) => haystack.includes(normalize(token)))) {
      matches.add(rule.group)
    }
  }

  return Array.from(matches)
}

export function groupWorkspaceHint(groupName?: string | null): string | null {
  if (!groupName) return null
  return GROUP_WORKSPACE_HINTS[groupName] || null
}

export function matchesCanonicalGroupLabel(candidate: string, canonical: string): boolean {
  const normalizedCandidate = normalize(candidate)
  const normalizedCanonical = normalize(canonical)
  if (normalizedCandidate === normalizedCanonical) return true

  const extraAliases: Record<string, string[]> = {
    [GROUPS.RADIOLOGIA]: [
      "tecnico radiologista",
      "tecnico de radiologia",
      "radiologista",
    ],
    [GROUPS.FISIOTERAPIA]: [
      "tecnico de fisioterapia",
      "tecnico fisioterapeuta",
      "fisioterapeuta",
    ],
    [GROUPS.ENFERMAGEM]: [
      "enfermeira",
      "enfermeira de smi",
      "tecnico de enfermagem",
    ],
    [GROUPS.FARMACIA]: [
      "tecnico de farmacia",
      "farmaceutico",
    ],
    [GROUPS.LABORATORIO]: [
      "tecnico de laboratorio",
      "tecnico laboratorista",
    ],
    [GROUPS.MEDICINA]: ["medico"],
    [GROUPS.RECEPCAO]: ["recepcionista"],
  }

  return (extraAliases[canonical] || []).some(
    (alias) => normalize(alias) === normalizedCandidate,
  )
}
