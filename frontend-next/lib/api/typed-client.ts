/**
 * Pacientes API Client - Usando novo generic ApiClient
 * Type-safe, validado, com retry automático
 */

import { ApiClient, createApiClient, type RetryOptions } from '@/lib/api/api-client'
import {
  PacienteSchema,
  ExameSchema,
  InvoiceSchema,
  PaymentSchema,
  CheckinSchema,
  IntegrationOrderSchema,
  type Paciente,
  type Exame,
  type Invoice,
  type Payment,
  type Checkin,
  type IntegrationOrder,
} from '@/lib/validators/schemas'
import { PacientesQueryBuilder, ExamesQueryBuilder } from '@/lib/api/query-builder'

/**
 * Resultado paginado
 */
export interface PaginatedResult<T> {
  results: T[]
  count: number
  next?: string
  previous?: string
}

/**
 * Criar cliente API padrão
 */
export function createPacientesApiClient(baseURL: string = 'http://localhost:8000'): ApiClient {
  return createApiClient({
    baseURL,
    timeout: 30000,
    retryOptions: {
      maxRetries: 3,
      initialDelayMs: 1000,
    },
  })
}

/**
 * Pacientes Service usando generic client
 */
export class PacientesService {
  private client: ApiClient

  constructor(baseURL: string = 'http://localhost:8000') {
    this.client = createPacientesApiClient(baseURL)
  }

  /**
   * Listar pacientes com filtros opcionais
   */
  async list(query?: PacientesQueryBuilder, retryOptions?: RetryOptions) {
    return this.client.get(
      '/api/v1/clinical/patient/',
      PacienteSchema.array().transform(results => ({ results, count: results.length })),
      {
        params: query?.build(),
        retryOptions,
      }
    )
  }

  /**
   * Obter paciente por ID
   */
  async getById(id: number, retryOptions?: RetryOptions) {
    return this.client.get(
      `/api/v1/clinical/patient/${id}/`,
      PacienteSchema,
      { retryOptions }
    )
  }

  /**
   * Criar novo paciente
   */
  async create(data: Omit<Paciente, 'id' | 'criado_em'>, retryOptions?: RetryOptions) {
    return this.client.post(
      '/api/v1/clinical/patient/',
      PacienteSchema,
      data,
      { retryOptions: { maxRetries: 0, ...retryOptions } } // No retry for mutations
    )
  }

  /**
   * Atualizar paciente
   */
  async update(id: number, data: Partial<Paciente>, retryOptions?: RetryOptions) {
    return this.client.patch(
      `/api/v1/clinical/patient/${id}/`,
      PacienteSchema,
      data,
      { retryOptions: { maxRetries: 0, ...retryOptions } }
    )
  }

  /**
   * Deletar paciente
   */
  async delete(id: number, retryOptions?: RetryOptions) {
    return this.client.delete(
      `/api/v1/clinical/patient/${id}/`,
      { retryOptions: { maxRetries: 0, ...retryOptions } }
    )
  }

  /**
   * Buscar pacientes por nome
   */
  async search(query: string, limit: number = 10, retryOptions?: RetryOptions) {
    const qb = new PacientesQueryBuilder()
      .search(query)
      .paginate(limit)
      .defaultOrder()

    return this.list(qb, retryOptions)
  }

  /**
   * Adicionar request interceptor
   */
  addRequestInterceptor(interceptor: Parameters<typeof this.client.useRequestInterceptor>[0]) {
    this.client.useRequestInterceptor(interceptor)
  }

  /**
   * Adicionar response interceptor
   */
  addResponseInterceptor(interceptor: Parameters<typeof this.client.useResponseInterceptor>[0]) {
    this.client.useResponseInterceptor(interceptor)
  }
}

/**
 * Exames Service usando generic client
 */
export class ExamesService {
  private client: ApiClient

  constructor(baseURL: string = 'http://localhost:8000') {
    this.client = createPacientesApiClient(baseURL)
  }

  /**
   * Listar exames com filtros opcionais
   */
  async list(query?: ExamesQueryBuilder, retryOptions?: RetryOptions) {
    return this.client.get(
      '/api/v1/clinical/exam/',
      ExameSchema.array().transform(results => ({ results, count: results.length })),
      {
        params: query?.build(),
        retryOptions,
      }
    )
  }

  /**
   * Obter exame por ID
   */
  async getById(id: number, retryOptions?: RetryOptions) {
    return this.client.get(
      `/api/v1/clinical/exam/${id}/`,
      ExameSchema,
      { retryOptions }
    )
  }

  /**
   * Criar novo exame
   */
  async create(data: Omit<Exame, 'id' | 'criado_em'>, retryOptions?: RetryOptions) {
    return this.client.post(
      '/api/v1/clinical/exam/',
      ExameSchema,
      data,
      { retryOptions: { maxRetries: 0, ...retryOptions } }
    )
  }

  /**
   * Atualizar exame
   */
  async update(id: number, data: Partial<Exame>, retryOptions?: RetryOptions) {
    return this.client.patch(
      `/api/v1/clinical/exam/${id}/`,
      ExameSchema,
      data,
      { retryOptions: { maxRetries: 0, ...retryOptions } }
    )
  }

  /**
   * Deletar exame
   */
  async delete(id: number, retryOptions?: RetryOptions) {
    return this.client.delete(
      `/api/v1/clinical/exam/${id}/`,
      { retryOptions: { maxRetries: 0, ...retryOptions } }
    )
  }

  /**
   * Filtrar exames por paciente
   */
  async byPaciente(pacienteId: number, retryOptions?: RetryOptions) {
    const qb = new ExamesQueryBuilder()
      .byPaciente(pacienteId)
      .defaultOrder()

    return this.list(qb, retryOptions)
  }

  /**
   * Adicionar request interceptor
   */
  addRequestInterceptor(interceptor: Parameters<typeof this.client.useRequestInterceptor>[0]) {
    this.client.useRequestInterceptor(interceptor)
  }

  /**
   * Adicionar response interceptor
   */
  addResponseInterceptor(interceptor: Parameters<typeof this.client.useResponseInterceptor>[0]) {
    this.client.useResponseInterceptor(interceptor)
  }
}

/**
 * Invoices (Billing)
 */
export class InvoicesService {
  private client: ApiClient
  constructor(baseURL: string = 'http://localhost:8000') {
    this.client = createPacientesApiClient(baseURL)
  }

  async list(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/billing/invoice/', InvoiceSchema.array(), { retryOptions })
  }

  async retrieve(id: number, retryOptions?: RetryOptions) {
    return this.client.get(`/api/v1/billing/invoice/${id}/`, InvoiceSchema, { retryOptions })
  }

  async issue(id: number, retryOptions?: RetryOptions) {
    return this.client.post(`/api/v1/billing/invoice/${id}/issue/`, InvoiceSchema, undefined, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }
}

/**
 * Payments
 */
export class PaymentsService {
  private client: ApiClient
  constructor(baseURL: string = 'http://localhost:8000') {
    this.client = createPacientesApiClient(baseURL)
  }

  async create(data: any, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/payments/payment/', PaymentSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async list(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/payments/payment/', PaymentSchema.array(), { retryOptions })
  }
}

/**
 * Reception check-ins
 */
export class ReceptionService {
  private client: ApiClient
  constructor(baseURL: string = 'http://localhost:8000') {
    this.client = createPacientesApiClient(baseURL)
  }

  async listCheckins(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/reception/checkin/', CheckinSchema.array(), { retryOptions })
  }

  async retrieveCheckin(id: number, retryOptions?: RetryOptions) {
    return this.client.get(`/api/v1/reception/checkin/${id}/`, CheckinSchema, { retryOptions })
  }
}

/**
 * Equipment integrations (worklist/resultados)
 */
export class EquipmentIntegrationsService {
  private client: ApiClient
  constructor(baseURL: string = 'http://localhost:8000') {
    this.client = createPacientesApiClient(baseURL)
  }

  async worklist(equipmentCustomId: string, retryOptions?: RetryOptions) {
    return this.client.get(
      `/api/v1/integrations/equipments/${equipmentCustomId}/worklist/`,
      IntegrationOrderSchema.array(),
      { retryOptions }
    )
  }
}

/**
 * Instâncias singleton
 */
export const pacientesService = new PacientesService()
export const examesService = new ExamesService()
export const invoicesService = new InvoicesService()
export const paymentsService = new PaymentsService()
export const receptionService = new ReceptionService()
export const equipmentIntegrationsService = new EquipmentIntegrationsService()
