"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"

type ResultRow = {
  id: number
  custom_id?: string
  order_custom_id?: string
  patient_name?: string
  test_name?: string
  field_name?: string
  sample_barcode?: string
  value?: string
  unit?: string
  reference_range?: string
  flag?: string
  flag_display?: string
  status?: string
  status_display?: string
  performed_by_name?: string
  performed_at?: string
}

type ColumnKey = "a_inserir" | "a_validar" | "validados" | "rejeitados"
type ActionKey = "inserir" | "validar"

const ACTION_PATH: Record<ActionKey, string> = {
  inserir: "inserir-resultado",
  validar: "validar",
}

type ColumnConfig = {
  key: ColumnKey
  title: string
  header: string
  badge: string
  top: string
}

const RESULT_COLUMNS: ColumnConfig[] = [
  { key: "a_inserir", title: "A inserir", header: "text-sky-700", badge: "bg-sky-100 text-sky-800", top: "border-t-2 border-t-sky-400" },
  { key: "a_validar", title: "A validar", header: "text-amber-700", badge: "bg-amber-100 text-amber-800", top: "border-t-2 border-t-amber-400" },
  { key: "validados", title: "Validados", header: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800", top: "border-t-2 border-t-emerald-400" },
  { key: "rejeitados", title: "Rejeitados", header: "text-rose-700", badge: "bg-rose-100 text-rose-800", top: "border-t-2 border-t-rose-400" },
]

function fmt(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function classifyResult(row: ResultRow): ColumnKey {
  switch ((row.status || "").trim().toUpperCase()) {
    case "INSERIDO":
    case "PRELIMINAR":
    case "CORRIGIDO":
      return "a_validar"
    case "VALIDADO":
    case "FINAL":
      return "validados"
    case "REJEITADO":
      return "rejeitados"
    default:
      return "a_inserir"
  }
}

const CRITICAL_FLAGS = new Set(["CRITICO_ALTO", "CRITICO_BAIXO"])

function isCritical(row: ResultRow): boolean {
  return CRITICAL_FLAGS.has((row.flag || "").trim().toUpperCase())
}

function statusTone(status?: string): string {
  switch ((status || "").trim().toUpperCase()) {
    case "VALIDADO":
    case "FINAL":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
    case "INSERIDO":
    case "PRELIMINAR":
    case "CORRIGIDO":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    case "REJEITADO":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
    default:
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
  }
}

function flagTone(flag?: string): string {
  switch ((flag || "").trim().toUpperCase()) {
    case "CRITICO_ALTO":
    case "CRITICO_BAIXO":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
    case "ALTO":
    case "POSITIVO":
    case "REAGENTE":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    case "BAIXO":
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
    case "NORMAL":
    case "NEGATIVO":
    case "NAO_REAGENTE":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    default:
      return "bg-[var(--gray-100)] text-[var(--gray-700)] dark:bg-[var(--gray-800)] dark:text-[var(--gray-200)]"
  }
}

function ResultCard({
  row,
  busyAction,
  onInsert,
  onValidate,
}: {
  row: ResultRow
  busyAction: ActionKey | null
  onInsert: (value: string) => void
  onValidate: () => void
}) {
  const router = useRouter()
  const [draft, setDraft] = useState(row.value || "")
  const target = `/clinical-laboratory/results/${row.id}`
  const status = (row.status || "").trim().toUpperCase()
  const canInsert = status === "PENDENTE"
  const canValidate = status === "INSERIDO" || status === "PRELIMINAR" || status === "CORRIGIDO"
  const critical = isCritical(row)
  const analyte = row.field_name || row.test_name || "Resultado"

  return (
    <div
      className={`flex min-h-[148px] flex-col gap-1.5 overflow-hidden rounded-lg border bg-[var(--card)] px-3 py-2.5 shadow-sm transition hover:shadow-md ${
        critical
          ? "border-rose-300 ring-1 ring-rose-300/60 dark:border-rose-900/50 dark:ring-rose-900/40"
          : "border-[var(--border)] hover:border-[var(--primary-400)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => router.push(target)}
          className="min-w-0 text-left"
        >
          <span className="block truncate text-sm font-semibold text-[var(--primary-700)] hover:underline dark:text-[var(--primary-400)]">
            {analyte}
          </span>
          <span className="block truncate text-[10px] text-[var(--gray-500)]">
            {row.test_name && row.field_name ? row.test_name : row.sample_barcode || row.custom_id || ""}
          </span>
        </button>
        <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${statusTone(row.status)}`}>
          {row.status_display || row.status || "Pendente"}
        </span>
      </div>

      <div className="truncate text-xs text-[var(--text)]">
        {row.patient_name || "Paciente"}
        {row.order_custom_id ? <span className="text-[10px] text-[var(--gray-500)]"> · {row.order_custom_id}</span> : null}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {row.value ? (
          <span className="text-base font-bold tabular-nums text-[var(--text)]">
            {row.value}
            {row.unit ? <span className="ml-0.5 text-[10px] font-medium text-[var(--gray-500)]">{row.unit}</span> : null}
          </span>
        ) : (
          <span className="text-[11px] italic text-[var(--gray-400)]">sem valor</span>
        )}
        {row.flag_display ? (
          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${flagTone(row.flag)}`}>
            {critical ? "⚠ " : ""}{row.flag_display}
          </span>
        ) : null}
        {row.reference_range ? (
          <span className="text-[10px] text-[var(--gray-400)]">ref. {row.reference_range}</span>
        ) : null}
      </div>

      <div className="mt-auto flex items-end justify-between gap-2 pt-1">
        <div className="min-w-0 text-[10px] text-[var(--gray-400)]">
          {row.performed_at ? <div className="truncate">Executado {fmt(row.performed_at)}</div> : null}
          {row.performed_by_name ? <div className="truncate">por {row.performed_by_name}</div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {canInsert ? (
            <>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.trim()) onInsert(draft.trim())
                }}
                placeholder="Valor"
                className="h-7 w-20 rounded border border-[var(--border)] bg-[var(--background)] px-1.5 text-[11px] text-[var(--text)] outline-none focus-visible:border-[var(--primary-400)]"
              />
              <button
                type="button"
                onClick={() => onInsert(draft.trim())}
                disabled={busyAction !== null || !draft.trim()}
                className="inline-flex h-7 items-center rounded bg-sky-600 px-2.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyAction === "inserir" ? "..." : "Inserir"}
              </button>
            </>
          ) : null}
          {canValidate ? (
            <button
              type="button"
              onClick={onValidate}
              disabled={busyAction !== null}
              className="inline-flex h-7 items-center rounded bg-emerald-600 px-2.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === "validar" ? "A validar..." : "Validar"}
            </button>
          ) : null}
          {!canInsert && !canValidate ? (
            <button
              type="button"
              onClick={() => router.push(target)}
              className="inline-flex h-7 items-center rounded border border-[var(--border)] bg-[var(--card)] px-2.5 text-[10px] font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] dark:text-[var(--gray-300)]"
            >
              Detalhes
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function ResultsBoardPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<ResultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<{ id: number; action: ActionKey } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await apiFetchList<ResultRow>("/clinical_laboratory/result/", {
        page: 1,
        pageSize: 200,
        clientCache: false,
      })
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar resultados.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  async function runAction(row: ResultRow, action: ActionKey, body?: Record<string, unknown>) {
    setBusy({ id: row.id, action })
    setError(null)
    try {
      await apiFetch(`/clinical_laboratory/result/${row.id}/${ACTION_PATH[action]}/`, {
        method: "POST",
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao actualizar o resultado.")
    } finally {
      setBusy(null)
    }
  }

  const buckets = useMemo(() => {
    const grouped: Record<ColumnKey, ResultRow[]> = {
      a_inserir: [],
      a_validar: [],
      validados: [],
      rejeitados: [],
    }
    for (const row of rows) grouped[classifyResult(row)].push(row)
    return grouped
  }, [rows])

  const criticalPending = useMemo(
    () => rows.filter((r) => isCritical(r) && classifyResult(r) !== "validados" && classifyResult(r) !== "rejeitados").length,
    [rows],
  )

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-3">
        <PageHeader title="Resultados laboratoriais" />

        {criticalPending > 0 ? (
          <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/15 dark:text-rose-300">
            ⚠ {criticalPending} resultado{criticalPending > 1 ? "s" : ""} com flag crítico por validar — priorize a comunicação.
          </div>
        ) : null}

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[var(--gray-400)]">Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {RESULT_COLUMNS.map((column) => {
              const items = buckets[column.key]
              return (
                <section
                  key={column.key}
                  className={`flex flex-col rounded-lg bg-[var(--card)]/40 p-2 ${column.top}`}
                >
                  <div className="flex items-center justify-between gap-2 px-1 pb-2 pt-1">
                    <h2 className={`text-xs font-semibold uppercase tracking-wide ${column.header}`}>{column.title}</h2>
                    <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${column.badge}`}>
                      {items.length}
                    </span>
                  </div>

                  <div className="grid auto-rows-min grid-cols-1 gap-2 overflow-y-auto pr-1 max-h-[calc(100vh-220px)] sm:grid-cols-2 xl:grid-cols-1 [scrollbar-width:thin]">
                    {items.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--gray-500)] sm:col-span-2 xl:col-span-1">
                        Sem resultados.
                      </div>
                    ) : (
                      items.map((row) => (
                        <ResultCard
                          key={row.id}
                          row={row}
                          busyAction={busy?.id === row.id ? busy.action : null}
                          onInsert={(value) => runAction(row, "inserir", { value })}
                          onValidate={() => runAction(row, "validar")}
                        />
                      ))
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
