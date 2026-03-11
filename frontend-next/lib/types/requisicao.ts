export type Requisicao = {
  id: number
  id_custom?: string
  codigo?: string
  paciente_id?: number
  paciente_nome?: string
  exames?: number[]
  exame_ids?: number[]
  status?: string
  observacoes?: string | null
}

export type ResultadoItem = {
  id: number
  requisicao_id: number
  resultado: string
}

export type RequisicaoCreateDTO = Omit<Requisicao, 'id' | 'id_custom'>
export type RequisicaoUpdateDTO = Partial<RequisicaoCreateDTO>
