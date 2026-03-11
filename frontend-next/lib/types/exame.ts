export type ExameCampo = {
  id?: number
  nome_campo: string
  tipo?: string
  unidade?: string
  valor_referencia?: string
  ordem?: number
}

export type Exame = {
  id: number
  nome: string
  codigo?: string
  preco?: number
  trl_horas?: number
  metodo?: string
  setor?: string
  campos?: ExameCampo[]
  total_campos?: number
}
