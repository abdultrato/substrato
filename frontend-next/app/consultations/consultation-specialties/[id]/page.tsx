"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  BadgePercent,
  CalendarClock,
  CheckCircle2,
  Coins,
  Loader2,
  Pencil,
  Stethoscope,
  Tag,
  XCircle,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import MoneyValue from "@/components/ui/MoneyValue"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import { routeParamToString } from "@/lib/routeParams"

type Row = Record<string, any>

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const ACTIVE_BADGE =
  "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
const INACTIVE_BADGE =
  "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/30 dark:bg-slate-900/20 dark:text-slate-300"

const TONES = [
  { grad: "from-sky-500 to-blue-600", bar: "bg-sky-500", panel: "from-sky-500/12 via-blue-500/10 to-cyan-500/8" },
  { grad: "from-emerald-500 to-teal-600", bar: "bg-emerald-500", panel: "from-emerald-500/12 via-teal-500/10 to-cyan-500/8" },
  { grad: "from-violet-500 to-purple-600", bar: "bg-violet-500", panel: "from-violet-500/12 via-purple-500/10 to-fuchsia-500/8" },
  { grad: "from-amber-500 to-orange-600", bar: "bg-amber-500", panel: "from-amber-500/12 via-orange-500/10 to-yellow-500/8" },
  { grad: "from-rose-500 to-pink-600", bar: "bg-rose-500", panel: "from-rose-500/12 via-pink-500/10 to-fuchsia-500/8" },
]

const SECTOR_OPTIONS = [
  { value: "GENERAL_MEDICINE", label: "Clínica Geral" },
  { value: "CARDIOLOGY", label: "Cardiologia" },
  { value: "DERMATOLOGY", label: "Dermatologia" },
  { value: "ENDOCRINOLOGY", label: "Endocrinologia" },
  { value: "ANESTHESIOLOGY", label: "Anestesiologia" },
  { value: "PATHOLOGY", label: "Patologia" },
  { value: "NEUROLOGY", label: "Neurologia" },
  { value: "NUTRITION", label: "Nutrição" },
  { value: "OPHTHALMOLOGY", label: "Oftalmologia" },
  { value: "DENTISTRY", label: "Odontologia" },
  { value: "PHYSIOTHERAPY", label: "Fisioterapia" },
  { value: "OCCUPATIONAL_THERAPY", label: "Terapia Ocupacional" },
  { value: "GYNECOLOGY", label: "Ginecologia" },
  { value: "OBSTETRICS", label: "Obstetrícia" },
  { value: "NEPHROLOGY", label: "Nefrologia" },
  { value: "HEMATOLOGY", label: "Hematologia" },
  { value: "GASTROENTEROLOGY", label: "Gastroenterologia" },
  { value: "OTHER", label: "Outro" },
]

function sectorLabel(value: any): string {
  const raw = String(value || "")
  return String(SECTOR_OPTIONS.find((option) => option.value === raw)?.label || raw || "Outro")
}

function toneFor(id: any) {
  const n = Number(id) || String(id).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return TONES[Math.abs(n) % TONES.length]
}

function fmtDateTime(value: any): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function consultationStatusMeta(status: string, t: (pt: string, en: string) => string) {
  switch (String(status || "").toUpperCase()) {
    case "CONCLUIDA":
      return { label: t("Concluída", "Completed"), badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300", bar: "bg-emerald-500" }
    case "CANCELADA":
      return { label: t("Cancelada", "Cancelled"), badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300", bar: "bg-rose-500" }
    case "PAGA":
      return { label: t("Paga", "Paid"), badge: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-700/30 dark:bg-cyan-900/20 dark:text-cyan-300", bar: "bg-cyan-500" }
    default:
      return { label: t("Agendada", "Scheduled"), badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300", bar: "bg-amber-500" }
  }
}

export default function ConsultationSpecialtiesDetailPage() {
  const params = useParams()
  const id = routeParamToString(params?.id)
  const { t } = useLanguage()
  const { loading: authLoading } = useAuthGuard()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [specialty, setSpecialty] = useState<Row | null>(null)
  const [consultations, setConsultations] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [consultationLimit, setConsultationLimit] = useState("20")
  const [consultationStatus, setConsultationStatus] = useState("")

  const consultationPageSize = useMemo(() => {
    const value = Number(consultationLimit)
    if (!Number.isFinite(value)) return 20
    return Math.min(999, Math.max(1, Math.trunc(value)))
  }, [consultationLimit])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const consultationQuery = new URLSearchParams({
        specialty: id,
        page_size: String(consultationPageSize),
        ordering: "-scheduled_for",
      })
      if (consultationStatus) consultationQuery.set("status", consultationStatus)

      const [specialtyResponse, consultationsResponse] = await Promise.all([
        apiFetch<Row>(`/consultations/specialty/${id}/`, { clientCache: safeRefreshToken === 0 }),
        apiFetch<any>(`/consultations/consultation/?${consultationQuery.toString()}`, { clientCache: safeRefreshToken === 0 }),
      ])
      const items = consultationsResponse?.results ?? consultationsResponse
      setSpecialty(specialtyResponse || null)
      setConsultations(Array.isArray(items) ? items : [])
    } catch (e: any) {
      setError(
        isNotFoundLikeError(e)
          ? t("Especialidade não encontrada.", "Specialty not found.")
          : e?.message || t("Falha ao carregar especialidade.", "Failed to load specialty."),
      )
    } finally {
      setLoading(false)
    }
  }, [consultationPageSize, consultationStatus, id, safeRefreshToken, t])

  useEffect(() => {
    load()
  }, [load])

  const active = specialty?.active !== false
  const tone = useMemo(() => toneFor(id), [id])
  const name = String(specialty?.name || `${t("Especialidade", "Specialty")} ${id || ""}`).trim()
  const initial = name.charAt(0).toUpperCase() || "?"
  const vatPct = specialty?.vat_percentage !== null && specialty?.vat_percentage !== undefined && specialty?.vat_percentage !== ""
    ? Number(specialty.vat_percentage)
    : null
  const basePrice = specialty?.base_price
  const sector = specialty?.sector_display || sectorLabel(specialty?.sector)
  const finalPrice =
    basePrice !== null && basePrice !== undefined && basePrice !== "" && vatPct !== null && Number.isFinite(vatPct)
      ? Number(basePrice) * (1 + vatPct / 100)
      : null
  const completedCount = consultations.filter((row) => String(row?.status || "").toUpperCase() === "CONCLUIDA").length
  const openCount = consultations.filter((row) => !["CONCLUIDA", "CANCELADA"].includes(String(row?.status || "").toUpperCase())).length

  const toggleActive = useCallback(async () => {
    if (!id || !specialty) return
    setBusy(true)
    setActionError(null)
    try {
      await apiFetch(`/consultations/specialty/${id}/${active ? "inativar" : "ativar"}/`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      await load()
    } catch (e: any) {
      setActionError(e?.message || t("Falha ao actualizar estado.", "Failed to update status."))
    } finally {
      setBusy(false)
    }
  }, [active, id, load, specialty, t])

  if (authLoading) return null

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("consultations")}>
      <div className="space-y-1.5">
        {loading ? (
          <div className={`${GLASS} flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground`}>
            <Loader2 size={16} className="animate-spin" /> {t("A carregar…", "Loading…")}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : specialty ? (
          <>
            <section className={`relative overflow-hidden ${GLASS} bg-gradient-to-br ${tone.panel}`}>
              <span className={`absolute left-0 top-0 h-full w-1 ${tone.bar}`} />
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/20 blur-3xl" />
              <div className="relative flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 pl-4">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tone.grad} text-base font-bold text-white shadow-md`}>
                    {initial}
                  </span>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-base font-bold leading-tight text-foreground">{name}</h1>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${active ? ACTIVE_BADGE : INACTIVE_BADGE}`}>
                        {active ? t("Ativa", "Active") : t("Inativa", "Inactive")}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">{specialty?.custom_id || `#${specialty?.id ?? id}`}</span>
                    </div>
                    <div className="grid max-w-4xl gap-1.5 md:grid-cols-[minmax(12rem,0.9fr)_minmax(18rem,1.4fr)_minmax(16rem,1.2fr)]">
                      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-white/25 bg-white/45 px-2.5 py-1.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
                        <Stethoscope size={13} className="shrink-0 text-sky-600 dark:text-sky-300" />
                        <div className="min-w-0">
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Sector", "Sector")}</p>
                          <p className="truncate text-xs font-semibold text-foreground">{sector}</p>
                        </div>
                      </div>

                      <div className="grid min-w-0 grid-cols-3 divide-x divide-white/25 overflow-hidden rounded-lg border border-white/25 bg-white/45 shadow-sm backdrop-blur-sm dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.05]">
                        {[
                          { icon: Coins, label: t("Base", "Base"), value: basePrice ? <MoneyValue value={basePrice} /> : "—" },
                          { icon: BadgePercent, label: t("IVA", "VAT"), value: vatPct !== null && Number.isFinite(vatPct) ? `${vatPct}%` : "—" },
                          { icon: Tag, label: t("Final", "Final"), value: finalPrice !== null ? <MoneyValue value={finalPrice} /> : "—" },
                        ].map((item) => (
                          <div key={item.label} className="min-w-0 px-2 py-1.5">
                            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <item.icon size={10} /> {item.label}
                            </p>
                            <p className="truncate text-xs font-semibold text-foreground">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="grid min-w-0 grid-cols-3 divide-x divide-white/25 overflow-hidden rounded-lg border border-white/25 bg-white/45 shadow-sm backdrop-blur-sm dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.05]">
                        {[
                          { icon: CalendarClock, label: t("Recentes", "Recent"), value: String(consultations.length) },
                          { icon: CheckCircle2, label: t("Concluídas", "Completed"), value: String(completedCount) },
                          { icon: CalendarClock, label: t("Em aberto", "Open"), value: String(openCount) },
                        ].map((item) => (
                          <div key={item.label} className="min-w-0 px-2 py-1.5">
                            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <item.icon size={10} /> {item.label}
                            </p>
                            <p className="truncate text-xs font-semibold text-foreground">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/consultations/consultation-specialties"
                    className="group inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/40 py-1.5 pl-1.5 pr-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:border-white/40 hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 transition group-hover:-translate-x-0.5 dark:text-sky-400">
                      <ArrowLeft size={14} />
                    </span>
                    {t("Voltar", "Back")}
                  </Link>
                  <Link
                    href={`/consultations/consultation-specialties/${id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/45 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/65 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]"
                  >
                    <Pencil size={13} /> {t("Editar", "Edit")}
                  </Link>
                  <button
                    type="button"
                    onClick={toggleActive}
                    disabled={busy}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-60 ${active ? "bg-slate-600 hover:bg-slate-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : active ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                    {active ? t("Inativar", "Deactivate") : t("Ativar", "Activate")}
                  </button>
                </div>
              </div>
            </section>

            {actionError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{actionError}</div>
            ) : null}

            <div className="grid gap-1.5">
              <section className={`relative overflow-hidden ${GLASS}`}>
                <span className={`absolute left-0 top-0 h-full w-1 ${tone.bar}`} />
                <div className="grid gap-1.5 px-4 py-3 pl-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/20 bg-white/35 p-4 shadow-inner shadow-white/10 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("Descrição", "Description")}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {specialty?.description || t("Sem descrição registada para esta especialidade.", "No description recorded for this specialty.")}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/20 bg-gradient-to-r from-white/35 to-white/20 p-4 dark:border-white/10 dark:from-white/[0.05] dark:to-white/[0.03]">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <Stethoscope size={12} /> {t("Leitura rápida", "Quick read")}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      {active
                        ? t("Especialidade activa no catálogo de consultas, pronta para uso em novos agendamentos e facturação.", "Specialty is active in the consultations catalog, ready for new scheduling and billing.")
                        : t("Especialidade inactiva no catálogo. O histórico permanece visível, mas novos agendamentos devem usar outra opção activa.", "Specialty is inactive in the catalog. History remains visible, but new scheduling should use another active option.")}
                    </p>
                  </div>
                </div>
              </section>

              <section className={`relative overflow-hidden ${GLASS}`}>
                <span className="absolute left-0 top-0 h-full w-1 bg-sky-500" />
                <div className="space-y-2 px-4 py-3 pl-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <CalendarClock size={13} /> {t("Últimas consultas", "Latest consultations")}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/25 bg-white/40 pl-2.5 pr-1.5 text-[10px] font-semibold text-muted-foreground shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
                        <span className="whitespace-nowrap">{t("Estado", "Status")}</span>
                        <select
                          value={consultationStatus}
                          onChange={(event) => setConsultationStatus(event.target.value)}
                          className="h-6 rounded-md border border-white/25 bg-white/55 px-2 text-xs font-semibold text-foreground outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-white/10"
                        >
                          <option value="">{t("Todos", "All")}</option>
                          <option value="MARCADA">{t("Agendadas", "Scheduled")}</option>
                          <option value="CONCLUIDA">{t("Concluídas", "Completed")}</option>
                          <option value="CANCELADA">{t("Canceladas", "Cancelled")}</option>
                        </select>
                      </label>
                      <label className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/25 bg-white/40 pl-2.5 pr-1.5 text-[10px] font-semibold text-muted-foreground shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
                        <span className="whitespace-nowrap">{t("N.º por página", "Per page")}</span>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={consultationLimit}
                          onChange={(event) => {
                            const raw = event.target.value
                            if (raw === "") {
                              setConsultationLimit("")
                              return
                            }
                            const next = Math.min(999, Math.max(1, Number(raw)))
                            setConsultationLimit(Number.isFinite(next) ? String(Math.trunc(next)) : "20")
                          }}
                          onBlur={() => {
                            setConsultationLimit(String(consultationPageSize))
                          }}
                          className="h-6 w-16 rounded-md border border-white/25 bg-white/55 px-2 text-right text-xs font-semibold text-foreground outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-white/10"
                        />
                      </label>
                      <span className="rounded-full border border-white/25 bg-white/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground dark:border-white/10 dark:bg-white/[0.05]">
                        {consultations.length}
                      </span>
                    </div>
                  </div>

                  {consultations.length ? (
                    <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-4">
                      {consultations.map((row) => {
                        const meta = consultationStatusMeta(String(row?.status || ""), t)
                        return (
                          <Link
                            key={row?.id}
                            href={`/consultations/medical-consultations/${row?.id}`}
                            className="group relative block min-h-[4.25rem] overflow-hidden rounded-lg border border-white/20 bg-white/35 px-3 py-2 pl-4 transition hover:-translate-y-px hover:border-white/40 hover:bg-white/55 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                          >
                            <span className={`absolute left-0 top-0 h-full w-1 ${meta.bar}`} />
                            <div className="flex min-w-0 items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold leading-tight text-foreground">
                                  {row?.patient_name || t("Sem paciente", "No patient")}
                                </p>
                                <div className="mt-0.5 grid min-w-0 gap-0.5 text-[10px] leading-tight text-muted-foreground">
                                  <span className="font-mono">{row?.custom_id || `#${row?.id}`}</span>
                                  <span>{fmtDateTime(row?.scheduled_for)}</span>
                                  {row?.doctor_name ? <span className="truncate">{row.doctor_name}</span> : null}
                                </div>
                              </div>
                              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                                {meta.label}
                              </span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/25 bg-white/20 px-4 py-10 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]">
                      {t("Nenhuma consulta recente encontrada para esta especialidade.", "No recent consultations found for this specialty.")}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}
