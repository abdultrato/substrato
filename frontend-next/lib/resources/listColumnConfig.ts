/**
 * Configuração de colunas por recurso para as listagens genéricas
 * (ResourceListPage). Permite esconder colunas técnicas/redundantes e
 * renomear cabeçalhos sem alterar a tabela genérica nem o backend.
 */

export type ListColumnConfig = {
  /** Campos (case-insensitive) a ocultar da listagem. */
  hidden: Set<string>
  /** Sobreposição de rótulos por campo (case-insensitive). */
  labels: Record<string, string>
  /** Rótulo alternativo para a coluna de código/identificador. */
  codeHeader?: string
}

function normalize(endpoint: string): string {
  const clean = String(endpoint || "").split("?")[0].split("#")[0].trim()
  const prefixed = clean.startsWith("/") ? clean : `/${clean}`
  return (prefixed.endsWith("/") ? prefixed : `${prefixed}/`).toLowerCase()
}

// Variantes de endpoint que apontam para o mesmo recurso "paciente".
const PATIENT_ENDPOINTS = new Set(["/clinical/patient/", "/clinical/patients/", "/patients/"])

const PATIENT_CONFIG: ListColumnConfig = {
  codeHeader: "Ordem de entrada",
  labels: {
    origin_company: "Nome da empresa de proveniência",
    address: "Endereço",
    provenance: "Proveniência",
  },
  hidden: new Set([
    // Técnico
    "id",
    "tenant",
    "unidade",
    "version",
    "versao",
    "created_by",
    "criado_por",
    "updated_by",
    "atualizado_por",
    // Sangue / doador — irrelevante na listagem de pacientes
    "blood_type",
    "is_replacement_donor_inapt",
    "replacement_donor_inapt_at",
    "replacement_donor_inapt_reason",
    // Morada estruturada (redundante com o resumo "address")
    "address_street",
    "address_number",
    "address_neighborhood",
    "address_city",
    "address_province",
    "address_postal_code",
    "address_country",
    "address_complement",
  ]),
}

// Variantes de endpoint que apontam para o mesmo recurso "fatura".
const INVOICE_ENDPOINTS = new Set([
  "/billing/invoices/",
  "/billing/invoice/",
  "/invoices/",
])

const INVOICE_CONFIG: ListColumnConfig = {
  codeHeader: "N.º fatura",
  labels: {
    status: "Estado",
    patient: "Paciente",
    fiscal_client_name: "Cliente fiscal",
    origin: "Origem",
    subtotal: "Subtotal (s/ IVA)",
    vat_amount: "IVA",
    total_a_pagar: "Total a pagar",
    patient_amount: "Valor do paciente",
    insurance_amount: "Valor do seguro",
    created_at: "Criado em",
  },
  hidden: new Set([
    // Técnico / interno
    "id",
    "tenant",
    "unidade",
    "instituicao",
    "instituição",
    "version",
    "versao",
    "created_by",
    "criado_por",
    "updated_by",
    "atualizado_por",
    "updated_at",
    "atualizado_em",
    "criado_em",
    "created_by_name",
    "criado_por_nome",
    "created_by_department",
    "criado_por_departamento",
    "billed_item_sectors",
    "setores_itens_faturados",
    "verification_hash",
    "id_custom",
    // Origens/FKs de origem (redundantes com "Origem")
    "request",
    "requisicao",
    "requisição",
    "sale",
    "venda",
    "procedure",
    "procedimento",
    "procedures",
    "procedimentos",
    "consultation",
    "consulta",
    "consulta_medica",
    "consultations",
    "consultas",
    "surgery",
    "cirurgia",
    // Cliente fiscal: mantém só o nome
    "fiscal_client",
    "fiscal_client_nuit",
    "fiscal_client_address",
    // Estado (duplicados PT)
    "estado",
    "estado_fatura",
    "estado_factura",
    // Origem (duplicados PT)
    "origem",
    "origem_fatura",
    "origem_factura",
    // Paciente (duplicado PT) e valores duplicados
    "paciente",
    "valor_paciente",
    // IVA (duplicados PT)
    "iva",
    "iva_valor",
    // Seguro (duplicados PT)
    "seguro",
    "desconto_seguro",
    "valor_seguro",
    // Totais duplicados — mantém apenas "Total a pagar"
    "total",
    "total_com_iva",
    "valor_total",
    "valor_a_pagar",
    "subtotal_sem_iva",
    "total_sem_iva",
  ]),
}

/** Devolve a config de colunas para o endpoint, ou null se não houver. */
export function getListColumnConfig(endpoint: string): ListColumnConfig | null {
  const normalized = normalize(endpoint)
  if (PATIENT_ENDPOINTS.has(normalized)) return PATIENT_CONFIG
  if (INVOICE_ENDPOINTS.has(normalized)) return INVOICE_CONFIG
  return null
}
