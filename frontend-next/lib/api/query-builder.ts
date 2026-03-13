/**
 * Query Parameter Builder
 * Type-safe construction de query parameters para filtros, ordenação e paginação
 */

export interface PaginationParams {
  limit?: number
  offset?: number
}

export interface FilterParams {
  [key: string]: string | number | boolean | undefined | null
}

export interface OrderingParams {
  orderBy?: string
  order?: 'asc' | 'desc'
}

/**
 * Query Builder para construir query parameters
 */
export class QueryBuilder {
  private params: Record<string, string | number | boolean | undefined | null> = {}

  /**
   * Adicionar parâmetros de paginação
   */
  paginate(limit: number, offset: number = 0): this {
    this.params.limit = limit
    this.params.offset = offset
    return this
  }

  /**
   * Adicionar filtros
   */
  filter(filters: FilterParams): this {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        this.params[key] = value
      }
    })
    return this
  }

  /**
   * Adicionar um filtro específico
   */
  filterBy(key: string, value: string | number | boolean): this {
    this.params[key] = value
    return this
  }

  /**
   * Adicionar busca
   */
  search(query: string): this {
    if (query.trim()) {
      this.params.search = query
    }
    return this
  }

  /**
   * Adicionar ordenação
   */
  orderBy(field: string, order: 'asc' | 'desc' = 'asc'): this {
    this.params.ordering = order === 'desc' ? `-${field}` : field
    return this
  }

  /**
   * Adicionar múltiplos campos de ordenação
   */
  orderByMultiple(fields: Array<{ field: string; order: 'asc' | 'desc' }>): this {
    const ordering = fields
      .map(({ field, order }) => (order === 'desc' ? `-${field}` : field))
      .join(',')
    this.params.ordering = ordering
    return this
  }

  /**
   * Adicionar parâmetro customizado
   */
  param(key: string, value: string | number | boolean | null | undefined): this {
    this.params[key] = value
    return this
  }

  /**
   * Limpar um parâmetro
   */
  clearParam(key: string): this {
    delete this.params[key]
    return this
  }

  /**
   * Limpar todos os parâmetros
   */
  clear(): this {
    this.params = {}
    return this
  }

  /**
   * Obter parâmetros como objeto
   */
  build(): Record<string, string | number | boolean | undefined | null> {
    return { ...this.params }
  }

  /**
   * Obter parâmetros como URLSearchParams
   */
  toSearchParams(): URLSearchParams {
    const params = new URLSearchParams()
    Object.entries(this.params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, String(value))
      }
    })
    return params
  }

  /**
   * Obter parâmetros como query string
   */
  toString(): string {
    return this.toSearchParams().toString()
  }
}

/**
 * Criar novo QueryBuilder
 */
export function createQueryBuilder(): QueryBuilder {
  return new QueryBuilder()
}

/**
 * Query Builder para Pacientes (com campos específicos)
 */
export class PacientesQueryBuilder extends QueryBuilder {
  /**
   * Filtrar por nome
   */
  byName(name: string): this {
    return this.filterBy('nome', name)
  }

  /**
   * Filtrar por email
   */
  byEmail(email: string): this {
    return this.filterBy('email', email)
  }

  /**
   * Filtrar por número ID
   */
  byNumeroId(numeroId: string): this {
    return this.filterBy('numero_id', numeroId)
  }

  /**
   * Filtrar por género
   */
  byGenero(genero: 'M' | 'F'): this {
    return this.filterBy('genero', genero)
  }

  /**
   * Ordenar por padrão (nome)
   */
  defaultOrder(): this {
    return this.orderBy('nome', 'asc')
  }

  /**
   * Ordenar por criação (mais recentes primeiro)
   */
  byNewest(): this {
    return this.orderBy('criado_em', 'desc')
  }
}

/**
 * Query Builder para Exames
 */
export class ExamesQueryBuilder extends QueryBuilder {
  /**
   * Filtrar por tipo
   */
  byType(type: string): this {
    return this.filterBy('tipo', type)
  }

  /**
   * Filtrar por paciente
   */
  byPaciente(pacienteId: number): this {
    return this.filterBy('paciente', pacienteId)
  }

  /**
   * Filtrar por status
   */
  byStatus(status: string): this {
    return this.filterBy('status', status)
  }

  /**
   * Ordenar por padrão (tipo)
   */
  defaultOrder(): this {
    return this.orderBy('tipo', 'asc')
  }

  /**
   * Ordenar por criação (mais recentes primeiro)
   */
  byNewest(): this {
    return this.orderBy('criado_em', 'desc')
  }
}

/**
 * Factory para criar query builders específicos
 */
export const QueryBuilders = {
  pacientes: () => new PacientesQueryBuilder(),
  exames: () => new ExamesQueryBuilder(),
  generic: () => new QueryBuilder(),
}
