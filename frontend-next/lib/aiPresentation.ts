export function humanizeAiToken(value?: string) {
  return String(value || "—").replace(/_/g, " ").trim() || "—"
}

const INTENT_LABELS: Record<string, { pt: string; en: string }> = {
  access_review: { pt: "Revisão de acesso", en: "Access review" },
  data_exploration: { pt: "Investigação de dados", en: "Data investigation" },
  education_review: { pt: "Investigação escolar", en: "Education investigation" },
  financial_review: { pt: "Investigação financeira", en: "Financial investigation" },
  knowledge_base: { pt: "Perguntas previstas", en: "Predicted questions" },
  nursing_flow: { pt: "Investigação de enfermagem", en: "Nursing investigation" },
  operational_health: { pt: "Investigação operacional", en: "Operational investigation" },
  operational_investigation: { pt: "Investigação operacional", en: "Operational investigation" },
  pharmacy_stock: { pt: "Investigação de farmácia", en: "Pharmacy investigation" },
  project_identity: { pt: "Identidade do projecto", en: "Project identity" },
  report_preparation: { pt: "Preparação de relatório", en: "Report preparation" },
  sample_collection: { pt: "Investigação de colheita", en: "Collection investigation" },
  sql_analytics: { pt: "Pesquisa SQL analítica", en: "SQL analytics" },
  task_preparation: { pt: "Preparação de tarefa", en: "Task preparation" },
}

const STATUS_LABELS: Record<string, { pt: string; en: string }> = {
  archived: { pt: "Arquivada", en: "Archived" },
  blocked: { pt: "Bloqueada", en: "Blocked" },
  cancelled: { pt: "Cancelada", en: "Cancelled" },
  completed: { pt: "Concluída", en: "Completed" },
  confirmed: { pt: "Confirmada", en: "Confirmed" },
  connected: { pt: "Ligada", en: "Connected" },
  done: { pt: "Concluída", en: "Done" },
  empty: { pt: "Sem dados", en: "Empty" },
  failed: { pt: "Falhada", en: "Failed" },
  in_progress: { pt: "Em curso", en: "In progress" },
  needs_confirmation: { pt: "Precisa de confirmação", en: "Needs confirmation" },
  open: { pt: "Aberta", en: "Open" },
  pending: { pt: "Pendente", en: "Pending" },
  pending_confirmation: { pt: "Pendente de confirmação", en: "Pending confirmation" },
  ready: { pt: "Pronta", en: "Ready" },
  answered: { pt: "Respondida", en: "Answered" },
  available: { pt: "Disponível", en: "Available" },
  success: { pt: "Sucesso", en: "Success" },
}

const TOOL_LABELS: Record<string, { pt: string; en: string }> = {
  answer_predicted_question: { pt: "Perguntas previstas", en: "Predicted questions" },
  explore_database: { pt: "Explorar dados", en: "Explore data" },
  get_command_center_alerts: { pt: "Alertas operacionais", en: "Operational alerts" },
  get_education_summary: { pt: "Resumo escolar", en: "Education summary" },
  get_financial_operational_summary: { pt: "Resumo financeiro operacional", en: "Operational financial summary" },
  get_lab_request_collection_guidance: { pt: "Orientação de colheita", en: "Collection guidance" },
  get_nursing_pending_work: { pt: "Pendências de enfermagem", en: "Pending nursing work" },
  get_pharmacy_stock_summary: { pt: "Resumo de stock da farmácia", en: "Pharmacy stock summary" },
  get_project_identity: { pt: "Identidade do projecto", en: "Project identity" },
  get_user_context: { pt: "Contexto do utilizador", en: "User context" },
  prepare_crud_operation: { pt: "Preparar operação CRUD", en: "Prepare CRUD operation" },
  prepare_operational_report: { pt: "Preparar relatório", en: "Prepare report" },
  prepare_operational_task: { pt: "Preparar tarefa", en: "Prepare task" },
  run_sql_analytics: { pt: "Pesquisa SQL analítica", en: "SQL analytics" },
}

const SOURCE_TYPE_LABELS: Record<string, { pt: string; en: string }> = {
  action: { pt: "Acção", en: "Action" },
  endpoint: { pt: "Endpoint", en: "Endpoint" },
  investigation: { pt: "Investigação", en: "Investigation" },
  knowledge_base: { pt: "Base prevista", en: "Predicted knowledge base" },
  model: { pt: "Modelo", en: "Model" },
  policy: { pt: "Política", en: "Policy" },
  report: { pt: "Relatório", en: "Report" },
  session: { pt: "Sessão", en: "Session" },
  task: { pt: "Tarefa", en: "Task" },
  workflow: { pt: "Fluxo", en: "Workflow" },
}

const STEP_KIND_LABELS: Record<string, { pt: string; en: string }> = {
  action: { pt: "Acção", en: "Action" },
  follow_up: { pt: "Seguimento", en: "Follow up" },
  navigation: { pt: "Navegação", en: "Navigation" },
  rbac: { pt: "Permissões", en: "Permissions" },
}

const PRIORITY_LABELS: Record<string, { pt: string; en: string }> = {
  critical: { pt: "Crítica", en: "Critical" },
  high: { pt: "Alta", en: "High" },
  low: { pt: "Baixa", en: "Low" },
  normal: { pt: "Normal", en: "Normal" },
}

const SCOPE_KEY_LABELS: Record<string, { pt: string; en: string }> = {
  active_module: { pt: "Módulo activo", en: "Active module" },
  blocked_count: { pt: "Bloqueios", en: "Blocked count" },
  language: { pt: "Idioma", en: "Language" },
  tool_count: { pt: "Ferramentas usadas", en: "Tool count" },
}

const SEVERITY_LABELS: Record<string, { pt: string; en: string }> = {
  critical: { pt: "Crítico", en: "Critical" },
  danger: { pt: "Crítico", en: "Danger" },
  info: { pt: "Info", en: "Info" },
  warning: { pt: "Alerta", en: "Warning" },
}

function resolveLabel(
  value: string | undefined,
  labels: Record<string, { pt: string; en: string }>,
  language: "pt" | "en"
) {
  const normalized = String(value || "").trim().toLowerCase()
  const match = labels[normalized]
  if (match) return language === "en" ? match.en : match.pt
  return humanizeAiToken(value)
}

export function translateAiIntentLabel(value?: string, language: "pt" | "en" = "pt") {
  return resolveLabel(value, INTENT_LABELS, language)
}

export function translateAiStatusLabel(value?: string, language: "pt" | "en" = "pt") {
  return resolveLabel(value, STATUS_LABELS, language)
}

export function translateAiToolName(value?: string, language: "pt" | "en" = "pt") {
  return resolveLabel(value, TOOL_LABELS, language)
}

export function translateAiSourceTypeLabel(value?: string, language: "pt" | "en" = "pt") {
  return resolveLabel(value, SOURCE_TYPE_LABELS, language)
}

export function translateAiStepKindLabel(value?: string, language: "pt" | "en" = "pt") {
  return resolveLabel(value, STEP_KIND_LABELS, language)
}

export function translateAiPriorityLabel(value?: string, language: "pt" | "en" = "pt") {
  return resolveLabel(value, PRIORITY_LABELS, language)
}

export function translateAiScopeKeyLabel(value?: string, language: "pt" | "en" = "pt") {
  return resolveLabel(value, SCOPE_KEY_LABELS, language)
}

export function translateAiSeverityLabel(value?: string, language: "pt" | "en" = "pt") {
  return resolveLabel(value, SEVERITY_LABELS, language)
}
