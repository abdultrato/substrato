"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import MetricCard from "@/components/ui/MetricCard"
import MoneyValue from "@/components/ui/MoneyValue"
import PageHeader from "@/components/ui/PageHeader"
import PdfActionLabel from "@/components/ui/PdfActionLabel"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type AnalyticsResponse = {
  range?: { inicio?: string | null; fim?: string | null }
  kpis?: Record<string, any>
  top_exams?: Array<any>
  top_exames?: Array<any>
  top_procedures?: Array<any>
  top_procedimentos?: Array<any>
  top_medicamentos?: Array<any>
  top_consultations?: Array<any>
  top_consultas?: Array<any>
}

type DashboardStatsResponse = {
  patients?: number
  pending_requests?: number
  exams_today?: number
  billing_today?: number
}

type ChartDatum = {
  name: string
  value: number
}

type ResourceSnapshot = {
  moduleKey: string
  moduleLabel: string
  key: string
  label: string
  total: number | null
  status: "ok" | "denied" | "error"
}

type ModuleSnapshot = {
  key: string
  label: string
  submodules: number
  coveredSubmodules: number
  total: number
  status: "ok" | "partial" | "denied" | "error"
}

const PIE_COLORS = [
  "#0f172a",
  "#1e293b",
  "#334155",
  "#475569",
  "#64748b",
  "#94a3b8",
  "#0b7285",
  "#2f9e44",
  "#e67700",
  "#c92a2a",
]

function ensureTrailingSlash(endpoint: string): string {
  return endpoint.endsWith("/") ? endpoint : `${endpoint}/`
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(worker))
    results.push(...batchResults)
  }
  return results
}

function toNumber(value: any): number {
  if (value === null || value === undefined || value === "") return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

function truncateLabel(value: string, max = 28): string {
  const v = String(value || "")
  if (v.length <= max) return v
  return `${v.slice(0, Math.max(0, max - 3))}...`
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-"
  return `${value.toFixed(1)}%`
}

function percent(part: number, whole: number): number | null {
  if (!whole) return null
  return (part / whole) * 100
}

function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-"
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function money(v: any): string {
  if (v === null || v === undefined || v === "") return "-"
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function BasicHorizontalBarChart({
  data,
  barColor = "#0f172a",
}: {
  data: ChartDatum[]
  barColor?: string
}) {
  if (!data.length) {
    return (
      <div className="rounded-xl border bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Sem dados para gráfico.
      </div>
    )
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 6, right: 16, bottom: 6, left: 6 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={180}
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => truncateLabel(String(v))}
          />
          <Tooltip
            cursor={{ fill: "rgba(148, 163, 184, 0.15)" }}
            formatter={(v: any) => [v, "Total"]}
            labelFormatter={(label: any) => String(label)}
          />
          <Bar dataKey="value" fill={barColor} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function BasicPie({
  data,
  valueLabel,
}: {
  data: ChartDatum[]
  valueLabel: string
}) {
  if (!data.length) {
    return (
      <div className="rounded-xl border bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Sem dados para gráfico.
      </div>
    )
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: any) => [formatCompact(Number(v)), valueLabel]}
            labelFormatter={(l: any) => String(l)}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function EstatisticasPage() {
  const [dias, setDias] = useState(30)
  const [limit, setLimit] = useState(10)
  const [mode, setMode] = useState<"dias" | "range">("dias")
  const [inicio, setInicio] = useState("")
  const [fim, setFim] = useState("")
  const [refreshCounter, setRefreshCounter] = useState(0)

  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [snapshot, setSnapshot] = useState<DashboardStatsResponse | null>(null)
  const [exportando, setExportando] = useState<string | null>(null)
  const { modules } = useModulesCatalog()

  const [moduleLoading, setModuleLoading] = useState(true)
  const [moduleRows, setModuleRows] = useState<ModuleSnapshot[]>([])
  const [resourceRows, setResourceRows] = useState<ResourceSnapshot[]>([])

  const analyticsQuery = useMemo(() => {
    const params = new URLSearchParams()
    params.set("limit", String(limit))
    if (mode === "range" && inicio && fim) {
      params.set("inicio", inicio)
      params.set("fim", fim)
    } else {
      params.set("dias", String(dias))
    }
    return params.toString()
  }, [dias, fim, inicio, limit, mode])

  const effectivePeriodDays = useMemo(() => {
    if (mode !== "range" || !inicio || !fim) return dias
    const d1 = new Date(inicio)
    const d2 = new Date(fim)
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return dias
    const ms = Math.abs(d2.getTime() - d1.getTime())
    return Math.max(1, Math.floor(ms / 86400000) + 1)
  }, [dias, fim, inicio, mode])

  const topExames = useMemo(
    () => ((data?.top_exams ?? data?.top_exames ?? []) as any[]),
    [data?.top_exams, data?.top_exames]
  )
  const topProcs = useMemo(
    () => ((data?.top_procedures ?? data?.top_procedimentos ?? []) as any[]),
    [data?.top_procedures, data?.top_procedimentos]
  )
  const topMeds = useMemo(() => (data?.top_medicamentos ?? []) as any[], [data?.top_medicamentos])
  const topCons = useMemo(
    () => ((data?.top_consultations ?? data?.top_consultas ?? []) as any[]),
    [data?.top_consultations, data?.top_consultas]
  )
  const kpis = useMemo(() => (data?.kpis ?? {}) as Record<string, any>, [data?.kpis])

  const resourceProbes = useMemo(
    () =>
      modules.flatMap((module) =>
        module.resources.map((resource) => ({
          moduleKey: module.key,
          moduleLabel: module.label,
          key: resource.key,
          label: resource.label,
          endpoint: ensureTrailingSlash(resource.endpoint),
        }))
      ),
    [modules]
  )

  const fetchModules = useCallback(async () => {
    setModuleLoading(true)
    try {
      if (!resourceProbes.length) {
        setModuleRows([])
        setResourceRows([])
        return
      }

      const resolved = await mapInBatches(resourceProbes, 12, async (probe): Promise<ResourceSnapshot> => {
        try {
          const raw = await apiFetch<any>(`${probe.endpoint}?page=1&page_size=1`)
          return {
            moduleKey: probe.moduleKey,
            moduleLabel: probe.moduleLabel,
            key: probe.key,
            label: probe.label,
            total: extractTotalCount(raw),
            status: "ok",
          }
        } catch (e: any) {
          const status = Number((e as any)?.status || 0)
          return {
            moduleKey: probe.moduleKey,
            moduleLabel: probe.moduleLabel,
            key: probe.key,
            label: probe.label,
            total: null,
            status: status === 401 || status === 403 ? "denied" : "error",
          }
        }
      })

      const grouped = new Map<
        string,
        {
          key: string
          label: string
          submodules: number
          coveredSubmodules: number
          total: number
          deniedCount: number
          errorCount: number
        }
      >()

      for (const row of resolved) {
        const current = grouped.get(row.moduleKey) || {
          key: row.moduleKey,
          label: row.moduleLabel,
          submodules: 0,
          coveredSubmodules: 0,
          total: 0,
          deniedCount: 0,
          errorCount: 0,
        }
        current.submodules += 1
        if (row.status === "ok") {
          current.coveredSubmodules += 1
          current.total += toNumber(row.total)
        } else if (row.status === "denied") {
          current.deniedCount += 1
        } else {
          current.errorCount += 1
        }
        grouped.set(row.moduleKey, current)
      }

      const moduleAggregates: ModuleSnapshot[] = Array.from(grouped.values())
        .map((item) => {
          let status: ModuleSnapshot["status"] = "ok"
          if (item.coveredSubmodules === item.submodules) {
            status = "ok"
          } else if (item.coveredSubmodules > 0) {
            status = "partial"
          } else if (item.deniedCount === item.submodules && item.errorCount === 0) {
            status = "denied"
          } else {
            status = "error"
          }

          return {
            key: item.key,
            label: item.label,
            submodules: item.submodules,
            coveredSubmodules: item.coveredSubmodules,
            total: item.total,
            status,
          }
        })
        .sort((a, b) => a.label.localeCompare(b.label, "pt"))

      const submoduleDetails = [...resolved].sort((a, b) => {
        const modCmp = a.moduleLabel.localeCompare(b.moduleLabel, "pt")
        if (modCmp !== 0) return modCmp
        return a.label.localeCompare(b.label, "pt")
      })

      setModuleRows(moduleAggregates)
      setResourceRows(submoduleDetails)
    } finally {
      setModuleLoading(false)
    }
  }, [resourceProbes])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)

        const [analytics, stats] = await Promise.all([
          apiFetch<AnalyticsResponse>(`/dashboard/analytics/?${analyticsQuery}`),
          apiFetch<DashboardStatsResponse>("/dashboard/stats/").catch(() => null),
        ])

        if (!mounted) return
        setData(analytics || null)
        setSnapshot(stats || null)
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar estatísticas."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [analyticsQuery, refreshCounter])

  useEffect(() => {
    fetchModules()
  }, [fetchModules, refreshCounter])

  async function exportar(formato: "pdf" | "csv" | "word") {
    try {
      setExportando(formato)
      setErro(null)
      const blob = await apiFetch<Blob>(
        `/dashboard/analytics/export/?${analyticsQuery}&type=${encodeURIComponent(formato)}`,
        { responseType: "blob" }
      )
      const ext = formato === "word" ? "doc" : formato
      const filename = `relatorio_estatisticas_${effectivePeriodDays}dias.${ext}`
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => window.URL.revokeObjectURL(url), 60000)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao exportar relatório."))
    } finally {
      setExportando(null)
    }
  }

  const pacientesTotal = toNumber(kpis["Pacientes (total)"]) || toNumber(snapshot?.patients)
  const requisicoesPeriodo = toNumber(kpis["Requisições (no período)"])
  const requisicoesValidadas = toNumber(kpis["Requisições validadas (no período)"])
  const consultasPeriodo = toNumber(kpis["Consultas (no período)"])
  const faturasPeriodo = toNumber(kpis["Faturas (no período)"])
  const faturasPagas = toNumber(kpis["Faturas pagas (no período)"])
  const valorFaturado = toNumber(kpis["Valor faturado (no período)"])
  const valorPago = toNumber(kpis["Valor pago confirmado (no período)"])
  const internamentosAtivos = toNumber(kpis["Internamentos ativos (agora)"])
  const camasOcupadas = toNumber(kpis["Camas ocupadas (agora)"])

  const taxaValidacao = percent(requisicoesValidadas, requisicoesPeriodo)
  const taxaLiquidacaoFaturas = percent(faturasPagas, faturasPeriodo)
  const taxaCobranca = percent(valorPago, valorFaturado)
  const ticketMedioFatura = faturasPagas > 0 ? valorPago / faturasPagas : null
  const receitaPorConsulta = consultasPeriodo > 0 ? valorFaturado / consultasPeriodo : null
  const requisicoesPorDia = effectivePeriodDays > 0 ? requisicoesPeriodo / effectivePeriodDays : null
  const requisicoesPorPaciente = pacientesTotal > 0 ? requisicoesPeriodo / pacientesTotal : null

  const examesCols = useMemo(
    () => [
      { header: "Tipo", render: (r: any) => r.type || r.tipo || "-" },
      { header: "Exame", render: (r: any) => r.name || r.nome || "-" },
      { header: "Total", render: (r: any) => formatCompact(toNumber(r.total)), className: "text-right" },
    ],
    []
  )

  const procCols = useMemo(
    () => [
      { header: "Procedimento", render: (r: any) => r.catalog__name || r.catalogo__nome || "-" },
      { header: "Total", render: (r: any) => formatCompact(toNumber(r.total)), className: "text-right" },
    ],
    []
  )

  const medsCols = useMemo(
    () => [
      { header: "Medicamento", render: (r: any) => r.product__name || r.produto__nome || "-" },
      { header: "Quantidade", render: (r: any) => formatCompact(toNumber(r.total_quantity ?? r.total_quantidade)), className: "text-right" },
      { header: "Pedidos", render: (r: any) => formatCompact(toNumber(r.total_pedidos)), className: "text-right" },
    ],
    []
  )

  const consCols = useMemo(
    () => [
      { header: "Consulta", render: (r: any) => r.type || r.tipo || "-" },
      { header: "Total", render: (r: any) => formatCompact(toNumber(r.total)), className: "text-right" },
    ],
    []
  )

  const kpiTableRows = useMemo(
    () =>
      Object.entries(kpis).map(([name, value]) => ({
        name,
        value,
      })),
    [kpis]
  )

  const kpiTableCols = useMemo(
    () => [
      { header: "Indicador", render: (r: any) => r.name || "-" },
      {
        header: "Valor",
        render: (r: any) => {
          const key = String(r.name || "")
          if (key.toLowerCase().includes("valor")) return <MoneyValue value={r.value} />
          return formatCompact(toNumber(r.value))
        },
        className: "text-right",
      },
    ],
    []
  )

  const examesChart = useMemo<ChartDatum[]>(
    () =>
      (topExames || []).map((r: any) => ({
        name: `${(r.type || r.tipo) ? `${r.type || r.tipo}: ` : ""}${r.name || r.nome || "-"}`,
        value: toNumber(r.total),
      })),
    [topExames]
  )

  const procsChart = useMemo<ChartDatum[]>(
    () =>
      (topProcs || []).map((r: any) => ({
        name: r.catalog__name || r.catalogo__nome || "-",
        value: toNumber(r.total),
      })),
    [topProcs]
  )

  const medsChart = useMemo<ChartDatum[]>(
    () =>
      (topMeds || []).map((r: any) => ({
        name: r.product__name || r.produto__nome || "-",
        value: toNumber(r.total_quantity ?? r.total_quantidade),
      })),
    [topMeds]
  )

  const consChart = useMemo<ChartDatum[]>(
    () =>
      (topCons || []).map((r: any) => ({
        name: r.type || r.tipo || "-",
        value: toNumber(r.total),
      })),
    [topCons]
  )

  const moduleChart = useMemo<ChartDatum[]>(
    () =>
      moduleRows
        .filter((r) => r.total > 0)
        .map((r) => ({ name: r.label, value: toNumber(r.total) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
    [moduleRows]
  )

  const submoduleCoverage = useMemo(() => {
    const total = resourceRows.length
    const ok = resourceRows.filter((row) => row.status === "ok").length
    const denied = resourceRows.filter((row) => row.status === "denied").length
    const errors = resourceRows.filter((row) => row.status === "error").length
    return { total, ok, denied, errors }
  }, [resourceRows])

  const moduleTableCols = useMemo(
    () => [
      { header: "Módulo", render: (r: ModuleSnapshot) => r.label },
      {
        header: "Submódulos",
        render: (r: ModuleSnapshot) => `${r.coveredSubmodules}/${r.submodules}`,
        className: "text-right",
      },
      {
        header: "Registos",
        render: (r: ModuleSnapshot) =>
          r.status === "ok" || r.status === "partial"
            ? formatCompact(toNumber(r.total))
            : r.status === "denied"
              ? "Sem acesso"
              : "Erro",
        className: "text-right",
      },
      {
        header: "Estado",
        render: (r: ModuleSnapshot) =>
          r.status === "ok"
            ? "Coberto"
            : r.status === "partial"
              ? "Parcial"
              : r.status === "denied"
                ? "Sem acesso"
                : "Erro",
      },
    ],
    []
  )

  const submoduleTableCols = useMemo(
    () => [
      { header: "Módulo", render: (r: ResourceSnapshot) => r.moduleLabel },
      { header: "Submódulo", render: (r: ResourceSnapshot) => r.label },
      {
        header: "Registos",
        render: (r: ResourceSnapshot) =>
          r.status === "ok"
            ? formatCompact(toNumber(r.total))
            : r.status === "denied"
              ? "Sem acesso"
              : "Erro",
        className: "text-right",
      },
      {
        header: "Estado",
        render: (r: ResourceSnapshot) =>
          r.status === "ok" ? "Coberto" : r.status === "denied" ? "Sem acesso" : "Erro",
      },
    ],
    []
  )

  const insights = useMemo(() => {
    const lines: string[] = []
    if (taxaValidacao !== null && taxaValidacao < 70) {
      lines.push("A taxa de validação de requisições está abaixo de 70%; rever gargalos entre laboratório e validação clínica.")
    }
    if (taxaLiquidacaoFaturas !== null && taxaLiquidacaoFaturas < 60) {
      lines.push("Menos de 60% das faturas do período foram liquidadas; reforçar reconciliação e follow-up financeiro.")
    }
    if (taxaCobranca !== null && taxaCobranca < 75) {
      lines.push("A cobrança confirmada está abaixo de 75% do valor faturado; analisar atrasos por método de pagamento.")
    }
    if (requisicoesPorPaciente !== null && requisicoesPorPaciente > 0.6) {
      lines.push("Relação requisições/paciente elevada; monitorar consumo de exames e adequação clínica.")
    }
    if (internamentosAtivos > 0 && camasOcupadas > internamentosAtivos) {
      lines.push("Há mais camas ocupadas do que internamentos ativos reportados; validar consistência de dados da enfermaria.")
    }

    const totalTopExames = examesChart.reduce((acc, item) => acc + item.value, 0)
    if (totalTopExames > 0 && examesChart.length) {
      const firstShare = (examesChart[0].value / totalTopExames) * 100
      if (firstShare >= 35) {
        lines.push(`Alta concentração em exames: "${examesChart[0].name}" representa ${firstShare.toFixed(1)}% do top analisado.`)
      }
    }

    if (!lines.length) {
      lines.push("Sem alertas críticos automáticos no período filtrado; cenário operacional estável para os indicadores disponíveis.")
    }
    return lines
  }, [
    camasOcupadas,
    examesChart,
    internamentosAtivos,
    requisicoesPorPaciente,
    taxaCobranca,
    taxaLiquidacaoFaturas,
    taxaValidacao,
  ])

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.CONTABILIDADE]}>
      <div className="space-y-6">
        <PageHeader
          title="Estatísticas Estratégicas"
          subtitle="Centro analítico com exploração de performance clínica, financeira e cobertura operacional por módulos."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
                <button
                  type="button"
                  onClick={() => setMode("dias")}
                  className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${mode === "dias" ? "bg-[var(--gray-900)] text-white" : "text-[var(--gray-700)] hover:bg-[var(--gray-100)]"}`}
                >
                  Janela
                </button>
                <button
                  type="button"
                  onClick={() => setMode("range")}
                  className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${mode === "range" ? "bg-[var(--gray-900)] text-white" : "text-[var(--gray-700)] hover:bg-[var(--gray-100)]"}`}
                >
                  Intervalo
                </button>
              </div>

              {mode === "dias" ? (
                <select
                  value={dias}
                  onChange={(e) => setDias(Number(e.target.value))}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]"
                >
                  <option value={7}>7 dias</option>
                  <option value={30}>30 dias</option>
                  <option value={90}>90 dias</option>
                  <option value={180}>180 dias</option>
                  <option value={365}>12 meses</option>
                </select>
              ) : (
                <>
                  <input
                    type="date"
                    value={inicio}
                    onChange={(e) => setInicio(e.target.value)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]"
                    aria-label="Data início"
                  />
                  <input
                    type="date"
                    value={fim}
                    onChange={(e) => setFim(e.target.value)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]"
                    aria-label="Data fim"
                  />
                </>
              )}

              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]"
                aria-label="Top N"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={15}>Top 15</option>
                <option value={20}>Top 20</option>
              </select>

              <button
                type="button"
                onClick={() => setRefreshCounter((v) => v + 1)}
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
              >
                Atualizar
              </button>

              <button
                type="button"
                onClick={() => exportar("pdf")}
                disabled={!!exportando}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
              >
                <PdfActionLabel loading={exportando === "pdf"} loadingLabel="PDF...">
                  PDF
                </PdfActionLabel>
              </button>
              <button
                type="button"
                onClick={() => exportar("csv")}
                disabled={!!exportando}
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
              >
                {exportando === "csv" ? "CSV..." : "CSV"}
              </button>
              <button
                type="button"
                onClick={() => exportar("word")}
                disabled={!!exportando}
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
              >
                {exportando === "word" ? "Word..." : "Word"}
              </button>

              <Link
                href="/monitoring/errors"
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
              >
                Erros do sistema
              </Link>
            </div>
          }
        />

        {data?.range ? (
          <div className="text-xs text-gray-500">
            Intervalo ativo: {fmtDate(data.range.inicio)} até {fmtDate(data.range.fim)} ({effectivePeriodDays} dias)
          </div>
        ) : null}

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Pacientes (total)" value={formatCompact(pacientesTotal)} />
              <MetricCard label="Requisições (período)" value={formatCompact(requisicoesPeriodo)} />
              <MetricCard label="Requisições pendentes (agora)" value={formatCompact(toNumber(snapshot?.pending_requests))} />
              <MetricCard label="Exames hoje" value={formatCompact(toNumber(snapshot?.exams_today))} />
              <MetricCard label="Faturas (período)" value={formatCompact(faturasPeriodo)} />
              <MetricCard label="Faturas pagas (período)" value={formatCompact(faturasPagas)} />
              <MetricCard label="Valor faturado" value={<MoneyValue value={valorFaturado} />} />
              <MetricCard label="Valor pago confirmado" value={<MoneyValue value={valorPago} />} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Taxa de validação" value={formatPercent(taxaValidacao)} hint="Requisições validadas / requisições totais" />
              <MetricCard label="Taxa de liquidação" value={formatPercent(taxaLiquidacaoFaturas)} hint="Faturas pagas / faturas emitidas no período" />
              <MetricCard label="Taxa de cobrança" value={formatPercent(taxaCobranca)} hint="Valor pago confirmado / valor faturado" />
              <MetricCard label="Ticket médio (fatura paga)" value={ticketMedioFatura !== null ? <MoneyValue value={ticketMedioFatura} /> : "-"} />
              <MetricCard label="Receita por consulta" value={receitaPorConsulta !== null ? <MoneyValue value={receitaPorConsulta} /> : "-"} />
              <MetricCard label="Requisições por dia" value={formatCompact(requisicoesPorDia)} />
              <MetricCard label="Requisições por paciente" value={formatCompact(requisicoesPorPaciente)} />
              <MetricCard label="Internamentos ativos" value={formatCompact(internamentosAtivos)} />
              <MetricCard label="Camas ocupadas" value={formatCompact(camasOcupadas)} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Módulos catalogados" value={formatCompact(moduleRows.length)} />
              <MetricCard label="Submódulos catalogados" value={formatCompact(submoduleCoverage.total)} />
              <MetricCard label="Submódulos cobertos" value={formatCompact(submoduleCoverage.ok)} />
              <MetricCard label="Submódulos sem acesso/erro" value={formatCompact(submoduleCoverage.denied + submoduleCoverage.errors)} />
            </div>

            <Card title="Insights Automáticos" subtitle="Leituras geradas a partir das métricas e concentração dos tops">
              <ul className="list-disc space-y-2 pl-5 text-sm text-foreground">
                {insights.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Exames Mais Solicitados" subtitle="Laboratoriais e médicos">
                <div className="space-y-4">
                  <BasicHorizontalBarChart data={examesChart} barColor="#0f172a" />
                  <DataTable columns={examesCols as any} data={topExames} emptyMessage="Sem dados." />
                </div>
              </Card>

              <Card title="Procedimentos Mais Solicitados" subtitle="Itens do catálogo de enfermagem">
                <div className="space-y-4">
                  <BasicHorizontalBarChart data={procsChart} barColor="#334155" />
                  <DataTable columns={procCols as any} data={topProcs} emptyMessage="Sem dados." />
                </div>
              </Card>

              <Card title="Medicamentos Mais Requisitados" subtitle="Baseado em itens de venda">
                <div className="space-y-4">
                  <BasicHorizontalBarChart data={medsChart} barColor="#111827" />
                  <DataTable columns={medsCols as any} data={topMeds} emptyMessage="Sem dados." />
                </div>
              </Card>

              <Card title="Consultas Mais Marcadas" subtitle="Agrupadas por tipo">
                <div className="space-y-4">
                  <BasicHorizontalBarChart data={consChart} barColor="#1f2937" />
                  <DataTable columns={consCols as any} data={topCons} emptyMessage="Sem dados." />
                </div>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Distribuição dos Exames" subtitle="Composição do volume no top selecionado">
                <BasicPie data={examesChart} valueLabel="Requisições" />
              </Card>

              <Card title="Cobertura por Módulo" subtitle="Top módulos por volume de registos (tenant atual)">
                {moduleLoading ? (
                  <div className="text-sm text-gray-500">Carregando módulos...</div>
                ) : (
                  <BasicHorizontalBarChart data={moduleChart} barColor="#0b7285" />
                )}
              </Card>
            </div>

            <Card
              title="Matriz de Módulos"
              subtitle="Inventário consolidado de todos os módulos catalogados no sistema"
              actions={
                <button
                  type="button"
                  onClick={fetchModules}
                  className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
                >
                  Atualizar módulos
                </button>
              }
            >
              {moduleLoading ? (
                <div className="text-sm text-gray-500">Carregando módulos...</div>
              ) : (
                <DataTable columns={moduleTableCols as any} data={moduleRows} emptyMessage="Sem dados de módulos." />
              )}
            </Card>

            <Card title="Matriz de Submódulos" subtitle="Detalhe de cobertura e volume para cada submódulo de cada módulo">
              {moduleLoading ? (
                <div className="text-sm text-gray-500">Carregando submódulos...</div>
              ) : (
                <DataTable columns={submoduleTableCols as any} data={resourceRows} emptyMessage="Sem dados de submódulos." />
              )}
            </Card>

            <Card title="Matriz de Indicadores Brutos (KPI)" subtitle="Todos os indicadores devolvidos pelo motor analítico">
              <DataTable columns={kpiTableCols as any} data={kpiTableRows} emptyMessage="Sem indicadores disponíveis." />
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  )
}
