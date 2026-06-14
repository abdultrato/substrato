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

/** Devolve a config de colunas para o endpoint, ou null se não houver. */
export function getListColumnConfig(endpoint: string): ListColumnConfig | null {
  const normalized = normalize(endpoint)
  if (PATIENT_ENDPOINTS.has(normalized)) return PATIENT_CONFIG
  return null
}
