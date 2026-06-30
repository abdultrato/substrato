"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Building2, Calendar, Loader2, PackageCheck, Plus, Search, User, X } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import useDebounce from "@/hooks/useDebounce"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { ApiListMeta, apiFetchList } from "@/lib/api"
import {
  MATERIAL_REQUISITION_PAGE_GROUPS,
  canCreateMaterialRequisition,
  isMaterialRequisitionPharmacyUser,
  materialRequisitionSectorLabel,
} from "@/lib/material-requisition-rbac"

type TabKey = "PEN" | "PAR" | "FUL" | "HLD" | "ALL"

const TABS: { key: TabKey; label: string; dot: string; statuses: string[] }[] = [
  { key: "PEN", label: "Pendentes",            dot: "bg-amber-400",   statuses: ["PEN"] },
  { key: "PAR", label: "Parcialmente aviadas", dot: "bg-blue-400",    statuses: ["PAR"] },
  { key: "FUL", label: "Aviadas",              dot: "bg-emerald-400", statuses: ["FUL"] },
  { key: "HLD", label: "Arquivadas",           dot: "bg-slate-400",   statuses: ["HLD"] },
  { key: "ALL", label: "Todas",                dot: "bg-violet-400",  statuses: ["PEN","PAR","FUL","HLD"] },
]

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const STATUS: Record<string, { label: string; badge: string; dot: string }> = {
  PEN: { label: "Pendente", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300", dot: "bg-amber-400" },
  PAR: { label: "Parcial", badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300", dot: "bg-blue-400" },
  FUL: { label: "Aviada", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300", dot: "bg-emerald-400" },
  HLD: { label: "Arquivada", badge: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-400", dot: "bg-slate-400" },
}

type MaterialRequisition = {
  id: number
  custom_id?: string
  created_at?: string
  status?: string
  sector?: string
  sector_label?: string
  source?: string
  source_label?: string
  requested_by_department?: string
  created_by_name?: string
}

type ListResponse = { items: MaterialRequisition[]; meta: ApiListMeta; raw: any }

function formatDt(v?: string) {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function EmptyState({ search, tabLabel }: { search?: string; tabLabel?: string }) {
  return (
    <section className={`relative overflow-hidden ${GLASS}`}>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
          <PackageCheck size={22} />
        </span>
        <p className="text-sm font-medium text-foreground">
          {search ? "Nenhum resultado para a pesquisa" : `Sem requisições${tabLabel ? ` ${tabLabel.toLowerCase()}` : ""}`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {search ? "Tente outros termos." : "As requisições aparecerão aqui quando criadas."}
        </p>
      </div>
    </section>
  )
}

function ReqCard({ r }: { r: MaterialRequisition }) {
  const st = STATUS[r.status ?? ""] ?? STATUS.PEN
  const source = r.source_label || (r.source === "WHS" ? "Armazém central" : "Farmácia")
  return (
    <Link href={`/pharmacy/material-requests/${r.id}`}
      className={`group relative block ${GLASS} transition hover:border-violet-500/30 hover:shadow-md`}>
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${st.dot}`} />
      <div className="px-4 py-3 pl-5">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <PackageCheck size={13} />
            </span>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-violet-500 transition truncate max-w-[120px]">
                {r.custom_id || `REQ-${r.id}`}
              </p>
              <p className="text-[10px] text-muted-foreground">ID {r.id}</p>
            </div>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${st.badge}`}>
            {st.label}
          </span>
        </div>
        <div className="space-y-0.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <User size={10} className="shrink-0" />
            <span className="truncate">{r.created_by_name || "—"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 size={10} className="shrink-0" />
            <span className="truncate">{r.sector_label || materialRequisitionSectorLabel(r.sector)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={10} className="shrink-0" />
            <span>{formatDt(r.created_at)}</span>
          </div>
          <div className="text-[10px] text-muted-foreground/70">{source}</div>
        </div>
      </div>
    </Link>
  )
}

export default function RequisicoesMateriaisPage() {
  useAuthGuard()
  const { user } = useAuth()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const isPharmacy = isMaterialRequisitionPharmacyUser(user)
  const canCreate = canCreateMaterialRequisition(user)
  const requiredGroups = useMemo(() => [...MATERIAL_REQUISITION_PAGE_GROUPS], [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allItems, setAllItems] = useState<MaterialRequisition[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>("PEN")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true); setError(null)
        const params = new URLSearchParams()
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())
        const url = `/pharmacy/material_requisition/${params.toString() ? `?${params}` : ""}`
        const res = await apiFetchList<MaterialRequisition>(url, { page: 1, pageSize: 500, clientPaginate: true, clientCache: safeRefreshToken === 0 })
        if (!mounted) return
        setAllItems(res.items ?? [])
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || "Falha ao carregar requisições.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [debouncedSearch, safeRefreshToken])

  // Count per status for tab badges
  const counts = useMemo(() => {
    const c: Record<string, number> = { PEN: 0, PAR: 0, FUL: 0, HLD: 0 }
    for (const r of allItems) if (r.status && r.status in c) c[r.status]++
    return c
  }, [allItems])

  const tabItems = useMemo(() => {
    const tab = TABS.find(t => t.key === activeTab)!
    return allItems.filter(r => tab.statuses.includes(r.status ?? ""))
  }, [allItems, activeTab])

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="w-full space-y-3 px-1">

        {/* ── Cabeçalho ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20">
                <PackageCheck size={17} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Requisições de materiais</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? "A carregar…" : `${allItems.length} ${allItems.length !== 1 ? "requisições" : "requisição"} no total`}
                </p>
              </div>
            </div>
            {canCreate && (
              <Link href="/pharmacy/material-requests/new"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-br from-violet-600 to-purple-600 px-4 text-sm font-semibold text-white shadow-sm shadow-violet-500/20 transition hover:opacity-90">
                <Plus size={15} /> Nova requisição
              </Link>
            )}
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {/* ── Pesquisa ── */}
        <section className={`relative ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-slate-400" />
          <div className="px-4 py-3 pl-5">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Pesquisar por código, paciente, produto, solicitante…"
                className="w-full rounded-lg border border-border bg-background/60 py-2 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition"
                value={search} onChange={e => setSearch(e.target.value)} />
              {search && (
                <button type="button" onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── Tabs de segregação ── */}
        <div className="flex flex-wrap gap-2">
          {TABS.map(tab => {
            const count = tab.key === "ALL" ? allItems.length : (counts[tab.key] ?? 0)
            const active = activeTab === tab.key
            return (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "border-violet-500/40 bg-violet-500/15 text-violet-700 shadow-sm dark:text-violet-300"
                    : "border-white/20 bg-white/10 text-muted-foreground hover:bg-white/20 hover:text-foreground"
                }`}>
                <span className={`h-2 w-2 rounded-full ${tab.dot}`} />
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  active ? "bg-violet-500/20 text-violet-700 dark:text-violet-200" : "bg-white/10 text-muted-foreground"
                }`}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* ── Cards ── */}
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : activeTab === "ALL" ? (
          /* Vista "Todas" — secções separadas por estado */
          <div className="space-y-4">
            {TABS.filter(t => t.key !== "ALL").map(tab => {
              const group = allItems.filter(r => tab.statuses.includes(r.status ?? ""))
              if (!group.length) return null
              return (
                <div key={tab.key}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${tab.dot}`} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {tab.label} — {group.length}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                    {group.map(r => <ReqCard key={r.id} r={r} />)}
                  </div>
                </div>
              )
            })}
            {allItems.length === 0 && (
              <EmptyState search={search} />
            )}
          </div>
        ) : tabItems.length === 0 ? (
          <EmptyState search={search} tabLabel={TABS.find(t => t.key === activeTab)?.label} />
        ) : (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {tabItems.map(r => <ReqCard key={r.id} r={r} />)}
          </div>
        )}

      </div>
    </AppLayout>
  )
}
