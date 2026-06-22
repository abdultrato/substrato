"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch, apiFetchList } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestItem = {
  id: number
  exam_name?: string
  medical_exam_name?: string
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
  validated_at?: string
  updated_at?: string
  items?: RequestItem[]
}

type SearchFilters = {
  dateFrom: string
  dateTo: string
  patientName: string
  reqNumber: string
  docNumber: string
  birthDate: string
}

const EMPTY_FILTERS: SearchFilters = {
  dateFrom: "",
  dateTo: "",
  patientName: "",
  reqNumber: "",
  docNumber: "",
  birthDate: "",
}

function isFiltersEmpty(f: SearchFilters) {
  return Object.values(f).every((v) => !v.trim())
}

function fmt(v?: string) {
  if (!v) return "-"
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function examNames(row: LabRequest) {
  return (row.items ?? [])
    .filter((i) => i.exam_name || i.medical_exam_name)
    .map((i) => i.exam_name ?? i.medical_exam_name ?? "")
    .join(", ")
}

// ─── Report Card ──────────────────────────────────────────────────────────────

function ReportCard({
  row,
  onNotify,
  busyId,
  notifiedId,
}: {
  row: LabRequest
  onNotify: (row: LabRequest) => void
  busyId: number | null
  notifiedId: number | null
}) {
  const busy = busyId === row.id

  function openPdf() {
    window.open(`/api/v1/clinical/labrequest/${row.id}/results-pdf/`, "_blank")
  }

  return (
    <article className="rounded border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/requests/${row.id}`}
              className="text-sm font-semibold text-[var(--primary-700)] hover:underline dark:text-[var(--primary-400)]"
            >
              {row.custom_id}
            </Link>
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              Validado
            </span>
          </div>
          <p className="text-xs text-[var(--text)]">{row.patient_name}</p>
          {row.patient_age && (
            <p className="text-[10px] text-[var(--gray-500)]">{row.patient_age}</p>
          )}
          <p className="mt-0.5 text-[11px] text-[var(--gray-500)]">{examNames(row)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
              row.type === "LAB"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
            }`}
          >
            {row.type}
          </span>
          {getClinicalStatusLabel(row.clinical_status, row.clinical_status_display) && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              {getClinicalStatusLabel(row.clinical_status, row.clinical_status_display)}
            </span>
          )}
          <span className="text-[10px] text-[var(--gray-400)]">Validado {fmt(row.updated_at)}</span>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2">
        {notifiedId === row.id ? (
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            ✓ Notificação enviada ao paciente
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNotify(row)}
            disabled={busy}
            className="h-7 rounded border border-[var(--border)] px-2.5 text-[11px] text-[var(--gray-700)] hover:bg-[var(--gray-100)] disabled:opacity-60 dark:text-[var(--gray-300)]"
          >
            {busy ? "A notificar..." : "Notificar paciente"}
          </button>
          <button
            type="button"
            onClick={openPdf}
            className="h-7 rounded bg-[var(--primary-600)] px-3 text-[11px] font-semibold text-white hover:bg-[var(--primary-700)]"
          >
            Ver laudo (PDF)
          </button>
        </div>
      </div>
    </article>
  )
}

// ─── Search Panel ─────────────────────────────────────────────────────────────

function SearchPanel({
  filters,
  onChange,
  onSearch,
  onClear,
  loading,
}: {
  filters: SearchFilters
  onChange: (f: SearchFilters) => void
  onSearch: () => void
  onClear: () => void
  loading: boolean
}) {
  function set(key: keyof SearchFilters, value: string) {
    onChange({ ...filters, [key]: value })
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") onSearch()
  }

  const inputCls =
    "h-7 w-full rounded border border-[var(--border)] bg-[var(--card)] px-2 text-xs text-[var(--text)] placeholder:text-[var(--gray-400)] focus:border-[var(--primary-400)] focus:outline-none"
  const labelCls = "block text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)] mb-0.5"

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">
        Pesquisa
      </p>

      <div className="space-y-2.5">
        {/* Período */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[120px] flex-1">
            <label className={labelCls}>Período — de</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => set("dateFrom", e.target.value)}
              onKeyDown={handleKey}
              className={inputCls}
            />
          </div>
          <div className="min-w-[120px] flex-1">
            <label className={labelCls}>até</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => set("dateTo", e.target.value)}
              onKeyDown={handleKey}
              className={inputCls}
            />
          </div>
          <div className="min-w-[180px] flex-[2]">
            <label className={labelCls}>Nome (inicial, final ou caracteres)</label>
            <input
              type="text"
              placeholder="ex: João, nunes, Jo..."
              value={filters.patientName}
              onChange={(e) => set("patientName", e.target.value)}
              onKeyDown={handleKey}
              className={inputCls}
            />
          </div>
        </div>

        {/* Outros critérios */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[150px] flex-1">
            <label className={labelCls}>Nº requisição</label>
            <input
              type="text"
              placeholder="ex: REQ-20260619-..."
              value={filters.reqNumber}
              onChange={(e) => set("reqNumber", e.target.value)}
              onKeyDown={handleKey}
              className={inputCls}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <label className={labelCls}>Nº documento</label>
            <input
              type="text"
              placeholder="BI / passaporte..."
              value={filters.docNumber}
              onChange={(e) => set("docNumber", e.target.value)}
              onKeyDown={handleKey}
              className={inputCls}
            />
          </div>
          <div className="min-w-[130px] flex-1">
            <label className={labelCls}>Data de nascimento</label>
            <input
              type="date"
              value={filters.birthDate}
              onChange={(e) => set("birthDate", e.target.value)}
              onKeyDown={handleKey}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={onClear}
          className="h-7 rounded border border-[var(--border)] px-3 text-xs text-[var(--gray-600)] hover:bg-[var(--gray-100)] dark:text-[var(--gray-300)]"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={onSearch}
          disabled={loading}
          className="h-7 rounded bg-[var(--primary-600)] px-4 text-xs font-semibold text-white hover:bg-[var(--primary-700)] disabled:opacity-60"
        >
          {loading ? "A pesquisar..." : "Pesquisar"}
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LabReportsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<LabRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notifiedId, setNotifiedId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS)
  const [activeFilters, setActiveFilters] = useState<SearchFilters>(EMPTY_FILTERS)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const searchActive = !isFiltersEmpty(activeFilters)
  const didInit = useRef(false)

  const load = useCallback(async (f: SearchFilters, isSearch: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ fase: "laudos", ordering: "-updated_at" })
      if (isSearch) {
        params.set("page_size", "50")
        if (f.dateFrom) params.set("validated_from", f.dateFrom)
        if (f.dateTo) params.set("validated_to", f.dateTo)
        if (f.patientName.trim()) params.set("patient_name", f.patientName.trim())
        if (f.reqNumber.trim()) params.set("custom_id", f.reqNumber.trim())
        if (f.docNumber.trim()) params.set("patient_document", f.docNumber.trim())
        if (f.birthDate) params.set("patient_birth_date", f.birthDate)
      } else {
        params.set("page_size", "5")
      }
      const { items, meta } = await apiFetchList<LabRequest>(
        `/clinical/labrequest/?${params.toString()}`,
        { clientCache: false },
      )
      setRows(items)
      setTotalCount(typeof meta.total === "number" ? meta.total : null)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar laudos.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (didInit.current) {
      load(EMPTY_FILTERS, false)
    } else {
      didInit.current = true
      load(EMPTY_FILTERS, false)
    }
  }, [load, safeRefreshToken])

  function handleSearch() {
    setActiveFilters(filters)
    load(filters, !isFiltersEmpty(filters))
  }

  function handleClear() {
    setFilters(EMPTY_FILTERS)
    setActiveFilters(EMPTY_FILTERS)
    load(EMPTY_FILTERS, false)
  }

  async function handleNotify(row: LabRequest) {
    setBusyId(row.id)
    setError(null)
    setNotifiedId(null)
    try {
      await apiFetch(`/clinical/labrequest/${row.id}/send-results-notification/`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      setNotifiedId(row.id)
    } catch (e: any) {
      setError(e?.message || "Falha ao enviar notificação.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <PageHeader
          title="Laudos"
          subtitle=""
        />

        <SearchPanel
          filters={filters}
          onChange={setFilters}
          onSearch={handleSearch}
          onClear={handleClear}
          loading={loading}
        />

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[var(--gray-400)]">A carregar...</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[var(--gray-400)]">
                {searchActive
                  ? `${rows.length}${totalCount && totalCount > rows.length ? ` de ${totalCount}` : ""} resultado${rows.length !== 1 ? "s" : ""} encontrado${rows.length !== 1 ? "s" : ""}`
                  : "5 laudos mais recentes"}
              </p>
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-[var(--gray-400)]">
                {searchActive ? "Nenhum laudo encontrado para esta pesquisa." : "Sem laudos disponíveis."}
              </p>
            ) : (
              <div className="space-y-2">
                {rows.map((row) => (
                  <ReportCard
                    key={row.id}
                    row={row}
                    onNotify={handleNotify}
                    busyId={busyId}
                    notifiedId={notifiedId}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
