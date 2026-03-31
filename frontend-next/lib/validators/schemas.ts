/**
 * Schemas de validação Zod para os tipos da API
 * Fornece validação em tempo de compilação + runtime
 */

import { z } from 'zod'

/**
 * Schema para Paciente
 * Valida e infere tipo com Zod
 */
export const PacienteSchema = z.object({
  id: z.number().int().readonly(),
  id_custom: z.string().optional().nullable(),
  nome: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(255, 'Nome não pode ter mais de 255 caracteres'),
  email: z
    .string()
    .email('Email inválido')
    .optional()
    .nullable(),
  data_nascimento: z
    .string()
    .date('Data de nascimento deve ser no formato YYYY-MM-DD')
    .optional()
    .nullable(),
  genero: z
    .union([z.literal('M'), z.literal('F')])
    .optional()
    .nullable(),
  raca_origem: z.string().optional().nullable(),
  tipo_documento: z.string().optional().nullable(),
  numero_id: z.string().optional().nullable(),
  contacto: z
    .string()
    .optional()
    .nullable(),
  morada: z.string().optional().nullable(),
  proveniencia: z.string().optional().nullable(),
  criado_em: z.string().datetime().readonly().optional(),
})

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
