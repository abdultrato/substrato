"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ChevronLeft,
  ClipboardList,
  Loader2,
  Search,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetchList } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { genderLabel } from "@/components/clinical-laboratory/ReceptionWorkflow"

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestItem = {
  id: number
  exam_name?: string
  medical_exam_name?: string
}

type LabRequest = {
  id: number
  custom_id?: string
  patient_name?: string
  patient_age?: string
  patient_gender?: string
  clinical_status?: string
  clinical_status_display?: string
  type: "LAB" | "MED"
  status?: string
  collected_at?: string
  items?: RequestItem[]
}

function fmt(v?: string) {
  if (!v) return "—"
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

const GLASS = "rounded-xl border border-[var(--border)] bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const TYPE_META: Record<string, { label: string; cls: string }> = {
  LAB: { label: "Lab",    cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  MED: { label: "Médico", cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
}

const STATUS_META: Record<string, { label: string; dot: string }> = {
  pendente:    { label: "Pendente",    dot: "bg-amber-400" },
  em_analise:  { label: "Em análise", dot: "bg-sky-400" },
  concluido:   { label: "Concluído",  dot: "bg-emerald-400" },
  cancelado:   { label: "Cancelado",  dot: "bg-rose-400" },
  validado:    { label: "Validado",   dot: "bg-violet-400" },
  transferido: { label: "Transferido",dot: "bg-indigo-400" },
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ row }: { row: LabRequest }) {
  const router = useRouter()
  const target = `/clinical-laboratory/orders/${row.id}`
  const priority = getClinicalStatusLabel(row.clinical_status, row.clinical_status_display)
  const meta = [row.patient_age, genderLabel(row.patient_gender)].filter(Boolean).join(" · ")
  const totalItems = (row.items ?? []).length
  const tm = TYPE_META[row.type] ?? null
  const statusKey = (row.status || "").toLowerCase()
  const sm = STATUS_META[statusKey] ?? null

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
      {/* ── código + tipo ── */}
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1.5">
        <span className="font-mono text-[10px] font-bold text-sky-700 dark:text-sky-300 truncate">
          {row.custom_id ?? `#${row.id}`}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {tm && (
            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${tm.cls}`}>
              {tm.label}
            </span>
          )}
          {sm && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-1.5 py-0.5 text-[9px] font-medium text-[var(--gray-600)] dark:bg-white/10 dark:text-[var(--gray-300)]">
              <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />
              {sm.label}
            </span>
          )}
        </div>
      </div>

      {/* ── paciente ── */}
      <div className="border-t border-white/40 px-3 py-2 dark:border-white/10">
        <div className="flex items-start gap-1.5">
          <User size={10} className="mt-0.5 shrink-0 text-[var(--gray-400)]" />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-foreground leading-snug">
              {row.patient_name || "—"}
            </p>
            {meta && (
              <p className="mt-0.5 text-[10px] text-[var(--gray-500)]">{meta}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── badges ── */}
      <div className="border-t border-white/40 px-3 py-2 dark:border-white/10">
        <div className="flex flex-wrap gap-1">
          {priority && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              {priority}
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {totalItems} {totalItems === 1 ? "exame" : "exames"}
          </span>
        </div>
      </div>

      {/* ── rodapé ── */}
      <div className="border-t border-white/40 px-3 py-2 dark:border-white/10">
        <p className="text-[9px] text-[var(--gray-400)]">Colhida {fmt(row.collected_at)}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LabOrdersPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<LabRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ fase: "pedidos" })
      if (query) params.set("search", query)
      const { items } = await apiFetchList<LabRequest>(
        `/clinical/labrequest/?${params}`,
        { page: 1, pageSize: 200, clientCache: false }
      )
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar pedidos.")
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => { load() }, [load, safeRefreshToken])

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setQuery(value), 350)
  }

  const total = rows.length

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-5xl space-y-4 px-1 py-1">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden rounded-xl border border-sky-200/50 bg-gradient-to-br from-sky-50/80 via-white/60 to-cyan-50/60 shadow-sm backdrop-blur-sm dark:border-sky-800/30 dark:from-sky-950/30 dark:via-slate-900/40 dark:to-cyan-950/20">
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />
          <div className="px-4 py-3 pl-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList size={15} className="text-sky-500" />
                <div>
                  <h1 className="font-display text-sm font-bold text-foreground leading-tight">
                    Pedidos laboratoriais
                  </h1>
                  <p className="text-[10px] text-[var(--gray-500)]">
                    {loading
                      ? <><Loader2 size={9} className="inline animate-spin mr-1" />A carregar...</>
                      : total > 0
                        ? `${total} pedido${total !== 1 ? "s" : ""}`
                        : "Sem pedidos"
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

        {/* ── Grid ── */}
        {loading && rows.length === 0 ? (
          <div className={`${GLASS} flex items-center gap-2 px-4 py-10 text-[12px] text-[var(--gray-400)]`}>
            <Loader2 size={14} className="animate-spin" /> A carregar pedidos...
          </div>
        ) : rows.length === 0 ? (
          <div className={`${GLASS} px-4 py-10 text-center text-[12px] text-[var(--gray-400)]`}>
            Sem pedidos a aguardar processamento.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((row) => (
              <OrderCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
