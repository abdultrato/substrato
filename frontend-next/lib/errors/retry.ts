/**
 * Retry logic com exponential backoff
 * Reatenta requisições falhadas com delay crescente
 */

import { ApiError } from './api-error'

export interface RetryOptions {
  /**
   * Número máximo de tentativas (padrão: 3)
   */
  maxRetries?: number

  /**
   * Delay inicial em ms (padrão: 1000)
   */
  initialDelayMs?: number

  /**
   * Multiplicador para exponential backoff (padrão: 2)
   * delay = initialDelayMs * (backoffMultiplier ^ attempt)
   */
  backoffMultiplier?: number

  /**
   * Delay máximo em ms (padrão: 30000)
   */
  maxDelayMs?: number

  /**
   * Função customizada para decidir se deve retentar
   * Por padrão: retenta em erros 5xx, 408, 429
   */
  shouldRetry?: (error: ApiError, attempt: number) => boolean

  /**
   * Callback chamado antes de cada retry
   */
  onRetry?: (error: ApiError, attempt: number, nextDelayMs: number) => void
}

export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
  shouldRetry: (error) => {
    // Se tiver isRetryable(), usar; caso contrário, nunca retentar
    if (typeof error.isRetryable === 'function') {
      return error.isRetryable()
    }
    return false
  },
  onRetry: () => {}, // No-op
}

/**
 * Calcula o delay para a próxima tentativa
 */
export function calculateDelay(
  attempt: number,
  options: Required<RetryOptions>
): number {
  const exponentialDelay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt)
  const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5) // ±50% jitter
  return Math.min(delayWithJitter, options.maxDelayMs)
}

/**
 * Aguarda por ms milissegundos
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Executa função com retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: ApiError | undefined

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new Error(String(error)) as any

      // Se não deve retentar, lançar imediatamente
      if (!opts.shouldRetry(apiError, attempt)) {
        throw error
      }

      // Se foi a última tentativa, lançar erro
      if (attempt === opts.maxRetries) {
        throw error
      }

      // Calcular delay para próxima tentativa
      const nextDelayMs = calculateDelay(attempt, opts)

      // Chamar callback onRetry
      opts.onRetry(apiError, attempt + 1, nextDelayMs)

      // Aguardar antes de tentar novamente
      await sleep(nextDelayMs)

      lastError = apiError
    }
  }

  // Nunca deve chegar aqui, mas por segurança
  throw lastError || new Error('Retry failed')
}

/**
 * Hook para retrying promises
 * Exemplo:
 *   const { execute, isRetrying, retryCount } = useRetry()
 *   await execute(() => api.get('/users'))
 */
export function createRetryExecutor(defaultOptions?: RetryOptions) {
  return async function execute<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> {
    return withRetry(fn, {
      ...defaultOptions,
      ...options,
    })
  }
}
