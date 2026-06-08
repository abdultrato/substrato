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
  FARMACIA_CLINICA: "Farmácia Clínica",
  CREDITO_FINANCIAMENTO: "Créditos e Financiamento",
  TELEMEDICINA: "Telemedicina",
  SAUDE_PUBLICA: "Saúde Pública",
  MANUTENCAO: "Manutenção",
  MEDICINA: "Médico",
  MEDICINA_OCUPACIONAL: "Medicina Ocupacional",
  ODONTOLOGIA: "Odontologia",
  VETERINARIA: "Medicina Veterinária",
  FISIOTERAPIA: "Fisioterapia",
  RADIOLOGIA: "Radiologia",
  CARDIOLOGIA: "Cardiologia",
  NEUROLOGIA: "Neurologia",
  OFTALMOLOGIA: "Oftalmologia",
  TERAPIA_OCUPACIONAL: "Terapia Ocupacional",
  FONOAUDIOLOGIA: "Fonoaudiologia",
  LOGISTICA: "Gestor de Logística",
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
  "Farmácia Clínica": ["farmacia clinica", "farmácia clínica", "clinical pharmacy", "terapia iv", "terapia intravenosa", "quimioterapia", "tpn", "antibiotic stewardship"],
  "Créditos e Financiamento": ["creditos", "créditos", "financiamento", "financiamentos", "credit financing", "consorcio", "consórcio", "reembolso", "glosa", "bolsa", "bolsas"],
  Telemedicina: ["telemedicina", "telemedicine", "monitoramento remoto", "monitorização remota", "remote monitoring", "iot clinico", "iot clínico", "wearables"],
  "Saúde Pública": ["saude publica", "saúde pública", "public health", "imunizacao", "imunização", "vacinacao", "vacinação", "vacinas", "aefi"],
  Odontologia: ["odontologia", "dentista", "dental", "dental clinic"],
  "Medicina Veterinária": ["veterinaria", "veterinária", "veterinary", "vet", "medico veterinario", "médico veterinário"],
  Fisioterapia: ["fisioterapia", "physiotherapy", "reabilitacao", "reabilitação", "rehab", "fisioterapeuta"],
  Radiologia: ["radiologia", "radiology", "imagiologia", "diagnostico por imagem", "diagnóstico por imagem", "pacs", "raio-x"],
  Cardiologia: ["cardiologia", "cardiology", "cardiologista", "ecocardiograma", "holter", "teste ergometrico", "teste ergométrico"],
  Neurologia: ["neurologia", "neurology", "neurologista", "eeg", "potencial evocado", "doppler transcraniano"],
  Oftalmologia: ["oftalmologia", "ophthalmology", "oftalmologista", "campo visual", "topografia corneal", "oct"],
  "Terapia Ocupacional": ["terapia ocupacional", "occupational therapy", "occupational_therapy", "terapeuta ocupacional"],
  Fonoaudiologia: ["fonoaudiologia", "speech therapy", "speech_therapy", "terapia da fala", "fonoaudiologo", "fonoaudiólogo"],
  "Gestor de Logística": ["logistica", "logística", "transporte", "transportes", "fleet", "frota", "motorista", "driver"],
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
  | "clinical-pharmacy"
  | "credit-financing"
  | "telemedicine"
  | "public-health"
  | "dental"
  | "veterinary"
  | "physiotherapy"
  | "radiology"
  | "cardiology"
  | "neurology"
  | "ophthalmology"
  | "occupational-therapy"
  | "physical-therapy"
  | "transportation"
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
      GROUPS.FARMACIA,
      GROUPS.FARMACIA_CLINICA,
      GROUPS.TELEMEDICINA,
      GROUPS.SAUDE_PUBLICA,
      GROUPS.RADIOLOGIA,
      GROUPS.CARDIOLOGIA,
      GROUPS.NEUROLOGIA,
      GROUPS.OFTALMOLOGIA,
      GROUPS.FISIOTERAPIA,
      GROUPS.TERAPIA_OCUPACIONAL,
      GROUPS.FONOAUDIOLOGIA,
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
    href: "/clinical-laboratory",
    description: "LIS: pedidos, colheita, resultados e laudos.",
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
    key: "clinical-pharmacy",
    label: "Farmácia Clínica",
    href: "/clinical-pharmacy",
    description: "Preparações IV, quimioterapia, TPN, controlados, interações e stewardship antibiótico.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.FARMACIA, GROUPS.FARMACIA_CLINICA],
  },
  {
    key: "credit-financing",
    label: "Créditos e Financiamento",
    href: "/credit-financing",
    description: "Consórcios, financiamento de procedimentos, reembolsos, glosas e bolsas estudantis.",
    anyOfGroups: [
      GROUPS.ADMIN,
      GROUPS.RECEPCAO,
      GROUPS.CONTABILIDADE,
      GROUPS.MEDICINA,
      GROUPS.MEDICINA_OCUPACIONAL,
      GROUPS.DIRETOR_ESCOLA,
      GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO,
      GROUPS.CREDITO_FINANCIAMENTO,
    ],
  },
  {
    key: "telemedicine",
    label: "Telemedicina",
    href: "/telemedicine",
    description: "Sala virtual, dispositivos remotos, leituras, alertas e programas crónicos.",
    anyOfGroups: [
      GROUPS.ADMIN,
      GROUPS.RECEPCAO,
      GROUPS.MEDICINA,
      GROUPS.MEDICINA_OCUPACIONAL,
      GROUPS.ENFERMAGEM,
      GROUPS.TELEMEDICINA,
    ],
  },
  {
    key: "public-health",
    label: "Saúde Pública",
    href: "/public-health",
    description: "Vacinas, campanhas, metas, AEFI e notificações oficiais.",
    anyOfGroups: [
      GROUPS.ADMIN,
      GROUPS.RECEPCAO,
      GROUPS.MEDICINA,
      GROUPS.MEDICINA_OCUPACIONAL,
      GROUPS.ENFERMAGEM,
      GROUPS.LABORATORIO,
      GROUPS.SAUDE_PUBLICA,
    ],
  },
  {
    key: "dental",
    label: "Odontologia",
    href: "/dental",
    description: "Agenda dentária, prontuário odontológico, planos de tratamento e prótese.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.ODONTOLOGIA],
  },
  {
    key: "veterinary",
    label: "Medicina Veterinária",
    href: "/veterinary",
    description: "Animais, vacinação, internamentos, exames e receitas veterinárias.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.VETERINARIA],
  },
  {
    key: "physiotherapy",
    label: "Fisioterapia e Reabilitação",
    href: "/physiotherapy",
    description: "Avaliação funcional, planos de tratamento, evolução e aparelhos.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.FISIOTERAPIA],
  },
  {
    key: "radiology",
    label: "Radiologia e Imagiologia",
    href: "/radiology",
    description: "Estudos de imagem, laudos, ficheiros DICOM e integração PACS.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.LABORATORIO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.RADIOLOGIA],
  },
  {
    key: "cardiology",
    label: "Cardiologia Diagnóstica",
    href: "/cardiology",
    description: "Ecocardiograma, teste ergométrico, Holter e laudos cardiológicos.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.CARDIOLOGIA],
  },
  {
    key: "neurology",
    label: "Neurologia Diagnóstica",
    href: "/neurology",
    description: "EEG, potencial evocado, doppler transcraniano e laudos neurológicos.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.NEUROLOGIA],
  },
  {
    key: "ophthalmology",
    label: "Oftalmologia Diagnóstica",
    href: "/ophthalmology",
    description: "Campo visual, topografia corneal, OCT e laudos oftalmológicos.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.OFTALMOLOGIA],
  },
  {
    key: "occupational-therapy",
    label: "Terapia Ocupacional",
    href: "/occupational-therapy",
    description: "Avaliações funcionais, AVD, adaptação laboral e planos individualizados.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.TERAPIA_OCUPACIONAL],
  },
  {
    key: "physical-therapy",
    label: "Fisioterapia Especializada",
    href: "/physical-therapy",
    description: "Planos especializados, evolução motora e prescrição terapêutica.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.FISIOTERAPIA, GROUPS.FONOAUDIOLOGIA],
  },
  {
    key: "transportation",
    label: "Transporte e Logística",
    href: "/transportation",
    description: "Frota, motoristas, rotas, rastreamento, combustível e manutenção preventiva.",
    anyOfGroups: [GROUPS.ADMIN, GROUPS.LOGISTICA, GROUPS.MANUTENCAO, GROUPS.CONTABILIDADE, GROUPS.RECURSOS_HUMANOS],
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
  if (userHasAnyGroup(user, [GROUPS.CREDITO_FINANCIAMENTO])) return "/credit-financing"

  if (
    userHasAnyGroup(user, [
      GROUPS.RECEPCAO,
      GROUPS.LABORATORIO,
      GROUPS.ENFERMAGEM,
      GROUPS.MEDICINA,
      GROUPS.MEDICINA_OCUPACIONAL,
      GROUPS.FARMACIA,
      GROUPS.FARMACIA_CLINICA,
      GROUPS.TELEMEDICINA,
      GROUPS.SAUDE_PUBLICA,
      GROUPS.RADIOLOGIA,
      GROUPS.CARDIOLOGIA,
      GROUPS.NEUROLOGIA,
      GROUPS.OFTALMOLOGIA,
      GROUPS.FISIOTERAPIA,
      GROUPS.TERAPIA_OCUPACIONAL,
      GROUPS.FONOAUDIOLOGIA,
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
