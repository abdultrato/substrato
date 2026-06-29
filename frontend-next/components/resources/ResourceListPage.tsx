"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Search, RotateCcw, BarChart2, Plus } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import ResourceActionPanel from "@/components/resources/ResourceActionPanel"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import Pagination from "@/components/ui/Pagination"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/hooks/useLanguage"
import useDebounce from "@/hooks/useDebounce"
import { useRelationLabels } from "@/hooks/useRelationLabels"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { buildListFields, type FormField } from "@/lib/openapi/formBuilder"
import { fieldLabel } from "@/lib/ui/fieldLabels"
import { canManageUserByHierarchy, GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { createResourceActionLabel } from "@/lib/resources/createLabels"
import { relationTargetForField } from "@/lib/resources/relationOptions"
import { getListColumnConfig } from "@/lib/resources/listColumnConfig"

type Row = Record<string, any>

type RowHref = (row: Row) => string | null | undefined

function pickLabel(row: Row): string {
  const candidates = [
    "name",
    "nome",
    "title",
    "descricao",
    "description",
    "identificador",
    "student_code",
    "teacher_code",
    "bag_identifier",
    "unit_number",
    "dominio",
    "token",
    "numero",
    "referencia_externa",
    "estado",
    "status",
  ]
  for (const key of candidates) {
    const v = row?.[key]
    if (typeof v === "string" && v.trim()) return v
  }
  return ""
}

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

function looksLikeDateKey(key: string): boolean {
  const normalized = String(key || "").toLowerCase()
  return (
    normalized.endsWith("_at") ||
    normalized.endsWith("_on") ||
    normalized.endsWith("_date") ||
    normalized.includes("data") ||
    normalized.includes("date")
  )
}

function looksLikeDateValue(value: any): boolean {
  if (typeof value !== "string") return false
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return false
  return !Number.isNaN(new Date(value).getTime())
}

function pickCode(row: Row): string {
  return (
    row?.id_custom ||
    row?.custom_id ||
    row?.customId ||
    row?.codigo ||
    row?.code ||
    row?.id ||
    "-"
  )
}

function fmtBool(value: any): string {
  if (value === true) return "Sim"
  if (value === false) return "Não"
  return "-"
}

// Normaliza para busca: minúsculas + remove acentos.
function normSearch(value: any): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

// "Haystack" pesquisável: serializa recursivamente todos os valores da linha.
function rowSearchHaystack(row: Row): string {
  const parts: string[] = []
  const walk = (value: any, depth: number) => {
    if (value === null || value === undefined) return
    if (Array.isArray(value)) {
      if (depth > 3) return
      value.forEach((item) => walk(item, depth + 1))
      return
    }
    if (typeof value === "object") {
      if (depth > 3) return
      Object.values(value).forEach((item) => walk(item, depth + 1))
      return
    }
    parts.push(String(value))
  }
  walk(row, 0)
  return normSearch(parts.join("  "))
}

// Motor de busca: divide a consulta em termos e exige que TODOS estejam presentes (AND).
function fullTextFilter(rows: Row[], query: string): Row[] {
  const terms = normSearch(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return rows
  return rows.filter((row) => {
    const hay = rowSearchHaystack(row)
    return terms.every((term) => hay.includes(term))
  })
}

function normalizeEndpointPath(value: string): string {
  const clean = String(value || "").split("?")[0].split("#")[0].trim()
  if (!clean) return "/"
  const prefixed = clean.startsWith("/") ? clean : `/${clean}`
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`
}

function objectFallbackRows(raw: any): Row[] {
  const value = raw && typeof raw === "object" && "data" in raw ? raw.data : raw
  if (!value || typeof value !== "object" || Array.isArray(value)) return []
  if (Array.isArray(value.results)) return []
  if ("detail" in value && Object.keys(value).length <= 2) return []
  return [value as Row]
}

const TECHNICAL_NOISE_FIELDS = new Set([
  // Apenas soft-delete — estes não têm valor de negócio em nenhuma listagem
  "deleted", "deletado",
  "deleted_at", "deletado_em",
  "deleted_by", "deletado_por",
])

const CODE_FIELDS = new Set(["custom_id", "id_custom", "codigo", "código", "code"])

const DUPLICATE_FIELD_GROUPS = [
  ["custom_id", "id_custom", "codigo", "código", "code"],
  ["name", "nome"],
  ["status_display", "estado_legivel", "estado_legível"],
  ["status", "estado"],
  ["created_at", "criado_em"],
  ["updated_at", "atualizado_em"],
  ["created_by", "criado_por"],
  ["updated_by", "atualizado_por"],
  ["tenant", "unidade"],
  ["patient_name", "paciente_nome", "nome_paciente"],
  ["patient_code", "paciente_codigo", "paciente_código", "codigo_paciente", "código_paciente"],
  ["doctor_name", "medico_nome", "médico_nome", "nome_medico", "nome_médico"],
  ["professional_name", "profissional_nome", "nome_profissional"],
  ["employee_name", "funcionario_nome", "funcionário_nome", "nome_funcionario", "nome_funcionário"],
  ["invoice_code", "fatura_codigo", "factura_codigo", "codigo_fatura", "codigo_factura"],
  ["request_code", "requisicao_codigo", "requisição_codigo", "codigo_requisicao", "código_requisição"],
]

const DUPLICATE_CANONICAL_BY_FIELD = DUPLICATE_FIELD_GROUPS.reduce<Record<string, string>>((acc, group) => {
  const canonical = group[0]
  for (const field of group) acc[field] = canonical
  return acc
}, {})

function normalizeFieldName(name: string): string {
  return String(name || "").trim()
}

function valueIsEmpty(value: any): boolean {
  if (value === null || value === undefined || value === "") return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "object") return Object.keys(value).length === 0
  return false
}

function rowHasMeaningfulValue(rows: Row[], key: string): boolean {
  return rows.some((row) => !valueIsEmpty(row?.[key]))
}

function summarizeObject(value: Record<string, any>): string {
  const testName = value?.test_name || value?.name || value?.nome
  if (testName && (value?.test_code || value?.code || value?.custom_id || value?.id_custom)) {
    return String(testName)
  }
  const labelKeys = [
    "name",
    "nome",
    "full_name",
    "display_name",
    "label",
    "title",
    "code",
    "custom_id",
    "id_custom",
    "codigo",
    "email",
    "username",
    "id",
  ]
  const name = value?.name ?? value?.nome
  const code = value?.code ?? value?.codigo ?? value?.código ?? value?.custom_id ?? value?.id_custom
  if (name && code) {
    return String(name)
  }
  const parts: string[] = []
  for (const key of labelKeys) {
    const raw = value?.[key]
    if (raw === null || raw === undefined || raw === "") continue
    parts.push(String(raw))
    if (parts.length >= 2) break
  }
  if (parts.length) return parts.join(" · ")

  const entries = Object.entries(value)
    .filter(([, raw]) => !valueIsEmpty(raw))
    .slice(0, 3)
    .map(([key, raw]) => `${key}: ${String(raw)}`)
  return entries.length ? entries.join(" · ") : "-"
}

function formatListValue(key: string, value: any): string {
  if (valueIsEmpty(value)) return "-"
  if (typeof value === "boolean") return fmtBool(value)
  if (looksLikeDateKey(key) || looksLikeDateValue(value)) return fmtDate(value)
  if (Array.isArray(value)) {
    const rendered = value
      .slice(0, 4)
      .map((item) => {
        if (item && typeof item === "object") {
          if (key === "requested_tests") {
            return String(item?.test_name || item?.name || item?.nome || "-")
          }
          return summarizeObject(item)
        }
        return String(item)
      })
      .filter(Boolean)
    const suffix = value.length > rendered.length ? ` +${value.length - rendered.length}` : ""
    return rendered.length ? `${rendered.join(", ")}${suffix}` : "-"
  }
  if (typeof value === "object") return summarizeObject(value)
  return String(value)
}

function columnClassName(key: string): string {
  const normalized = key.toLowerCase()
  if (looksLikeDateKey(key)) return "whitespace-nowrap"
  if (
    normalized.includes("amount") ||
    normalized.includes("valor") ||
    normalized.includes("price") ||
    normalized.includes("preco") ||
    normalized.includes("preço") ||
    normalized.includes("total") ||
    normalized.includes("salary") ||
    normalized.includes("salario") ||
    normalized.includes("salário") ||
    normalized.includes("quantity") ||
    normalized.includes("quantidade")
  ) {
    return "whitespace-nowrap text-right"
  }
  if (
    normalized.includes("notes") ||
    normalized.includes("observ") ||
    normalized.includes("description") ||
    normalized.includes("descricao") ||
    normalized.includes("descrição") ||
    normalized.includes("reason") ||
    normalized.includes("motivo") ||
    normalized.includes("message") ||
    normalized.includes("mensagem")
  ) {
    return "max-w-[340px] min-w-[220px]"
  }
  return "min-w-[140px]"
}

function columnRank(key: string): number {
  const normalized = key.toLowerCase()
  if (CODE_FIELDS.has(normalized)) return 0
  if (normalized === "id") return 1
  if (["name", "nome", "title", "titulo", "título"].includes(normalized)) return 2
  if (normalized.endsWith("_name") || normalized.endsWith("_nome")) return 3
  if (normalized.endsWith("_code") || normalized.endsWith("_codigo") || normalized.endsWith("_código")) return 4
  if (normalized === "status_display" || normalized === "estado_legivel" || normalized === "estado_legível") return 5
  if (normalized === "status" || normalized === "estado") return 6
  if (normalized === "type" || normalized === "tipo" || normalized.endsWith("_type")) return 7
  if (normalized.includes("patient") || normalized.includes("paciente")) return 8
  if (looksLikeDateKey(normalized) && !["created_at", "updated_at", "criado_em", "atualizado_em"].includes(normalized)) return 20
  if (normalized === "tenant" || normalized === "unidade") return 90
  if (normalized === "created_at" || normalized === "criado_em") return 91
  if (normalized === "updated_at" || normalized === "atualizado_em") return 92
  if (normalized === "created_by" || normalized === "criado_por") return 93
  if (normalized === "updated_by" || normalized === "atualizado_por") return 94
  if (normalized === "version" || normalized === "versao") return 99
  return 40
}

function buildDetailedColumnKeys(rows: Row[], listFields: FormField[]): string[] {
  const schemaKeys = listFields.map((field) => normalizeFieldName(field.name)).filter(Boolean)
  const rowKeys = rows.flatMap((row) => Object.keys(row || {}).map(normalizeFieldName)).filter(Boolean)
  const firstSeenIndex = new Map<string, number>()
  const ordered = [...schemaKeys, ...rowKeys]
  ordered.forEach((key, index) => {
    if (!firstSeenIndex.has(key)) firstSeenIndex.set(key, index)
  })

  const candidatesByCanonical = new Map<string, string[]>()
  for (const key of ordered) {
    const normalized = key.toLowerCase()
    if (TECHNICAL_NOISE_FIELDS.has(normalized)) continue
    const canonical = DUPLICATE_CANONICAL_BY_FIELD[normalized] || normalized
    const inSchema = schemaKeys.includes(key)
    const hasValue = rowHasMeaningfulValue(rows, key)
    if (!inSchema && !hasValue) continue
    const current = candidatesByCanonical.get(canonical) || []
    if (!current.includes(key)) current.push(key)
    candidatesByCanonical.set(canonical, current)
  }

  const keys = Array.from(candidatesByCanonical.values()).map((candidates) => {
    return (
      candidates.find((key) => rowHasMeaningfulValue(rows, key)) ||
      candidates.find((key) => schemaKeys.includes(key)) ||
      candidates[0]
    )
  })

  return keys.sort((a, b) => {
    const rankDiff = columnRank(a) - columnRank(b)
    if (rankDiff !== 0) return rankDiff
    return (firstSeenIndex.get(a) ?? 0) - (firstSeenIndex.get(b) ?? 0)
  })
}

export default function ResourceListPage({
  title,
  subtitle,
  endpoint,
  createHref,
  rowHref,
  requiredGroups,
  groupLabel,
  resourceLabel,
  renderCard,
  cardGridClassName,
  clientFullTextSearch = false,
}: {
  title: string
  subtitle?: string
  endpoint: string
  adminListHref?: string
  createHref?: string
  rowHref?: RowHref
  requiredGroups?: string[]
  groupLabel?: string
  resourceLabel?: string
  /** Quando definido, a lista é renderizada como cartões (em vez da tabela). */
  renderCard?: (row: Row, href: string | null | undefined) => ReactNode
  /** Classe do grid de cartões (permite ajustar nº de colunas / largura). */
  cardGridClassName?: string
  /**
   * Motor de busca multi-campo no cliente: filtra TODAS as variáveis das linhas
   * carregadas (sem acento, múltiplos termos em AND). A pesquisa deixa de ir ao
   * servidor para não pré-filtrar por campos limitados.
   */
  clientFullTextSearch?: boolean
}) {
  const { loading } = useAuthGuard()
  const { user } = useAuth()
  const { t, tr, language } = useLanguage()
  const canCreateIdentityUsers = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.DIRETOR_ESCOLA,
    GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO,
    GROUPS.PROFESSOR,
  ])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  // Máximo de 20 itens por página em todas as listas do frontend.
  const [pageSize, setPageSize] = useState(20)
  const [data, setData] = useState<Row[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const debouncedSearch = useDebounce(search, 300)
  const safeRefreshToken = useSafeDataRefreshSignal()
  const resolvedGroupLabel = useMemo(() => {
    if (groupLabel && groupLabel.trim()) return groupLabel.trim()
    const [fromTitle] = String(title || "").split("/")
    const fallback = (fromTitle || "").trim()
    return fallback || "Módulo"
  }, [groupLabel, title])
  const resolvedResourceLabel = useMemo(() => {
    if (resourceLabel && resourceLabel.trim()) return resourceLabel.trim()
    const titleParts = String(title || "").split("/")
    const fallback = (titleParts[1] || titleParts[0] || "").trim()
    return fallback || "Recurso"
  }, [resourceLabel, title])
  const createActionLabel = useMemo(
    () => createResourceActionLabel(tr(resolvedResourceLabel), language),
    [language, resolvedResourceLabel, tr]
  )

  const normalizedEndpoint = normalizeEndpointPath(endpoint)
  const listFields = useMemo(() => buildListFields(normalizedEndpoint), [normalizedEndpoint])
  const isIdentityUserResource =
    normalizedEndpoint === "/identity/user/" || normalizedEndpoint === "/identidade/user/"

  const requestUrl = useMemo(() => {
    const parsed = new URL(endpoint, "http://local")
    // Com busca full-text no cliente, não enviamos `search` ao servidor para
    // não pré-filtrar por campos limitados — filtramos todas as variáveis localmente.
    if (debouncedSearch.trim() && !clientFullTextSearch) {
      parsed.searchParams.set("search", debouncedSearch.trim())
    } else {
      parsed.searchParams.delete("search")
    }
    return `${parsed.pathname}${parsed.search}`
  }, [debouncedSearch, endpoint, clientFullTextSearch])

  useEffect(() => {
    setPage(1)
  }, [requestUrl, pageSize, statusFilter, debouncedSearch])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoadingData(true)
        setError(null)
        const res = await apiFetchList<Row>(requestUrl, {
          page,
          pageSize,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        })
        if (!mounted) return
        const items = Array.isArray(res?.items) && res.items.length ? res.items : objectFallbackRows(res?.raw)
        const total = res?.meta?.total ?? items.length
        const computedTotalPages =
          res?.meta?.totalPages ??
          (total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1)
        setData(items)
        setTotalItems(total || 0)
        setTotalPages(computedTotalPages)
        if (page > computedTotalPages) setPage(computedTotalPages)
      } catch (e: any) {
        if (mounted) setError(e?.message || t("Falha ao carregar dados.", "Failed to load data."))
      } finally {
        if (mounted) setLoadingData(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [page, pageSize, requestUrl, safeRefreshToken, t])

  const statusOptions = useMemo(() => {
    const set = new Set<string>()
    for (const row of data) {
      const statusValue = String(row?.estado || row?.status || row?.status_comercial || "").trim()
      if (statusValue) set.add(statusValue)
    }
    return [...set]
  }, [data])

  const filteredData = useMemo(() => {
    if (!statusFilter) return data
    return data.filter((row) => String(row?.estado || row?.status || row?.status_comercial || "") === statusFilter)
  }, [data, statusFilter])

  const visibleData = useMemo(() => {
    if (!isIdentityUserResource) return filteredData
    return filteredData.filter((row) =>
      canManageUserByHierarchy(user, {
        id: Number(row?.id || 0) || undefined,
        groups: Array.isArray(row?.group_names) ? row.group_names : [],
      })
    )
  }, [filteredData, isIdentityUserResource, user])

  // Motor de busca full-text no cliente (todas as variáveis) — só quando ativado.
  const searchedData = useMemo(() => {
    if (!clientFullTextSearch || !debouncedSearch.trim()) return visibleData
    return fullTextFilter(visibleData, debouncedSearch)
  }, [clientFullTextSearch, debouncedSearch, visibleData])

  // Paginação a 20/página. Quando o backend não pagina (devolve a coleção
  // inteira), fatiamos no cliente pela janela da página atual; quando o
  // backend devolve uma página parcial, respeitamos a meta do servidor.
  // Com busca full-text no cliente paginamos sempre sobre o resultado filtrado.
  const serverPaginated = totalItems > data.length && !clientFullTextSearch
  const pagedVisibleData = useMemo(() => {
    if (serverPaginated) return searchedData
    const start = (page - 1) * pageSize
    return searchedData.slice(start, start + pageSize)
  }, [serverPaginated, searchedData, page, pageSize])
  const effectiveTotal = serverPaginated ? totalItems : searchedData.length
  const effectiveTotalPages = useMemo(
    () => (serverPaginated ? totalPages : Math.max(1, Math.ceil(searchedData.length / pageSize))),
    [serverPaginated, totalPages, searchedData.length, pageSize]
  )

  // Resolve FKs (sector, exames, etc.) para nomes nas colunas da página atual.
  const { resolve: resolveRelation } = useRelationLabels(normalizedEndpoint, pagedVisibleData)

  const columns = useMemo(
    () => {
      const codeCell = (row: Row) => {
        const label = pickCode(row)
        const canOpenDetails = !isIdentityUserResource || canManageUserByHierarchy(user, {
          id: Number(row?.id || 0) || undefined,
          groups: Array.isArray(row?.group_names) ? row.group_names : [],
        })
        const href = rowHref?.(row)
        if (!href || !canOpenDetails) return label
        return (
          <Link
            href={href}
            className="font-medium text-[var(--text)] transition-colors duration-150 hover:text-[var(--hover-accent)]"
          >
            {label}
          </Link>
        )
      }

      const columnConfig = getListColumnConfig(normalizedEndpoint)
      const labelByField = new Map(listFields.map((field) => [field.name, field.label] as const))
      let keys = buildDetailedColumnKeys(visibleData, listFields)
      if (columnConfig?.hidden?.size) {
        const hidden = columnConfig.hidden
        keys = keys.filter((key) => !hidden.has(key.toLowerCase()))
      }
      if (columnConfig?.showOnly?.size) {
        const showOnly = columnConfig.showOnly
        keys = keys.filter((key) => showOnly.has(key.toLowerCase()))
      }
      if (!keys.length) {
        return [
          {
            header: columnConfig?.codeHeader || t("Código", "Code"),
            render: codeCell,
          },
        ]
      }

      const hasDedicatedCodeColumn = keys.some((key) => CODE_FIELDS.has(key.toLowerCase()))
      return keys.map((key) => {
        const normalized = key.toLowerCase()
        const isCodeColumn = CODE_FIELDS.has(normalized) || (normalized === "id" && !hasDedicatedCodeColumn)
        return {
          header:
            (isCodeColumn && columnConfig?.codeHeader) ||
            columnConfig?.labels?.[normalized] ||
            labelByField.get(key) ||
            fieldLabel({ endpoint: normalizedEndpoint, name: key }),
          render: (row: Row) => {
            if (isCodeColumn) return codeCell(row)
            if (columnConfig?.clickableColumns?.has(normalized)) {
              const href = rowHref?.(row)
              const label = formatListValue(key, row?.[key])
              if (!href) return label
              return (
                <Link
                  href={href}
                  className="font-medium text-[var(--text)] transition-colors duration-150 hover:text-[var(--hover-accent)]"
                >
                  {label}
                </Link>
              )
            }
            // Se a coluna é uma FK (escalar ou M2M), mostra o nome resolvido;
            // senão, a formatação genérica.
            const hasRelation = !!relationTargetForField(key, normalizedEndpoint)
            const formatted = hasRelation
              ? resolveRelation(key, row?.[key], (value) => formatListValue(key, value))
              : formatListValue(key, row?.[key])
            if (formatted.length > 120) {
              return (
                <span title={formatted} className="block max-w-[340px] truncate">
                  {formatted}
                </span>
              )
            }
            return formatted
          },
          className: columnClassName(key),
        }
      })
    },
    [isIdentityUserResource, listFields, normalizedEndpoint, resolveRelation, rowHref, t, user, visibleData]
  )

  if (loading) return null

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="mx-auto w-full max-w-6xl space-y-2.5">
        <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-3 py-2 pl-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/10">
          <span className="absolute left-0 top-0 h-full w-1.5 bg-[var(--primary-500)]" />
          <PageHeader
            title={title}
            subtitle={subtitle}
            actions={
              <>
                {createHref ? (
                  !isIdentityUserResource || canCreateIdentityUsers ? (
                    <Link
                      href={createHref}
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-gradient-to-r from-[var(--primary-600)] to-[var(--primary-500)] px-3.5 text-sm font-semibold leading-tight text-white shadow-sm shadow-[var(--primary-500)]/25 transition-all duration-150 hover:shadow-md hover:brightness-105"
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      {createActionLabel}
                    </Link>
                  ) : null
                ) : null}

                <Link
                  href={`/reports?endpoint=${encodeURIComponent(normalizedEndpoint)}&group=${encodeURIComponent(resolvedGroupLabel)}&resource=${encodeURIComponent(resolvedResourceLabel)}`}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--primary-300)]/60 bg-[var(--primary-500)]/15 px-3.5 text-sm font-semibold text-[var(--primary-700)] shadow-sm backdrop-blur-sm transition hover:bg-[var(--primary-500)]/25 dark:text-[var(--primary-200)]"
                >
                  <BarChart2 size={14} />
                  {t("Ver relatório", "View report")}
                </Link>
              </>
            }
          />

        </section>

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </div>
        )}

        <ResourceActionPanel
          endpoint={normalizedEndpoint}
          resourceLabel={resolvedResourceLabel}
          searchTerm={debouncedSearch}
          statusFilter={statusFilter}
        />

        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/20 p-2 pl-3.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <span className="absolute left-0 top-0 h-full w-1.5 bg-[var(--primary-500)]" />
          <div className="flex flex-nowrap items-end gap-2">
            <label className="min-w-0 flex-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--gray-400)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t(
                    `Pesquise em ${resolvedResourceLabel.toLocaleLowerCase("pt")} por código, nome, estado ou descrição`,
                    `Search ${resolvedResourceLabel.toLowerCase()} by code, name, status or description`
                  )}
                  className="w-full rounded-md border border-white/30 bg-white/55 py-2 pl-8 pr-3 text-sm text-[var(--text)] shadow-sm backdrop-blur-sm transition-colors duration-150 placeholder:text-[var(--gray-400)] hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] dark:border-white/10 dark:bg-white/10"
                />
              </div>
            </label>

            <label className="w-32 shrink-0 sm:w-40">
              <select
                aria-label={t("Estado (na página)", "Status (on page)")}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-white/30 bg-white/55 px-3 py-2 text-sm text-[var(--text)] shadow-sm backdrop-blur-sm transition-colors duration-150 hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] dark:border-white/10 dark:bg-white/10"
              >
                <option value="">{t("Todos", "All")}</option>
                {statusOptions.map((statusValue) => (
                  <option key={statusValue} value={statusValue}>
                    {tr(statusValue)}
                  </option>
                ))}
              </select>
            </label>

            <label className="w-24 shrink-0 sm:w-28">
              <input
                type="number"
                inputMode="numeric"
                aria-label={t("Por página", "Per page")}
                title={t("Por página", "Per page")}
                min={1}
                max={999}
                value={pageSize}
                onChange={(e) => {
                  const raw = Number(e.target.value)
                  if (!Number.isFinite(raw)) return
                  setPageSize(Math.max(1, Math.min(999, Math.round(raw))))
                }}
                className="w-full rounded-md border border-white/30 bg-white/55 px-3 py-2 text-sm text-[var(--text)] shadow-sm backdrop-blur-sm transition-colors duration-150 hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] dark:border-white/10 dark:bg-white/10"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                setSearch("")
                setStatusFilter("")
                setPageSize(20)
                setPage(1)
              }}
              className="inline-flex h-[38px] shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-white/30 bg-white/45 px-3 text-xs font-semibold text-[var(--gray-700)] shadow-sm backdrop-blur-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-white/60 hover:text-[var(--text)] dark:border-white/10 dark:bg-white/10 dark:text-[var(--gray-200)] dark:hover:bg-white/15"
            >
              <RotateCcw size={12} />
              {t("Limpar", "Clear")}
            </button>
          </div>
        </div>

        {loadingData ? (
          <div className="text-sm text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
        ) : (
          <>
            <section className="overflow-hidden rounded-xl border border-white/20 bg-white/20 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{resolvedResourceLabel}</p>
                </div>
                <span className="rounded-full border border-white/25 bg-white/45 px-2.5 py-1 text-[11px] font-semibold text-[var(--gray-700)] shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-[var(--gray-200)]">
                  {pagedVisibleData.length} / {effectiveTotal}
                </span>
              </div>
              <div className="p-2">
                {renderCard ? (
                  pagedVisibleData.length ? (
                    <div className={cardGridClassName || "grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
                      {pagedVisibleData.map((row, index) => (
                        <div key={row?.id ?? row?.custom_id ?? index}>
                          {renderCard(row, rowHref?.(row))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="px-2 py-6 text-center text-sm text-[var(--gray-500)]">
                      {t("Nenhum registo encontrado.", "No record found.")}
                    </p>
                  )
                ) : (
                  <DataTable<Row>
                    columns={columns as any}
                    data={pagedVisibleData}
                    emptyMessage={t("Nenhum registo encontrado.", "No record found.")}
                    searchable={false}
                    bare
                  />
                )}
              </div>
            </section>
            <div className="text-xs text-[var(--gray-600)]">
              {t("Total:", "Total:")} {effectiveTotal} · {t("Na página:", "On page:")} {pagedVisibleData.length} · {t("Página", "Page")} {page} {t("de", "of")} {effectiveTotalPages}
            </div>
            <Pagination page={page} totalPages={effectiveTotalPages} onChange={setPage} />
          </>
        )}
      </div>
    </AppLayout>
  )
}
