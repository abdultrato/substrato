"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Clock3,
  Edit3,
  Plus,
  Search,
  Stethoscope,
  UserCheck,
  Users,
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

const ENDPOINT = "/surgery/equipa_cirurgica/"
const ROUTE_BASE = "/surgery/teams"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const ROLES: Record<string, { label: string; labelEn: string; tone: string; bar: string }> = {
  MAIN_SURGEON: { label: "Cirurgião principal", labelEn: "Main surgeon", tone: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/30 dark:bg-teal-900/20 dark:text-teal-300", bar: "bg-teal-500" },
  SURGEON: { label: "Cirurgião", labelEn: "Surgeon", tone: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-700/30 dark:bg-cyan-900/20 dark:text-cyan-300", bar: "bg-cyan-500" },
  ASSISTANT_SURGEON: { label: "Cirurgião assistente", labelEn: "Assistant surgeon", tone: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300", bar: "bg-sky-500" },
  ASSISTANT: { label: "Assistente", labelEn: "Assistant", tone: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600/40 dark:bg-slate-800/40 dark:text-slate-300", bar: "bg-slate-400" },
  ANESTHETIST: { label: "Anestesista", labelEn: "Anesthetist", tone: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300", bar: "bg-violet-500" },
  SCRUB_NURSE: { label: "Instrumentista", labelEn: "Scrub nurse", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300", bar: "bg-emerald-500" },
  CIRCULATING_NURSE: { label: "Circulante", labelEn: "Circulating nurse", tone: "border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-700/30 dark:bg-lime-900/20 dark:text-lime-300", bar: "bg-lime-500" },
  RECOVERY_NURSE: { label: "Recuperação", labelEn: "Recovery nurse", tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300", bar: "bg-amber-500" },
  ORDERLY: { label: "Maqueiro", labelEn: "Orderly", tone: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/30 dark:bg-orange-900/20 dark:text-orange-300", bar: "bg-orange-500" },
  PERFUSIONIST: { label: "Perfusionista", labelEn: "Perfusionist", tone: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-700/30 dark:bg-fuchsia-900/20 dark:text-fuchsia-300", bar: "bg-fuchsia-500" },
  OTHER: { label: "Outro", labelEn: "Other", tone: "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600/40 dark:bg-zinc-800/40 dark:text-zinc-300", bar: "bg-zinc-400" },
}

function roleOf(row: Row): string {
  return String(row?.role || "OTHER").toUpperCase()
}

function fmtDate(value: any): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

function durationLabel(entryAt: any, exitAt: any): string {
  if (!entryAt || !exitAt) return ""
  const start = new Date(entryAt).getTime()
  const end = new Date(exitAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return ""
  const minutes = Math.round((end - start) / 60000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h}h ${m}min`
  if (h) return `${h}h`
  return `${m}min`
}

function TeamCard({ row, href, t }: { row: Row; href: string; t: (pt: string, en: string) => string }) {
  const role = ROLES[roleOf(row)] || ROLES.OTHER
  const present = Boolean(row?.present)
  const duration = durationLabel(row?.entry_at, row?.exit_at)

  return (
    <article className={`relative overflow-hidden ${GLASS} p-3 pl-4 transition hover:border-white/40 hover:shadow-md`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${role.bar}`} />
      <div className="flex items-start justify-between gap-2">
        <Link href={href} className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Users size={14} className="shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-bold text-foreground">{row?.employee_name || t("Profissional por definir", "Professional not set")}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${role.tone}`}>
              {t(role.label, role.labelEn)}
            </span>
            {row?.lead ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                <BadgeCheck size={10} /> {t("Responsável", "Lead")}
              </span>
            ) : null}
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${present ? "bg-teal-500/12 text-teal-700 dark:text-teal-300" : "bg-rose-500/12 text-rose-700 dark:text-rose-300"}`}>
              <UserCheck size={10} /> {present ? t("Presente", "Present") : t("Ausente", "Absent")}
            </span>
          </div>
        </Link>
        <Link
          href={`${ROUTE_BASE}/${row?.id}/edit`}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/30 bg-white/40 text-muted-foreground transition hover:bg-white/60 hover:text-foreground dark:border-white/10 dark:bg-white/10"
          aria-label={t("Editar membro", "Edit member")}
        >
          <Edit3 size={12} />
        </Link>
      </div>

      <Link href={href} className="mt-2 block">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Stethoscope size={11} />
            <span className="font-mono text-foreground">{row?.surgery_code || `#${row?.surgery || "—"}`}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 size={11} />
            {fmtDate(row?.entry_at)} - {fmtDate(row?.exit_at)}
          </span>
          {duration ? <span className="font-semibold text-foreground">{duration}</span> : null}
        </div>
        {row?.responsibility ? (
          <p className="mt-2 line-clamp-2 rounded-lg bg-black/5 px-2 py-1 text-[10px] text-muted-foreground dark:bg-white/10">
            {row.responsibility}
          </p>
        ) : row?.notes ? (
          <p className="mt-2 line-clamp-2 rounded-lg bg-black/5 px-2 py-1 text-[10px] text-muted-foreground dark:bg-white/10">
            {row.notes}
          </p>
        ) : null}
      </Link>
    </article>
  )
}

export default function SurgeryTeamsListPage() {
  const { loading: authLoading } = useAuthGuard()
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [presenceFilter, setPresenceFilter] = useState<"present" | "absent" | "lead" | null>(null)
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
        if (mounted) setError(e?.message || t("Falha ao carregar equipa cirúrgica.", "Failed to load surgical team."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [safeRefreshToken, t])

  const stats = useMemo(() => {
    const roles: Record<string, number> = {}
    let present = 0
    let lead = 0
    data.forEach((row) => {
      roles[roleOf(row)] = (roles[roleOf(row)] || 0) + 1
      if (row?.present) present += 1
      if (row?.lead) lead += 1
    })
    return { roles, present, lead, total: data.length }
  }, [data])

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return data.filter((row) => {
      if (roleFilter && roleOf(row) !== roleFilter) return false
      if (presenceFilter === "present" && !row?.present) return false
      if (presenceFilter === "absent" && row?.present) return false
      if (presenceFilter === "lead" && !row?.lead) return false
      if (!q) return true
      const role = ROLES[roleOf(row)]
      const haystack = [
        row?.employee_name,
        row?.surgery_code,
        row?.responsibility,
        row?.notes,
        role ? t(role.label, role.labelEn) : "",
      ].map((v) => String(v ?? "").toLowerCase()).join(" ")
      return haystack.includes(q)
    })
  }, [data, debouncedSearch, presenceFilter, roleFilter, t])

  const visible = useMemo(() => filtered.slice(0, pageSize), [filtered, pageSize])

  function rowHref(row: Row): string {
    return buildRecordDetailHref(ROUTE_BASE, row) ?? `${ROUTE_BASE}/${row.id}`
  }

  if (authLoading) return null

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
      <div className="space-y-1.5">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-teal-500" />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 pl-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/20">
                <Users size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">{t("Equipa cirúrgica", "Surgical team")}</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? t("A carregar…", "Loading…") : `${filtered.length} ${t("de", "of")} ${data.length}`}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/15 dark:text-emerald-400">
                {t("Presentes", "Present")} <span className="tabular-nums">{stats.present}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50/80 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:border-teal-700/30 dark:bg-teal-900/15 dark:text-teal-400">
                {t("Responsáveis", "Leads")} <span className="tabular-nums">{stats.lead}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-700/30 dark:bg-slate-900/15 dark:text-slate-400">
                {t("Total", "Total")} <span className="tabular-nums">{stats.total}</span>
              </span>
            </div>

            <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-sm">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Profissional, cirurgia, função, responsabilidade…", "Professional, surgery, role, responsibility…")}
                className="w-full rounded-lg border border-white/30 bg-white/50 py-1.5 pl-8 pr-7 text-xs text-foreground shadow-sm backdrop-blur-sm transition placeholder:text-muted-foreground hover:border-teal-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25 dark:border-white/10 dark:bg-white/10"
              />
              {search ? (
                <button type="button" aria-label={t("Limpar", "Clear")} onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground">
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
            <Link
              href="/surgery"
              className="mr-1 inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted"
            >
              <ArrowLeft size={11} /> {t("Voltar", "Back")}
            </Link>
            <Link
              href={`${ROUTE_BASE}/new`}
              className="mr-2 inline-flex h-7 items-center gap-1.5 rounded-md border border-teal-300 bg-teal-50 px-3 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-100 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300"
            >
              <Plus size={11} /> {t("Adicionar membro", "Add member")}
            </Link>
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Função", "Role")}</span>
            {Object.entries(ROLES).map(([code, role]) => {
              const n = stats.roles[code] || 0
              const active = roleFilter === code
              if (!n && !active) return null
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setRoleFilter(active ? null : code)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${active ? role.tone + " ring-2 ring-current/20" : "border-transparent text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${role.bar}`} />
                  {t(role.label, role.labelEn)}
                  <span className="rounded-full bg-black/5 px-1 tabular-nums dark:bg-white/10">{n}</span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1 border-t border-white/20 px-3 py-1.5 pl-4 dark:border-white/10">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Presença", "Presence")}</span>
            {[
              { key: "present", label: t("Presentes", "Present") },
              { key: "absent", label: t("Ausentes", "Absent") },
              { key: "lead", label: t("Responsáveis", "Leads") },
            ].map((option) => {
              const active = presenceFilter === option.key
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setPresenceFilter(active ? null : option.key as typeof presenceFilter)}
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${active ? "bg-teal-500/15 text-teal-700 ring-2 ring-teal-500/20 dark:text-teal-300" : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"}`}
                >
                  {option.label}
                </button>
              )
            })}
            {(roleFilter || presenceFilter || search) ? (
              <button
                type="button"
                onClick={() => { setRoleFilter(null); setPresenceFilter(null); setSearch("") }}
                className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/40 px-2 py-0.5 text-[10px] font-semibold text-foreground transition hover:bg-white/60 dark:border-white/10 dark:bg-white/10"
              >
                <X size={11} /> {t("Limpar filtros", "Clear filters")}
              </button>
            ) : null}
          </div>
        </section>

        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-300/50 bg-rose-50/60 px-4 py-3 text-sm text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertCircle size={14} /> {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(9)].map((_, index) => (
              <div key={index} className={`h-32 animate-pulse ${GLASS}`} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className={`${GLASS} flex flex-col items-center justify-center gap-2 px-4 py-14 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Users size={24} />
            </span>
            <p className="text-sm font-semibold text-foreground">{t("Nenhum membro encontrado", "No team members found")}</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {data.length === 0
                ? t("Ainda não há equipa cirúrgica registada.", "No surgical team members recorded yet.")
                : t("Nenhum resultado corresponde aos filtros aplicados.", "No results match the applied filters.")}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((row) => (
                <TeamCard key={row.id} row={row} href={rowHref(row)} t={t} />
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
