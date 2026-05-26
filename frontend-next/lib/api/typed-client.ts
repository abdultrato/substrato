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
  ConsultationSchema,
  DoctorSchema,
  SpecialtySchema,
  HolidaySchema,
  WorkspaceSchema,
  ReceptionCareSchema,
  ReceiptSchema,
  TransactionSchema,
  ReconciliationSchema,
  TenantSchema,
  TenantPlanSchema,
  TenantConfigSchema,
  FeatureFlagTenantSchema,
  InsurerSchema,
  CoveragePlanSchema,
  AuthorizationProcedureSchema,
  type Paciente,
  type Exame,
  type Invoice,
  type Payment,
  type Checkin,
  type IntegrationOrder,
  type Consultation,
  type Doctor,
  type Specialty,
  type Holiday,
  type Workspace,
  type ReceptionCare,
  type Receipt,
  type Transaction,
  type Reconciliation,
  type Tenant,
  type TenantPlan,
  type TenantConfig,
  type FeatureFlagTenant,
  type Insurer,
  type CoveragePlan,
  type AuthorizationProcedure,
  PharmacyProductSchema,
  PharmacyLotSchema,
  PharmacyInventoryMovementSchema,
  PharmacySaleSchema,
  PharmacySaleItemSchema,
  type PharmacyProduct,
  type PharmacyLot,
  type PharmacyInventoryMovement,
  type PharmacySale,
  type PharmacySaleItem,
  NursingEvolutionSchema,
  NursingProcedureSchema,
  NursingProcedureCatalogSchema,
  NursingProcedureItemSchema,
  NursingProcedureItemValueSchema,
  NursingProcedureMaterialSchema,
  NursingProcedureMaterialValueSchema,
  NursingPrescriptionSchema,
  NursingRecordSchema,
  NursingVitalSignSchema,
  WardSchema,
  WardBedSchema,
  WardAdmissionSchema,
  type NursingEvolution,
  type NursingProcedure,
  type NursingProcedureCatalog,
  type NursingProcedureItem,
  type NursingProcedureItemValue,
  type NursingProcedureMaterial,
  type NursingProcedureMaterialValue,
  type NursingPrescription,
  type NursingRecord,
  type NursingVitalSign,
  type Ward,
  type WardBed,
  type WardAdmission,
} from '@/lib/validators/schemas'
import { PacientesQueryBuilder, ExamesQueryBuilder } from '@/lib/api/query-builder'

// Payload helpers alinhados ao OpenAPI (campos obrigatórios)
type LotCreate = Omit<
  PharmacyLot,
  | 'id'
  | 'criado_em'
  | 'atualizado_em'
  | 'id_custom'
  | 'deletado'
  | 'deletado_em'
  | 'versao'
  | 'criado_por'
  | 'atualizado_por'
  | 'deletado_por'
>
type InventoryMovementCreate = Omit<
  PharmacyInventoryMovement,
  | 'id'
  | 'criado_em'
  | 'atualizado_em'
  | 'id_custom'
  | 'deletado'
  | 'deletado_em'
  | 'versao'
  | 'criado_por'
  | 'atualizado_por'
  | 'deletado_por'
>
type SaleCreate = Omit<
  PharmacySale,
  | 'id'
  | 'criado_em'
  | 'atualizado_em'
  | 'id_custom'
  | 'deletado'
  | 'deletado_em'
  | 'versao'
  | 'criado_por'
  | 'atualizado_por'
  | 'deletado_por'
>
type SaleItemCreate = Omit<
  PharmacySaleItem,
  | 'id'
  | 'criado_em'
  | 'atualizado_em'
  | 'id_custom'
  | 'deletado'
  | 'deletado_em'
  | 'versao'
  | 'criado_por'
  | 'atualizado_por'
  | 'deletado_por'
>
type WardAdmissionCreate = Omit<
  WardAdmission,
  | 'id'
  | 'criado_em'
  | 'atualizado_em'
  | 'id_custom'
  | 'deletado'
  | 'deletado_em'
  | 'versao'
  | 'criado_por'
  | 'atualizado_por'
  | 'deletado_por'
  | 'paciente_nome'
  | 'cama_numero'
  | 'enfermaria_nome'
>

/**
 * Resultado paginado
 */
export interface PaginatedResult<T> {
  results: T[]
  count: number
  next?: string
  previous?: string
}

const DEFAULT_TYPED_CLIENT_TIMEOUT_MS = 6000

function resolveTypedClientBaseURL(explicitBaseURL?: string): string {
  const explicit = (explicitBaseURL || '').trim().replace(/\/$/, '')
  if (explicit) return explicit

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }

  const configured = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '')
    .trim()
    .replace(/\/$/, '')
  if (configured) return configured

  return 'http://localhost:8000'
}

/**
 * Criar cliente API padrão
 */
export function createPacientesApiClient(baseURL?: string): ApiClient {
  return createApiClient({
    baseURL: resolveTypedClientBaseURL(baseURL),
    timeout: DEFAULT_TYPED_CLIENT_TIMEOUT_MS,
    retryOptions: {
      maxRetries: 0,
      initialDelayMs: 200,
    },
  })
}

/**
 * Pacientes Service usando generic client
 */
export class PacientesService {
  private client: ApiClient

  constructor(baseURL?: string) {
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

  constructor(baseURL?: string) {
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
 * Consultas
 */
export class ConsultationsService {
  private client: ApiClient

  constructor(baseURL?: string) {
    this.client = createPacientesApiClient(baseURL)
  }

  async list(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/consultations/consultation/', ConsultationSchema.array(), { retryOptions })
  }

  async retrieve(id: number, retryOptions?: RetryOptions) {
    return this.client.get(`/api/v1/consultations/consultation/${id}/`, ConsultationSchema, { retryOptions })
  }

  async listDoctors(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/consultations/medicos/', DoctorSchema.array(), { retryOptions })
  }

  async listSpecialties(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/consultations/specialty/', SpecialtySchema.array(), { retryOptions })
  }

  async listHolidays(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/consultations/feriado/', HolidaySchema.array(), { retryOptions })
  }
}

/**
 * Invoices (Billing)
 */
export class InvoicesService {
  private client: ApiClient
  constructor(baseURL?: string) {
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
  constructor(baseURL?: string) {
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

  async listReceipts(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/payments/receipt/', ReceiptSchema.array(), { retryOptions })
  }

  async listTransactions(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/payments/transaction/', TransactionSchema.array(), { retryOptions })
  }

  async listReconciliations(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/payments/reconciliation/', ReconciliationSchema.array(), { retryOptions })
  }
}

/**
 * Reception check-ins
 */
export class ReceptionService {
  private client: ApiClient
  constructor(baseURL?: string) {
    this.client = createPacientesApiClient(baseURL)
  }

  async listCheckins(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/reception/checkin/', CheckinSchema.array(), { retryOptions })
  }

  async retrieveCheckin(id: number, retryOptions?: RetryOptions) {
    return this.client.get(`/api/v1/reception/checkin/${id}/`, CheckinSchema, { retryOptions })
  }

  async listWorkspaces(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/reception/workspace/', WorkspaceSchema.array(), { retryOptions })
  }

  async listCare(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/reception/care/', ReceptionCareSchema.array(), { retryOptions })
  }

  async retrieveCare(id: number, retryOptions?: RetryOptions) {
    return this.client.get(`/api/v1/reception/care/${id}/`, ReceptionCareSchema, { retryOptions })
  }
}

/**
 * Equipment integrations (worklist/resultados)
 */
export class EquipmentIntegrationsService {
  private client: ApiClient
  constructor(baseURL?: string) {
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
 * Tenants
 */
export class TenantsService {
  private client: ApiClient
  constructor(baseURL?: string) {
    this.client = createPacientesApiClient(baseURL)
  }

  async list(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/tenants/tenant/', TenantSchema.array(), { retryOptions })
  }

  async listPlans(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/tenants/planoassinatura/', TenantPlanSchema.array(), { retryOptions })
  }

  async listConfigs(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/tenants/configuracaoinquilino/', TenantConfigSchema.array(), { retryOptions })
  }

  async listFeatureFlags(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/tenants/featureflagtenant/', FeatureFlagTenantSchema.array(), { retryOptions })
  }
}

/**
 * Insurers
 */
export class InsurersService {
  private client: ApiClient
  constructor(baseURL?: string) {
    this.client = createPacientesApiClient(baseURL)
  }

  async list(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/insurer/insurer/', InsurerSchema.array(), { retryOptions })
  }

  async listCoveragePlans(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/insurer/coverage_plan/', CoveragePlanSchema.array(), { retryOptions })
  }

  async listAuthorizations(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/insurer/procedure_authorization/', AuthorizationProcedureSchema.array(), {
      retryOptions,
    })
  }
}

/**
 * Farmácia
 */
export class PharmacyService {
  private client: ApiClient
  constructor(baseURL?: string) {
    this.client = createPacientesApiClient(baseURL)
  }

  async listProducts(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/pharmacy/product/', PharmacyProductSchema.array(), { retryOptions })
  }

  async createProduct(data: Partial<PharmacyProduct>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/pharmacy/product/', PharmacyProductSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async updateProduct(id: number, data: Partial<PharmacyProduct>, retryOptions?: RetryOptions) {
    return this.client.patch(`/api/v1/pharmacy/product/${id}/`, PharmacyProductSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async deleteProduct(id: number, retryOptions?: RetryOptions) {
    return this.client.delete(`/api/v1/pharmacy/product/${id}/`, { retryOptions: { maxRetries: 0, ...retryOptions } })
  }

  async retrieveProduct(id: number, retryOptions?: RetryOptions) {
    return this.client.get(`/api/v1/pharmacy/product/${id}/`, PharmacyProductSchema, { retryOptions })
  }

  async listLots(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/pharmacy/lot/', PharmacyLotSchema.array(), { retryOptions })
  }

  async createLot(data: Partial<PharmacyLot>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/pharmacy/lot/', PharmacyLotSchema, data as LotCreate, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async updateLot(id: number, data: Partial<PharmacyLot>, retryOptions?: RetryOptions) {
    return this.client.patch(`/api/v1/pharmacy/lot/${id}/`, PharmacyLotSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async deleteLot(id: number, retryOptions?: RetryOptions) {
    return this.client.delete(`/api/v1/pharmacy/lot/${id}/`, { retryOptions: { maxRetries: 0, ...retryOptions } })
  }

  async listInventoryMovements(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/pharmacy/inventory_movement/', PharmacyInventoryMovementSchema.array(), { retryOptions })
  }

  async createInventoryMovement(data: Partial<PharmacyInventoryMovement>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/pharmacy/inventory_movement/', PharmacyInventoryMovementSchema, data as InventoryMovementCreate, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async listSales(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/pharmacy/sale/', PharmacySaleSchema.array(), { retryOptions })
  }

  async createSale(data: Partial<PharmacySale>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/pharmacy/sale/', PharmacySaleSchema, data as SaleCreate, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async updateSale(id: number, data: Partial<PharmacySale>, retryOptions?: RetryOptions) {
    return this.client.patch(`/api/v1/pharmacy/sale/${id}/`, PharmacySaleSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async deleteSale(id: number, retryOptions?: RetryOptions) {
    return this.client.delete(`/api/v1/pharmacy/sale/${id}/`, { retryOptions: { maxRetries: 0, ...retryOptions } })
  }

  async listSaleItems(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/pharmacy/sale_item/', PharmacySaleItemSchema.array(), { retryOptions })
  }

  async createSaleItem(data: Partial<PharmacySaleItem>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/pharmacy/sale_item/', PharmacySaleItemSchema, data as SaleItemCreate, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async updateSaleItem(id: number, data: Partial<PharmacySaleItem>, retryOptions?: RetryOptions) {
    return this.client.patch(`/api/v1/pharmacy/sale_item/${id}/`, PharmacySaleItemSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async deleteSaleItem(id: number, retryOptions?: RetryOptions) {
    return this.client.delete(`/api/v1/pharmacy/sale_item/${id}/`, { retryOptions: { maxRetries: 0, ...retryOptions } })
  }
}

/**
 * Nursing
 */
export class NursingService {
  private client: ApiClient
  constructor(baseURL?: string) {
    this.client = createPacientesApiClient(baseURL)
  }

  async listNursingEvolutions(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/nursing/nursing_evolution/', NursingEvolutionSchema.array(), { retryOptions })
  }

  async createNursingEvolution(data: Partial<NursingEvolution>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/nursing/nursing_evolution/', NursingEvolutionSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async listProcedures(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/nursing/procedure/', NursingProcedureSchema.array(), { retryOptions })
  }

  async createProcedure(data: Partial<NursingProcedure>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/nursing/procedure/', NursingProcedureSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async listProcedureCatalog(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/nursing/procedure_catalog/', NursingProcedureCatalogSchema.array(), {
      retryOptions,
    })
  }

  async createProcedureCatalog(data: Partial<NursingProcedureCatalog>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/nursing/procedure_catalog/', NursingProcedureCatalogSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async listProcedureItems(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/nursing/procedure_item/', NursingProcedureItemSchema.array(), { retryOptions })
  }

  async createProcedureItem(data: Partial<NursingProcedureItem>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/nursing/procedure_item/', NursingProcedureItemSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async listProcedureItemValues(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/nursing/procedure_item_value/', NursingProcedureItemValueSchema.array(), {
      retryOptions,
    })
  }

  async createProcedureItemValue(data: Partial<NursingProcedureItemValue>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/nursing/procedure_item_value/', NursingProcedureItemValueSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async listProcedureMaterials(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/nursing/procedure_material/', NursingProcedureMaterialSchema.array(), {
      retryOptions,
    })
  }

  async createProcedureMaterial(data: Partial<NursingProcedureMaterial>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/nursing/procedure_material/', NursingProcedureMaterialSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async listProcedureMaterialValues(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/nursing/procedure_material_value/', NursingProcedureMaterialValueSchema.array(), {
      retryOptions,
    })
  }

  async createProcedureMaterialValue(data: Partial<NursingProcedureMaterialValue>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/nursing/procedure_material_value/', NursingProcedureMaterialValueSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async listNursingPrescriptions(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/nursing/nursing_prescription/', NursingPrescriptionSchema.array(), {
      retryOptions,
    })
  }

  async createNursingPrescription(data: Partial<NursingPrescription>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/nursing/nursing_prescription/', NursingPrescriptionSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async listNursingRecords(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/nursing/nursing_record/', NursingRecordSchema.array(), { retryOptions })
  }

  async createNursingRecord(data: Partial<NursingRecord>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/nursing/nursing_record/', NursingRecordSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async listNursingVitalSigns(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/nursing/nursing_vital_sign/', NursingVitalSignSchema.array(), {
      retryOptions,
    })
  }

  async createNursingVitalSign(data: Partial<NursingVitalSign>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/nursing/nursing_vital_sign/', NursingVitalSignSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async listWards(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/nursing/ward/', WardSchema.array(), { retryOptions })
  }

  async createWard(data: Partial<Ward>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/nursing/ward/', WardSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async listWardBeds(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/nursing/ward_bed/', WardBedSchema.array(), { retryOptions })
  }

  async createWardBed(data: Partial<WardBed>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/nursing/ward_bed/', WardBedSchema, data, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
  }

  async listWardAdmissions(retryOptions?: RetryOptions) {
    return this.client.get('/api/v1/nursing/ward_admission/', WardAdmissionSchema.array(), {
      retryOptions,
    })
  }

  async createWardAdmission(data: Partial<WardAdmission>, retryOptions?: RetryOptions) {
    return this.client.post('/api/v1/nursing/ward_admission/', WardAdmissionSchema, data as WardAdmissionCreate, {
      retryOptions: { maxRetries: 0, ...retryOptions },
    })
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
export const consultationsService = new ConsultationsService()
export const tenantsService = new TenantsService()
export const insurersService = new InsurersService()
export const pharmacyService = new PharmacyService()
export const nursingService = new NursingService()
