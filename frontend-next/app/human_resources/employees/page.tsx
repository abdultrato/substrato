"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Search, X } from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import Pagination from "@/components/ui/Pagination"
import { apiFetchList, extractResults } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"

type Employee = {
  id: number
  custom_id: string
  name: string
  role?: number | null
  role_name?: string | null
  profession?: number | null
  profession_name?: string | null
  status: string
  admission_date?: string | null
  email?: string | null
  phone?: string | null
  salary_liquido?: string | null
  salary_base?: string | null
  nominal_salary?: string | null
}

const STATUS_LABELS: Record<string, string> = {
  ATIVO: "Ativo",
  DE_LICENCA: "De licença",
  SUSPENSO: "Suspenso",
  INATIVO: "Inativo",
  DESLIGADO: "Desligado",
  REFORMADO: "Reformado",
  FALECIDO: "Falecido",
}

const STATUS_STYLES: Record<string, string> = {
  ATIVO: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  DE_LICENCA: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  SUSPENSO: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200",
  INATIVO: "border-border bg-muted text-foreground-2",
  DESLIGADO: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
  REFORMADO: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
  FALECIDO: "border-slate-300 bg-slate-100 text-slate-600",
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status
  const style = STATUS_STYLES[status] ?? "border-border bg-muted text-foreground-2"
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${style}`}>
      {label}
    </span>
  )
}

function fmtDate(d?: string | null) {
  if (!d) return "—"
  try { return new Date(d).toLocaleDateString("pt", { year: "numeric", month: "short", day: "2-digit" }) }
  catch { return d }
}

function fmtMoney(v?: string | null) {
  if (!v) return "—"
  const n = parseFloat(v)
  if (isNaN(n) || n === 0) return "—"
  return n.toLocaleString("pt", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const PAGE_SIZE = 20

export default function EmployeesListPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterRole, setFilterRole] = useState("")
  const [filterProfession, setFilterProfession] = useState("")

  const [roles, setRoles] = useState<Array<{ id: number; name: string }>>([])
  const [professions, setProfessions] = useState<Array<{ id: number; name: string }>>([])

  useEffect(() => {
    apiFetchList("/human_resources/role/", { pageSize: 200, query: { ordering: "name" } })
      .then(({ items }) => setRoles((items as any[]).map((x) => ({ id: x.id, name: x.name }))))
      .catch(() => {})
    apiFetchList("/human_resources/profissao/", { pageSize: 200, query: { ordering: "name", active: "true" } })
      .then(({ items }) => setProfessions((items as any[]).map((x) => ({ id: x.id, name: x.name }))))
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query: Record<string, string | number | boolean | null | undefined> = {
        ordering: "name",
      }
      if (search) query.search = search
      if (filterStatus) query.status = filterStatus
      if (filterRole) query.role = filterRole
      if (filterProfession) query.profession = filterProfession

      const { items, meta } = await apiFetchList<Employee>("/human_resources/employee/", {
        page,
        pageSize: PAGE_SIZE,
        query,
        clientCache: safeRefreshToken === 0,
      })

      setEmployees(items)
      setTotal(meta.total ?? items.length)
    } catch (e: any) {
      setError(e?.message ?? "Falha ao carregar funcionários.")
    } finally {
      setLoading(false)
    }
  }, [page, search, filterStatus, filterRole, filterProfession, safeRefreshToken])

  useEffect(() => { load() }, [load])

  function clearFilters() {
    setSearch(""); setFilterStatus(""); setFilterRole(""); setFilterProfession(""); setPage(1)
  }

  const hasFilters = search || filterStatus || filterRole || filterProfession
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO]}>
      <div className="space-y-5">
        <PageHeader
          title="Funcionários"
          subtitle={`${total} funcionário${total !== 1 ? "s" : ""} registado${total !== 1 ? "s" : ""}`}
          actions={
            <Link
              href="/human_resources/employees/new"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <Plus size={16} />
              Novo funcionário
            </Link>
          }
        />

        {/* Filtros */}
        <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar por nome, código, e-mail..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="min-w-[150px]">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Estado</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Todos</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {roles.length > 0 && (
              <div className="min-w-[160px]">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Cargo</label>
                <select
                  value={filterRole}
                  onChange={(e) => { setFilterRole(e.target.value); setPage(1) }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                >
                  <option value="">Todos</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            )}

            {professions.length > 0 && (
              <div className="min-w-[160px]">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Profissão</label>
                <select
                  value={filterProfession}
                  onChange={(e) => { setFilterProfession(e.target.value); setPage(1) }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                >
                  <option value="">Todas</option>
                  {professions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            {hasFilters && (
              <button type="button" onClick={clearFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
              >
                <X size={14} /> Limpar
              </button>
            )}
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {error && (
            <div className="px-4 py-3 text-sm text-rose-700 bg-rose-50 border-b border-rose-100 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-4 py-3 font-semibold text-foreground-2 whitespace-nowrap">Código</th>
                  <th className="px-4 py-3 font-semibold text-foreground-2">Nome</th>
                  <th className="px-4 py-3 font-semibold text-foreground-2">Cargo</th>
                  <th className="px-4 py-3 font-semibold text-foreground-2">Profissão</th>
                  <th className="px-4 py-3 font-semibold text-foreground-2">Estado</th>
                  <th className="px-4 py-3 font-semibold text-foreground-2 whitespace-nowrap">Admissão</th>
                  <th className="px-4 py-3 font-semibold text-foreground-2 text-right whitespace-nowrap">Sal. líquido</th>
                  <th className="px-4 py-3 font-semibold text-foreground-2">Contacto</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 rounded bg-muted w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      {hasFilters
                        ? "Nenhum funcionário corresponde aos filtros aplicados."
                        : "Ainda não existem funcionários registados."}
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => {
                    const href = `/human_resources/employees/${emp.id}`
                    return (
                    <tr
                      key={emp.id}
                      className="hover:bg-primary/5 cursor-pointer transition-colors"
                      onClick={() => window.location.href = href}
                    >
                      <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={href}
                          className="font-mono text-xs font-semibold text-primary hover:underline"
                        >
                          {emp.custom_id || `#${emp.id}`}
                        </Link>
                      </td>
                      <td className="px-4 py-3 min-w-[180px]">
                        <span className="font-medium text-foreground">
                          {emp.name || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground-2 min-w-[130px]">
                        {emp.role_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground-2 min-w-[130px]">
                        {emp.profession_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={emp.status} />
                      </td>
                      <td className="px-4 py-3 text-foreground-2 whitespace-nowrap text-sm">
                        {fmtDate(emp.admission_date)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground-2 whitespace-nowrap">
                        {fmtMoney(emp.salary_liquido ?? emp.salary_base ?? emp.nominal_salary)}
                      </td>
                      <td className="px-4 py-3 text-foreground-2 min-w-[130px] text-sm">
                        {emp.phone || emp.email || "—"}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={href}
                          className="inline-flex items-center rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground-2 transition hover:bg-muted hover:text-foreground whitespace-nowrap"
                        >
                          Ver ficha →
                        </Link>
                      </td>
                    </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="border-t border-border px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} de {total}
              </span>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
