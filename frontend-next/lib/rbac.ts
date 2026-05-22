import { SessionUser } from "@/lib/session"

export const GROUPS = {
  ADMIN: "Administrador",
  RECEPCAO: "Recepcionista",
  LABORATORIO: "Técnico de Laboratório",
  ENFERMAGEM: "Enfermeiro",
  PROFESSOR: "Professor",
  DIRETOR_ESCOLA: "Diretor da Escola",
  DIRETOR_ADJUNTO_PEDAGOGICO: "Diretor Adjunto Pedagógico",
  ENCARREGADO_EDUCACAO: "Encarregado de Educação",
  STUDENT: "Estudante",
  ESTUDANTE: "Estudante",
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
  Professor: ["teacher", "professor", "docente"],
  "Diretor da Escola": [
    "director da escola",
    "diretor da escola",
    "school director",
    "headmaster",
    "principal",
  ],
  "Diretor Adjunto Pedagógico": [
    "director adjunto pedagogico",
    "diretor adjunto pedagogico",
    "deputy pedagogical director",
    "vice principal",
  ],
  "Encarregado de Educação": [
    "encarregado de educacao",
    "encarregado de educação",
    "guardian",
    "parent",
  ],
  Estudante: ["student", "estudante", "aluno", "discente"],
}

export type WorkspaceKey =
  | "dashboard"
  | "reception"
  | "laboratory"
  | "healthcare"
  | "blood-bank"
  | "nursing"
  | "education"
  | "education-teacher"
  | "education-directoria"
  | "education-student"
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
    key: "healthcare",
    label: "Healthcare",
    href: "/healthcare",
    description: "Unified clinical workspace for healthcare teams.",
    anyOfGroups: [
      GROUPS.ADMIN,
      GROUPS.RECEPCAO,
      GROUPS.LABORATORIO,
      GROUPS.ENFERMAGEM,
      GROUPS.MEDICINA,
      GROUPS.MEDICINA_OCUPACIONAL,
    ],
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
    key: "education",
    label: "Education",
    href: "/education",
    description: "Academic workflows for teachers and coordinators.",
    anyOfGroups: [
      GROUPS.ADMIN,
      GROUPS.PROFESSOR,
      GROUPS.DIRETOR_ESCOLA,
      GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO,
    ],
  },
  {
    key: "education-teacher",
    label: "Teacher Area",
    href: "/education/teacher",
    description: "Classes taught by the logged-in teacher and student follow-up.",
    anyOfGroups: [
      GROUPS.ADMIN,
      GROUPS.PROFESSOR,
      GROUPS.DIRETOR_ESCOLA,
      GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO,
    ],
  },
  {
    key: "education-directoria",
    label: "Directoria",
    href: "/education/directoria",
    description: "School-wide oversight for staff, students, and academic progress.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.DIRETOR_ESCOLA, GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO],
  },
  {
    key: "education-student",
    label: "Student Area",
    href: "/education/student",
    description: "Student dashboard for classes, grades, and attendance.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.STUDENT, GROUPS.ENCARREGADO_EDUCACAO],
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

const ADMIN_TOKEN = normalizeGroupName(GROUPS.ADMIN)
const DIRECTOR_TOKENS = new Set(
  [GROUPS.DIRETOR_ESCOLA, ...(GROUP_SYNONYMS[GROUPS.DIRETOR_ESCOLA] || [])].map(normalizeGroupName)
)
const DEPUTY_TOKENS = new Set(
  [GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO, ...(GROUP_SYNONYMS[GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO] || [])].map(
    normalizeGroupName
  )
)
const TEACHER_TOKENS = new Set([GROUPS.PROFESSOR, ...(GROUP_SYNONYMS[GROUPS.PROFESSOR] || [])].map(normalizeGroupName))
const STUDENT_TOKENS = new Set([GROUPS.STUDENT, ...(GROUP_SYNONYMS[GROUPS.ESTUDANTE] || [])].map(normalizeGroupName))

function normalizedGroupSet(values: string[] | undefined | null): Set<string> {
  return new Set((values || []).map(normalizeGroupName).filter(Boolean))
}

function setHasAny(source: Set<string>, expected: Set<string>): boolean {
  for (const item of expected) {
    if (source.has(item)) return true
  }
  return false
}

function userIsAdmin(user: SessionUser | null): boolean {
  if (!user) return false
  if (user.is_superuser || user.is_staff) return true
  return normalizedGroupSet(userGroups(user)).has(ADMIN_TOKEN)
}

export function canManageUserByHierarchy(
  actor: SessionUser | null,
  target: { id?: number | null; groups?: string[] | null }
): boolean {
  if (!actor) return false
  const actorGroups = normalizedGroupSet(userGroups(actor))
  const targetGroups = normalizedGroupSet(target.groups || [])

  if (target.id && actor.id === target.id) return true
  if (userIsAdmin(actor)) return true
  if (targetGroups.has(ADMIN_TOKEN)) return false

  if (setHasAny(actorGroups, DIRECTOR_TOKENS)) return true
  if (setHasAny(actorGroups, DEPUTY_TOKENS)) return !setHasAny(targetGroups, DIRECTOR_TOKENS)
  if (setHasAny(actorGroups, TEACHER_TOKENS)) return setHasAny(targetGroups, STUDENT_TOKENS)
  return false
}

export function canCreateUserWithGroupsByHierarchy(
  actor: SessionUser | null,
  targetGroups: string[]
): boolean {
  if (!actor) return false
  const actorGroups = normalizedGroupSet(userGroups(actor))
  const targetGroupSet = normalizedGroupSet(targetGroups)

  if (userIsAdmin(actor)) return true
  if (targetGroupSet.has(ADMIN_TOKEN)) return false

  if (setHasAny(actorGroups, DIRECTOR_TOKENS)) return true
  if (setHasAny(actorGroups, DEPUTY_TOKENS)) return !setHasAny(targetGroupSet, DIRECTOR_TOKENS)
  if (setHasAny(actorGroups, TEACHER_TOKENS)) return targetGroupSet.size > 0 && [...targetGroupSet].every((g) => STUDENT_TOKENS.has(g))
  return false
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
  if (userHasAnyGroup(user, [GROUPS.ADMIN])) return "/workspaces"

  if (
    userHasAnyGroup(user, [
      GROUPS.RECEPCAO,
      GROUPS.LABORATORIO,
      GROUPS.ENFERMAGEM,
      GROUPS.MEDICINA,
      GROUPS.MEDICINA_OCUPACIONAL,
    ])
  ) {
    return "/healthcare"
  }
  if (
    userHasAnyGroup(user, [
      GROUPS.STUDENT,
      GROUPS.ESTUDANTE,
      GROUPS.ENCARREGADO_EDUCACAO,
    ])
  ) {
    return "/education/student"
  }
  if (
    userHasAnyGroup(user, [GROUPS.DIRETOR_ESCOLA, GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO])
  ) {
    return "/education/directoria"
  }
  if (userHasAnyGroup(user, [GROUPS.PROFESSOR])) {
    return "/education/teacher"
  }
  if (userHasAnyGroup(user, [GROUPS.CONTABILIDADE])) return "/"

  const first = getAccessibleWorkspaces(user).find((w) => w.key !== "dashboard")
  return first?.href || "/"
}
