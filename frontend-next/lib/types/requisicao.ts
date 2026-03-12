export type Requisicao = {
  id: number
  id_custom?: string
  paciente?: number
  analista?: number | null
  exames?: number[]
  estado?: string
  status_clinico?: string
  possui_resultado_critico?: boolean
  criado_em?: string
  atualizado_em?: string
}

export type ResultadoItem = {
  id: number
  requisicao?: number
  exame_campo?: number
  resultado?: string
  valor?: string | number | null
  estado?: string
}

export type RequisicaoCreateDTO = Omit<Requisicao, 'id' | 'id_custom'>
export type RequisicaoUpdateDTO = Partial<RequisicaoCreateDTO>
