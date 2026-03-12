/**
 * Testes para retry logic e error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withRetry, calculateDelay, DEFAULT_RETRY_OPTIONS, type RetryOptions } from '@/lib/errors/retry'
import { ApiError } from '@/lib/errors/api-error'

describe('Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateDelay', () => {
    it('deve calcular exponential backoff correto', () => {
      // attempt 0: 1000 * 2^0 = 1000ms
      let delay = calculateDelay(0, DEFAULT_RETRY_OPTIONS)
      expect(delay).toBeGreaterThanOrEqual(500) // ±50% jitter
      expect(delay).toBeLessThanOrEqual(1500)

      // attempt 1: 1000 * 2^1 = 2000ms
      delay = calculateDelay(1, DEFAULT_RETRY_OPTIONS)
      expect(delay).toBeGreaterThanOrEqual(1000)
      expect(delay).toBeLessThanOrEqual(3000)

      // attempt 2: 1000 * 2^2 = 4000ms
      delay = calculateDelay(2, DEFAULT_RETRY_OPTIONS)
      expect(delay).toBeGreaterThanOrEqual(2000)
      expect(delay).toBeLessThanOrEqual(6000)
    })

    it('deve respeitar maxDelayMs', () => {
      const options = {
        ...DEFAULT_RETRY_OPTIONS,
        maxDelayMs: 5000,
      }

      // attempt 5: 1000 * 2^5 = 32000ms, mas limitado a 5000ms
      const delay = calculateDelay(5, options)
      expect(delay).toBeLessThanOrEqual(5000)
    })
  })

  describe('withRetry', () => {
    it('deve retornar sucesso na primeira tentativa', async () => {
      const fn = vi.fn(async () => 'success')

      const result = await withRetry(fn, { maxRetries: 3 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('deve retentar em caso de erro retryable', async () => {
      const fn = vi.fn(async () => {
        throw new ApiError({
          type: 'about:blank',
          status: 503,
          title: 'Service Unavailable',
          detail: 'Server is down',
          code: 'TEST_ERROR',
        })
      })

      try {
        await withRetry(fn, {
          maxRetries: 2,
          initialDelayMs: 1, // Reduzir para testes
        })
      } catch (error) {
        // Esperado falhar após 3 tentativas
      }

      // 1 tentativa original + 2 retentativas = 3 total
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('não deve retentar em erro não-retryable', async () => {
      const fn = vi.fn(async () => {
        throw new ApiError({
          type: 'about:blank',
          status: 400,
          title: 'Bad Request',
          detail: 'Invalid data',
          code: 'TEST_ERROR',
        })
      })

      try {
        await withRetry(fn, {
          maxRetries: 3,
        })
      } catch (error) {
        // Esperado falhar imediatamente
      }

      expect(fn).toHaveBeenCalledTimes(1) // Não retenta para 4xx
    })

    it('deve chamar onRetry callback', async () => {
      const onRetry = vi.fn()
      let attempt = 0

      const fn = vi.fn(async () => {
        attempt++
        if (attempt < 3) {
          throw new ApiError({
            type: 'about:blank',
            status: 500,
            title: 'Internal Server Error',
            detail: 'Server error',
            code: 'TEST_ERROR',
          })
        }
        return 'success'
      })

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 1,
        onRetry,
      })

      expect(result).toBe('success')
      expect(onRetry).toHaveBeenCalledTimes(2) // 2 retentativas
    })

    it('deve respeitar shouldRetry customizado', async () => {
      const fn = vi.fn(async () => {
        throw new ApiError({
          type: 'about:blank',
          status: 500,
          title: 'Internal Server Error',
          detail: 'Server error',
          code: 'TEST_ERROR',
        })
      })

      const shouldRetry = vi.fn(() => false) // Nunca retentar

      try {
        await withRetry(fn, {
          maxRetries: 3,
          shouldRetry,
        })
      } catch (error) {
        // Esperado falhar
      }

      expect(fn).toHaveBeenCalledTimes(1) // Sem retentativas
      expect(shouldRetry).toHaveBeenCalledTimes(1)
    })

    it('deve retentar em erro 429 (Rate Limit)', async () => {
      let attempt = 0

      const fn = vi.fn(async () => {
        attempt++
        if (attempt < 2) {
          throw new ApiError({
            type: 'about:blank',
            status: 429,
            title: 'Too Many Requests',
            detail: 'Rate limited',
            code: 'TEST_ERROR',
          })
        }
        return 'success'
      })

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 1,
      })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('deve retentar em erro 408 (Request Timeout)', async () => {
      let attempt = 0

      const fn = vi.fn(async () => {
        attempt++
        if (attempt < 2) {
          throw new ApiError({
            type: 'about:blank',
            status: 408,
            title: 'Request Timeout',
            detail: 'Request timed out',
            code: 'TEST_ERROR',
          })
        }
        return 'success'
      })

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 1,
      })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('deve falhar após maxRetries', async () => {
      const error = new ApiError({
        type: 'about:blank',
        status: 503,
        title: 'Service Unavailable',
        detail: 'Server is down',
        code: 'TEST_ERROR',
      })

      const fn = vi.fn(async () => {
        throw error
      })

      try {
        await withRetry(fn, {
          maxRetries: 2,
          initialDelayMs: 1,
        })
        expect.fail('Deve lançar erro')
      } catch (err) {
        expect(err).toBe(error)
      }

      // 1 inicial + 2 retentativas = 3
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('deve incluir jitter no delay', async () => {
      const delays: number[] = []
      const onRetry = vi.fn((error, attempt, delayMs) => {
        delays.push(delayMs)
      })

      let attempt = 0
      const fn = vi.fn(async () => {
        attempt++
        if (attempt <= 2) {
          throw new ApiError({
            type: 'about:blank',
            status: 500,
            title: 'Error',
            detail: 'Error',
            code: 'TEST_ERROR',
          })
        }
        return 'success'
      })

      await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 1000,
        onRetry,
      })

      // Verificar que delays têm variação (jitter)
      expect(delays.length).toBe(2)
      expect(delays[0]).toBeGreaterThan(0)
      expect(delays[1]).toBeGreaterThan(0)
      // Segundo delay deve ser maior que primeiro (exponential backoff)
      expect(delays[1]).toBeGreaterThan(delays[0])
    })
  })

  describe('ApiError.isRetryable()', () => {
    it('deve retornar true para 5xx errors', () => {
      const error = new ApiError({
        type: 'about:blank',
        status: 500,
        title: 'Internal Server Error',
        detail: 'Error',
        code: 'TEST_ERROR',
      })
      expect(error.isRetryable()).toBe(true)
    })

    it('deve retornar true para 503 Service Unavailable', () => {
      const error = new ApiError({
        type: 'about:blank',
        status: 503,
        title: 'Service Unavailable',
        detail: 'Error',
        code: 'TEST_ERROR',
      })
      expect(error.isRetryable()).toBe(true)
    })

    it('deve retornar true para 429 Rate Limit', () => {
      const error = new ApiError({
        type: 'about:blank',
        status: 429,
        title: 'Too Many Requests',
        detail: 'Error',
        code: 'TEST_ERROR',
      })
      expect(error.isRetryable()).toBe(true)
    })

    it('deve retornar true para 408 Request Timeout', () => {
      const error = new ApiError({
        type: 'about:blank',
        status: 408,
        title: 'Request Timeout',
        detail: 'Error',
        code: 'TEST_ERROR',
      })
      expect(error.isRetryable()).toBe(true)
    })

    it('deve retornar false para 4xx errors (exceto 408, 429)', () => {
      const error = new ApiError({
        type: 'about:blank',
        status: 400,
        title: 'Bad Request',
        detail: 'Error',
        code: 'TEST_ERROR',
      })
      expect(error.isRetryable()).toBe(false)
    })

    it('deve retornar false para 401 Unauthorized', () => {
      const error = new ApiError({
        type: 'about:blank',
        status: 401,
        title: 'Unauthorized',
        detail: 'Error',
        code: 'TEST_ERROR',
      })
      expect(error.isRetryable()).toBe(false)
    })

    it('deve retornar false para 403 Forbidden', () => {
      const error = new ApiError({
        type: 'about:blank',
        status: 403,
        title: 'Forbidden',
        detail: 'Error',
        code: 'TEST_ERROR',
      })
      expect(error.isRetryable()).toBe(false)
    })
  })
})
