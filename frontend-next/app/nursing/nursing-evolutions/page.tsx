"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Activity,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  MapPin,
  Plus,
  Search,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageSizeInput from "@/components/ui/PageSizeInput"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { formatCount } from "@/lib/i18n/plural"
import { GROUPS } from "@/lib/rbac"

type NursingEvolution = {
  id: number
  custom_id?: string | null
  name?: string | null
  patient?: number | null
  patient_name?: string | null
  ward_name?: string | null
  observation?: string | null
  evolution_date?: string | null
  created_at?: string | null
}

const DEFAULT_PAGE_SIZE = 50

function formatDate(value?: string | null) {
  if (!value) return "Sem data"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

export default function NursingNursingEvolutionsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [evolutions, setEvolutions] = useState<NursingEvolution[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  useEffect(() => setPage(1), [debouncedSearch, pageSize])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query: Record<string, string | number> = {
        page,
        page_size: pageSize,
        ordering: "-evolution_date",
      }
      if (debouncedSearch) query.search = debouncedSearch

      const response = await apiFetchList<NursingEvolution>("/nursing/nursing_evolution/", {
        page,
        pageSize,
        query,
        clientPaginate: true,
        clientCache: safeRefreshToken === 0,
        clientCacheTtlMs: 20000,
      })
      setEvolutions(response.items || [])
      setTotal(response.meta.total ?? response.items.length)
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível carregar as evoluções de enfermagem.")
      setEvolutions([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, page, pageSize, safeRefreshToken])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-1.5">
        <section className="relative overflow-hidden rounded-xl border border-emerald-200/30 bg-gradient-to-br from-emerald-100/[0.07] via-white/[0.02] to-teal-100/[0.04] shadow-lg shadow-slate-900/5 backdrop-blur-2xl dark:border-emerald-800/20 dark:from-emerald-950/[0.06] dark:via-white/[0.015] dark:to-teal-950/[0.04]">
          <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-1 px-3 py-2 pl-4">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-500/25">
                <Activity size={14} />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold leading-tight text-foreground">Evoluções de enfermagem</h1>
                <p className="truncate text-[10px] text-muted-foreground">
                  {loading ? "A carregar…" : formatCount(total, { one: "evolução encontrada", other: "evoluções encontradas" })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <div className="relative">
                <Search size={11} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar…"
                  className="h-8 w-36 rounded-lg border border-border bg-background/60 pl-6 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:w-52 focus:ring-2 focus:ring-violet-500/40 transition-all"
                />
              </div>
              <label className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/30 bg-white/[0.05] px-2 text-[10px] font-medium text-muted-foreground backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.025]">
                Mostrar
                <PageSizeInput value={pageSize} onChange={setPageSize} ariaLabel="Número de evoluções por página, de 1 a 999" />
                /pág
              </label>
              {search && (
                <button type="button" onClick={() => setSearch("")} className="inline-flex h-8 items-center rounded-lg border border-white/30 bg-white/[0.05] px-2 text-xs font-medium text-foreground backdrop-blur-xl transition hover:bg-white/10 dark:border-white/10 dark:bg-white/[0.025]">
                  Limpar
                </button>
              )}
            </div>

            <Link
              href="/nursing/nursing-evolutions/new"
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-2.5 text-xs font-semibold text-white shadow-sm shadow-emerald-500/25 transition hover:from-emerald-700 hover:to-teal-700"
            >
              <Plus size={12} /> Nova evolução
            </Link>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200/60 bg-red-50/30 px-4 py-3 text-sm text-red-800 backdrop-blur-xl dark:border-red-800/40 dark:bg-red-950/15 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> A carregar evoluções…
          </div>
        ) : evolutions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/25 bg-white/[0.02] py-12 text-center backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.01]">
            <FileText size={24} className="text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">Nenhuma evolução encontrada</p>
            <p className="text-xs text-muted-foreground">Altere a pesquisa ou registe uma nova evolução.</p>
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {evolutions.map((evolution) => (
              <Link
                key={evolution.id}
                href={`/nursing/nursing-evolutions/${evolution.id}`}
                className="group relative min-h-[118px] overflow-hidden rounded-xl border border-white/25 bg-white/[0.025] shadow-sm shadow-slate-900/5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-emerald-300/60 hover:bg-white/[0.05] hover:shadow-md dark:border-white/[0.08] dark:bg-white/[0.015] dark:hover:bg-white/[0.035]"
              >
                <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-500" />
                <div className="flex h-full flex-col gap-1.5 p-2.5 pl-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[8px] font-semibold tracking-wider text-muted-foreground">
                        {evolution.custom_id || `EVO-${evolution.id}`}
                      </p>
                      <h2 className="truncate text-xs font-semibold text-foreground">
                        {evolution.name || evolution.patient_name || "Evolução de enfermagem"}
                      </h2>
                    </div>
                    <ChevronRight size={13} className="mt-1 shrink-0 text-muted-foreground/40 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                  </div>

                  <div className="grid gap-0.5 text-[9px] text-muted-foreground">
                    <p className="flex min-w-0 items-center gap-1">
                      <User size={9} className="shrink-0" />
                      <span className="truncate">{evolution.patient_name || `Paciente #${evolution.patient || "—"}`}</span>
                    </p>
                    <p className="flex min-w-0 items-center gap-1">
                      <MapPin size={9} className="shrink-0" />
                      <span className="truncate">{evolution.ward_name || "Sem enfermaria"}</span>
                    </p>
                  </div>

                  {evolution.observation ? (
                    <p className="line-clamp-2 text-[9px] leading-relaxed text-foreground-2">{evolution.observation}</p>
                  ) : null}

                  <p className="mt-auto flex items-center gap-1 border-t border-white/15 pt-1 text-[8px] text-muted-foreground dark:border-white/[0.05]">
                    <Clock3 size={8} /> {formatDate(evolution.evolution_date || evolution.created_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[10px] text-muted-foreground">Página {page} de {totalPages} · {total} evoluções</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="h-7 rounded-lg border border-white/25 bg-white/[0.03] px-3 text-[10px] text-foreground backdrop-blur-xl transition hover:bg-white/[0.07] disabled:opacity-40 dark:border-white/[0.08]">
                ← Anterior
              </button>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="h-7 rounded-lg border border-white/25 bg-white/[0.03] px-3 text-[10px] text-foreground backdrop-blur-xl transition hover:bg-white/[0.07] disabled:opacity-40 dark:border-white/[0.08]">
                Seguinte →
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
