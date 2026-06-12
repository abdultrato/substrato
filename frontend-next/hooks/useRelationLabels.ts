"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import {
  relationOptionFromRow,
  relationTargetForField,
  type RelationTarget,
} from "@/lib/resources/relationOptions"

const DEFAULT_ARRAY_CAP = 12

/** ID numérico de uma FK escalar (number ou string só-dígitos); senão null. */
export function relationIdFromScalar(value: unknown): string | null {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null
  if (typeof value !== "string") return null
  const text = value.trim()
  return /^\d+$/.test(text) ? text : null
}

function relationDetailEndpoint(target: RelationTarget, id: string): string {
  const base = target.endpoint.split("?")[0].replace(/\/?$/, "/")
  return `${base}${encodeURIComponent(id)}/`
}

type Lookup = { key: string; id: string; target: RelationTarget }

export type ResolveOptions = {
  /** Junta os nomes de um array/M2M. Default: ", ". */
  joinWith?: string
  /** Máximo de itens listados antes de "+N". Default: 12. */
  cap?: number
  /** Texto do excedente. Default: `(n) => "+" + n`. */
  more?: (count: number) => string
}

export type RelationLabelResolver = {
  /** Mapa "campo:id" -> rótulo legível, preenchido à medida que resolve. */
  labels: Record<string, string>
  /**
   * Resolve o valor de um campo para nomes legíveis. Trata FK escalar e
   * arrays/M2M de FKs. Quando o campo não é uma relação (ou ainda não
   * resolveu), usa `fallback(value)`.
   */
  resolve: (
    fieldName: string,
    value: unknown,
    fallback: (value: unknown) => string,
    options?: ResolveOptions
  ) => string
}

/**
 * Resolve FKs (escalar e M2M/array) das linhas para nomes legíveis, buscando os
 * registos relacionados via OpenAPI (`relationOptions`). Partilhado pelo cartão
 * de detalhe e pelas listagens. Faz merge no estado para não apagar rótulos já
 * resolvidos quando o efeito volta a correr (refresh em segundo plano).
 */
export function useRelationLabels(
  endpoint: string,
  rows: Array<Record<string, any>>
): RelationLabelResolver {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [labels, setLabels] = useState<Record<string, string>>({})

  const lookups = useMemo(() => {
    const seen = new Set<string>()
    const out: Lookup[] = []
    for (const row of rows || []) {
      if (!row || typeof row !== "object") continue
      for (const [fieldName, value] of Object.entries(row)) {
        const target = relationTargetForField(fieldName, endpoint)
        if (!target) continue
        const items = Array.isArray(value) ? value : [value]
        for (const item of items) {
          const id = relationIdFromScalar(item)
          if (!id) continue
          const key = `${fieldName}:${id}`
          if (seen.has(key)) continue
          seen.add(key)
          out.push({ key, id, target })
        }
      }
    }
    return out
  }, [rows, endpoint])

  useEffect(() => {
    let mounted = true
    if (!lookups.length) return

    async function load() {
      const loaded: Record<string, string> = {}
      await Promise.all(
        lookups.map(async ({ key, id, target }) => {
          try {
            const relationRow = await apiFetch<Record<string, any>>(
              relationDetailEndpoint(target, id),
              { clientCache: safeRefreshToken === 0, clientCacheTtlMs: 60000 }
            )
            const option = relationOptionFromRow(relationRow, target)
            if (option) loaded[key] = option.label
          } catch {
            // Mantém o valor original quando a relação não está disponível.
          }
        })
      )
      if (mounted && Object.keys(loaded).length) {
        setLabels((current) => ({ ...current, ...loaded }))
      }
    }

    load().catch(() => {
      // Mantém os rótulos já resolvidos mesmo se uma resolução falhar.
    })

    return () => {
      mounted = false
    }
  }, [lookups, safeRefreshToken])

  const resolve = useCallback(
    (
      fieldName: string,
      value: unknown,
      fallback: (value: unknown) => string,
      options?: ResolveOptions
    ): string => {
      const target = relationTargetForField(fieldName, endpoint)
      if (!target) return fallback(value)

      if (Array.isArray(value)) {
        if (!value.length) return fallback(value)
        const cap = options?.cap ?? DEFAULT_ARRAY_CAP
        const joinWith = options?.joinWith ?? ", "
        const more = options?.more ?? ((count: number) => `+${count}`)
        const names = value.slice(0, cap).map((item) => {
          const id = relationIdFromScalar(item)
          return (id && labels[`${fieldName}:${id}`]) || fallback(item)
        })
        if (value.length > cap) names.push(more(value.length - cap))
        return names.join(joinWith)
      }

      const id = relationIdFromScalar(value)
      return (id && labels[`${fieldName}:${id}`]) || fallback(value)
    },
    [labels, endpoint]
  )

  return { labels, resolve }
}
