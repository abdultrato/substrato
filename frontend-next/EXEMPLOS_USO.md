/**
 * Ejemplos de uso del nuevo API Client Pattern (FASE 4-5)
 * Muestra como usar QueryBuilders, PacientesService, validación, y error handling
 */

// ============================================================================
// EJEMPLO 1: Listar Pacientes con Filtros
// ============================================================================

import { PacientesService } from '@/lib/api/typed-client'
import { QueryBuilders } from '@/lib/api/query-builder'
import { ApiError } from '@/lib/errors/api-error'
import { useState, useEffect } from 'react'

export function PacientesList() {
  const [pacientes, setPacientes] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPacientes()
  }, [])

  async function loadPacientes() {
    setLoading(true)
    setError(null)

    try {
      const service = new PacientesService()

      // Construir query com filtros
      const query = QueryBuilders.pacientes()
        .byGenero('F')           // Filtrar por género
        .search('silva')         // Buscar por nome
        .paginate(10, 0)         // 10 resultados, página 0
        .defaultOrder()          // Ordernar por nome ASC

      // Fazer requisição com retry automático
      const result = await service.list(query, {
        maxRetries: 3,
        onRetry: (error, attempt, delay) => {
          console.log(`Retry #${attempt} em ${delay}ms`)
        }
      })

      // Resultado é discriminated union
      setPacientes(result.data.results)
      console.log(`Carregados ${result.data.count} pacientes`)

    } catch (err) {
      if (err instanceof ApiError) {
        // Error é RFC 7807 com campos específicos
        setError({
          title: err.title,
          detail: err.detail,
          status: err.status,
          validationErrors: err.validationErrors
        })
      } else {
        setError({ detail: 'Erro desconhecido' })
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Carregando...</div>

  if (error) {
    return (
      <div className="error">
        <h2>{error.title || 'Erro'}</h2>
        <p>{error.detail}</p>
        {error.validationErrors && (
          <ul>
            {Object.entries(error.validationErrors).map(([field, msg]) => (
              <li key={field}>{field}: {msg}</li>
            ))}
          </ul>
        )}
        <button onClick={loadPacientes}>Tentar Novamente</button>
      </div>
    )
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Email</th>
          <th>Género</th>
        </tr>
      </thead>
      <tbody>
        {pacientes.map(p => (
          <tr key={p.id}>
            <td>{p.nome}</td>
            <td>{p.email}</td>
            <td>{p.genero}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ============================================================================
// EXEMPLO 2: Criar Paciente com Validação
// ============================================================================

import { PacienteSchema } from '@/lib/validators/schemas'
import { getValidationErrors } from '@/lib/validators/schemas'

export function CreatePacienteForm() {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    morada: '',
    genero: 'M',
  })
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})
    setSuccess(false)

    // Validação frontend (Zod)
    const validation = PacienteSchema.safeParse(formData)
    
    if (!validation.success) {
      // Zod validation failed
      setErrors(getValidationErrors(validation.error))
      return
    }

    try {
      const service = new PacientesService()

      // Criar paciente (sem retry para mutations)
      const result = await service.create(formData)

      setSuccess(true)
      setFormData({ nome: '', email: '', morada: '', genero: 'M' })
      console.log('Paciente criado:', result.data.id)

    } catch (err) {
      if (err instanceof ApiError) {
        // Erro de validação do backend
        if (err.isValidationError() && err.validationErrors) {
          setErrors(err.validationErrors)
        } else {
          // Outro tipo de erro
          setErrors({ _form: err.detail })
        }
      }
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {success && <div className="success">Paciente criado com sucesso!</div>}

      {errors._form && <div className="error">{errors._form}</div>}

      <div>
        <label>
          Nome: <span>*</span>
          <input
            value={formData.nome}
            onChange={(e) => setFormData({...formData, nome: e.target.value})}
            placeholder="Mínimo 2 caracteres"
          />
        </label>
        {errors.nome && <span className="error">{errors.nome}</span>}
      </div>

      <div>
        <label>
          Email:
          <input
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            type="email"
          />
        </label>
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div>
        <label>
          Morada: <span>*</span>
          <input
            value={formData.morada}
            onChange={(e) => setFormData({...formData, morada: e.target.value})}
            placeholder="Mínimo 5 caracteres"
          />
        </label>
        {errors.morada && <span className="error">{errors.morada}</span>}
      </div>

      <div>
        <label>
          Género: <span>*</span>
          <select
            value={formData.genero}
            onChange={(e) => setFormData({...formData, genero: e.target.value})}
          >
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </label>
      </div>

      <button type="submit">Criar Paciente</button>
    </form>
  )
}

// ============================================================================
// EXEMPLO 3: Editar Paciente
// ============================================================================

export function EditPacienteForm({ pacienteId }) {
  const [paciente, setPaciente] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadPaciente()
  }, [pacienteId])

  async function loadPaciente() {
    try {
      const service = new PacientesService()
      const result = await service.getById(pacienteId)
      setPaciente(result.data)
    } catch (err) {
      console.error('Erro carregando paciente:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate() {
    setSaving(true)
    setErrors({})

    try {
      const service = new PacientesService()
      const result = await service.update(pacienteId, paciente)
      
      setPaciente(result.data)
      console.log('Paciente atualizado')
    } catch (err) {
      if (err instanceof ApiError && err.validationErrors) {
        setErrors(err.validationErrors)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Carregando...</div>
  if (!paciente) return <div>Paciente não encontrado</div>

  return (
    <form>
      <div>
        <label>
          Nome:
          <input
            value={paciente.nome}
            onChange={(e) => setPaciente({...paciente, nome: e.target.value})}
          />
        </label>
        {errors.nome && <span className="error">{errors.nome}</span>}
      </div>

      <div>
        <label>
          Email:
          <input
            value={paciente.email || ''}
            onChange={(e) => setPaciente({...paciente, email: e.target.value})}
            type="email"
          />
        </label>
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <button 
        type="button" 
        onClick={handleUpdate}
        disabled={saving}
      >
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}

// ============================================================================
// EXEMPLO 4: Buscar Pacientes em Tempo Real
// ============================================================================

export function SearchPacientes() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  async function handleSearch(searchQuery) {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    try {
      const service = new PacientesService()
      const result = await service.search(searchQuery, 10, {
        maxRetries: 2,
        initialDelayMs: 500,
      })
      setResults(result.data.results)
    } catch (err) {
      console.error('Erro na busca:', err)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Buscar paciente..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          handleSearch(e.target.value)
        }}
      />

      {isSearching && <div>Buscando...</div>}

      <ul>
        {results.map(p => (
          <li key={p.id}>{p.nome} ({p.email})</li>
        ))}
      </ul>
    </div>
  )
}

// ============================================================================
// EXEMPLO 5: Com Autenticação (Interceptor)
// ============================================================================

import { useAuth } from '@/hooks/useAuth'

export function AuthenticatedPacientesList() {
  const { token } = useAuth()
  const [pacientes, setPacientes] = useState([])

  useEffect(() => {
    loadPacientes()
  }, [token])

  async function loadPacientes() {
    const service = new PacientesService()

    // Adicionar token de autenticación
    service.addRequestInterceptor((config) => {
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
      }
      return config
    })

    // Agora todos os requests incluem o token
    const result = await service.list()
    setPacientes(result.data.results)
  }

  return (
    <ul>
      {pacientes.map(p => (
        <li key={p.id}>{p.nome}</li>
      ))}
    </ul>
  )
}

// ============================================================================
// EXEMPLO 6: Tratamento Avanzado de Erros
// ============================================================================

export function ErrorHandlingExample() {
  async function handleComplexOperation() {
    try {
      const service = new PacientesService()
      const query = QueryBuilders.pacientes().paginate(10)

      const result = await service.list(query, {
        maxRetries: 5,
        initialDelayMs: 1000,
        backoffMultiplier: 2,
        onRetry: (error, attempt, delay) => {
          console.log(`Tentativa ${attempt}, aguardando ${delay}ms`)
          // Atualizar UI com status de retry
        }
      })

      console.log('Sucesso após possíveis retries:', result.data.count)

    } catch (err) {
      // Tratamiento específico por tipo de erro
      if (err instanceof ApiError) {
        if (err.isAuthError()) {
          // Erro 401/403 - redirect para login
          window.location.href = '/login'
        } else if (err.isValidationError()) {
          // Erro 422 - mostrar erros de validación
          console.log('Campos inválidos:', err.validationErrors)
        } else if (err.isRetryable()) {
          // Erro 5xx, 429, 408 - foi tentado retry
          console.log('Servidor indisponível após retries')
        } else {
          // Outro tipo de erro
          console.log('Erro:', err.detail)
        }
      } else {
        // Erro não-API
        console.error('Erro inesperado:', err)
      }
    }
  }

  return (
    <button onClick={handleComplexOperation}>
      Operação Complexa com Error Handling
    </button>
  )
}

// ============================================================================
// RESUMO DO PATRÓN
// ============================================================================

/**
 * PADRÓN NUEVO (FASE 4-5):
 *
 * 1. Criar Service:
 *    const service = new PacientesService()
 *
 * 2. Construir Query:
 *    const qb = QueryBuilders.pacientes()
 *      .byGenero('M')
 *      .search('joão')
 *      .paginate(10)
 *
 * 3. Fazer Requisição:
 *    const result = await service.list(qb, retryOptions)
 *
 * 4. Checar Resultado:
 *    if (result.success) {
 *      console.log(result.data)
 *    } else {
 *      console.log(result.error)
 *    }
 *
 * BENEFICIOS:
 * ✅ Type-safe: result.data é tipado como Paciente[]
 * ✅ Validação automática com Zod
 * ✅ Error handling RFC 7807
 * ✅ Retry automático com exponential backoff
 * ✅ Interceptors para auth, logging, etc
 * ✅ QueryBuilders para filtros type-safe
 * ✅ Sem breaking changes - backward compatible
 */
