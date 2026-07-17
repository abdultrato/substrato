"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  ArrowLeft,
  BadgePercent,
  CheckCircle2,
  Clipboard,
  Coins,
  Loader2,
  Plus,
  Search,
  Stethoscope,
  Tag,
  X,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import MoneyValue from "@/components/ui/MoneyValue"
import PageSizeInput from "@/components/ui/PageSizeInput"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefresh, useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { buildRecordDetailHref } from "@/lib/resources/recordIdentity"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type Row = Record<string, any>

const ENDPOINT = "/consultations/specialty/"
const ROUTE_BASE = "/consultations/consultation-specialties"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const ACTIVE_BADGE =
  "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
const INACTIVE_BADGE =
  "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/30 dark:bg-slate-900/20 dark:text-slate-300"

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

function specialtyTone(id: any) {
  const tones = [
    { grad: "from-sky-500 to-blue-600", bar: "bg-sky-500" },
    { grad: "from-emerald-500 to-teal-600", bar: "bg-emerald-500" },
    { grad: "from-violet-500 to-purple-600", bar: "bg-violet-500" },
    { grad: "from-amber-500 to-orange-600", bar: "bg-amber-500" },
    { grad: "from-rose-500 to-pink-600", bar: "bg-rose-500" },
  ]
  const n = Number(id) || String(id).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return tones[Math.abs(n) % tones.length]
}

function isActive(row: Row): boolean {
  return row?.active !== false
}

function parsePercent(value: any): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function SpecialtyCard({ row, href, t }: { row: Row; href: string; t: (pt: string, en: string) => string }) {
  const tone = specialtyTone(row?.id)
  const name = String(row?.name || `${t("Especialidade", "Specialty")} ${row?.id || ""}`).trim()
  const initial = name.charAt(0).toUpperCase() || "?"
  const active = isActive(row)
  const vat = parsePercent(row?.vat_percentage)
  const sector = row?.sector_display || sectorLabel(row?.sector)

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden ${GLASS} p-3 pl-4 transition hover:-translate-y-px hover:border-white/40 hover:shadow-md`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${tone.bar}`} />

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tone.grad} text-sm font-bold text-white shadow-sm`}>
            {initial}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-foreground">{name}</div>
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{row?.custom_id || `#${row?.id}`}</div>
          </div>
        </div>
        <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${active ? ACTIVE_BADGE : INACTIVE_BADGE}`}>
          {active ? t("Ativa", "Active") : t("Inativa", "Inactive")}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-semibold text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300">
          <Tag size={11} />
          {sector}
        </span>
        <span className="inline-flex items-center gap-1">
          <Coins size={11} />
          <MoneyValue value={row?.base_price} />
        </span>
        <span className="inline-flex items-center gap-1">
          <BadgePercent size={11} />
          {vat !== null ? `${vat}% IVA` : t("IVA não definido", "VAT not defined")}
        </span>
      </div>

      {row?.description ? (
        <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">{String(row.description)}</p>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">{t("Sem descrição registada.", "No description recorded.")}</p>
      )}
    </Link>
  )
}

type SpecialtyFormState = {
  name: string
  description: string
  base_price: string
  vat_percentage: string
  sector: string
  active: boolean
}

const INITIAL_FORM: SpecialtyFormState = {
  name: "",
  description: "",
  base_price: "",
  vat_percentage: "16",
  sector: "GENERAL_MEDICINE",
  active: true,
}

export default function ConsultationsConsultationSpecialtiesPage() {
  const { loading: authLoading } = useAuthGuard()
  const { t } = useLanguage()
  const { refreshNow, isRefreshing } = useSafeDataRefresh()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | null>(null)
  const [pageSize, setPageSize] = useState(16)
  const [form, setForm] = useState<SpecialtyFormState>(INITIAL_FORM)
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
        if (mounted) setError(e?.message || t("Falha ao carregar especialidades.", "Failed to load specialties."))
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
    const pricedRows = data.filter((row) => row?.base_price !== null && row?.base_price !== undefined && row?.base_price !== "")
    return {
      total: data.length,
      active: activeRows.length,
      inactive: data.length - activeRows.length,
      priced: pricedRows.length,
    }
  }, [data])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return data.filter((row) => {
      if (statusFilter === "active" && !isActive(row)) return false
      if (statusFilter === "inactive" && isActive(row)) return false
      if (!query) return true
      const haystack = [row?.name, row?.description, row?.custom_id, row?.sector, row?.sector_display, row?.base_price, row?.vat_percentage]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ")
      return haystack.includes(query)
    })
  }, [data, search, statusFilter])

  const visible = useMemo(() => filtered.slice(0, pageSize), [filtered, pageSize])

  const pricePreview = useMemo(() => {
    const base = Number(form.base_price)
    const vat = Number(form.vat_percentage)
    if (!Number.isFinite(base)) return null
    const safeVat = Number.isFinite(vat) ? vat : 0
    return base * (1 + safeVat / 100)
  }, [form.base_price, form.vat_percentage])

  function rowHref(row: Row): string {
    return buildRecordDetailHref(ROUTE_BASE, row) ?? `${ROUTE_BASE}/${row.id}`
  }

  async function createSpecialty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const name = form.name.trim()
    if (!name) {
      setFormError(t("Informe o nome da especialidade.", "Provide the specialty name."))
      return
    }

    const basePrice = form.base_price.trim()
    const vat = form.vat_percentage.trim()

    if (basePrice && !Number.isFinite(Number(basePrice))) {
      setFormError(t("Preço base inválido.", "Invalid base price."))
      return
    }

    if (vat && !Number.isFinite(Number(vat))) {
      setFormError(t("IVA inválido.", "Invalid VAT."))
      return
    }

    setSaving(true)
    try {
      await apiFetch(ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          name,
          description: form.description.trim(),
          sector: form.sector,
          base_price: basePrice || undefined,
          vat_percentage: vat || undefined,
          active: form.active,
        }),
      })
      setForm(INITIAL_FORM)
      setFormOpen(false)
      void refreshNow("mutation")
    } catch (e: any) {
      setFormError(e?.message || t("Falha ao criar especialidade.", "Failed to create specialty."))
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) return null

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("consultations")}>
      <div className="space-y-1.5">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-500" />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 pl-4">
            <Link
              href="/consultations"
              className="group inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-white/20 bg-white/40 py-1 pl-1.5 pr-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:border-white/40 hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 transition group-hover:-translate-x-0.5 dark:text-sky-400">
                <ArrowLeft size={14} />
              </span>
              {t("Voltar", "Back")}
            </Link>

            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20">
                <Stethoscope size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">{t("Especialidades", "Specialties")}</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? t("A carregar…", "Loading…") : `${filtered.length} ${t("de", "of")} ${data.length}`}
                </p>
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-3 overflow-hidden rounded-lg border border-white/25 bg-white/40 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
              {[
                { key: "all", label: t("Total", "Total"), count: stats.total, bar: "bg-sky-500", active: statusFilter === null },
                { key: "active", label: t("Ativas", "Active"), count: stats.active, bar: "bg-emerald-500", active: statusFilter === "active" },
                { key: "inactive", label: t("Inativas", "Inactive"), count: stats.inactive, bar: "bg-amber-500", active: statusFilter === "inactive" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key === "all" ? null : (item.key as "active" | "inactive"))}
                  className={`relative min-w-[5rem] px-3 py-1.5 text-left transition hover:bg-white/35 dark:hover:bg-white/[0.06] ${item.active ? "bg-white/45 dark:bg-white/[0.08]" : ""}`}
                >
                  <span className={`absolute left-0 top-0 h-full w-0.5 ${item.bar}`} />
                  <span className="block pl-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</span>
                  <span className="block pl-1 text-base font-bold leading-tight text-foreground tabular-nums">{item.count}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setFormError(null)
                setFormOpen(true)
              }}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-semibold text-white shadow-md shadow-emerald-500/25 transition hover:from-emerald-700 hover:to-teal-700"
            >
              <Plus size={14} />
              {t("Nova especialidade", "New specialty")}
            </button>

            <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-sm">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Nome, descrição, preço ou IVA…", "Name, description, price or VAT…")}
                className="w-full rounded-lg border border-white/30 bg-white/50 py-1.5 pl-8 pr-7 text-xs text-foreground shadow-sm backdrop-blur-sm transition placeholder:text-muted-foreground hover:border-sky-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25 dark:border-white/10 dark:bg-white/10"
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
              { key: "active" as const, label: t("Ativas", "Active"), count: stats.active, cls: ACTIVE_BADGE },
              { key: "inactive" as const, label: t("Inativas", "Inactive"), count: stats.inactive, cls: INACTIVE_BADGE },
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

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : null}

        {loading ? (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, index) => (
              <div key={index} className={`h-36 animate-pulse ${GLASS}`} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className={`${GLASS} flex flex-col items-center justify-center gap-2 px-4 py-14 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Tag size={24} />
            </span>
            <p className="text-sm font-semibold text-foreground">{t("Nenhuma especialidade encontrada", "No specialties found")}</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {data.length === 0
                ? t("Ainda não há especialidades registadas.", "No specialties recorded yet.")
                : t("Nenhum resultado corresponde aos filtros aplicados.", "No results match the applied filters.")}
            </p>
          </div>
        ) : (
          <>
            <div id="specialties-grid" className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((row) => (
                <SpecialtyCard key={row.id} row={row} href={rowHref(row)} t={t} />
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
          <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-violet-500/15 shadow-2xl backdrop-blur-xl dark:border-white/10">
            <span className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-emerald-500 via-cyan-500 to-violet-500" />
            <div className="flex items-center justify-between gap-2 border-b border-white/20 px-3 py-2.5 pl-4 dark:border-white/10">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                  <Clipboard size={14} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-foreground">{t("Nova especialidade", "New specialty")}</h2>
                  <p className="text-[11px] text-muted-foreground">{t("Cadastro rápido do catálogo.", "Quick catalog entry.")}</p>
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
              <form onSubmit={createSpecialty} className="space-y-1.5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Nome", "Name")}</span>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder={t("Ex.: Cardiologia", "E.g. Cardiology")}
                      className="w-full rounded-lg border border-white/30 bg-white/55 px-2.5 py-1.5 text-xs text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/10"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Preço base", "Base price")}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.base_price}
                      onChange={(e) => setForm((prev) => ({ ...prev, base_price: e.target.value }))}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-white/30 bg-white/55 px-2.5 py-1.5 text-xs text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/10"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Sector", "Sector")}</span>
                    <select
                      value={form.sector}
                      onChange={(e) => setForm((prev) => ({ ...prev, sector: e.target.value }))}
                      className="w-full rounded-lg border border-white/30 bg-white/55 px-2.5 py-1.5 text-xs text-foreground shadow-sm outline-none transition hover:border-sky-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-white/10"
                    >
                      {SECTOR_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("IVA (%)", "VAT (%)")}</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.vat_percentage}
                      onChange={(e) => setForm((prev) => ({ ...prev, vat_percentage: e.target.value }))}
                      placeholder="16"
                      className="w-full rounded-lg border border-white/30 bg-white/55 px-2.5 py-1.5 text-xs text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground hover:border-cyan-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-white/10"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Estado", "Status")}</span>
                    <div className="flex min-h-[34px] items-center justify-between rounded-lg border border-white/30 bg-white/55 px-2.5 py-1.5 text-[11px] text-foreground shadow-sm dark:border-white/10 dark:bg-white/10">
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 size={14} className={form.active ? "text-emerald-500" : "text-slate-400"} />
                        {form.active ? t("Ativa", "Active") : t("Inativa", "Inactive")}
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
                    placeholder={t("Descrição curta da especialidade.", "Short specialty description.")}
                    className="w-full rounded-lg border border-white/30 bg-white/55 px-2.5 py-1.5 text-xs text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground hover:border-violet-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-white/10"
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/25 bg-white/35 px-2.5 py-1.5 text-[10px] text-foreground dark:border-white/10 dark:bg-white/[0.04]">
                  <span className="inline-flex items-center gap-1.5">
                    <Coins size={12} className="text-emerald-600 dark:text-emerald-300" />
                    {t("Final", "Final")}: <strong>{pricePreview !== null ? <MoneyValue value={pricePreview} /> : "—"}</strong>
                  </span>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 via-cyan-600 to-violet-600 px-3 text-[11px] font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
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
