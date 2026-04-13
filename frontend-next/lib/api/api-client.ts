/**
 * Generic API Client com suporte a query parameters, interceptors e error handling
 * Baseado em RFC 7807 + Zod validation + retry logic
 */

import { z } from 'zod'
import { parseResponseError } from '@/lib/errors/api-error'
import { withRetry, type RetryOptions } from '@/lib/errors/retry'
export type { RetryOptions } from '@/lib/errors/retry'

/**
 * Configuração do cliente API
 */
export interface ApiClientConfig {
  baseURL: string
  timeout?: number
  headers?: Record<string, string>
  retryOptions?: RetryOptions
}

/**
 * Request interceptor
 */
export type RequestInterceptor = (
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>

/**
 * Response interceptor
 */
export type ResponseInterceptor = (
  response: Response
) => Response | Promise<Response>

/**
 * Error interceptor
 */
export type ErrorInterceptor = (error: Error) => Error | Promise<Error>

/**
 * Configuração de request
 */
export interface RequestConfig {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'
  url: string
  headers: Record<string, string>
  body?: unknown
  timeout?: number
}

/**
 * Query parameters
 */
export interface QueryParams {
  [key: string]: string | number | boolean | undefined | null
}

/**
 * Resultado de operação
 */
export interface ApiResponse<T> {
  data: T
  status: number
  headers: Record<string, string>
}

/**
 * Generic API Client
 */
export class ApiClient {
  private config: Required<ApiClientConfig>
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private errorInterceptors: ErrorInterceptor[] = []

  constructor(config: ApiClientConfig) {
    this.config = {
      baseURL: config.baseURL,
      timeout: config.timeout ?? 30000,
      headers: config.headers ?? {},
      retryOptions: config.retryOptions ?? {},
    }
  }

  /**
   * Adiciona request interceptor
   */
  useRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor)
  }

  /**
   * Adiciona response interceptor
   */
  useResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor)
  }

  /**
   * Adiciona error interceptor
   */
  useErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor)
  }

  /**
   * GET request com schema validation
   */
  async get<T>(
    url: string,
    schema: z.ZodSchema<T>,
    options?: {
      params?: QueryParams
      headers?: Record<string, string>
      retryOptions?: RetryOptions
    }
  ): Promise<ApiResponse<T>> {
    return this.request('GET', url, schema, undefined, options)
  }

  /**
   * POST request com schema validation
   */
  async post<T>(
    url: string,
    schema: z.ZodSchema<T>,
    data?: unknown,
    options?: {
      params?: QueryParams
      headers?: Record<string, string>
      retryOptions?: RetryOptions
    }
  ): Promise<ApiResponse<T>> {
    return this.request('POST', url, schema, data, options)
  }

  /**
   * PATCH request com schema validation
   */
  async patch<T>(
    url: string,
    schema: z.ZodSchema<T>,
    data?: unknown,
    options?: {
      params?: QueryParams
      headers?: Record<string, string>
      retryOptions?: RetryOptions
    }
  ): Promise<ApiResponse<T>> {
    return this.request('PATCH', url, schema, data, options)
  }

  /**
   * DELETE request (sem validação de response)
   */
  async delete(
    url: string,
    options?: {
      params?: QueryParams
      headers?: Record<string, string>
      retryOptions?: RetryOptions
    }
  ): Promise<{ status: number }> {
    return this.request('DELETE', url, z.undefined(), undefined, options)
  }

  /**
   * Request genérico com validação e retry
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
    url: string,
    schema: z.ZodSchema<T>,
    data?: unknown,
    options?: {
      params?: QueryParams
      headers?: Record<string, string>
      retryOptions?: RetryOptions
    }
  ): Promise<ApiResponse<T>> {
    const retryOptions = { ...this.config.retryOptions, ...options?.retryOptions }

    return withRetry(
      async () => {
        const fullUrl = this.buildUrl(url, options?.params)
        const headers = {
          ...this.config.headers,
          ...options?.headers,
          'Content-Type': 'application/json',
        }

        let config: RequestConfig = {
          method,
          url: fullUrl,
          headers,
          body: data,
          timeout: this.config.timeout,
        }

        // Aplicar request interceptors
        for (const interceptor of this.requestInterceptors) {
          config = await interceptor(config)
        }

        try {
          // Fazer request
          let response = await this.performRequest(config)

          // Aplicar response interceptors
          for (const interceptor of this.responseInterceptors) {
            response = await interceptor(response)
          }

          // Verificar status
          if (!response.ok) {
            const error = await parseResponseError(response)
            throw error
          }

          // Parsear response (pular se 204 No Content)
          const responseData = response.status === 204 ? undefined : await response.json()

          // Validar com Zod
          const validated = await schema.parseAsync(responseData)

          return {
            data: validated,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
          }
        } catch (error) {
          // Aplicar error interceptors
          let processedError = error instanceof Error ? error : new Error(String(error))
          for (const interceptor of this.errorInterceptors) {
            processedError = await interceptor(processedError)
          }
          throw processedError
        }
      },
      retryOptions
    )
  }

  /**
   * Construir URL com query parameters
   */
  private buildUrl(path: string, params?: QueryParams): string {
    const url = new URL(path, this.config.baseURL)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    return url.toString()
  }

  /**
   * Executar request com timeout
   */
  private performRequest(config: RequestConfig): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeout)

    const fetchOptions: RequestInit = {
      method: config.method,
      headers: config.headers,
      signal: controller.signal,
      credentials: 'include',
    }

    if (config.body) {
      fetchOptions.body = JSON.stringify(config.body)
    }

    return fetch(config.url, fetchOptions)
      .finally(() => clearTimeout(timeoutId))
  }
}

/**
 * Factory para criar API client pré-configurado
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  const client = new ApiClient(config)

  // Request interceptor: log
  client.useRequestInterceptor((config) => {
    console.debug(`[API] ${config.method} ${config.url}`)
    return config
  })

  // Error interceptor: log
  client.useErrorInterceptor((error) => {
    const status =
      typeof (error as Error & { status?: unknown }).status === 'number'
        ? (error as Error & { status: number }).status
        : undefined

    if (status === 404) {
      console.warn(`[API 404] ${error.message}`)
      return error
    }

    console.error('[API Error]', error)
    return error
  })

  return client
}
