"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Scissors,
} from "lucide-react"
import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"

const GLASS = "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

type Surgery = {
  id: number
  custom_id?: string
  patient_name?: string
  surgeon_name?: string
  surgeon_names?: { id: number; name: string }[]
  specialty_name?: string
  ward_name?: string
  procedure?: string
  procedure_names?: string[]
  status: string
  surgery_size?: string
  priority?: string
  scheduled_for?: string | null
  started_at?: string | null
  ended_at?: string | null
  completed_at?: string | null
  estimated_price?: string
  procedures_price_total?: string
  vat_percentage?: string
  _source: "small" | "large" | "generic"
}

const DONE_STATUSES = new Set([
  "SURGERY_COMPLETED", "CONCLUIDA", "CLOSED", "IN_RECOVERY", "RECOVERED",
  "REPORT_PENDING", "BILLING_PENDING",
])
const CANCELLED_STATUSES = new Set(["CANCELADA", "CANCELLED"])

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho", REQUESTED: "Solicitada", UNDER_ASSESSMENT: "Em avaliação",
  FINANCIAL_PENDING: "Fin. pendente", AUTHORIZED: "Autorizada", AGENDADA: "Agendada",
  PATIENT_CHECKED_IN: "Check-in", PREOPERATIVE_PREPARATION: "Pré-op.", PREPARED: "Preparada",
  IN_OPERATING_ROOM: "Em sala", ANESTHESIA_STARTED: "Anestesia", SURGERY_STARTED: "Em curso",
  EM_ANDAMENTO: "Em andamento", SURGERY_COMPLETED: "Realizada", CONCLUIDA: "Concluída",
  IN_RECOVERY: "Recuperação", RECOVERED: "Recuperado", REPORT_PENDING: "Rel. pendente",
  BILLING_PENDING: "Fat. pendente", CLOSED: "Fechada", POSTPONED: "Adiada",
  CANCELADA: "Cancelada", CANCELLED: "Cancelada",
}

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
  IN_OPERATING_ROOM: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  ANESTHESIA_STARTED: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
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
  CANCELLED: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
}

const STATUS_ACCENT: Record<string, string> = {
  AGENDADA: "bg-violet-400", AUTHORIZED: "bg-indigo-400",
  IN_OPERATING_ROOM: "bg-sky-500", SURGERY_STARTED: "bg-sky-500", EM_ANDAMENTO: "bg-sky-500",
  SURGERY_COMPLETED: "bg-teal-400", CONCLUIDA: "bg-emerald-400",
  CANCELADA: "bg-rose-400", CANCELLED: "bg-rose-400", POSTPONED: "bg-purple-400",
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

function fmtDate(value: any) {
  if (!value) return null
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(value))
  } catch { return String(value) }
}

function fmtMT(v: any) {
  const n = parseFloat(v || "0")
  if (!n) return null
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2 }) + " MT"
}

function detailHref(item: Surgery) {
  if (item._source === "large") return `/surgery/large-surgeries/${item.id}`
  if (item._source === "small") return `/surgery/small-surgeries/${item.id}`
  return item.surgery_size === "GRANDE"
    ? `/surgery/large-surgeries/${item.id}`
    : `/surgery/small-surgeries/${item.id}`
}

function SurgeryCard({ item, onMarkDone, marking }: {
  item: Surgery
  onMarkDone?: (item: Surgery) => void
  marking: boolean
}) {
  const isDone = DONE_STATUSES.has(item.status)
  const accent = STATUS_ACCENT[item.status] ?? (isDone ? "bg-emerald-400" : "bg-slate-400")
  const statusCls = STATUS_COLOR[item.status] ?? "bg-gray-100 text-gray-600"

  const procNames = item.procedure_names?.length
    ? item.procedure_names.slice(0, 2).join(", ") + (item.procedure_names.length > 2 ? ` +${item.procedure_names.length - 2}` : "")
    : item.procedure || "—"

  return (
    <Link href={detailHref(item)} className="group flex h-full flex-col">
      <div className={`${GLASS} relative flex h-full min-h-[108px] flex-col overflow-hidden p-3 transition-all hover:border-slate-300 hover:shadow-md dark:hover:border-white/20`}>
        <span className={`absolute left-0 top-0 h-full w-1 ${accent} opacity-70 group-hover:opacity-100`} />
        <div className="flex flex-1 flex-col pl-3">

          {/* badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
              {item.custom_id || `#${item.id}`}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${statusCls}`}>
              {STATUS_LABEL[item.status] || item.status}
            </span>
            {item.surgery_size && SIZE_LABEL[item.surgery_size] && (
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${SIZE_BADGE[item.surgery_size] || "border-gray-200 bg-gray-50 text-gray-600"}`}>
                {SIZE_LABEL[item.surgery_size]}
              </span>
            )}
            {item.priority && (
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${PRIORITY_BADGE[item.priority] || "border-slate-200 bg-slate-50 text-slate-600"}`}>
                {PRIORITY_LABEL[item.priority] || item.priority}
              </span>
            )}
            <ChevronRight size={11} className="ml-auto shrink-0 text-[var(--gray-400)] transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
          </div>

          {/* patient + procedure */}
          <p className="mt-1.5 truncate text-[13px] font-semibold text-foreground">{item.patient_name || "—"}</p>
          <p className="mt-0.5 truncate text-[11px] text-[var(--gray-500)]">{procNames}</p>

          {/* date pinned to bottom */}
          <div className="mt-auto pt-2 flex items-center gap-1 text-[10px] text-[var(--gray-400)]">
            <CalendarClock size={9} className="shrink-0" />
            {item.scheduled_for ? fmtDate(item.scheduled_for) : "—"}
          </div>
        </div>
      </div>
    </Link>
  )
}

function emptyMsg(tab: "pending" | "done") {
  return (
    <div className="rounded-xl border border-white/20 bg-white/20 px-4 py-8 text-center text-sm text-[var(--gray-500)] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]">
      {tab === "pending"
        ? "Nenhuma cirurgia pendente."
        : "Nenhuma cirurgia realizada ainda."}
    </div>
  )
}

export default function SurgeryRequestsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [surgeries, setSurgeries] = useState<Surgery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<"pending" | "done">("pending")
  const [markingId, setMarkingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [small, large] = await Promise.all([
        apiFetch<any[]>("/surgery/small_surgery/", { clientCache: safeRefreshToken === 0 }),
        apiFetch<any[]>("/surgery/large_surgery/", { clientCache: safeRefreshToken === 0 }),
      ])
      const smallItems: Surgery[] = (Array.isArray(small) ? small : (small as any).results ?? [])
        .map((s: any) => ({ ...s, _source: "small" as const }))
      const largeItems: Surgery[] = (Array.isArray(large) ? large : (large as any).results ?? [])
        .map((s: any) => ({ ...s, _source: "large" as const }))

      // dedupe by id (surgery/ returns same as small+large combined)
      const all = [...smallItems, ...largeItems]
      const seen = new Set<number>()
      const deduped = all.filter((s) => {
        if (seen.has(s.id)) return false
        seen.add(s.id)
        return true
      })
      setSurgeries(deduped)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar cirurgias.")
    } finally {
      setLoading(false)
    }
  }, [safeRefreshToken])

  useEffect(() => { load() }, [load])

  const markDone = useCallback(async (item: Surgery) => {
    setMarkingId(item.id)
    try {
      const endpoint =
        item._source === "small" ? `/surgery/small_surgery/${item.id}/`
        : item._source === "large" ? `/surgery/large_surgery/${item.id}/`
        : `/surgery/surgery/${item.id}/`
      await apiFetch(endpoint, {
        method: "PATCH",
        body: JSON.stringify({ status: "SURGERY_COMPLETED" }),
      })
      setSurgeries((prev) =>
        prev.map((s) => s.id === item.id && s._source === item._source
          ? { ...s, status: "SURGERY_COMPLETED" }
          : s
        )
      )
    } catch (e: any) {
      alert(e?.message || "Erro ao marcar cirurgia.")
    } finally {
      setMarkingId(null)
    }
  }, [])

  const pending = surgeries.filter(
    (s) => !DONE_STATUSES.has(s.status) && !CANCELLED_STATUSES.has(s.status)
  )
  const done = surgeries.filter((s) => DONE_STATUSES.has(s.status))
  const cancelled = surgeries.filter((s) => CANCELLED_STATUSES.has(s.status))

  const displayed = tab === "pending" ? pending : done

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-7xl space-y-3 px-1">
        {/* header */}
        <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-500" />
          <div className="flex items-center justify-between gap-3 px-4 py-3 pl-5">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                <Link href="/surgery" className="transition-colors hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">Cirurgias marcadas</span>
              </div>
              <h1 className="mt-0.5 font-display text-base font-semibold text-foreground">
                Cirurgias marcadas
              </h1>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[var(--gray-500)]">
              <Activity size={13} />
              <span>{surgeries.length} total</span>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 px-4 py-3 text-sm text-amber-800 backdrop-blur-sm">
            {error}
          </div>
        ) : null}

        {/* summary chips */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200/70 bg-sky-50/80 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300">
            <Clock3 size={11} />
            {loading ? "..." : pending.length} pendente{pending.length !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/70 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
            <CheckCircle2 size={11} />
            {loading ? "..." : done.length} realizada{done.length !== 1 ? "s" : ""}
          </span>
          {cancelled.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200/70 bg-rose-50/80 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
              {cancelled.length} cancelada{cancelled.length !== 1 ? "s" : ""}
            </span>
          ) : null}
        </div>

        {/* tabs */}
        <div className="flex gap-1 rounded-xl border border-white/20 bg-white/20 p-1 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]">
          {(["pending", "done"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                tab === t
                  ? "bg-white/70 shadow-sm text-foreground dark:bg-white/10"
                  : "text-[var(--gray-500)] hover:text-foreground"
              }`}
            >
              {t === "pending" ? `Pendente (${pending.length})` : `Realizada (${done.length})`}
            </button>
          ))}
        </div>

        {/* list */}
        {loading ? (
          <div className="flex h-24 items-center justify-center text-sm text-[var(--gray-500)]">
            Carregando...
          </div>
        ) : displayed.length === 0 ? (
          emptyMsg(tab)
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {displayed.map((item) => (
              <SurgeryCard
                key={`${item._source}-${item.id}`}
                item={item}
                onMarkDone={tab === "pending" ? markDone : undefined}
                marking={markingId === item.id}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
