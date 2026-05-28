import { hasOpenApiMethod } from "@/lib/openapi/writeContract"

export type ResourceActionMethod = "GET" | "POST"
export type ResourceActionRequestMode = "query" | "json"
export type ResourceActionResponseMode = "json" | "blob" | "jobPdf"
export type ResourceActionFieldType =
  | "text"
  | "number"
  | "date"
  | "datetime-local"
  | "select"
  | "textarea"
  | "checkbox"
  | "csv-number-list"
  | "csv-date-list"
  | "theme-lines"

export type ResourceActionFieldOption = {
  value: string
  label: string
}

export type ResourceActionField = {
  name: string
  label: string
  type: ResourceActionFieldType
  required?: boolean
  placeholder?: string
  helper?: string
  defaultValue?: string | number | boolean
  options?: ResourceActionFieldOption[]
  omitValues?: string[]
  min?: number
  max?: number
  step?: number
  includeWhenFalse?: boolean
}

export type ResourceActionDefinition = {
  key: string
  label: string
  description: string
  parentEndpoint: string
  endpoint: string
  method: ResourceActionMethod
  requestMode: ResourceActionRequestMode
  responseMode: ResourceActionResponseMode
  fields?: ResourceActionField[]
  filename?: string
  filenameParam?: string
  dedicatedHref?: string
}

const periodOptions: ResourceActionFieldOption[] = [
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
]

const sectorOptions: ResourceActionFieldOption[] = [
  { value: "", label: "Todos" },
  { value: "LAB", label: "Laboratório" },
  { value: "ENF", label: "Enfermagem" },
  { value: "REC", label: "Recepção" },
  { value: "MED", label: "Medicina" },
  { value: "MOC", label: "Medicina Ocupacional" },
  { value: "OUT", label: "Outros setores" },
]

const dateRangeFields: ResourceActionField[] = [
  { name: "date_from", label: "De", type: "date" },
  { name: "date_to", label: "Até", type: "date" },
]

const billingPeriodFields: ResourceActionField[] = [
  { name: "period", label: "Período", type: "select", defaultValue: "annual", options: periodOptions },
  { name: "year", label: "Ano", type: "number", min: 2000, max: 2100 },
  { name: "date", label: "Data diária", type: "date", helper: "Usado apenas quando o período é diário." },
  { name: "month", label: "Mês", type: "number", min: 1, max: 12, helper: "Usado no período mensal." },
  { name: "quarter", label: "Trimestre", type: "number", min: 1, max: 4, helper: "Usado no período trimestral." },
  { name: "semester", label: "Semestre", type: "number", min: 1, max: 2, helper: "Usado no período semestral." },
  {
    name: "scope",
    label: "Escopo",
    type: "select",
    defaultValue: "all",
    options: [
      { value: "all", label: "Todos os utilizadores" },
      { value: "user", label: "Utilizador específico" },
    ],
  },
  { name: "user_id", label: "ID do utilizador", type: "number", min: 1 },
  { name: "limit", label: "Limite", type: "number", min: 1, max: 1000 },
  { name: "refresh", label: "Recalcular agora", type: "checkbox" },
]

export const RESOURCE_ACTIONS: ResourceActionDefinition[] = [
  {
    key: "ai.assistant.chat",
    label: "Conversar com a IA operacional",
    description: "Envia uma pergunta contextualizada para a IA e devolve a resposta da sessão.",
    parentEndpoint: "/ai/assistant/sessions/",
    endpoint: "/ai/assistant/chat/",
    method: "POST",
    requestMode: "json",
    responseMode: "json",
    dedicatedHref: "/ai",
    fields: [
      { name: "message", label: "Mensagem", type: "textarea", required: true, placeholder: "Descreva a dúvida operacional." },
      { name: "session_id", label: "Sessão existente", type: "number", min: 1 },
      { name: "active_module", label: "Módulo ativo", type: "text", placeholder: "Ex.: pharmacy" },
      {
        name: "language",
        label: "Idioma",
        type: "select",
        defaultValue: "pt",
        options: [
          { value: "pt", label: "Português" },
          { value: "en", label: "Inglês" },
        ],
      },
    ],
  },
  {
    key: "audit.activity.report",
    label: "Relatório de actividade",
    description: "Gera PDF da actividade registada para página, utilizador e período selecionados.",
    parentEndpoint: "/audit/atividade/",
    endpoint: "/audit/atividade/relatorio/pdf/",
    method: "GET",
    requestMode: "query",
    responseMode: "jobPdf",
    filename: "relatorio_atividade.pdf",
    fields: [
      {
        name: "period",
        label: "Período",
        type: "select",
        defaultValue: "daily",
        options: periodOptions.filter((option) => option.value !== "semiannual"),
      },
      {
        name: "mode",
        label: "Tipo",
        type: "select",
        defaultValue: "complete",
        options: [
          { value: "complete", label: "Completo" },
          { value: "general", label: "Geral da página" },
          { value: "activity", label: "Por actividade" },
        ],
      },
      { name: "page_path", label: "Página", type: "text", placeholder: "/resources/pharmacy/product" },
      { name: "limit", label: "Limite", type: "number", min: 1, max: 1000, defaultValue: 300 },
    ],
  },
  {
    key: "billing.invoice.history",
    label: "Consultar histórico de faturação",
    description: "Mostra totais, utilizadores e faturas agregadas no período selecionado.",
    parentEndpoint: "/billing/invoice/",
    endpoint: "/billing/invoice/billing-history/",
    method: "GET",
    requestMode: "query",
    responseMode: "json",
    dedicatedHref: "/invoices",
    fields: billingPeriodFields,
  },
  {
    key: "billing.invoice.history.pdf",
    label: "Baixar PDF do histórico de faturação",
    description: "Emite o relatório PDF do histórico agregado de faturas.",
    parentEndpoint: "/billing/invoice/",
    endpoint: "/billing/invoice/billing-history/pdf/",
    method: "GET",
    requestMode: "query",
    responseMode: "blob",
    filename: "historico_faturacao.pdf",
    dedicatedHref: "/invoices",
    fields: billingPeriodFields,
  },
  {
    key: "clinical.patient.history.document",
    label: "História clínica por documento",
    description: "Busca a história clínica completa usando o número de documento do paciente.",
    parentEndpoint: "/clinical/patient/",
    endpoint: "/clinical/patient/clinical-history/",
    method: "GET",
    requestMode: "query",
    responseMode: "json",
    dedicatedHref: "/patients",
    fields: [
      { name: "document_number", label: "Número do documento", type: "text", required: true },
    ],
  },
  {
    key: "consultations.price",
    label: "Pré-visualizar preço",
    description: "Calcula preço, multiplicador e moeda para uma especialidade e horário.",
    parentEndpoint: "/consultations/consultation/",
    endpoint: "/consultations/consultation/price/",
    method: "GET",
    requestMode: "query",
    responseMode: "json",
    dedicatedHref: "/consultations",
    fields: [
      { name: "specialty", label: "ID da especialidade", type: "number", required: true, min: 1 },
      { name: "scheduled_for", label: "Data/hora", type: "datetime-local" },
      { name: "manual_holiday", label: "Feriado manual", type: "checkbox" },
    ],
  },
  {
    key: "consultations.schedule",
    label: "Consultar agenda",
    description: "Lista consultas por médico, intervalo e estado.",
    parentEndpoint: "/consultations/consultation/",
    endpoint: "/consultations/consultation/schedule/",
    method: "GET",
    requestMode: "query",
    responseMode: "json",
    dedicatedHref: "/consultations",
    fields: [
      { name: "doctor", label: "ID do médico", type: "number", min: 1 },
      { name: "start", label: "Início", type: "datetime-local" },
      { name: "end", label: "Fim", type: "datetime-local" },
      {
        name: "status",
        label: "Estado",
        type: "select",
        options: [
          { value: "", label: "Todos" },
          { value: "MARCADA", label: "Marcada" },
          { value: "CONCLUIDA", label: "Concluída" },
          { value: "CANCELADA", label: "Cancelada" },
        ],
      },
    ],
  },
  {
    key: "dashboard.analytics.export",
    label: "Exportar análises operacionais",
    description: "Exporta o dashboard em PDF, CSV ou Word com o mesmo filtro da API.",
    parentEndpoint: "/dashboard/analytics/",
    endpoint: "/dashboard/analytics/export/",
    method: "GET",
    requestMode: "query",
    responseMode: "blob",
    filename: "dashboard_analytics.pdf",
    filenameParam: "type",
    dedicatedHref: "/statistics",
    fields: [
      {
        name: "type",
        label: "Formato",
        type: "select",
        defaultValue: "pdf",
        options: [
          { value: "pdf", label: "PDF" },
          { value: "csv", label: "CSV" },
          { value: "word", label: "Word" },
        ],
      },
      { name: "limit", label: "Limite", type: "number", min: 1, max: 50 },
      { name: "dias", label: "Dias", type: "number", min: 1, max: 365 },
      { name: "inicio", label: "Início", type: "datetime-local" },
      { name: "fim", label: "Fim", type: "datetime-local" },
    ],
  },
  {
    key: "education.attendance.rollCall",
    label: "Registar chamada da turma",
    description: "Marca presença e atraso de vários estudantes numa data.",
    parentEndpoint: "/education/attendance/",
    endpoint: "/education/attendance/roll_call/",
    method: "POST",
    requestMode: "json",
    responseMode: "json",
    dedicatedHref: "/education/teacher",
    fields: [
      { name: "classroom", label: "ID da turma", type: "number", required: true, min: 1 },
      { name: "attendance_date", label: "Data", type: "date", required: true },
      { name: "present_student_ids", label: "Presentes", type: "csv-number-list", placeholder: "1, 2, 3" },
      { name: "late_student_ids", label: "Atrasados", type: "csv-number-list", placeholder: "4, 5" },
      { name: "notes", label: "Observações", type: "textarea" },
    ],
  },
  {
    key: "education.disciplineSchedule.fullPlan",
    label: "Criar cronograma completo",
    description: "Cria testes, trabalhos, temas e exercícios numa disciplina/turma.",
    parentEndpoint: "/education/discipline_schedule/",
    endpoint: "/education/discipline_schedule/create_full_plan/",
    method: "POST",
    requestMode: "json",
    responseMode: "json",
    dedicatedHref: "/education/teacher",
    fields: [
      { name: "course", label: "ID do curso", type: "number", required: true, min: 1 },
      { name: "classroom", label: "ID da turma", type: "number", required: true, min: 1 },
      { name: "test_dates", label: "Datas de testes", type: "csv-date-list", placeholder: "2026-06-10, 2026-07-05" },
      { name: "assignment_dates", label: "Datas de trabalhos", type: "csv-date-list" },
      { name: "exercise_dates", label: "Datas de exercícios", type: "csv-date-list" },
      {
        name: "themes",
        label: "Temas",
        type: "theme-lines",
        placeholder: "2026-06-03|Tema 1|Introdução",
        helper: "Uma linha por tema: data|título|descrição.",
      },
      { name: "notes", label: "Observações", type: "textarea" },
    ],
  },
  {
    key: "education.randomTest.scheduleClassroom",
    label: "Marcar teste aleatório",
    description: "Agenda teste aleatório para turma inteira ou estudantes específicos.",
    parentEndpoint: "/education/random_test/",
    endpoint: "/education/random_test/schedule_for_classroom/",
    method: "POST",
    requestMode: "json",
    responseMode: "json",
    dedicatedHref: "/education/teacher",
    fields: [
      { name: "classroom", label: "ID da turma", type: "number", required: true, min: 1 },
      { name: "course", label: "ID do curso", type: "number", min: 1 },
      { name: "teacher", label: "ID do professor", type: "number", min: 1 },
      { name: "scheduled_for", label: "Agendado para", type: "datetime-local", required: true },
      { name: "opens_at", label: "Abre em", type: "datetime-local" },
      { name: "closes_at", label: "Fecha em", type: "datetime-local" },
      { name: "duration_minutes", label: "Duração", type: "number", min: 1, defaultValue: 45 },
      { name: "question_count", label: "Questões", type: "number", min: 1, defaultValue: 15 },
      { name: "title_template", label: "Título", type: "text", defaultValue: "Teste Aleatório - {student_code}" },
      { name: "student_ids", label: "Estudantes específicos", type: "csv-number-list", placeholder: "1, 2, 3" },
      { name: "only_active_enrollments", label: "Apenas matrículas ativas", type: "checkbox", defaultValue: true, includeWhenFalse: true },
      { name: "notes", label: "Observações", type: "textarea" },
    ],
  },
  {
    key: "maintenance.pendingRequests",
    label: "Pedidos pendentes",
    description: "Carrega ocorrências que ainda precisam de manutenção.",
    parentEndpoint: "/maintenance/maintenance/",
    endpoint: "/maintenance/maintenance/pending-requests/",
    method: "GET",
    requestMode: "query",
    responseMode: "json",
    dedicatedHref: "/maintenance/maintenances",
    fields: [
      { name: "page", label: "Página", type: "number", min: 1 },
      { name: "page_size", label: "Por página", type: "number", min: 1, max: 200, defaultValue: 50 },
    ],
  },
  {
    key: "monitoring.commandCenter",
    label: "Resumo do centro de comando",
    description: "Calcula SLO, alertas, erros e saúde operacional da plataforma.",
    parentEndpoint: "/monitoring/telemetry/",
    endpoint: "/monitoring/telemetry/command_center/",
    method: "GET",
    requestMode: "query",
    responseMode: "json",
    dedicatedHref: "/monitoring/command-center",
    fields: [
      { name: "days", label: "Dias", type: "number", min: 1, max: 365, defaultValue: 30 },
      { name: "slo_target", label: "SLO alvo", type: "number", min: 80, max: 100, step: 0.1, defaultValue: 99 },
      { name: "route_5xx_threshold", label: "Limite 5xx por rota", type: "number", min: 1, defaultValue: 3 },
      { name: "client_4xx_threshold", label: "Limite 4xx", type: "number", min: 1, defaultValue: 30 },
      { name: "server_5xx_threshold", label: "Limite 5xx", type: "number", min: 1, defaultValue: 10 },
    ],
  },
  {
    key: "pharmacy.inventoryMovements.historyPdf",
    label: "PDF de entradas e saídas",
    description: "Baixa histórico de entradas, saídas e ajustes com filtros de data, tipo e setor.",
    parentEndpoint: "/pharmacy/inventory_movement/",
    endpoint: "/pharmacy/inventory_movement/history/pdf/",
    method: "GET",
    requestMode: "query",
    responseMode: "blob",
    filename: "historico_entradas_saidas_farmacia.pdf",
    dedicatedHref: "/pharmacy/movements",
    fields: [
      ...dateRangeFields,
      {
        name: "type",
        label: "Tipo",
        type: "select",
        options: [
          { value: "", label: "Todos" },
          { value: "ENT", label: "Entradas" },
          { value: "SAI", label: "Saídas" },
          { value: "AJU", label: "Ajustes" },
        ],
      },
      { name: "origin", label: "Origem", type: "text", placeholder: "REQ, SALE..." },
      { name: "sector", label: "Setor", type: "select", options: sectorOptions },
      { name: "limit", label: "Limite", type: "number", min: 1, max: 2000, defaultValue: 500 },
    ],
  },
  {
    key: "pharmacy.lot.available",
    label: "Ver lotes disponíveis",
    description: "Lista lotes com saldo positivo e validade útil em ordem FEFO.",
    parentEndpoint: "/pharmacy/lot/",
    endpoint: "/pharmacy/lot/available/",
    method: "GET",
    requestMode: "query",
    responseMode: "json",
    dedicatedHref: "/pharmacy/material-requests/new",
    fields: [
      { name: "product", label: "ID do produto", type: "number", min: 1 },
    ],
  },
  {
    key: "pharmacy.lot.stockPdf",
    label: "PDF do estoque existente",
    description: "Baixa o relatório de lotes disponíveis e saldo atual.",
    parentEndpoint: "/pharmacy/lot/",
    endpoint: "/pharmacy/lot/stock/pdf/",
    method: "GET",
    requestMode: "query",
    responseMode: "blob",
    filename: "estoque_existente_farmacia.pdf",
    dedicatedHref: "/pharmacy/movements",
    fields: [
      ...dateRangeFields,
      { name: "include_expired", label: "Incluir vencidos", type: "checkbox" },
    ],
  },
  {
    key: "pharmacy.materialRequisition.movementHistoryPdf",
    label: "PDF por setor solicitante",
    description: "Baixa histórico de movimentos de insumos por setor.",
    parentEndpoint: "/pharmacy/material_requisition/",
    endpoint: "/pharmacy/material_requisition/movement-history/pdf/",
    method: "GET",
    requestMode: "query",
    responseMode: "blob",
    filename: "historico_movimentos_por_setor_farmacia.pdf",
    dedicatedHref: "/pharmacy/movements",
    fields: [
      ...dateRangeFields,
      { name: "sector", label: "Setor", type: "select", options: sectorOptions },
    ],
  },
  {
    key: "pharmacy.materialRequisition.requesterContext",
    label: "Contexto do solicitante",
    description: "Mostra setor e bloqueios usados na criação de requisições de material.",
    parentEndpoint: "/pharmacy/material_requisition/",
    endpoint: "/pharmacy/material_requisition/requester-context/",
    method: "GET",
    requestMode: "query",
    responseMode: "json",
    dedicatedHref: "/pharmacy/material-requests/new",
  },
  {
    key: "pharmacy.product.consumptionPdf",
    label: "PDF de consumo por produto",
    description: "Baixa consumo farmacêutico consolidado por produto.",
    parentEndpoint: "/pharmacy/product/",
    endpoint: "/pharmacy/product/consumption/pdf/",
    method: "GET",
    requestMode: "query",
    responseMode: "blob",
    filename: "consumo_farmaceutico_produtos.pdf",
    dedicatedHref: "/pharmacy/movements",
    fields: [
      ...dateRangeFields,
      { name: "product_id", label: "ID do produto", type: "number", min: 1 },
    ],
  },
  {
    key: "pharmacy.product.leastRequestedPdf",
    label: "PDF de menos requisitados",
    description: "Baixa ranking de produtos menos requisitados.",
    parentEndpoint: "/pharmacy/product/",
    endpoint: "/pharmacy/product/least-requested/pdf/",
    method: "GET",
    requestMode: "query",
    responseMode: "blob",
    filename: "produtos_menos_requisitados_farmacia.pdf",
    dedicatedHref: "/pharmacy/movements",
    fields: [
      ...dateRangeFields,
      { name: "limit", label: "Limite", type: "number", min: 1, max: 100, defaultValue: 30 },
    ],
  },
  {
    key: "pharmacy.product.mostRequestedPdf",
    label: "PDF de mais requisitados",
    description: "Baixa ranking de produtos mais requisitados.",
    parentEndpoint: "/pharmacy/product/",
    endpoint: "/pharmacy/product/most-requested/pdf/",
    method: "GET",
    requestMode: "query",
    responseMode: "blob",
    filename: "produtos_mais_requisitados_farmacia.pdf",
    dedicatedHref: "/pharmacy/movements",
    fields: [
      ...dateRangeFields,
      { name: "limit", label: "Limite", type: "number", min: 1, max: 100, defaultValue: 30 },
    ],
  },
  {
    key: "pharmacy.product.requestSectorsPdf",
    label: "PDF de setores por produto",
    description: "Baixa os setores que mais requisitaram um produto específico.",
    parentEndpoint: "/pharmacy/product/",
    endpoint: "/pharmacy/product/request-sectors/pdf/",
    method: "GET",
    requestMode: "query",
    responseMode: "blob",
    filename: "setores_requisicao_produto_farmacia.pdf",
    dedicatedHref: "/pharmacy/movements",
    fields: [
      ...dateRangeFields,
      { name: "product_id", label: "ID do produto", type: "number", required: true, min: 1 },
    ],
  },
]

export const EXTERNALLY_EXPOSED_ACTION_ENDPOINTS = [
  "/audit/modelo/relatorio/pdf/",
]

export function normalizeActionEndpoint(endpoint: string): string {
  const clean = String(endpoint || "").split("?")[0].split("#")[0].trim()
  if (!clean) return "/"
  const withoutApiPrefix = clean.replace(/^\/api\/v1(?=\/)/, "")
  const prefixed = withoutApiPrefix.startsWith("/") ? withoutApiPrefix : `/${withoutApiPrefix}`
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`
}

export function getResourceActionsForEndpoint(endpoint: string): ResourceActionDefinition[] {
  const normalized = normalizeActionEndpoint(endpoint)
  return RESOURCE_ACTIONS.filter((action) => normalizeActionEndpoint(action.parentEndpoint) === normalized)
}

export function resourceActionHasOpenApiContract(action: ResourceActionDefinition): boolean {
  const method = action.method.toLocaleLowerCase() as "get" | "post"
  return hasOpenApiMethod(action.endpoint, method)
}

export function getAvailableResourceActionsForEndpoint(endpoint: string): ResourceActionDefinition[] {
  return getResourceActionsForEndpoint(endpoint).filter(resourceActionHasOpenApiContract)
}

export function listExposedActionEndpoints(): string[] {
  return Array.from(
    new Set([
      ...RESOURCE_ACTIONS.map((action) => normalizeActionEndpoint(action.endpoint)),
      ...EXTERNALLY_EXPOSED_ACTION_ENDPOINTS.map((endpoint) => normalizeActionEndpoint(endpoint)),
    ])
  ).sort()
}
