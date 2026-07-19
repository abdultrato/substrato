"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Loader2,
  Package,
  Plus,
  Scissors,
  Search,
  Stethoscope,
  User,
} from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import useDebounce from "@/hooks/useDebounce"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

const GLASS = "rounded-xl border border-slate-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho", REQUESTED: "Solicitada", UNDER_ASSESSMENT: "Em avaliação",
  FINANCIAL_PENDING: "Financeiro pendente", AUTHORIZED: "Autorizada",
  AGENDADA: "Agendada", PATIENT_CHECKED_IN: "Check-in",
  PREOPERATIVE_PREPARATION: "Preparação pré-op.", PREPARED: "Preparada",
  IN_OPERATING_ROOM: "Em sala operatória", ANESTHESIA_STARTED: "Anestesia iniciada",
  SURGERY_STARTED: "Cirurgia iniciada", EM_ANDAMENTO: "Em andamento",
  SURGERY_COMPLETED: "Cirurgia realizada", CONCLUIDA: "Concluída",
  IN_RECOVERY: "Em recuperação", RECOVERED: "Recuperado",
  REPORT_PENDING: "Relatório pendente", BILLING_PENDING: "Faturação pendente",
  CLOSED: "Fechada", POSTPONED: "Adiada", CANCELADA: "Cancelada",
}

const STATUS_FILTER_OPTIONS = [
  "DRAFT","REQUESTED","UNDER_ASSESSMENT","FINANCIAL_PENDING","AUTHORIZED",
  "AGENDADA","PATIENT_CHECKED_IN","PREOPERATIVE_PREPARATION","PREPARED",
  "IN_OPERATING_ROOM","ANESTHESIA_STARTED","SURGERY_STARTED","EM_ANDAMENTO",
  "SURGERY_COMPLETED","CONCLUIDA","IN_RECOVERY","RECOVERED",
  "REPORT_PENDING","BILLING_PENDING","CLOSED","POSTPONED","CANCELADA",
]

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  REQUESTED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  UNDER_ASSESSMENT: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  FINANCIAL_PENDING: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  AUTHORIZED: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  AGENDADA: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  PATIENT_CHECKED_IN: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  PREOPERATIVE_PREPARATION: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  PREPARED: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  IN_OPERATING_ROOM: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  ANESTHESIA_STARTED: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  SURGERY_STARTED: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  EM_ANDAMENTO: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  SURGERY_COMPLETED: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  CONCLUIDA: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  IN_RECOVERY: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  RECOVERED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  REPORT_PENDING: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  BILLING_PENDING: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  CLOSED: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  POSTPONED: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  CANCELADA: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
}

const STATUS_ACCENT: Record<string, string> = {
  AGENDADA: "bg-violet-400", AUTHORIZED: "bg-indigo-400",
  IN_OPERATING_ROOM: "bg-sky-500", SURGERY_STARTED: "bg-sky-500", EM_ANDAMENTO: "bg-sky-500",
  SURGERY_COMPLETED: "bg-teal-400", CONCLUIDA: "bg-emerald-400",
  CANCELADA: "bg-rose-400", POSTPONED: "bg-purple-400",
}

const PRIORITY_LABEL: Record<string, string> = {
  EMERGENCY: "Emergência", URGENT: "Urgente", ELECTIVE: "Eletiva", SCHEDULED: "Agendada",
}
const PRIORITY_BADGE: Record<string, string> = {
  EMERGENCY: "border-rose-300/70 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300",
  URGENT: "border-amber-300/70 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  ELECTIVE: "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
  SCHEDULED: "border-blue-300/70 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
}

const SIZE_LABEL: Record<string, string> = { PEQUENA: "Pequena", GRANDE: "Grande" }
const SIZE_BADGE: Record<string, string> = {
  PEQUENA: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300",
  GRANDE: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700/30 dark:bg-indigo-900/20 dark:text-indigo-300",
}

function fmtDate(v: any) {
  if (!v) return null
  try { return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(v)) }
  catch { return String(v) }
}

function fmtMT(v: any) {
  const n = parseFloat(v || "0")
  if (!n) return null
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2 }) + " MT"
}

interface Surgery {
  id: number
  custom_id: string
  status: string
  priority: string
  surgery_size: string
  patient_name: string
  procedure: string
  procedure_names: string[]
  surgeon_names: { id: number; name: string }[]
  specialty_name: string | null
  ward_name: string | null
  scheduled_for: string | null
  estimated_price: string
  vat_percentage: string
  procedures_price_total: string | null
}

function detailHref(s: Surgery) {
  return s.surgery_size === "GRANDE"
    ? `/surgery/large-surgeries/${s.id}`
    : `/surgery/small-surgeries/${s.id}`
}

function SurgeryCard({ s }: { s: Surgery }) {
  const accent = STATUS_ACCENT[s.status] ?? "bg-slate-400"
  const statusCls = STATUS_COLOR[s.status] ?? "bg-gray-100 text-gray-600"
  const base = parseFloat(s.procedures_price_total || s.estimated_price || "0")
  const vat = parseFloat(s.vat_percentage || "0")
  const total = base > 0 ? base * (1 + vat / 100) : 0
  const procNames = s.procedure_names?.length > 0
    ? s.procedure_names.slice(0, 2).join(", ") + (s.procedure_names.length > 2 ? ` +${s.procedure_names.length - 2}` : "")
    : s.procedure || "—"

  return (
    <Link href={detailHref(s)} className="group block">
      <div className={`${GLASS} relative overflow-hidden p-3 transition-all hover:border-slate-300 hover:shadow-md dark:hover:border-white/20`}>
        <span className={`absolute left-0 top-0 h-full w-1 ${accent} opacity-70 group-hover:opacity-100`} />
        <div className="pl-3">
          {/* top */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                  {s.custom_id}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${statusCls}`}>
                  {STATUS_LABEL[s.status] || s.status}
                </span>
                {s.surgery_size && (
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${SIZE_BADGE[s.surgery_size] || "border-gray-200 bg-gray-50 text-gray-600"}`}>
                    {SIZE_LABEL[s.surgery_size] || s.surgery_size}
                  </span>
                )}
                {s.priority && (
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${PRIORITY_BADGE[s.priority] || ""}`}>
                    {PRIORITY_LABEL[s.priority] || s.priority}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-[13px] font-semibold text-foreground">{s.patient_name || "—"}</p>
              <p className="mt-0.5 truncate text-[11px] text-[var(--gray-500)]">{procNames}</p>
            </div>
            <ChevronRight size={13} className="mt-1 shrink-0 text-[var(--gray-400)] transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
          </div>

          {/* detail row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[var(--gray-500)]">
            {s.surgeon_names?.length > 0 && (
              <span className="flex items-center gap-1">
                <Stethoscope size={9} className="shrink-0" />
                {s.surgeon_names[0].name}{s.surgeon_names.length > 1 ? ` +${s.surgeon_names.length - 1}` : ""}
              </span>
            )}
            {s.specialty_name && (
              <span className="flex items-center gap-1">
                <User size={9} className="shrink-0" />
                {s.specialty_name}
              </span>
            )}
            {s.ward_name && (
              <span className="flex items-center gap-1">
                <Package size={9} className="shrink-0" />
                {s.ward_name}
              </span>
            )}
            {s.scheduled_for && (
              <span className="flex items-center gap-1">
                <CalendarClock size={9} className="shrink-0" />
                {fmtDate(s.scheduled_for)}
              </span>
            )}
            {total > 0 && (
              <span className="ml-auto font-semibold text-teal-600 dark:text-teal-400">
                {fmtMT(total)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function SurgeriesListInner() {
  const searchParams = useSearchParams()

  const [items, setItems] = useState<Surgery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [statusFilter, setStatusFilter] = useState<string | null>(searchParams.get("status"))
  const [sizeFilter, setSizeFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState(searchParams.get("scheduled_date") || "")
  const [statusOpen, setStatusOpen] = useState(false)
  const [sizeOpen, setSizeOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!statusOpen) return
    const h = (e: MouseEvent) => { if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [statusOpen])

  useEffect(() => {
    if (!sizeOpen) return
    const h = (e: MouseEvent) => { if (sizeRef.current && !sizeRef.current.contains(e.target as Node)) setSizeOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [sizeOpen])

  const load = useCallback(async (q: string, status: string | null, size: string | null, date: string) => {
    setLoading(true); setError(null)
    try {
      const p = new URLSearchParams({ limit: "200", ordering: "-scheduled_for" })
      if (q) p.set("search", q)
      if (status) p.set("status", status)
      if (size) p.set("surgery_size", size)
      if (date) p.set("scheduled_date", date)
      const d = await apiFetch<any>(`/surgery/surgery/?${p}`)
      setItems(d.results ?? d)
    } catch (e: any) { setError(e?.message || "Erro ao carregar.") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load(debouncedSearch, statusFilter, sizeFilter, dateFilter)
  }, [debouncedSearch, statusFilter, sizeFilter, dateFilter, load])

  const activeFilters = [statusFilter, sizeFilter, dateFilter].filter(Boolean).length

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-5xl space-y-2 px-1 py-1">

        {/* header */}
        <section className={`relative z-10 overflow-visible ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-slate-400" />
          <div className="px-3 py-2 pl-4">
            {/* title row */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                  <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                  <span>/</span>
                  <span className="font-semibold text-foreground">Todas as cirurgias</span>
                </div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-sm font-semibold text-foreground">Todas as cirurgias</h1>
                  {!loading && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {items.length}
                    </span>
                  )}
                  {activeFilters > 0 && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                      {activeFilters} filtro{activeFilters > 1 ? "s" : ""} activo{activeFilters > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Link href="/surgery"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:bg-muted">
                  <ArrowLeft size={11} /> Voltar
                </Link>
                <Link href="/surgery/surgeries/new"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-3 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/20 dark:bg-white/[0.06] dark:text-slate-200">
                  <Plus size={11} /> Agendar cirurgia
                </Link>
              </div>
            </div>

            <div className="mt-2 border-t border-white/20 dark:border-white/10" />

            {/* filter row */}
            <div className="mt-2 flex flex-wrap items-center gap-2">

              {/* search */}
              <div className="relative flex-1 min-w-40">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--gray-400)]" />
                <input
                  className="w-full rounded-lg border border-border bg-card/60 py-1.5 pl-7 pr-3 text-[12px] placeholder-[var(--gray-400)] focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200 dark:focus:ring-white/10"
                  placeholder="Pesquisar por código, paciente, procedimento..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              {/* estado */}
              <div ref={statusRef} className="relative z-20 shrink-0">
                <button type="button" onClick={() => setStatusOpen(v => !v)}
                  className={`inline-flex h-[34px] items-center gap-1.5 rounded-lg border px-2.5 text-[12px] transition ${
                    statusFilter
                      ? (STATUS_COLOR[statusFilter] ?? "bg-card border-border text-foreground") + " border-transparent"
                      : "border-border bg-card/60 text-[var(--gray-500)] hover:border-slate-400"
                  }`}>
                  {statusFilter ? STATUS_LABEL[statusFilter] : "Estado"}
                  <ChevronDown size={11} className={`transition-transform ${statusOpen ? "rotate-180" : ""}`} />
                </button>
                {statusOpen && (
                  <div className="absolute right-0 top-[calc(100%+4px)] z-50 max-h-64 w-48 overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
                    {statusFilter && (
                      <button type="button" onClick={() => { setStatusFilter(null); setStatusOpen(false) }}
                        className="flex w-full items-center gap-2 border-b border-border px-3 py-1.5 text-[11px] font-semibold text-rose-500 hover:bg-rose-50/60">
                        × Limpar
                      </button>
                    )}
                    {STATUS_FILTER_OPTIONS.map(s => {
                      const active = statusFilter === s
                      const dot = STATUS_COLOR[s]?.match(/bg-\S+/)?.[0] ?? "bg-gray-300"
                      return (
                        <button key={s} type="button"
                          onClick={() => { setStatusFilter(active ? null : s); setStatusOpen(false) }}
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] first:rounded-t-xl last:rounded-b-xl transition ${
                            active ? "bg-slate-50 font-semibold dark:bg-white/10" : "hover:bg-muted"
                          }`}>
                          <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                          <span className="flex-1">{STATUS_LABEL[s] ?? s}</span>
                          {active && <span className="text-[10px] text-slate-500">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* tipo */}
              <div ref={sizeRef} className="relative z-20 shrink-0">
                <button type="button" onClick={() => setSizeOpen(v => !v)}
                  className={`inline-flex h-[34px] items-center gap-1.5 rounded-lg border px-2.5 text-[12px] transition ${
                    sizeFilter
                      ? (SIZE_BADGE[sizeFilter] ?? "bg-card border-border text-foreground") + " border-transparent"
                      : "border-border bg-card/60 text-[var(--gray-500)] hover:border-slate-400"
                  }`}>
                  {sizeFilter ? SIZE_LABEL[sizeFilter] : "Tipo"}
                  <ChevronDown size={11} className={`transition-transform ${sizeOpen ? "rotate-180" : ""}`} />
                </button>
                {sizeOpen && (
                  <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-36 rounded-xl border border-border bg-card shadow-xl">
                    {sizeFilter && (
                      <button type="button" onClick={() => { setSizeFilter(null); setSizeOpen(false) }}
                        className="flex w-full items-center gap-2 border-b border-border px-3 py-1.5 text-[11px] font-semibold text-rose-500 hover:bg-rose-50/60">
                        × Limpar
                      </button>
                    )}
                    {[["PEQUENA", "Pequena"], ["GRANDE", "Grande"]].map(([v, l]) => (
                      <button key={v} type="button"
                        onClick={() => { setSizeFilter(sizeFilter === v ? null : v); setSizeOpen(false) }}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] first:rounded-t-xl last:rounded-b-xl transition ${
                          sizeFilter === v ? "bg-slate-50 font-semibold dark:bg-white/10" : "hover:bg-muted"
                        }`}>
                        <Scissors size={10} className="shrink-0 text-[var(--gray-400)]" />
                        {l}
                        {sizeFilter === v && <span className="ml-auto text-[10px] text-slate-500">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* data */}
              <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                className="h-[34px] shrink-0 rounded-lg border border-border bg-card/60 px-2.5 text-[12px] text-foreground focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200 dark:focus:ring-white/10" />

              {activeFilters > 0 && (
                <button type="button"
                  onClick={() => { setStatusFilter(null); setSizeFilter(null); setDateFilter("") }}
                  className="h-[34px] shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-700/30 dark:bg-rose-900/10 dark:text-rose-300">
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
        </section>

        {/* list */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--gray-500)]">
            <Loader2 size={16} className="animate-spin" /> Carregando...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-300/50 bg-rose-50/60 px-4 py-3 text-sm text-rose-700">
            <AlertCircle size={14} />{error}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Scissors size={32} className="opacity-20" />
            <p className="text-sm text-[var(--gray-400)]">Nenhuma cirurgia encontrada com os filtros actuais.</p>
            {activeFilters > 0 && (
              <button type="button"
                onClick={() => { setStatusFilter(null); setSizeFilter(null); setDateFilter("") }}
                className="mt-1 text-[11px] font-semibold text-slate-500 underline hover:text-foreground">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {items.map(s => <SurgeryCard key={s.id} s={s} />)}
          </div>
        )}

      </div>
    </AppLayout>
  )
}

import { Suspense } from "react"
export default function SurgeriesListPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <SurgeriesListInner />
    </Suspense>
  )
}
