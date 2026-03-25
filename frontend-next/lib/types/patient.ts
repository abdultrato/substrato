export type Patient = {
  id: number
  custom_id?: string
  name: string
  birth_date?: string
  gender?: string
  race_origin?: string
  document_type?: string
  document_number?: string
  contact?: string
  email?: string
  provenance?: string
  address_street?: string
  address_number?: string
  address_neighborhood?: string
  address_city?: string
  address_province?: string
  address_postal_code?: string
  address_country?: string
  address_complement?: string
  address?: string
  origin_company?: number | null
  origin_company_name?: string | null
  created_at?: string
} & Partial<{
  id_custom: string
  nome: string
  data_nascimento: string
  genero: string
  raca_origem: string
  tipo_documento: string
  numero_id: string
  contacto: string
  endereco_rua: string
  endereco_numero: string
  endereco_bairro: string
  endereco_cidade: string
  endereco_provincia: string
  endereco_codigo_postal: string
  endereco_pais: string
  endereco_complemento: string
  morada: string
  empresa_origem: number | null
  empresa_origem_nome: string | null
  criado_em: string
}>

export type PatientCreateDTO = Omit<Patient, "id" | "custom_id" | "origin_company_name" | "created_at">
export type PatientUpdateDTO = Partial<PatientCreateDTO>

export type Paciente = Patient
export type PacienteCreateDTO = PatientCreateDTO
export type PacienteUpdateDTO = PatientUpdateDTO
