"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Search,
  ShieldCheck,
  X,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageSizeInput from "@/components/ui/PageSizeInput"
import useAuthGuard from "@/hooks/useAuthGuard"
import useDebounce from "@/hooks/useDebounce"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { buildRecordDetailHref } from "@/lib/resources/recordIdentity"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type Row = Record<string, any>

const ENDPOINT = "/surgery/checklist_seguranca/"
const ROUTE_BASE = "/surgery/safety-checklists"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

// Os 8 itens de verificação de segurança cirúrgica (campos booleanos).
const CHECK_FIELDS: { key: string; label: string; labelEn: string }[] = [
  { key: "patient_identity_confirmed", label: "Identidade confirmada", labelEn: "Identity confirmed" },
  { key: "procedure_confirmed", label: "Procedimento confirmado", labelEn: "Procedure confirmed" },
  { key: "site_marked", label: "Local marcado", labelEn: "Site marked" },
  { key: "consent_confirmed", label: "Consentimento confirmado", labelEn: "Consent confirmed" },
  { key: "anesthesia_safety_checked", label: "Segurança anestésica", labelEn: "Anesthesia safety" },
  { key: "antibiotic_prophylaxis", label: "Profilaxia antibiótica", labelEn: "Antibiotic prophylaxis" },
  { key: "instrument_count_confirmed", label: "Contagem de instrumentos", labelEn: "Instrument count" },
  { key: "specimens_labeled", label: "Amostras identificadas", labelEn: "Specimens labeled" },
]

const PHASES: Record<string, { label: string; labelEn: string; tone: string }> = {
  SIGN_IN: { label: "Antes da indução", labelEn: "Sign in", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  TIME_OUT: { label: "Antes da incisão", labelEn: "Time out", tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  SIGN_OUT: { label: "Antes da saída", labelEn: "Sign out", tone: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
}

const STATUSES: Record<string, { label: string; labelEn: string; bar: string; badge: string }> = {
  PENDING: { label: "Pendente", labelEn: "Pending", bar: "bg-slate-400", badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600/40 dark:bg-slate-800/40 dark:text-slate-300" },
  PARTIALLY_COMPLETED: { label: "Parcial", labelEn: "Partial", bar: "bg-amber-500", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400" },
  COMPLETED: { label: "Concluído", labelEn: "Completed", bar: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400" },
  FAILED: { label: "Falhou", labelEn: "Failed", bar: "bg-rose-500", badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-400" },
  OVERRIDDEN: { label: "Sobrescrito", labelEn: "Overridden", bar: "bg-fuchsia-500", badge: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-700/30 dark:bg-fuchsia-900/20 dark:text-fuchsia-400" },
}

function fmtDate(value: any): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

function statusOf(row: Row): string {
  return String(row?.status || "").toUpperCase()
}

function ChecklistCard({ row, href, t }: { row: Row; href: string; t: (pt: string, en: string) => string }) {
  const st = STATUSES[statusOf(row)] || STATUSES.PENDING
  const phase = PHASES[String(row?.phase || "").toUpperCase()]
  const done = CHECK_FIELDS.filter((f) => Boolean(row?.[f.key])).length
  const total = CHECK_FIELDS.length
  const pct = Math.round((done / total) * 100)
  const overridden = statusOf(row) === "OVERRIDDEN"

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden ${GLASS} p-3 pl-4 transition hover:-translate-y-px hover:border-white/40 hover:shadow-md`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${st.bar}`} />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <ClipboardCheck size={14} className="shrink-0 text-muted-foreground" />
            <span className="truncate font-mono text-xs font-bold text-foreground">{row?.surgery_code || row?.custom_id || `#${row?.id}`}</span>
          </div>
          {phase ? (
            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${phase.tone}`}>
              {t(phase.label, phase.labelEn)}
            </span>
          ) : null}
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.badge}`}>
          {t(st.label, st.labelEn)}
        </span>
      </div>

      {/* Medidor de conclusão dos 8 itens */}
      <div className="mt-2.5">
        <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
          <span>{t("Verificações", "Checks")}</span>
          <span className="tabular-nums text-foreground">{done}/{total}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <div
            className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Pontos por item */}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {CHECK_FIELDS.map((f) => {
            const ok = Boolean(row?.[f.key])
            return (
              <span
                key={f.key}
                title={t(f.label, f.labelEn)}
                className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-black/15 dark:bg-white/20"}`}
              />
            )
          })}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="truncate">
          {row?.completed_by_name ? `${t("Por", "By")} ${row.completed_by_name}` : t("Não preenchido", "Not filled")}
        </span>
        <span className="shrink-0">{fmtDate(row?.completed_at)}</span>
      </div>

      {overridden && row?.override_reason ? (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-2 py-1 text-[10px] text-fuchsia-800 dark:border-fuchsia-700/30 dark:bg-fuchsia-900/20 dark:text-fuchsia-300">
          <AlertTriangle size={11} className="mt-px shrink-0" />
          <span className="line-clamp-2">{row.override_reason}</span>
        </div>
      ) : null}
    </Link>
  )
}

export default function SurgerySafetyChecklistsListPage() {
  const { loading: authLoading } = useAuthGuard()
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [phaseFilter, setPhaseFilter] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(12)
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await apiFetchList<Row>(ENDPOINT, {
          page: 1,
          pageSize: 500,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        })
        if (!mounted) return
        setData(Array.isArray(res?.items) ? res.items : [])
      } catch (e: any) {
        if (mounted) setError(e?.message || t("Falha ao carregar checklists.", "Failed to load checklists."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [safeRefreshToken, t])

  const stats = useMemo(() => {
    const s: Record<string, number> = {}
    data.forEach((r) => { const k = statusOf(r); s[k] = (s[k] || 0) + 1 })
    return s
  }, [data])

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return data.filter((r) => {
      if (statusFilter && statusOf(r) !== statusFilter) return false
      if (phaseFilter && String(r?.phase || "").toUpperCase() !== phaseFilter) return false
      if (!q) return true
      const st = STATUSES[statusOf(r)]
      const ph = PHASES[String(r?.phase || "").toUpperCase()]
      const haystack = [
        r?.surgery_code, r?.custom_id, r?.completed_by_name, r?.notes, r?.override_reason,
        st ? t(st.label, st.labelEn) : "", ph ? t(ph.label, ph.labelEn) : "",
      ].map((v) => String(v ?? "").toLowerCase()).join(" ")
      return haystack.includes(q)
    })
  }, [data, debouncedSearch, statusFilter, phaseFilter, t])

  const visible = useMemo(() => filtered.slice(0, pageSize), [filtered, pageSize])

  function rowHref(row: Row): string {
    return buildRecordDetailHref(ROUTE_BASE, row) ?? `${ROUTE_BASE}/${row.id}`
  }

  if (authLoading) return null

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
      <div className="space-y-1.5">

        {/* ── Cabeçalho totalmente integrado ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-teal-500" />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 pl-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/20">
                <ShieldCheck size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">{t("Checklists de Segurança", "Safety Checklists")}</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? t("A carregar…", "Loading…") : `${filtered.length} ${t("de", "of")} ${data.length}`}
                </p>
              </div>
            </div>

            {/* Motor de busca */}
            <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-sm">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Cirurgia, responsável, notas, estado…", "Surgery, filler, notes, status…")}
                className="w-full rounded-lg border border-white/30 bg-white/50 py-1.5 pl-8 pr-7 text-xs text-foreground shadow-sm backdrop-blur-sm transition placeholder:text-muted-foreground hover:border-teal-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25 dark:border-white/10 dark:bg-white/10"
              />
              {search && (
                <button type="button" aria-label={t("Limpar", "Clear")} onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Itens por página */}
            <div className="flex shrink-0 items-center gap-1" title={t("Itens por página", "Items per page")}>
              <PageSizeInput value={pageSize} onChange={setPageSize} ariaLabel={t("Itens por página", "Items per page")} />
              <span className="text-[11px] text-muted-foreground">/{t("pág", "pg")}</span>
            </div>
          </div>

          {/* Filtros de estado + fase */}
          <div className="flex flex-wrap items-center gap-1 border-t border-white/20 px-3 py-1.5 pl-4 dark:border-white/10">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Estado", "Status")}</span>
            {Object.entries(STATUSES).map(([code, s]) => {
              const active = statusFilter === code
              const n = stats[code] || 0
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setStatusFilter(active ? null : code)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${active ? s.badge + " ring-2 ring-current/20" : "border-transparent text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"}`}
                >
                  {t(s.label, s.labelEn)}
                  <span className="rounded-full bg-black/5 px-1 tabular-nums dark:bg-white/10">{n}</span>
                </button>
              )
            })}
            <span className="mx-1 h-3 w-px bg-black/10 dark:bg-white/15" />
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Fase", "Phase")}</span>
            {Object.entries(PHASES).map(([code, p]) => {
              const active = phaseFilter === code
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setPhaseFilter(active ? null : code)}
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${active ? p.tone + " ring-2 ring-current/20" : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"}`}
                >
                  {t(p.label, p.labelEn)}
                </button>
              )
            })}
            {(statusFilter || phaseFilter || search) ? (
              <button
                type="button"
                onClick={() => { setStatusFilter(null); setPhaseFilter(null); setSearch("") }}
                className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/40 px-2 py-0.5 text-[10px] font-semibold text-foreground transition hover:bg-white/60 dark:border-white/10 dark:bg-white/10"
              >
                <X size={11} /> {t("Limpar filtros", "Clear filters")}
              </button>
            ) : null}
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : null}

        {/* ── Grelha de cartões ── */}
        {loading ? (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`h-36 animate-pulse ${GLASS}`} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className={`${GLASS} flex flex-col items-center justify-center gap-2 px-4 py-14 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <CheckCircle2 size={24} />
            </span>
            <p className="text-sm font-semibold text-foreground">{t("Nenhum checklist encontrado", "No checklists found")}</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {data.length === 0
                ? t("Ainda não há checklists de segurança registados.", "No safety checklists recorded yet.")
                : t("Nenhum resultado corresponde aos filtros aplicados.", "No results match the applied filters.")}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((row) => (
                <ChecklistCard key={row.id} row={row} href={rowHref(row)} t={t} />
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
    </AppLayout>
  )
}
