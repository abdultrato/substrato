export type Entidade = {
  id: number
  nome: string
  nif?: string
}

export type EntidadeCreateDTO = Omit<Entidade, 'id'>
