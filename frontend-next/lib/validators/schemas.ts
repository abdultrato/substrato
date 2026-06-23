/**
 * Schemas de validação Zod para os tipos da API
 * Fornece validação em tempo de compilação + runtime
 */

import { z } from 'zod'

const GeneroEnum = z.enum(['M', 'F'])
const RacaOrigemEnum = z.enum(['Branca', 'Negra', 'Parda', 'Amarela', 'Indígena', 'Outro'])
const TipoDocumentoEnum = z.enum(['BI', 'PASS', 'DIRE', 'CC', 'NUIT', 'CE', 'CN', 'OUT'])
const ProvenienciaEnum = z.enum([
  'Ambulatório',
  'Clínica Externa',
  'Medicina Ocupacional',
  'Maternidade',
  'Ginecologia',
  'Pediatria',
  'Banco de Socorros',
  'Consulta Externa',
  'Urologia',
  'Cirurgia',
  'Dentária',
  'Oftalmologia',
  'Doação de Sangue',
  'Outro',
])

/**
 * Schema para Paciente alinhado ao OpenAPI
 */
export const PacienteSchema = z
  .object({
    id: z.number().int().optional(),
    empresa_origem_nome: z.string().optional(),
    criado_em: z.string().datetime().optional(),
    atualizado_em: z.string().datetime().optional(),
    id_custom: z.string().optional().nullable(),
    deletado: z.boolean().optional(),
    deletado_em: z.string().datetime().nullable().optional(),
    versao: z.number().optional(),
    nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome não pode ter mais de 255 caracteres'),
    gestante: z.boolean().optional(),
    idade_gestacional_semanas: z.number().int().nullable().optional(),
    data_nascimento: z.string().optional().nullable().refine((v) => {
      if (v == null) return true
      return /^\d{4}-\d{2}-\d{2}$/.test(v)
    }, { message: 'Data de nascimento inválida' }),
    genero: GeneroEnum.optional().nullable(),
    raca_origem: RacaOrigemEnum.optional(),
    tipo_documento: TipoDocumentoEnum.optional(),
    numero_id: z.string().nullable().optional(),
    endereco_rua: z.string().optional(),
    endereco_numero: z.string().optional(),
    endereco_bairro: z.string().optional(),
    endereco_cidade: z.string().optional(),
    endereco_provincia: z.string().optional(),
    endereco_codigo_postal: z.string().optional(),
    endereco_pais: z.string().length(2).or(z.literal('')).optional(),
    endereco_complemento: z.string().optional(),
    morada: z.string().optional(),
    contacto: z.string().nullable().optional(),
    email: z.string().email('Email inválido').nullable().optional(),
    nome_acompanhante: z.string().optional(),
    parentesco_acompanhante: z.string().optional(),
    telefone_acompanhante: z.string().optional(),
    contacto_acompanhante: z.string().optional(),
    email_acompanhante: z.string().email('Email do acompanhante inválido').nullable().optional(),
    companion_name: z.string().optional(),
    companion_relationship: z.string().optional(),
    companion_contact: z.string().optional(),
    companion_email: z.string().email('Email do acompanhante inválido').nullable().optional(),
    proveniencia: ProvenienciaEnum.or(z.literal('')).optional(),
    criado_por: z.number().int().nullable().optional(),
    atualizado_por: z.number().int().nullable().optional(),
    inquilino: z.number().int().optional(),
    deletado_por: z.number().int().nullable().optional(),
    empresa_origem: z.number().int().nullable().optional(),
  })
  .strict()

/**
 * Type inferido do schema (sempre sincronizado com Zod)
 */
export type Paciente = z.infer<typeof PacienteSchema>

/**
 * Schema para criar novo paciente (sem id, sem criado_em)
 */
export const PacienteCreateSchema = PacienteSchema.omit({
  id: true,
  criado_em: true,
}).strict()

export type PacienteCreate = z.infer<typeof PacienteCreateSchema>

/**
 * Schema para atualizar paciente (tudo opcional)
 */
export const PacienteUpdateSchema = PacienteCreateSchema.partial()

export type PacienteUpdate = z.infer<typeof PacienteUpdateSchema>

/**
 * Schema para Exame
 */
export const ExameSchema = z.object({
  id: z.number().int().readonly(),
  nome: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(255, 'Nome não pode ter mais de 255 caracteres'),
  codigo: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
})

export type Exame = z.infer<typeof ExameSchema>

export const ExameCreateSchema = ExameSchema.omit({ id: true })
export type ExameCreate = z.infer<typeof ExameCreateSchema>

export const ExameUpdateSchema = ExameCreateSchema.partial()
export type ExameUpdate = z.infer<typeof ExameUpdateSchema>

/**
 * Schema para Requisição de Análise
 */
export const RequisicaoAnaliseSchema = z.object({
  id: z.number().int().readonly(),
  paciente: z
    .number()
    .int('Paciente deve ser um ID válido'),
  data_requisicao: z
    .string()
    .datetime('Data deve ser um datetime válido'),
  status: z
    .union([
      z.literal('pendente'),
      z.literal('processada'),
      z.literal('completa'),
      z.literal('cancelada'),
    ]),
  criado_em: z.string().datetime().readonly().optional(),
})

export type RequisicaoAnalise = z.infer<typeof RequisicaoAnaliseSchema>

export const RequisicaoAnaliseCreateSchema = RequisicaoAnaliseSchema.omit({
  id: true,
  criado_em: true,
})
export type RequisicaoAnaliseCreate = z.infer<
  typeof RequisicaoAnaliseCreateSchema
>

export const RequisicaoAnaliseUpdateSchema = RequisicaoAnaliseCreateSchema.partial()
export type RequisicaoAnaliseUpdate = z.infer<typeof RequisicaoAnaliseUpdateSchema>

/**
 * Schema mínimo para Invoice (faturamento)
 */
export const InvoiceSchema = z.object({
  id: z.number().int().readonly(),
  custom_id: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  total: z.string().optional().nullable(),
  total_a_pagar: z.string().optional().nullable(),
  patient: z.number().int().optional().nullable(),
})
export type Invoice = z.infer<typeof InvoiceSchema>

/**
 * Schema mínimo para Payment
 */
export const PaymentSchema = z.object({
  id: z.number().int().readonly(),
  invoice: z.number().int().optional().nullable(),
  amount: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  method: z.string().optional().nullable(),
})
export type Payment = z.infer<typeof PaymentSchema>

/**
 * Schema mínimo para Check-in de recepção
 */
export const CheckinSchema = z.object({
  id: z.number().int().readonly(),
  patient: z.number().int().optional().nullable(),
  status: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
})
export type Checkin = z.infer<typeof CheckinSchema>

/**
 * Schema mínimo para ordens de integração de equipamentos
 */
export const IntegrationOrderSchema = z.object({
  id: z.number().int().readonly(),
  custom_id: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  request: z.number().int().optional().nullable(),
})
export type IntegrationOrder = z.infer<typeof IntegrationOrderSchema>

/**
 * Schema para Resposta de Token (Login)
 */
export const TokenResponseSchema = z.object({
  access: z.string().min(1, 'Access token é obrigatório'),
  refresh: z.string().min(1, 'Refresh token é obrigatório'),
})

export type TokenResponse = z.infer<typeof TokenResponseSchema>

/**
 * Schema para Erro Padronizado (RFC 7807)
 */
export const ErrorResponseSchema = z.object({
  type: z.string().optional(),
  status: z.number().int(),
  title: z.string(),
  detail: z.string(),
  instance: z.string().optional(),
  code: z.string().optional(),
})

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

/**
 * Consultas
 */
export const ConsultationSchema = z.object({
  id: z.number().int().readonly(),
  patient: z.number().int().optional().nullable(),
  doctor: z.number().int().optional().nullable(),
  scheduled_at: z.string().datetime().optional().nullable(),
  status: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})
export type Consultation = z.infer<typeof ConsultationSchema>

export const DoctorSchema = z.object({
  id: z.number().int().readonly(),
  name: z.string().optional().nullable(),
  specialty: z.number().int().optional().nullable(),
  license: z.string().optional().nullable(),
})
export type Doctor = z.infer<typeof DoctorSchema>

export const SpecialtySchema = z.object({
  id: z.number().int().readonly(),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})
export type Specialty = z.infer<typeof SpecialtySchema>

export const HolidaySchema = z.object({
  id: z.number().int().readonly(),
  date: z.string().date().optional().nullable(),
  description: z.string().optional().nullable(),
})
export type Holiday = z.infer<typeof HolidaySchema>

/**
 * Recepção
 */
export const WorkspaceSchema = z.object({
  id: z.number().int().readonly(),
  name: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
})
export type Workspace = z.infer<typeof WorkspaceSchema>

export const ReceptionCareSchema = z.object({
  id: z.number().int().readonly(),
  patient: z.number().int().optional().nullable(),
  checkin: z.number().int().optional().nullable(),
  status: z.string().optional().nullable(),
})
export type ReceptionCare = z.infer<typeof ReceptionCareSchema>

/**
 * Pagamentos
 */
export const ReceiptSchema = z.object({
  id: z.number().int().readonly(),
  invoice: z.number().int().optional().nullable(),
  amount: z.string().optional().nullable(),
  pdf: z.string().url().optional().nullable(),
})
export type Receipt = z.infer<typeof ReceiptSchema>

export const TransactionSchema = z.object({
  id: z.number().int().readonly(),
  payment: z.number().int().optional().nullable(),
  status: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
})
export type Transaction = z.infer<typeof TransactionSchema>

export const ReconciliationSchema = z.object({
  id: z.number().int().readonly(),
  status: z.string().optional().nullable(),
  total: z.string().optional().nullable(),
  processed_at: z.string().datetime().optional().nullable(),
})
export type Reconciliation = z.infer<typeof ReconciliationSchema>

/**
 * Inquilinos (Tenants)
 */
export const TenantSchema = z.object({
  id: z.number().int().readonly(),
  name: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
})
export type Tenant = z.infer<typeof TenantSchema>

export const TenantPlanSchema = z.object({
  id: z.number().int().readonly(),
  name: z.string().optional().nullable(),
  price: z.string().optional().nullable(),
})
export type TenantPlan = z.infer<typeof TenantPlanSchema>

export const TenantConfigSchema = z.object({
  id: z.number().int().readonly(),
  tenant: z.number().int().optional().nullable(),
  key: z.string().optional().nullable(),
  value: z.any().optional(),
})
export type TenantConfig = z.infer<typeof TenantConfigSchema>

export const FeatureFlagTenantSchema = z.object({
  id: z.number().int().readonly(),
  tenant: z.number().int().optional().nullable(),
  flag: z.string().optional().nullable(),
  enabled: z.boolean().optional().nullable(),
})
export type FeatureFlagTenant = z.infer<typeof FeatureFlagTenantSchema>

/**
 * Seguradora
 */
export const InsurerSchema = z.object({
  id: z.number().int().readonly(),
  name: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  active: z.boolean().optional().nullable(),
})
export type Insurer = z.infer<typeof InsurerSchema>

export const CoveragePlanSchema = z.object({
  id: z.number().int().readonly(),
  insurer: z.number().int().optional().nullable(),
  name: z.string().optional().nullable(),
  coverage: z.string().optional().nullable(),
})
export type CoveragePlan = z.infer<typeof CoveragePlanSchema>

export const AuthorizationProcedureSchema = z.object({
  id: z.number().int().readonly(),
  insurer: z.number().int().optional().nullable(),
  patient: z.number().int().optional().nullable(),
  procedure: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
})
export type AuthorizationProcedure = z.infer<typeof AuthorizationProcedureSchema>

/**
 * Farmácia
 */
export const PharmacyProductSchema = z.object({
  id: z.number().int().readonly(),
  nome: z.string().optional().nullable(),
  codigo: z.string().optional().nullable(),
  estoque_atual: z.number().optional().nullable(),
})
export type PharmacyProduct = z.infer<typeof PharmacyProductSchema>

const PharmacyInventoryMovementTypeEnum = z.enum(['ENT', 'SAI', 'AJU'])
const PharmacyInventoryMovementOriginEnum = z.enum(['VEND', 'PROC', 'AJUS'])

export const PharmacyLotSchema = z.object({
  id: z.number().int().readonly().optional(),
  criado_em: z.string().datetime().readonly().optional(),
  atualizado_em: z.string().datetime().readonly().optional(),
  id_custom: z.string().optional().nullable(),
  deletado: z.boolean().optional(),
  deletado_em: z.string().datetime().optional().nullable(),
  versao: z.number().optional(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  numero_lote: z.string().min(1, 'Número do lote é obrigatório'),
  validade: z.string().date('Validade deve estar em YYYY-MM-DD'),
  quantidade_inicial: z.number(),
  criado_por: z.number().int().optional().nullable(),
  atualizado_por: z.number().int().optional().nullable(),
  inquilino: z.number().int(),
  deletado_por: z.number().int().optional().nullable(),
  produto: z.number().int(),
}).strict()
export type PharmacyLot = z.infer<typeof PharmacyLotSchema>

export const PharmacyInventoryMovementSchema = z.object({
  id: z.number().int().readonly().optional(),
  criado_em: z.string().datetime().readonly().optional(),
  atualizado_em: z.string().datetime().readonly().optional(),
  id_custom: z.string().optional().nullable(),
  deletado: z.boolean().optional(),
  deletado_em: z.string().datetime().optional().nullable(),
  versao: z.number().optional(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipo: PharmacyInventoryMovementTypeEnum,
  origem: PharmacyInventoryMovementOriginEnum.optional(),
  quantidade: z.number(),
  criado_por: z.number().int().optional().nullable(),
  atualizado_por: z.number().int().optional().nullable(),
  inquilino: z.number().int(),
  deletado_por: z.number().int().optional().nullable(),
  lote: z.number().int(),
  item_venda: z.number().int().optional().nullable(),
}).strict()
export type PharmacyInventoryMovement = z.infer<typeof PharmacyInventoryMovementSchema>

export const PharmacySaleSchema = z.object({
  id: z.number().int().readonly().optional(),
  criado_em: z.string().datetime().readonly().optional(),
  atualizado_em: z.string().datetime().readonly().optional(),
  id_custom: z.string().optional().nullable(),
  deletado: z.boolean().optional(),
  deletado_em: z.string().datetime().optional().nullable(),
  versao: z.number().optional(),
  numero: z.string().min(1, 'Número é obrigatório'),
  total: z.string().optional().nullable(),
  criado_por: z.number().int().optional().nullable(),
  atualizado_por: z.number().int().optional().nullable(),
  inquilino: z.number().int(),
  deletado_por: z.number().int().optional().nullable(),
  paciente: z.number().int().optional().nullable(),
}).strict()
export type PharmacySale = z.infer<typeof PharmacySaleSchema>

export const PharmacySaleItemSchema = z.object({
  id: z.number().int().readonly().optional(),
  criado_em: z.string().datetime().readonly().optional(),
  atualizado_em: z.string().datetime().readonly().optional(),
  id_custom: z.string().optional().nullable(),
  deletado: z.boolean().optional(),
  deletado_em: z.string().datetime().optional().nullable(),
  versao: z.number().optional(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  quantidade: z.number(),
  preco_unitario: z.string().optional().nullable(),
  criado_por: z.number().int().optional().nullable(),
  atualizado_por: z.number().int().optional().nullable(),
  inquilino: z.number().int(),
  deletado_por: z.number().int().optional().nullable(),
  venda: z.number().int(),
  produto: z.number().int(),
}).strict()
export type PharmacySaleItem = z.infer<typeof PharmacySaleItemSchema>

/**
 * Nursing
 */
export const NursingEvolutionSchema = z.object({
  id: z.number().int().readonly(),
  paciente: z.number().int().optional().nullable(),
  anotacao: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
})
export type NursingEvolution = z.infer<typeof NursingEvolutionSchema>

export const NursingProcedureSchema = z.object({
  id: z.number().int().readonly(),
  paciente: z.number().int().optional().nullable(),
  catalogo: z.number().int().optional().nullable(),
  status: z.string().optional().nullable(),
})
export type NursingProcedure = z.infer<typeof NursingProcedureSchema>

export const NursingProcedureCatalogSchema = z.object({
  id: z.number().int().readonly(),
  nome: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
})
export type NursingProcedureCatalog = z.infer<typeof NursingProcedureCatalogSchema>

export const NursingProcedureItemSchema = z.object({
  id: z.number().int().readonly(),
  procedimento: z.number().int().optional().nullable(),
  nome: z.string().optional().nullable(),
  quantidade: z.number().optional().nullable(),
})
export type NursingProcedureItem = z.infer<typeof NursingProcedureItemSchema>

export const NursingProcedureItemValueSchema = z.object({
  id: z.number().int().readonly(),
  procedimento_item: z.number().int().optional().nullable(),
  valor: z.string().optional().nullable(),
})
export type NursingProcedureItemValue = z.infer<typeof NursingProcedureItemValueSchema>

export const NursingProcedureMaterialSchema = z.object({
  id: z.number().int().readonly(),
  procedimento: z.number().int().optional().nullable(),
  material: z.number().int().optional().nullable(),
  quantidade: z.number().optional().nullable(),
})
export type NursingProcedureMaterial = z.infer<typeof NursingProcedureMaterialSchema>

export const NursingProcedureMaterialValueSchema = z.object({
  id: z.number().int().readonly(),
  procedimento_material: z.number().int().optional().nullable(),
  valor: z.string().optional().nullable(),
})
export type NursingProcedureMaterialValue = z.infer<typeof NursingProcedureMaterialValueSchema>

export const NursingPrescriptionSchema = z.object({
  id: z.number().int().readonly(),
  paciente: z.number().int().optional().nullable(),
  observacao: z.string().optional().nullable(),
})
export type NursingPrescription = z.infer<typeof NursingPrescriptionSchema>

export const NursingRecordSchema = z.object({
  id: z.number().int().readonly(),
  paciente: z.number().int().optional().nullable(),
  descricao: z.string().optional().nullable(),
})
export type NursingRecord = z.infer<typeof NursingRecordSchema>

export const NursingVitalSignSchema = z.object({
  id: z.number().int().readonly(),
  paciente: z.number().int().optional().nullable(),
  tipo: z.string().optional().nullable(),
  valor: z.string().optional().nullable(),
})
export type NursingVitalSign = z.infer<typeof NursingVitalSignSchema>

export const WardSchema = z.object({
  id: z.number().int().readonly(),
  nome: z.string().optional().nullable(),
  capacidade: z.number().optional().nullable(),
})
export type Ward = z.infer<typeof WardSchema>

export const WardBedSchema = z.object({
  id: z.number().int().readonly(),
  enfermaria: z.number().int().optional().nullable(),
  codigo: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
})
export type WardBed = z.infer<typeof WardBedSchema>

export const WardAdmissionSchema = z.object({
  id: z.number().int().readonly().optional(),
  paciente_nome: z.string().optional(),
  cama_numero: z.string().optional(),
  enfermaria_nome: z.string().optional(),
  criado_em: z.string().datetime().readonly().optional(),
  atualizado_em: z.string().datetime().readonly().optional(),
  id_custom: z.string().optional().nullable(),
  deletado: z.boolean().optional(),
  deletado_em: z.string().datetime().optional().nullable(),
  versao: z.number().optional(),
  tempo_estimado_observacao_horas: z.number().optional().nullable(),
  data_internamento: z.string().datetime().optional(),
  data_prevista_alta: z.string().datetime().optional().nullable(),
  alta_em: z.string().datetime().optional().nullable(),
  proxima_medicacao_em: z.string().datetime().optional().nullable(),
  proxima_medicacao_descricao: z.string().optional(),
  ativo: z.boolean().optional(),
  observacoes: z.string().optional(),
  criado_por: z.number().int().optional().nullable(),
  atualizado_por: z.number().int().optional().nullable(),
  inquilino: z.number().int(),
  deletado_por: z.number().int().optional().nullable(),
  cama: z.number().int(),
  paciente: z.number().int(),
}).strict()
export type WardAdmission = z.infer<typeof WardAdmissionSchema>

/**
 * Validador helper - valida dados contra schema e retorna resultado
 */
export function validatePaciente(data: unknown) {
  return PacienteSchema.safeParse(data)
}

export function validateExame(data: unknown) {
  return ExameSchema.safeParse(data)
}

export function validateRequisicao(data: unknown) {
  return RequisicaoAnaliseSchema.safeParse(data)
}

/**
 * Lança erro se validação falhar
 */
export function validatePacienteThrow(data: unknown) {
  return PacienteSchema.parse(data)
}

export function validateExameThrow(data: unknown) {
  return ExameSchema.parse(data)
}

export function validateRequisicaoThrow(data: unknown) {
  return RequisicaoAnaliseSchema.parse(data)
}

/**
 * Extrai mensagens de erro por campo
 */
export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const messages: Record<string, string> = {}

  error.issues.forEach(err => {
    const path = err.path.join('.')
    messages[path] = err.message
  })

  return messages
}
