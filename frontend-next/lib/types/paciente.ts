export type Paciente = {
  id: number
  id_custom?: string
  nome: string
  data_nascimento?: string
  genero?: string
  raca_origem?: string
  tipo_documento?: string
  numero_id?: string
  contacto?: string
  email?: string
  proveniencia?: string

  endereco_rua?: string
  endereco_numero?: string
  endereco_bairro?: string
  endereco_cidade?: string
  endereco_provincia?: string
  endereco_codigo_postal?: string
  endereco_pais?: string
  endereco_complemento?: string

  morada?: string
  empresa_origem?: number | null
  empresa_origem_nome?: string | null
  criado_em?: string
}

export type PacienteCreateDTO = Omit<Paciente, 'id' | 'id_custom' | 'empresa_origem_nome'>
export type PacienteUpdateDTO = Partial<PacienteCreateDTO>
