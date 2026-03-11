/**
 * Hook para consumir a API de forma tipada usando o cliente gerado
 * Exemplo: const { data, loading, error } = usePacientes()
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { PacientesService } from '@/lib/api-client/services/PacientesService'
import type { Paciente } from '@/lib/api-client/models/Paciente'
import { OpenAPI } from '@/lib/api-client/core/OpenAPI'

// Configuração do cliente OpenAPI
OpenAPI.BASE = '/api/v1'
OpenAPI.TOKEN = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token') || ''
  }
  return ''
}

interface PacientesState {
  data: Paciente[]
  loading: boolean
  error: Error | null
  total: number
}

export function usePacientes(
  search?: string,
  ordering?: string,
  limit: number = 20,
  offset: number = 0
) {
  const [state, setState] = useState<PacientesState>({
    data: [],
    loading: false,
    error: null,
    total: 0,
  })

  const fetchPacientes = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const response = await PacientesService.clinicoPacientesList(
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

  const criar = useCallback(async (paciente: Omit<Paciente, 'id' | 'criado_em'>) => {
    setState(prev => ({ ...prev, loading: true }))
    
    try {
      const novoP = await PacientesService.clinicoPacientesCreate(paciente as Paciente)
      setState(prev => ({
        ...prev,
        data: [...prev.data, novoP],
        loading: false,
      }))
      return novoP
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error(String(err)),
        loading: false,
      }))
      throw err
    }
  }, [])

  const atualizar = useCallback(async (id: number, paciente: Partial<Paciente>) => {
    setState(prev => ({ ...prev, loading: true }))
    
    try {
      const atualizado = await PacientesService.clinicoPacientesPartialUpdate(id, paciente as Paciente)
      setState(prev => ({
        ...prev,
        data: prev.data.map(p => p.id === id ? atualizado : p),
        loading: false,
      }))
      return atualizado
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
      await PacientesService.clinicoPacientesDestroy(id)
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
    total: state.total,
    criar,
    atualizar,
    deletar,
    refetch: fetchPacientes,
  }
}
