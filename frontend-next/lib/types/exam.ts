export type ExamField = {
  id: number
  custom_id?: string
  exam?: number
  name?: string
  type?: string
  unit?: string
  reference_min?: string | number | null
  reference_max?: string | number | null
  critical_min?: string | number | null
  critical_max?: string | number | null
  delta_max?: string | number | null
  created_at?: string
} & Partial<{
  id_custom: string
  exame: number
  nome: string
  tipo: string
  unidade: string
  referencia_min: string | number | null
  referencia_max: string | number | null
  critico_min: string | number | null
  critico_max: string | number | null
  delta_max: string | number | null
  criado_em: string
}>

export type Exam = {
  id: number
  name: string
  custom_id?: string
  turnaround_hours?: number
  price?: string | number
  method?: string
  sector?: string
  active?: boolean
  created_at?: string
  updated_at?: string
  allowed_result_types?: string[]
  registered_result_types?: string[]
} & Partial<{
  nome: string
  id_custom: string
  trl_horas: number
  preco: string | number
  metodo: string
  setor: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
  tipos_resultado_permitidos: string[]
  tipos_resultado_cadastrados: string[]
  tipos_result_permitidos: string[]
  tipos_result_cadastrados: string[]
}>

export type MedicalExam = Exam

export type ExameCampo = ExamField
export type Exame = Exam
export type ExameMedico = MedicalExam
