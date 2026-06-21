"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestItem = {
  id: number
  custom_id: string
  exam?: number
  exam_name?: string
  medical_exam?: number
  medical_exam_name?: string
  sample_status: string
  sample_status_display: string
}

type LabRequest = {
  id: number
  custom_id: string
  type: "LAB" | "MED"
  status: string
  patient: number
  patient_name: string
  patient_age?: string
  created_at: string
  validated_at?: string | null
  clinical_status?: string
  clinical_status_display?: string
  items: RequestItem[]
  exams: number[]
  medical_exams: number[]
}

type ExamOption = {
  id: number
  custom_id: string
  name: string
  sector?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function priorityBadge(status?: string, display?: string) {
  const label = getClinicalStatusLabel(status, display)
  if (!label) return null
  return (
    <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
      {label}
    </span>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  req,
  onClose,
  onSaved,
}: {
  req: LabRequest
  onClose: () => void
  onSaved: (updated: LabRequest) => void
}) {
  const [items, setItems] = useState<RequestItem[]>(req.items ?? [])
  const [exams, setExams] = useState<ExamOption[]>([])
  const [loadingExams, setLoadingExams] = useState(true)
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const examEndpoint = req.type === "LAB" ? "/clinical/exam/" : "/clinical/medicalexam/"

  useEffect(() => {
    setLoadingExams(true)
    apiFetchList<ExamOption>(examEndpoint, { page: 1, pageSize: 200 })
      .then(({ items: opts }) => setExams(opts))
      .catch(() => setExams([]))
      .finally(() => setLoadingExams(false))
  }, [examEndpoint])

  const currentIds = new Set(items.map((i) => i.exam ?? i.medical_exam).filter(Boolean))

  const filtered = exams.filter((e) => {
    if (currentIds.has(e.id)) return false
    if (!search.trim()) return true
    return e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.custom_id.toLowerCase().includes(search.toLowerCase())
  })

  function removeItem(itemId: number) {
    setItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  function addExam(exam: ExamOption) {
    const fakeItem: RequestItem = {
      id: -(exam.id),
      custom_id: "",
      exam: req.type === "LAB" ? exam.id : undefined,
      exam_name: req.type === "LAB" ? exam.name : undefined,
      medical_exam: req.type === "MED" ? exam.id : undefined,
      medical_exam_name: req.type === "MED" ? exam.name : undefined,
      sample_status: "aguardando",
      sample_status_display: "Aguardando receção",
    }
    setItems((prev) => [...prev, fakeItem])
    setSearch("")
    searchRef.current?.focus()
  }

  async function save() {
    setSaving(true)
    setError(null)
    const ids = items
      .map((i) => (req.type === "LAB" ? i.exam : i.medical_exam))
      .filter((id): id is number => id != null)

    const body = req.type === "LAB" ? { exams: ids } : { medical_exams: ids }
    try {
      const updated = await apiFetch<LabRequest>(`/clinical/labrequest/${req.id}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })
      onSaved(updated)
    } catch (e: any) {
      setError(e?.message || "Erro ao guardar alterações.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <p className="font-semibold text-[var(--text)]">Editar requisição</p>
            <p className="text-xs text-[var(--gray-500)]">{req.custom_id} · {req.patient_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--gray-500)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          {/* Current items */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
              Exames na requisição ({items.length})
            </p>
            {items.length === 0 ? (
              <p className="text-xs text-[var(--gray-400)]">Nenhum exame — adicione pelo menos um antes de guardar.</p>
            ) : (
              <ul className="space-y-1">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  >
                    <span className="truncate text-[var(--text)]">
                      {item.exam_name ?? item.medical_exam_name ?? "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="flex-shrink-0 rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-800 dark:hover:bg-red-900/20"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add exam */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
              Adicionar exame
            </p>
            <input
              ref={searchRef}
              type="text"
              placeholder="Pesquisar exame..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 h-8 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--gray-400)] focus:border-[var(--primary-400)] focus:outline-none"
            />
            {loadingExams ? (
              <p className="text-xs text-[var(--gray-400)]">A carregar exames...</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-[var(--gray-400)]">{search ? "Sem resultados." : "Todos os exames já foram adicionados."}</p>
            ) : (
              <ul className="max-h-44 space-y-1 overflow-y-auto">
                {filtered.slice(0, 50).map((exam) => (
                  <li key={exam.id}>
                    <button
                      type="button"
                      onClick={() => addExam(exam)}
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-left text-sm hover:border-[var(--primary-400)] hover:bg-[var(--primary-50)] dark:hover:bg-[var(--primary-900)]/10"
                    >
                      <span className="truncate text-[var(--text)]">{exam.name}</span>
                      {exam.sector ? (
                        <span className="flex-shrink-0 text-[10px] text-[var(--gray-400)]">{exam.sector}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        {error ? (
          <div className="border-t border-[var(--border)] bg-red-50 px-4 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        ) : null}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-[var(--border)] px-3 text-sm text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || items.length === 0}
            className="h-8 rounded-md bg-[var(--primary-600)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-700)] disabled:opacity-60"
          >
            {saving ? "A guardar..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  row,
  onValidate,
  onCancel,
  onEdit,
  busyId,
}: {
  row: LabRequest
  onValidate?: (row: LabRequest) => void
  onCancel?: (row: LabRequest) => void
  onEdit?: (row: LabRequest) => void
  busyId: number | null
}) {
  const busy = busyId === row.id
  const isPending = row.status === "pendente" && !row.validated_at

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-3 shadow-sm">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/requests/${row.id}`}
            className="font-semibold text-[var(--primary-700)] hover:underline dark:text-[var(--primary-400)]"
          >
            {row.custom_id}
          </Link>
          <p className="truncate text-sm text-[var(--text)]">{row.patient_name}</p>
          {row.patient_age ? (
            <p className="text-xs text-[var(--gray-500)]">{row.patient_age}</p>
          ) : null}
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${row.type === "LAB" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"}`}>
            {row.type === "LAB" ? "Lab" : "Med"}
          </span>
          {priorityBadge(row.clinical_status, row.clinical_status_display)}
        </div>
      </div>

      {/* Items summary */}
      {row.items?.length > 0 ? (
        <p className="text-xs text-[var(--gray-500)] leading-snug">
          {row.items.map((item) => item.exam_name ?? item.medical_exam_name ?? "Exame").join(", ")}
        </p>
      ) : null}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[10px] text-[var(--gray-400)]">{fmt(row.created_at)}</span>

        {isPending ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onCancel?.(row)}
              disabled={busy}
              className="h-7 rounded border border-red-200 px-2 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800/40 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onEdit?.(row)}
              disabled={busy}
              className="h-7 rounded border border-[var(--border)] px-2 text-xs text-[var(--gray-700)] hover:bg-[var(--gray-100)] disabled:opacity-50 dark:text-[var(--gray-300)]"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => onValidate?.(row)}
              disabled={busy}
              className="h-7 rounded bg-[var(--primary-600)] px-3 text-xs font-semibold text-white hover:bg-[var(--primary-700)] disabled:opacity-60"
            >
              {busy ? "..." : "Validar"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({
  title,
  count,
  loading,
  empty,
  children,
  colorClass = "bg-[var(--card)]",
}: {
  title: string
  count: number
  loading: boolean
  empty: string
  children: React.ReactNode
  colorClass?: string
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className={`mb-2 flex items-center gap-2 rounded-lg px-3 py-2 ${colorClass}`}>
        <span className="font-semibold text-[var(--text)]">{title}</span>
        {!loading ? (
          <span className="rounded-full bg-[var(--background)] px-2 py-0.5 text-xs font-medium text-[var(--gray-500)]">
            {count}
          </span>
        ) : null}
      </div>
      {loading ? (
        <p className="px-1 text-xs text-[var(--gray-400)]">Carregando...</p>
      ) : count === 0 ? (
        <p className="px-1 text-xs text-[var(--gray-400)]">{empty}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PendingRequestsPage() {
  useAuthGuard()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [pending, setPending] = useState<LabRequest[]>([])
  const [canceled, setCanceled] = useState<LabRequest[]>([])
  const [validated, setValidated] = useState<LabRequest[]>([])
  const [loadingPending, setLoadingPending] = useState(true)
  const [loadingCanceled, setLoadingCanceled] = useState(true)
  const [loadingValidated, setLoadingValidated] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<LabRequest | null>(null)

  const loadPending = useCallback(async () => {
    setLoadingPending(true)
    try {
      const { items } = await apiFetchList<LabRequest>(
        "/clinical/labrequest/?validada=false&status=pendente",
        { page: 1, pageSize: 100, clientCache: false }
      )
      setPending(items)
    } catch { /* silent */ }
    finally { setLoadingPending(false) }
  }, [])

  const loadCanceled = useCallback(async () => {
    setLoadingCanceled(true)
    try {
      const { items } = await apiFetchList<LabRequest>(
        "/clinical/labrequest/?status=cancelado",
        { page: 1, pageSize: 100, clientCache: false }
      )
      setCanceled(items)
    } catch { /* silent */ }
    finally { setLoadingCanceled(false) }
  }, [])

  const loadValidated = useCallback(async () => {
    setLoadingValidated(true)
    try {
      const { items } = await apiFetchList<LabRequest>(
        "/clinical/labrequest/?validada=true",
        { page: 1, pageSize: 100, clientCache: false }
      )
      setValidated(items)
    } catch { /* silent */ }
    finally { setLoadingValidated(false) }
  }, [])

  useEffect(() => {
    loadPending()
    loadCanceled()
    loadValidated()
  }, [loadPending, loadCanceled, loadValidated, safeRefreshToken])

  async function handleValidate(row: LabRequest) {
    setBusyId(row.id)
    setGlobalError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${row.id}/validar/`, { method: "POST" })
      setPending((prev) => prev.filter((r) => r.id !== row.id))
      setFeedback(`${row.custom_id} encaminhada para colheita.`)
      loadValidated()
    } catch (e: any) {
      setGlobalError(e?.message || "Falha ao validar.")
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancel(row: LabRequest) {
    setBusyId(row.id)
    setGlobalError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${row.id}/cancelar/`, { method: "POST" })
      setPending((prev) => prev.filter((r) => r.id !== row.id))
      setFeedback(`${row.custom_id} cancelada.`)
      loadCanceled()
    } catch (e: any) {
      const msg: string = e?.message ?? ""
      if (msg.includes("já foi cancelada")) {
        setPending((prev) => prev.filter((r) => r.id !== row.id))
        loadCanceled()
      } else {
        setGlobalError(msg || "Falha ao cancelar.")
      }
    } finally {
      setBusyId(null)
    }
  }

  function handleSaved(updated: LabRequest) {
    setPending((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setEditRow(null)
    setFeedback(`${updated.custom_id} atualizada.`)
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <PageHeader
          title="Fila de requisições"
          subtitle="Valide, edite ou cancele antes de encaminhar para colheita."
          actions={
            <Link
              href="/requests/new"
              className="inline-flex h-9 items-center rounded-md bg-[var(--primary-600)] px-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--primary-700)]"
            >
              Nova requisição
            </Link>
          }
        />

        {feedback ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/15 dark:text-emerald-300">
            {feedback}
          </div>
        ) : null}
        {globalError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {globalError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Coluna 1 — Pendentes */}
          <Column
            title="Pendentes"
            count={pending.length}
            loading={loadingPending}
            empty="Sem requisições pendentes."
            colorClass="border border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-900/10"
          >
            {pending.map((row) => (
              <RequestCard
                key={row.id}
                row={row}
                onValidate={handleValidate}
                onCancel={handleCancel}
                onEdit={setEditRow}
                busyId={busyId}
              />
            ))}
          </Column>

          {/* Coluna 2 — Canceladas */}
          <Column
            title="Canceladas"
            count={canceled.length}
            loading={loadingCanceled}
            empty="Sem requisições canceladas."
            colorClass="border border-red-200 bg-red-50 dark:border-red-800/30 dark:bg-red-900/10"
          >
            {canceled.map((row) => (
              <RequestCard key={row.id} row={row} busyId={null} />
            ))}
          </Column>

          {/* Coluna 3 — Validadas */}
          <Column
            title="Encaminhadas à Enfermagem"
            count={validated.length}
            loading={loadingValidated}
            empty="Nenhuma requisição encaminhada."
            colorClass="border border-emerald-200 bg-emerald-50 dark:border-emerald-800/30 dark:bg-emerald-900/10"
          >
            {validated.map((row) => (
              <RequestCard key={row.id} row={row} busyId={null} />
            ))}
          </Column>
        </div>
      </div>

      {editRow ? (
        <EditModal
          req={editRow}
          onClose={() => setEditRow(null)}
          onSaved={handleSaved}
        />
      ) : null}
    </AppLayout>
  )
}
