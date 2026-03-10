export type Requisicao = {
  id: number
  codigo?: string
  paciente_id?: number
  exame_ids?: number[]
}

export type ResultadoItem = {
  id: number
  requisicao_id: number
  resultado: string
}
