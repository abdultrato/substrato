"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ChevronRight } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
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

type BucketKey =
  | "awaiting_reception_validation"
  | "awaiting_collection"
  | "partial_collection"
  | "full_collection"

type BucketDefinition = {
  key: BucketKey
  title: string
  empty: string
  tone: string
}

const BUCKETS: BucketDefinition[] = [
  {
    key: "awaiting_reception_validation",
    title: "Aguardando validação da recepção",
    empty: "Sem requisições pendentes de validação.",
    tone: "border-amber-200 bg-amber-50/60 text-amber-800",
  },
  {
    key: "awaiting_collection",
    title: "Aguardando coleta da amostra",
    empty: "Sem requisições a aguardar a primeira coleta.",
    tone: "border-sky-200 bg-sky-50/60 text-sky-800",
  },
  {
    key: "partial_collection",
    title: "Parcialmente coletadas",
    empty: "Sem requisições parcialmente coletadas.",
    tone: "border-violet-200 bg-violet-50/60 text-violet-800",
  },
  {
    key: "full_collection",
    title: "Totalmente coletadas",
    empty: "Sem requisições totalmente coletadas.",
    tone: "border-emerald-200 bg-emerald-50/60 text-emerald-800",
  },
]

function normalizeText(value: string | undefined | null): string {
  return (value || "").trim().toLocaleLowerCase()
}

function isCollectedProgress(status: string): boolean {
  return status === "coletada" || status === "recebida"
}

function classifyRequest(row: RequestRow): BucketKey {
  const items = Array.isArray(row.items) ? row.items : []
  const hasValidatedReception = Boolean(row.validated_at)

  if (!hasValidatedReception) {
    return "awaiting_reception_validation"
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

function RequestCard({ row, bucket }: { row: RequestRow; bucket: BucketKey }) {
  return (
    <Link
      href={`/nursing/requests/${row.id}`}
      className="group flex flex-col justify-between border border-slate-200 bg-transparent p-2.5 transition-colors hover:border-primary/30 hover:bg-white/30 [font-size:65%]"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-slate-900">
              {row.custom_id || `REQ ${row.id}`}
            </div>
            <div className="mt-1 text-sm text-slate-700">{row.patient_name || "Paciente sem nome"}</div>
            {row.patient_age ? (
              <div className="mt-1 text-xs text-slate-500">{row.patient_age}</div>
            ) : null}
          </div>
          <ChevronRight
            size={16}
            className="shrink-0 text-slate-300 transition-colors group-hover:text-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
            {getClinicalStatusLabel(row.clinical_status, row.clinical_status_display) || "Sem prioridade"}
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
            {requestItemsLabel(row)}
          </span>
        </div>
      </div>

      <div className="pt-2">
        {(() => {
          const { label, color } = statusBadge(row, bucket)
          return (
            <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-medium ${color}`}>
              <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full border border-current text-[7px] font-bold leading-none">i</span>
              {label}
            </span>
          )
        })()}
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
  const debouncedSearch = useDebounce(search, 250)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setErrorMessage(null)
        const query = new URLSearchParams()
        query.set("type", "LAB")
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
  }, [debouncedSearch, safeRefreshToken])

  const grouped = useMemo(() => {
    const base: Record<BucketKey, RequestRow[]> = {
      awaiting_reception_validation: [],
      awaiting_collection: [],
      partial_collection: [],
      full_collection: [],
    }

    for (const row of rows) {
      base[classifyRequest(row)].push(row)
    }

    return base
  }, [rows])

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-3 [font-size:70%]">
        <PageHeader
          title="Requisições (Enfermagem)"
          actions={
            <div className="flex w-full items-center gap-2 md:w-auto">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por código, paciente ou prioridade"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm md:w-80"
              />
            </div>
          }
        />

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
                        <RequestCard key={row.id} row={row} bucket={bucket.key} />
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
