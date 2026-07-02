"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type FormEvent } from "react"
import { CalendarDays, CheckCircle2, Loader2, Plus, Search, Sparkles, Tag, X } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageSizeInput from "@/components/ui/PageSizeInput"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefresh, useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { buildRecordDetailHref } from "@/lib/resources/recordIdentity"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type Row = Record<string, any>

type HolidayFormState = {
  date: string
  description: string
  active: boolean
}

const ENDPOINT = "/consultations/holiday/"
const ROUTE_BASE = "/consultations/holidays"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const ACTIVE_BADGE =
  "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
const INACTIVE_BADGE =
  "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/30 dark:bg-slate-900/20 dark:text-slate-300"

const INITIAL_FORM: HolidayFormState = {
  date: "",
  description: "",
  active: true,
}

function isActive(row: Row): boolean {
  return row?.active !== false
}

function formatHolidayDate(value: any, locale: string) {
  if (!value) return "—"
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
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

function HolidayCard({
  row,
  href,
  locale,
  t,
}: {
  row: Row
  href: string
  locale: string
  t: (pt: string, en: string) => string
}) {
  const active = isActive(row)
  const phase = holidayPhase(row?.date)
  const phaseLabel =
    phase === "today"
      ? t("Hoje", "Today")
      : phase === "future"
        ? t("Próximo", "Upcoming")
        : phase === "past"
          ? t("Passado", "Past")
          : t("Sem data", "No date")
  const phaseClass =
    phase === "today"
      ? "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/20 dark:border-amber-700/30"
      : phase === "future"
        ? "text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-900/20 dark:border-sky-700/30"
        : "text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-900/20 dark:border-violet-700/30"

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden ${GLASS} p-3 pl-4 transition hover:-translate-y-px hover:border-white/40 hover:shadow-md`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${active ? "bg-emerald-500" : "bg-slate-400"}`} />

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-sm">
            <CalendarDays size={17} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-foreground">
              {row?.description ? String(row.description) : t("Feriado sem descrição", "Holiday without description")}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{row?.custom_id || `#${row?.id}`}</div>
          </div>
        </div>

        <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${active ? ACTIVE_BADGE : INACTIVE_BADGE}`}>
          {active ? t("Ativo", "Active") : t("Inativo", "Inactive")}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${phaseClass}`}>
          <Sparkles size={11} />
          {phaseLabel}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/40 px-2 py-0.5 text-[10px] font-semibold text-foreground dark:border-white/10 dark:bg-white/[0.05]">
          <CalendarDays size={11} />
          {formatHolidayDate(row?.date, locale)}
        </span>
      </div>
    </Link>
  )
}

export default function ConsultationHolidaysPage() {
  const { loading: authLoading } = useAuthGuard()
  const { t } = useLanguage()
  const { refreshNow } = useSafeDataRefresh()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const locale = "pt-PT"
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | null>(null)
  const [pageSize, setPageSize] = useState(16)
  const [form, setForm] = useState<HolidayFormState>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const response = await apiFetch<any>(ENDPOINT, { clientCache: safeRefreshToken === 0 })
        const items = response?.results ?? response
        if (mounted) setData(Array.isArray(items) ? items : [])
      } catch (e: any) {
        if (mounted) setError(e?.message || t("Falha ao carregar feriados.", "Failed to load holidays."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken, t])

  const stats = useMemo(() => {
    const activeRows = data.filter((row) => isActive(row))
    return {
      total: data.length,
      active: activeRows.length,
      inactive: data.length - activeRows.length,
    }
  }, [data])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return data.filter((row) => {
      if (statusFilter === "active" && !isActive(row)) return false
      if (statusFilter === "inactive" && isActive(row)) return false
      if (!query) return true
      const haystack = [row?.description, row?.date, row?.custom_id]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ")
      return haystack.includes(query)
    })
  }, [data, search, statusFilter])

  const visible = useMemo(() => filtered.slice(0, pageSize), [filtered, pageSize])

  function rowHref(row: Row): string {
    return buildRecordDetailHref(ROUTE_BASE, row) ?? `${ROUTE_BASE}/${row.id}`
  }

  async function createHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (!form.date) {
      setFormError(t("Informe a data do feriado.", "Provide the holiday date."))
      return
    }

    setSaving(true)
    try {
      await apiFetch(ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          date: form.date,
          description: form.description.trim(),
          active: form.active,
        }),
      })
      setForm(INITIAL_FORM)
      setFormOpen(false)
      void refreshNow("mutation")
    } catch (e: any) {
      setFormError(e?.message || t("Falha ao criar feriado.", "Failed to create holiday."))
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) return null

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("consultations")}>
      <div className="space-y-1.5">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 pl-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-md shadow-amber-500/20">
                <CalendarDays size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">{t("Feriados", "Holidays")}</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? t("A carregar…", "Loading…") : `${filtered.length} ${t("de", "of")} ${data.length}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFormError(null)
                setFormOpen(true)
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-amber-500/25 transition hover:brightness-110"
            >
              <Plus size={14} />
              {t("Novo feriado", "New holiday")}
            </button>

            <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-sm">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Descrição, data ou código…", "Description, date or code…")}
                className="w-full rounded-lg border border-white/30 bg-white/50 py-1.5 pl-8 pr-7 text-xs text-foreground shadow-sm backdrop-blur-sm transition placeholder:text-muted-foreground hover:border-amber-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/25 dark:border-white/10 dark:bg-white/10"
              />
              {search ? (
                <button
                  type="button"
                  aria-label={t("Limpar", "Clear")}
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1" title={t("Itens por página", "Items per page")}>
              <PageSizeInput value={pageSize} onChange={setPageSize} ariaLabel={t("Itens por página", "Items per page")} />
              <span className="text-[11px] text-muted-foreground">/{t("pág", "pg")}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 border-t border-white/20 px-3 py-1.5 pl-4 dark:border-white/10">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Estado", "Status")}</span>
            {[
              { key: "active" as const, label: t("Ativos", "Active"), count: stats.active, cls: ACTIVE_BADGE },
              { key: "inactive" as const, label: t("Inativos", "Inactive"), count: stats.inactive, cls: INACTIVE_BADGE },
            ].map((item) => {
              const active = statusFilter === item.key
              if (!item.count && !active) return null
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(active ? null : item.key)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${active ? `${item.cls} ring-2 ring-current/20` : "border-transparent text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"}`}
                >
                  {item.label}
                  <span className="rounded-full bg-black/5 px-1 tabular-nums dark:bg-white/10">{item.count}</span>
                </button>
              )
            })}
            {(statusFilter || search) ? (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter(null)
                  setSearch("")
                }}
                className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/40 px-2 py-0.5 text-[10px] font-semibold text-foreground transition hover:bg-white/60 dark:border-white/10 dark:bg-white/10"
              >
                <X size={11} /> {t("Limpar", "Clear")}
              </button>
            ) : null}
          </div>
        </section>

        <section className="grid gap-1.5 md:grid-cols-3">
          {[
            { key: "all", label: t("Total", "Total"), count: stats.total, bar: "bg-amber-500", active: statusFilter === null },
            { key: "active", label: t("Ativos", "Active"), count: stats.active, bar: "bg-emerald-500", active: statusFilter === "active" },
            { key: "inactive", label: t("Inativos", "Inactive"), count: stats.inactive, bar: "bg-slate-500", active: statusFilter === "inactive" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setStatusFilter(item.key === "all" ? null : (item.key as "active" | "inactive"))
                document.getElementById("holidays-grid")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }}
              className={`relative overflow-hidden rounded-xl border bg-white/30 px-4 py-3 text-left shadow-sm backdrop-blur-sm transition hover:-translate-y-px hover:border-white/40 hover:shadow-md dark:bg-white/[0.04] ${item.active ? "border-white/50 ring-2 ring-white/20 dark:border-white/20" : "border-white/20 dark:border-white/10"}`}
            >
              <span className={`absolute left-0 top-0 h-full w-1 ${item.bar}`} />
              <div className="pl-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</div>
                <div className="mt-1 text-2xl font-bold text-foreground">{item.count}</div>
              </div>
            </button>
          ))}
        </section>

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : null}

        {loading ? (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, index) => (
              <div key={index} className={`h-32 animate-pulse ${GLASS}`} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className={`${GLASS} flex flex-col items-center justify-center gap-2 px-4 py-14 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Tag size={24} />
            </span>
            <p className="text-sm font-semibold text-foreground">{t("Nenhum feriado encontrado", "No holidays found")}</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {data.length === 0
                ? t("Ainda não há feriados registados.", "No holidays recorded yet.")
                : t("Nenhum resultado corresponde aos filtros aplicados.", "No results match the applied filters.")}
            </p>
          </div>
        ) : (
          <>
            <div id="holidays-grid" className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((row) => (
                <HolidayCard key={row.id} row={row} href={rowHref(row)} locale={locale} t={t} />
              ))}
            </div>
            {filtered.length > pageSize ? (
              <div className="px-1 text-center text-[11px] text-muted-foreground">
                {t("A mostrar", "Showing")} {visible.length} {t("de", "of")} {filtered.length}
              </div>
            ) : null}
          </>
        )}
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => !saving && setFormOpen(false)} />
          <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-fuchsia-500/15 shadow-2xl backdrop-blur-xl dark:border-white/10">
            <span className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-amber-500 via-rose-500 to-fuchsia-500" />
            <div className="flex items-center justify-between gap-2 border-b border-white/20 px-3 py-2.5 pl-4 dark:border-white/10">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-sm">
                  <CalendarDays size={14} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-foreground">{t("Novo feriado", "New holiday")}</h2>
                  <p className="text-[11px] text-muted-foreground">{t("Cadastro rápido do calendário.", "Quick calendar entry.")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !saving && setFormOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/30 hover:text-foreground"
                aria-label={t("Fechar", "Close")}
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-2.5 pl-3.5">
              {formError ? (
                <div className="mb-2 rounded-lg border border-red-200 bg-red-50/90 px-2.5 py-1.5 text-[11px] text-red-800 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300">
                  {formError}
                </div>
              ) : null}

              <form onSubmit={createHoliday} className="space-y-1.5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Data", "Date")}</span>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                      className="w-full rounded-lg border border-white/30 bg-white/55 px-2.5 py-1.5 text-xs text-foreground shadow-sm outline-none transition hover:border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-white/10"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Estado", "Status")}</span>
                    <div className="flex min-h-[34px] items-center justify-between rounded-lg border border-white/30 bg-white/55 px-2.5 py-1.5 text-[11px] text-foreground shadow-sm dark:border-white/10 dark:bg-white/10">
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 size={14} className={form.active ? "text-emerald-500" : "text-slate-400"} />
                        {form.active ? t("Ativo", "Active") : t("Inativo", "Inactive")}
                      </span>
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                        className="h-4 w-4 accent-emerald-600"
                      />
                    </div>
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Descrição", "Description")}</span>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder={t("Ex.: Dia da Independência", "E.g. Independence Day")}
                    className="w-full rounded-lg border border-white/30 bg-white/55 px-2.5 py-1.5 text-xs text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground hover:border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-white/10 dark:bg-white/10"
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/25 bg-white/35 px-2.5 py-1.5 text-[10px] text-foreground dark:border-white/10 dark:bg-white/[0.04]">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={12} className="text-amber-600 dark:text-amber-300" />
                    {form.date ? formatHolidayDate(form.date, locale) : t("Selecione uma data", "Select a date")}
                  </span>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 px-3 text-[11px] font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {saving ? t("A criar...", "Creating...") : t("Criar", "Create")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  )
}
