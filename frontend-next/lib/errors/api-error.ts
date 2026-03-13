/**
 * Tipos e utilitários para tratamento de erros RFC 7807
 * https://tools.ietf.org/html/rfc7807
 */

import { z } from 'zod'

/**
 * Schema Zod para RFC 7807 Problem Details
 */
export const ProblemDetailsSchema = z.object({
  type: z.string().default('about:blank'),
  status: z.number().int(),
  title: z.string(),
  detail: z.string(),
  instance: z.string().optional().nullable(),
  code: z.string(),
  validationErrors: z.record(z.string(), z.string()).optional(),
})

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>

/**
 * Classificação de erros HTTP
 */
export type ErrorCategory = 'validation' | 'auth' | 'notfound' | 'server' | 'unknown'

/**
 * Classe customizada para erros da API
 */
export class ApiError extends Error {
  status: number
  code: string
  instance?: string
  validationErrors?: Record<string, string>
  type: string
  detail: string

  constructor(problem: ProblemDetails) {
    super(problem.detail)
    this.name = 'ApiError'
    this.status = problem.status
    this.code = problem.code
    this.instance = problem.instance || undefined
    this.validationErrors = problem.validationErrors
    this.type = problem.type
    this.detail = problem.detail
  }

  /**
   * Categoriza o erro por tipo
   */
  getCategory(): ErrorCategory {
    switch (this.status) {
      case 400:
        return 'validation'
      case 401:
      case 403:
        return 'auth'
      case 404:
        return 'notfound'
      case 500:
      case 502:
      case 503:
        return 'server'
      default:
        return 'unknown'
    }
  }

  /**
   * Verifica se é erro de validação
   */
  isValidationError(): boolean {
    return this.status === 400 && this.code === 'VALIDATION_ERROR'
  }

  /**
   * Verifica se é erro de autenticação
   */
  isAuthError(): boolean {
    return this.status === 401
  }

  /**
   * Verifica se é erro de autorização
   */
  isAuthzError(): boolean {
    return this.status === 403
  }

  /**
   * Verifica se é erro de recurso não encontrado
   */
  isNotFoundError(): boolean {
    return this.status === 404
  }

  /**
   * Verifica se é erro de rate limit
   */
  isRateLimitError(): boolean {
    return this.status === 429
  }

  /**
   * Verifica se é erro de servidor (5xx)
   */
  isServerError(): boolean {
    return this.status >= 500
  }

  /**
   * Verifica se é erro retentável
   */
  isRetryable(): boolean {
    return this.isServerError() || this.isRateLimitError() || this.status === 408
  }
}

/**
 * Parser de erros HTTP
 */
export function parseApiError(error: unknown): ApiError {
  // Se já é ApiError, retornar
  if (error instanceof ApiError) {
    return error
  }

  // Se é Error normal
  if (error instanceof Error) {
    return new ApiError({
      type: 'about:blank',
      status: 500,
      title: 'Unknown Error',
      detail: error.message,
      code: 'UNKNOWN_ERROR',
    })
  }

  // Se é Response (Fetch API)
  if (error instanceof Response) {
    return new ApiError({
      type: 'about:blank',
      status: error.status,
      title: error.statusText || 'HTTP Error',
      detail: `HTTP ${error.status}: ${error.statusText}`,
      code: 'HTTP_ERROR',
    })
  }

  // Fallback
  return new ApiError({
    type: 'about:blank',
    status: 500,
    title: 'Unknown Error',
    detail: String(error),
    code: 'UNKNOWN_ERROR',
  })
}

/**
 * Valida e parseia erro RFC 7807 do servidor
 */
export async function parseResponseError(response: Response): Promise<ApiError> {
  try {
    const json = await response.json()
    const problem = ProblemDetailsSchema.parse(json)
    return new ApiError(problem)
  } catch {
    // Se não conseguir parsear como RFC 7807, criar erro genérico
    return new ApiError({
      type: 'about:blank',
      status: response.status,
      title: response.statusText || 'HTTP Error',
      detail: `HTTP ${response.status}`,
      code: 'HTTP_ERROR',
    })
  }
}

/**
 * Mensagens de erro amigáveis ao usuário
 */
export function getUserFriendlyMessage(error: ApiError): string {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return 'Dados inválidos. Verifique os campos.'
    case 'AUTHENTICATION_ERROR':
      return 'Autenticação falhou. Verifique suas credenciais.'
    case 'AUTHORIZATION_ERROR':
      return 'Você não tem permissão para acessar este recurso.'
    case 'NOT_FOUND':
      return 'Recurso não encontrado.'
    case 'RATE_LIMIT_EXCEEDED':
      return 'Muitas requisições. Tente novamente mais tarde.'
    case 'CONFLICT':
      return 'Conflito: este recurso já existe.'
    case 'INTERNAL_SERVER_ERROR':
      return 'Erro interno do servidor. Tente novamente mais tarde.'
    default:
      return error.detail || 'Ocorreu um erro. Tente novamente.'
  }
}

/**
 * Extrai mensagens de erro de validação por campo
 */
export function getFieldErrors(error: ApiError): Record<string, string> {
  if (!error.validationErrors) {
    return {}
  }
  return error.validationErrors
}
