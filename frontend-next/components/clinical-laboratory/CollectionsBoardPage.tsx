"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"

type CollectionRow = {
  id: number
  custom_id?: string
  order_custom_id?: string
  patient_name?: string
  patient_age?: string
  patient_gender?: string
  barcode?: string
  sample_type?: string
  sample_type_display?: string
  container_type?: string
  location?: string
  status?: string
  status_display?: string
  collection_at?: string
  collected_by_name?: string
  notes?: string
}

type ColumnKey = "a_colher" | "colhidas" | "enviadas" | "problemas"
type ActionKey = "colher" | "enviar" | "falhar"

type ColumnConfig = {
  key: ColumnKey
  title: string
  header: string
  badge: string
  top: string
}

const COLLECTION_COLUMNS: ColumnConfig[] = [
  { key: "a_colher", title: "A colher", header: "text-sky-700", badge: "bg-sky-100 text-sky-800", top: "border-t-2 border-t-sky-400" },
  { key: "colhidas", title: "Colhidas", header: "text-amber-700", badge: "bg-amber-100 text-amber-800", top: "border-t-2 border-t-amber-400" },
  { key: "enviadas", title: "Enviadas ao laboratório", header: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800", top: "border-t-2 border-t-emerald-400" },
  { key: "problemas", title: "Falhas / canceladas", header: "text-rose-700", badge: "bg-rose-100 text-rose-800", top: "border-t-2 border-t-rose-400" },
]

function fmt(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function genderLabel(value?: string): string {
  const normalized = (value || "").trim().toLocaleUpperCase()
  if (normalized.startsWith("M")) return "Masculino"
  if (normalized.startsWith("F")) return "Feminino"
  return ""
}

function classifyCollection(row: CollectionRow): ColumnKey {
  switch ((row.status || "").trim().toUpperCase()) {
    case "COLHIDA":
      return "colhidas"
    case "ENVIADA":
      return "enviadas"
    case "FALHADA":
    case "CANCELADA":
      return "problemas"
    default:
      return "a_colher"
  }
}

function statusTone(status?: string): string {
  switch ((status || "").trim().toUpperCase()) {
    case "ENVIADA":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
    case "COLHIDA":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    case "FALHADA":
    case "CANCELADA":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
    default:
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
  }
}

function CollectionCard({
  row,
  busyAction,
  onCollect,
  onSend,
  onFail,
}: {
  row: CollectionRow
  busyAction: ActionKey | null
  onCollect: () => void
  onSend: () => void
  onFail: () => void
}) {
  const router = useRouter()
  const target = `/clinical-laboratory/collections/${row.id}`
  const status = (row.status || "").trim().toUpperCase()
  const canCollect = status === "PENDENTE" || status === "FALHADA"
  const canSend = status === "COLHIDA"
  const canFail = status === "PENDENTE" || status === "COLHIDA"
  const sampleLabel = row.sample_type_display || row.sample_type || "Amostra"

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(target)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          router.push(target)
        }
      }}
      className="flex aspect-[2/1] cursor-pointer flex-col gap-1.5 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 shadow-sm transition hover:border-[var(--primary-400)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-400)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[var(--primary-700)] dark:text-[var(--primary-400)]">
            {row.barcode || row.custom_id || `Colheita #${row.id}`}
          </span>
          <span className="block truncate text-[10px] text-[var(--gray-500)]">
            {row.order_custom_id ? `Pedido ${row.order_custom_id}` : row.custom_id || ""}
          </span>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${statusTone(row.status)}`}>
          {row.status_display || row.status || "Pendente"}
        </span>
      </div>

      <div className="truncate text-xs text-[var(--text)]">
        {row.patient_name || "Paciente"}
        {(() => {
          const meta = [row.patient_age, genderLabel(row.patient_gender)].filter(Boolean).join(" · ")
          return meta ? <span className="text-[10px] text-[var(--gray-500)]"> · {meta}</span> : null
        })()}
      </div>

      <div className="flex flex-wrap gap-1 pt-0.5">
        <span className="inline-flex items-center rounded bg-[var(--gray-100)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--gray-700)] dark:bg-[var(--gray-800)] dark:text-[var(--gray-200)]">
          {sampleLabel}
        </span>
        {row.container_type ? (
          <span className="inline-flex items-center rounded bg-[var(--gray-100)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--gray-700)] dark:bg-[var(--gray-800)] dark:text-[var(--gray-200)]">
            {row.container_type}
          </span>
        ) : null}
        {row.location ? (
          <span className="inline-flex items-center rounded bg-[var(--gray-100)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--gray-700)] dark:bg-[var(--gray-800)] dark:text-[var(--gray-200)]">
            {row.location}
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex items-end justify-between gap-2">
        <div className="min-w-0 text-[10px] text-[var(--gray-400)]">
          <div className="truncate">Colhida {fmt(row.collection_at)}</div>
          {row.collected_by_name ? <div className="truncate">por {row.collected_by_name}</div> : null}
        </div>
        <div className="flex shrink-0 gap-1.5">
          {canFail ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onFail()
              }}
              disabled={busyAction !== null}
              className="inline-flex h-7 items-center rounded border border-rose-200 bg-rose-50 px-2.5 text-[10px] font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300"
            >
              {busyAction === "falhar" ? "..." : "Falhar"}
            </button>
          ) : null}
          {canCollect ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onCollect()
              }}
              disabled={busyAction !== null}
              className="inline-flex h-7 items-center rounded bg-sky-600 px-2.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === "colher" ? "A colher..." : "Colher"}
            </button>
          ) : null}
          {canSend ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onSend()
              }}
              disabled={busyAction !== null}
              className="inline-flex h-7 items-center rounded bg-emerald-600 px-2.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === "enviar" ? "A enviar..." : "Enviar"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function CollectionsBoardPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<CollectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<{ id: number; action: ActionKey } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await apiFetchList<CollectionRow>("/clinical_laboratory/collection/", {
        page: 1,
        pageSize: 200,
        clientCache: false,
      })
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar colheitas.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  async function runAction(row: CollectionRow, action: ActionKey) {
    setBusy({ id: row.id, action })
    setError(null)
    try {
      await apiFetch(`/clinical_laboratory/collection/${row.id}/${action}/`, { method: "POST" })
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao actualizar o estado da colheita.")
    } finally {
      setBusy(null)
    }
  }

  const buckets = useMemo(() => {
    const grouped: Record<ColumnKey, CollectionRow[]> = {
      a_colher: [],
      colhidas: [],
      enviadas: [],
      problemas: [],
    }
    for (const row of rows) grouped[classifyCollection(row)].push(row)
    return grouped
  }, [rows])

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-3">
        <PageHeader title="Colheitas de amostras" />

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[var(--gray-400)]">Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {COLLECTION_COLUMNS.map((column) => {
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

                  <div className="grid auto-rows-min grid-cols-1 gap-2 overflow-y-auto pr-1 max-h-[calc(100vh-200px)] sm:grid-cols-2 xl:grid-cols-1 [scrollbar-width:thin]">
                    {items.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--gray-500)] sm:col-span-2 xl:col-span-1">
                        Sem colheitas.
                      </div>
                    ) : (
                      items.map((row) => (
                        <CollectionCard
                          key={row.id}
                          row={row}
                          busyAction={busy?.id === row.id ? busy.action : null}
                          onCollect={() => runAction(row, "colher")}
                          onSend={() => runAction(row, "enviar")}
                          onFail={() => runAction(row, "falhar")}
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
