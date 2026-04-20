export type ModuleResource = {
  key: string
  label: string
  endpoint: string
  adminListHref?: string
}

export type ModuleGroup = {
  key: string
  label: string
  resources: ModuleResource[]
}

// Single source of truth for the Django apps currently exposed under /api/v1.
const MODULES_BASE: ModuleGroup[] = [
  {
    key: "clinico",
    label: "Clínico",
    resources: [
      { key: "paciente", label: "Pacientes", endpoint: "/clinical/patient/", adminListHref: "/admin/clinico/patient/" },
      { key: "exame", label: "Exames", endpoint: "/clinical/exam/", adminListHref: "/admin/clinico/labexam/" },
      { key: "examemedico", label: "Exames Médicos", endpoint: "/clinical/medicalexam/", adminListHref: "/admin/clinico/medicalexam/" },
      { key: "examecampo", label: "Campos de Exame", endpoint: "/clinical/examfield/", adminListHref: "/admin/clinico/labexamfield/" },
      { key: "examemedicocampo", label: "Campos de Exame Médico", endpoint: "/clinical/medicalexamfield/" },
      { key: "requisicaoanalise", label: "Requisições", endpoint: "/clinical/labrequest/", adminListHref: "/admin/clinico/labrequest/" },
      { key: "requisicaoitem", label: "Itens de Requisição", endpoint: "/clinical/labrequestitem/" },
      { key: "resultadoitem", label: "Resultados", endpoint: "/clinical/resultitem/" },
    ],
  },
  {
    key: "recepcao",
    label: "Recepção",
    resources: [
      { key: "workspace", label: "Workspace", endpoint: "/recepcao/workspace/", adminListHref: "/admin/recepcao/" },
      { key: "checkin", label: "Check-ins", endpoint: "/recepcao/checkin/", adminListHref: "/admin/recepcao/checkinrecepcao/" },
      { key: "atendimento", label: "Atendimentos", endpoint: "/recepcao/atendimento/", adminListHref: "/admin/recepcao/" },
    ],
  },
  {
    key: "equipamentos",
    label: "Equipamentos",
    resources: [
      { key: "equipamento", label: "Equipamentos", endpoint: "/equipamentos/equipamento/", adminListHref: "/admin/equipamentos/equipamento/" },
      { key: "inspecaodiaria", label: "Inspeções Diárias", endpoint: "/equipamentos/inspecaodiaria/", adminListHref: "/admin/inspecoes/inspecaodiaria/" },
      { key: "manutencao", label: "Manutenções", endpoint: "/equipamentos/manutencao/", adminListHref: "/admin/manutencoes/manutencao/" },
      { key: "ocorrencia", label: "Ocorrências", endpoint: "/equipamentos/ocorrencia/", adminListHref: "/admin/ocorrencias/ocorrencia/" },
    ],
  },
  {
    key: "entidades",
    label: "Entidades",
    resources: [
      { key: "empresa", label: "Empresas", endpoint: "/entities/company/", adminListHref: "/admin/entidades/empresa/" },
    ],
  },
  {
    key: "faturamento",
    label: "Faturamento",
    resources: [
      { key: "fatura", label: "Faturas", endpoint: "/billing/invoice/", adminListHref: "/admin/faturamento/invoice/" },
      { key: "faturaitem", label: "Itens da Fatura", endpoint: "/billing/invoiceitem/" },
      { key: "historicofatura", label: "Histórico", endpoint: "/billing/invoicehistory/" },
    ],
  },
  {
    key: "pagamentos",
    label: "Pagamentos",
    resources: [
      { key: "pagamento", label: "Pagamentos", endpoint: "/payments/payment/" },
      { key: "recibo", label: "Recibos", endpoint: "/payments/receipt/" },
      { key: "transacao", label: "Transações", endpoint: "/payments/transaction/" },
      { key: "reconciliacao", label: "Reconciliações", endpoint: "/payments/reconciliation/" },
    ],
  },
  {
    key: "farmacia",
    label: "Farmácia",
    resources: [
      { key: "produto", label: "Produtos", endpoint: "/farmacia/produto/", adminListHref: "/admin/farmacia/produto/" },
      { key: "lote", label: "Lotes", endpoint: "/farmacia/lote/", adminListHref: "/admin/farmacia/lote/" },
      { key: "movimentoestoque", label: "Movimentos de Estoque", endpoint: "/farmacia/movimentoestoque/", adminListHref: "/admin/farmacia/movimentoestoque/" },
      { key: "venda", label: "Vendas", endpoint: "/farmacia/venda/", adminListHref: "/admin/farmacia/venda/" },
      { key: "itemvenda", label: "Itens de Venda", endpoint: "/farmacia/itemvenda/", adminListHref: "/admin/farmacia/itemvenda/" },
    ],
  },
  {
    key: "banco_sangue",
    label: "Banco de Sangue",
    resources: [
      { key: "doacao", label: "Doações", endpoint: "/bloodbank/doacao/", adminListHref: "/admin/bloodbank/blooddonation/" },
      { key: "unidade", label: "Unidades", endpoint: "/bloodbank/unidade/", adminListHref: "/admin/bloodbank/bloodunit/" },
      { key: "transfusao", label: "Transfusões", endpoint: "/bloodbank/transfusao/", adminListHref: "/admin/bloodbank/bloodtransfusion/" },
      { key: "armazenamento", label: "Armazenamentos", endpoint: "/bloodbank/armazenamento/", adminListHref: "/admin/bloodbank/bloodstorage/" },
      { key: "movimentoestoque", label: "Movimentos", endpoint: "/bloodbank/movimentoestoque/", adminListHref: "/admin/bloodbank/bloodstockmovement/" },
      { key: "manutencaoarmazenamento", label: "Manutenções", endpoint: "/bloodbank/manutencaoarmazenamento/", adminListHref: "/admin/bloodbank/bloodstoragemaintenance/" },
    ],
  },
  {
    key: "enfermagem",
    label: "Enfermagem",
    resources: [
      { key: "evolucaoenfermagem", label: "Evoluções", endpoint: "/enfermagem/evolucaoenfermagem/", adminListHref: "/admin/enfermagem/evolucaoenfermagem/" },
      { key: "procedimento", label: "Procedimentos", endpoint: "/enfermagem/procedimento/", adminListHref: "/admin/enfermagem/procedimento/" },
      { key: "procedimentocatalogo", label: "Catálogo", endpoint: "/enfermagem/procedimentocatalogo/", adminListHref: "/admin/enfermagem/procedimentocatalogo/" },
      { key: "procedimentocatalogomaterial", label: "Materiais do Catálogo", endpoint: "/enfermagem/procedimentocatalogomaterial/", adminListHref: "/admin/enfermagem/procedimentocatalogomaterial/" },
      { key: "procedimentoitem", label: "Itens do Procedimento", endpoint: "/enfermagem/procedimentoitem/", adminListHref: "/admin/enfermagem/procedimentoitem/" },
      { key: "procedimentoitemvalor", label: "Valores do Item", endpoint: "/enfermagem/procedimentoitemvalor/", adminListHref: "/admin/enfermagem/procedimentoitemvalor/" },
      { key: "procedimentomaterial", label: "Materiais do Procedimento", endpoint: "/enfermagem/procedimentomaterial/", adminListHref: "/admin/enfermagem/procedimentomaterial/" },
      { key: "procedimentomaterialvalor", label: "Valores do Material", endpoint: "/enfermagem/procedimentomaterialvalor/", adminListHref: "/admin/enfermagem/procedimentomaterialvalor/" },
      { key: "prescricaoenfermagem", label: "Prescrições", endpoint: "/enfermagem/prescricaoenfermagem/", adminListHref: "/admin/enfermagem/prescricaoenfermagem/" },
      { key: "registroenfermagem", label: "Registros", endpoint: "/enfermagem/registroenfermagem/", adminListHref: "/admin/enfermagem/registroenfermagem/" },
      { key: "sinalvitalenfermagem", label: "Sinais Vitais", endpoint: "/enfermagem/sinalvitalenfermagem/", adminListHref: "/admin/enfermagem/sinalvitalenfermagem/" },
      { key: "enfermaria", label: "Enfermarias", endpoint: "/enfermagem/enfermaria/" },
      { key: "camaenfermaria", label: "Camas (Enfermaria)", endpoint: "/enfermagem/camaenfermaria/" },
      { key: "internamentoenfermaria", label: "Internamentos (Enfermaria)", endpoint: "/enfermagem/internamentoenfermaria/" },
    ],
  },
  {
    key: "seguradora",
    label: "Seguradora",
    resources: [
      { key: "seguradora", label: "Seguradoras", endpoint: "/seguradora/seguradora/", adminListHref: "/admin/seguradora/seguradora/" },
      { key: "planocobertura", label: "Planos", endpoint: "/seguradora/planocobertura/", adminListHref: "/admin/seguradora/planocobertura/" },
      { key: "autorizacaoprocedimento", label: "Autorizações", endpoint: "/seguradora/autorizacaoprocedimento/", adminListHref: "/admin/seguradora/autorizacaoprocedimento/" },
    ],
  },
  {
    key: "contabilidade",
    label: "Contabilidade",
    resources: [
      { key: "conta", label: "Contas", endpoint: "/accounting/account/", adminListHref: "/admin/contabilidade/account/" },
      { key: "lancamento", label: "Lançamentos", endpoint: "/accounting/entry/", adminListHref: "/admin/contabilidade/legacyentry/" },
      { key: "movimento", label: "Movimentos", endpoint: "/accounting/movement/", adminListHref: "/admin/contabilidade/legacymovement/" },
      { key: "conciliacaofinanceira", label: "Conciliações", endpoint: "/accounting/financialreconciliation/", adminListHref: "/admin/contabilidade/financialreconciliation/" },
    ],
  },
  {
    key: "consultas",
    label: "Consultas",
    resources: [
      { key: "consulta", label: "Consultas", endpoint: "/consultations/consultation/", adminListHref: "/admin/consultas/medicalconsultation/" },
      { key: "medicos", label: "Médicos", endpoint: "/consultations/doctors/" },
      { key: "especialidade", label: "Especialidades", endpoint: "/consultations/specialty/", adminListHref: "/admin/consultas/consultationspecialty/" },
      { key: "feriado", label: "Feriados", endpoint: "/consultations/holiday/", adminListHref: "/admin/consultas/holiday/" },
    ],
  },
  {
    key: "inquilinos",
    label: "Inquilinos",
    resources: [
      { key: "inquilino", label: "Inquilinos", endpoint: "/inquilinos/inquilino/", adminListHref: "/admin/inquilinos/inquilino/" },
      { key: "planoassinatura", label: "Planos", endpoint: "/inquilinos/planoassinatura/", adminListHref: "/admin/inquilinos/planoassinatura/" },
      { key: "configuracaoinquilino", label: "Configurações", endpoint: "/inquilinos/configuracaoinquilino/", adminListHref: "/admin/inquilinos/configuracaoinquilino/" },
      { key: "usotenant", label: "Uso do Tenant", endpoint: "/inquilinos/usotenant/", adminListHref: "/admin/inquilinos/usotenant/" },
      { key: "featureflagtenant", label: "Feature Flags", endpoint: "/inquilinos/featureflagtenant/", adminListHref: "/admin/inquilinos/featureflagtenant/" },
    ],
  },
  {
    key: "notificacoes",
    label: "Notificações",
    resources: [
      { key: "notificacao", label: "Notificações", endpoint: "/notificacoes/notificacao/", adminListHref: "/admin/notificacoes/notificacao/" },
      { key: "logenvio", label: "Logs de Envio", endpoint: "/notificacoes/logenvio/", adminListHref: "/admin/notificacoes/logenvio/" },
    ],
  },
  {
    key: "identidade",
    label: "Identidade",
    resources: [
      { key: "usuario", label: "Usuários", endpoint: "/identidade/usuario/", adminListHref: "/admin/identidade/usuario/" },
      { key: "perfilprofissional", label: "Perfis Profissionais", endpoint: "/identidade/perfilprofissional/", adminListHref: "/admin/identidade/perfilprofissional/" },
      { key: "passwordresettoken", label: "Tokens de Reset", endpoint: "/identidade/passwordresettoken/", adminListHref: "/admin/identidade/passwordresettoken/" },
    ],
  },
  {
    key: "prontuario",
    label: "Prontuário",
    resources: [
      { key: "registro", label: "Cardex", endpoint: "/prontuario/registro/", adminListHref: "/admin/prontuario/registroprontuario/" },
      { key: "prescricaoitem", label: "Itens de Prescrição", endpoint: "/prontuario/prescricaoitem/", adminListHref: "/admin/prontuario/prescricaoitem/" },
    ],
  },
  {
    key: "maternidade",
    label: "Maternidade",
    resources: [
      { key: "gestacao", label: "Gestações", endpoint: "/maternity/gestacao/", adminListHref: "/admin/maternity/gestacao/" },
    ],
  },
  {
    key: "cirurgia",
    label: "Cirurgia",
    resources: [
      { key: "cirurgia", label: "Cirurgias", endpoint: "/cirurgia/cirurgia/", adminListHref: "/admin/cirurgia/cirurgia/" },
      { key: "procedimentocirurgico", label: "Procedimentos Cirúrgicos", endpoint: "/cirurgia/procedimentocirurgico/", adminListHref: "/admin/cirurgia/procedimentocirurgico/" },
    ],
  },
  {
    key: "recursos_humanos",
    label: "Recursos Humanos",
    resources: [
      { key: "cargo", label: "Cargos", endpoint: "/recursos_humanos/cargo/", adminListHref: "/admin/recursos_humanos/cargo/" },
      { key: "funcionario", label: "Funcionários", endpoint: "/recursos_humanos/funcionario/", adminListHref: "/admin/recursos_humanos/funcionario/" },
      { key: "agregadofamiliar", label: "Agregados Familiares", endpoint: "/recursos_humanos/agregadofamiliar/", adminListHref: "/admin/recursos_humanos/agregadofamiliar/" },
      { key: "horario", label: "Horários", endpoint: "/recursos_humanos/horario/", adminListHref: "/admin/recursos_humanos/horariotrabalho/" },
      { key: "falta", label: "Faltas", endpoint: "/recursos_humanos/falta/", adminListHref: "/admin/recursos_humanos/falta/" },
      { key: "ferias", label: "Férias", endpoint: "/recursos_humanos/ferias/", adminListHref: "/admin/recursos_humanos/ferias/" },
      { key: "dispensa", label: "Dispensas", endpoint: "/recursos_humanos/dispensa/", adminListHref: "/admin/recursos_humanos/dispensa/" },
      { key: "horaextra", label: "Horas Extras", endpoint: "/recursos_humanos/horaextra/", adminListHref: "/admin/recursos_humanos/horaextra/" },
      { key: "folhapagamento", label: "Folhas de Pagamento", endpoint: "/recursos_humanos/folhapagamento/", adminListHref: "/admin/recursos_humanos/folhapagamento/" },
    ],
  },
  {
    key: "monitoramento",
    label: "Monitoramento",
    resources: [
      { key: "erro", label: "Erros do Sistema", endpoint: "/monitoramento/erro/", adminListHref: "/admin/monitoramento/errosistema/" },
    ],
  },
]

const ADMIN_LIST_BY_ENDPOINT: Record<string, string> = {
  // Clinical
  "/clinical/patient/": "/admin/clinical/patient/",
  "/clinical/exam/": "/admin/clinical/labexam/",
  "/clinical/medicalexam/": "/admin/clinical/medicalexam/",
  "/clinical/examfield/": "/admin/clinical/labexamfield/",
  "/clinical/labrequest/": "/admin/clinical/labrequest/",
  "/clinical/resultitem/": "/admin/clinical/result/",
  "/clinical/result/": "/admin/clinical/result/",
  // Equipment
  "/equipamentos/equipamento/": "/admin/equipment/equipment/",
  "/equipment/equipment/": "/admin/equipment/equipment/",
  "/equipamentos/inspecaodiaria/": "/admin/inspections/dailyinspection/",
  "/equipment/daily_inspection/": "/admin/inspections/dailyinspection/",
  "/equipamentos/manutencao/": "/admin/maintenance/maintenance/",
  "/equipment/maintenance/": "/admin/maintenance/maintenance/",
  "/equipamentos/ocorrencia/": "/admin/incidents/incident/",
  "/equipment/incident/": "/admin/incidents/incident/",
  // External entities
  "/entities/company/": "/admin/external-entities/company/",
  "/external_entities/empresa/": "/admin/external-entities/company/",
  "/external_entities/company/": "/admin/external-entities/company/",
  // Billing
  "/billing/invoice/": "/admin/billing/invoice/",
  // Pharmacy
  "/farmacia/produto/": "/admin/pharmacy/product/",
  "/farmacia/lote/": "/admin/pharmacy/lot/",
  "/farmacia/movimentoestoque/": "/admin/pharmacy/inventorymovement/",
  "/farmacia/venda/": "/admin/pharmacy/sale/",
  "/farmacia/itemvenda/": "/admin/pharmacy/saleitem/",
  "/pharmacy/product/": "/admin/pharmacy/product/",
  "/pharmacy/lot/": "/admin/pharmacy/lot/",
  "/pharmacy/movimentoestoque/": "/admin/pharmacy/inventorymovement/",
  "/pharmacy/sale/": "/admin/pharmacy/sale/",
  "/pharmacy/itemvenda/": "/admin/pharmacy/saleitem/",
  // Nursing
  "/enfermagem/procedimento/": "/admin/nursing/procedure/",
  "/enfermagem/procedimentocatalogo/": "/admin/nursing/procedurecatalog/",
  "/enfermagem/procedimentocatalogomaterial/": "/admin/nursing/procedurecatalogmaterial/",
  "/enfermagem/procedimentoitem/": "/admin/nursing/procedureitem/",
  "/enfermagem/procedimentoitemvalor/": "/admin/nursing/procedureitemvalue/",
  "/enfermagem/procedimentomaterial/": "/admin/nursing/procedurematerial/",
  "/enfermagem/procedimentomaterialvalor/": "/admin/nursing/procedurematerialvalue/",
  "/enfermagem/registroenfermagem/": "/admin/nursing/nursingrecord/",
  "/enfermagem/sinalvitalenfermagem/": "/admin/nursing/nursingvitalsign/",
  "/nursing/procedure/": "/admin/nursing/procedure/",
  "/nursing/procedimentocatalogo/": "/admin/nursing/procedurecatalog/",
  "/nursing/procedimentocatalogomaterial/": "/admin/nursing/procedurecatalogmaterial/",
  "/nursing/procedimentoitem/": "/admin/nursing/procedureitem/",
  "/nursing/procedimentoitemvalor/": "/admin/nursing/procedureitemvalue/",
  "/nursing/procedimentomaterial/": "/admin/nursing/procedurematerial/",
  "/nursing/procedimentomaterialvalor/": "/admin/nursing/procedurematerialvalue/",
  "/nursing/registroenfermagem/": "/admin/nursing/nursingrecord/",
  "/nursing/sinalvitalenfermagem/": "/admin/nursing/nursingvitalsign/",
  // Insurer
  "/seguradora/seguradora/": "/admin/insurer/insurer/",
  "/seguradora/planocobertura/": "/admin/insurer/coverageplan/",
  "/seguradora/autorizacaoprocedimento/": "/admin/insurer/procedureauthorization/",
  "/insurer/insurer/": "/admin/insurer/insurer/",
  "/insurer/planocobertura/": "/admin/insurer/coverageplan/",
  "/insurer/autorizacaoprocedimento/": "/admin/insurer/procedureauthorization/",
  // Accounting
  "/accounting/account/": "/admin/accounting/account/",
  "/accounting/entry/": "/admin/accounting/legacyentry/",
  "/accounting/movement/": "/admin/accounting/legacymovement/",
  "/accounting/financialreconciliation/": "/admin/accounting/financialreconciliation/",
  // Consultations
  "/consultations/consultation/": "/admin/consultations/medicalconsultation/",
  "/consultations/doctors/": "/admin/human-resources/employee/",
  "/consultations/specialty/": "/admin/consultations/consultationspecialty/",
  "/consultations/holiday/": "/admin/consultations/holiday/",
  // Tenants
  "/inquilinos/inquilino/": "/admin/tenants/tenant/",
  "/inquilinos/configuracaoinquilino/": "/admin/tenants/tenantconfiguration/",
  "/tenants/tenant/": "/admin/tenants/tenant/",
  "/tenants/configuracaoinquilino/": "/admin/tenants/tenantconfiguration/",
  "/tenants/tenantconfiguration/": "/admin/tenants/tenantconfiguration/",
  // Notifications
  "/notificacoes/notificacao/": "/admin/notifications/notification/",
  "/notificacoes/logenvio/": "/admin/notifications/deliverylog/",
  "/notifications/notification/": "/admin/notifications/notification/",
  "/notifications/logenvio/": "/admin/notifications/deliverylog/",
  "/notifications/deliverylog/": "/admin/notifications/deliverylog/",
  // Identity
  "/identidade/usuario/": "/admin/identity/user/",
  "/identity/user/": "/admin/identity/user/",
  // Medical records
  "/prontuario/registro/": "/admin/medical-records/medicalrecordentry/",
  "/prontuario/prescricaoitem/": "/admin/medical-records/prescriptionitem/",
  "/medical_records/record/": "/admin/medical-records/medicalrecordentry/",
  "/medical_records/prescricaoitem/": "/admin/medical-records/prescriptionitem/",
  // Maternity
  "/maternity/gestacao/": "/admin/maternity/pregnancy/",
  // Surgery
  "/cirurgia/cirurgia/": "/admin/surgery/surgery/",
  "/cirurgia/procedimentocirurgico/": "/admin/surgery/surgicalprocedure/",
  "/surgery/surgery/": "/admin/surgery/surgery/",
  "/surgery/procedimentocirurgico/": "/admin/surgery/surgicalprocedure/",
  // Human resources
  "/recursos_humanos/cargo/": "/admin/human-resources/jobtitle/",
  "/recursos_humanos/funcionario/": "/admin/human-resources/employee/",
  "/recursos_humanos/agregadofamiliar/": "/admin/human-resources/familydependent/",
  "/recursos_humanos/horario/": "/admin/human-resources/workschedule/",
  "/recursos_humanos/falta/": "/admin/human-resources/absence/",
  "/recursos_humanos/ferias/": "/admin/human-resources/vacation/",
  "/recursos_humanos/dispensa/": "/admin/human-resources/termination/",
  "/recursos_humanos/horaextra/": "/admin/human-resources/overtime/",
  "/recursos_humanos/folhapagamento/": "/admin/human-resources/payroll/",
  "/human_resources/role/": "/admin/human-resources/jobtitle/",
  "/human_resources/employee/": "/admin/human-resources/employee/",
  "/human_resources/agregadofamiliar/": "/admin/human-resources/familydependent/",
  "/human_resources/horario/": "/admin/human-resources/workschedule/",
  "/human_resources/falta/": "/admin/human-resources/absence/",
  "/human_resources/ferias/": "/admin/human-resources/vacation/",
  "/human_resources/dispensa/": "/admin/human-resources/termination/",
  "/human_resources/horaextra/": "/admin/human-resources/overtime/",
  "/human_resources/folhapagamento/": "/admin/human-resources/payroll/",
  // Monitoring
  "/monitoramento/erro/": "/admin/monitoring/systemerror/",
  "/monitoring/error/": "/admin/monitoring/systemerror/",
}

function inferAdminListHref(endpoint: string): string | undefined {
  return ADMIN_LIST_BY_ENDPOINT[normalizeEndpoint(endpoint)]
}

function applyAdminHrefOverrides(modules: ModuleGroup[]): ModuleGroup[] {
  return modules.map((group) => ({
    ...group,
    resources: group.resources.map((resource) => {
      const inferred = inferAdminListHref(resource.endpoint)
      if (!inferred) {
        return {
          key: resource.key,
          label: resource.label,
          endpoint: resource.endpoint,
        }
      }
      return { ...resource, adminListHref: inferred }
    }),
  }))
}

export const MODULES: ModuleGroup[] = applyAdminHrefOverrides(MODULES_BASE)

const GROUP_KEY_ALIASES: Record<string, string> = {
  clinical: "clinico",
  reception: "recepcao",
  recepcao: "recepcao",
  equipment: "equipamentos",
  external_entities: "entidades",
  entities: "entidades",
  billing: "faturamento",
  payments: "pagamentos",
  pharmacy: "farmacia",
  nursing: "enfermagem",
  medical_records: "prontuario",
  maternity: "maternidade",
  surgery: "cirurgia",
  human_resources: "recursos_humanos",
  consultations: "consultas",
  accounting: "contabilidade",
  notifications: "notificacoes",
  monitoring: "monitoramento",
  insurer: "seguradora",
  tenants: "inquilinos",
  identity: "identidade",
  bloodbank: "banco_sangue",
}

function normalizeResourceKey(value: string): string {
  return (value || "").trim().toLocaleLowerCase().replace(/-/g, "_")
}

function normalizeEndpoint(endpoint: string): string {
  const trimmed = (endpoint || "").trim()
  if (!trimmed) return "/"
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`
}

function titleFromSlug(slug: string): string {
  return slug
    .split(/[_-]+/)
    .filter(Boolean)
    .map((piece) => piece.charAt(0).toLocaleUpperCase() + piece.slice(1))
    .join(" ")
}

function getResourceSegment(endpoint: string): string {
  const parts = normalizeEndpoint(endpoint).split("/").filter(Boolean)
  return parts[1] || ""
}

function parseApiRootPath(raw: string): string {
  const input = (raw || "").trim()
  if (!input) return ""

  let pathname = input
  if (/^https?:\/\//i.test(input)) {
    try {
      pathname = new URL(input).pathname
    } catch {
      pathname = input
    }
  }

  return pathname
    .replace(/^\/+/, "")
    .replace(/^api\/v1\/?/, "")
    .replace(/\/+$/, "")
}

function cloneModules(modules: ModuleGroup[]): ModuleGroup[] {
  return modules.map((group) => ({
    ...group,
    resources: group.resources.map((resource) => ({ ...resource })),
  }))
}

export function canonicalModuleGroupKey(groupKey: string): string {
  const normalized = (groupKey || "")
    .trim()
    .toLocaleLowerCase()
    .replace(/-/g, "_")
  return GROUP_KEY_ALIASES[normalized] || normalized
}

export function discoverModulesFromApiRoot(
  apiRoot: Record<string, unknown>
): ModuleGroup[] {
  if (!apiRoot || typeof apiRoot !== "object") return []

  const staticByEndpoint = new Map<
    string,
    { group: ModuleGroup; resource: ModuleResource }
  >()
  MODULES.forEach((group) => {
    group.resources.forEach((resource) => {
      staticByEndpoint.set(normalizeEndpoint(resource.endpoint), {
        group,
        resource,
      })
    })
  })

  const grouped = new Map<string, ModuleGroup>()

  for (const [entryKey, entryValue] of Object.entries(apiRoot)) {
    const routeFromValue =
      typeof entryValue === "string" ? parseApiRootPath(entryValue) : ""
    const route = routeFromValue || parseApiRootPath(entryKey)
    if (!route) continue

    const parts = route.split("/").filter(Boolean)
    if (parts.length !== 2) continue
    if (parts.some((part) => part.includes("{") || part.includes("}"))) continue

    const [backendGroup, resourceSegment] = parts
    const groupKey = canonicalModuleGroupKey(backendGroup)
    const endpoint = normalizeEndpoint(`/${backendGroup}/${resourceSegment}/`)
    const staticMatch = staticByEndpoint.get(endpoint)

    const resource: ModuleResource = staticMatch
      ? { ...staticMatch.resource, endpoint }
      : {
          key: normalizeResourceKey(resourceSegment),
          label: titleFromSlug(resourceSegment),
          endpoint,
          adminListHref: inferAdminListHref(endpoint),
        }

    let group = grouped.get(groupKey)
    if (!group) {
      const staticGroup = MODULES.find((item) => item.key === groupKey)
      group = {
        key: groupKey,
        label: staticGroup?.label || staticMatch?.group.label || titleFromSlug(groupKey),
        resources: [],
      }
      grouped.set(groupKey, group)
    }

    const exists = group.resources.some(
      (item) =>
        normalizeResourceKey(item.key) === normalizeResourceKey(resource.key) ||
        normalizeEndpoint(item.endpoint) === endpoint
    )
    if (!exists) {
      group.resources.push(resource)
    }
  }

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      resources: group.resources.sort((a, b) =>
        a.label.localeCompare(b.label, "pt")
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt"))
}

export function mergeModules(
  baseModules: ModuleGroup[],
  discoveredModules: ModuleGroup[]
): ModuleGroup[] {
  const merged = cloneModules(baseModules)
  const byGroupKey = new Map<string, ModuleGroup>(
    merged.map((group) => [group.key, group])
  )

  discoveredModules.forEach((incomingGroup) => {
    const canonicalGroupKey = canonicalModuleGroupKey(incomingGroup.key)
    let target = byGroupKey.get(canonicalGroupKey)

    if (!target) {
      target = {
        key: canonicalGroupKey,
        label: incomingGroup.label || titleFromSlug(canonicalGroupKey),
        resources: [],
      }
      merged.push(target)
      byGroupKey.set(canonicalGroupKey, target)
    }

    incomingGroup.resources.forEach((incomingResource) => {
      const incomingEndpoint = normalizeEndpoint(incomingResource.endpoint)
      const incomingKey = normalizeResourceKey(incomingResource.key)

      const existing = target!.resources.find(
        (item) =>
          normalizeResourceKey(item.key) === incomingKey ||
          normalizeEndpoint(item.endpoint) === incomingEndpoint
      )

      if (existing) {
        existing.endpoint = incomingEndpoint
        if (!existing.label && incomingResource.label) {
          existing.label = incomingResource.label
        }
        if (!existing.adminListHref) {
          existing.adminListHref =
            incomingResource.adminListHref || inferAdminListHref(incomingEndpoint)
        }
        return
      }

      const inferredAdminHref =
        incomingResource.adminListHref || inferAdminListHref(incomingEndpoint)

      target!.resources.push({
        ...incomingResource,
        endpoint: incomingEndpoint,
        ...(inferredAdminHref ? { adminListHref: inferredAdminHref } : {}),
      })
    })
  })

  return merged.map((group) => ({
    ...group,
    resources: group.resources
      .slice()
      .sort((a, b) => a.label.localeCompare(b.label, "pt")),
  }))
}

export function findModuleGroup(
  key: string,
  modules: ModuleGroup[] = MODULES
): ModuleGroup | undefined {
  const canonicalKey = canonicalModuleGroupKey(key)
  return modules.find((module) => module.key === canonicalKey)
}

export function findModuleResource(
  groupKey: string,
  resourceKey: string,
  modules: ModuleGroup[] = MODULES
): { group: ModuleGroup; resource: ModuleResource } | null {
  const group = findModuleGroup(groupKey, modules)
  if (!group) return null

  const normalizedResourceKey = normalizeResourceKey(resourceKey)
  const resource =
    group.resources.find(
      (item) => normalizeResourceKey(item.key) === normalizedResourceKey
    ) ||
    group.resources.find(
      (item) =>
        normalizeResourceKey(getResourceSegment(item.endpoint)) ===
        normalizedResourceKey
    )

  if (!resource) return null
  return { group, resource }
}

