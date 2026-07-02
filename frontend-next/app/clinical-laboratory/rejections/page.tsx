"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, ChevronLeft, FlaskConical, Loader2, Search } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetchList } from "@/lib/api"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"

type Rejection = {
  id: number
  custom_id?: string
  request: number
  request_custom_id?: string
  patient_name?: string
  exam_name?: string
  reasons_text?: string
  note?: string
  status?: string
  status_display?: string
  created_at?: string
  resolved_at?: string
}

type ColumnKey = "pendente" | "resolvida"

type ColumnConfig = {
  key: ColumnKey
  title: string
  hint: string
  headerCls: string
  badge: string
  colBg: string
  leftBar: string
}

const COLUMNS: ColumnConfig[] = [
  {
    key: "pendente",
    title: "Rejeições pendentes",
    hint: "Enviadas à enfermagem, ainda sem reconferência/recepção.",
    headerCls: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    colBg: "from-amber-50/60 via-white/50 to-yellow-50/40 border-amber-200/50 dark:from-amber-950/30 dark:via-slate-900/30 dark:to-yellow-950/20 dark:border-amber-800/30",
    leftBar: "bg-amber-400",
  },
  {
    key: "resolvida",
    title: "Rejeições resolvidas",
    hint: "Amostra reconferida e recebida sem nova rejeição.",
    headerCls: "text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    colBg: "from-emerald-50/60 via-white/50 to-teal-50/40 border-emerald-200/50 dark:from-emerald-950/30 dark:via-slate-900/30 dark:to-teal-950/20 dark:border-emerald-800/30",
    leftBar: "bg-emerald-400",
  },
]

function fmt(value?: string): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function normalizeStatus(value?: string): ColumnKey {
  return (value || "").trim().toLocaleLowerCase() === "resolvida" ? "resolvida" : "pendente"
}

function RejectionCard({ row, columnKey }: { row: Rejection; columnKey: ColumnKey }) {
  const details = [row.reasons_text, row.note].filter(Boolean).join(" — ")

  return (
    <div className="group relative flex w-4/5 flex-col overflow-hidden rounded-xl border border-white/50 bg-white/30 shadow-sm backdrop-blur-sm transition hover:border-white/70 hover:bg-white/50 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.08]">
      <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-1.5">
        <Link
          href={`/clinical-laboratory/reception/${row.request}`}
          className="font-mono text-[10px] font-bold text-sky-700 hover:underline dark:text-sky-300"
        >
          {row.request_custom_id || `REQ-${row.request}`}
        </Link>
        {row.exam_name ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {row.exam_name}
          </span>
        ) : null}
      </div>

      <div className="border-t border-white/40 px-3 py-2 dark:border-white/10">
        <p className="truncate text-[12px] font-semibold leading-snug text-foreground">
          {row.patient_name || "—"}
        </p>
      </div>

      {details ? (
        <div className="border-t border-white/40 px-3 py-2 dark:border-white/10">
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[10px] text-rose-800 dark:border-rose-800/40 dark:bg-rose-900/20 dark:text-rose-200">
            <span className="font-semibold">Motivo:</span> {details}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-t border-white/40 px-3 py-2 dark:border-white/10">
        <span className="text-[9px] text-[var(--gray-400)]">
          Rejeitada em {fmt(row.created_at)}
          {columnKey === "resolvida" ? ` · Resolvida em ${fmt(row.resolved_at)}` : ""}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
            columnKey === "resolvida"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
          }`}
        >
          {row.status_display || (columnKey === "resolvida" ? "Resolvida" : "Pendente")}
        </span>
      </div>
    </div>
  )
}

export default function LabRejectionsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<Rejection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await apiFetchList<Rejection>("/clinical/sample_rejection/", {
        page: 1,
        pageSize: 200,
        clientCache: false,
      })
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar as rejeições.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setQuery(value.trim().toLocaleLowerCase()), 350)
  }

  const filteredRows = useMemo(() => {
    if (!query) return rows
    return rows.filter((row) => {
      const haystack = [
        row.request_custom_id,
        String(row.request),
        row.patient_name,
        row.exam_name,
        row.reasons_text,
        row.note,
        row.status_display,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()

      return haystack.includes(query)
    })
  }, [query, rows])

  const buckets = useMemo(() => {
    const grouped: Record<ColumnKey, Rejection[]> = { pendente: [], resolvida: [] }
    for (const row of filteredRows) {
      grouped[normalizeStatus(row.status)].push(row)
    }
    return grouped
  }, [filteredRows])

  const total = filteredRows.length

  return (
    <AppLayout fullWidth>
      <div className="w-full min-w-0 max-w-none space-y-3 px-1 py-1">
        <section className="relative overflow-hidden rounded-xl border border-sky-200/50 bg-gradient-to-br from-sky-50/80 via-white/60 to-cyan-50/60 shadow-sm backdrop-blur-sm dark:border-sky-800/30 dark:from-sky-950/30 dark:via-slate-900/40 dark:to-cyan-950/20">
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />
          <div className="px-4 py-3 pl-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FlaskConical size={15} className="text-sky-500" />
                <div>
                  <h1 className="font-display text-sm font-bold leading-tight text-foreground">
                    Rejeições de Amostras
                  </h1>
                  <p className="text-[10px] text-[var(--gray-500)]">
                    {loading
                      ? <><Loader2 size={9} className="mr-1 inline animate-spin" />A carregar...</>
                      : total > 0
                        ? `${total} rejeição${total !== 1 ? "ões" : ""} ${query ? "encontrada" : "registada"}${total !== 1 ? "s" : ""}`
                        : query
                          ? "Sem rejeições para esta pesquisa"
                          : "Sem rejeições registadas"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/clinical-laboratory"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/40 bg-white/30 px-2.5 text-[11px] text-[var(--gray-700)] backdrop-blur-sm transition hover:bg-white/50 dark:border-white/10 dark:text-[var(--gray-300)] dark:hover:bg-white/10"
                >
                  <ChevronLeft size={11} /> Voltar
                </Link>
                <div className="flex items-center gap-1.5 rounded-lg border border-white/50 bg-white/50 px-2.5 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06]">
                  <Search size={11} className="shrink-0 text-[var(--gray-400)]" />
                  <input
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Pesquisar paciente, código..."
                    className="w-40 bg-transparent text-[11px] text-[var(--text)] outline-none placeholder-[var(--gray-400)]"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("")
                        setQuery("")
                      }}
                      className="text-[10px] text-[var(--gray-400)] hover:text-foreground"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2.5 text-[12px] text-rose-800 dark:border-rose-800/40 dark:bg-rose-900/15 dark:text-rose-300">
            <AlertCircle size={13} className="shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[12px] text-[var(--gray-400)]">
            <Loader2 size={16} className="animate-spin" /> A carregar rejeições...
          </div>
        ) : (
          <div className="grid w-full min-w-0 grid-cols-1 gap-2 md:grid-cols-2" style={{ height: "calc(100vh - 148px)" }}>
            {COLUMNS.map((column) => {
              const items = buckets[column.key]
              return (
                <section
                  key={column.key}
                  className={`relative flex min-h-0 flex-col overflow-hidden rounded-xl border bg-gradient-to-br shadow-sm backdrop-blur-sm ${column.colBg}`}
                >
                  <span className={`absolute left-0 top-0 h-full w-1 ${column.leftBar}`} />

                  <div className="flex shrink-0 items-baseline justify-between gap-2 px-3 pb-2.5 pl-4 pt-3">
                    <div className="min-w-0">
                      <h2 className={`text-[10px] font-bold uppercase tracking-widest ${column.headerCls}`}>
                        {column.title}
                      </h2>
                      <p className="text-[10px] text-[var(--gray-500)]">{column.hint}</p>
                    </div>
                    <span className={`inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${column.badge}`}>
                      {items.length}
                    </span>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-3 pl-4 [scrollbar-width:thin]">
                    {items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/60 px-3 py-6 text-center text-[10px] text-[var(--gray-400)] dark:border-white/10">
                        {query ? "Sem rejeições para esta pesquisa." : "Sem rejeições."}
                      </div>
                    ) : (
                      items.map((row) => (
                        <RejectionCard key={row.id} row={row} columnKey={column.key} />
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
