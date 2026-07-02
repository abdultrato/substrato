"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Search, Stethoscope, User, X } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageSizeInput from "@/components/ui/PageSizeInput"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { abbreviateMiddleNames } from "@/lib/formatName"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type Row = Record<string, any>

const ENDPOINT = "/consultations/doctors/"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

// Paleta estável por médico (cor derivada do id): gradiente do avatar + barra
// lateral com a mesma família de cor.
const AVATAR_TONES: { grad: string; bar: string }[] = [
  { grad: "from-sky-500 to-blue-600", bar: "bg-sky-500" },
  { grad: "from-emerald-500 to-teal-600", bar: "bg-emerald-500" },
  { grad: "from-violet-500 to-purple-600", bar: "bg-violet-500" },
  { grad: "from-amber-500 to-orange-600", bar: "bg-amber-500" },
  { grad: "from-rose-500 to-pink-600", bar: "bg-rose-500" },
  { grad: "from-indigo-500 to-blue-600", bar: "bg-indigo-500" },
  { grad: "from-cyan-500 to-sky-600", bar: "bg-cyan-500" },
  { grad: "from-fuchsia-500 to-pink-600", bar: "bg-fuchsia-500" },
]

function toneFor(id: any): { grad: string; bar: string } {
  const n = Number(id) || String(id).split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_TONES[Math.abs(n) % AVATAR_TONES.length]
}

function DoctorCard({ row, href, t }: { row: Row; href: string; t: (pt: string, en: string) => string }) {
  const name = String(row?.name || `${t("Médico", "Doctor")} ${row?.id}`)
  const initial = name.trim().charAt(0).toUpperCase() || "?"
  const subtitle = row?.role_name || row?.profession_name || ""
  const tone = toneFor(row?.id)
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-2 overflow-hidden ${GLASS} p-2 pl-3 transition hover:-translate-y-px hover:border-white/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${tone.bar}`} />
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${tone.grad} text-sm font-bold text-white shadow-sm`}>
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold leading-tight text-foreground" title={name}>
          {abbreviateMiddleNames(name)}
        </div>
        {subtitle ? (
          <div className="mt-0.5 flex items-center gap-1 truncate text-[10px] leading-tight text-muted-foreground">
            <Stethoscope size={10} className="shrink-0" />
            <span className="truncate">{subtitle}</span>
          </div>
        ) : (
          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{row?.custom_id || `#${row?.id}`}</div>
        )}
      </div>
    </Link>
  )
}

export default function ConsultationsDoctorsListPage() {
  const { loading: authLoading } = useAuthGuard()
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(30)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await apiFetch<any>(ENDPOINT, { clientCache: safeRefreshToken === 0 })
        const items = res && res.results ? res.results : res
        if (mounted) setData(Array.isArray(items) ? items : [])
      } catch (e: any) {
        if (mounted) setError(e?.message || t("Falha ao carregar médicos.", "Failed to load doctors."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [safeRefreshToken, t])

  // Cargos/profissões presentes, para chips de filtro.
  const roles = useMemo(() => {
    const map = new Map<string, number>()
    data.forEach((r) => {
      const k = String(r?.role_name || r?.profession_name || "").trim()
      if (k) map.set(k, (map.get(k) || 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [data])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((r) => {
      const roleKey = String(r?.role_name || r?.profession_name || "").trim()
      if (roleFilter && roleKey !== roleFilter) return false
      if (!q) return true
      const haystack = [r?.name, r?.custom_id, r?.role_name, r?.profession_name]
        .map((v) => String(v ?? "").toLowerCase()).join(" ")
      return haystack.includes(q)
    })
  }, [data, search, roleFilter])

  const visible = useMemo(() => filtered.slice(0, pageSize), [filtered, pageSize])

  if (authLoading) return null

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("consultations")}>
      <div className="space-y-1.5">

        {/* ── Cabeçalho integrado ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-500" />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 pl-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20">
                <User size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">{t("Médicos", "Doctors")}</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? t("A carregar…", "Loading…") : `${filtered.length} ${t("de", "of")} ${data.length}`}
                </p>
              </div>
            </div>

            <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-sm">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Nome, cargo ou profissão…", "Name, role or profession…")}
                className="w-full rounded-lg border border-white/30 bg-white/50 py-1.5 pl-8 pr-7 text-xs text-foreground shadow-sm backdrop-blur-sm transition placeholder:text-muted-foreground hover:border-sky-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25 dark:border-white/10 dark:bg-white/10"
              />
              {search && (
                <button type="button" aria-label={t("Limpar", "Clear")} onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1" title={t("Itens por página", "Items per page")}>
              <PageSizeInput value={pageSize} onChange={setPageSize} ariaLabel={t("Itens por página", "Items per page")} />
              <span className="text-[11px] text-muted-foreground">/{t("pág", "pg")}</span>
            </div>
          </div>

          {roles.length ? (
            <div className="flex flex-wrap items-center gap-1 border-t border-white/20 px-3 py-1.5 pl-4 dark:border-white/10">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Cargo", "Role")}</span>
              {roles.map(([role, n]) => {
                const active = roleFilter === role
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRoleFilter(active ? null : role)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${active ? "border-sky-200 bg-sky-50 text-sky-700 ring-2 ring-sky-500/20 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300" : "border-transparent text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"}`}
                  >
                    {role}
                    <span className="rounded-full bg-black/5 px-1 tabular-nums dark:bg-white/10">{n}</span>
                  </button>
                )
              })}
              {(roleFilter || search) ? (
                <button
                  type="button"
                  onClick={() => { setRoleFilter(null); setSearch("") }}
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/40 px-2 py-0.5 text-[10px] font-semibold text-foreground transition hover:bg-white/60 dark:border-white/10 dark:bg-white/10"
                >
                  <X size={11} /> {t("Limpar", "Clear")}
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : null}

        {/* ── Grelha densa: 2 → 6 cartões por linha ── */}
        {loading ? (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className={`h-14 animate-pulse ${GLASS}`} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className={`${GLASS} flex flex-col items-center justify-center gap-2 px-4 py-14 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <User size={24} />
            </span>
            <p className="text-sm font-semibold text-foreground">{t("Nenhum médico encontrado", "No doctors found")}</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {data.length === 0
                ? t("Ainda não há médicos registados.", "No doctors recorded yet.")
                : t("Nenhum resultado corresponde à pesquisa.", "No results match your search.")}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {visible.map((row) => (
                <DoctorCard key={row.id} row={row} href={`/consultations/doctors/${row.id}`} t={t} />
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
