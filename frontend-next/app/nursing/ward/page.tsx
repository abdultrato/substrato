"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { ArrowLeft, BedDouble, Building2, ClipboardList, DoorOpen, Loader2, Plus } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import MetricCard from "@/components/ui/MetricCard"
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

const secondaryActionClass =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/50 px-3 text-xs font-medium text-[var(--gray-700)] shadow-sm backdrop-blur-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-white/70 hover:text-[var(--text)] dark:border-white/10 dark:bg-white/10 dark:text-[var(--gray-200)] dark:hover:bg-white/15"

const primaryActionClass =
  "inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700"

const recordLinkClass =
  "font-medium text-[var(--text)] no-underline decoration-[var(--border)] underline-offset-2 transition hover:text-[var(--hover-accent)] hover:underline hover:decoration-[var(--gray-300)]"

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
      {
        header: "Cama",
        render: (r: any) =>
          r.bed_id ? (
            <Link href={`/nursing/ward-beds/${r.bed_id}`} className={recordLinkClass}>
              {r.bed_number || "—"}
            </Link>
          ) : (
            r.bed_number || "—"
          ),
      },
      {
        header: "Paciente",
        render: (r: any) =>
          r.patient_id ? (
            <Link href={`/patients/${r.patient_id}`} className={recordLinkClass}>
              {r.patient_name || "—"}
            </Link>
          ) : (
            r.patient_name || "—"
          ),
      },
      {
        header: "Internamento",
        render: (r: any) =>
          r.admission_id ? (
            <Link href={`/nursing/ward-admissions/${r.admission_id}`} className={recordLinkClass}>
              {r.admission_code || r.admission_id || "—"}
            </Link>
          ) : (
            r.admission_code || "—"
          ),
      },
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
  const occupiedBeds = data?.beds?.length ?? 0

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <BedDouble size={16} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">Enfermaria</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading
                    ? "Carregando ocupação, camas e medicações..."
                    : `${summary?.occupied_beds ?? occupiedBeds} cama${(summary?.occupied_beds ?? occupiedBeds) === 1 ? "" : "s"} ocupada${(summary?.occupied_beds ?? occupiedBeds) === 1 ? "" : "s"} · ${summary?.available_beds ?? 0} livre${(summary?.available_beds ?? 0) === 1 ? "" : "s"}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href="/nursing"
                className={secondaryActionClass}
              >
                <ArrowLeft size={13} />
                Voltar
              </Link>
              <Link
                href="/nursing/wards"
                className={secondaryActionClass}
              >
                <Building2 size={13} />
                Enfermarias
              </Link>
              <Link
                href="/nursing/ward-beds"
                className={secondaryActionClass}
              >
                <DoorOpen size={13} />
                Camas
              </Link>
              <Link
                href="/nursing/ward-admissions"
                className={secondaryActionClass}
              >
                <ClipboardList size={13} />
                Internamentos
              </Link>
              <Link href="/nursing/ward-admissions/new" className={primaryActionClass}>
                <Plus size={13} />
                Nova admissão
              </Link>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Pacientes" value={loading ? "..." : summary?.patients ?? 0} accentClass="border-l-blue-500" />
          <MetricCard label="Camas totais" value={loading ? "..." : summary?.total_beds ?? 0} accentClass="border-l-slate-500" />
          <MetricCard label="Camas ocupadas" value={loading ? "..." : summary?.occupied_beds ?? 0} accentClass="border-l-amber-500" />
          <MetricCard label="Camas livres" value={loading ? "..." : summary?.available_beds ?? 0} accentClass="border-l-emerald-500" />
        </div>

        <section className="overflow-hidden rounded-xl border border-white/20 bg-white/20 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Camas ocupadas</p>
              <p className="text-[11px] text-muted-foreground">Internamentos ativos, localização e próxima medicação por paciente.</p>
            </div>
            <span className="rounded-full border border-white/25 bg-white/45 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[var(--gray-700)] shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-[var(--gray-200)]">
              {loading ? "..." : `${occupiedBeds} / ${summary?.occupied_beds ?? occupiedBeds}`}
            </span>
          </div>
          <div className="p-2">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                Carregando...
              </div>
            ) : (
              <DataTable
                columns={columns as any}
                data={data?.beds || []}
                emptyMessage="Nenhuma cama ocupada."
                searchPlaceholder="Pesquisar por enfermaria, cama, paciente ou internamento..."
                searchKeys={["ward", "bed_number", "patient_name", "admission_code", "next_medication_description"]}
                bare
              />
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
