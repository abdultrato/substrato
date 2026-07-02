"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  Plus,
  Search,
  Stethoscope,
  User,
  XCircle,
} from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

const GLASS = "rounded-xl border border-amber-200/60 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const STATUS_LABEL: Record<string, string> = {
  PENDING:           "Pendente",
  IN_PROGRESS:       "Em curso",
  FIT:               "Apto",
  TEMPORARILY_UNFIT: "Temporariamente inapto",
  UNFIT:             "Inapto",
  REQUIRES_EXAMS:    "Requer exames",
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:           "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  IN_PROGRESS:       "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  FIT:               "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  TEMPORARILY_UNFIT: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  UNFIT:             "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  REQUIRES_EXAMS:    "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
}

const STATUS_ACCENT: Record<string, string> = {
  PENDING:           "bg-gray-400",
  IN_PROGRESS:       "bg-amber-400",
  FIT:               "bg-emerald-500",
  TEMPORARILY_UNFIT: "bg-orange-400",
  UNFIT:             "bg-rose-500",
  REQUIRES_EXAMS:    "bg-sky-400",
}

const ASA_LABEL: Record<string, string> = {
  ASA_I:   "ASA I",
  ASA_II:  "ASA II",
  ASA_III: "ASA III",
  ASA_IV:  "ASA IV",
  ASA_V:   "ASA V",
  ASA_VI:  "ASA VI",
  UNKNOWN: "ASA ?",
}

const ASA_COLOR: Record<string, string> = {
  ASA_I:   "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  ASA_II:  "border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-800/40 dark:bg-lime-900/20 dark:text-lime-300",
  ASA_III: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300",
  ASA_IV:  "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/40 dark:bg-orange-900/20 dark:text-orange-300",
  ASA_V:   "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-900/20 dark:text-rose-300",
  ASA_VI:  "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
  UNKNOWN: "border-gray-200 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400",
}

function fmtDate(v: any) {
  if (!v) return null
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(v))
  } catch { return String(v) }
}

interface Assessment {
  id: number
  custom_id: string
  status: string
  patient_name: string
  evaluator_name: string | null
  surgical_request_code: string | null
  proposed_surgery_code: string | null
  asa_class: string | null
  fit_for_surgery: boolean | null
  consent_signed: boolean
  assessed_at: string | null
  surgical_risk: string | null
}

function AssessmentCard({ a }: { a: Assessment }) {
  const accent = STATUS_ACCENT[a.status] ?? "bg-amber-400"
  const statusCls = STATUS_COLOR[a.status] ?? "bg-gray-100 text-gray-600"
  const asaCls = a.asa_class ? (ASA_COLOR[a.asa_class] ?? ASA_COLOR.UNKNOWN) : null

  return (
    <Link href={`/surgery/preoperative-assessments/${a.id}`} className="group flex h-full flex-col">
      <div className={`${GLASS} relative flex h-full min-h-[108px] flex-col overflow-hidden p-3 transition-all hover:border-amber-300 hover:shadow-md dark:hover:border-white/20`}>
        <span className={`absolute left-0 top-0 h-full w-1 ${accent} opacity-70 group-hover:opacity-100`} />
        <div className="flex flex-1 flex-col pl-3">

          {/* badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] font-semibold tracking-wide text-amber-600 dark:text-amber-400">
              {a.custom_id || `#${a.id}`}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${statusCls}`}>
              {STATUS_LABEL[a.status] || a.status}
            </span>
            {asaCls && (
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${asaCls}`}>
                {ASA_LABEL[a.asa_class!] || a.asa_class}
              </span>
            )}
            {a.fit_for_surgery === true && (
              <span className="flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                <CheckCircle2 size={8} /> Apto
              </span>
            )}
            {a.fit_for_surgery === false && (
              <span className="flex items-center gap-0.5 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9px] font-semibold text-rose-700 dark:border-rose-800/40 dark:bg-rose-900/20 dark:text-rose-300">
                <XCircle size={8} /> Inapto
              </span>
            )}
            <ChevronRight size={11} className="ml-auto shrink-0 text-[var(--gray-400)] transition group-hover:translate-x-0.5 group-hover:text-amber-500" />
          </div>

          {/* patient */}
          <p className="mt-1.5 truncate text-[13px] font-semibold text-foreground">{a.patient_name || "—"}</p>

          {/* evaluator */}
          {a.evaluator_name && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[var(--gray-500)]">
              <Stethoscope size={9} className="shrink-0" /> {a.evaluator_name}
            </p>
          )}

          {/* bottom: consent + date */}
          <div className="mt-auto flex items-center gap-2 pt-2 text-[10px] text-[var(--gray-400)]">
            {a.consent_signed ? (
              <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                <ClipboardCheck size={9} /> Consentimento
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-[var(--gray-400)]">
                <ClipboardCheck size={9} /> Sem consentimento
              </span>
            )}
            {a.assessed_at && (
              <span className="ml-auto flex items-center gap-0.5">
                <CalendarClock size={9} className="shrink-0" />
                {fmtDate(a.assessed_at)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

const STATUS_OPTIONS = ["PENDING","IN_PROGRESS","FIT","TEMPORARILY_UNFIT","UNFIT","REQUIRES_EXAMS"]

export default function PreoperativeAssessmentsPage() {
  const [items, setItems] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!statusOpen) return
    const h = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [statusOpen])

  const load = useCallback(async (q: string, status: string | null) => {
    setLoading(true); setError(null)
    try {
      const p = new URLSearchParams({ limit: "200", ordering: "-assessed_at" })
      if (q) p.set("search", q)
      if (status) p.set("status", status)
      const d = await apiFetch<any>(`/surgery/avaliacao_pre_operatoria/?${p}`)
      setItems(d.results ?? d)
    } catch (e: any) { setError(e?.message || "Erro ao carregar.") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load("", null) }, [load])

  useEffect(() => {
    const t = setTimeout(() => load(search, statusFilter), 300)
    return () => clearTimeout(t)
  }, [search, statusFilter, load])

  const fit    = items.filter(a => a.fit_for_surgery === true).length
  const unfit  = items.filter(a => a.fit_for_surgery === false).length
  const pending = items.filter(a => a.fit_for_surgery === null).length

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
      <div className="mx-auto w-full max-w-7xl space-y-2 px-1 py-1">

        {/* header */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
          <div className="px-3 py-2 pl-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                  <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                  <span>/</span>
                  <span className="font-semibold text-foreground">Avaliações pré-operatórias</span>
                </div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-sm font-semibold text-foreground">Avaliações pré-operatórias</h1>
                  {!loading && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      {items.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Link href="/surgery"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:bg-muted">
                  <ArrowLeft size={11} /> Voltar
                </Link>
                <Link href="/surgery/preoperative-assessments/new"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
                  <Plus size={11} /> Nova avaliação
                </Link>
              </div>
            </div>

            <div className="mt-2 border-t border-white/20 dark:border-white/10" />

            {/* summary chips */}
            {!loading && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <CheckCircle2 size={10} /> {fit} apto{fit !== 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/80 px-2.5 py-1 text-[10px] font-semibold text-rose-700 dark:border-rose-800/40 dark:bg-rose-900/20 dark:text-rose-300">
                  <XCircle size={10} /> {unfit} inapto{unfit !== 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 py-1 text-[10px] font-semibold text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
                  <User size={10} /> {pending} pendente{pending !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* filters */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-40">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--gray-400)]" />
                <input
                  className="w-full rounded-lg border border-border bg-card/60 py-1.5 pl-7 pr-3 text-[12px] placeholder-[var(--gray-400)] focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-200 dark:focus:ring-amber-800"
                  placeholder="Pesquisar por paciente, avaliador ou código..."
                  value={search} onChange={e => setSearch(e.target.value)}
                />
              </div>

              <div ref={statusRef} className="relative shrink-0">
                <button type="button" onClick={() => setStatusOpen(v => !v)}
                  className={`inline-flex h-[34px] items-center gap-1.5 rounded-lg border px-2.5 text-[12px] transition ${
                    statusFilter
                      ? (STATUS_COLOR[statusFilter] ?? "") + " border-transparent"
                      : "border-border bg-card/60 text-[var(--gray-500)] hover:border-amber-300"
                  }`}>
                  {statusFilter ? STATUS_LABEL[statusFilter] : "Estado"}
                  <ChevronDown size={11} className={`transition-transform ${statusOpen ? "rotate-180" : ""}`} />
                </button>
                {statusOpen && (
                  <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-48 rounded-xl border border-border bg-card shadow-xl">
                    {statusFilter && (
                      <button type="button" onClick={() => { setStatusFilter(null); setStatusOpen(false) }}
                        className="flex w-full items-center gap-2 border-b border-border px-3 py-1.5 text-[11px] font-semibold text-rose-500 hover:bg-rose-50/60 rounded-t-xl">
                        × Limpar
                      </button>
                    )}
                    {STATUS_OPTIONS.map(s => {
                      const active = statusFilter === s
                      const dot = STATUS_COLOR[s]?.match(/bg-\S+/)?.[0] ?? "bg-gray-300"
                      return (
                        <button key={s} type="button"
                          onClick={() => { setStatusFilter(active ? null : s); setStatusOpen(false) }}
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] first:rounded-t-xl last:rounded-b-xl transition ${
                            active ? "bg-amber-50 font-semibold dark:bg-white/10" : "hover:bg-muted"
                          }`}>
                          <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                          {STATUS_LABEL[s]}
                          {active && <span className="ml-auto text-[10px] text-amber-500">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {statusFilter && (
                <button type="button" onClick={() => setStatusFilter(null)}
                  className="h-[34px] shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-700/30 dark:bg-rose-900/10 dark:text-rose-300">
                  Limpar
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
            <AlertCircle size={14} /> {error}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Stethoscope size={32} className="opacity-20" />
            <p className="text-sm text-[var(--gray-400)]">Nenhuma avaliação encontrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {items.map(a => <AssessmentCard key={a.id} a={a} />)}
          </div>
        )}

      </div>
    </AppLayout>
  )
}
