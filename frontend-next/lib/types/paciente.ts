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
  morada?: string
}

export type PacienteCreateDTO = Omit<Paciente, 'id' | 'id_custom'>
export type PacienteUpdateDTO = Partial<PacienteCreateDTO>
