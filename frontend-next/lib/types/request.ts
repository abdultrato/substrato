export type RequestItemSummary = {
  id: number
  custom_id?: string
  position?: number
  exam?: number | null
  exam_name?: string
  medical_exam?: number | null
  medical_exam_name?: string
} & Partial<{
  id_custom: string
  posicao: number
  exame: number | null
  exame_nome: string
  exame_medico: number | null
  exame_medico_nome: string
}>

export type ResultItem = {
  id: number
  position?: number
  request?: number
  exam_field?: number
  exam_field_position?: number
  result?: string
  value?: string | number | null
  status?: string
} & Partial<{
  posicao: number
  requisicao: number
  exame_campo: number
  exame_campo_posicao: number
  resultado: string
  valor: string | number | null
  estado: string
}>

export type Request = {
  id: number
  custom_id?: string
  type?: "LAB" | "MED"
  patient?: number
  patient_name?: string
  patient_code?: string
  requesting_company?: number | null
  requesting_company_name?: string | null
  external_executing_company?: number | null
  external_executing_company_name?: string | null
  analyst?: number | null
  exams?: number[]
  medical_exams?: number[]
  items?: RequestItemSummary[]
  status?: string
  clinical_status?: string
  clinical_status_display?: string
  has_critical_result?: boolean
  created_at?: string
  updated_at?: string
} & Partial<{
  id_custom: string
  tipo: "LAB" | "MED"
  paciente: number
  paciente_nome: string
  paciente_codigo: string
  empresa_solicitante: number | null
  empresa_solicitante_nome: string | null
  empresa_executora_externa: number | null
  empresa_executora_externa_nome: string | null
  analista: number | null
  exames: number[]
  exames_medicos: number[]
  itens: RequestItemSummary[]
  estado: string
  status_clinico: string
  clinical_status_display: string
  prioridade_display: string
  possui_resultado_critico: boolean
  criado_em: string
  atualizado_em: string
}>

export type RequestCreateDTO = {
  patient: number
  type?: "LAB" | "MED"
  exams?: number[]
  medical_exams?: number[]
  clinical_status?: string
  requesting_company?: number | null
  external_executing_company?: number | null
} & Partial<{
  paciente: number
  tipo: "LAB" | "MED"
  exames_medicos: number[]
  status_clinico: string
  empresa_solicitante: number | null
  empresa_executora_externa: number | null
}>

export type RequestUpdateDTO = Partial<{
  exams: number[]
  medical_exams: number[]
  analyst: number | null
  status: string
  clinical_status: string
  exames_medicos: number[]
  analista: number | null
  estado: string
  status_clinico: string
}>

export type Requisicao = Request
export type RequisicaoItemResumo = RequestItemSummary
export type RequisicaoCreateDTO = RequestCreateDTO
export type RequisicaoUpdateDTO = RequestUpdateDTO
