"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import MetricCard from "@/components/ui/MetricCard"
import PageHeader from "@/components/ui/PageHeader"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
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
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [data, setData] = useState<DashboardData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErrorMessage(null)
        const res = await apiFetch<any>("/nursing/ward_dashboard/", { clientCache: safeRefreshToken === 0 })
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
  }, [safeRefreshToken])

  const columns = useMemo(
    () => [
      { header: "Enfermaria", render: (r: any) => r.ward || "—" },
      { header: "Cama", render: (r: any) => r.bed_number || "—" },
      {
        header: "Paciente",
        render: (r: any) => (
          <Link
            href={`/patients/${r.patient_id}`}
            className="font-medium text-[var(--text)] no-underline decoration-[var(--border)] underline-offset-2 hover:underline hover:decoration-[var(--gray-300)]"
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
      <div className="space-y-3">
        <PageHeader
          title="Enfermaria"
          subtitle="Painel: ocupação de camas e próximas medicações."
          actions={
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href="/nursing"
                className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground-2 transition hover:bg-muted hover:text-foreground"
              >
                Voltar
              </Link>
              <Link
                href="/nursing/wards"
                className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground-2 transition hover:bg-muted hover:text-foreground"
              >
                Enfermarias
              </Link>
              <Link
                href="/nursing/ward-beds"
                className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground-2 transition hover:bg-muted hover:text-foreground"
              >
                Camas
              </Link>
              <Link
                href="/nursing/ward-admissions"
                className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Internamentos
              </Link>
            </div>
          }
        />

        {errorMessage ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Pacientes" value={loading ? "..." : summary?.patients ?? 0} accentClass="border-l-blue-500" />
          <MetricCard label="Camas totais" value={loading ? "..." : summary?.total_beds ?? 0} accentClass="border-l-slate-500" />
          <MetricCard label="Camas ocupadas" value={loading ? "..." : summary?.occupied_beds ?? 0} accentClass="border-l-amber-500" />
          <MetricCard label="Camas livres" value={loading ? "..." : summary?.available_beds ?? 0} accentClass="border-l-emerald-500" />
        </div>

        <section className="rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="border-b border-border/60 px-3 py-2">
            <p className="text-xs font-semibold text-foreground">Camas ocupadas</p>
            <p className="text-[10px] text-muted-foreground">Internamentos ativos (uma linha por cama ocupada)</p>
          </div>
          <div className="p-2">
            {loading ? (
              <div className="py-4 text-center text-xs text-muted-foreground">Carregando...</div>
            ) : (
              <DataTable columns={columns as any} data={data?.beds || []} emptyMessage="Nenhuma cama ocupada." />
            )}
          </div>
        </section>
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

