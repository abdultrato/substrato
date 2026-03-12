export type ExameCampo = {
  id: number
  id_custom?: string
  exame?: number
  nome?: string
  tipo?: string
  unidade?: string
  referencia_min?: string | number | null
  referencia_max?: string | number | null
  critico_min?: string | number | null
  critico_max?: string | number | null
  delta_max?: string | number | null
  criado_em?: string
}

export type Exame = {
  id: number
  nome: string
  id_custom?: string
  trl_horas?: number
  preco?: string | number
  metodo?: string
  setor?: string
  ativo?: boolean
  criado_em?: string
  atualizado_em?: string
}
