import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pharmacyService, nursingService, paymentsService } from '@/lib/api/typed-client'

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

    const response = await pharmacyService.listProducts()

    expect(String((global.fetch as any).mock.calls[0][0])).toMatch(/\/api\/v1\/pharmacy\/product\/$/)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'GET' })
    )
    expect(response.data[0].nome).toBe('Dipirona')
  })

  it('deve criar produto de farmácia via POST', async () => {
    const created = { id: 10, nome: 'Ibuprofeno', codigo: 'IBU', estoque_atual: 5 }
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(created, 201))

    const response = await pharmacyService.createProduct({ nome: 'Ibuprofeno' })

    expect(String((global.fetch as any).mock.calls[0][0])).toMatch(/\/api\/v1\/pharmacy\/product\/$/)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
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

    const response = await nursingService.createNursingPrescription({ paciente: 1, observacao: 'Curativo diário' })

    expect(String((global.fetch as any).mock.calls[0][0])).toMatch(/\/api\/v1\/nursing\/nursing_prescription\/$/)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ paciente: 1, observacao: 'Curativo diário' }),
      })
    )
    expect(response.data.observacao).toBe('Curativo diário')
  })

  it('deve listar recibos no endpoint canonico de pagamentos', async () => {
    const payload = [{ id: 1 }]
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(payload))

    const response = await paymentsService.listReceipts()

    expect(String((global.fetch as any).mock.calls[0][0])).toMatch(/\/api\/v1\/payments\/receipt\/$/)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'GET' })
    )
    expect(response.data[0].id).toBe(1)
  })

  it('deve listar reconciliações no endpoint canonico de pagamentos', async () => {
    const payload = [{ id: 9 }]
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(payload))

    const response = await paymentsService.listReconciliations()

    expect(String((global.fetch as any).mock.calls[0][0])).toMatch(/\/api\/v1\/payments\/reconciliation\/$/)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'GET' })
    )
    expect(response.data[0].id).toBe(9)
  })
})
