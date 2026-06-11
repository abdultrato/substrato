"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Search, RotateCcw } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import ResourceActionPanel from "@/components/resources/ResourceActionPanel"
import ResourceModelReportPanel from "@/components/resources/ResourceModelReportPanel"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import Pagination from "@/components/ui/Pagination"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/hooks/useLanguage"
import useDebounce from "@/hooks/useDebounce"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { buildListFields, type FormField } from "@/lib/openapi/formBuilder"
import { fieldLabel } from "@/lib/ui/fieldLabels"
import { canManageUserByHierarchy, GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { createResourceActionLabel } from "@/lib/resources/createLabels"

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
        if (item && typeof item === "object") return summarizeObject(item)
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
  adminListHref,
  createHref,
  rowHref,
  requiredGroups,
  groupLabel,
  resourceLabel,
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
}) {
  const { loading } = useAuthGuard()
  const { user } = useAuth()
  const { t, tr, language } = useLanguage()
  const canViewAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const canCreateIdentityUsers = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.DIRETOR_ESCOLA,
    GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO,
    GROUPS.PROFESSOR,
  ])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
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
    if (debouncedSearch.trim()) {
      parsed.searchParams.set("search", debouncedSearch.trim())
    } else {
      parsed.searchParams.delete("search")
    }
    return `${parsed.pathname}${parsed.search}`
  }, [debouncedSearch, endpoint])

  useEffect(() => {
    setPage(1)
  }, [requestUrl, pageSize])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoadingData(true)
        setError(null)
        const res = await apiFetchList<Row>(requestUrl, {
          page,
          pageSize,
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

      const labelByField = new Map(listFields.map((field) => [field.name, field.label] as const))
      const keys = buildDetailedColumnKeys(visibleData, listFields)
      if (!keys.length) {
        return [
          {
            header: t("Código", "Code"),
            render: codeCell,
          },
        ]
      }

      const hasDedicatedCodeColumn = keys.some((key) => CODE_FIELDS.has(key.toLowerCase()))
      return keys.map((key) => {
        const normalized = key.toLowerCase()
        const isCodeColumn = CODE_FIELDS.has(normalized) || (normalized === "id" && !hasDedicatedCodeColumn)
        return {
          header: labelByField.get(key) || fieldLabel({ endpoint: normalizedEndpoint, name: key }),
          render: (row: Row) => {
            if (isCodeColumn) return codeCell(row)
            const formatted = formatListValue(key, row?.[key])
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
    [isIdentityUserResource, listFields, normalizedEndpoint, rowHref, t, user, visibleData]
  )

  if (loading) return null

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="mx-auto w-full max-w-6xl space-y-3">
        <PageHeader
          title={title}
          subtitle={subtitle}
          actions={
            <>
              {createHref ? (
                !isIdentityUserResource || canCreateIdentityUsers ? (
                  <Link
                    href={createHref}
                    className="inline-flex h-9 items-center rounded-md bg-[var(--primary-600)] px-3 text-sm font-semibold leading-tight text-white shadow-sm transition-all duration-150 hover:bg-[var(--primary-700)] hover:shadow-md"
                  >
                    {createActionLabel}
                  </Link>
                ) : null
              ) : null}

              {adminListHref && canViewAdmin ? (
                <Link
                  href={adminListHref}
                  className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium leading-tight text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
                >
                  {t("Abrir na administração", "Open in administration")}
                </Link>
              ) : null}
            </>
          }
        />

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </div>
        )}

        <ResourceModelReportPanel
          endpoint={normalizedEndpoint}
          groupLabel={resolvedGroupLabel}
          resourceLabel={resolvedResourceLabel}
          searchTerm={debouncedSearch}
          statusFilter={statusFilter}
        />

        <ResourceActionPanel
          endpoint={normalizedEndpoint}
          resourceLabel={resolvedResourceLabel}
          searchTerm={debouncedSearch}
          statusFilter={statusFilter}
        />

        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1 xl:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)]">
                {t("Pesquisar", "Search")}
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--gray-400)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t(
                    `Pesquise em ${resolvedResourceLabel.toLocaleLowerCase("pt")} por código, nome, estado ou descrição`,
                    `Search ${resolvedResourceLabel.toLowerCase()} by code, name, status or description`
                  )}
                  className="w-full rounded-md border border-[var(--border)] bg-white py-2 pl-8 pr-3 text-sm text-[var(--text)] shadow-sm transition-colors duration-150 placeholder:text-[var(--gray-400)] hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
                />
              </div>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)]">
                {t("Estado (na página)", "Status (on page)")}
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] shadow-sm transition-colors duration-150 hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
              >
                <option value="">{t("Todos", "All")}</option>
                {statusOptions.map((statusValue) => (
                  <option key={statusValue} value={statusValue}>
                    {tr(statusValue)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)]">
                {t("Por página", "Per page")}
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] shadow-sm transition-colors duration-150 hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--gray-600)]">
            <span>
              {t("Total:", "Total:")} {totalItems} · {t("Na página:", "On page:")} {visibleData.length}
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch("")
                setStatusFilter("")
                setPageSize(50)
                setPage(1)
              }}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 font-semibold text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
            >
              <RotateCcw size={12} />
              {t("Limpar filtros", "Clear filters")}
            </button>
          </div>
        </div>

        {loadingData ? (
          <div className="text-sm text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
        ) : (
          <>
            <DataTable<Row>
              columns={columns as any}
              data={visibleData}
              emptyMessage={t("Nenhum registo encontrado.", "No record found.")}
              searchable={false}
            />
            <div className="mt-2 text-xs text-[var(--gray-600)]">
              {t("Página", "Page")} {page} {t("de", "of")} {totalPages}
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </AppLayout>
  )
}
