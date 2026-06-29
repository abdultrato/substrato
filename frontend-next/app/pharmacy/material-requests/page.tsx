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

  const [page, setPage] = useState(1)
  const pageSize = 20
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ListResponse | null>(null)
  const [onlyPending, setOnlyPending] = useState(true)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => { setPage(1) }, [debouncedSearch])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true); setError(null)
        const params = new URLSearchParams()
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())
        const url = `/pharmacy/material_requisition/${params.toString() ? `?${params}` : ""}`
        const res = await apiFetchList<MaterialRequisition>(url, { page, pageSize, clientPaginate: true, clientCache: safeRefreshToken === 0 })
        if (!mounted) return
        setData(res)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || "Falha ao carregar requisições.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [debouncedSearch, page, safeRefreshToken])

  const items = useMemo(() => {
    const raw = data?.items ?? []
    if (!isPharmacy || !onlyPending) return raw
    return raw.filter(x => x.status === "PEN" || x.status === "PAR")
  }, [data?.items, isPharmacy, onlyPending])

  const totalItems = data?.meta.total ?? items.length
  const totalPages = data?.meta.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize))

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
                  {loading ? "A carregar…" : `${totalItems} ${totalItems !== 1 ? "requisições" : "requisição"}`}
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

        {/* ── Filtros ── */}
        <section className={`relative ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-slate-400" />
          <div className="flex flex-wrap items-end gap-3 px-4 py-3 pl-5">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pesquisar</label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Código, solicitante, setor…"
                  className="w-full rounded-lg border border-border bg-background/60 py-2 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition"
                  value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                {search && (
                  <button type="button" onClick={() => { setSearch(""); setPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
            {isPharmacy && (
              <button type="button" onClick={() => setOnlyPending(p => !p)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition ${
                  onlyPending
                    ? "border-violet-500/40 bg-violet-500/15 text-violet-600 dark:text-violet-300"
                    : "border-white/20 bg-white/10 text-muted-foreground hover:bg-white/20 hover:text-foreground"
                }`}>
                <span className={`h-2 w-2 rounded-full ${onlyPending ? "bg-amber-400" : "bg-muted-foreground/40"}`} />
                Pendentes / parciais
              </button>
            )}
          </div>
        </section>

        {/* ── Cards ── */}
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <section className={`relative overflow-hidden ${GLASS}`}>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                <PackageCheck size={22} />
              </span>
              <p className="text-sm font-medium text-foreground">Nenhuma requisição encontrada</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {search || onlyPending ? "Tente ajustar os filtros." : "Crie a primeira requisição."}
              </p>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {items.map(r => <ReqCard key={r.id} r={r} />)}
          </div>
        )}

        {/* ── Paginação ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-1">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="inline-flex h-8 items-center rounded-md border border-white/20 bg-white/10 px-3 text-xs font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-40">
              ← Anterior
            </button>
            <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="inline-flex h-8 items-center rounded-md border border-white/20 bg-white/10 px-3 text-xs font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-40">
              Seguinte →
            </button>
          </div>
        )}

      </div>
    </AppLayout>
  )
}
