"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  DoorOpen,
  Lock,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
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

const ENDPOINT = "/surgery/centro_cirurgico/"
const ROUTE_BASE = "/surgery/operating-rooms"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const STATUSES: Record<string, { label: string; labelEn: string; bar: string; dot: string; badge: string }> = {
  AVAILABLE:   { label: "Disponível",  labelEn: "Available",   bar: "bg-emerald-500", dot: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400" },
  RESERVED:    { label: "Reservada",   labelEn: "Reserved",    bar: "bg-sky-500",     dot: "bg-sky-500",     badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-400" },
  OCCUPIED:    { label: "Ocupada",     labelEn: "Occupied",    bar: "bg-amber-500",   dot: "bg-amber-500",   badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400" },
  IN_USE:      { label: "Em uso",      labelEn: "In use",      bar: "bg-orange-500",  dot: "bg-orange-500",  badge: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/30 dark:bg-orange-900/20 dark:text-orange-400" },
  CLEANING:    { label: "Em limpeza",  labelEn: "Cleaning",    bar: "bg-cyan-500",    dot: "bg-cyan-500",    badge: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-700/30 dark:bg-cyan-900/20 dark:text-cyan-400" },
  MAINTENANCE: { label: "Manutenção",  labelEn: "Maintenance", bar: "bg-violet-500",  dot: "bg-violet-500",  badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-400" },
  BLOCKED:     { label: "Bloqueada",   labelEn: "Blocked",     bar: "bg-rose-500",    dot: "bg-rose-500",    badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-400" },
  INACTIVE:    { label: "Inativa",     labelEn: "Inactive",    bar: "bg-slate-400",   dot: "bg-slate-400",   badge: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/40 dark:bg-slate-800/40 dark:text-slate-300" },
}

const ROOM_TYPES: Record<string, { label: string; labelEn: string }> = {
  GENERAL:        { label: "Geral", labelEn: "General" },
  MINOR:          { label: "Pequena cirurgia", labelEn: "Minor" },
  OPERATING_ROOM: { label: "Sala operatória", labelEn: "Operating room" },
  MAJOR:          { label: "Grande cirurgia", labelEn: "Major" },
  ENDOSCOPY:      { label: "Endoscopia", labelEn: "Endoscopy" },
  DELIVERY_OR:    { label: "Bloco de parto", labelEn: "Delivery" },
  OBSTETRIC:      { label: "Obstétrica", labelEn: "Obstetric" },
  EMERGENCY_OR:   { label: "Urgência", labelEn: "Emergency" },
  HYBRID:         { label: "Híbrida", labelEn: "Hybrid" },
  OTHER:          { label: "Outra", labelEn: "Other" },
}

function statusOf(row: Row): string {
  return String(row?.status || "").toUpperCase()
}

function RoomCard({ row, href, t }: { row: Row; href: string; t: (pt: string, en: string) => string }) {
  const st = STATUSES[statusOf(row)] || STATUSES.INACTIVE
  const type = ROOM_TYPES[String(row?.room_type || "").toUpperCase()]
  const capacity = Number(row?.capacity) || 0
  const sterile = Boolean(row?.sterile)
  const blocked = statusOf(row) === "BLOCKED"
  const live = ["IN_USE", "OCCUPIED"].includes(statusOf(row))

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden ${GLASS} p-3 pl-4 transition hover:-translate-y-px hover:border-white/40 hover:shadow-md`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${st.bar}`} />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <DoorOpen size={15} className="shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-bold text-foreground">{row?.name || row?.code || `#${row?.id}`}</span>
          </div>
          {row?.code ? <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{row.code}</div> : null}
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.badge}`}>
          <span className="relative flex h-1.5 w-1.5">
            {live ? <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${st.dot} opacity-60`} /> : null}
            <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${st.dot}`} />
          </span>
          {t(st.label, st.labelEn)}
        </span>
      </div>

      {type ? (
        <span className="mt-2 inline-flex rounded-full bg-teal-500/12 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:text-teal-300">
          {t(type.label, type.labelEn)}
        </span>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        {row?.location ? (
          <span className="inline-flex items-center gap-1"><MapPin size={11} /> {row.location}</span>
        ) : null}
        {capacity > 0 ? (
          <span className="inline-flex items-center gap-1"><Users size={11} /> {capacity}</span>
        ) : null}
        {sterile ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><ShieldCheck size={11} /> {t("Estéril", "Sterile")}</span>
        ) : null}
        {row?.cleaning_class ? (
          <span className="inline-flex items-center gap-1"><Sparkles size={11} /> {row.cleaning_class}</span>
        ) : null}
      </div>

      {blocked && row?.blocked_reason ? (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-800 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
          <Lock size={11} className="mt-px shrink-0" />
          <span className="line-clamp-2">{row.blocked_reason}</span>
        </div>
      ) : null}
    </Link>
  )
}

export default function SurgeryOperatingRoomsListPage() {
  const { loading: authLoading } = useAuthGuard()
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
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
        if (mounted) setError(e?.message || t("Falha ao carregar salas.", "Failed to load rooms."))
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

  // Só mostra chips de tipos que existem nos dados, para não poluir.
  const presentTypes = useMemo(() => {
    const set = new Set(data.map((r) => String(r?.room_type || "").toUpperCase()).filter(Boolean))
    return Object.keys(ROOM_TYPES).filter((k) => set.has(k))
  }, [data])

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return data.filter((r) => {
      if (statusFilter && statusOf(r) !== statusFilter) return false
      if (typeFilter && String(r?.room_type || "").toUpperCase() !== typeFilter) return false
      if (!q) return true
      const st = STATUSES[statusOf(r)]
      const ty = ROOM_TYPES[String(r?.room_type || "").toUpperCase()]
      const haystack = [
        r?.name, r?.code, r?.location, r?.notes, r?.equipment_notes, r?.cleaning_class,
        st ? t(st.label, st.labelEn) : "", ty ? t(ty.label, ty.labelEn) : "",
      ].map((v) => String(v ?? "").toLowerCase()).join(" ")
      return haystack.includes(q)
    })
  }, [data, debouncedSearch, statusFilter, typeFilter, t])

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
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/20">
                <DoorOpen size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">{t("Salas operatórias", "Operating rooms")}</h1>
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
                placeholder={t("Sala, código, localização, tipo…", "Room, code, location, type…")}
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

          {/* Filtros de estado + tipo */}
          <div className="flex flex-wrap items-center gap-1 border-t border-white/20 px-3 py-1.5 pl-4 dark:border-white/10">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Estado", "Status")}</span>
            {Object.entries(STATUSES).map(([code, s]) => {
              const active = statusFilter === code
              const n = stats[code] || 0
              if (n === 0 && !active) return null
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setStatusFilter(active ? null : code)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${active ? s.badge + " ring-2 ring-current/20" : "border-transparent text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {t(s.label, s.labelEn)}
                  <span className="rounded-full bg-black/5 px-1 tabular-nums dark:bg-white/10">{n}</span>
                </button>
              )
            })}
            {presentTypes.length ? (
              <>
                <span className="mx-1 h-3 w-px bg-black/10 dark:bg-white/15" />
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Tipo", "Type")}</span>
                {presentTypes.map((code) => {
                  const ty = ROOM_TYPES[code]
                  const active = typeFilter === code
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setTypeFilter(active ? null : code)}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${active ? "bg-teal-500/15 text-teal-700 ring-2 ring-teal-500/20 dark:text-teal-300" : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"}`}
                    >
                      {t(ty.label, ty.labelEn)}
                    </button>
                  )
                })}
              </>
            ) : null}
            {(statusFilter || typeFilter || search) ? (
              <button
                type="button"
                onClick={() => { setStatusFilter(null); setTypeFilter(null); setSearch("") }}
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

        {/* ── Grelha ── */}
        {loading ? (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`h-32 animate-pulse ${GLASS}`} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className={`${GLASS} flex flex-col items-center justify-center gap-2 px-4 py-14 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <DoorOpen size={24} />
            </span>
            <p className="text-sm font-semibold text-foreground">{t("Nenhuma sala encontrada", "No rooms found")}</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {data.length === 0
                ? t("Ainda não há salas operatórias registadas.", "No operating rooms recorded yet.")
                : t("Nenhum resultado corresponde aos filtros aplicados.", "No results match the applied filters.")}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((row) => (
                <RoomCard key={row.id} row={row} href={rowHref(row)} t={t} />
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
