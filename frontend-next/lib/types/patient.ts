export type Patient = {
  id: number
  custom_id?: string
  name: string
  birth_date?: string
  gender?: string
  blood_type?: string
  pregnant?: boolean
  gestational_age_weeks?: number | null
  race_origin?: string
  document_type?: string
  document_number?: string
  is_replacement_donor_inapt?: boolean
  replacement_donor_inapt_at?: string | null
  replacement_donor_inapt_reason?: string
  contact?: string
  email?: string
  companion_name?: string
  companion_relationship?: string
  companion_contact?: string
  companion_email?: string | null
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
  is_organ_donor?: boolean
  created_at?: string
} & Partial<{
  id_custom: string
  nome: string
  data_nascimento: string
  genero: string
  tipo_sanguineo: string
  tipo_sanguíneo: string
  gestante: boolean
  gravida: boolean
  grávida: boolean
  idade_gestacional: number | null
  raca_origem: string
  tipo_documento: string
  numero_id: string
  contacto: string
  nome_acompanhante: string
  parentesco_acompanhante: string
  telefone_acompanhante: string
  contacto_acompanhante: string
  email_acompanhante: string | null
  proveniencia: string
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

export type PatientCreateDTO = Partial<
  Omit<Patient, "id" | "custom_id" | "origin_company_name" | "created_at">
> & {
  name?: string
  nome?: string
}
export type PatientUpdateDTO = Partial<PatientCreateDTO>

export type Paciente = Patient
export type PacienteCreateDTO = PatientCreateDTO
export type PacienteUpdateDTO = PatientUpdateDTO
