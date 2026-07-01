"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Scissors,
  User,
} from "lucide-react"
import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"

type Surgery = {
  id: number
  custom_id?: string
  patient_name?: string
  surgeon_name?: string
  procedure?: string
  procedure_names?: string[]
  status: string
  surgery_size?: string
  priority?: string
  scheduled_for?: string | null
  started_at?: string | null
  ended_at?: string | null
  completed_at?: string | null
  description?: string
  _source: "small" | "large" | "generic"
}

const DONE_STATUSES = new Set([
  "SURGERY_COMPLETED", "CONCLUIDA", "CLOSED", "IN_RECOVERY", "RECOVERED",
  "REPORT_PENDING", "BILLING_PENDING",
])

const CANCELLED_STATUSES = new Set(["CANCELADA", "CANCELLED"])

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  REQUESTED: "Solicitada",
  UNDER_ASSESSMENT: "Em avaliação",
  FINANCIAL_PENDING: "Financeiro pendente",
  AUTHORIZED: "Autorizada",
  AGENDADA: "Agendada",
  PATIENT_CHECKED_IN: "Check-in",
  PREOPERATIVE_PREPARATION: "Pré-op.",
  PREPARED: "Preparada",
  IN_OPERATING_ROOM: "Em sala",
  ANESTHESIA_STARTED: "Anestesia",
  SURGERY_STARTED: "Em curso",
  EM_ANDAMENTO: "Em andamento",
  SURGERY_COMPLETED: "Realizada",
  CONCLUIDA: "Concluída",
  IN_RECOVERY: "Recuperação",
  RECOVERED: "Recuperado",
  REPORT_PENDING: "Rel. pendente",
  BILLING_PENDING: "Fat. pendente",
  CLOSED: "Fechada",
  POSTPONED: "Adiada",
  CANCELADA: "Cancelada",
  CANCELLED: "Cancelada",
}

const PRIORITY_LABEL: Record<string, string> = {
  EMERGENCY: "Emergência",
  URGENT: "Urgente",
  ELECTIVE: "Eletiva",
  SCHEDULED: "Agendada",
}

const SIZE_LABEL: Record<string, string> = {
  PEQUENA: "Pequena",
  GRANDE: "Grande",
  MINOR: "Menor",
  MAJOR: "Grande",
}

function statusBadge(status: string) {
  if (DONE_STATUSES.has(status))
    return "border-emerald-300/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
  if (CANCELLED_STATUSES.has(status))
    return "border-rose-300/70 bg-rose-50/80 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300"
  if (status === "IN_OPERATING_ROOM" || status === "SURGERY_STARTED" || status === "EM_ANDAMENTO")
    return "border-sky-300/70 bg-sky-50/80 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300"
  if (status === "AUTHORIZED" || status === "AGENDADA")
    return "border-violet-300/70 bg-violet-50/80 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300"
  return "border-amber-300/70 bg-amber-50/80 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
}

function priorityBadge(priority: string) {
  if (priority === "EMERGENCY")
    return "border-red-300/70 bg-red-50/80 text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300"
  if (priority === "URGENT")
    return "border-orange-300/70 bg-orange-50/80 text-orange-700 dark:border-orange-700/30 dark:bg-orange-900/20 dark:text-orange-300"
  return "border-slate-200/70 bg-slate-50/80 text-slate-600 dark:border-slate-700/30 dark:bg-slate-900/20 dark:text-slate-400"
}

function fmtDate(value: any) {
  if (!value) return null
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function SurgeryCard({
  item,
  onMarkDone,
  marking,
}: {
  item: Surgery
  onMarkDone?: (item: Surgery) => void
  marking: boolean
}) {
  const isDone = DONE_STATUSES.has(item.status)
  const procedure = item.procedure || item.procedure_names?.[0] || "—"
  const size = SIZE_LABEL[item.surgery_size || ""] || item.surgery_size || "—"
  const editHref = item._source === "small"
    ? `/surgery/small-surgeries/${item.id}`
    : item._source === "large"
      ? `/surgery/large-surgeries/${item.id}`
      : `/surgery/surgeries/${item.id}`

  return (
    <article className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
      <span className={`absolute left-0 top-0 h-full w-1 ${isDone ? "bg-emerald-400" : "bg-sky-400"}`} />
      <div className="flex min-w-0 items-start gap-3 px-3 py-2.5 pl-4">
        <div className="min-w-0 flex-1">
          {/* header */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[var(--gray-500)]">
              {item.custom_id || `#${item.id}`}
            </span>
            <span className={`rounded-full border px-1.5 py-px text-[9px] font-semibold ${statusBadge(item.status)}`}>
              {STATUS_LABEL[item.status] || item.status}
            </span>
            {item.priority ? (
              <span className={`rounded-full border px-1.5 py-px text-[9px] font-semibold ${priorityBadge(item.priority)}`}>
                {PRIORITY_LABEL[item.priority] || item.priority}
              </span>
            ) : null}
            <span className="rounded-full border border-slate-200/70 bg-slate-50/80 px-1.5 py-px text-[9px] font-semibold text-slate-600 dark:border-slate-700/30 dark:bg-slate-900/20 dark:text-slate-400">
              {size}
            </span>
          </div>

          {/* patient + procedure */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {item.patient_name ? (
              <span className="flex items-center gap-1 text-[12px] font-semibold text-[var(--text)]">
                <User size={11} className="shrink-0 text-sky-500" />
                {item.patient_name}
              </span>
            ) : null}
            {procedure !== "—" ? (
              <span className="flex items-center gap-1 text-[11px] text-[var(--gray-500)]">
                <Scissors size={10} className="shrink-0" />
                {procedure}
              </span>
            ) : null}
          </div>

          {/* dates */}
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {item.scheduled_for ? (
              <span className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                <CalendarClock size={9} className="shrink-0" />
                Agendada: {fmtDate(item.scheduled_for)}
              </span>
            ) : null}
            {isDone && item.ended_at ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={9} className="shrink-0" />
                Concluída: {fmtDate(item.ended_at)}
              </span>
            ) : null}
          </div>
        </div>

        {/* actions */}
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          {!isDone && onMarkDone ? (
            <button
              onClick={() => onMarkDone(item)}
              disabled={marking}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
            >
              <CheckCircle2 size={11} />
              {marking ? "..." : "Marcar realizada"}
            </button>
          ) : null}
          <Link
            href={editHref}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-white/30 text-[var(--gray-500)] transition hover:bg-white/50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </article>
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
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA, GROUPS.RECEPCAO]}>
      <div className="mx-auto w-full max-w-5xl space-y-3 px-1">
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
          <div className="space-y-2">
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
