"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch, apiFetchList } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"

// ─── Types ────────────────────────────────────────────────────────────────────

type RejectionReason = { id: number; name: string; code?: string }

type SampleOption = {
  id: number
  name?: string
  bottle_type_display?: string
  minimum_volume_ml?: string
}

type RequestItem = {
  id: number
  exam_name?: string
  medical_exam_name?: string
  sample_status?: string
  sample_status_display?: string
  sample_options?: SampleOption[]
  rejection_reason_names?: string[]
  rejection_note?: string
}

type LabRequest = {
  id: number
  custom_id?: string
  patient_name?: string
  patient_age?: string
  clinical_status?: string
  clinical_status_display?: string
  type: "LAB" | "MED"
  collected_at?: string
  items?: RequestItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normSt(v?: string) { return (v || "").trim().toLowerCase() }

type ItemStatus = "pending" | "received" | "rejected"

function getItemStatus(item: RequestItem): ItemStatus {
  const s = normSt(item.sample_status)
  if (s === "recebida") return "received"
  if (s === "rejeitada") return "rejected"
  return "pending"
}

function labItemsOf(row: LabRequest) {
  return (row.items ?? []).filter((i) => i.exam_name || i.medical_exam_name)
}

function countsByStatus(items: RequestItem[]) {
  let pending = 0, received = 0, rejected = 0
  for (const i of items) {
    const s = getItemStatus(i)
    if (s === "pending") pending++
    else if (s === "received") received++
    else rejected++
  }
  return { pending, received, rejected, total: items.length }
}

function fmt(v?: string) {
  if (!v) return "-"
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

// ─── Columns ──────────────────────────────────────────────────────────────────

type ColumnKey = "por_conferir" | "rejeitadas" | "parcial" | "totalmente"

type ColumnConfig = {
  key: ColumnKey
  title: string
  header: string
  badge: string
  top: string
}

const RECEPTION_COLUMNS: ColumnConfig[] = [
  { key: "por_conferir", title: "Amostras por conferir", header: "text-sky-700", badge: "bg-sky-100 text-sky-800", top: "border-t-2 border-t-sky-400" },
  { key: "rejeitadas", title: "Amostras Rejeitadas", header: "text-rose-700", badge: "bg-rose-100 text-rose-800", top: "border-t-2 border-t-rose-400" },
  { key: "parcial", title: "Amostras Recebidas Parcialmente", header: "text-amber-700", badge: "bg-amber-100 text-amber-800", top: "border-t-2 border-t-amber-400" },
  { key: "totalmente", title: "Amostras Recebidas Totalmente", header: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800", top: "border-t-2 border-t-emerald-400" },
]

function classifyReception(row: LabRequest): ColumnKey {
  const { received, rejected, total } = countsByStatus(labItemsOf(row))
  if (total > 0 && received === total) return "totalmente"
  if (rejected > 0) return "rejeitadas"
  if (received > 0) return "parcial"
  return "por_conferir"
}

// ─── Rejection Panel ──────────────────────────────────────────────────────────

function RejectionPanel({
  reasons,
  onConfirm,
  onCancel,
  busy,
}: {
  reasons: RejectionReason[]
  onConfirm: (note: string, reasonIds: number[]) => void
  onCancel: () => void
  busy: boolean
}) {
  const [note, setNote] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())

  function toggleReason(r: RejectionReason) {
    const next = new Set(selected)
    if (next.has(r.id)) {
      next.delete(r.id)
    } else {
      next.add(r.id)
      setNote((prev) => prev.trim() ? `${prev.trim()}; ${r.name}` : r.name)
    }
    setSelected(next)
  }

  return (
    <div className="mt-2 rounded border border-red-200 bg-red-50 p-2.5 dark:border-red-800/30 dark:bg-red-900/10">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
        Motivo da rejeição
      </p>

      {reasons.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {reasons.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => toggleReason(r)}
              className={`rounded border px-2 py-0.5 text-[10px] transition-colors ${
                selected.has(r.id)
                  ? "border-red-500 bg-red-200 font-semibold text-red-800 dark:bg-red-800/50 dark:text-red-200"
                  : "border-red-200 bg-white text-red-700 hover:bg-red-100 dark:border-red-800/30 dark:bg-transparent dark:text-red-300"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Descreva o motivo ou selecione acima para preencher automaticamente..."
        rows={2}
        className="w-full resize-none rounded border border-red-200 bg-white px-2 py-1.5 text-[11px] text-[var(--text)] placeholder:text-[var(--gray-400)] focus:border-red-400 focus:outline-none dark:border-red-800/30 dark:bg-[var(--card)]"
      />

      <div className="mt-1.5 flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-6 rounded border border-[var(--border)] px-2.5 text-[10px] text-[var(--gray-600)] hover:bg-[var(--gray-100)] disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onConfirm(note.trim(), Array.from(selected))}
          disabled={busy || !note.trim()}
          className="h-6 rounded bg-red-600 px-2.5 text-[10px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? "A rejeitar..." : "Confirmar rejeição"}
        </button>
      </div>
    </div>
  )
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  reasons,
  onReceive,
  onReject,
  busy,
}: {
  item: RequestItem
  reasons: RejectionReason[]
  onReceive: () => void
  onReject: (note: string, reasonIds: number[]) => void
  busy: boolean
}) {
  const [showReject, setShowReject] = useState(false)
  const status = getItemStatus(item)
  const name = item.exam_name ?? item.medical_exam_name ?? "Exame"
  const samples = item.sample_options ?? []

  return (
    <div className={`rounded border px-2.5 py-2 text-[0.82em] transition-colors ${
      status === "received"
        ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/20 dark:bg-emerald-900/5"
        : status === "rejected"
          ? "border-red-200 bg-red-50/40 dark:border-red-800/20 dark:bg-red-900/5"
          : "border-[var(--border)] bg-[var(--background)]"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-[var(--text)]">{name}</span>
            {status === "received" && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                Recebida ✓
              </span>
            )}
            {status === "rejected" && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                Rejeitada — devolvida à enfermagem
              </span>
            )}
            {status === "pending" && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Aguardando
              </span>
            )}
          </div>

          {samples.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-2">
              {samples.map((s) => (
                <span key={s.id} className="text-[10px] text-[var(--gray-500)]">
                  {s.name}
                  {s.bottle_type_display ? ` · ${s.bottle_type_display}` : ""}
                  {s.minimum_volume_ml && Number(s.minimum_volume_ml) > 0 ? ` · ${s.minimum_volume_ml} ml` : ""}
                </span>
              ))}
            </div>
          )}

          {status === "rejected" && (item.rejection_reason_names?.length || item.rejection_note) && (
            <div className="mt-0.5 text-[10px] text-red-600 dark:text-red-400">
              {item.rejection_reason_names?.join("; ")}
              {item.rejection_note ? ` — ${item.rejection_note}` : ""}
            </div>
          )}
        </div>

        {status === "pending" && !showReject && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={onReceive}
              disabled={busy}
              className="h-6 rounded bg-emerald-600 px-2.5 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? "..." : "Receber"}
            </button>
            <button
              type="button"
              onClick={() => setShowReject(true)}
              disabled={busy}
              className="h-6 rounded border border-red-300 px-2.5 text-[10px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Rejeitar
            </button>
          </div>
        )}

        {status === "received" && (
          <span className="shrink-0 text-lg leading-none text-emerald-500">✓</span>
        )}
      </div>

      {showReject && (
        <RejectionPanel
          reasons={reasons}
          busy={busy}
          onConfirm={(note, ids) => {
            setShowReject(false)
            onReject(note, ids)
          }}
          onCancel={() => setShowReject(false)}
        />
      )}
    </div>
  )
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  row,
  reasons,
  onReceiveItem,
  onRejectItem,
  busyItem,
}: {
  row: LabRequest
  reasons: RejectionReason[]
  onReceiveItem: (item: RequestItem) => void
  onRejectItem: (item: RequestItem, note: string, reasonIds: number[]) => void
  busyItem: number | null
}) {
  const items = labItemsOf(row)
  const counts = countsByStatus(items)
  const allResolved = counts.pending === 0 && counts.total > 0
  const allReceived = allResolved && counts.rejected === 0

  return (
    <article className="rounded border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
      {/* Header */}
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/requests/${row.id}`}
            className="text-sm font-semibold text-[var(--primary-700)] hover:underline dark:text-[var(--primary-400)]"
          >
            {row.custom_id}
          </Link>
          <p className="text-xs text-[var(--text)]">{row.patient_name}</p>
          {row.patient_age && (
            <p className="text-[10px] text-[var(--gray-500)]">{row.patient_age}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
            row.type === "LAB"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
          }`}>
            {row.type}
          </span>
          {getClinicalStatusLabel(row.clinical_status, row.clinical_status_display) && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              {getClinicalStatusLabel(row.clinical_status, row.clinical_status_display)}
            </span>
          )}
          <span className="text-[10px] text-[var(--gray-400)]">
            {counts.received}/{counts.total} recebidas
            {counts.rejected > 0 ? ` · ${counts.rejected} rejeitadas` : ""}
          </span>
          <span className="text-[10px] text-[var(--gray-400)]">Colhida {fmt(row.collected_at)}</span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1.5">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            reasons={reasons}
            onReceive={() => onReceiveItem(item)}
            onReject={(note, ids) => onRejectItem(item, note, ids)}
            busy={busyItem === item.id}
          />
        ))}
      </div>

      {/* All received → go to Pedidos */}
      {allReceived && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-emerald-200 pt-2 dark:border-emerald-800/20">
          <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
            ✓ Todas as amostras aceites — disponível em Pedidos
          </span>
          <Link
            href="/clinical-laboratory/orders"
            className="h-6 rounded bg-emerald-600 px-2.5 text-[10px] font-semibold text-white hover:bg-emerald-700 flex items-center"
          >
            Ver em Pedidos →
          </Link>
        </div>
      )}

      {/* Some rejected → back to nursing */}
      {allResolved && !allReceived && (
        <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] text-amber-800 dark:border-amber-800/30 dark:bg-amber-900/10 dark:text-amber-300">
          <span className="font-semibold">{counts.rejected} exame(s) rejeitado(s)</span> — devolvido(s) à enfermagem para recoleta.
          {counts.received > 0 && (
            <span className="ml-1">Os restantes {counts.received} exame(s) foram recebidos.</span>
          )}
        </div>
      )}
    </article>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LabReceptionPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<LabRequest[]>([])
  const [reasons, setReasons] = useState<RejectionReason[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busyItem, setBusyItem] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ items }, { items: rsns }] = await Promise.all([
        apiFetchList<LabRequest>("/clinical/labrequest/?type=LAB&status=pendente&colhida=true", {
          page: 1,
          pageSize: 200,
          clientCache: false,
        }),
        apiFetchList<RejectionReason>("/clinical/sample_rejection_reason/", {
          page: 1,
          pageSize: 200,
        }),
      ])
      setRows(items)
      setReasons(rsns)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar requisições.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  const buckets = useMemo(() => {
    const grouped: Record<ColumnKey, LabRequest[]> = {
      por_conferir: [],
      rejeitadas: [],
      parcial: [],
      totalmente: [],
    }
    for (const row of rows) {
      grouped[classifyReception(row)].push(row)
    }
    return grouped
  }, [rows])

  async function handleReceiveItem(item: RequestItem) {
    setBusyItem(item.id)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequestitem/${item.id}/receber-amostra/`, { method: "POST" })
      setFeedback(`Amostra de "${item.exam_name ?? item.medical_exam_name}" recebida.`)
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao receber amostra.")
    } finally {
      setBusyItem(null)
    }
  }

  async function handleRejectItem(item: RequestItem, note: string, reasonIds: number[]) {
    setBusyItem(item.id)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequestitem/${item.id}/rejeitar-amostra/`, {
        method: "POST",
        body: JSON.stringify({ rejection_reasons: reasonIds, note }),
      })
      setFeedback(`Amostra de "${item.exam_name ?? item.medical_exam_name}" rejeitada — devolvida à enfermagem para recoleta.`)
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao rejeitar amostra.")
    } finally {
      setBusyItem(null)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-3">
        <PageHeader title="Recepção de Amostras" />

        {feedback && (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/15 dark:text-emerald-300">
            {feedback}
          </div>
        )}
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[var(--gray-400)]">Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {RECEPTION_COLUMNS.map((column) => {
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

                  <div className="flex-1 space-y-2 overflow-y-auto pr-1 max-h-[calc(100vh-200px)] [scrollbar-width:thin]">
                    {items.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--gray-500)]">
                        Sem requisições.
                      </div>
                    ) : (
                      items.map((row) => (
                        <RequestCard
                          key={row.id}
                          row={row}
                          reasons={reasons}
                          onReceiveItem={handleReceiveItem}
                          onRejectItem={handleRejectItem}
                          busyItem={busyItem}
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
