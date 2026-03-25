export type Entity = {
  id: number
  custom_id?: string
  name: string
  headquarters_address?: string
  contacts?: string
  phone_1?: string
  phone_2?: string
  email?: string
  tax_id?: string
  bank_account?: string
  notes?: string
  active?: boolean
} & Partial<{
  id_custom: string
  nome: string
  endereco_sede: string
  contactos: string
  telefone1: string
  telefone2: string
  nuit: string
  nib: string
  observacoes: string
  ativo: boolean
}>

export type EntityCreateDTO = Partial<Omit<Entity, "id">> & {
  name?: string
  nome?: string
}
export type EntityUpdateDTO = Partial<EntityCreateDTO>

export type EntityList = Entity
export type Entidade = Entity
export type EntidadeList = EntityList
export type EntidadeCreateDTO = EntityCreateDTO
export type EntidadeUpdateDTO = EntityUpdateDTO
