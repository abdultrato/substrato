import { SessionUser } from "@/lib/session"

export const GROUPS = {
  ADMIN: "Administrador",
  RECEPCAO: "Recepcionista",
  LABORATORIO: "Técnico de Laboratório",
  ENFERMAGEM: "Enfermeiro",
  FARMACIA: "Técnico de Farmácia",
  MANUTENCAO: "Manutenção",
  MEDICINA: "Médico",
  MEDICINA_OCUPACIONAL: "Medicina Ocupacional",
  CONTABILIDADE: "Contabilidade",
  RECURSOS_HUMANOS: "Gestor de RH",
} as const

const ALL_GROUP_VALUES = Object.values(GROUPS)

const GROUP_SYNONYMS: Record<string, string[]> = {
  Administrador: [
    "admin",
    "administrador",
    "administrator",
    "superuser",
    "super usuario",
    "super usuário",
    "superusuario",
    "staff",
  ],
}

export type WorkspaceKey =
  | "dashboard"
  | "recepcao"
  | "laboratorio"
  | "enfermagem"
  | "medicina"
  | "farmacia"
  | "medicina-ocupacional"
  | "contabilidade"
  | "recursos-humanos"

export type WorkspaceDef = {
  key: WorkspaceKey
  label: string
  href: string
  description: string
  anyOfGroups?: string[]
}

export const WORKSPACES: WorkspaceDef[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/",
    description: "Visão geral do dia e indicadores operacionais.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE],
  },
  {
    key: "recepcao",
    label: "Recepção",
    href: "/recepcao",
    description: "Entrada de pacientes, requisições e fluxo financeiro (faturas/recibos).",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.RECEPCAO],
  },
  {
    key: "laboratorio",
    label: "Laboratório",
    href: "/laboratorio",
    description: "Lançamento/validação de resultados e emissão de PDF.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.LABORATORIO],
  },
  {
    key: "enfermagem",
    label: "Enfermagem",
    href: "/enfermagem",
    description: "Execução de colheitas, procedimentos e apoio operacional.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.ENFERMAGEM],
  },
  {
    key: "medicina",
    label: "Medicina",
    href: "/medicina",
    description: "Acompanhamento clínico e requisições de exames/procedimentos.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.MEDICINA],
  },
  {
    key: "farmacia",
    label: "Farmácia",
    href: "/farmacia",
    description: "Almoxarifado, lotes e movimentos de estoque.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.FARMACIA],
  },
  {
    key: "medicina-ocupacional",
    label: "Medicina Ocupacional",
    href: "/medicina-ocupacional",
    description: "Registo, requisições e jornada ocupacional.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.MEDICINA_OCUPACIONAL],
  },
  {
    key: "contabilidade",
    label: "Contabilidade",
    href: "/contabilidade",
    description: "Contas, lançamentos e auditoria (somente leitura para recepção).",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE],
  },
  {
    key: "recursos-humanos",
    label: "Recursos Humanos",
    href: "/recursos/recursos_humanos",
    description: "Gestão de funcionários, cargos e escalas de trabalho.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.RECURSOS_HUMANOS],
  },
]

function normalizeGroupName(value: string): string {
  return (value || "")
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function userGroups(user: SessionUser | null): string[] {
  const base = user?.groups ?? []
  if (user?.is_superuser) {
    // Superuser ganha todos os grupos por padrão.
    return Array.from(new Set([...base, ...ALL_GROUP_VALUES]))
  }
  if (user?.is_staff && !base.includes(GROUPS.ADMIN)) {
    return [...base, GROUPS.ADMIN]
  }
  return base
}

function expandRequired(required: string[]): string[] {
  const expanded: string[] = []
  required.forEach((g) => {
    expanded.push(g)
    const syn = GROUP_SYNONYMS[g]
    if (syn) expanded.push(...syn)
  })
  return expanded
}

export function userHasAnyGroup(
  user: SessionUser | null,
  requiredGroups: string[]
): boolean {
  if (!requiredGroups?.length) return true
  if (
    requiredGroups.includes(GROUPS.ADMIN) &&
    (user?.is_superuser || user?.is_staff)
  ) {
    return true
  }

  const requiredExpanded = expandRequired(requiredGroups)
  const have = new Set(userGroups(user).map(normalizeGroupName))
  return requiredExpanded.some((g) => have.has(normalizeGroupName(g)))
}

export function getAccessibleWorkspaces(user: SessionUser | null): WorkspaceDef[] {
  if (user?.is_superuser || user?.is_staff) {
    return WORKSPACES
  }
  return WORKSPACES.filter((w) =>
    w.anyOfGroups ? userHasAnyGroup(user, w.anyOfGroups) : true
  )
}

export function getDefaultWorkspaceHref(user: SessionUser | null): string {
  // Admin + contabilidade usam o dashboard como home por padrão.
  if (userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.CONTABILIDADE])) return "/"

  const first = getAccessibleWorkspaces(user).find((w) => w.key !== "dashboard")
  return first?.href || "/"
}
