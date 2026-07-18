"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Scissors,
  Stethoscope,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho", REQUESTED: "Solicitada", AUTHORIZED: "Autorizada",
  AGENDADA: "Agendada", PATIENT_CHECKED_IN: "Check-in",
  PREOPERATIVE_PREPARATION: "Preparação", PREPARED: "Preparada",
  IN_OPERATING_ROOM: "Em sala", ANESTHESIA_STARTED: "Anestesia",
  SURGERY_STARTED: "Em cirurgia", EM_ANDAMENTO: "Em andamento",
  SURGERY_COMPLETED: "Concluída", CONCLUIDA: "Concluída",
  IN_RECOVERY: "Recuperação", CLOSED: "Fechada",
  POSTPONED: "Adiada", CANCELADA: "Cancelada",
}

const STATUS_COLOR: Record<string, string> = {
  AGENDADA: "border-l-violet-400 bg-violet-50/60 dark:bg-violet-900/10",
  PATIENT_CHECKED_IN: "border-l-blue-400 bg-blue-50/60 dark:bg-blue-900/10",
  PREOPERATIVE_PREPARATION: "border-l-amber-400 bg-amber-50/60 dark:bg-amber-900/10",
  PREPARED: "border-l-amber-400 bg-amber-50/60 dark:bg-amber-900/10",
  IN_OPERATING_ROOM: "border-l-sky-500 bg-sky-50/60 dark:bg-sky-900/10",
  SURGERY_STARTED: "border-l-sky-500 bg-sky-50/60 dark:bg-sky-900/10",
  EM_ANDAMENTO: "border-l-sky-500 bg-sky-50/60 dark:bg-sky-900/10",
  SURGERY_COMPLETED: "border-l-emerald-400 bg-emerald-50/60 dark:bg-emerald-900/10",
  CONCLUIDA: "border-l-emerald-400 bg-emerald-50/60 dark:bg-emerald-900/10",
  CANCELADA: "border-l-rose-400 bg-rose-50/60 dark:bg-rose-900/10",
}

const STATUS_DOT: Record<string, string> = {
  AGENDADA: "bg-violet-400",
  PATIENT_CHECKED_IN: "bg-blue-400",
  PREOPERATIVE_PREPARATION: "bg-amber-400",
  PREPARED: "bg-amber-400",
  IN_OPERATING_ROOM: "bg-sky-500 animate-pulse",
  SURGERY_STARTED: "bg-sky-500 animate-pulse",
  EM_ANDAMENTO: "bg-sky-500 animate-pulse",
  SURGERY_COMPLETED: "bg-emerald-400",
  CONCLUIDA: "bg-emerald-400",
  CANCELADA: "bg-rose-400",
}

const PRIORITY_BADGE: Record<string, string> = {
  EMERGENCY: "border-rose-300/70 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300",
  URGENT: "border-amber-300/70 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  ELECTIVE: "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
}
const PRIORITY_LABEL: Record<string, string> = { EMERGENCY: "Emergência", URGENT: "Urgente", ELECTIVE: "Eletiva" }

// Hours to show on timeline (7h–21h)
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7)

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function fmtDay(d: Date) {
  return new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(d)
}

function fmtTime(v: string | null | undefined) {
  if (!v) return null
  try {
    return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" }).format(new Date(v))
  } catch { return null }
}

// Given a datetime string, return minutes since midnight
function minuteOfDay(v: string) {
  const d = new Date(v)
  return d.getHours() * 60 + d.getMinutes()
}

// Place surgery block on timeline in a compact daily view.
const MIN_PX = 1
const HOUR_PX = 60 * MIN_PX
const TIMELINE_START = 7 * 60 // 7h

// Assign each surgery a column index and total column count so overlapping
// surgeries share the horizontal space instead of stacking on top of each other.
interface LayoutBlock {
  id: number
  startMin: number
  endMin: number
  col: number
  totalCols: number
}

function buildLayout(surgeries: Surgery[]): Map<number, LayoutBlock> {
  // sort by start time
  const items = surgeries.map(s => ({
    id: s.id,
    startMin: minuteOfDay(s.scheduled_for),
    endMin: s.ended_at ? minuteOfDay(s.ended_at) : minuteOfDay(s.scheduled_for) + 60,
  })).sort((a, b) => a.startMin - b.startMin)

  // greedy column assignment
  const cols: number[] = [] // cols[i] = endMin of last item placed in column i
  const assigned: { id: number; col: number }[] = []

  for (const item of items) {
    let placed = false
    for (let c = 0; c < cols.length; c++) {
      if (cols[c] <= item.startMin) {
        cols[c] = item.endMin
        assigned.push({ id: item.id, col: c })
        placed = true
        break
      }
    }
    if (!placed) {
      assigned.push({ id: item.id, col: cols.length })
      cols.push(item.endMin)
    }
  }

  // for each item, totalCols = max col index among items that overlap with it + 1
  const colMap = new Map(assigned.map(a => [a.id, a.col]))
  const result = new Map<number, LayoutBlock>()

  for (const item of items) {
    const myCol = colMap.get(item.id)!
    // find all items that overlap this one
    const overlapping = items.filter(
      o => o.id !== item.id && o.startMin < item.endMin && o.endMin > item.startMin
    )
    const maxCol = Math.max(myCol, ...overlapping.map(o => colMap.get(o.id)!))
    result.set(item.id, { ...item, col: myCol, totalCols: maxCol + 1 })
  }

  return result
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
  ward_name: string | null
  scheduled_for: string
  started_at: string | null
  ended_at: string | null
  procedures_price_total: string | null
  procedures_vat_percentage: string | null
  estimated_price: string | null
  vat_percentage: string | null
}

function calcPrice(s: Surgery): { base: number; vat: number; total: number } | null {
  const base = parseFloat(s.procedures_price_total || s.estimated_price || "0")
  const vat = parseFloat(s.procedures_vat_percentage || s.vat_percentage || "0")
  if (!base) return null
  return { base, vat, total: base * (1 + vat / 100) }
}

function fmtMT(n: number) {
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MT"
}

export default function SurgerySchedulesPage() {
  const [date, setDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [surgeries, setSurgeries] = useState<Surgery[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"timeline" | "list">("timeline")
  const [kpiFilter, setKpiFilter] = useState<string | null>(null)
  const filteredRef = useRef<HTMLDivElement>(null)
  const nowRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const dayStr = isoDate(date)
      const nextDay = isoDate(addDays(date, 1))
      const res = await apiFetch<any>(
        `/surgery/surgery/?scheduled_for__gte=${dayStr}&scheduled_for__lt=${nextDay}&ordering=scheduled_for&limit=100`
      )
      setSurgeries(res.results ?? res ?? [])
    } catch { setSurgeries([]) }
    finally { setLoading(false) }
  }, [date])

  useEffect(() => { load() }, [load])

  // scroll to current time on mount
  useEffect(() => {
    if (view === "timeline") {
      setTimeout(() => nowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100)
    }
  }, [view, loading])

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const isToday = isoDate(date) === isoDate(today)
  const nowMinute = isToday ? (new Date().getHours() * 60 + new Date().getMinutes()) : null

  // group surgeries by hour slot for list view
  const byHour: Record<number, Surgery[]> = {}
  for (const s of surgeries) {
    const h = new Date(s.scheduled_for).getHours()
    if (!byHour[h]) byHour[h] = []
    byHour[h].push(s)
  }

  const active = surgeries.filter(s =>
    ["IN_OPERATING_ROOM", "SURGERY_STARTED", "EM_ANDAMENTO", "PATIENT_CHECKED_IN", "PREOPERATIVE_PREPARATION", "PREPARED"].includes(s.status)
  )
  const upcoming = surgeries.filter(s => ["AGENDADA", "AUTHORIZED"].includes(s.status))
  const done = surgeries.filter(s => ["SURGERY_COMPLETED", "CONCLUIDA", "CLOSED"].includes(s.status))

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-6xl space-y-3 px-1">

        {/* header */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-400" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">Agenda cirúrgica</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <CalendarDays size={14} className="text-violet-500" />
                <h1 className="font-display text-base font-semibold text-foreground capitalize">
                  {fmtDay(date)}
                  {isToday && <span className="ml-2 text-[10px] font-normal text-violet-500">hoje</span>}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* day nav */}
              <div className="flex items-center rounded-lg border border-border bg-card">
                <button onClick={() => setDate(d => addDays(d, -1))}
                  className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => setDate(today)}
                  className="px-2 text-[11px] font-medium text-foreground hover:text-violet-600">
                  Hoje
                </button>
                <button onClick={() => setDate(d => addDays(d, 1))}
                  className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground">
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* view toggle */}
              <div className="flex rounded-lg border border-border bg-card text-[11px]">
                <button onClick={() => setView("timeline")}
                  className={`px-3 py-1.5 rounded-l-lg font-medium transition ${view === "timeline" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" : "text-muted-foreground hover:text-foreground"}`}>
                  Linha do tempo
                </button>
                <button onClick={() => setView("list")}
                  className={`px-3 py-1.5 rounded-r-lg font-medium transition ${view === "list" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" : "text-muted-foreground hover:text-foreground"}`}>
                  Lista
                </button>
              </div>

              <Link href="/surgery/schedules/new"
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                <Plus size={12} /> Agendar
              </Link>
            </div>
          </div>

          {/* KPI strip — clicável, filtra e scroll para a lista abaixo */}
          <div className="grid grid-cols-3 divide-x divide-white/30 border-t border-white/20 dark:divide-white/10 dark:border-white/10">
            {[
              { label: "Em curso", key: "active", count: active.length, color: "text-sky-600 dark:text-sky-400", activeRing: "ring-sky-400/40" },
              { label: "Agendadas", key: "upcoming", count: upcoming.length, color: "text-violet-600 dark:text-violet-400", activeRing: "ring-violet-400/40" },
              { label: "Realizadas hoje", key: "done", count: done.length, color: "text-emerald-600 dark:text-emerald-400", activeRing: "ring-emerald-400/40" },
            ].map(k => (
              <button key={k.key} type="button"
                onClick={() => {
                  setKpiFilter(prev => prev === k.key ? null : k.key)
                  setTimeout(() => filteredRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80)
                }}
                className={`flex flex-col items-center py-2 transition hover:bg-white/20 dark:hover:bg-white/[0.04] ${kpiFilter === k.key ? `ring-2 ${k.activeRing}` : ""}`}>
                <span className={`text-lg font-semibold ${k.color}`}>{k.count}</span>
                <span className="text-[9px] font-medium uppercase tracking-wide text-[var(--gray-500)]">{k.label}</span>
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="flex h-32 items-center justify-center text-sm text-[var(--gray-500)]">Carregando...</div>
        ) : surgeries.length === 0 ? (
          <div className={`flex flex-col items-center gap-1 py-7 ${GLASS}`}>
            <CalendarDays size={28} className="text-[var(--gray-300)]" />
            <p className="text-sm text-[var(--gray-400)]">Nenhuma cirurgia agendada para este dia.</p>
            <Link href="/surgery/schedules/new"
              className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100">
              <Plus size={12} /> Agendar cirurgia
            </Link>
          </div>
        ) : view === "timeline" ? (
          /* ── TIMELINE VIEW ── */
          (() => {
            const layout = buildLayout(surgeries)
            return (
              <div className={`overflow-auto ${GLASS}`}>
                <div className="relative" style={{ minHeight: `${HOURS.length * HOUR_PX}px` }}>
                  {/* hour rows */}
                  {HOURS.map(h => (
                    <div key={h} className="absolute left-0 right-0 border-t border-white/20 dark:border-white/10"
                      style={{ top: `${(h - 7) * HOUR_PX}px` }}>
                      <span className="absolute left-2 -translate-y-1/2 text-[10px] text-[var(--gray-400)] tabular-nums">
                        {String(h).padStart(2, "0")}:00
                      </span>
                    </div>
                  ))}

                  {/* now line */}
                  {nowMinute !== null && nowMinute >= TIMELINE_START && nowMinute <= (TIMELINE_START + HOURS.length * 60) && (
                    <div ref={nowRef} className="absolute left-0 right-0 z-20 flex items-center"
                      style={{ top: `${(nowMinute - TIMELINE_START) * MIN_PX}px` }}>
                      <span className="ml-16 h-2 w-2 rounded-full bg-red-500 shadow-sm" />
                      <span className="flex-1 border-t border-red-500/60" />
                      <span className="mr-2 text-[10px] font-semibold text-red-500 tabular-nums">
                        {String(Math.floor(nowMinute / 60)).padStart(2, "0")}:{String(nowMinute % 60).padStart(2, "0")}
                      </span>
                    </div>
                  )}

                  {/* surgery blocks — positioned with column layout to avoid overlap */}
                  <div className="absolute inset-0 ml-16 mr-2">
                    {surgeries.map(s => {
                      const block = layout.get(s.id)!
                      const top = Math.max(0, block.startMin - TIMELINE_START) * MIN_PX
                      const height = Math.max(24, (block.endMin - block.startMin) * MIN_PX)
                      const colW = 100 / block.totalCols
                      const left = `${block.col * colW}%`
                      const width = `calc(${colW}% - 4px)`
                      const colorClass = STATUS_COLOR[s.status] || "border-l-slate-400 bg-slate-50/60"

                      return (
                        <Link key={s.id} href={`/surgery/small-surgeries/${s.id}`}
                          className={`absolute rounded-md border-l-4 px-1.5 py-0.5 transition hover:z-10 hover:brightness-95 ${colorClass}`}
                          style={{ top: `${top}px`, height: `${height}px`, left, width }}>
                          <div className="flex h-full flex-col justify-between overflow-hidden">
                            <div>
                              <div className="flex items-center gap-1">
                                <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[s.status] || "bg-slate-400"}`} />
                                <span className="truncate text-[10px] font-semibold leading-tight text-foreground">
                                  {s.patient_name}
                                </span>
                              </div>
                              {height >= 34 && (
                                <p className="mt-0.5 truncate pl-3 text-[9px] leading-tight text-[var(--gray-500)]">
                                  {(s.procedure_names || []).slice(0, 1).join(", ") || s.procedure || "—"}
                                </p>
                              )}
                              {height >= 48 && s.surgeon_names?.length > 0 && (
                                <p className="mt-0.5 truncate pl-3 text-[9px] leading-tight text-[var(--gray-400)]">
                                  {s.surgeon_names[0].name}
                                </p>
                              )}
                              {height >= 62 && (() => { const p = calcPrice(s); return p ? (
                                <p className="mt-0.5 pl-3 text-[9px] font-semibold leading-tight text-teal-600 dark:text-teal-400">
                                  {fmtMT(p.total)}{p.vat > 0 ? ` (c/ ${p.vat}% IVA)` : ""}
                                </p>
                              ) : null })()}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] tabular-nums text-[var(--gray-400)]">
                                {fmtTime(s.scheduled_for)}
                              </span>
                              {s.priority && height >= 34 && (
                                <span className={`rounded border px-1 text-[8px] font-semibold leading-tight ${PRIORITY_BADGE[s.priority] || ""}`}>
                                  {PRIORITY_LABEL[s.priority] || s.priority}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()
        ) : (
          /* ── LIST VIEW ── */
          <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2 xl:grid-cols-3">
            {surgeries.map(s => (
              <Link key={s.id} href={`/surgery/small-surgeries/${s.id}`}
                className={`relative flex items-center gap-2 overflow-hidden rounded-lg border-l-4 px-2 py-1.5 transition hover:brightness-95 ${STATUS_COLOR[s.status] || "border-l-slate-400 bg-slate-50/60"} border border-white/30 shadow-sm backdrop-blur-sm dark:border-white/10`}>
                {/* time */}
                <div className="flex w-12 shrink-0 flex-col items-center">
                  <Clock size={11} className="mb-0.5 text-[var(--gray-400)]" />
                  <span className="text-[12px] font-semibold tabular-nums text-foreground">
                    {fmtTime(s.scheduled_for)}
                  </span>
                </div>

                <span className="h-8 w-px bg-white/30 dark:bg-white/10" />

                {/* content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[s.status] || "bg-slate-400"}`} />
                    <span className="truncate text-[11px] font-semibold text-foreground">{s.patient_name}</span>
                    <span className="text-[10px] text-[var(--gray-400)] shrink-0">{s.custom_id}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-3.5">
                    {(s.procedure_names?.length > 0 || s.procedure) && (
                      <span className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                        <Scissors size={9} className="text-violet-400" />
                        {(s.procedure_names || []).slice(0, 2).join(", ") || s.procedure}
                      </span>
                    )}
                    {s.surgeon_names?.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                        <Stethoscope size={9} className="text-emerald-400" />
                        {s.surgeon_names[0].name}
                        {s.surgeon_names.length > 1 && ` +${s.surgeon_names.length - 1}`}
                      </span>
                    )}
                    {s.ward_name && (
                      <span className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                        <User size={9} className="text-cyan-400" />
                        {s.ward_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* badges */}
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  {(() => { const p = calcPrice(s); return p ? (
                    <span className="text-[11px] font-semibold tabular-nums text-teal-600 dark:text-teal-400">
                      {fmtMT(p.total)}
                    </span>
                  ) : null })()}
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${PRIORITY_BADGE[s.priority] || "border-slate-200 bg-slate-50 text-slate-500"}`}>
                    {PRIORITY_LABEL[s.priority] || s.priority || "—"}
                  </span>
                  <span className="text-[10px] font-medium text-[var(--gray-500)]">
                    {STATUS_LABEL[s.status] || s.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {/* painel filtrado por KPI */}
        {kpiFilter && (() => {
          const groups: Record<string, Surgery[]> = { active, upcoming, done }
          const items = groups[kpiFilter] || []
          const labels: Record<string, string> = { active: "Em curso", upcoming: "Agendadas", done: "Realizadas hoje" }
          const sizeHref = (s: Surgery) =>
            s.surgery_size === "GRANDE"
              ? `/surgery/large-surgeries/${s.id}`
              : `/surgery/small-surgeries/${s.id}`
          return (
            <div ref={filteredRef} className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                  {labels[kpiFilter]} — {items.length} cirurgia{items.length !== 1 ? "s" : ""}
                </span>
                <button type="button" onClick={() => setKpiFilter(null)}
                  className="text-[11px] text-[var(--gray-400)] hover:text-foreground">✕ Fechar</button>
              </div>
              {items.length === 0 ? (
                <div className={`flex items-center justify-center py-5 text-sm text-[var(--gray-400)] ${GLASS}`}>
                  Nenhuma cirurgia neste grupo.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2 xl:grid-cols-3">
                  {items.map(s => (
                    <Link key={s.id} href={sizeHref(s)}
                      className={`relative flex items-center gap-2 overflow-hidden rounded-lg border-l-4 px-2 py-1.5 transition hover:brightness-95 ${STATUS_COLOR[s.status] || "border-l-slate-400 bg-slate-50/60"} border border-white/30 shadow-sm backdrop-blur-sm dark:border-white/10`}>
                      <div className="flex w-12 shrink-0 flex-col items-center">
                        <Clock size={11} className="mb-0.5 text-[var(--gray-400)]" />
                        <span className="text-[12px] font-semibold tabular-nums text-foreground">{fmtTime(s.scheduled_for)}</span>
                      </div>
                      <span className="h-8 w-px bg-white/30 dark:bg-white/10" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[s.status] || "bg-slate-400"}`} />
                          <span className="truncate text-[11px] font-semibold text-foreground">{s.patient_name}</span>
                          <span className="shrink-0 text-[10px] text-[var(--gray-400)]">{s.custom_id}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-3.5">
                          {(s.procedure_names?.length > 0 || s.procedure) && (
                            <span className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                              <Scissors size={9} className="text-violet-400" />
                              {(s.procedure_names || []).slice(0, 2).join(", ") || s.procedure}
                            </span>
                          )}
                          {s.surgeon_names?.length > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                              <Stethoscope size={9} className="text-emerald-400" />
                              {s.surgeon_names[0].name}
                              {s.surgeon_names.length > 1 && ` +${s.surgeon_names.length - 1}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        {(() => { const p = calcPrice(s); return p ? (
                          <span className="text-[10px] font-semibold tabular-nums text-teal-600 dark:text-teal-400">{fmtMT(p.total)}</span>
                        ) : null })()}
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${PRIORITY_BADGE[s.priority] || "border-slate-200 bg-slate-50 text-slate-500"}`}>
                          {PRIORITY_LABEL[s.priority] || s.priority || "—"}
                        </span>
                        <span className="text-[10px] font-medium text-[var(--gray-500)]">
                          {STATUS_LABEL[s.status] || s.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

      </div>
    </AppLayout>
  )
}
