"use client"

import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import MetricCard from "@/components/ui/MetricCard"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type AnalyticsResponse = {
  range?: { inicio?: string | null; fim?: string | null }
  kpis?: Record<string, any>
  top_exames?: Array<any>
  top_procedimentos?: Array<any>
  top_medicamentos?: Array<any>
  top_consultas?: Array<any>
}

type ChartDatum = {
  name: string
  value: number
}

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

function truncateLabel(value: string, max = 26): string {
  const v = String(value || "")
  if (v.length <= max) return v
  return `${v.slice(0, Math.max(0, max - 3))}...`
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
    <div className="h-64 w-full">
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
            width={170}
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

export default function EstatisticasPage() {
  const [dias, setDias] = useState(30)
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [exportando, setExportando] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const res = await apiFetch<AnalyticsResponse>(
          `/dashboard/analytics/?dias=${encodeURIComponent(String(dias))}`
        )
        if (!mounted) return
        setData(res || null)
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar estatísticas.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [dias])

  const topExames = useMemo(() => (data?.top_exames ?? []) as any[], [data?.top_exames])
  const topProcs = useMemo(() => (data?.top_procedimentos ?? []) as any[], [data?.top_procedimentos])
  const topMeds = useMemo(() => (data?.top_medicamentos ?? []) as any[], [data?.top_medicamentos])
  const topCons = useMemo(() => (data?.top_consultas ?? []) as any[], [data?.top_consultas])
  const kpis = useMemo(() => (data?.kpis ?? {}) as Record<string, any>, [data?.kpis])

  async function exportar(formato: "pdf" | "csv" | "word") {
    try {
      setExportando(formato)
      setErro(null)

      const blob = await apiFetch<Blob>(
        `/dashboard/analytics/export/?dias=${encodeURIComponent(String(dias))}&tipo=${encodeURIComponent(formato)}`,
        { responseType: "blob" }
      )

      const ext = formato === "word" ? "doc" : formato
      const filename = `relatorio_estatisticas_${dias}dias.${ext}`
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
    } catch (e: any) {
      setErro(e?.message || "Falha ao exportar relatório.")
    } finally {
      setExportando(null)
    }
  }

  const examesCols = useMemo(
    () => [
      { header: "Tipo", render: (r: any) => r.tipo || "-" },
      { header: "Exame", render: (r: any) => r.nome || "-" },
      { header: "Total", render: (r: any) => r.total ?? 0, className: "text-right" },
    ],
    []
  )

  const procCols = useMemo(
    () => [
      { header: "Procedimento", render: (r: any) => r.catalogo__nome || "-" },
      { header: "Total", render: (r: any) => r.total ?? 0, className: "text-right" },
    ],
    []
  )

  const medsCols = useMemo(
    () => [
      { header: "Medicamento", render: (r: any) => r.produto__nome || "-" },
      { header: "Quantidade", render: (r: any) => r.total_quantidade ?? 0, className: "text-right" },
      { header: "Pedidos", render: (r: any) => r.total_pedidos ?? 0, className: "text-right" },
    ],
    []
  )

  const consCols = useMemo(
    () => [
      { header: "Consulta", render: (r: any) => r.tipo || "-" },
      { header: "Total", render: (r: any) => r.total ?? 0, className: "text-right" },
    ],
    []
  )

  const examesChart = useMemo<ChartDatum[]>(
    () =>
      (topExames || []).map((r: any) => ({
        name: `${r.tipo ? `${r.tipo}: ` : ""}${r.nome || "-"}`,
        value: Number(r.total ?? 0),
      })),
    [topExames]
  )

  const procsChart = useMemo<ChartDatum[]>(
    () =>
      (topProcs || []).map((r: any) => ({
        name: r.catalogo__nome || "-",
        value: Number(r.total ?? 0),
      })),
    [topProcs]
  )

  const medsChart = useMemo<ChartDatum[]>(
    () =>
      (topMeds || []).map((r: any) => ({
        name: r.produto__nome || "-",
        value: Number(r.total_quantidade ?? 0),
      })),
    [topMeds]
  )

  const consChart = useMemo<ChartDatum[]>(
    () =>
      (topCons || []).map((r: any) => ({
        name: r.tipo || "-",
        value: Number(r.total ?? 0),
      })),
    [topCons]
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.CONTABILIDADE]}>
      <div className="space-y-6">
        <PageHeader
          title="Estatísticas"
          subtitle="Indicadores e Top pedidos do sistema (exames, procedimentos, medicamentos e consultas)."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-[var(--gray-700)]">Período</label>
                <select
                  value={dias}
                  onChange={(e) => setDias(Number(e.target.value))}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] shadow-sm"
                >
                  <option value={7}>Últimos 7 dias</option>
                  <option value={30}>Últimos 30 dias</option>
                  <option value={90}>Últimos 90 dias</option>
                  <option value={365}>Últimos 12 meses</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportar("pdf")}
                  disabled={!!exportando}
                  className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
                >
                  {exportando === "pdf" ? "PDF..." : "PDF"}
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
              </div>
            </div>
          }
        />

        {data?.range ? (
          <div className="text-xs text-gray-500">
            Intervalo: {fmtDate(data.range.inicio)} até {fmtDate(data.range.fim)}
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
              <MetricCard label="Pacientes (total)" value={kpis["Pacientes (total)"] ?? "—"} />
              <MetricCard label="Requisições" value={kpis["Requisições (no período)"] ?? "—"} />
              <MetricCard label="Faturas pagas" value={kpis["Faturas pagas (no período)"] ?? "—"} />
              <MetricCard
                label="Valor pago confirmado"
                value={
                  kpis["Valor pago confirmado (no período)"] !== undefined
                    ? `${money(kpis["Valor pago confirmado (no período)"])} MZN`
                    : "—"
                }
              />
            </div>

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
          </>
        )}
      </div>
    </AppLayout>
  )
}
