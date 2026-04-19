import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pharmacyService, nursingService } from '@/lib/api/typed-client'

// Mock fetch global
global.fetch = vi.fn()

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('typed-client pharmacy & nursing services', () => {
  beforeEach(() => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockReset()
  })

  it('deve listar produtos de farmácia com validação', async () => {
    const payload = [{ id: 1, nome: 'Dipirona', codigo: 'DIP', estoque_atual: 20 }]
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(payload))

    const response = await pharmacyService.listProdutos()

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/farmacia/produto/',
      expect.objectContaining({ method: 'GET' })
    )
    expect(response.data[0].nome).toBe('Dipirona')
  })

  it('deve criar produto de farmácia via POST', async () => {
    const created = { id: 10, nome: 'Ibuprofeno', codigo: 'IBU', estoque_atual: 5 }
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(created, 201))

    const response = await pharmacyService.createProduto({ nome: 'Ibuprofeno' })

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/farmacia/produto/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ nome: 'Ibuprofeno' }),
      })
    )
    expect(response.data.id).toBe(10)
  })

  it('deve criar prescrição de enfermagem via POST', async () => {
    const created = { id: 3, paciente: 1, observacao: 'Curativo diário' }
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(created, 201))

    const response = await nursingService.createPrescricao({ paciente: 1, observacao: 'Curativo diário' })

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/enfermagem/prescricaoenfermagem/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ paciente: 1, observacao: 'Curativo diário' }),
      })
    )
    expect(response.data.observacao).toBe('Curativo diário')
  })
})
