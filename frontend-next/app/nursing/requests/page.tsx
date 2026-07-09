"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  ClipboardList,
  FlaskConical,
  Hourglass,
  Search,
  Stethoscope,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useDebounce from "@/hooks/useDebounce"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"
import { GROUPS } from "@/lib/rbac"

type RequestItem = {
  id: number
  exam_name?: string
  medical_exam_name?: string
  sample_status?: string
  rejection_reason_names?: string[]
  rejection_note?: string
}

type RequestRow = {
  id: number
  custom_id?: string
  patient_name?: string
  patient_age?: string
  clinical_status?: string
  clinical_status_display?: string
  validated_at?: string
  items?: RequestItem[]
}

type RequestTypeFilter = "LAB" | "MED"

type BucketKey =
  | "awaiting_reception_validation"
  | "awaiting_collection"
  | "partial_collection"
  | "full_collection"

type BucketDefinition = {
  key: BucketKey
  title: string
  short: string
  icon: any
  chip: string
  empty: string
  tone: string
}

const BUCKETS: BucketDefinition[] = [
  {
    key: "awaiting_reception_validation",
    title: "Aguardando validação da recepção",
    short: "Validação recepção",
    icon: Hourglass,
    chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    empty: "Sem requisições pendentes de validação.",
    tone: "border-amber-200 bg-amber-50/60 text-amber-800",
  },
  {
    key: "awaiting_collection",
    title: "Aguardando coleta da amostra",
    short: "Aguardando coleta",
    icon: FlaskConical,
    chip: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    empty: "Sem requisições a aguardar a primeira coleta.",
    tone: "border-sky-200 bg-sky-50/60 text-sky-800",
  },
  {
    key: "partial_collection",
    title: "Parcialmente coletadas",
    short: "Parciais",
    icon: CircleDashed,
    chip: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    empty: "Sem requisições parcialmente coletadas.",
    tone: "border-violet-200 bg-violet-50/60 text-violet-800",
  },
  {
    key: "full_collection",
    title: "Totalmente coletadas",
    short: "Completas",
    icon: CheckCircle2,
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    empty: "Sem requisições totalmente coletadas.",
    tone: "border-emerald-200 bg-emerald-50/60 text-emerald-800",
  },
]

const REQUEST_TYPE_OPTIONS: Array<{
  value: RequestTypeFilter
  label: string
  icon: typeof FlaskConical
}> = [
  { value: "MED", label: "Exames médicos", icon: Stethoscope },
  { value: "LAB", label: "Exames laboratoriais", icon: FlaskConical },
]

function normalizeText(value: string | undefined | null): string {
  return (value || "").trim().toLocaleLowerCase()
}

function isCollectedProgress(status: string): boolean {
  return status === "coletada" || status === "recebida"
}

function rejectedItems(row: RequestRow): RequestItem[] {
  const items = Array.isArray(row.items) ? row.items : []
  return items.filter((item) => normalizeText(item.sample_status) === "rejeitada")
}

function classifyRequest(row: RequestRow): BucketKey {
  const items = Array.isArray(row.items) ? row.items : []
  const hasValidatedReception = Boolean(row.validated_at)

  if (!hasValidatedReception) {
    return "awaiting_reception_validation"
  }

  // Amostra rejeitada pelo laboratório volta a precisar de coleta (recoleta),
  // por isso a requisição regressa à coluna de espera de coleta.
  if (rejectedItems(row).length > 0) {
    return "awaiting_collection"
  }

  const statuses = items
    .map((item) => normalizeText(item.sample_status))
    .filter(Boolean)

  const collectedCount = statuses.filter(isCollectedProgress).length
  const totalCount = statuses.length

  if (totalCount > 0 && collectedCount === totalCount) {
    return "full_collection"
  }

  if (collectedCount > 0) {
    return "partial_collection"
  }

  return "awaiting_collection"
}

function requestItemsLabel(row: RequestRow): string {
  const items = Array.isArray(row.items) ? row.items : []
  if (items.length === 0) return "Sem exames"
  return `${items.length} ${items.length === 1 ? "exame" : "exames"}`
}

function formatPriority(status: string | undefined): string {
  if (!status) return "Sem prioridade"
  switch (status.toUpperCase()) {
    case "BAIXA": return "Baixa prioridade"
    case "NORMAL": return "Prioridade normal"
    case "ALTA": return "Alta prioridade"
    case "URGENTE": return "Urgente"
    case "EMERGENCIA": return "Emergência"
    default: return status;
  }
}

type StatusBadge = { label: string; color: string }

function statusBadge(row: RequestRow, bucket: BucketKey): StatusBadge {
  if (bucket === "awaiting_reception_validation") {
    return { label: "Aguardando validação na recepção", color: "text-amber-700 border-amber-200 bg-amber-50/60" }
  }

  const items = Array.isArray(row.items) ? row.items : []
  const collected = items.filter((item) => isCollectedProgress(normalizeText(item.sample_status))).length
  const total = items.length

  if (bucket === "full_collection") {
    return { label: "Coleta concluída", color: "text-emerald-700 border-emerald-200 bg-emerald-50/60" }
  }

  if (bucket === "partial_collection") {
    return { label: `${collected}/${total} exames coletados`, color: "text-violet-700 border-violet-200 bg-violet-50/60" }
  }

  return { label: "Aguardando coleta", color: "text-sky-700 border-sky-200 bg-sky-50/60" }
}

function RequestCardInProcedureFormat({ row }: { row: RequestRow }) {
  const [showReason, setShowReason] = useState(false)
  const rejected = rejectedItems(row)
  const code = row.custom_id || `REQ ${row.id}`
  const patientName = row.patient_name || "Paciente sem nome"
  const age = row.patient_age ? `${row.patient_age} anos` : "Idade não informada"

  // Count collected items
  const items = Array.isArray(row.items) ? row.items : []
  const collectedCount = items.filter(item =>
    isCollectedProgress(normalizeText(item.sample_status))
  ).length
  const totalItems = items.length

  return (
    <Link
      href={`/nursing/requests/${row.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-md backdrop-blur-sm transition hover:border-violet-300/50 hover:shadow-md dark:bg-white/5 dark:border-white/10 dark:hover:border-violet-500/30"
    >
      <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />

      <div className="flex flex-1 flex-col gap-2 px-4 py-3 pl-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-mono text-muted-foreground">{code}</p>
            <p className="text-sm font-semibold leading-snug text-foreground">{patientName}</p>
            <p className="text-xs text-muted-foreground">{age}</p>
            {/* Clinical status as secondary info */}
            <p className="text-xs text-muted-foreground">
              {formatPriority(row.clinical_status)}
            </p>
          </div>
          <ChevronRight
            size={16}
            className="shrink-0 text-slate-300 transition-colors group-hover:text-primary"
          />
        </div>

        {/* Items info */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>
            {totalItems} {totalItems === 1 ? "exame" : "exames"}
          </span>
          <span>
            {collectedCount} coletado{collectedCount === 1 ? "" : "s"}
          </span>
          <span>
            {totalItems - collectedCount} pendente{totalItems - collectedCount === 1 ? "" : "s"}
          </span>
        </div>

        {/* Rejected items notice */}
        {rejected.length > 0 ? (
          <div>
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setShowReason(!showReason)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  event.stopPropagation()
                  setShowReason(!showReason)
                }
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700 transition-colors hover:bg-rose-100"
            >
              <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full border border-current text-[7px] font-bold leading-none">i</span>
              {rejected.length} amostra{rejected.length === 1 ? "" : "s"} rejeitada{rejected.length === 1 ? "" : "s"}
            </span>
            {showReason ? (
              <div className="mt-1 space-y-0.5 rounded border border-rose-200 bg-rose-50/70 px-1.5 py-1 text-[9px] leading-snug text-rose-800">
                {rejected.map((item) => (
                  <div key={item.id}>
                    <span className="font-semibold">{item.exam_name || item.medical_exam_name || "Exame"}:</span>{" "}
                    {(item.rejection_reason_names || []).join(", ") || "Motivo não especificado"}
                    {item.rejection_note ? ` — ${item.rejection_note}` : ""}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Validation status */}
        {!row.validated_at ? (
          <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-800">
            <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full border border-current text-[7px] font-bold leading-none">i</span>
            Aguardando validação
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-800">
            <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full border border-current text-[7px] font-bold leading-none">i</span>
            Validado
          </span>
        )}
      </div>
    </Link>
  )
}

export default function NursingRequestsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [rows, setRows] = useState<RequestRow[]>([])
  const [requestType, setRequestType] = useState<RequestTypeFilter>("LAB")
  const debouncedSearch = useDebounce(search, 250)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setErrorMessage(null)
        const query = new URLSearchParams()
        query.set("type", requestType)
        if (debouncedSearch.trim()) {
          query.set("search", debouncedSearch.trim())
        }

        const response = await apiFetchList<RequestRow>(`/requests/?${query.toString()}`, {
          page: 1,
          pageSize: 200,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        })

        if (!mounted) return
        setRows(Array.isArray(response?.items) ? response.items : [])
      } catch (error: any) {
        if (!mounted) return
        setErrorMessage(error?.message || "Falha ao carregar requisições.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [debouncedSearch, requestType, safeRefreshToken])

  const grouped = useMemo(() => {
    const base: Record<BucketKey, RequestRow[]> = {
      awaiting_reception_validation: [],
      awaiting_collection: [],
      partial_collection: [],
      full_collection: [],
    }

    for (const row of rows) {
      // Only process requests that have items (exams/procedures)
      if (Array.isArray(row.items) && row.items.length > 0) {
        base[classifyRequest(row)].push(row)
      }
    }

    return base
  }, [rows])

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-3 [font-size:70%]">
        <div className="relative flex flex-wrap items-start justify-between gap-3 overflow-hidden rounded-xl border border-white/20 bg-gradient-to-r from-amber-500/15 via-white/30 to-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:from-amber-500/10 dark:via-white/5 dark:to-white/5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <ClipboardList size={22} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold text-foreground">Requisições</h1>
              <p className="text-[11px] text-muted-foreground">Fila de requisições por estado de validação e coleta.</p>
            </div>
          </div>

          <div className="absolute right-4 top-3 z-10 flex flex-wrap justify-end gap-2">
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
                      ? "border-amber-400 bg-amber-500 text-white shadow-sm"
                      : "border-white/30 bg-white/40 text-muted-foreground shadow-sm backdrop-blur-sm hover:border-amber-400/60 hover:text-foreground dark:border-white/10 dark:bg-white/10"
                  }`}
                >
                  <Icon size={14} strokeWidth={2} />
                  {option.label}
                </button>
              )
            })}
          </div>

          <div className="flex min-w-0 flex-col items-end gap-2 pt-10">
            <div className="flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto">
              {BUCKETS.map((bucket) => {
                const Icon = bucket.icon
                return (
                  <span
                    key={`stat-${bucket.key}`}
                    className="flex shrink-0 items-center gap-2 rounded-lg border border-white/30 bg-white/40 px-3 py-1.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10"
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${bucket.chip}`}>
                      <Icon size={14} strokeWidth={2} />
                    </span>
                    <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {bucket.short}
                    </span>
                    <span className="font-display text-lg font-bold leading-none text-foreground tabular-nums">
                      {loading ? "..." : grouped[bucket.key].length}
                    </span>
                  </span>
                )
              })}
              <div className="relative w-44 shrink-0">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar…"
                  className="w-full rounded-lg border border-white/30 bg-white/40 py-1.5 pl-8 pr-3 text-xs text-foreground shadow-sm backdrop-blur-sm transition placeholder:text-muted-foreground hover:border-amber-400/60 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/25 dark:border-white/10 dark:bg-white/10"
                />
              </div>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-slate-500">Carregando...</div>
        ) : (
          <div className="grid gap-2 lg:grid-cols-4 md:grid-cols-2">
            {BUCKETS.map((bucket) => {
              const items = grouped[bucket.key]
              return (
                <section
                  key={bucket.key}
                  className="flex h-[calc(100vh-11rem)] flex-col rounded-b-xl border border-slate-200 bg-transparent p-1.5"
                >
                  <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2 pr-[5px]">
                    <h2 className="text-xs font-semibold text-slate-900">{bucket.title}</h2>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${bucket.tone}`}>
                      {items.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1.5 overflow-y-auto pr-0.5 [scrollbar-width:thin]  [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
                    {items.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-transparent px-4 py-6 text-center text-sm text-slate-500">
                        {bucket.empty}
                      </div>
                    ) : (
                      items.map((row) => (
                        <RequestCardInProcedureFormat key={row.id} row={row} />
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
