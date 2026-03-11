/**
 * Hook para consumir a API de forma tipada com validação Zod
 * Exemplo: const { pacientes, loading, error } = usePacientesTyped()
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { ValidatedPacientesService, getValidationErrors } from '@/lib/api/validated-client'
import { PacienteSchema, type Paciente } from '@/lib/validators/schemas'
import { OpenAPI } from '@/lib/api-client/core/OpenAPI'

// Configuração do cliente OpenAPI
OpenAPI.BASE = '/api/v1'
OpenAPI.TOKEN = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token') || ''
  }
  return ''
}

interface ValidationError {
  [key: string]: string
}

interface PacientesState {
  data: Paciente[]
  loading: boolean
  error: Error | null
  validationErrors: ValidationError | null
  total: number
}

export function usePacientesTyped(
  search?: string,
  ordering?: string,
  limit: number = 20,
  offset: number = 0
) {
  const [state, setState] = useState<PacientesState>({
    data: [],
    loading: false,
    error: null,
    validationErrors: null,
    total: 0,
  })

  const fetchPacientes = useCallback(async () => {
    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      validationErrors: null 
    }))
    
    try {
      const response = await ValidatedPacientesService.list(
        search,
        ordering,
        limit,
        offset
      )
      
      setState(prev => ({
        ...prev,
        data: response.results || [],
        total: response.count || 0,
        loading: false,
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error(String(err)),
        loading: false,
      }))
    }
  }, [search, ordering, limit, offset])

  useEffect(() => {
    fetchPacientes()
  }, [fetchPacientes])

  const criar = useCallback(async (pacienteData: Omit<Paciente, 'id' | 'criado_em'>) => {
    setState(prev => ({ ...prev, loading: true, validationErrors: null }))
    
    try {
      // Validação em tempo de compilação + runtime
      const validacao = PacienteSchema.safeParse({
        id: 0, // fake id para validação
        ...pacienteData,
      })

      if (!validacao.success) {
        const errors = getValidationErrors(validacao.error)
        setState(prev => ({
          ...prev,
          validationErrors: errors,
          loading: false,
        }))
        throw new Error('Validação falhou: ' + JSON.stringify(errors))
      }

      const result = await ValidatedPacientesService.create(pacienteData)
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          data: [...prev.data, result.data],
          loading: false,
        }))
        return result.data
      } else {
        const errors = getValidationErrors(result.error)
        setState(prev => ({
          ...prev,
          validationErrors: errors,
          loading: false,
        }))
        throw new Error('Validação de resposta falhou')
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error(String(err)),
        loading: false,
      }))
      throw err
    }
  }, [])

  const atualizar = useCallback(async (id: number, pacienteData: Partial<Paciente>) => {
    setState(prev => ({ ...prev, loading: true, validationErrors: null }))
    
    try {
      const result = await ValidatedPacientesService.update(id, pacienteData)
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          data: prev.data.map(p => p.id === id ? result.data : p),
          loading: false,
        }))
        return result.data
      } else {
        const errors = getValidationErrors(result.error)
        setState(prev => ({
          ...prev,
          validationErrors: errors,
          loading: false,
        }))
        throw new Error('Validação de resposta falhou')
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error(String(err)),
        loading: false,
      }))
      throw err
    }
  }, [])

  const deletar = useCallback(async (id: number) => {
    setState(prev => ({ ...prev, loading: true }))
    
    try {
      await ValidatedPacientesService.delete(id)
      setState(prev => ({
        ...prev,
        data: prev.data.filter(p => p.id !== id),
        loading: false,
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error(String(err)),
        loading: false,
      }))
      throw err
    }
  }, [])

  return {
    pacientes: state.data,
    loading: state.loading,
    error: state.error,
    validationErrors: state.validationErrors,
    total: state.total,
    criar,
    atualizar,
    deletar,
    refetch: fetchPacientes,
  }
}
