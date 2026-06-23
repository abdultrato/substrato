"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { apiFetch, apiFetchList } from "@/lib/api"

type Row = Record<string, any>
type Scope = "pending" | "confirmed" | "all"

const ENDPOINT = "/clinical_laboratory/critical_notification/"
const REFRESH_MS = 25000
const OVERDUE_MIN = 30 // pending readback beyond this = escalate (patient-safety SLA)

function isHigh(r: Row) { return String(r?.result_flag || "") === "CRITICO_ALTO" }
function isLow(r: Row) { return String(r?.result_flag || "") === "CRITICO_BAIXO" }

function fmtDateTime(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function timeAgo(value: any, t: (pt: string, en: string) => string): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "-"
  const min = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000))
  if (min < 1) return t("agora mesmo", "just now")
  if (min < 60) return t(`há ${min} min`, `${min} min ago`)
  const h = Math.floor(min / 60)
  if (h < 24) return t(`há ${h} h`, `${h} h ago`)
  const days = Math.floor(h / 24)
  return t(`há ${days} d`, `${days} d ago`)
}

function minutesSince(value: any): number | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000))
}

function matchesQuery(r: Row, q: string): boolean {
  if (!q) return true
  const hay = [r?.patient_name, r?.order_code, r?.test_name, r?.field_name, r?.notified_professional, r?.result_value]
    .map((x) => String(x ?? "").toLowerCase())
    .join(" ")
  return hay.includes(q.toLowerCase())
}

// ── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone: "amber" | "rose" | "sky" | "emerald" }) {
  const tones: Record<string, string> = {
    amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/15 dark:text-amber-300",
    rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/15 dark:text-rose-300",
    sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/15 dark:text-sky-300",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/15 dark:text-emerald-300",
  }
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/70 dark:bg-white/10">{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-none tabular-nums">{value}</div>
        <div className="mt-1 truncate text-xs font-medium opacity-80">{label}</div>
      </div>
    </div>
  )
}

// ── Critical card ─────────────────────────────────────────────────────────────
function CriticalCard({ row, busy, onConfirm, t }: { row: Row; busy: boolean; onConfirm: (id: string) => void; t: (pt: string, en: string) => string }) {
  const id = String(row?.id)
  const high = isHigh(row)
  const confirmed = !!row?.readback_confirmed
  const value = String(row?.result_value || "").trim()
  const unit = String(row?.result_unit || "").trim()
  const flagLabel = String(row?.result_flag_display || row?.result_flag || "").trim()
  const prof = String(row?.notified_professional || "").trim()
  const method = String(row?.method || "").trim()
  const mins = minutesSince(row?.notified_at)
  const overdue = !confirmed && mins != null && mins >= OVERDUE_MIN

  const accent = confirmed
    ? "before:bg-emerald-400"
    : overdue
      ? "before:bg-rose-600"
      : high
        ? "before:bg-rose-500"
        : "before:bg-sky-500"
  const valueTone = confirmed ? "text-[var(--text)]" : high ? "text-rose-600 dark:text-rose-400" : "text-sky-600 dark:text-sky-400"

  return (
    <article
      className={`relative overflow-hidden rounded-xl border bg-[var(--card)] shadow-sm transition hover:shadow-md
        before:absolute before:inset-y-0 before:left-0 before:w-1.5 ${accent} ${confirmed ? "opacity-[0.92]" : ""}
        ${overdue ? "border-rose-300 ring-1 ring-rose-300/70 dark:border-rose-900/50 dark:ring-rose-900/40" : "border-[var(--border)]"}`}
    >
      <div className="flex flex-col gap-3 p-4 pl-5 sm:flex-row sm:items-center sm:justify-between">
        {/* identity + clinical context */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/clinical-laboratory/critical-results/${encodeURIComponent(id)}`}
              className="truncate text-sm font-semibold text-[var(--text)] hover:underline"
            >
              {String(row?.patient_name || "—")}
            </Link>
            {row?.order ? (
              <Link
                href={`/clinical-laboratory/orders/${encodeURIComponent(String(row.order))}`}
                className="shrink-0 rounded-md border border-[var(--border)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--primary-600)] hover:bg-[var(--gray-100)]"
                title={t("Abrir requisição", "Open requisition")}
              >
                {String(row?.order_code || `#${row.order}`)}
              </Link>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--gray-500)]">
            <span className="truncate font-medium text-[var(--gray-700)] dark:text-[var(--gray-300)]">{String(row?.test_name || "—")}</span>
            {row?.field_name ? <span className="truncate">· {String(row.field_name)}</span> : null}
            <span className="inline-flex items-center gap-1"><Clock size={11} /> {timeAgo(row?.notified_at, t)}</span>
          </div>
        </div>

        {/* the panic value */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <div className={`flex items-baseline justify-end gap-1 ${valueTone}`}>
              <span className="text-2xl font-bold leading-none tabular-nums">{value || "—"}</span>
              {unit ? <span className="text-xs font-medium opacity-80">{unit}</span> : null}
            </div>
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                high
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-300"
                  : "bg-sky-50 text-sky-700 dark:bg-sky-900/25 dark:text-sky-300"
              }`}
            >
              {high ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {flagLabel || t("Crítico", "Critical")}
            </span>
          </div>
        </div>
      </div>

      {/* footer: readback state + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--gray-50)] px-4 py-2 pl-5 dark:bg-white/[0.02]">
        {confirmed ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={14} />
            {t("Readback confirmado", "Readback confirmed")}
            {prof ? <span className="text-[var(--gray-500)]">· {prof}{method ? ` (${method})` : ""}</span> : null}
          </span>
        ) : overdue ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-80" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-600" />
            </span>
            {t(`Atrasado há ${mins} min — comunicar já`, `Overdue ${mins} min — notify now`)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            {t("Aguarda comunicação / readback", "Awaiting notification / readback")}
          </span>
        )}

        <div className="flex items-center gap-2">
          <Link
            href={`/clinical-laboratory/critical-results/${encodeURIComponent(id)}/edit`}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-medium text-[var(--gray-700)] hover:bg-[var(--gray-100)] dark:text-[var(--gray-300)]"
          >
            <Phone size={12} /> {confirmed ? t("Detalhes", "Details") : t("Comunicar", "Notify")}
          </Link>
          {!confirmed ? (
            <button
              type="button"
              onClick={() => onConfirm(id)}
              disabled={busy}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-[var(--primary-600)] px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)] disabled:opacity-60"
            >
              <CheckCircle2 size={12} />
              {busy ? t("A confirmar...", "Confirming...") : t("Confirmar readback", "Confirm readback")}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

// ── Board ─────────────────────────────────────────────────────────────────────
export default function CriticalResultsBoard() {
  useAuthGuard()
  const { t } = useLanguage()
  const qc = useQueryClient()
  const [scope, setScope] = useState<Scope>("pending")
  const [search, setSearch] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ["lab-critical-results"],
    queryFn: async () =>
      await apiFetchList<Row>(ENDPOINT, { pageSize: 200, clientCache: false }),
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  })

  const all = useMemo(() => query.data?.items ?? [], [query.data])
  const pending = useMemo(() => all.filter((r) => !r?.readback_confirmed), [all])
  const confirmed = useMemo(() => all.filter((r) => r?.readback_confirmed), [all])
  const highPending = useMemo(() => pending.filter(isHigh).length, [pending])
  const lowPending = useMemo(() => pending.filter(isLow).length, [pending])
  const overduePending = useMemo(
    () => pending.filter((r) => { const m = minutesSince(r?.notified_at); return m != null && m >= OVERDUE_MIN }).length,
    [pending],
  )
  const oldestPendingMin = useMemo(
    () => pending.reduce((mx, r) => { const m = minutesSince(r?.notified_at); return m != null && m > mx ? m : mx }, 0),
    [pending],
  )

  const base = scope === "pending" ? pending : scope === "confirmed" ? confirmed : all
  const visible = useMemo(() => {
    const list = base.filter((r) => matchesQuery(r, search))
    // Triage order: unconfirmed first; among pending the longest-waiting on top,
    // among confirmed the most recently notified on top.
    return [...list].sort((a, b) => {
      const ca = !!a?.readback_confirmed
      const cb = !!b?.readback_confirmed
      if (ca !== cb) return ca ? 1 : -1
      const ta = new Date(a?.notified_at || 0).getTime()
      const tb = new Date(b?.notified_at || 0).getTime()
      return ca ? tb - ta : ta - tb
    })
  }, [base, search])

  async function confirmReadback(id: string) {
    setBusyId(id)
    setActionError(null)
    try {
      await apiFetch(`${ENDPOINT}${encodeURIComponent(id)}/`, {
        method: "PATCH",
        body: JSON.stringify({ readback_confirmed: true }),
      })
      await qc.invalidateQueries({ queryKey: ["lab-critical-results"] })
    } catch (e: any) {
      setActionError(e?.message || t("Falha ao confirmar readback.", "Failed to confirm readback."))
    } finally {
      setBusyId(null)
    }
  }

  const tab = (key: Scope, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setScope(key)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        scope === key
          ? "bg-[var(--primary-600)] text-white shadow-sm"
          : "border border-[var(--border)] bg-[var(--card)] text-[var(--gray-700)] hover:bg-[var(--gray-100)] dark:text-[var(--gray-300)]"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${scope === key ? "bg-white/25" : "bg-[var(--gray-100)] dark:bg-white/10"}`}>{count}</span>
    </button>
  )

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-3 flex flex-col gap-2 border-b border-border pb-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
            <ShieldAlert size={18} />
          </div>
          <h1 className="font-display text-base font-semibold text-foreground">{t("Resultados críticos", "Critical results")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--gray-500)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            {t("ao vivo", "live")}
          </span>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-medium text-[var(--gray-700)] hover:bg-[var(--gray-100)] dark:text-[var(--gray-300)]"
          >
            <RefreshCw size={13} className={query.isFetching ? "animate-spin" : ""} /> {t("Atualizar", "Refresh")}
          </button>
        </div>
      </div>

      {/* Live patient-safety banner */}
      {pending.length > 0 ? (
        <div
          className={`mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${
            overduePending > 0
              ? "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/15 dark:text-amber-200"
          }`}
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${overduePending > 0 ? "bg-rose-500" : "bg-amber-400"}`} />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${overduePending > 0 ? "bg-rose-600" : "bg-amber-500"}`} />
          </span>
          <p className="min-w-0 text-sm leading-snug">
            <span className="font-semibold">
              {t(
                `${pending.length} resultado${pending.length > 1 ? "s" : ""} crítico${pending.length > 1 ? "s" : ""} aguarda${pending.length > 1 ? "m" : ""} comunicação`,
                `${pending.length} critical result${pending.length > 1 ? "s" : ""} awaiting notification`,
              )}
            </span>
            {oldestPendingMin > 0 ? (
              <span className="opacity-80"> · {t(`mais antigo há ${oldestPendingMin} min`, `oldest ${oldestPendingMin} min ago`)}</span>
            ) : null}
            {overduePending > 0 ? (
              <span className="font-semibold"> · {t(`${overduePending} atrasado${overduePending > 1 ? "s" : ""} (>${OVERDUE_MIN} min)`, `${overduePending} overdue (>${OVERDUE_MIN} min)`)}</span>
            ) : null}
          </p>
        </div>
      ) : null}

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Bell size={18} />} tone="amber" label={t("Pendentes", "Pending")} value={pending.length} />
        <StatCard icon={<ArrowUpRight size={18} />} tone="rose" label={t("Crítico alto (pendente)", "Critical high (pending)")} value={highPending} />
        <StatCard icon={<ArrowDownRight size={18} />} tone="sky" label={t("Crítico baixo (pendente)", "Critical low (pending)")} value={lowPending} />
        <StatCard icon={<CheckCircle2 size={18} />} tone="emerald" label={t("Confirmados", "Confirmed")} value={confirmed.length} />
      </div>

      {/* Controls */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {tab("pending", t("Pendentes", "Pending"), pending.length)}
          {tab("confirmed", t("Confirmados", "Confirmed"), confirmed.length)}
          {tab("all", t("Todos", "All"), all.length)}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Pesquisar paciente, requisição, exame...", "Search patient, requisition, test...")}
            className="h-9 w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring"
          />
        </div>
      </div>

      {actionError ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          {actionError}
        </div>
      ) : null}

      {/* List */}
      {query.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-xl border border-[var(--border)] bg-[var(--gray-100)] dark:bg-white/[0.03]" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {(query.error as any)?.message || t("Falha ao carregar resultados críticos.", "Failed to load critical results.")}
        </div>
      ) : visible.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-14 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
            <Activity size={22} />
          </div>
          <p className="mt-3 text-sm font-medium text-[var(--text)]">
            {scope === "pending"
              ? t("Sem resultados críticos pendentes", "No pending critical results")
              : search
                ? t("Nenhum resultado corresponde à pesquisa", "No results match your search")
                : t("Sem resultados críticos", "No critical results")}
          </p>
          {scope === "pending" ? (
            <p className="mt-1 text-xs text-[var(--gray-500)]">{t("Tudo comunicado. A fila está limpa.", "All notified. The queue is clear.")}</p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((row) => (
            <CriticalCard key={String(row.id)} row={row} busy={busyId === String(row.id)} onConfirm={confirmReadback} t={t} />
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-[11px] text-[var(--gray-400)]">
        {t("Atualiza automaticamente a cada", "Auto-refreshes every")} {REFRESH_MS / 1000}s · {t("última leitura", "last read")} {fmtDateTime(query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null)}
      </p>
    </AppLayout>
  )
}
