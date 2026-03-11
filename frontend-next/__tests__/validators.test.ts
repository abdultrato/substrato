/**
 * Testes para validação com Zod
 * Verifica que dados inválidos são detectados
 * 
 * Executar: npm test -- lib/validators/schemas.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  PacienteSchema,
  PacienteCreateSchema,
  ExameSchema,
  RequisicaoAnaliseSchema,
  validatePaciente,
  getValidationErrors,
} from '@/lib/validators/schemas'

describe('Zod Schemas - Validação de Dados', () => {
  describe('Paciente Schema', () => {
    it('deve validar um paciente completo válido', () => {
      const validData = {
        id: 1,
        nome: 'João Silva',
        email: 'joao@example.com',
        data_nascimento: '1990-05-15',
        genero: 'M',
        numero_id: '12345678',
        contacto: '123456789',
        morada: 'Rua A, 123',
      }

      const result = PacienteSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('deve rejeitar paciente com nome vazio', () => {
      const invalidData = {
        id: 1,
        nome: '', // ❌ Vazio
        email: 'joao@example.com',
      }

      const result = PacienteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obrigatório')
      }
    })

    it('deve rejeitar email inválido', () => {
      const invalidData = {
        id: 1,
        nome: 'João',
        email: 'invalid-email', // ❌ Email sem @
      }

      const result = PacienteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('inválido')
      }
    })

    it('deve rejeitar genero inválido (não M ou F)', () => {
      const invalidData = {
        id: 1,
        nome: 'João',
        genero: 'X', // ❌ Inválido
      }

      const result = PacienteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('deve rejeitar data de nascimento em formato inválido', () => {
      const invalidData = {
        id: 1,
        nome: 'João',
        data_nascimento: '15/05/1990', // ❌ Formato errado
      }

      const result = PacienteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('deve aceitar paciente com campos opcionais undefined', () => {
      const validData = {
        id: 1,
        nome: 'João',
        email: undefined,
        genero: undefined,
      }

      const result = PacienteSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('deve aceitar paciente com campos opcionais null', () => {
      const validData = {
        id: 1,
        nome: 'João',
        email: null,
        genero: null,
      }

      const result = PacienteSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('PacienteCreate Schema', () => {
    it('deve validar paciente para criação (sem id, sem criado_em)', () => {
      const validData = {
        nome: 'João Silva',
        email: 'joao@example.com',
        data_nascimento: '1990-05-15',
        genero: 'M',
      }

      const result = PacienteCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('deve rejeitar se incluir id na criação', () => {
      const invalidData = {
        id: 1, // ❌ Não deve incluir ID
        nome: 'João',
        email: 'joao@example.com',
      }

      const result = PacienteCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('deve rejeitar nome maior que 255 caracteres', () => {
      const invalidData = {
        nome: 'a'.repeat(256), // ❌ Muito longo
      }

      const result = PacienteCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('255')
      }
    })
  })

  describe('Exame Schema', () => {
    it('deve validar um exame válido', () => {
      const validData = {
        id: 1,
        nome: 'Hemograma',
        codigo: 'HEM001',
      }

      const result = ExameSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('deve rejeitar exame com nome vazio', () => {
      const invalidData = {
        id: 1,
        nome: '', // ❌ Vazio
      }

      const result = ExameSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('RequisicaoAnalise Schema', () => {
    it('deve validar uma requisição válida', () => {
      const validData = {
        id: 1,
        paciente: 5,
        data_requisicao: '2025-03-11T10:00:00Z',
        status: 'pendente',
      }

      const result = RequisicaoAnaliseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('deve rejeitar requisição com status inválido', () => {
      const invalidData = {
        id: 1,
        paciente: 5,
        data_requisicao: '2025-03-11T10:00:00Z',
        status: 'invalido', // ❌ Status não existe
      }

      const result = RequisicaoAnaliseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('deve aceitar status: pendente, processada, completa, cancelada', () => {
      const statuses = ['pendente', 'processada', 'completa', 'cancelada']

      statuses.forEach(status => {
        const data = {
          id: 1,
          paciente: 5,
          data_requisicao: '2025-03-11T10:00:00Z',
          status: status as any,
        }

        const result = RequisicaoAnaliseSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Helpers', () => {
    it('validatePaciente deve retornar sucesso para dados válidos', () => {
      const result = validatePaciente({
        id: 1,
        nome: 'João',
      })

      expect(result.success).toBe(true)
    })

    it('validatePaciente deve retornar erro para dados inválidos', () => {
      const result = validatePaciente({
        id: 1,
        nome: '', // ❌ Vazio
      })

      expect(result.success).toBe(false)
    })

    it('getValidationErrors deve extrair mensagens de erro por campo', () => {
      const invalidData = {
        id: 1,
        nome: '', // ❌ Vazio
        email: 'invalid', // ❌ Email inválido
      }

      const result = validatePaciente(invalidData)

      if (!result.success) {
        const errors = getValidationErrors(result.error)
        expect(errors).toHaveProperty('nome')
        expect(errors).toHaveProperty('email')
        expect(errors.nome).toContain('obrigatório')
        expect(errors.email).toContain('inválido')
      }
    })
  })
})
