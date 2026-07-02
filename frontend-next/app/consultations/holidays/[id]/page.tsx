"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Loader2,
  Pencil,
  Sparkles,
  Tag,
  XCircle,
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

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const ACTIVE_BADGE =
  "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
const INACTIVE_BADGE =
  "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/30 dark:bg-slate-900/20 dark:text-slate-300"

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

export default function ConsultationHolidayDetailPage() {
  const params = useParams()
  const id = routeParamToString(params?.id)
  const { t } = useLanguage()
  const { loading: authLoading } = useAuthGuard()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [holiday, setHoliday] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch<Row>(`/consultations/holiday/${id}/`, {
        clientCache: safeRefreshToken === 0,
      })
      setHoliday(response || null)
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

  const active = holiday?.active !== false
  const phase = holidayPhase(holiday?.date)
  const delta = daysDelta(holiday?.date)
  const phaseMeta = useMemo(() => {
    switch (phase) {
      case "today":
        return {
          label: t("Hoje", "Today"),
          badge:
            "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300",
          insight: t("Este feriado coincide com o dia actual.", "This holiday falls on today."),
        }
      case "future":
        return {
          label: t("Próximo", "Upcoming"),
          badge:
            "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300",
          insight:
            delta === 1
              ? t("Falta 1 dia para este feriado.", "This holiday is 1 day away.")
              : t(`Faltam ${delta ?? "—"} dias para este feriado.`, `${delta ?? "—"} days remain until this holiday.`),
        }
      case "past":
        return {
          label: t("Passado", "Past"),
          badge:
            "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300",
          insight:
            delta === -1
              ? t("Este feriado ocorreu há 1 dia.", "This holiday happened 1 day ago.")
              : t(`Este feriado ocorreu há ${Math.abs(delta ?? 0)} dias.`, `This holiday happened ${Math.abs(delta ?? 0)} days ago.`),
        }
      default:
        return {
          label: t("Sem data", "No date"),
          badge:
            "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/30 dark:bg-slate-900/20 dark:text-slate-300",
          insight: t("A data do feriado não está legível.", "The holiday date is not readable."),
        }
    }
  }, [delta, phase, t])

  const title = String(holiday?.description || t("Feriado", "Holiday")).trim()

  const toggleActive = useCallback(async () => {
    if (!id || !holiday) return
    setBusy(true)
    setActionError(null)
    try {
      await apiFetch(`/consultations/holiday/${id}/`, {
        method: "PUT",
        body: JSON.stringify({
          date: holiday.date,
          description: String(holiday.description || "").trim(),
          active: !active,
        }),
      })
      await load()
    } catch (e: any) {
      setActionError(e?.message || t("Falha ao actualizar estado.", "Failed to update status."))
    } finally {
      setBusy(false)
    }
  }, [active, holiday, id, load, t])

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
        ) : holiday ? (
          <>
            <section className={`relative overflow-hidden ${GLASS} bg-gradient-to-br from-amber-500/12 via-rose-500/10 to-fuchsia-500/8`}>
              <span className={`absolute left-0 top-0 h-full w-1 ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/20 blur-3xl" />
              <div className="relative flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 pl-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white shadow-md">
                    <CalendarDays size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-base font-bold leading-tight text-foreground">{title}</h1>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${active ? ACTIVE_BADGE : INACTIVE_BADGE}`}>
                        {active ? t("Ativo", "Active") : t("Inativo", "Inactive")}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${phaseMeta.badge}`}>
                        {phaseMeta.label}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{holiday?.custom_id || `#${holiday?.id ?? id}`}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/consultations/holidays/${id}/edit`}
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
                  <Link
                    href="/consultations/holidays"
                    className="group inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/40 py-1.5 pl-1.5 pr-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:border-white/40 hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 transition group-hover:-translate-x-0.5 dark:text-amber-400">
                      <ArrowLeft size={14} />
                    </span>
                    {t("Feriados", "Holidays")}
                  </Link>
                </div>
              </div>
            </section>

            {actionError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{actionError}</div>
            ) : null}

            <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { icon: CalendarDays, label: t("Data do feriado", "Holiday date"), value: fmtDate(holiday?.date) },
                { icon: CalendarRange, label: t("Diferença em dias", "Day difference"), value: delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}` },
                { icon: Tag, label: t("Estado do registo", "Record status"), value: active ? t("Disponível", "Available") : t("Inactivo", "Inactive") },
                { icon: Sparkles, label: t("Fase", "Phase"), value: phaseMeta.label },
              ].map((item, index) => (
                <section key={index} className={`relative overflow-hidden ${GLASS}`}>
                  <span className={`absolute left-0 top-0 h-full w-1 ${index % 2 === 0 ? "bg-amber-500" : "bg-rose-500"}`} />
                  <div className="px-3 py-2 pl-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <item.icon size={12} /> {item.label}
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium text-foreground">{item.value}</div>
                  </div>
                </section>
              ))}
            </div>

            <div className="grid gap-1.5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <section className={`relative overflow-hidden ${GLASS}`}>
                <span className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
                <div className="space-y-2.5 px-3 py-2.5 pl-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-2 dark:border-amber-700/30 dark:bg-amber-900/15">
                      <div className="text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300">{t("Classificação", "Classification")}</div>
                      <div className="mt-1 text-lg font-bold text-amber-900 dark:text-amber-100">{phaseMeta.label}</div>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-2 dark:border-emerald-700/30 dark:bg-emerald-900/15">
                      <div className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">{t("Estado", "Status")}</div>
                      <div className="mt-1 text-lg font-bold text-emerald-900 dark:text-emerald-100">
                        {active ? t("Activo", "Active") : t("Inactivo", "Inactive")}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/20 bg-white/35 px-3 py-3 shadow-inner shadow-white/10 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("Descrição", "Description")}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {holiday?.description || t("Sem descrição registada para este feriado.", "No description recorded for this holiday.")}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/20 bg-gradient-to-r from-white/35 to-white/20 px-3 py-3 dark:border-white/10 dark:from-white/[0.05] dark:to-white/[0.03]">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <Sparkles size={12} /> {t("Leitura rápida", "Quick read")}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-foreground">{phaseMeta.insight}</p>
                  </div>
                </div>
              </section>

              <section className={`relative overflow-hidden ${GLASS}`}>
                <span className="absolute left-0 top-0 h-full w-1 bg-rose-500" />
                <div className="space-y-2 px-3 py-2.5 pl-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Clock3 size={13} /> {t("Metadados do registo", "Record metadata")}
                  </div>

                  {[
                    { label: t("Código", "Code"), value: holiday?.custom_id || `#${holiday?.id ?? id}` },
                    { label: t("Criado em", "Created at"), value: fmtDateTime(holiday?.created_at) },
                    { label: t("Actualizado em", "Updated at"), value: fmtDateTime(holiday?.updated_at) },
                    { label: t("Data bruta", "Raw date"), value: String(holiday?.date || "—") },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-white/20 bg-white/35 px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="text-[10px] font-semibold uppercase text-muted-foreground">{item.label}</div>
                      <div className="mt-0.5 text-sm text-foreground">{item.value}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}
