"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, FlaskConical, Clock, CheckCircle2, XCircle, Pencil, Loader2, Search, RotateCcw, Stethoscope } from "lucide-react"
import ManchesterBadge from "@/components/ui/ManchesterBadge"
import PageSizeInput from "@/components/ui/PageSizeInput"
import { getManchesterMeta } from "@/lib/manchesterTriage"
import { useCallback, useEffect, useRef, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"
import { abbreviateMiddleNames } from "@/lib/formatName"

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

type RequestTypeFilter = "LAB" | "MED"

type ExamOption = {
  id: number
  custom_id: string
  name: string
  sector?: string
}

const REQUEST_TYPE_OPTIONS: Array<{
  value: RequestTypeFilter
  label: string
  icon: typeof FlaskConical
}> = [
  { value: "MED", label: "Exames médicos", icon: Stethoscope },
  { value: "LAB", label: "Exames laboratoriais", icon: FlaskConical },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function urgencyAccent(status?: string): string {
  const meta = getManchesterMeta(status)
  return meta.accentClass
}

function priorityBadge(status?: string, display?: string) {
  if (!status && !display) return null
  return <ManchesterBadge status={status} display={display} />
}

function shortName(value?: string | null): string {
  const raw = String(value || "").trim()
  if (!raw) return "—"
  return abbreviateMiddleNames(raw)
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
  // Bloqueia vincular novos exames quando a requisição já tem resultado validado.
  const [hasValidatedResult, setHasValidatedResult] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const examEndpoint = req.type === "LAB" ? "/clinical_laboratory/test/" : "/clinical/medicalexam/"

  useEffect(() => {
    setLoadingExams(true)
    apiFetchList<ExamOption>(examEndpoint, { page: 1, pageSize: 200 })
      .then(({ items: opts }) => setExams(opts))
      .catch(() => setExams([]))
      .finally(() => setLoadingExams(false))
  }, [examEndpoint])

  useEffect(() => {
    let active = true
    apiFetch<{ summary?: { validated?: number } }>(
      `/clinical/labrequest/${req.id}/result-items/`,
      { method: "GET", clientCache: false },
    )
      .then((r) => { if (active) setHasValidatedResult((r?.summary?.validated ?? 0) > 0) })
      .catch(() => { /* na dúvida, não bloqueia */ })
    return () => { active = false }
  }, [req.id])

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
    if (hasValidatedResult) return
    const fakeItem: RequestItem = {
      id: -(exam.id),
      custom_id: "",
      exam: req.type === "LAB" ? exam.id : undefined,
      exam_name: req.type === "LAB" ? exam.name : undefined,
      medical_exam: req.type === "MED" ? exam.id : undefined,
      medical_exam_name: req.type === "MED" ? exam.name : undefined,
      sample_status: "aguardando",
      sample_status_display: "Aguardando recepção",
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
            <p className="text-xs text-[var(--gray-500)]">{req.custom_id} · {shortName(req.patient_name)}</p>
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

        <div className="flex flex-col gap-3 overflow-y-auto p-3">
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
          {hasValidatedResult ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/15 dark:text-amber-300">
              Não é possível vincular novos exames: esta requisição já tem pelo menos um exame com resultado validado.
            </div>
          ) : (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
              Adicionar exame
            </p>
            <div className="relative w-48 mb-2">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Pesquisar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-background/60 py-1.5 pl-7 pr-6 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:w-72 focus:ring-2 focus:ring-violet-500/40 transition-all"
              />
            </div>
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
          )}
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
  const router = useRouter()
  const busy = busyId === row.id
  const isPending = row.status === "pendente" && !row.validated_at
  const exams = row.items?.map((i) => i.exam_name ?? i.medical_exam_name).filter(Boolean) ?? []

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/requests/${row.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          router.push(`/requests/${row.id}`)
        }
      }}
      className={`group relative flex cursor-pointer flex-col gap-1.5 rounded-xl border border-[var(--border)] border-l-4 bg-[var(--card)] px-2.5 py-2 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${urgencyAccent(row.clinical_status)}`}
    >

      {/* Header */}
      <div className="relative flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <span className="font-mono text-[11px] font-bold text-[var(--primary-700)]">{row.custom_id}</span>
          <p className="mt-0.5 truncate text-xs font-semibold text-[var(--text)]">{shortName(row.patient_name)}</p>
          {row.patient_age ? <p className="text-[10px] text-[var(--gray-500)]">{row.patient_age}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.type === "LAB" ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"}`}>
            {row.type === "LAB" ? "LAB" : "MED"}
          </span>
          {priorityBadge(row.clinical_status, row.clinical_status_display)}
        </div>
      </div>

      {/* Exames como pills */}
      {exams.length > 0 ? (
        <div className="relative flex flex-wrap gap-0.5">
          {exams.slice(0, 3).map((name, i) => (
            <span key={i} className="inline-flex items-center gap-0.5 rounded-full border border-[var(--primary-200)] bg-[var(--primary-50)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary-700)]">
              <FlaskConical size={8} />
              {name}
            </span>
          ))}
          {exams.length > 3 ? (
            <span className="rounded-full border border-[var(--border)] bg-[var(--gray-100)] px-1.5 py-0.5 text-[10px] text-[var(--gray-500)]">
              +{exams.length - 3}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Footer */}
      <div className="relative flex items-center justify-between gap-1.5">
        <span className="flex items-center gap-1 text-[10px] text-[var(--gray-400)]">
          <Clock size={9} />
          {fmt(row.created_at)}
        </span>

        {isPending ? (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCancel?.(row) }}
              disabled={busy}
              className="inline-flex h-6 items-center gap-1 rounded-full border border-red-200 bg-white px-2 text-[10px] font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle size={10} />
              Cancelar
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit?.(row) }}
              disabled={busy}
              className="inline-flex h-6 items-center gap-1 rounded-full border border-[var(--border)] bg-white px-2 text-[10px] font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-50"
            >
              <Pencil size={10} />
              Editar
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onValidate?.(row) }}
              disabled={busy}
              className="inline-flex h-6 items-center gap-1 rounded-full bg-[var(--primary-600)] px-2.5 text-[10px] font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60"
            >
              {busy ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
              {busy ? "..." : "Encaminhar"}
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
  accent,
}: {
  title: string
  count: number
  loading: boolean
  empty: string
  children: React.ReactNode
  accent: { header: string; badge: string }
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className={`mb-1.5 flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 ${accent.header}`}>
        <span className="text-sm font-semibold">{title}</span>
        {!loading ? (
          <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${accent.badge}`}>
            {count}
          </span>
        ) : null}
      </div>
      {loading ? (
        <p className="px-1 text-xs text-[var(--gray-400)]">Carregando...</p>
      ) : count === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--gray-400)]">{empty}</p>
      ) : (
        <div className="min-h-0 space-y-1 overflow-y-auto pr-0.5 [scrollbar-width:thin]" style={{ maxHeight: "calc(100vh - 232px)" }}>
          {children}
        </div>
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
  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(12)
  const [requestType, setRequestType] = useState<RequestTypeFilter>("LAB")

  const loadAll = useCallback(async () => {
    setLoadingPending(true)
    setLoadingCanceled(true)
    setLoadingValidated(true)
    try {
      const { items } = await apiFetchList<LabRequest>(
        `/clinical/labrequest/?type=${requestType}`,
        { page: 1, pageSize: 200, clientCache: false }
      )
      // Modelo A: "encaminhada" é marcada por validated_at (o status fica
      // 'pendente' durante toda a fase pré-analítica). Pendentes = ainda não
      // encaminhadas; Encaminhadas = validated_at presente (e não canceladas).
      setPending(items.filter((r) => r.status === "pendente" && !r.validated_at))
      setCanceled(items.filter((r) => r.status === "cancelado"))
      setValidated(items.filter((r) => !!r.validated_at && r.status !== "cancelado"))
    } catch { /* silent */ }
    finally {
      setLoadingPending(false)
      setLoadingCanceled(false)
      setLoadingValidated(false)
    }
  }, [requestType])

  useEffect(() => {
    loadAll()
  }, [loadAll, safeRefreshToken])

  async function handleValidate(row: LabRequest) {
    setBusyId(row.id)
    setGlobalError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${row.id}/validar/`, { method: "POST" })
      // Atualização otimista: sai de "Pendentes" e entra em "Encaminhadas" já,
      // mesmo que o reload seguinte falhe (ex.: blip de rede).
      setPending((prev) => prev.filter((r) => r.id !== row.id))
      setValidated((prev) =>
        prev.some((r) => r.id === row.id)
          ? prev
          : [{ ...row, validated_at: new Date().toISOString() }, ...prev],
      )
      setFeedback(`${row.custom_id} encaminhada para colheita.`)
      loadAll()
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
      loadAll()
    } catch (e: any) {
      const msg: string = e?.message ?? ""
      if (msg.includes("já foi cancelada")) {
        setPending((prev) => prev.filter((r) => r.id !== row.id))
        loadAll()
      } else {
        setGlobalError(msg || "Falha ao cancelar.")
      }
    } finally {
      setBusyId(null)
    }
  }

  function filterRows(rows: LabRequest[]): LabRequest[] {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      r.custom_id?.toLowerCase().includes(q) ||
      r.patient_name?.toLowerCase().includes(q) ||
      r.items?.some((i) =>
        i.exam_name?.toLowerCase().includes(q) ||
        i.medical_exam_name?.toLowerCase().includes(q)
      )
    )
  }

  function visibleRows(rows: LabRequest[]): LabRequest[] {
    return filterRows(rows).slice(0, pageSize)
  }

  function handleSaved(updated: LabRequest) {
    setPending((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setEditRow(null)
    setFeedback(`${updated.custom_id} atualizada.`)
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-2">
        <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-500" />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
          <div className="absolute right-3 top-2 z-10 flex flex-wrap justify-end gap-2">
            {REQUEST_TYPE_OPTIONS.map((option) => {
              const Icon = option.icon
              const active = requestType === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setRequestType(option.value)}
                  className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border px-3 text-[11px] font-semibold transition ${
                    active
                      ? "border-sky-400 bg-sky-600 text-white shadow-sm"
                      : "border-white/30 bg-white/50 text-muted-foreground shadow-sm backdrop-blur-sm hover:border-sky-400/60 hover:text-foreground dark:border-white/10 dark:bg-white/10"
                  }`}
                >
                  <Icon size={14} strokeWidth={2} />
                  {option.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2 pl-4 pt-12">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20">
                <FlaskConical size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">Fila de requisições</h1>
                <p className="text-[11px] text-muted-foreground">
                  {filterRows(pending).length + filterRows(canceled).length + filterRows(validated).length} itens visíveis
                </p>
              </div>
            </div>

            <Link
              href="/requests/new"
              className="group/btn inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--primary-400)] bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] px-3.5 text-xs font-semibold text-white shadow-md shadow-[var(--primary-900)]/20 transition-all duration-150 hover:from-[var(--primary-600)] hover:to-[var(--primary-800)] hover:text-white hover:shadow-lg hover:shadow-[var(--primary-900)]/30 active:scale-95"
            >
              <Plus size={13} strokeWidth={2.5} className="transition-transform duration-150 group-hover/btn:rotate-90" />
              Nova requisição
            </Link>

            <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray-400)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por código, paciente ou exame…"
                className="w-full rounded-lg border border-white/30 bg-white/50 py-1.5 pl-8 pr-8 text-xs text-foreground shadow-sm backdrop-blur-sm transition placeholder:text-[var(--gray-400)] hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] dark:border-white/10 dark:bg-white/10"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--gray-500)] transition hover:text-[var(--text)]"
                  aria-label="Limpar pesquisa"
                >
                  <RotateCcw size={12} />
                </button>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1" title="Itens por coluna">
              <PageSizeInput value={pageSize} onChange={setPageSize} ariaLabel="Itens por coluna" min={1} max={50} />
              <span className="text-[11px] text-muted-foreground">/col</span>
            </div>
          </div>
        </section>

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

        <div className="grid min-h-0 grid-cols-1 gap-2 md:grid-cols-3">
          {/* Coluna 1 — Pendentes */}
          <Column
            title="Pendentes"
            count={filterRows(pending).length}
            loading={loadingPending}
            empty="Sem requisições pendentes."
            accent={{ header: "border-amber-200 bg-amber-50 text-amber-800", badge: "bg-amber-100 text-amber-700" }}
          >
            {visibleRows(pending).map((row) => (
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
            count={filterRows(canceled).length}
            loading={loadingCanceled}
            empty="Sem requisições canceladas."
            accent={{ header: "border-red-200 bg-red-50 text-red-800", badge: "bg-red-100 text-red-700" }}
          >
            {visibleRows(canceled).map((row) => (
              <RequestCard key={row.id} row={row} busyId={null} />
            ))}
          </Column>

          {/* Coluna 3 — Validadas */}
          <Column
            title="Encaminhadas à Enfermagem"
            count={filterRows(validated).length}
            loading={loadingValidated}
            empty="Nenhuma requisição encaminhada."
            accent={{ header: "border-emerald-200 bg-emerald-50 text-emerald-800", badge: "bg-emerald-100 text-emerald-700" }}
          >
            {visibleRows(validated).map((row) => (
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
