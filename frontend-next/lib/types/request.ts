export type Requisicao = {
  id: number
  id_custom?: string
  tipo?: "LAB" | "MED"
  paciente?: number
  paciente_nome?: string
  paciente_codigo?: string
  empresa_solicitante?: number | null
  empresa_solicitante_nome?: string | null
  empresa_executora_externa?: number | null
  empresa_executora_externa_nome?: string | null
  analista?: number | null
  exames?: number[]
  exames_medicos?: number[]
  itens?: RequisicaoItemResumo[]
  estado?: string
  status_clinico?: string
  possui_resultado_critico?: boolean
  criado_em?: string
  atualizado_em?: string
}

export type RequisicaoItemResumo = {
  id: number
  id_custom?: string
  exame?: number | null
  exame_nome?: string
  exame_medico?: number | null
  exame_medico_nome?: string
}

export type ResultadoItem = {
  id: number
  requisicao?: number
  exame_campo?: number
  resultado?: string
  valor?: string | number | null
  estado?: string
}

export type RequisicaoCreateDTO = {
  paciente: number
  tipo?: "LAB" | "MED"
  exames?: number[]
  exames_medicos?: number[]
  status_clinico?: string
  empresa_solicitante?: number | null
  empresa_executora_externa?: number | null
}

export type RequisicaoUpdateDTO = Partial<{
  // paciente e tipo são imutáveis no backend.
  exames: number[]
  exames_medicos: number[]
  analista: number | null
  estado: string
  status_clinico: string
}>
