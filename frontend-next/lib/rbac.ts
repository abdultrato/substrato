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
  | "erp-wms"
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
    label: "Painel",
    href: "/",
    description: "Visão do dia e métricas operacionais.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE],
  },
  {
    key: "healthcare",
    label: "Saúde",
    href: "/healthcare",
    description: "Área clínica unificada para equipas assistenciais.",
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
    label: "Recepção",
    href: "/reception",
    description: "Triagem, atendimento, requisições e fluxos financeiros.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.RECEPCAO],
  },
  {
    key: "laboratory",
    label: "Laboratório",
    href: "/laboratory",
    description: "Lançamento, validação e emissão de resultados.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.LABORATORIO],
  },
  {
    key: "blood-bank",
    label: "Banco de Sangue",
    href: "/bloodbank",
    description: "Doações, unidades, transfusões e movimentos de stock.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.LABORATORIO],
  },
  {
    key: "nursing",
    label: "Enfermagem",
    href: "/nursing",
    description: "Colheitas, procedimentos e apoio operacional.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.ENFERMAGEM],
  },
  {
    key: "education",
    label: "Educação",
    href: "/education",
    description: "Fluxos académicos para docentes e coordenação.",
    anyOfGroups: [
      GROUPS.ADMIN,
      GROUPS.PROFESSOR,
      GROUPS.DIRETOR_ESCOLA,
      GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO,
    ],
  },
  {
    key: "education-teacher",
    label: "Área do Professor",
    href: "/education/teacher",
    description: "Turmas lecionadas e acompanhamento de estudantes.",
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
    description: "Supervisão escolar de equipa, estudantes e progresso académico.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.DIRETOR_ESCOLA, GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO],
  },
  {
    key: "education-student",
    label: "Área do Estudante",
    href: "/education/student",
    description: "Aulas, notas e presenças do estudante.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.STUDENT, GROUPS.ENCARREGADO_EDUCACAO],
  },
  {
    key: "medicine",
    label: "Medicina",
    href: "/medicine",
    description: "Seguimento clínico e pedidos de exames/procedimentos.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.MEDICINA],
  },
  {
    key: "pharmacy",
    label: "Farmácia",
    href: "/pharmacy",
    description: "Stock, lotes e movimentos de farmácia.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.FARMACIA],
  },
  {
    key: "erp-wms",
    label: "ERP e WMS",
    href: "/warehouse",
    description: "Planeamento empresarial, armazéns, compras, reservas, separação, expedição e contagens cíclicas.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE, GROUPS.FARMACIA, GROUPS.RECURSOS_HUMANOS],
  },
  {
    key: "occupational-medicine",
    label: "Medicina Ocupacional",
    href: "/occupational-medicine",
    description: "Registos ocupacionais e fluxos de requisição.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.MEDICINA_OCUPACIONAL],
  },
  {
    key: "accounting",
    label: "Contabilidade",
    href: "/accounting",
    description: "Contas, lançamentos e auditoria.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE],
  },
  {
    key: "resources-human-resources",
    label: "Recursos Humanos",
    href: "/resources/human-resources",
    description: "Gestão de colaboradores, cargos e horários.",
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
