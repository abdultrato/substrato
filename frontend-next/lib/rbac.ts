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
  | "reception"
  | "laboratory"
  | "blood-bank"
  | "nursing"
  | "medicine"
  | "pharmacy"
  | "occupational-medicine"
  | "accounting"
  | "resources-human-resources"

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
    description: "Overview of the day and operational metrics.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE],
  },
  {
    key: "reception",
    label: "Reception",
    href: "/reception",
    description: "Patient intake, requests, and financial workflows.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.RECEPCAO],
  },
  {
    key: "laboratory",
    label: "Laboratory",
    href: "/laboratory",
    description: "Result entry, validation, and PDF generation.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.LABORATORIO],
  },
  {
    key: "blood-bank",
    label: "Blood Bank",
    href: "/bloodbank",
    description: "Donations, units, transfusions, and stock movements.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.LABORATORIO],
  },
  {
    key: "nursing",
    label: "Nursing",
    href: "/nursing",
    description: "Collections, procedures, and operational support.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.ENFERMAGEM],
  },
  {
    key: "medicine",
    label: "Medicine",
    href: "/medicine",
    description: "Clinical follow-up and exam/procedure requests.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.MEDICINA],
  },
  {
    key: "pharmacy",
    label: "Pharmacy",
    href: "/pharmacy",
    description: "Stock, lots, and warehouse movements.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.FARMACIA],
  },
  {
    key: "occupational-medicine",
    label: "Occupational Medicine",
    href: "/occupational-medicine",
    description: "Occupational registration and request workflows.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.MEDICINA_OCUPACIONAL],
  },
  {
    key: "accounting",
    label: "Accounting",
    href: "/accounting",
    description: "Accounts, entries, and audit workflows.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE],
  },
  {
    key: "resources-human-resources",
    label: "Human Resources",
    href: "/resources/human-resources",
    description: "Employee management, roles, and schedules.",
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
