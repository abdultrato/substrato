export type Entidade = {
  id: number
  id_custom?: string
  nome: string
  endereco_sede?: string
  contactos?: string
  telefone1?: string
  telefone2?: string
  email?: string
  nuit?: string
  nib?: string
  observacoes?: string
  ativo?: boolean
}

export type EntidadeCreateDTO = Omit<Entidade, 'id'>
export type EntidadeUpdateDTO = Partial<EntidadeCreateDTO>
