"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, FlaskConical, Printer } from "lucide-react"

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
  exam_field_choices?: string[]
  exam_field_reference?: string
  exam_field_reference_low?: string | null
  exam_field_reference_high?: string | null
  exam_field_critical_low?: string | null
  exam_field_critical_high?: string | null
  result_value?: string | null
  result_text?: string | null
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

type SpecializedItem = {
  exam_id: number
  exam_name: string
  method: string
  sector: string
  sector_label: string
  href: string
  status?: string
  record_id?: number | null
}

type RequestResults = {
  request: RequestInfo
  summary: Summary
  items: ResultItem[]
  specialized_items?: SpecializedItem[]
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
  selected,
  onToggle,
  forceOpen,
  onValueChange,
}: {
  item: ResultItem
  onSave: (id: number, value: string) => void
  onValidate: (id: number) => void
  onDisregard: (id: number) => void
  busyId: number | null
  selected: boolean
  onToggle: (id: number) => void
  forceOpen?: boolean
  onValueChange?: (id: number, value: string) => void
}) {
  const [iniciado, setIniciado] = useState(false)
  const isOpen = iniciado || !!forceOpen
  const isTextual = item.exam_field_type === "texto_choice" || item.exam_field_type === "texto"
  const currentStoredValue = isTextual ? (item.result_text ?? "") : (item.result_value ?? "")
  const [value, setValue] = useState(currentStoredValue)

  function handleValueChange(v: string) {
    setValue(v)
    onValueChange?.(item.id, v)
  }

  const busy = busyId === item.id
  const s = normSt(item.status)
  const isValidated = s === "validated" || s === "validado"
  const isDisregarded = s === "disregarded" || s === "desconsiderado"
  const isInAnalysis = s === "in_analysis" || s === "em_analise"
  const isSaved = s === "awaiting_validation" || s === "aguardando_validacao"
  const isPending = !isValidated && !isDisregarded && !isInAnalysis && !isSaved

  const prevValue = useRef(currentStoredValue)
  if (prevValue.current !== currentStoredValue) {
    prevValue.current = currentStoredValue
    setValue(currentStoredValue)
  }

  const cb = (
    <input
      type="checkbox"
      aria-label="Selecionar campo"
      checked={selected}
      onChange={() => onToggle(item.id)}
      disabled={isValidated || isDisregarded}
      className="h-3.5 w-3.5 cursor-pointer accent-[var(--primary-600)] disabled:cursor-default disabled:opacity-30"
    />
  )

  const td = "px-2 py-0.5 text-xs align-middle truncate max-w-0"

  // ── Validado ────────────────────────────────────────────────────────────────
  if (isValidated) {
    return (
      <tr className="bg-emerald-50/60 dark:bg-emerald-900/10">
        <td className="px-2 py-0.5 align-middle">{cb}</td>
        <td className={td + " font-medium text-[var(--gray-500)]"}>{item.exam_name}</td>
        <td className={td + " text-[var(--gray-500)]"}>
          {item.exam_field_name !== item.exam_name ? item.exam_field_name : "—"}
        </td>
        <td className={td + " text-[var(--gray-400)]"}>{item.exam_field_reference || "—"}</td>
        <td className={td + " text-[var(--gray-400)]"}>{item.exam_field_unit || "—"}</td>
        <td className={td + " font-bold text-[var(--text)]"}>
          {(isTextual ? item.result_text : item.result_value) ?? "—"}
        </td>
        <td className="px-2 py-0.5 text-right align-middle">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Validado ✓
          </span>
        </td>
      </tr>
    )
  }

  // ── Desconsiderado ───────────────────────────────────────────────────────────
  if (isDisregarded) {
    return (
      <tr className="opacity-40">
        <td className="px-2 py-0.5 align-middle">{cb}</td>
        <td className={td + " line-through text-[var(--gray-500)]"}>{item.exam_name}</td>
        <td className={td + " line-through text-[var(--gray-500)]"}>
          {item.exam_field_name !== item.exam_name ? item.exam_field_name : "—"}
        </td>
        <td className={td}>—</td>
        <td className={td}>—</td>
        <td className={td}>—</td>
        <td className="px-2 py-0.5 text-right align-middle text-[11px] text-[var(--gray-400)]">
          Desconsiderado
        </td>
      </tr>
    )
  }

  // ── Pendente ─────────────────────────────────────────────────────────────────
  if (isPending && !isOpen) {
    return (
      <tr>
        <td className="px-2 py-0.5 align-middle">{cb}</td>
        <td className={td + " font-medium text-[var(--text)]"}>
          {item.exam_name}
          {item.critical_alert && (
            <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">CRÍTICO</span>
          )}
        </td>
        <td className={td + " text-[var(--gray-500)]"}>
          {item.exam_field_name !== item.exam_name ? item.exam_field_name : "—"}
        </td>
        <td className={td + " text-[var(--gray-400)]"}>{item.exam_field_reference || "—"}</td>
        <td className={td + " text-[var(--gray-400)]"}>{item.exam_field_unit || "—"}</td>
        <td className={td + " text-[var(--gray-300)]"}>—</td>
        <td className="px-2 py-0.5 text-right align-middle">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setIniciado(true)}
              disabled={busy}
              className="rounded border border-[var(--primary-400)] bg-[var(--primary-50)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary-700)] hover:bg-[var(--primary-100)] disabled:opacity-50 dark:bg-transparent dark:text-[var(--primary-400)]"
            >
              Iniciar
            </button>
            <button
              type="button"
              onClick={() => onDisregard(item.id)}
              disabled={busy}
              className="rounded border border-amber-400 px-2 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-600 dark:text-amber-400"
            >
              {busy ? "..." : "Desconsiderar"}
            </button>
          </div>
        </td>
      </tr>
    )
  }

  // ── Input aberto ─────────────────────────────────────────────────────────────
  return (
    <tr className={isSaved ? "bg-blue-50/40 dark:bg-blue-900/10" : ""}>
      <td className="px-2 py-0.5 align-middle">{cb}</td>
      <td className={td + " font-semibold text-[var(--text)]"}>
        {item.exam_name}
        {item.critical_alert && (
          <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">CRÍTICO</span>
        )}
      </td>
      <td className={td + " text-[var(--gray-500)]"}>
        {item.exam_field_name !== item.exam_name ? item.exam_field_name : "—"}
      </td>
      <td className={td + " text-[11px] text-[var(--gray-400)]"}>{item.exam_field_reference || "—"}</td>
      <td className={td + " text-[11px] text-[var(--gray-400)]"}>{item.exam_field_unit || "—"}</td>
      <td className="px-2 py-0.5 align-middle">
        {item.exam_field_type === "texto_choice" && item.exam_field_choices?.length ? (
          <select
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            className="h-6 w-full min-w-[80px] rounded border border-[var(--border)] bg-[var(--card)] px-1 text-xs text-[var(--text)] focus:border-[var(--primary-400)] focus:outline-none"
          >
            <option value="">— selecionar —</option>
            {item.exam_field_choices.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : (
          <input
            type={item.exam_field_type === "numero" ? "number" : "text"}
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Inserir resultado"
            className="h-6 w-full min-w-[80px] rounded border border-[var(--border)] bg-[var(--card)] px-2 text-xs text-[var(--text)] placeholder:text-[var(--gray-400)] placeholder:opacity-50 focus:border-[var(--primary-400)] focus:outline-none"
          />
        )}
      </td>
      <td className="px-2 py-0.5 text-right align-middle">
        {!isSaved && (
          <button
            type="button"
            onClick={() => onSave(item.id, value)}
            disabled={busy || !value.trim()}
            className={`h-6 rounded px-2 text-[10px] font-medium transition-colors disabled:opacity-40 ${
              value.trim()
                ? "border border-blue-400 bg-blue-500 text-white hover:bg-blue-600"
                : "border border-[var(--border)] text-[var(--gray-500)]"
            }`}
          >
            {busy ? "..." : "Gravar"}
          </button>
        )}
        {isSaved && (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => onValidate(item.id)}
              disabled={busy}
              className="h-6 rounded bg-emerald-600 px-2 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? "..." : "Validar"}
            </button>
            <span className="whitespace-nowrap rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              Ag. validação
            </span>
          </div>
        )}
      </td>
    </tr>
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [startedIds, setStartedIds] = useState<Set<number>>(new Set())
  const [valueMap, setValueMap] = useState<Map<number, string>>(new Map())
  const [busySaveAll, setBusySaveAll] = useState(false)
  const progressBarRef = useRef<HTMLDivElement>(null)

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

  function buildSaveBody(itemId: number, value: string) {
    const item = data?.items.find((i) => i.id === itemId)
    const isTextual = item?.exam_field_type === "texto_choice" || item?.exam_field_type === "texto"
    return isTextual ? { result_text: value } : { result_value: value }
  }

  async function handleSave(itemId: number, value: string) {
    setBusyItemId(itemId)
    setError(null)
    try {
      await apiFetch(`/clinical/resultitem/${itemId}/save-result/`, {
        method: "POST",
        body: JSON.stringify(buildSaveBody(itemId, value)),
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

  async function handleValidateSelected() {
    if (!data) return
    const toValidate = data.items.filter((item) => {
      const s = normSt(item.status)
      const isSaved = s === "awaiting_validation" || s === "aguardando_validacao"
      return isSaved && selectedIds.has(item.id)
    })
    if (toValidate.length === 0) return
    setBusyAll(true)
    setError(null)
    setFeedback(null)
    try {
      for (const item of toValidate) {
        await apiFetch(`/clinical/resultitem/${item.id}/validate-result/`, { method: "POST" })
      }
      setFeedback(`${toValidate.length} resultado(s) validado(s).`)
      setSelectedIds(new Set())
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

  useEffect(() => {
    if (progressBarRef.current) progressBarRef.current.style.width = `${pct}%`
  }, [pct])

  const statusLabel = getClinicalStatusLabel(req?.clinical_status, req?.clinical_status_display)

  const selectableIds: number[] = data
    ? data.items
        .filter((item) => {
          const s = normSt(item.status)
          return s !== "validated" && s !== "validado" && s !== "disregarded" && s !== "desconsiderado"
        })
        .map((item) => item.id)
    : []
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id))
  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectableIds))
    }
  }
  const selectedToValidate = data
    ? data.items.filter((item) => {
        const s = normSt(item.status)
        const isSaved = s === "awaiting_validation" || s === "aguardando_validacao"
        return isSaved && selectedIds.has(item.id)
      })
    : []

  function isPendingStatus(s: string) {
    return (
      s !== "validated" && s !== "validado" &&
      s !== "disregarded" && s !== "desconsiderado" &&
      s !== "awaiting_validation" && s !== "aguardando_validacao" &&
      s !== "in_analysis" && s !== "em_analise"
    )
  }

  const unstartedPendingIds: number[] = data
    ? data.items
        .filter((item) => isPendingStatus(normSt(item.status)) && !startedIds.has(item.id))
        .map((item) => item.id)
    : []

  function handleStartAll() {
    setStartedIds((prev) => new Set([...prev, ...unstartedPendingIds]))
  }

  const openItems = data
    ? data.items.filter((item) => {
        const s = normSt(item.status)
        const isOpen = startedIds.has(item.id) || s === "in_analysis" || s === "em_analise"
        const notDone =
          s !== "validated" && s !== "validado" &&
          s !== "disregarded" && s !== "desconsiderado" &&
          s !== "awaiting_validation" && s !== "aguardando_validacao"
        return isOpen && notDone
      })
    : []

  function itemDisplayValue(item: ResultItem) {
    const isTextual = item.exam_field_type === "texto_choice" || item.exam_field_type === "texto"
    return isTextual ? (item.result_text ?? "") : (item.result_value ?? "")
  }

  const saveableItems = openItems.filter((item) => {
    const val = (valueMap.get(item.id) ?? itemDisplayValue(item)).trim()
    return val.length > 0
  })

  async function handleSaveAll() {
    if (!saveableItems.length) return
    setBusySaveAll(true)
    setError(null)
    try {
      for (const item of saveableItems) {
        const val = (valueMap.get(item.id) ?? itemDisplayValue(item)).trim()
        if (val) {
          await apiFetch(`/clinical/resultitem/${item.id}/save-result/`, {
            method: "POST",
            body: JSON.stringify(buildSaveBody(item.id, val)),
          })
        }
      }
      setValueMap(new Map())
      await fetchData()
    } catch (e: any) {
      setError(e?.message || "Falha ao gravar resultados.")
    } finally {
      setBusySaveAll(false)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-5xl space-y-2 px-2 py-2 sm:px-4">

        {/* Cabeçalho fundido do paciente/requisição */}
        {req && (
          <div className="relative overflow-hidden rounded-xl border border-teal-200/70 bg-gradient-to-br from-teal-50/80 via-card to-card shadow-sm dark:border-teal-800/40 dark:from-teal-950/25 dark:via-card dark:to-card">
            <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-teal-500 to-cyan-600" />

            {/* Linha 1 */}
            <div className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 pl-4">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-sm">
                  <FlaskConical size={18} />
                </span>
                <div className="min-w-0">
                  <nav className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--gray-500)]">
                    <Link href="/clinical-laboratory/worklists" className="hover:text-teal-600 hover:underline dark:hover:text-teal-400">
                      Listas de Trabalho
                    </Link>
                    <span>›</span>
                    <span className="font-medium text-[var(--text)]">{req.custom_id}</span>
                  </nav>
                  <h1 className="truncate text-base font-bold leading-tight text-[var(--text)] sm:text-lg">
                    {req.patient_name}
                  </h1>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {(req.patient_age || req.patient_gender) && (
                      <span className="text-xs text-[var(--gray-500)]">
                        {[req.patient_age, req.patient_gender].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {req.has_critical_result && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        <AlertTriangle size={10} /> CRÍTICO
                      </span>
                    )}
                    {statusLabel && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        {statusLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2.5">
                {summary && (
                  <div className="text-right">
                    <p className="text-xl font-bold leading-none text-[var(--text)]">{pct}%</p>
                    <p className="text-[10px] text-[var(--gray-400)]">
                      {summary.validated + summary.disregarded}/{summary.total} concluídos
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/clinical-laboratory/worklists"
                    aria-label="Voltar"
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 text-xs font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)] dark:text-[var(--gray-300)]"
                  >
                    <ArrowLeft size={14} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => window.open(`/api/v1/clinical/labrequest/${requestId}/request-pdf/`, "_blank")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)] dark:text-[var(--gray-300)]"
                  >
                    <Printer size={14} /> Imprimir
                  </button>
                </div>
              </div>
            </div>

            {/* Linha 2: métricas */}
            {summary && (
              <div className="flex flex-wrap gap-1 border-t border-teal-200/40 bg-card/40 px-3 py-1.5 pl-4 dark:border-teal-800/30">
                {[
                  { label: "Total", value: summary.total, cls: "border-slate-200/60 bg-slate-100/50 text-slate-700 dark:border-slate-600/40 dark:bg-slate-800/30 dark:text-slate-300" },
                  { label: "Pendentes", value: summary.pending, cls: "border-amber-200/60 bg-amber-100/50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/25 dark:text-amber-300" },
                  { label: "Em análise", value: summary.in_analysis, cls: "border-sky-200/60 bg-sky-100/50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/25 dark:text-sky-300" },
                  { label: "Aguarda validação", value: summary.awaiting_validation, cls: "border-violet-200/60 bg-violet-100/50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/25 dark:text-violet-300" },
                  { label: "Validados", value: summary.validated, cls: "border-emerald-200/60 bg-emerald-100/50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/25 dark:text-emerald-300" },
                  { label: "Desconsiderados", value: summary.disregarded, cls: "border-rose-200/60 bg-rose-100/50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/25 dark:text-rose-300", hideIfZero: true },
                ]
                  .filter((m) => !(m.hideIfZero && !m.value))
                  .map((m) => (
                    <span key={m.label} className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-medium ${m.cls}`}>
                      {m.label}
                      <span className="font-bold tabular-nums">{m.value}</span>
                    </span>
                  ))}
              </div>
            )}

            {/* Barra de progresso */}
            {summary && summary.total > 0 && (
              <div className="h-1 w-full bg-teal-100/60 dark:bg-teal-900/30">
                <div ref={progressBarRef} className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500" />
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

        {/* Carregamento inicial */}
        {initialLoading && (
          <p className="text-sm text-[var(--gray-400)]">Carregando campos de resultado...</p>
        )}

        {!initialLoading && data && (
          <>
            {/* Exames de sector especializado — preenchem-se na sua área dedicada */}
            {data.specialized_items && data.specialized_items.length > 0 && (
              <div className="rounded-lg border border-teal-200/70 bg-teal-50/50 p-2.5 dark:border-teal-800/40 dark:bg-teal-950/20">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                  Exames de sector especializado
                </p>
                <p className="mb-2 mt-0.5 text-[11px] text-[var(--gray-500)]">
                  Cultura, baciloscopia, GeneXpert e PCR não se preenchem aqui — abra a área dedicada para registar o resultado.
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {data.specialized_items.map((sp) => (
                    <div
                      key={sp.exam_id}
                      className="flex flex-col gap-1.5 rounded-md border border-teal-200/60 bg-white/60 px-2.5 py-2 shadow-sm dark:border-teal-800/40 dark:bg-white/[0.04]"
                    >
                      <div className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-[var(--text)]">{sp.exam_name}</span>
                        <span className="block truncate text-[10px] text-[var(--gray-500)]">{sp.sector_label}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center rounded-full border border-teal-200/70 bg-teal-50/70 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/25 dark:text-teal-300">
                          {sp.status || "Não iniciado"}
                        </span>
                        <Link
                          href={sp.href}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:from-teal-700 hover:to-cyan-700"
                        >
                          Iniciar <span aria-hidden>↗</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cabeçalho da lista: select-all + Validar todos */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-[var(--gray-500)]">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={selectableIds.length === 0}
                  className="h-3.5 w-3.5 accent-[var(--primary-600)]"
                />
                Selecionar todos
              </label>
              <div className="flex items-center gap-2">
                {unstartedPendingIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleStartAll}
                    className="rounded-md border border-[var(--primary-400)] bg-[var(--primary-50)] px-3 py-1 text-xs font-semibold text-[var(--primary-700)] hover:bg-[var(--primary-100)] dark:bg-transparent dark:text-[var(--primary-400)]"
                  >
                    Iniciar todos
                  </button>
                )}
                {openItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={busySaveAll || saveableItems.length === 0}
                    className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--gray-700)] hover:bg-[var(--gray-100)] disabled:opacity-40 dark:text-[var(--gray-300)]"
                  >
                    {busySaveAll ? "A gravar..." : "Gravar todos"}
                  </button>
                )}
                {canValidateAll && (
                  <button
                    type="button"
                    onClick={handleValidateSelected}
                    disabled={busyAll || selectedToValidate.length === 0}
                    className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    {busyAll ? "A validar..." : "Validar todos"}
                  </button>
                )}
              </div>
            </div>

            {/* Tabela de campos de resultado */}
            <div className="overflow-x-auto border border-[var(--border)]">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-8" />
                  <col className="w-[26%]" />
                  <col className="w-[20%]" />
                  <col className="w-[16%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead className="border-b border-[var(--border)] bg-[var(--gray-50,#f9fafb)] dark:bg-[var(--gray-900,#111)]">
                  <tr>
                    <th className="px-2 py-1" scope="col" aria-label="Selecionar" />
                    <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Exame</th>
                    <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Parâmetro</th>
                    <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Referência</th>
                    <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Unidade</th>
                    <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Resultado</th>
                    <th className="px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Acção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {feedback && (
                    <tr>
                      <td colSpan={7} className="bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800 dark:bg-emerald-900/15 dark:text-emerald-300">
                        <span className="mr-1 text-emerald-500">✓</span>{feedback}
                      </td>
                    </tr>
                  )}
                  {data.items.map((item) => (
                    <ResultRow
                      key={item.id}
                      item={item}
                      onSave={handleSave}
                      onValidate={handleValidateItem}
                      onDisregard={handleDisregard}
                      busyId={busyItemId}
                      selected={selectedIds.has(item.id)}
                      onToggle={toggleSelected}
                      forceOpen={startedIds.has(item.id)}
                      onValueChange={(id, val) =>
                        setValueMap((prev) => new Map(prev).set(id, val))
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
