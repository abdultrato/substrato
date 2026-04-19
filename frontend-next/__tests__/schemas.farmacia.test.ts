import { describe, it, expect } from 'vitest'
import {
  LoteSchema,
  MovimentoEstoqueSchema,
  VendaSchema,
  ItemVendaSchema,
  InternamentoEnfermariaSchema,
} from '@/lib/validators/schemas'

const baseMeta = {
  inquilino: 1,
}

describe('Schemas Farmácia', () => {
  it('LoteSchema deve exigir campos obrigatórios', () => {
    const result = LoteSchema.safeParse({})
    expect(result.success).toBe(false)
    const paths = (result.error?.issues || []).map(i => i.path.join('.'))
    expect(paths).toEqual(expect.arrayContaining(['nome', 'numero_lote', 'quantidade_inicial', 'inquilino', 'produto']))
  })

  it('LoteSchema aceita payload mínimo válido', () => {
    const result = LoteSchema.safeParse({
      ...baseMeta,
      nome: 'Lote X',
      numero_lote: 'ABC123',
      validade: '2026-12-31',
      quantidade_inicial: 10,
      produto: 99,
    })
    expect(result.success).toBe(true)
  })

  it('MovimentoEstoqueSchema exige tipo, quantidade, lote', () => {
    const res = MovimentoEstoqueSchema.safeParse({
      ...baseMeta,
      nome: 'Saída venda 1',
      tipo: 'SAI',
      quantidade: 2,
      lote: 5,
    })
    expect(res.success).toBe(true)

    const invalid = MovimentoEstoqueSchema.safeParse({})
    expect(invalid.success).toBe(false)
  })

  it('VendaSchema exige numero e inquilino', () => {
    const ok = VendaSchema.safeParse({
      ...baseMeta,
      numero: 'V-001',
    })
    expect(ok.success).toBe(true)

    const fail = VendaSchema.safeParse({})
    expect(fail.success).toBe(false)
  })

  it('ItemVendaSchema exige nome, quantidade, venda e produto', () => {
    const ok = ItemVendaSchema.safeParse({
      ...baseMeta,
      nome: 'Paracetamol',
      quantidade: 1,
      venda: 7,
      produto: 3,
    })
    expect(ok.success).toBe(true)

    const fail = ItemVendaSchema.safeParse({})
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
