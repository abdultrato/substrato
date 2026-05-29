"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
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
  summary: {
    patients: number
    total_beds: number
    occupied_beds: number
    available_beds: number
  }
  beds: Array<{
    admission_id: number
    admission_code: string
    ward: string
    bed_id: number
    bed_number: string
    patient_id: number
    patient_name: string
    admission_date: string | null
    expected_discharge_date: string | null
    estimated_observation_hours: number | null
    next_medication_at: string | null
    next_medication_description: string
  }>
}

function fmtDateTime(v: any) {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleString()
}

export default function WardDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErrorMessage(null)
        const res = await apiFetch<any>("/nursing/ward_dashboard/")
        if (!mounted) return
        setData(normalizeDashboardData(res))
      } catch (e: any) {
        if (!mounted) return
        setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar o painel da enfermaria."))
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
      { header: "Enfermaria", render: (r: any) => r.ward || "—" },
      { header: "Cama", render: (r: any) => r.bed_number || "—" },
      {
        header: "Paciente",
        render: (r: any) => (
          <Link
            href={`/patients/${r.patient_id}`}
            className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--gray-300)]"
          >
            {r.patient_name || "—"}
          </Link>
        ),
      },
      { header: "Internamento", render: (r: any) => r.admission_code || r.admission_id || "—" },
      { header: "Internado em", render: (r: any) => fmtDateTime(r.admission_date) },
      { header: "Alta prevista", render: (r: any) => fmtDateTime(r.expected_discharge_date) },
      {
        header: "Próx. medicação",
        render: (r: any) =>
          r.next_medication_at ? (
            <div>
              <div className="font-medium text-[var(--text)]">{fmtDateTime(r.next_medication_at)}</div>
              {r.next_medication_description ? (
                <div className="text-xs text-[var(--gray-500)]">{r.next_medication_description}</div>
              ) : null}
            </div>
          ) : (
            "—"
          ),
      },
    ],
    []
  )

  const summary = data?.summary

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-6">
        <PageHeader
          title="Enfermaria"
          subtitle="Painel: ocupação de camas e próximas medicações."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/nursing"
                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
              >
                Voltar
              </Link>
              <Link
                href="/nursing/wards"
                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
              >
                Gerenciamento (Enfermarias)
              </Link>
              <Link
                href="/nursing/ward-beds"
                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
              >
                Gerenciamento (Camas)
              </Link>
              <Link
                href="/nursing/ward-admissions"
                className="inline-flex items-center rounded-xl bg-[var(--primary-600)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)]"
              >
                Internamentos
              </Link>
            </div>
          }
        />

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Pacientes" value={loading ? "..." : summary?.patients ?? 0} />
          <MetricCard label="Camas totais" value={loading ? "..." : summary?.total_beds ?? 0} />
          <MetricCard label="Camas ocupadas" value={loading ? "..." : summary?.occupied_beds ?? 0} />
          <MetricCard label="Camas livres" value={loading ? "..." : summary?.available_beds ?? 0} />
        </div>

        <Card title="Camas ocupadas" subtitle="Lista de internamentos ativos (uma linha por cama ocupada).">
          {loading ? (
            <div className="text-sm text-[var(--gray-500)]">Carregando...</div>
          ) : (
            <DataTable columns={columns as any} data={data?.beds || []} emptyMessage="Nenhuma cama ocupada." />
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

function normalizeDashboardData(raw: any): DashboardData {
  const summary = raw?.summary ?? {}
  const beds = raw?.beds ?? []

  return {
    summary: {
      patients: Number(summary?.patients ?? 0),
      total_beds: Number(summary?.total_beds ?? 0),
      occupied_beds: Number(summary?.occupied_beds ?? 0),
      available_beds: Number(summary?.available_beds ?? 0),
    },
    beds: Array.isArray(beds)
      ? beds.map((bed: any) => ({
          admission_id: Number(bed?.admission_id ?? 0),
          admission_code: String(bed?.admission_code ?? ""),
          ward: String(bed?.ward ?? ""),
          bed_id: Number(bed?.bed_id ?? 0),
          bed_number: String(bed?.bed_number ?? ""),
          patient_id: Number(bed?.patient_id ?? 0),
          patient_name: String(bed?.patient_name ?? ""),
          admission_date: bed?.admission_date ?? null,
          expected_discharge_date: bed?.expected_discharge_date ?? null,
          estimated_observation_hours: bed?.estimated_observation_hours ?? null,
          next_medication_at: bed?.next_medication_at ?? null,
          next_medication_description: String(bed?.next_medication_description ?? ""),
        }))
      : [],
  }
}


