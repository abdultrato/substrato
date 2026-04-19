import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PharmacyService } from '@/lib/api/typed-client'
import { ApiError } from '@/lib/errors/api-error'

// Mock fetch global
const fetchMock = vi.fn()
global.fetch = fetchMock as any

const service = new PharmacyService('http://api.test')

describe('PharmacyService HTTP', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('createLote retorna dado validado em 201', async () => {
    const body = {
      id: 1,
      nome: 'Lote X',
      numero_lote: 'ABC123',
      validade: '2026-12-31',
      quantidade_inicial: 5,
      inquilino: 10,
      produto: 3,
    }

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(body), { status: 201, headers: { 'Content-Type': 'application/json' } })
    )

    const res = await service.createLote(
      {
        nome: body.nome,
        numero_lote: body.numero_lote,
        validade: body.validade,
        quantidade_inicial: body.quantidade_inicial,
        inquilino: body.inquilino,
        produto: body.produto,
      },
      { maxRetries: 0 }
    )

    expect(res.status).toBe(201)
    expect(res.data.id).toBe(1)
    expect(res.data.nome).toBe(body.nome)
  })

  it('createLote propaga ApiError em 404', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          type: 'about:blank',
          status: 404,
          title: 'Not Found',
          detail: 'Recurso não encontrado',
          code: 'NOT_FOUND',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    )

    await expect(
      service.createLote(
        {
          nome: 'Lote X',
          numero_lote: 'ABC123',
          validade: '2026-12-31',
          quantidade_inicial: 5,
          inquilino: 10,
          produto: 3,
        },
        { maxRetries: 0 }
      )
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('createItemVenda retorna ApiError em 400 validation', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          type: 'about:blank',
          status: 400,
          title: 'Bad Request',
          detail: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          validationErrors: { quantidade: 'Obrigatória' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    )

    await expect(
      service.createItemVenda(
        {
          nome: 'Item',
          // falta quantidade para provocar 400
          venda: 1,
          produto: 2,
          inquilino: 10,
        } as any,
        { maxRetries: 0 }
      )
    ).rejects.toBeInstanceOf(ApiError)
  })
})
