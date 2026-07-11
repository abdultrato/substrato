"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, ChevronRight, Search, X, XCircle } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MoneyValue from "@/components/ui/MoneyValue"
import { apiFetch } from "@/lib/api"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS } from "@/lib/rbac"

type CreditNoteRow = {
  id: number
  custom_id?: string
  invoice_code?: string
  invoice_status?: string
  consultation_code?: string | null
  patient_name?: string | null
  amount?: string | number
  reason?: string
  status?: string
  status_display?: string
  requested_by_name?: string | null
  reviewed_by_name?: string | null
  decision_note?: string
  created_at?: string
  reviewed_at?: string
}

type Decision = "approve" | "reject"

const STATUS_STYLES: Record<string, string> = {
  PEND: "border-amber-300/50 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  APRO: "border-emerald-300/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  REJE: "border-red-300/50 bg-red-500/15 text-red-600 dark:text-red-400",
  CANC: "border-slate-300/50 bg-slate-500/15 text-slate-600 dark:text-slate-300",
}

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

// Normaliza para busca: minúsculas + remove acentos.
function norm(value: any): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

// Constrói o "haystack" pesquisável de um pedido a partir dos campos relevantes.
function rowHaystack(r: CreditNoteRow): string {
  return norm(
    [
      r.custom_id,
      r.id,
      r.invoice_code,
      r.invoice_status,
      r.consultation_code,
      r.patient_name,
      r.amount,
      r.reason,
      r.status,
      r.status_display,
      r.requested_by_name,
      r.reviewed_by_name,
      r.decision_note,
      fmtDate(r.created_at),
      fmtDate(r.reviewed_at),
    ].join("  ")
  )
}

// Motor de busca: divide a consulta em termos e exige que TODOS estejam presentes (AND).
function filterRows(rows: CreditNoteRow[], query: string): CreditNoteRow[] {
  const terms = norm(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return rows
  return rows.filter((r) => {
    const hay = rowHaystack(r)
    return terms.every((term) => hay.includes(term))
  })
}

async function loadCreditNotes(status: string): Promise<CreditNoteRow[]> {
  const query = status ? `?status=${status}&ordering=-created_at` : "?ordering=-created_at"
  const res = await apiFetch<any>(`/billing/credit-note-request/${query}`, { clientCache: false })
  const list = (res?.results ?? res) || []
  return Array.isArray(list) ? list : []
}

export default function CreditNotesQueuePage() {
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [loadingPending, setLoadingPending] = useState(true)
  const [loadingDecided, setLoadingDecided] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [pendingRows, setPendingRows] = useState<CreditNoteRow[]>([])
  const [approvedRows, setApprovedRows] = useState<CreditNoteRow[]>([])
  const [rejectedRows, setRejectedRows] = useState<CreditNoteRow[]>([])

  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState<"" | "PEND" | "APRO" | "REJE">("")

  const showPending = statusFilter === "" || statusFilter === "PEND"
  const showApproved = statusFilter === "" || statusFilter === "APRO"
  const showRejected = statusFilter === "" || statusFilter === "REJE"

  const filteredPending = useMemo(() => filterRows(pendingRows, search), [pendingRows, search])
  const filteredApproved = useMemo(() => filterRows(approvedRows, search), [approvedRows, search])
  const filteredRejected = useMemo(() => filterRows(rejectedRows, search), [rejectedRows, search])
  const totalMatches = filteredPending.length + filteredApproved.length + filteredRejected.length

  // Limite de itens exibidos por secção (1–999).
  const pendingShown = useMemo(() => filteredPending.slice(0, pageSize), [filteredPending, pageSize])
  const approvedShown = useMemo(() => filteredApproved.slice(0, pageSize), [filteredApproved, pageSize])
  const rejectedShown = useMemo(() => filteredRejected.slice(0, pageSize), [filteredRejected, pageSize])

  const [decisionRow, setDecisionRow] = useState<CreditNoteRow | null>(null)
  const [decision, setDecision] = useState<Decision>("approve")
  const [decisionNote, setDecisionNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [decisionError, setDecisionError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    try {
      setErro(null)
      setLoadingPending(true)
      setLoadingDecided(true)
      const [pending, approved, rejected] = await Promise.all([
        loadCreditNotes("PEND"),
        loadCreditNotes("APRO"),
        loadCreditNotes("REJE"),
      ])
      setPendingRows(pending)
      setApprovedRows(approved)
      setRejectedRows(rejected)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar pedidos de nota de crédito."))
    } finally {
      setLoadingPending(false)
      setLoadingDecided(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll, safeRefreshToken])

  const openDecision = useCallback((row: CreditNoteRow, kind: Decision) => {
    setDecisionRow(row)
    setDecision(kind)
    setDecisionNote("")
    setDecisionError(null)
  }, [])

  const closeDecision = useCallback(() => {
    if (submitting) return
    setDecisionRow(null)
    setDecisionNote("")
    setDecisionError(null)
  }, [submitting])

  const confirmDecision = useCallback(async () => {
    if (!decisionRow?.id) return
    setSubmitting(true)
    setDecisionError(null)
    try {
      await apiFetch(`/billing/credit-note-request/${decisionRow.id}/${decision}/`, {
        method: "POST",
        body: JSON.stringify({ note: decisionNote.trim() }),
      })
      setDecisionRow(null)
      setDecisionNote("")
      await loadAll()
    } catch (e: any) {
      setDecisionError(e?.message || "Falha ao registar a decisão.")
    } finally {
      setSubmitting(false)
    }
  }, [decision, decisionNote, decisionRow?.id, loadAll])

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.CONTABILIDADE]}>
      <div className="space-y-4">
        <PageHeader title="Notas de crédito" />

        {/* Motor de busca */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 p-2 pl-3.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <span className="absolute left-0 top-0 h-full w-1.5 bg-[var(--primary-500)]" />
          <div className="flex flex-nowrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray-400)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar…"
                className="w-full rounded-lg border border-border bg-background/60 py-1.5 pl-7 pr-6 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:w-72 focus:ring-2 focus:ring-violet-500/40 transition-all"
              />
              {search ? (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--gray-500)] transition hover:bg-white/40 hover:text-[var(--text)] dark:hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <select
              aria-label="Estado"
              title="Filtrar por estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="w-32 shrink-0 rounded-md border border-white/30 bg-white/80 px-2.5 py-2 text-sm text-[var(--text)] shadow-sm backdrop-blur-sm transition-colors duration-150 hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] dark:border-white/10 dark:bg-slate-800"
            >
              <option value="">Todos os estados</option>
              <option value="PEND">Pendentes</option>
              <option value="APRO">Aprovadas</option>
              <option value="REJE">Rejeitadas</option>
            </select>
            <input
              type="number"
              inputMode="numeric"
              aria-label="Por página"
              title="Itens por página (1–999)"
              min={1}
              max={999}
              value={pageSize}
              onChange={(e) => {
                const raw = Number(e.target.value)
                if (!Number.isFinite(raw)) return
                setPageSize(Math.max(1, Math.min(999, Math.round(raw))))
              }}
              className="w-20 shrink-0 rounded-md border border-white/30 bg-white/80 px-2.5 py-2 text-sm text-[var(--text)] shadow-sm backdrop-blur-sm transition-colors duration-150 hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] dark:border-white/10 dark:bg-slate-800"
            />
          </div>
        </div>

        {erro ? (
          <div className="rounded-2xl border border-amber-300/50 bg-amber-500/15 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            {erro}
          </div>
        ) : null}

        {/* Fila de pendentes */}
        {showPending ? (
          <Card title="Pedidos pendentes" subtitle="A aguardar decisão da Contabilidade." glass>
            {loadingPending ? (
              <div className="text-sm text-gray-500">Carregando...</div>
            ) : filteredPending.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/30 bg-white/5 px-3 py-6 text-center text-sm text-[var(--gray-500)] dark:border-white/10">
                {search ? "Nenhum pedido pendente corresponde à busca." : "Nenhum pedido pendente."}
              </div>
            ) : (
              <CreditNoteTable rows={pendingShown} onDecide={openDecision} showActions />
            )}
          </Card>
        ) : null}

        {/* Aprovadas e rejeitadas */}
        <div className={`grid gap-4 ${showApproved && showRejected ? "lg:grid-cols-2" : "grid-cols-1"}`}>
          {showApproved ? (
          <DecidedSection
            title="Aprovadas"
            icon={<CheckCircle2 size={14} className="text-emerald-600" />}
            rows={approvedShown}
            loading={loadingDecided}
            emptyMsg={search ? "Nenhuma aprovada corresponde à busca." : "Nenhuma nota de crédito aprovada."}
            tone="emerald"
          />
          ) : null}
          {showRejected ? (
          <DecidedSection
            title="Rejeitadas"
            icon={<XCircle size={14} className="text-red-500" />}
            rows={rejectedShown}
            loading={loadingDecided}
            emptyMsg={search ? "Nenhuma rejeitada corresponde à busca." : "Nenhuma nota de crédito rejeitada."}
            tone="red"
          />
          ) : null}
        </div>

        <p className="pl-0.5 text-[11px] text-[var(--gray-500)]">
          {totalMatches} resultado(s) · {filteredPending.length} pendente(s) · {filteredApproved.length} aprovada(s) · {filteredRejected.length} rejeitada(s) · {pageSize}/secção
        </p>
      </div>

      {decisionRow ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={closeDecision} />
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {decision === "approve" ? "Aprovar nota de crédito" : "Rejeitar nota de crédito"}
              </h3>
              <p className="mt-1 text-xs text-[var(--gray-600)]">
                {decisionRow.custom_id} · {decisionRow.invoice_code} · {decisionRow.patient_name || "-"}
              </p>
            </div>

            <div className="space-y-3 px-4 py-4">
              <label className="space-y-1">
                <span className="text-xs text-[var(--gray-600)]">Nota da decisão (opcional)</span>
                <textarea
                  value={decisionNote}
                  onChange={(e) => {
                    setDecisionNote(e.target.value)
                    if (decisionError) setDecisionError(null)
                  }}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  autoFocus
                />
              </label>
              {decisionError ? (
                <div className="rounded-xl border border-amber-300/50 bg-amber-500/15 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                  {decisionError}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
              <button
                type="button"
                onClick={closeDecision}
                disabled={submitting}
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDecision}
                disabled={submitting}
                className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-60 ${
                  decision === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submitting ? "A processar..." : decision === "approve" ? "Aprovar" : "Rejeitar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  )
}

function CreditNoteTable({
  rows,
  onDecide,
  showActions = false,
}: {
  rows: CreditNoteRow[]
  onDecide?: (row: CreditNoteRow, kind: Decision) => void
  showActions?: boolean
}) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {rows.map((r) => (
        <div
          key={r.id}
          className="relative overflow-hidden rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 pl-3 shadow-sm backdrop-blur-sm transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
        >
          <span className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <span className="text-xs font-bold text-[var(--text)]">{r.custom_id || `#${r.id}`}</span>
              {r.invoice_code ? (
                <span className="ml-1 text-[10px] font-medium text-[var(--gray-500)]">{r.invoice_code}</span>
              ) : null}
            </div>
            <MoneyValue value={r.amount} className="shrink-0 text-xs font-bold text-[var(--text)]" />
          </div>

          {r.patient_name ? (
            <p className="mt-0.5 truncate text-[11px] font-medium text-black dark:text-white">{r.patient_name}</p>
          ) : null}
          {r.consultation_code ? (
            <p className="text-[10px] text-[var(--gray-500)]">{r.consultation_code}</p>
          ) : null}
          {r.reason ? (
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[var(--gray-600)] dark:text-[var(--gray-300)]">
              {r.reason}
            </p>
          ) : null}

          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-[var(--gray-500)]">
            <span>{fmtDate(r.created_at)}</span>
            {r.requested_by_name ? <span>· {r.requested_by_name}</span> : null}
          </div>

          {showActions ? (
            <div className="mt-1.5 flex gap-1 border-t border-white/20 pt-1.5 dark:border-white/10">
              <button
                type="button"
                onClick={() => onDecide?.(r, "approve")}
                className="inline-flex flex-1 items-center justify-center rounded-md border border-emerald-300/50 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 backdrop-blur-sm transition hover:bg-emerald-500/25 dark:text-emerald-400"
              >
                Aprovar
              </button>
              <button
                type="button"
                onClick={() => onDecide?.(r, "reject")}
                className="inline-flex flex-1 items-center justify-center rounded-md border border-red-300/50 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-600 backdrop-blur-sm transition hover:bg-red-500/25 dark:text-red-400"
              >
                Rejeitar
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function DecidedSection({
  title,
  icon,
  rows,
  loading,
  emptyMsg,
  tone,
}: {
  title: string
  icon: React.ReactNode
  rows: CreditNoteRow[]
  loading: boolean
  emptyMsg: string
  tone: "emerald" | "red"
}) {
  const accentColor = tone === "emerald" ? "bg-emerald-500" : "bg-red-500"
  const textColor = tone === "emerald" ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
  const subTextColor = "text-[var(--gray-600)] dark:text-[var(--gray-300)]"

  return (
    <section className="rounded-xl border border-white/20 bg-white/10 p-2 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-2 pb-2">
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/30 dark:bg-slate-800">{icon}</div>
        <p className="text-xs font-semibold text-[var(--text)]">{title}</p>
        {!loading && rows.length > 0 ? (
          <span className="ml-auto rounded-full border border-white/25 bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-[var(--gray-700)] dark:border-white/10 dark:bg-white/10 dark:text-[var(--gray-200)]">
            {rows.length}
          </span>
        ) : null}
      </div>

      {loading ? (
        <p className="text-[11px] text-[var(--gray-500)]">Carregando...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] px-3 py-4 text-center text-[11px] text-[var(--gray-500)]">
          {emptyMsg}
        </div>
      ) : (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/accounting/credit-notes/${r.id}`}
              className="group relative block overflow-hidden rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 pl-3 shadow-sm backdrop-blur-sm transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
            >
              <span className={`absolute left-0 top-0 h-full w-1 ${accentColor}`} />
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <span className={`text-xs font-bold ${textColor}`}>{r.custom_id || `#${r.id}`}</span>
                  {r.invoice_code ? (
                    <span className="ml-1 text-[10px] font-medium text-[var(--gray-500)]">{r.invoice_code}</span>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <MoneyValue value={r.amount} className={`text-xs font-bold ${textColor}`} />
                  <ChevronRight size={14} className="text-[var(--gray-400)] transition group-hover:text-[var(--primary-600)]" />
                </div>
              </div>
              {r.patient_name ? (
                <p className="mt-0.5 truncate text-[11px] font-medium text-black dark:text-white">{r.patient_name}</p>
              ) : null}
              {r.reason ? <p className={`mt-0.5 line-clamp-2 text-[10px] leading-snug ${subTextColor}`}>{r.reason}</p> : null}
              <div className={`mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] ${subTextColor}`}>
                {r.reviewed_by_name ? <span>Por: <strong>{r.reviewed_by_name}</strong></span> : null}
                {r.reviewed_at ? <span>· {fmtDate(r.reviewed_at)}</span> : null}
              </div>
              {r.decision_note ? (
                <p className={`mt-0.5 line-clamp-1 text-[10px] italic ${subTextColor}`}>&quot;{r.decision_note}&quot;</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
