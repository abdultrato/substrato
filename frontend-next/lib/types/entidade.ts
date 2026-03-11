export type Entidade = {
  id: number
  nome: string
  nif?: string
  slogan?: string
  endereco_sede?: string
  telefone1?: string
  telefone2?: string
  email?: string
  nuit?: string
  ativo?: boolean
}

export type EntidadeCreateDTO = Omit<Entidade, 'id'>
export type EntidadeUpdateDTO = Partial<EntidadeCreateDTO>
