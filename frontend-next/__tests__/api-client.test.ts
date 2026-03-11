/**
 * Testes para Generic API Client e Query Builder
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiClient } from '@/lib/api/api-client'
import {
  QueryBuilder,
  PacientesQueryBuilder,
  ExamesQueryBuilder,
  QueryBuilders,
} from '@/lib/api/query-builder'
import { z } from 'zod'

// Mock fetch global
global.fetch = vi.fn()

describe('Query Builder', () => {
  describe('QueryBuilder', () => {
    it('deve criar query builder vazio', () => {
      const qb = new QueryBuilder()
      expect(qb.build()).toEqual({})
    })

    it('deve adicionar paginação', () => {
      const qb = new QueryBuilder().paginate(10, 20)
      expect(qb.build()).toEqual({ limit: 10, offset: 20 })
    })

    it('deve adicionar filtros', () => {
      const qb = new QueryBuilder().filter({
        status: 'active',
        type: 'user',
        active: true,
      })

      expect(qb.build()).toEqual({
        status: 'active',
        type: 'user',
        active: true,
      })
    })

    it('deve ignorar valores null/undefined em filtros', () => {
      const qb = new QueryBuilder().filter({
        status: 'active',
        type: undefined,
        active: null,
      })

      expect(qb.build()).toEqual({ status: 'active' })
    })

    it('deve adicionar busca', () => {
      const qb = new QueryBuilder().search('john')
      expect(qb.build().search).toBe('john')
    })

    it('deve ignorar busca vazia', () => {
      const qb = new QueryBuilder().search('   ')
      expect(qb.build().search).toBeUndefined()
    })

    it('deve adicionar ordenação simples', () => {
      const qb = new QueryBuilder().orderBy('name', 'asc')
      expect(qb.build().ordering).toBe('name')
    })

    it('deve adicionar ordenação descendente', () => {
      const qb = new QueryBuilder().orderBy('created', 'desc')
      expect(qb.build().ordering).toBe('-created')
    })

    it('deve adicionar múltiplos campos de ordenação', () => {
      const qb = new QueryBuilder().orderByMultiple([
        { field: 'name', order: 'asc' },
        { field: 'created', order: 'desc' },
      ])

      expect(qb.build().ordering).toBe('name,-created')
    })

    it('deve adicionar parâmetro customizado', () => {
      const qb = new QueryBuilder()
        .param('custom', 'value')
        .param('number', 42)
        .param('bool', true)

      expect(qb.build()).toEqual({
        custom: 'value',
        number: 42,
        bool: true,
      })
    })

    it('deve suportar chain de métodos', () => {
      const qb = new QueryBuilder()
        .paginate(10)
        .search('test')
        .filter({ status: 'active' })
        .orderBy('name')

      const params = qb.build()
      expect(params.limit).toBe(10)
      expect(params.search).toBe('test')
      expect(params.status).toBe('active')
      expect(params.ordering).toBe('name')
    })

    it('deve limpar parâmetro específico', () => {
      const qb = new QueryBuilder()
        .paginate(10)
        .search('test')
        .clearParam('search')

      const params = qb.build()
      expect(params.limit).toBe(10)
      expect(params.search).toBeUndefined()
    })

    it('deve limpar todos os parâmetros', () => {
      const qb = new QueryBuilder()
        .paginate(10)
        .search('test')
        .clear()

      expect(qb.build()).toEqual({})
    })

    it('deve converter para URLSearchParams', () => {
      const qb = new QueryBuilder()
        .paginate(10, 20)
        .search('test')

      const params = qb.toSearchParams()
      expect(params.get('limit')).toBe('10')
      expect(params.get('offset')).toBe('20')
      expect(params.get('search')).toBe('test')
    })

    it('deve converter para string de query', () => {
      const qb = new QueryBuilder()
        .paginate(10)
        .search('test')

      const str = qb.toString()
      expect(str).toContain('limit=10')
      expect(str).toContain('search=test')
    })
  })

  describe('PacientesQueryBuilder', () => {
    it('deve filtrar por nome', () => {
      const qb = new PacientesQueryBuilder().byName('João Silva')
      expect(qb.build().nome).toBe('João Silva')
    })

    it('deve filtrar por email', () => {
      const qb = new PacientesQueryBuilder().byEmail('joao@example.com')
      expect(qb.build().email).toBe('joao@example.com')
    })

    it('deve filtrar por número ID', () => {
      const qb = new PacientesQueryBuilder().byNumeroId('12345678')
      expect(qb.build().numero_id).toBe('12345678')
    })

    it('deve filtrar por género', () => {
      const qb = new PacientesQueryBuilder().byGenero('M')
      expect(qb.build().genero).toBe('M')
    })

    it('deve ordena por padrão (nome)', () => {
      const qb = new PacientesQueryBuilder().defaultOrder()
      expect(qb.build().ordering).toBe('nome')
    })

    it('deve ordena por novo (criado_em desc)', () => {
      const qb = new PacientesQueryBuilder().byNewest()
      expect(qb.build().ordering).toBe('-criado_em')
    })

    it('deve combinar filtros', () => {
      const qb = new PacientesQueryBuilder()
        .byGenero('F')
        .search('silva')
        .paginate(20)
        .byNewest()

      const params = qb.build()
      expect(params.genero).toBe('F')
      expect(params.search).toBe('silva')
      expect(params.limit).toBe(20)
      expect(params.ordering).toBe('-criado_em')
    })
  })

  describe('ExamesQueryBuilder', () => {
    it('deve filtrar por tipo', () => {
      const qb = new ExamesQueryBuilder().byType('blood_test')
      expect(qb.build().tipo).toBe('blood_test')
    })

    it('deve filtrar por paciente', () => {
      const qb = new ExamesQueryBuilder().byPaciente(123)
      expect(qb.build().paciente).toBe(123)
    })

    it('deve filtrar por status', () => {
      const qb = new ExamesQueryBuilder().byStatus('completed')
      expect(qb.build().status).toBe('completed')
    })

    it('deve ordenar por padrão', () => {
      const qb = new ExamesQueryBuilder().defaultOrder()
      expect(qb.build().ordering).toBe('tipo')
    })

    it('deve ordenar por novo', () => {
      const qb = new ExamesQueryBuilder().byNewest()
      expect(qb.build().ordering).toBe('-criado_em')
    })
  })

  describe('QueryBuilders factory', () => {
    it('deve criar PacientesQueryBuilder', () => {
      const qb = QueryBuilders.pacientes()
      expect(qb).toBeInstanceOf(PacientesQueryBuilder)
    })

    it('deve criar ExamesQueryBuilder', () => {
      const qb = QueryBuilders.exames()
      expect(qb).toBeInstanceOf(ExamesQueryBuilder)
    })

    it('deve criar QueryBuilder genérico', () => {
      const qb = QueryBuilders.generic()
      expect(qb).toBeInstanceOf(QueryBuilder)
    })
  })
})

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('deve criar client com config padrão', () => {
    const client = new ApiClient({
      baseURL: 'http://api.example.com',
    })

    expect(client).toBeDefined()
  })

  it('deve fazer GET request com validação Zod', async () => {
    const schema = z.object({ id: z.number(), name: z.string() })
    const mockResponse = { id: 1, name: 'Test' }

    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const client = new ApiClient({ baseURL: 'http://api.example.com' })
    const result = await client.get('/users', schema)

    expect(result.data).toEqual(mockResponse)
    expect(result.status).toBe(200)
  })

  it('deve validar response com Zod', async () => {
    const schema = z.object({ id: z.number() })
    const invalidResponse = { id: 'not a number' }

    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify(invalidResponse), { status: 200 })
    )

    const client = new ApiClient({ baseURL: 'http://api.example.com' })

    try {
      await client.get('/users', schema)
      expect.fail('Deve lançar erro de validação')
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('deve fazer POST request', async () => {
    const schema = z.object({ id: z.number() })
    const mockResponse = { id: 1 }

    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 201 })
    )

    const client = new ApiClient({ baseURL: 'http://api.example.com' })
    const result = await client.post(
      '/users',
      schema,
      { name: 'New User' }
    )

    expect(result.status).toBe(201)
  })

  it('deve fazer PATCH request', async () => {
    const schema = z.object({ id: z.number() })
    const mockResponse = { id: 1 }

    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const client = new ApiClient({ baseURL: 'http://api.example.com' })
    const result = await client.patch(
      '/users/1',
      schema,
      { name: 'Updated' }
    )

    expect(result.status).toBe(200)
  })

  it('deve fazer DELETE request', async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(null, { status: 204 })
    )

    const client = new ApiClient({ baseURL: 'http://api.example.com' })
    const result = await client.delete('/users/1')

    expect(result.status).toBe(204)
  })

  it('deve adicionar query parameters', async () => {
    const schema = z.array(z.object({ id: z.number() }))
    const mockResponse = [{ id: 1 }]

    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const client = new ApiClient({ baseURL: 'http://api.example.com' })
    await client.get('/users', schema, {
      params: { limit: 10, offset: 20 },
    })

    const callUrl = (global.fetch as any).mock.calls[0][0]
    expect(callUrl).toContain('limit=10')
    expect(callUrl).toContain('offset=20')
  })

  it('deve suportar request interceptors', async () => {
    const interceptor = vi.fn((config) => config)
    const schema = z.object({ id: z.number() })

    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1 }), { status: 200 })
    )

    const client = new ApiClient({ baseURL: 'http://api.example.com' })
    client.useRequestInterceptor(interceptor)
    await client.get('/users', schema)

    expect(interceptor).toHaveBeenCalled()
  })

  it('deve suportar error interceptors', async () => {
    const errorInterceptor = vi.fn((error) => error)
    const schema = z.object({ id: z.number() })

    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    )

    const client = new ApiClient({ baseURL: 'http://api.example.com' })
    client.useErrorInterceptor(errorInterceptor)

    try {
      await client.get('/users', schema)
    } catch (error) {
      // Expected
    }

    expect(errorInterceptor).toHaveBeenCalled()
  })
})
