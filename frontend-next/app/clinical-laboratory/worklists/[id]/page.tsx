"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultItem = {
  id: number
  exam_name?: string
  exam_field_name?: string
  exam_field_unit?: string
  exam_field_type?: string
  exam_field_reference?: string
  result_value?: string | null
  status?: string
  critical_alert?: boolean
  disregard_reason?: string
  validation_date?: string
}

type Summary = {
  total: number
  pending: number
  in_analysis: number
  awaiting_validation: number
  validated: number
  disregarded: number
  disregard_awaiting_validation: number
}

type RequestInfo = {
  id: number
  custom_id?: string
  patient_name?: string
  patient_age?: string
  patient_gender?: string
  clinical_status?: string
  clinical_status_display?: string
  status?: string
  has_critical_result?: boolean
}

type RequestResults = {
  request: RequestInfo
  summary: Summary
  items: ResultItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normSt(v?: string) {
  return (v || "").trim().toLowerCase()
}

// ─── ResultRow ────────────────────────────────────────────────────────────────

function ResultRow({
  item,
  onSave,
  onValidate,
  onDisregard,
  busyId,
}: {
  item: ResultItem
  onSave: (id: number, value: string) => void
  onValidate: (id: number) => void
  onDisregard: (id: number) => void
  busyId: number | null
}) {
  const [iniciado, setIniciado] = useState(false)
  const [value, setValue] = useState(item.result_value ?? "")
  const busy = busyId === item.id

  const s = normSt(item.status)
  const isValidated = s === "validated" || s === "validado"
  const isDisregarded = s === "disregarded" || s === "desconsiderado"
  const isInAnalysis = s === "in_analysis" || s === "em_analise"
  const isSaved = s === "awaiting_validation" || s === "aguardando_validacao"
  const isPending = !isValidated && !isDisregarded && !isInAnalysis && !isSaved

  const prevValue = useRef(item.result_value)
  if (prevValue.current !== item.result_value) {
    prevValue.current = item.result_value
    setValue(item.result_value ?? "")
  }

  const examLabel =
    item.exam_name +
    (item.exam_field_name && item.exam_field_name !== item.exam_name
      ? ` — ${item.exam_field_name}`
      : "")

  // ── Validado ────────────────────────────────────────────────────────────────
  if (isValidated) {
    return (
      <div className="flex items-center gap-3 bg-emerald-50/60 px-4 py-2 dark:bg-emerald-900/10">
        <div className="min-w-0 flex-1 flex items-baseline gap-2 flex-wrap">
          <p className="text-xs font-medium text-[var(--gray-500)]">{examLabel}</p>
          <span className="text-sm font-bold text-[var(--text)]">
            {item.result_value ?? "—"}
            {item.exam_field_unit && (
              <span className="ml-0.5 text-xs font-normal text-[var(--gray-500)]">
                {item.exam_field_unit}
              </span>
            )}
          </span>
          {item.exam_field_reference && (
            <span className="text-[11px] text-[var(--gray-400)]">
              ref: {item.exam_field_reference}
            </span>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          Validado ✓
        </span>
      </div>
    )
  }

  // ── Desconsiderado ───────────────────────────────────────────────────────────
  if (isDisregarded) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 opacity-40">
        <p className="min-w-0 flex-1 text-xs font-medium line-through text-[var(--gray-500)]">
          {examLabel}
        </p>
        <span className="shrink-0 text-[11px] text-[var(--gray-400)]">Desconsiderado</span>
      </div>
    )
  }

  // ── Pendente — Iniciar / Desconsiderar ───────────────────────────────────────
  if (isPending && !iniciado) {
    return (
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="min-w-0 flex-1 flex items-baseline gap-1.5 flex-wrap">
          <p className="text-xs font-medium text-[var(--text)]">{examLabel}</p>
          {item.exam_field_unit && (
            <span className="text-[11px] text-[var(--gray-400)]">{item.exam_field_unit}</span>
          )}
          {item.exam_field_reference && (
            <span className="text-[11px] text-[var(--gray-400)]">· ref: {item.exam_field_reference}</span>
          )}
          {item.critical_alert && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
              CRÍTICO
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIniciado(true)}
            disabled={busy}
            className="rounded border border-[var(--primary-400)] bg-[var(--primary-50)] px-2.5 py-1 text-[11px] font-semibold text-[var(--primary-700)] hover:bg-[var(--primary-100)] disabled:opacity-50 dark:border-[var(--primary-500)] dark:bg-transparent dark:text-[var(--primary-400)] dark:hover:bg-[var(--primary-900)]/20"
          >
            Iniciar
          </button>
          <button
            type="button"
            onClick={() => onDisregard(item.id)}
            disabled={busy}
            className="rounded border border-amber-400 px-2.5 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/20"
          >
            {busy ? "..." : "Desconsiderar"}
          </button>
        </div>
      </div>
    )
  }

  // ── Input aberto ─────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 ${isSaved ? "bg-blue-50/40 dark:bg-blue-900/10" : ""}`}>
      {/* Nome do exame */}
      <span className="text-[11px] font-semibold text-[var(--text)]">{item.exam_name}</span>

      {/* Campo (se diferente do nome do exame) */}
      {item.exam_field_name && item.exam_field_name !== item.exam_name && (
        <span className="text-[11px] text-[var(--gray-500)]">{item.exam_field_name}</span>
      )}

      {/* Unidade */}
      {item.exam_field_unit && (
        <span className="text-[10px] text-[var(--gray-400)]">{item.exam_field_unit}</span>
      )}

      {/* Referência */}
      {item.exam_field_reference && (
        <span className="text-[10px] text-[var(--gray-400)]">ref: {item.exam_field_reference}</span>
      )}

      {item.critical_alert && (
        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">CRÍTICO</span>
      )}

      {/* Separador visual antes do input */}
      <span className="text-[var(--gray-300)]">→</span>

      {/* Input compacto */}
      <input
        type={item.exam_field_type === "NUMERIC" ? "number" : "text"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="—"
        className={`h-6 rounded border border-[var(--border)] bg-[var(--card)] px-2 text-xs text-[var(--text)] focus:border-[var(--primary-400)] focus:outline-none ${
          item.exam_field_type === "NUMERIC" ? "w-20" : "w-32"
        }`}
      />

      <button
        type="button"
        onClick={() => onSave(item.id, value)}
        disabled={busy || !value.trim()}
        className="h-6 rounded border border-[var(--border)] px-2 text-[10px] font-medium text-[var(--gray-700)] hover:bg-[var(--gray-100)] disabled:opacity-50 dark:text-[var(--gray-300)]"
      >
        {busy && !isSaved ? "..." : "Gravar"}
      </button>

      {isSaved && (
        <>
          <button
            type="button"
            onClick={() => onValidate(item.id)}
            disabled={busy}
            className="h-6 rounded bg-emerald-600 px-2 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "..." : "Validar"}
          </button>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            Ag. validação
          </span>
        </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorklistDetailPage() {
  const params = useParams()
  const requestId = params?.id as string

  const [data, setData] = useState<RequestResults | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyItemId, setBusyItemId] = useState<number | null>(null)
  const [busyAll, setBusyAll] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function fetchData(isInitial = false) {
    if (isInitial) setInitialLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const result: RequestResults = await apiFetch(
        `/clinical/labrequest/${requestId}/result-items/`,
        { method: "GET", clientCache: false },
      )
      setData(result)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar requisição.")
    } finally {
      if (isInitial) setInitialLoading(false)
      else setRefreshing(false)
    }
  }

  useEffect(() => {
    if (requestId) fetchData(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  async function handleSave(itemId: number, value: string) {
    setBusyItemId(itemId)
    setError(null)
    try {
      await apiFetch(`/clinical/resultitem/${itemId}/save-result/`, {
        method: "POST",
        body: JSON.stringify({ result_value: value }),
      })
      await fetchData()
    } catch (e: any) {
      setError(e?.message || "Falha ao gravar resultado.")
    } finally {
      setBusyItemId(null)
    }
  }

  async function handleValidateItem(itemId: number) {
    setBusyItemId(itemId)
    setError(null)
    try {
      await apiFetch(`/clinical/resultitem/${itemId}/validate-result/`, { method: "POST" })
      await fetchData()
    } catch (e: any) {
      setError(e?.message || "Falha ao validar resultado.")
    } finally {
      setBusyItemId(null)
    }
  }

  async function handleDisregard(itemId: number) {
    setBusyItemId(itemId)
    setError(null)
    try {
      await apiFetch(`/clinical/resultitem/${itemId}/disregard-result/`, {
        method: "POST",
        body: JSON.stringify({ reason: "Campo sem resultado aplicável." }),
      })
      await fetchData()
    } catch (e: any) {
      setError(e?.message || "Falha ao desconsiderar campo.")
    } finally {
      setBusyItemId(null)
    }
  }

  async function handleValidateAll() {
    setBusyAll(true)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${requestId}/validate-results/`, { method: "POST" })
      setFeedback("Todos os resultados foram validados. Requisição enviada para Laudos.")
      await fetchData()
    } catch (e: any) {
      setError(e?.message || "Falha ao validar resultados.")
    } finally {
      setBusyAll(false)
    }
  }

  const req = data?.request
  const summary = data?.summary
  const allValidated =
    summary
      ? summary.validated + summary.disregarded === summary.total && summary.total > 0
      : false
  const canValidateAll =
    summary
      ? summary.awaiting_validation > 0 || summary.disregard_awaiting_validation > 0
      : false
  const pct =
    summary && summary.total > 0
      ? Math.round(((summary.validated + summary.disregarded) / summary.total) * 100)
      : 0
  const statusLabel = getClinicalStatusLabel(req?.clinical_status, req?.clinical_status_display)

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-3">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[var(--gray-500)]">
          <Link
            href="/clinical-laboratory/worklists"
            className="hover:text-[var(--primary-600)] hover:underline"
          >
            Lista de Trabalho
          </Link>
          <span>›</span>
          <span className="font-medium text-[var(--text)]">
            {req?.custom_id ?? `#${requestId}`}
          </span>
        </nav>

        {/* Cartão do paciente */}
        {req && (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-[var(--gray-500)]">
                    {req.custom_id}
                  </span>
                  {req.has_critical_result && (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      CRÍTICO
                    </span>
                  )}
                  {statusLabel && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      {statusLabel}
                    </span>
                  )}
                </div>
                <h1 className="mt-1 text-lg font-bold text-[var(--text)]">
                  {req.patient_name}
                </h1>
                {(req.patient_age || req.patient_gender) && (
                  <p className="mt-0.5 text-sm text-[var(--gray-500)]">
                    {[req.patient_age, req.patient_gender].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              {summary && (
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-bold text-[var(--text)]">{pct}%</p>
                  <p className="text-xs text-[var(--gray-400)]">
                    {summary.validated + summary.disregarded}/{summary.total} concluídos
                  </p>
                </div>
              )}
            </div>

            {/* Barra de progresso */}
            {summary && summary.total > 0 && (
              <div className="h-1 w-full bg-[var(--gray-200)] dark:bg-[var(--gray-700)]">
                {/* eslint-disable-next-line react/forbid-component-props */}
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Feedback pós-validação */}
        {feedback && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/15 dark:text-emerald-300">
            ✓ {feedback}
          </div>
        )}

        {/* Carregamento inicial */}
        {initialLoading && (
          <p className="text-sm text-[var(--gray-400)]">Carregando campos de resultado...</p>
        )}

        {!initialLoading && data && (
          <>
            {/* Botão Validar tudo — só aparece quando há resultados gravados */}
            {!allValidated && canValidateAll && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-5 py-3 dark:border-emerald-800/30 dark:bg-emerald-900/10">
                <p className="text-sm text-emerald-800 dark:text-emerald-300">
                  Resultados gravados — pronto para validação em lote.
                </p>
                <button
                  type="button"
                  onClick={handleValidateAll}
                  disabled={busyAll}
                  className="shrink-0 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busyAll ? "A validar..." : "Validar tudo"}
                </button>
              </div>
            )}

            {/* Lista de campos de resultado */}
            <div className="overflow-hidden rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
              {data.items.map((item) => (
                <ResultRow
                  key={item.id}
                  item={item}
                  onSave={handleSave}
                  onValidate={handleValidateItem}
                  onDisregard={handleDisregard}
                  busyId={busyItemId}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
