"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ChevronLeft, Droplets, Loader2, Search } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────

type CollectionRow = {
  id: number
  custom_id?: string
  order_custom_id?: string
  patient_name?: string
  patient_age?: string
  patient_gender?: string
  barcode?: string
  sample_type?: string
  sample_type_display?: string
  container_type?: string
  location?: string
  status?: string
  status_display?: string
  collection_at?: string
  collected_by_name?: string
  notes?: string
}

type ColumnKey = "a_colher" | "colhidas" | "enviadas" | "problemas"
type ActionKey = "colher" | "enviar" | "falhar"

type ColumnConfig = {
  key: ColumnKey
  title: string
  headerCls: string
  badge: string
  leftBar: string
  colBg: string
}

// ─── Column config ────────────────────────────────────────────────────────────

const COLLECTION_COLUMNS: ColumnConfig[] = [
  {
    key: "a_colher",
    title: "A colher",
    headerCls: "text-sky-700 dark:text-sky-300",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
    leftBar: "bg-sky-400",
    colBg: "from-sky-50/60 via-white/50 to-cyan-50/40 border-sky-200/50 dark:from-sky-950/30 dark:via-slate-900/30 dark:to-cyan-950/20 dark:border-sky-800/30",
  },
  {
    key: "colhidas",
    title: "Colhidas",
    headerCls: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    leftBar: "bg-amber-400",
    colBg: "from-amber-50/60 via-white/50 to-yellow-50/40 border-amber-200/50 dark:from-amber-950/30 dark:via-slate-900/30 dark:to-yellow-950/20 dark:border-amber-800/30",
  },
  {
    key: "enviadas",
    title: "Enviadas ao laboratório",
    headerCls: "text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    leftBar: "bg-emerald-400",
    colBg: "from-emerald-50/60 via-white/50 to-teal-50/40 border-emerald-200/50 dark:from-emerald-950/30 dark:via-slate-900/30 dark:to-teal-950/20 dark:border-emerald-800/30",
  },
  {
    key: "problemas",
    title: "Falhas / canceladas",
    headerCls: "text-rose-700 dark:text-rose-300",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
    leftBar: "bg-rose-400",
    colBg: "from-rose-50/60 via-white/50 to-red-50/40 border-rose-200/50 dark:from-rose-950/30 dark:via-slate-900/30 dark:to-red-950/20 dark:border-rose-800/30",
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value?: string) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function genderLabel(value?: string): string {
  const v = (value || "").trim().toLocaleUpperCase()
  if (v.startsWith("M")) return "Masculino"
  if (v.startsWith("F")) return "Feminino"
  return ""
}

function classifyCollection(row: CollectionRow): ColumnKey {
  switch ((row.status || "").trim().toUpperCase()) {
    case "COLHIDA":  return "colhidas"
    case "ENVIADA":  return "enviadas"
    case "FALHADA":
    case "CANCELADA": return "problemas"
    default: return "a_colher"
  }
}

function statusDot(status?: string) {
  switch ((status || "").trim().toUpperCase()) {
    case "ENVIADA":  return "bg-emerald-400"
    case "COLHIDA":  return "bg-amber-400"
    case "FALHADA":
    case "CANCELADA": return "bg-rose-400"
    default: return "bg-sky-400"
  }
}

// ─── Collection Card ──────────────────────────────────────────────────────────

function CollectionCard({
  row,
  busyAction,
  onCollect,
  onSend,
  onFail,
}: {
  row: CollectionRow
  busyAction: ActionKey | null
  onCollect: () => void
  onSend: () => void
  onFail: () => void
}) {
  const router = useRouter()
  const target = `/clinical-laboratory/collections/${row.id}`
  const status = (row.status || "").trim().toUpperCase()
  const canCollect = status === "PENDENTE" || status === "FALHADA"
  const canSend = status === "COLHIDA"
  const canFail = status === "PENDENTE" || status === "COLHIDA"
  const sampleLabel = row.sample_type_display || row.sample_type || "Amostra"
  const meta = [row.patient_age, genderLabel(row.patient_gender)].filter(Boolean).join(" · ")

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(target)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(target) }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-white/50 bg-white/30 shadow-sm backdrop-blur-sm transition hover:border-white/70 hover:bg-white/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.08]"
    >
      {/* ── código + status ── */}
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1.5">
        <div className="min-w-0">
          <p className="truncate font-mono text-[10px] font-bold text-sky-700 dark:text-sky-300">
            {row.barcode || row.custom_id || `#${row.id}`}
          </p>
          {row.order_custom_id && (
            <p className="truncate text-[9px] text-[var(--gray-400)]">
              Pedido {row.order_custom_id}
            </p>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/60 px-1.5 py-0.5 text-[9px] font-medium text-[var(--gray-600)] dark:bg-white/10 dark:text-white">
          <span className={`h-1.5 w-1.5 rounded-full ${statusDot(row.status)}`} />
          {row.status_display || row.status || "Pendente"}
        </span>
      </div>

      {/* ── paciente ── */}
      <div className="border-t border-white/40 px-3 py-2 dark:border-white/10">
        <p className="truncate text-[12px] font-semibold text-foreground leading-snug">
          {row.patient_name || "—"}
        </p>
        {meta && (
          <p className="mt-0.5 text-[10px] text-[var(--gray-500)]">{meta}</p>
        )}
      </div>

      {/* ── amostra + localização ── */}
      <div className="border-t border-white/40 px-3 py-2 dark:border-white/10">
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {sampleLabel}
          </span>
          {row.container_type && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {row.container_type}
            </span>
          )}
          {row.location && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {row.location}
            </span>
          )}
        </div>
      </div>

      {/* ── rodapé: data + botões ── */}
      <div className="flex items-center justify-between gap-2 border-t border-white/40 px-3 py-2 dark:border-white/10">
        <div className="min-w-0 text-[9px] text-[var(--gray-400)]">
          <p className="truncate">Colhida {fmt(row.collection_at)}</p>
          {row.collected_by_name && (
            <p className="truncate">por {row.collected_by_name}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {canFail && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onFail() }}
              disabled={busyAction !== null}
              className="inline-flex h-6 items-center rounded-lg border border-rose-200/60 bg-rose-50/60 px-2 text-[9px] font-semibold text-rose-700 backdrop-blur-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300"
            >
              {busyAction === "falhar" ? <Loader2 size={9} className="animate-spin" /> : "Falhar"}
            </button>
          )}
          {canCollect && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCollect() }}
              disabled={busyAction !== null}
              className="inline-flex h-6 items-center rounded-lg bg-sky-600 px-2.5 text-[9px] font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === "colher" ? <Loader2 size={9} className="animate-spin" /> : "Colher"}
            </button>
          )}
          {canSend && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSend() }}
              disabled={busyAction !== null}
              className="inline-flex h-6 items-center rounded-lg bg-emerald-600 px-2.5 text-[9px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === "enviar" ? <Loader2 size={9} className="animate-spin" /> : "Enviar"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CollectionsBoardPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<CollectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<{ id: number; action: ActionKey } | null>(null)
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (query) params.set("search", query)
      const qs = params.toString()
      const { items } = await apiFetchList<CollectionRow>(
        `/clinical_laboratory/collection/${qs ? `?${qs}` : ""}`,
        { page: 1, pageSize: 200, clientCache: false }
      )
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar colheitas.")
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => { load() }, [load, safeRefreshToken])

  async function runAction(row: CollectionRow, action: ActionKey) {
    setBusy({ id: row.id, action })
    setError(null)
    try {
      await apiFetch(`/clinical_laboratory/collection/${row.id}/${action}/`, { method: "POST" })
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao actualizar o estado da colheita.")
    } finally {
      setBusy(null)
    }
  }

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setQuery(value), 350)
  }

  const buckets = useMemo(() => {
    const grouped: Record<ColumnKey, CollectionRow[]> = {
      a_colher: [], colhidas: [], enviadas: [], problemas: [],
    }
    for (const row of rows) grouped[classifyCollection(row)].push(row)
    return grouped
  }, [rows])

  const total = rows.length

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-4xl space-y-4 px-1 py-1">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden rounded-xl border border-sky-200/50 bg-gradient-to-br from-sky-50/80 via-white/60 to-cyan-50/60 shadow-sm backdrop-blur-sm dark:border-sky-800/30 dark:from-sky-950/30 dark:via-slate-900/40 dark:to-cyan-950/20">
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />
          <div className="px-4 py-3 pl-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Droplets size={15} className="text-sky-500" />
                <div>
                  <h1 className="font-display text-sm font-bold text-foreground leading-tight">
                    Colheitas de amostras
                  </h1>
                  <p className="text-[10px] text-[var(--gray-500)]">
                    {loading
                      ? <><Loader2 size={9} className="inline animate-spin mr-1" />A carregar...</>
                      : total > 0
                        ? `${total} colheita${total !== 1 ? "s" : ""}`
                        : "Sem colheitas"
                    }
                    {query ? ` · "${query}"` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link href="/clinical-laboratory"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/40 bg-white/30 px-2.5 text-[11px] text-[var(--gray-700)] backdrop-blur-sm transition hover:bg-white/50 dark:border-white/10 dark:text-[var(--gray-300)] dark:hover:bg-white/10">
                  <ChevronLeft size={11} /> Voltar
                </Link>
                <div className="flex items-center gap-1.5 rounded-lg border border-white/50 bg-white/50 px-2.5 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06]">
                  <Search size={11} className="shrink-0 text-[var(--gray-400)]" />
                  <input
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Pesquisar paciente, código..."
                    className="w-40 bg-transparent text-[11px] text-[var(--text)] outline-none placeholder-[var(--gray-400)]"
                  />
                  {search && (
                    <button type="button" onClick={() => { setSearch(""); setQuery("") }}
                      className="text-[var(--gray-400)] hover:text-foreground text-[10px]">×</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2.5 text-[12px] text-rose-800 dark:border-rose-800/40 dark:bg-rose-900/15 dark:text-rose-300">
            <AlertCircle size={13} className="shrink-0" /> {error}
          </div>
        )}

        {/* ── Kanban ── */}
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[12px] text-[var(--gray-400)]">
            <Loader2 size={16} className="animate-spin" /> A carregar colheitas...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {COLLECTION_COLUMNS.map((col) => {
              const items = buckets[col.key]
              return (
                <section
                  key={col.key}
                  className={`relative flex flex-col overflow-hidden rounded-xl border bg-gradient-to-br shadow-sm backdrop-blur-sm ${col.colBg}`}
                >
                  <span className={`absolute left-0 top-0 h-full w-1 ${col.leftBar}`} />

                  <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pl-4 pt-3">
                    <h2 className={`text-[10px] font-bold uppercase tracking-widest ${col.headerCls}`}>
                      {col.title}
                    </h2>
                    <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${col.badge}`}>
                      {items.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 overflow-y-auto px-3 pb-3 pl-4 max-h-[calc(100vh-130px)] [scrollbar-width:thin]">
                    {items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/60 px-3 py-6 text-center text-[10px] text-[var(--gray-400)] dark:border-white/10">
                        Sem colheitas.
                      </div>
                    ) : (
                      items.map((row) => (
                        <CollectionCard
                          key={row.id}
                          row={row}
                          busyAction={busy?.id === row.id ? busy.action : null}
                          onCollect={() => runAction(row, "colher")}
                          onSend={() => runAction(row, "enviar")}
                          onFail={() => runAction(row, "falhar")}
                        />
                      ))
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
