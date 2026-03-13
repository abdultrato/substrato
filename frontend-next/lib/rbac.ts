import { SessionUser } from "@/lib/session"

export const GROUPS = {
  ADMIN: "Administrador",
  RECEPCAO: "Recepcionista",
  LABORATORIO: "Técnico de Laboratório",
  ENFERMAGEM: "Enfermeiro",
  FARMACIA: "Técnico de Farmácia",
  MEDICINA: "Médico",
  MEDICINA_OCUPACIONAL: "Medicina Ocupacional",
  CONTABILIDADE: "Contabilidade",
} as const

export type WorkspaceKey =
  | "dashboard"
  | "recepcao"
  | "laboratorio"
  | "enfermagem"
  | "medicina"
  | "farmacia"
  | "medicina-ocupacional"
  | "contabilidade"

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
]

function normalizeGroupName(value: string): string {
  return (value || "")
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function userGroups(user: SessionUser | null): string[] {
  return user?.groups ?? []
}

export function userHasAnyGroup(
  user: SessionUser | null,
  requiredGroups: string[]
): boolean {
  if (!requiredGroups?.length) return true
  const have = new Set(userGroups(user).map(normalizeGroupName))
  return requiredGroups.some((g) => have.has(normalizeGroupName(g)))
}

export function getAccessibleWorkspaces(user: SessionUser | null): WorkspaceDef[] {
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
