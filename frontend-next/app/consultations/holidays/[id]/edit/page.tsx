"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Loader2,
  Pencil,
  Save,
  Sparkles,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import { routeParamToString } from "@/lib/routeParams"

type Row = Record<string, any>

type HolidayFormState = {
  date: string
  description: string
  active: boolean
}

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

function fmtDate(value: any, locale = "pt-PT") {
  if (!value) return "—"
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
}

function fmtDateTime(value: any) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function holidayPhase(dateValue: any) {
  if (!dateValue) return "unknown"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(target.getTime())) return "unknown"
  if (target.getTime() === today.getTime()) return "today"
  return target > today ? "future" : "past"
}

function daysDelta(dateValue: any) {
  if (!dateValue) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export default function ConsultationHolidayEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = routeParamToString(params?.id)
  const { t } = useLanguage()
  const { loading: authLoading } = useAuthGuard()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [holiday, setHoliday] = useState<Row | null>(null)
  const [form, setForm] = useState<HolidayFormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch<Row>(`/consultations/holiday/${id}/`, {
        clientCache: safeRefreshToken === 0,
      })
      setHoliday(response || null)
      setForm({
        date: String(response?.date || ""),
        description: String(response?.description || ""),
        active: response?.active !== false,
      })
    } catch (e: any) {
      setError(
        isNotFoundLikeError(e)
          ? t("Feriado não encontrado.", "Holiday not found.")
          : e?.message || t("Falha ao carregar feriado.", "Failed to load holiday."),
      )
    } finally {
      setLoading(false)
    }
  }, [id, safeRefreshToken, t])

  useEffect(() => {
    load()
  }, [load])

  const phase = holidayPhase(form?.date)
  const delta = daysDelta(form?.date)
  const phaseMeta = useMemo(() => {
    switch (phase) {
      case "today":
        return {
          label: t("Hoje", "Today"),
          badge:
            "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300",
        }
      case "future":
        return {
          label: t("Próximo", "Upcoming"),
          badge:
            "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300",
        }
      case "past":
        return {
          label: t("Passado", "Past"),
          badge:
            "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300",
        }
      default:
        return {
          label: t("Sem data", "No date"),
          badge:
            "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/30 dark:bg-slate-900/20 dark:text-slate-300",
        }
    }
  }, [phase, t])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!id || !form) return
    setFormError(null)

    if (!form.date.trim()) {
      setFormError(t("Informe a data do feriado.", "Provide the holiday date."))
      return
    }

    setSaving(true)
    try {
      await apiFetch(`/consultations/holiday/${id}/`, {
        method: "PUT",
        body: JSON.stringify({
          date: form.date,
          description: form.description.trim(),
          active: form.active,
        }),
      })
      router.push(`/consultations/holidays/${id}`)
    } catch (e: any) {
      setFormError(e?.message || t("Falha ao guardar alterações.", "Failed to save changes."))
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) return null

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("consultations")}>
      <div className="space-y-1">
        {loading ? (
          <div className={`${GLASS} flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground`}>
            <Loader2 size={16} className="animate-spin" /> {t("A carregar…", "Loading…")}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : form ? (
          <>
            <section className={`relative overflow-hidden ${GLASS} bg-gradient-to-br from-amber-500/12 via-rose-500/10 to-fuchsia-500/8`}>
              <span className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/20 blur-3xl" />
              <div className="relative flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-2 pl-3.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white shadow-md">
                    <CalendarDays size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-base font-bold leading-tight text-foreground">
                        {form.description.trim() || t("Editar feriado", "Edit holiday")}
                      </h1>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${phaseMeta.badge}`}>
                        {phaseMeta.label}
                      </span>
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300">
                        {t("Modo edição", "Edit mode")}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{holiday?.custom_id || `#${id}`}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/consultations/holidays/${id}`}
                    className="group inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/40 py-1 pl-1 pr-2.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:border-white/40 hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 transition group-hover:-translate-x-0.5 dark:text-amber-400">
                      <ArrowLeft size={13} />
                    </span>
                    {t("Voltar ao detalhe", "Back to detail")}
                  </Link>
                </div>
              </div>
            </section>

            <div className="grid gap-1 xl:grid-cols-[minmax(0,1.08fr)_minmax(260px,0.92fr)]">
              <section className={`${GLASS} overflow-hidden`}>
                <div className="flex items-center gap-1.5 border-b border-white/20 px-2.5 py-2 pl-3.5 dark:border-white/10">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-sm">
                    <Pencil size={14} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">{t("Editar feriado", "Edit holiday")}</h2>
                    <p className="text-[11px] text-muted-foreground">{t("Actualize data, descrição e disponibilidade.", "Update date, description and availability.")}</p>
                  </div>
                </div>

                <div className="p-2.5">
                  {formError ? (
                    <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
                      {formError}
                    </div>
                  ) : null}

                  <form onSubmit={handleSubmit} className="space-y-2">
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      <label className="space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">{t("Data", "Date")}</span>
                        <input
                          type="date"
                          value={form.date}
                          onChange={(e) => setForm((prev) => (prev ? { ...prev, date: e.target.value } : prev))}
                          className="w-full rounded-lg border border-white/30 bg-white/55 px-2 py-1.5 text-sm text-foreground shadow-sm backdrop-blur-sm outline-none transition hover:border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-white/10"
                        />
                      </label>

                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">{t("Estado", "Status")}</span>
                        <label className="flex min-h-[36px] cursor-pointer items-center justify-between rounded-lg border border-white/30 bg-white/55 px-2 py-1 text-sm text-foreground shadow-sm backdrop-blur-sm transition hover:border-emerald-400 dark:border-white/10 dark:bg-white/10">
                          <span className="inline-flex items-center gap-2">
                            <CheckCircle2 size={15} className={form.active ? "text-emerald-500" : "text-slate-400"} />
                            {form.active ? t("Ativo", "Active") : t("Inativo", "Inactive")}
                          </span>
                          <input
                            type="checkbox"
                            checked={form.active}
                            onChange={(e) => setForm((prev) => (prev ? { ...prev, active: e.target.checked } : prev))}
                            className="h-4 w-4 accent-emerald-600"
                          />
                        </label>
                      </div>
                    </div>

                    <label className="block space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground">{t("Descrição", "Description")}</span>
                      <textarea
                        rows={2}
                        value={form.description}
                        onChange={(e) => setForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                        className="w-full rounded-lg border border-white/30 bg-white/55 px-2 py-1.5 text-sm text-foreground shadow-sm backdrop-blur-sm outline-none transition hover:border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-white/10 dark:bg-white/10"
                        placeholder={t("Ex.: Dia da Independência", "E.g. Independence Day")}
                      />
                    </label>

                    <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-white/20 bg-white/35 px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={12} className="text-amber-600 dark:text-amber-300" />
                          {fmtDate(form.date)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarRange size={12} className="text-sky-600 dark:text-sky-300" />
                          {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta} ${t("dias", "days")}`}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${phaseMeta.badge}`}>
                          <Sparkles size={11} />
                          {phaseMeta.label}
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 px-2.5 text-[11px] font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
                      >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        {saving ? t("A guardar...", "Saving...") : t("Guardar alterações", "Save changes")}
                      </button>
                    </div>
                  </form>
                </div>
              </section>

              <aside className="grid gap-1">
                <section className={`relative overflow-hidden ${GLASS}`}>
                  <span className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
                  <div className="px-2.5 py-2 pl-3.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <Sparkles size={12} /> {t("Resumo rápido", "Quick summary")}
                    </div>
                    <div className="mt-2 grid gap-1">
                      <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-2 py-1.5 dark:border-amber-700/30 dark:bg-amber-900/15">
                        <div className="text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300">{t("Fase", "Phase")}</div>
                        <div className="mt-0.5 text-sm font-semibold text-amber-900 dark:text-amber-100">{phaseMeta.label}</div>
                      </div>
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-2 py-1.5 dark:border-emerald-700/30 dark:bg-emerald-900/15">
                        <div className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">{t("Estado", "Status")}</div>
                        <div className="mt-0.5 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                          {form.active ? t("Activo", "Active") : t("Inactivo", "Inactive")}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className={`relative overflow-hidden ${GLASS}`}>
                  <span className="absolute left-0 top-0 h-full w-1 bg-rose-500" />
                  <div className="px-2.5 py-2 pl-3.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <Clock3 size={12} /> {t("Metadados", "Metadata")}
                    </div>
                    <div className="mt-2 grid gap-1">
                      <div className="rounded-lg border border-white/20 bg-white/40 px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="text-[10px] font-semibold uppercase text-muted-foreground">{t("Código", "Code")}</div>
                        <div className="mt-0.5 font-mono text-sm text-foreground">{holiday?.custom_id || `#${id}`}</div>
                      </div>
                      <div className="rounded-lg border border-white/20 bg-white/40 px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="text-[10px] font-semibold uppercase text-muted-foreground">{t("Criado em", "Created at")}</div>
                        <div className="mt-0.5 text-sm text-foreground">{fmtDateTime(holiday?.created_at)}</div>
                      </div>
                      <div className="rounded-lg border border-white/20 bg-white/40 px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="text-[10px] font-semibold uppercase text-muted-foreground">{t("Actualizado em", "Updated at")}</div>
                        <div className="mt-0.5 text-sm text-foreground">{fmtDateTime(holiday?.updated_at)}</div>
                      </div>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}
