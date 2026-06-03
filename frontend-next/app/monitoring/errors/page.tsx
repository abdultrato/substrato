"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import MetricCard from "@/components/ui/MetricCard"
import PageHeader from "@/components/ui/PageHeader"
import Pagination from "@/components/ui/Pagination"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type ErrorRow = Record<string, any>

type TelemetryRow = {
  total?: number
  frontend?: number
  backend?: number
  client_4xx?: number
  server_5xx?: number
  bucket?: string | null
}

type TelemetryResponse = {
  range?: {
    start?: string
    end?: string
    days?: number
    bucket?: "hour" | "day"
  }
  totals?: {
    errors_total?: number
    frontend_errors?: number
    backend_errors?: number
    client_4xx?: number
    server_5xx?: number
    unique_paths?: number
    unique_exception_classes?: number
    unique_users?: number
  }
  by_status?: Array<{ status_code?: number; total?: number }>
  by_exception?: Array<{ exception_class?: string; total?: number }>
  by_path?: Array<{ path?: string; total?: number }>
  by_method?: Array<{ method?: string; total?: number }>
  timeline?: TelemetryRow[]
  outbox?: {
    total?: number
    pending?: number
    delivered?: number
    failed?: number
    dead_letter?: number
    by_status?: Array<{ status?: string; total?: number }>
    by_event_type?: Array<{ event_type?: string; total?: number }>
  }
}

function pick<T = any>(row: Record<string, any>, keys: string[], fallback: T): T {
  for (const key of keys) {
    const value = row?.[key]
    if (value !== undefined && value !== null && value !== "") {
      return value as T
    }
  }
  return fallback
}

function fmtDateTime(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

function truncate(value: any, max = 70): string {
  const v = String(value ?? "").trim()
  if (!v) return "-"
  if (v.length <= max) return v
  return `${v.slice(0, Math.max(0, max - 3))}...`
}

function asNumber(value: any): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function bucketLabel(value: string | null | undefined): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
}

function ChartShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card title={title}>
      <div className="h-72 w-full">{children}</div>
    </Card>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--muted)] text-sm text-[var(--muted-foreground)]">
      Sem dados para o período selecionado.
    </div>
  )
}

export default function MonitoringErrorsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingTelemetry, setLoadingTelemetry] = useState(true)

  const [rows, setRows] = useState<ErrorRow[]>([])
  const [telemetry, setTelemetry] = useState<TelemetryResponse | null>(null)

  const [days, setDays] = useState(7)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    let mounted = true

    async function loadList() {
      try {
        setLoadingList(true)
        setErrorMessage(null)

        const { items, meta } = await apiFetchList<ErrorRow>("/monitoring/error/", {
          page,
          pageSize,
          clientCache: false,
        })

        const total = meta.total ?? items.length
        const computedTotalPages =
          meta.totalPages ??
          (total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1)

        if (!mounted) return

        setRows(items)
        setTotalItems(total || 0)
        setTotalPages(computedTotalPages)
        if (page > computedTotalPages) setPage(computedTotalPages)
      } catch (error: any) {
        if (!mounted) return
        setErrorMessage(
          isNotFoundLikeError(error)
            ? null
            : error?.message || "Falha ao carregar erros monitorados."
        )
      } finally {
        if (mounted) setLoadingList(false)
      }
    }

    loadList()
    return () => {
      mounted = false
    }
  }, [page, pageSize, safeRefreshToken])

  useEffect(() => {
    let mounted = true

    async function loadTelemetry() {
      try {
        setLoadingTelemetry(true)

        const data = await apiFetch<TelemetryResponse>(
          `/monitoring/telemetry/?days=${encodeURIComponent(String(days))}&top=10`,
          { clientCache: false }
        )

        if (!mounted) return
        setTelemetry(data || null)
      } catch (error: any) {
        if (!mounted) return
        if (!isNotFoundLikeError(error)) {
          setErrorMessage((prev) => prev || error?.message || "Falha ao carregar telemetria.")
        }
      } finally {
        if (mounted) setLoadingTelemetry(false)
      }
    }

    loadTelemetry()
    return () => {
      mounted = false
    }
  }, [days, safeRefreshToken])

  const columns = useMemo(
    () => [
      {
        header: "Código",
        render: (row: ErrorRow) => {
          const id = pick<number | string>(row, ["id"], "-")
          const custom = pick<string>(row, ["custom_id", "id_custom"], String(id))
          return (
            <Link
              href={`/monitoring/errors/${id}`}
              className="font-medium text-[var(--text)] no-underline decoration-[var(--border)] underline-offset-2 hover:underline hover:decoration-[var(--gray-300)]"
            >
              {custom || id}
            </Link>
          )
        },
      },
      { header: "Estado", render: (row: ErrorRow) => pick(row, ["status_code"], "-") },
      { header: "Método", render: (row: ErrorRow) => pick(row, ["method"], "-") },
      { header: "Rota", render: (row: ErrorRow) => truncate(pick(row, ["path", "caminho"], "-"), 44) },
      { header: "Tipo", render: (row: ErrorRow) => truncate(pick(row, ["exception_class"], "-"), 28) },
      { header: "Mensagem", render: (row: ErrorRow) => truncate(pick(row, ["message", "mensagem"], "-"), 44) },
      { header: "Utilizador", render: (row: ErrorRow) => truncate(pick(row, ["user_name", "user", "usuario_nome"], "-"), 24) },
      { header: "Criado em", render: (row: ErrorRow) => fmtDateTime(pick(row, ["created_at", "criado_em"], null)) },
    ],
    []
  )

  const totals = telemetry?.totals || {}

  const timelineData = useMemo(
    () =>
      (telemetry?.timeline || []).map((item) => ({
        label: bucketLabel(item.bucket),
        total: asNumber(item.total),
        frontend: asNumber(item.frontend),
        backend: asNumber(item.backend),
        client4xx: asNumber(item.client_4xx),
        server5xx: asNumber(item.server_5xx),
      })),
    [telemetry?.timeline]
  )

  const statusData = useMemo(
    () =>
      (telemetry?.by_status || []).map((item) => ({
        label: String(item.status_code ?? "-"),
        total: asNumber(item.total),
      })),
    [telemetry?.by_status]
  )

  const exceptionData = useMemo(
    () =>
      (telemetry?.by_exception || []).map((item) => ({
        label: truncate(item.exception_class || "-", 24),
        total: asNumber(item.total),
      })),
    [telemetry?.by_exception]
  )

  const pathData = useMemo(
    () =>
      (telemetry?.by_path || []).map((item) => ({
        label: truncate(item.path || "-", 28),
        total: asNumber(item.total),
      })),
    [telemetry?.by_path]
  )

  const outboxStatusData = useMemo(
    () =>
      (telemetry?.outbox?.by_status || []).map((item) => ({
        label: String(item.status || "-"),
        total: asNumber(item.total),
      })),
    [telemetry?.outbox?.by_status]
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN]}>
      <div className="space-y-6">
        <PageHeader
          title="Estatísticas de Erros"
          subtitle="Telemetria de falhas do frontend/backend e eventos operacionais monitorados."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-[var(--gray-700)]">
                <span>Período</span>
                <select
                  value={days}
                  onChange={(event) => setDays(Number(event.target.value))}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm"
                >
                  <option value={1}>24 horas</option>
                  <option value={7}>7 dias</option>
                  <option value={30}>30 dias</option>
                  <option value={90}>90 dias</option>
                </select>
              </label>

              <Link
                href="/monitoring"
                className="inline-flex items-center rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground-2 shadow-sm transition hover:bg-muted"
              >
                Voltar
              </Link>

              <Link
                href="/admin/monitoring/systemerror/"
                className="inline-flex items-center rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              >
                Abrir na Administração
              </Link>
            </div>
          }
        />

        {telemetry?.range ? (
          <div className="text-xs text-[var(--muted-foreground)]">
            Intervalo: {fmtDateTime(telemetry.range.start)} até {fmtDateTime(telemetry.range.end)}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total de erros" value={loadingTelemetry ? "..." : totals.errors_total ?? "—"} />
          <MetricCard label="Erros de frontend" value={loadingTelemetry ? "..." : totals.frontend_errors ?? "—"} />
          <MetricCard label="Erros de backend" value={loadingTelemetry ? "..." : totals.backend_errors ?? "—"} />
          <MetricCard label="Rotas afetadas" value={loadingTelemetry ? "..." : totals.unique_paths ?? "—"} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="HTTP 4xx" value={loadingTelemetry ? "..." : totals.client_4xx ?? "—"} />
          <MetricCard label="HTTP 5xx" value={loadingTelemetry ? "..." : totals.server_5xx ?? "—"} />
          <MetricCard label="Tipos de exceção" value={loadingTelemetry ? "..." : totals.unique_exception_classes ?? "—"} />
          <MetricCard label="Utilizadores impactados" value={loadingTelemetry ? "..." : totals.unique_users ?? "—"} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <ChartShell title="Linha temporal de erros">
            {!timelineData.length ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 10, right: 16, left: 6, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} hide={timelineData.length > 14} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#0f172a" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="frontend" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="backend" stroke="#dc2626" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartShell>

          <ChartShell title="Status HTTP mais frequentes">
            {!statusData.length ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 10, right: 16, left: 6, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartShell>

          <ChartShell title="Top exceções">
            {!exceptionData.length ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={exceptionData} margin={{ top: 10, right: 16, left: 6, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-18} dy={8} textAnchor="end" height={72} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartShell>

          <ChartShell title="Top rotas com falha">
            {!pathData.length ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pathData} margin={{ top: 10, right: 16, left: 6, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-18} dy={8} textAnchor="end" height={72} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartShell>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Eventos monitorados da outbox">
            <div className="grid gap-4 md:grid-cols-2">
              <MetricCard label="Total" value={telemetry?.outbox?.total ?? 0} />
              <MetricCard label="Pendentes" value={telemetry?.outbox?.pending ?? 0} />
              <MetricCard label="Entregues" value={telemetry?.outbox?.delivered ?? 0} />
              <MetricCard label="Falhados / dead-letter" value={(telemetry?.outbox?.failed ?? 0) + (telemetry?.outbox?.dead_letter ?? 0)} />
            </div>
          </Card>

          <ChartShell title="Distribuição de estado da outbox">
            {!outboxStatusData.length ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outboxStatusData} margin={{ top: 10, right: 16, left: 6, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#334155" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartShell>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">Total de eventos de erro: {totalItems}</div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span>Por página</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPage(1)
                setPageSize(Number(event.target.value))
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>

        {loadingList ? (
          <div className="text-sm text-gray-500">Carregando eventos...</div>
        ) : (
          <>
            <DataTable<ErrorRow>
              columns={columns as any}
              data={rows}
              emptyMessage="Nenhum erro encontrado para os filtros atuais."
            />
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </AppLayout>
  )
}
