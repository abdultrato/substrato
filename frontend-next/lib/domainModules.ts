import {
  canonicalModuleGroupKey,
  findModuleGroup,
  findModuleResource,
  type ModuleGroup,
  type ModuleResource,
} from "@/lib/modules"

export type DomainModuleStatus = "implemented" | "partial" | "planned"

export type DomainGroup = {
  key: string
  label: string
  description: string
}

export type DomainModuleResourceRef = {
  groupKey: string
  resourceKey?: string
}

export type DomainModuleDefinition = {
  key: string
  domain: string
  label: string
  description: string
  resources: DomainModuleResourceRef[]
  aliases?: string[]
  extends?: string[]
  status: DomainModuleStatus
}

export type ResolvedDomainModuleResource = {
  group: ModuleGroup
  resource?: ModuleResource
  href: string
}

export const DOMAIN_GROUPS: DomainGroup[] = [
  {
    key: "clinical",
    label: "Clínico",
    description: "Atendimento, prontuário, especialidades e produção clínica.",
  },
  {
    key: "diagnostics",
    label: "Diagnóstico",
    description: "Laboratório, imagem, banco de sangue e diagnósticos especializados.",
  },
  {
    key: "hospitalization",
    label: "Hospitalização",
    description: "Emergência, internamento, cuidados intensivos e bloco operatório.",
  },
  {
    key: "care",
    label: "Cuidados",
    description: "Enfermagem, reabilitação, terapias e serviços assistenciais.",
  },
  {
    key: "operations",
    label: "Operações",
    description: "Inventário, compras, farmácia, equipamentos e logística operacional.",
  },
  {
    key: "administration",
    label: "Administração",
    description: "Finanças, faturação, seguros, RH e payroll.",
  },
  {
    key: "platform",
    label: "Plataforma",
    description: "Identidade, tenants, auditoria, notificações e integrações.",
  },
  {
    key: "analytics",
    label: "Análise",
    description: "Indicadores, monitorização e relatórios operacionais.",
  },
  {
    key: "public_health",
    label: "Saúde Pública",
    description: "Campanhas, imunização, metas e notificações oficiais.",
  },
]

export const DOMAIN_MODULES: DomainModuleDefinition[] = [
  {
    key: "platform.tenants",
    domain: "platform",
    label: "Tenants",
    description: "Clientes, unidades, assinaturas e configuração operacional.",
    resources: [{ groupKey: "tenants", resourceKey: "inquilino" }],
    aliases: ["tenants", "tenant"],
    status: "implemented",
  },
  {
    key: "platform.identity",
    domain: "platform",
    label: "Identidade",
    description: "Autenticação, utilizadores e perfis profissionais.",
    resources: [{ groupKey: "identity", resourceKey: "usuario" }],
    aliases: ["identity", "identidade"],
    status: "implemented",
  },
  {
    key: "platform.users",
    domain: "platform",
    label: "Utilizadores",
    description: "Gestão de utilizadores exposta pela app de identidade.",
    resources: [{ groupKey: "identity", resourceKey: "usuario" }],
    aliases: ["users", "user"],
    extends: ["platform.identity"],
    status: "implemented",
  },
  {
    key: "platform.permissions",
    domain: "platform",
    label: "Permissões",
    description: "Políticas RBAC e grupos de acesso reutilizados pela plataforma.",
    resources: [{ groupKey: "identity", resourceKey: "perfilprofissional" }],
    aliases: ["permissions", "rbac"],
    extends: ["platform.identity"],
    status: "partial",
  },
  {
    key: "platform.auditing",
    domain: "platform",
    label: "Auditoria",
    description: "Trilho de atividades e auditoria de utilizadores.",
    resources: [{ groupKey: "audit", resourceKey: "atividade" }],
    aliases: ["auditing", "audit"],
    status: "implemented",
  },
  {
    key: "platform.notifications",
    domain: "platform",
    label: "Notificações",
    description: "Notificações, modelos e logs de entrega.",
    resources: [{ groupKey: "notifications", resourceKey: "notification" }],
    aliases: ["notifications"],
    status: "implemented",
  },
  {
    key: "platform.integrations",
    domain: "platform",
    label: "Integrações",
    description: "Integrações externas e adaptação de equipamentos.",
    resources: [{ groupKey: "equipment_integrations", resourceKey: "equipment" }],
    aliases: ["integrations"],
    status: "implemented",
  },
  {
    key: "platform.documents",
    domain: "platform",
    label: "Documentos",
    description: "Gestão documental reutilizável planejada.",
    resources: [],
    aliases: ["documents"],
    status: "planned",
  },
  {
    key: "clinical.patients",
    domain: "clinical",
    label: "Pacientes",
    description: "Demografia, contacto e identificadores clínicos.",
    resources: [{ groupKey: "clinical", resourceKey: "paciente" }],
    aliases: ["patients", "pacientes"],
    status: "implemented",
  },
  {
    key: "clinical.appointments",
    domain: "clinical",
    label: "Marcações",
    description: "Consultas médicas, agenda e especialidades.",
    resources: [{ groupKey: "consultations", resourceKey: "consulta" }],
    aliases: ["appointments", "consultations"],
    status: "implemented",
  },
  {
    key: "clinical.encounters",
    domain: "clinical",
    label: "Encontros clínicos",
    description: "Atendimentos representados por consultas e registos clínicos.",
    resources: [{ groupKey: "consultations", resourceKey: "consulta" }],
    aliases: ["encounters"],
    extends: ["clinical.appointments"],
    status: "partial",
  },
  {
    key: "clinical.electronic_health_records",
    domain: "clinical",
    label: "Prontuário eletrônico",
    description: "Cardex, registos clínicos e itens de prescrição.",
    resources: [{ groupKey: "medical_records", resourceKey: "registro" }],
    aliases: ["electronic_health_records", "ehr", "medical_records"],
    status: "implemented",
  },
  {
    key: "clinical.dentistry",
    domain: "clinical",
    label: "Odontologia",
    description: "Procedimentos, consultas e planos dentários.",
    resources: [{ groupKey: "dental" }],
    aliases: ["dentistry", "dental"],
    status: "implemented",
  },
  {
    key: "clinical.surgery",
    domain: "clinical",
    label: "Cirurgia",
    description: "Pedido cirúrgico, avaliação pré-operatória, bloco operatório, recuperação, documentos e faturação.",
    resources: [{ groupKey: "surgery" }],
    aliases: ["surgery"],
    status: "implemented",
  },
  {
    key: "clinical.pediatrics",
    domain: "clinical",
    label: "Pediatria",
    description: "Fluxos pediátricos via especialidades, consultas e prontuário.",
    resources: [{ groupKey: "consultations", resourceKey: "especialidade" }],
    aliases: ["pediatrics"],
    extends: ["clinical.appointments", "clinical.electronic_health_records"],
    status: "partial",
  },
  {
    key: "clinical.gynecology",
    domain: "clinical",
    label: "Ginecologia",
    description: "Fluxos ginecológicos representados pela maternidade e consultas.",
    resources: [{ groupKey: "maternity", resourceKey: "gestacao" }],
    aliases: ["gynecology"],
    status: "partial",
  },
  {
    key: "clinical.obstetrics",
    domain: "clinical",
    label: "Obstetrícia",
    description: "Gestação, obstetrícia e fluxos de maternidade.",
    resources: [{ groupKey: "maternity", resourceKey: "gestacao" }],
    aliases: ["obstetrics", "maternity"],
    status: "implemented",
  },
  {
    key: "clinical.cardiology",
    domain: "clinical",
    label: "Cardiologia",
    description: "Consultas, prontuário e diagnósticos especializados de cardiologia.",
    resources: [{ groupKey: "specialty_diagnostics", resourceKey: "order" }],
    aliases: ["cardiology", "cardiologia"],
    extends: ["clinical.appointments", "clinical.electronic_health_records", "diagnostics.specialty_diagnostics"],
    status: "partial",
  },
  {
    key: "clinical.orthopedics",
    domain: "clinical",
    label: "Ortopedia",
    description: "Fluxos ortopédicos via especialidades, consultas e prontuário.",
    resources: [{ groupKey: "consultations", resourceKey: "especialidade" }],
    aliases: ["orthopedics"],
    extends: ["clinical.appointments", "clinical.electronic_health_records"],
    status: "partial",
  },
  {
    key: "clinical.ophthalmology",
    domain: "clinical",
    label: "Oftalmologia",
    description: "Consultas, prontuário e diagnósticos especializados de oftalmologia.",
    resources: [{ groupKey: "specialty_diagnostics", resourceKey: "order" }],
    aliases: ["ophthalmology", "oftalmologia"],
    extends: ["clinical.appointments", "clinical.electronic_health_records", "diagnostics.specialty_diagnostics"],
    status: "partial",
  },
  {
    key: "clinical.dermatology",
    domain: "clinical",
    label: "Dermatologia",
    description: "Consultas, prontuário e revisões assíncronas de telemedicina.",
    resources: [{ groupKey: "telemedicine", resourceKey: "async_case" }],
    aliases: ["dermatology"],
    extends: ["clinical.appointments", "clinical.electronic_health_records", "clinical.telemedicine"],
    status: "partial",
  },
  {
    key: "clinical.neurology",
    domain: "clinical",
    label: "Neurologia",
    description: "Consultas, prontuário e diagnósticos especializados de neurologia.",
    resources: [{ groupKey: "specialty_diagnostics", resourceKey: "order" }],
    aliases: ["neurology", "neurologia"],
    extends: ["clinical.appointments", "clinical.electronic_health_records", "diagnostics.specialty_diagnostics"],
    status: "partial",
  },
  {
    key: "clinical.oncology",
    domain: "clinical",
    label: "Oncologia",
    description: "Fluxos oncológicos via especialidades, consultas e prontuário.",
    resources: [{ groupKey: "consultations", resourceKey: "especialidade" }],
    aliases: ["oncology"],
    extends: ["clinical.appointments", "clinical.electronic_health_records"],
    status: "partial",
  },
  {
    key: "clinical.pathology",
    domain: "clinical",
    label: "Patologia",
    description: "Patologia clínica e anatomia patológica.",
    resources: [{ groupKey: "pathology" }],
    aliases: ["pathology"],
    status: "implemented",
  },
  {
    key: "diagnostics.laboratory",
    domain: "diagnostics",
    label: "Laboratório",
    description: "Exames laboratoriais, requisições, amostras e resultados.",
    resources: [{ groupKey: "clinical", resourceKey: "requisicaoanalise" }],
    aliases: ["laboratory", "lab"],
    status: "implemented",
  },
  {
    key: "diagnostics.radiology",
    domain: "diagnostics",
    label: "Radiologia",
    description: "Imagem, estudos, séries, ficheiros e laudos.",
    resources: [{ groupKey: "radiology" }],
    aliases: ["radiology"],
    status: "implemented",
  },
  {
    key: "diagnostics.blood_bank",
    domain: "diagnostics",
    label: "Banco de sangue",
    description: "Doações, unidades, stock, armazenamento e transfusões.",
    resources: [{ groupKey: "bloodbank" }],
    aliases: ["blood_bank", "bloodbank"],
    status: "implemented",
  },
  {
    key: "diagnostics.specialty_diagnostics",
    domain: "diagnostics",
    label: "Diagnósticos especializados",
    description: "Equipamentos, protocolos, exames, medições e laudos especializados.",
    resources: [{ groupKey: "specialty_diagnostics" }],
    aliases: ["specialty_diagnostics"],
    status: "implemented",
  },
  {
    key: "diagnostics.clinical_pharmacy",
    domain: "diagnostics",
    label: "Farmácia clínica",
    description: "Preparações IV, interações, substâncias controladas e stewardship.",
    resources: [{ groupKey: "clinical_pharmacy" }],
    aliases: ["clinical_pharmacy"],
    status: "implemented",
  },
  {
    key: "hospitalization.emergency",
    domain: "hospitalization",
    label: "Emergência",
    description: "Entrada, check-in e triagem operacional.",
    resources: [{ groupKey: "reception", resourceKey: "checkin" }],
    aliases: ["emergency"],
    extends: ["clinical.encounters", "care.nursing"],
    status: "partial",
  },
  {
    key: "hospitalization.inpatient_care",
    domain: "hospitalization",
    label: "Internamento",
    description: "Enfermarias, camas e internamentos.",
    resources: [{ groupKey: "nursing", resourceKey: "ward_admission" }],
    aliases: ["inpatient_care"],
    extends: ["care.nursing"],
    status: "partial",
  },
  {
    key: "hospitalization.intensive_care",
    domain: "hospitalization",
    label: "Cuidados intensivos",
    description: "Cuidados intensivos reutilizando internamento e enfermagem.",
    resources: [{ groupKey: "nursing", resourceKey: "ward_admission" }],
    aliases: ["intensive_care"],
    extends: ["care.nursing", "hospitalization.inpatient_care"],
    status: "partial",
  },
  {
    key: "hospitalization.operating_room",
    domain: "hospitalization",
    label: "Bloco operatório",
    description: "Salas, agenda, equipa, materiais, checklist, anestesia e recuperação perioperatória.",
    resources: [{ groupKey: "surgery", resourceKey: "centro_cirurgico" }],
    aliases: ["operating_room"],
    extends: ["clinical.surgery"],
    status: "partial",
  },
  {
    key: "care.nursing",
    domain: "care",
    label: "Enfermagem",
    description: "Procedimentos, prescrições, sinais vitais e enfermarias.",
    resources: [{ groupKey: "nursing" }],
    aliases: ["nursing"],
    status: "implemented",
  },
  {
    key: "care.physiotherapy",
    domain: "care",
    label: "Fisioterapia",
    description: "Avaliações funcionais, planos, sessões e evolução de reabilitação.",
    resources: [{ groupKey: "physiotherapy" }],
    aliases: ["physiotherapy"],
    status: "implemented",
  },
  {
    key: "care.therapy",
    domain: "care",
    label: "Terapias",
    description: "Terapias ocupacionais, fonoaudiologia e planos terapêuticos.",
    resources: [{ groupKey: "therapy" }],
    aliases: ["therapy"],
    status: "implemented",
  },
  {
    key: "care.nutrition",
    domain: "care",
    label: "Nutrição",
    description: "Fluxos de nutrição planejados.",
    resources: [],
    aliases: ["nutrition"],
    status: "planned",
  },
  {
    key: "care.psychology",
    domain: "care",
    label: "Psicologia",
    description: "Fluxos de psicologia planejados.",
    resources: [],
    aliases: ["psychology"],
    status: "planned",
  },
  {
    key: "care.social_services",
    domain: "care",
    label: "Serviços sociais",
    description: "Fluxos de assistência social planejados.",
    resources: [],
    aliases: ["social_services"],
    status: "planned",
  },
  {
    key: "operations.inventory",
    domain: "operations",
    label: "Inventário",
    description: "Armazéns, localizações, lotes, saldos e movimentos.",
    resources: [{ groupKey: "warehouse", resourceKey: "stock_level" }],
    aliases: ["inventory", "warehouse"],
    status: "implemented",
  },
  {
    key: "operations.procurement",
    domain: "operations",
    label: "Compras",
    description: "Pedidos de compra, recebimentos e reposição.",
    resources: [{ groupKey: "warehouse", resourceKey: "purchase_order" }],
    aliases: ["procurement", "purchasing"],
    extends: ["operations.inventory"],
    status: "partial",
  },
  {
    key: "operations.pharmacy",
    domain: "operations",
    label: "Farmácia",
    description: "Produtos, lotes, movimentos, vendas e requisições de material.",
    resources: [{ groupKey: "pharmacy" }],
    aliases: ["pharmacy"],
    status: "implemented",
  },
  {
    key: "operations.equipment",
    domain: "operations",
    label: "Equipamentos",
    description: "Cadastro, estado operacional, inspeções e manutenção.",
    resources: [{ groupKey: "equipment", resourceKey: "equipment" }],
    aliases: ["equipment"],
    status: "implemented",
  },
  {
    key: "operations.maintenance",
    domain: "operations",
    label: "Manutenção",
    description: "Manutenções, calibrações e estado dos equipamentos.",
    resources: [{ groupKey: "equipment", resourceKey: "maintenance" }],
    aliases: ["maintenance"],
    status: "implemented",
  },
  {
    key: "operations.inspections",
    domain: "operations",
    label: "Inspeções",
    description: "Inspeções diárias e segurança operacional.",
    resources: [{ groupKey: "equipment", resourceKey: "daily_inspection" }],
    aliases: ["inspections"],
    status: "implemented",
  },
  {
    key: "operations.incidents",
    domain: "operations",
    label: "Incidentes",
    description: "Registo e seguimento de ocorrências.",
    resources: [{ groupKey: "equipment", resourceKey: "incident" }],
    aliases: ["incidents"],
    status: "implemented",
  },
  {
    key: "operations.transportation",
    domain: "operations",
    label: "Transporte",
    description: "Frota, rotas, viagens, manutenção e rastreamento.",
    resources: [{ groupKey: "transportation" }],
    aliases: ["transportation"],
    status: "implemented",
  },
  {
    key: "administration.finance",
    domain: "administration",
    label: "Finanças",
    description: "Contabilidade, contas, lançamentos e conciliações.",
    resources: [{ groupKey: "accounting" }],
    aliases: ["finance", "accounting"],
    status: "implemented",
  },
  {
    key: "administration.billing",
    domain: "administration",
    label: "Faturação",
    description: "Faturas, itens e histórico de faturação médica.",
    resources: [{ groupKey: "billing" }],
    aliases: ["billing"],
    status: "implemented",
  },
  {
    key: "administration.payments",
    domain: "administration",
    label: "Pagamentos",
    description: "Pagamentos, recibos, transações e reconciliações.",
    resources: [{ groupKey: "payments" }],
    aliases: ["payments"],
    status: "implemented",
  },
  {
    key: "administration.insurance",
    domain: "administration",
    label: "Seguros",
    description: "Seguradoras, planos, cobertura e autorizações.",
    resources: [{ groupKey: "insurer" }],
    aliases: ["insurance", "insurer"],
    status: "implemented",
  },
  {
    key: "administration.credit_financing",
    domain: "administration",
    label: "Crédito e financiamento",
    description: "Consórcios, financiamento, parcelas, reembolsos e bolsas.",
    resources: [{ groupKey: "credit_financing" }],
    aliases: ["credit_financing"],
    status: "implemented",
  },
  {
    key: "administration.human_resources",
    domain: "administration",
    label: "Recursos humanos",
    description: "Funcionários, cargos, horários, faltas, férias e processos.",
    resources: [{ groupKey: "human_resources", resourceKey: "funcionario" }],
    aliases: ["human_resources", "hr"],
    status: "implemented",
  },
  {
    key: "administration.payroll",
    domain: "administration",
    label: "Payroll",
    description: "Folhas de pagamento expostas por recursos humanos.",
    resources: [{ groupKey: "human_resources", resourceKey: "folhapagamento" }],
    aliases: ["payroll"],
    extends: ["administration.human_resources"],
    status: "implemented",
  },
  {
    key: "analytics.analytics",
    domain: "analytics",
    label: "Indicadores",
    description: "Monitorização, telemetria e indicadores operacionais.",
    resources: [{ groupKey: "monitoring" }],
    aliases: ["analytics", "monitoring"],
    status: "implemented",
  },
  {
    key: "analytics.reporting",
    domain: "analytics",
    label: "Relatórios",
    description: "Relatórios e exportações reutilizáveis.",
    resources: [{ groupKey: "monitoring", resourceKey: "export_job" }],
    aliases: ["reporting", "reports"],
    status: "partial",
  },
  {
    key: "public_health.public_health",
    domain: "public_health",
    label: "Saúde pública",
    description: "Vacinação, campanhas, metas, eventos adversos e notificações.",
    resources: [{ groupKey: "public_health" }],
    aliases: ["public_health"],
    status: "implemented",
  },
]

export const DOMAIN_MODULE_KEYS_BY_DOMAIN: Record<string, string[]> = DOMAIN_GROUPS.reduce(
  (acc, group) => {
    acc[group.key] = DOMAIN_MODULES.filter((definition) => definition.domain === group.key).map(
      (definition) => definition.key
    )
    return acc
  },
  {} as Record<string, string[]>
)

const DOMAIN_GROUP_KEYS = new Set(DOMAIN_GROUPS.map((group) => group.key))

function normalizeLookup(value: string): string {
  return (value || "").trim().toLocaleLowerCase().replace(/-/g, "_")
}

const DOMAIN_MODULES_BY_LOOKUP = DOMAIN_MODULES.reduce((acc, definition) => {
  const lookups = [definition.key, definition.key.split(".").pop() || definition.key, ...(definition.aliases || [])]
  for (const lookup of lookups) {
    const key = normalizeLookup(lookup)
    if (!acc.has(key)) acc.set(key, definition)
  }
  return acc
}, new Map<string, DomainModuleDefinition>())

export function isDomainGroupKey(groupKey: string): boolean {
  return DOMAIN_GROUP_KEYS.has(normalizeLookup(groupKey))
}

export function domainGroupFor(groupKey: string): DomainGroup | undefined {
  const normalized = normalizeLookup(groupKey)
  return DOMAIN_GROUPS.find((group) => group.key === normalized)
}

export function domainModuleDefinitionFor(lookup: string): DomainModuleDefinition | undefined {
  return DOMAIN_MODULES_BY_LOOKUP.get(normalizeLookup(lookup))
}

export function domainModuleDefinitionsForDomain(
  domain: string,
  options: { includePlanned?: boolean } = {}
): DomainModuleDefinition[] {
  const includePlanned = options.includePlanned ?? true
  const normalized = normalizeLookup(domain)
  return DOMAIN_MODULES.filter(
    (definition) =>
      definition.domain === normalized &&
      (includePlanned || definition.status !== "planned")
  )
}

export function resolveDomainModuleResources(
  definition: DomainModuleDefinition,
  modules: ModuleGroup[]
): ResolvedDomainModuleResource[] {
  return definition.resources
    .map((ref) => {
      const groupKey = canonicalModuleGroupKey(ref.groupKey)
      if (ref.resourceKey) {
        const found = findModuleResource(groupKey, ref.resourceKey, modules)
        if (!found) return null
        return {
          group: found.group,
          resource: found.resource,
          href: `/modules/${found.group.key}/${found.resource.key}`,
        }
      }

      const group = findModuleGroup(groupKey, modules)
      if (!group) return null
      return {
        group,
        href: `/modules/${group.key}`,
      }
    })
    .filter(Boolean) as ResolvedDomainModuleResource[]
}

export function primaryHrefForDomainModule(
  definition: DomainModuleDefinition,
  modules: ModuleGroup[]
): string | null {
  const resolved = resolveDomainModuleResources(definition, modules)
  return resolved[0]?.href || null
}
