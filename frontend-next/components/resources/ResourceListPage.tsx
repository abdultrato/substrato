"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Search, RotateCcw } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import Pagination from "@/components/ui/Pagination"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/hooks/useLanguage"
import useDebounce from "@/hooks/useDebounce"
import { apiFetch, apiFetchList } from "@/lib/api"
import { bloodbankResourceKeyFromEndpoint } from "@/lib/ui/fieldLabels"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type Row = Record<string, any>

type RowHref = (row: Row) => string

function pickLabel(row: Row): string {
  const candidates = [
    "nome",
    "descricao",
    "identificador",
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

function fmtTemp(minC: any, maxC: any): string {
  const min = minC ?? ""
  const max = maxC ?? ""
  if (min === "" && max === "") return "-"
  if (min !== "" && max !== "") return `${min} - ${max} °C`
  return `${min || max} °C`
}

const BLOODBANK_MAINTENANCE_TYPE: Record<string, string> = {
  PRV: "Preventiva",
  COR: "Corretiva",
  CAL: "Calibração",
  SAN: "Higienização",
  TMP: "Validação de temperatura",
}

const BLOODBANK_MAINTENANCE_STATUS: Record<string, string> = {
  SCH: "Agendada",
  INP: "Em andamento",
  COM: "Concluída",
  CAN: "Cancelada",
}

export default function ResourceListPage({
  title,
  subtitle,
  endpoint,
  adminListHref,
  createHref,
  rowHref,
  requiredGroups,
}: {
  title: string
  subtitle?: string
  endpoint: string
  adminListHref?: string
  createHref?: string
  rowHref?: RowHref
  requiredGroups?: string[]
}) {
  const { loading } = useAuthGuard()
  const { user } = useAuth()
  const { t, tr } = useLanguage()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [data, setData] = useState<Row[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [bloodStorages, setBloodStorages] = useState<Record<number, string>>({})
  const debouncedSearch = useDebounce(search, 300)

  const bloodbankResource = bloodbankResourceKeyFromEndpoint(endpoint)
  const needsBloodStorageLookup =
    bloodbankResource === "manutencaoarmazenamento" || bloodbankResource === "unidade" || bloodbankResource === "movimentoestoque"

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
        const res = await apiFetchList<Row>(requestUrl, { page, pageSize })
        if (!mounted) return
        const items = Array.isArray(res?.items) ? res.items : []
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
  }, [page, pageSize, requestUrl, t])

  useEffect(() => {
    let mounted = true
    async function loadStorages() {
      if (!needsBloodStorageLookup) return
      try {
        const res = await apiFetch<any>("/bloodbank/armazenamento/")
        const items = res && (res as any).results ? (res as any).results : res
        const map: Record<number, string> = {}
        if (Array.isArray(items)) {
          for (const s of items) {
            const id = Number(s?.id)
            if (!Number.isFinite(id)) continue
            const name = String(s?.name || s?.custom_id || s?.id_custom || id)
            map[id] = name
          }
        }
        if (mounted) setBloodStorages(map)
      } catch {
        // ignore (still show numeric ids)
      }
    }
    loadStorages()
    return () => {
      mounted = false
    }
  }, [needsBloodStorageLookup])

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

  const columns = useMemo(
    () => [
      {
        header: t("Código", "Code"),
        render: (row: Row) => {
          const label = pickCode(row)
          if (!rowHref) return label
          return (
            <Link
              href={rowHref(row)}
              className="font-medium text-[var(--text)] hover:text-[var(--hover-accent)]"
            >
              {label}
            </Link>
          )
        },
      },
      {
        header: t("Nome", "Name"),
        render: (row: Row) => pickLabel(row) || "-",
      },
      {
        header: t("Estado", "Status"),
        render: (row: Row) =>
          tr(String(row.estado || row.status || row.status_comercial || "-")),
      },
      {
        header: t("Criado em", "Created at"),
        render: (row: Row) => fmtDate(row.criado_em || row.created_at),
      },
    ],
    [rowHref, t, tr]
  )

  if (loading) return null

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="mx-auto w-full max-w-6xl space-y-3">
        <PageHeader
          title={title}
          subtitle={subtitle || t("Registos disponíveis no módulo selecionado.", "Available records in the selected module.")}
          actions={
            <>
              {createHref ? (
                <Link
                  href={createHref}
                  className="inline-flex items-center rounded-lg bg-[var(--primary-600)] px-2.5 py-1 text-sm font-semibold leading-tight text-white transition hover:bg-[var(--primary-700)]"
                >
                  {t("Novo", "New")}
                </Link>
              ) : null}

              {adminListHref && podeVerAdmin ? (
                <Link
                  href={adminListHref}
                  className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-sm font-medium leading-tight text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
                >
                  {t("Abrir na administração", "Open in administration")}
                </Link>
              ) : null}
            </>
          }
        />

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
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
                  placeholder={t("Código, nome, estado ou descrição", "Code, name, status or description")}
                  className="w-full rounded-lg border border-[var(--border)] bg-white py-2 pl-8 pr-3 text-sm text-[var(--text)] shadow-sm"
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
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] shadow-sm"
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
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] shadow-sm"
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
              {t("Total:", "Total:")} {totalItems} · {t("Na página:", "On page:")} {filteredData.length}
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch("")
                setStatusFilter("")
                setPageSize(50)
                setPage(1)
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 font-semibold text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
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
              data={filteredData}
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
