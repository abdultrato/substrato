"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { BedDouble } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import MetricCard from "@/components/ui/MetricCard"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type DashboardData = {
  resumo: {
    pacientes: number
    camas_total: number
    camas_ocupadas: number
    camas_livres: number
  }
  camas: Array<{
    internamento_id: number
    internamento_codigo: string
    enfermaria: string
    cama_id: number
    cama_numero: string
    paciente_id: number
    paciente_nome: string
    data_internamento: string | null
    data_prevista_alta: string | null
    tempo_estimado_observacao_horas: number | null
    proxima_medicacao_em: string | null
    proxima_medicacao_descricao: string
  }>
}

function fmtDateTime(v: any) {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleString()
}

export default function EnfermariaDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const res = await apiFetch<DashboardData>("/enfermagem/enfermariadashboard/")
        if (!mounted) return
        setData(res)
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar dashboard da enfermaria.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const columns = useMemo(
    () => [
      { header: "Enfermaria", render: (r: any) => r.enfermaria || "—" },
      { header: "Cama", render: (r: any) => r.cama_numero || "—" },
      {
        header: "Paciente",
        render: (r: any) => (
          <Link
            href={`/pacientes/${r.paciente_id}`}
            className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--gray-300)]"
          >
            {r.paciente_nome || "—"}
          </Link>
        ),
      },
      { header: "Internamento", render: (r: any) => r.internamento_codigo || r.internamento_id || "—" },
      { header: "Internado em", render: (r: any) => fmtDateTime(r.data_internamento) },
      { header: "Alta prevista", render: (r: any) => fmtDateTime(r.data_prevista_alta) },
      {
        header: "Próx. medicação",
        render: (r: any) =>
          r.proxima_medicacao_em ? (
            <div>
              <div className="font-medium text-[var(--text)]">{fmtDateTime(r.proxima_medicacao_em)}</div>
              {r.proxima_medicacao_descricao ? (
                <div className="text-xs text-[var(--gray-500)]">{r.proxima_medicacao_descricao}</div>
              ) : null}
            </div>
          ) : (
            "—"
          ),
      },
    ],
    []
  )

  const resumo = data?.resumo

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-6">
        <PageHeader
          title="Enfermaria"
          subtitle="Dashboard: ocupação de camas e próximas medicações."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/enfermagem"
                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
              >
                Voltar
              </Link>
              <Link
                href="/recursos/enfermagem/enfermaria"
                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
              >
                Gerenciamento (Enfermarias)
              </Link>
              <Link
                href="/recursos/enfermagem/camaenfermaria"
                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
              >
                Gerenciamento (Camas)
              </Link>
              <Link
                href="/recursos/enfermagem/internamentoenfermaria"
                className="inline-flex items-center rounded-xl bg-[var(--primary-600)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)]"
              >
                Internamentos
              </Link>
            </div>
          }
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Pacientes" value={loading ? "..." : resumo?.pacientes ?? 0} />
          <MetricCard label="Camas totais" value={loading ? "..." : resumo?.camas_total ?? 0} />
          <MetricCard label="Camas ocupadas" value={loading ? "..." : resumo?.camas_ocupadas ?? 0} />
          <MetricCard label="Camas livres" value={loading ? "..." : resumo?.camas_livres ?? 0} />
        </div>

        <Card title="Camas ocupadas" subtitle="Lista de internamentos ativos (uma linha por cama ocupada).">
          {loading ? (
            <div className="text-sm text-[var(--gray-500)]">Carregando...</div>
          ) : (
            <DataTable columns={columns as any} data={data?.camas || []} emptyMessage="Nenhuma cama ocupada." />
          )}
        </Card>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--gray-100)] p-2 text-[var(--gray-700)]">
              <BedDouble size={18} />
            </div>
            <div className="text-sm text-[var(--gray-700)]">
              Para mostrar horários automáticos de medicação por cama, o próximo passo é registrar administrações (log de doses).
              No MVP, o campo <strong>Horário da próxima medicação</strong> pode ser preenchido pela enfermagem no internamento.
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
