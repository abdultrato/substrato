import { describe, it, expect } from 'vitest'
import {
  PharmacyLotSchema,
  PharmacyInventoryMovementSchema,
  PharmacySaleSchema,
  PharmacySaleItemSchema,
  InternamentoEnfermariaSchema,
} from '@/lib/validators/schemas'

const baseMeta = {
  inquilino: 1,
}

describe('Schemas Farmácia', () => {
  it('PharmacyLotSchema deve exigir campos obrigatórios', () => {
    const result = PharmacyLotSchema.safeParse({})
    expect(result.success).toBe(false)
    const paths = (result.error?.issues || []).map(i => i.path.join('.'))
    expect(paths).toEqual(expect.arrayContaining(['nome', 'numero_lote', 'quantidade_inicial', 'inquilino', 'produto']))
  })

  it('PharmacyLotSchema aceita payload mínimo válido', () => {
    const result = PharmacyLotSchema.safeParse({
      ...baseMeta,
      nome: 'Lote X',
      numero_lote: 'ABC123',
      validade: '2026-12-31',
      quantidade_inicial: 10,
      produto: 99,
    })
    expect(result.success).toBe(true)
  })

  it('PharmacyInventoryMovementSchema exige tipo, quantidade, lote', () => {
    const res = PharmacyInventoryMovementSchema.safeParse({
      ...baseMeta,
      nome: 'Saída venda 1',
      tipo: 'SAI',
      quantidade: 2,
      lote: 5,
    })
    expect(res.success).toBe(true)

    const invalid = PharmacyInventoryMovementSchema.safeParse({})
    expect(invalid.success).toBe(false)
  })

  it('PharmacySaleSchema exige numero e inquilino', () => {
    const ok = PharmacySaleSchema.safeParse({
      ...baseMeta,
      numero: 'V-001',
    })
    expect(ok.success).toBe(true)

    const fail = PharmacySaleSchema.safeParse({})
    expect(fail.success).toBe(false)
  })

  it('PharmacySaleItemSchema exige nome, quantidade, venda e produto', () => {
    const ok = PharmacySaleItemSchema.safeParse({
      ...baseMeta,
      nome: 'Paracetamol',
      quantidade: 1,
      venda: 7,
      produto: 3,
    })
    expect(ok.success).toBe(true)

    const fail = PharmacySaleItemSchema.safeParse({})
    expect(fail.success).toBe(false)
  })

  it('InternamentoEnfermariaSchema exige paciente, cama e inquilino', () => {
    const ok = InternamentoEnfermariaSchema.safeParse({
      ...baseMeta,
      paciente: 10,
      cama: 2,
    })
    expect(ok.success).toBe(true)

    const fail = InternamentoEnfermariaSchema.safeParse({})
    expect(fail.success).toBe(false)
  })
})
