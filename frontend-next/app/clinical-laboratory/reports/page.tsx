"use client"

import Link from "next/link"
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch, apiFetchList } from "@/lib/api"
import { formatCount } from "@/lib/i18n/plural"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"
import useDebounce from "@/hooks/useDebounce"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { genderLabel } from "@/components/clinical-laboratory/ReceptionWorkflow"

type LabRequest = {
  id: number
  custom_id?: string
  patient_name?: string
  patient_age?: string
  patient_gender?: string
  clinical_status?: string
  clinical_status_display?: string
  updated_at?: string
  validated_at?: string
}

// ─── Search filters ─────────────────────────────────────────────────────────

type SearchFilters = {
  search: string
  reqNumber: string
  patientName: string
  docNumber: string
  birthDate: string
  gender: string
  priority: string
  type: string
  critical: string
  exam: string
  physician: string
  dateFrom: string
  dateTo: string
}

const EMPTY_FILTERS: SearchFilters = {
  search: "",
  reqNumber: "",
  patientName: "",
  docNumber: "",
  birthDate: "",
  gender: "",
  priority: "",
  type: "",
  critical: "",
  exam: "",
  physician: "",
  dateFrom: "",
  dateTo: "",
}

const PRIORITY_OPTIONS: [string, string][] = [
  ["", "Todas"],
  ["NAO_URGENTE", "Não urgente"],
  ["NORMAL", "Normal"],
  ["ROTINA", "Rotina"],
  ["POUCO_URGENTE", "Pouco urgente"],
  ["PRIORITARIO", "Prioritário"],
  ["URGENTE", "Urgente"],
  ["MUITO_URGENTE", "Muito urgente"],
  ["URGENTISSIMO", "Urgentíssimo"],
  ["EMERGENCIA", "Emergência"],
]

function isFiltersEmpty(f: SearchFilters): boolean {
  return Object.values(f).every((v) => !v.trim())
}

function buildParams(f: SearchFilters): URLSearchParams {
  const p = new URLSearchParams({ fase: "laudos", ordering: "-updated_at" })
  if (f.search.trim()) p.set("search", f.search.trim())
  if (f.reqNumber.trim()) p.set("custom_id", f.reqNumber.trim())
  if (f.patientName.trim()) p.set("patient_name", f.patientName.trim())
  if (f.docNumber.trim()) p.set("patient_document", f.docNumber.trim())
  if (f.birthDate) p.set("patient_birth_date", f.birthDate)
  if (f.gender) p.set("patient_gender", f.gender)
  if (f.priority) p.set("clinical_status", f.priority)
  if (f.type) p.set("type", f.type)
  if (f.critical) p.set("has_critical_result", f.critical)
  if (f.exam.trim()) p.set("exam", f.exam.trim())
  if (f.physician.trim()) p.set("physician", f.physician.trim())
  if (f.dateFrom) p.set("validated_from", f.dateFrom)
  if (f.dateTo) p.set("validated_to", f.dateTo)
  return p
}

// ─── Board columns ──────────────────────────────────────────────────────────

type ColumnKey = "today" | "yesterday" | "month" | "older"

type ColumnConfig = {
  key: ColumnKey
  title: string
  header: string
  badge: string
  top: string
}

const COLUMNS: ColumnConfig[] = [
  { key: "today", title: "Resultados de hoje", header: "text-sky-700", badge: "bg-sky-100 text-sky-800", top: "border-t-2 border-t-sky-400" },
  { key: "yesterday", title: "Resultados de ontem", header: "text-indigo-700", badge: "bg-indigo-100 text-indigo-800", top: "border-t-2 border-t-indigo-400" },
  { key: "month", title: "Resultados deste mês", header: "text-amber-700", badge: "bg-amber-100 text-amber-800", top: "border-t-2 border-t-amber-400" },
  { key: "older", title: "Resultados mais antigos", header: "text-slate-600", badge: "bg-slate-100 text-slate-700", top: "border-t-2 border-t-slate-400" },
]

function laudoDate(row: LabRequest): string | undefined {
  return row.updated_at || row.validated_at
}

function makeBucketer() {
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startYesterday = startToday - 24 * 60 * 60 * 1000
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  return (row: LabRequest): ColumnKey => {
    const value = laudoDate(row)
    const t = value ? new Date(value).getTime() : NaN
    if (Number.isNaN(t)) return "older"
    if (t >= startToday) return "today"
    if (t >= startYesterday) return "yesterday"
    if (t >= startMonth) return "month"
    return "older"
  }
}

// ─── Search panel ───────────────────────────────────────────────────────────

const INPUT_CLS =
  "h-7 w-full rounded border border-white/30 bg-white/35 px-2 text-xs text-[var(--text)] backdrop-blur-sm placeholder:text-[var(--gray-400)] focus:border-[var(--primary-400)] focus:outline-none dark:border-white/10 dark:bg-white/5"
const LABEL_CLS = "block text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)] mb-0.5"

// Campos sempre visíveis na barra rápida; o resto fica em "Filtros avançados".
const QUICK_KEYS: (keyof SearchFilters)[] = ["search", "reqNumber", "patientName"]
const ADVANCED_KEYS = (Object.keys(EMPTY_FILTERS) as (keyof SearchFilters)[]).filter(
  (k) => !QUICK_KEYS.includes(k),
)

function countActive(f: SearchFilters, keys: (keyof SearchFilters)[]): number {
  return keys.filter((k) => f[k].trim()).length
}

function SearchPanel({
  filters,
  onChange,
  onSearch,
  onClear,
  total,
  loading,
}: {
  filters: SearchFilters
  onChange: (f: SearchFilters) => void
  onSearch: () => void
  onClear: () => void
  total: number
  loading: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  function set<K extends keyof SearchFilters>(key: K, value: string) {
    onChange({ ...filters, [key]: value })
  }
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") onSearch()
  }

  const advancedCount = countActive(filters, ADVANCED_KEYS)
  const anyActive = !isFiltersEmpty(filters)

  return (
    <div className="rounded-xl border border-white/20 bg-white/15 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      {/* Barra rápida — sempre visível */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[180px] flex-1">
          <label className={LABEL_CLS}>Pesquisa livre (código, paciente, documento, empresa…)</label>
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--gray-400)]" />
            <input type="search" value={filters.search} onChange={(e) => set("search", e.target.value)} onKeyDown={handleKey} placeholder="Escreva qualquer termo…" className={`${INPUT_CLS} pl-7`} />
          </div>
        </div>
        <div className="w-32 sm:w-40">
          <label className={LABEL_CLS}>Nº requisição</label>
          <input value={filters.reqNumber} onChange={(e) => set("reqNumber", e.target.value)} onKeyDown={handleKey} placeholder="REQ-…" className={INPUT_CLS} />
        </div>
        <div className="w-36 sm:w-48">
          <label className={LABEL_CLS}>Nome do paciente</label>
          <input value={filters.patientName} onChange={(e) => set("patientName", e.target.value)} onKeyDown={handleKey} placeholder="ex: João, nunes…" className={INPUT_CLS} />
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex h-7 items-center gap-1.5 rounded border border-white/30 bg-white/25 px-2.5 text-xs font-medium text-[var(--gray-700)] backdrop-blur-sm hover:bg-white/40 dark:border-white/10 dark:bg-white/5 dark:text-[var(--gray-300)]"
        >
          <SlidersHorizontal size={13} />
          Filtros avançados
          {advancedCount > 0 ? (
            <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--primary-600)] px-1 text-[10px] font-semibold text-white">
              {advancedCount}
            </span>
          ) : null}
          <ChevronDown size={13} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        <span className="ml-auto self-center whitespace-nowrap text-[11px] text-[var(--gray-500)]">
          {loading ? "A procurar…" : formatCount(total, { one: "laudo", other: "laudos" })}
        </span>
      </div>

      {/* Filtros avançados — recolhíveis */}
      {expanded ? (
        <div className="mt-2 border-t border-white/20 pt-2 dark:border-white/10">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            <div>
              <label className={LABEL_CLS}>Nº documento</label>
              <input value={filters.docNumber} onChange={(e) => set("docNumber", e.target.value)} onKeyDown={handleKey} placeholder="BI / passaporte" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Data de nascimento</label>
              <input type="date" value={filters.birthDate} onChange={(e) => set("birthDate", e.target.value)} onKeyDown={handleKey} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Sexo</label>
              <select value={filters.gender} onChange={(e) => set("gender", e.target.value)} className={INPUT_CLS}>
                <option value="">Todos</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Prioridade</label>
              <select value={filters.priority} onChange={(e) => set("priority", e.target.value)} className={INPUT_CLS}>
                {PRIORITY_OPTIONS.map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Tipo</label>
              <select value={filters.type} onChange={(e) => set("type", e.target.value)} className={INPUT_CLS}>
                <option value="">Todos</option>
                <option value="LAB">Laboratório</option>
                <option value="MED">Médico</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Resultado crítico</label>
              <select value={filters.critical} onChange={(e) => set("critical", e.target.value)} className={INPUT_CLS}>
                <option value="">Todos</option>
                <option value="true">Com resultado crítico</option>
                <option value="false">Sem resultado crítico</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Exame</label>
              <input value={filters.exam} onChange={(e) => set("exam", e.target.value)} onKeyDown={handleKey} placeholder="ex: Hemograma…" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Médico solicitante</label>
              <input value={filters.physician} onChange={(e) => set("physician", e.target.value)} onKeyDown={handleKey} placeholder="nome do médico" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Validado — de</label>
              <input type="date" value={filters.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} onKeyDown={handleKey} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Validado — até</label>
              <input type="date" value={filters.dateTo} onChange={(e) => set("dateTo", e.target.value)} onKeyDown={handleKey} className={INPUT_CLS} />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={onClear}
                disabled={!anyActive}
                className="h-7 w-full rounded border border-white/30 bg-white/25 px-3 text-xs font-medium text-[var(--gray-700)] backdrop-blur-sm hover:bg-white/40 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white/25 dark:border-white/10 dark:bg-white/5 dark:text-[var(--gray-300)]"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ─── Smart card ─────────────────────────────────────────────────────────────

function SmartCard({
  row,
  onNotify,
  busy,
  notified,
}: {
  row: LabRequest
  onNotify: (row: LabRequest) => void
  busy: boolean
  notified: boolean
}) {
  const priority = getClinicalStatusLabel(row.clinical_status, row.clinical_status_display)
  const meta = [row.patient_age, genderLabel(row.patient_gender)].filter(Boolean).join(" · ")

  function openPdf() {
    window.open(`/api/v1/clinical/labrequest/${row.id}/results-pdf/`, "_blank")
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-white/20 bg-white/20 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/requests/${row.id}`}
          className="text-sm font-semibold text-[var(--primary-700)] hover:underline dark:text-[var(--primary-400)]"
        >
          {row.custom_id}
        </Link>
        {priority ? (
          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {priority}
          </span>
        ) : null}
      </div>

      <div className="truncate text-xs text-[var(--text)]">
        {row.patient_name}
        {meta ? <span className="text-[10px] text-[var(--gray-500)]"> · {meta}</span> : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={openPdf}
          className="inline-flex h-7 items-center rounded bg-[var(--primary-600)] px-2.5 text-[10px] font-semibold text-white hover:bg-[var(--primary-700)]"
        >
          Imprimir resultado
        </button>
        <button
          type="button"
          onClick={() => onNotify(row)}
          disabled={busy}
          className="inline-flex h-7 items-center rounded border border-[var(--border)] px-2.5 text-[10px] font-medium text-[var(--gray-700)] hover:bg-[var(--gray-100)] disabled:opacity-60 dark:text-[var(--gray-300)]"
        >
          {busy ? "A notificar..." : notified ? "✓ Notificado" : "Notificar paciente"}
        </button>
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function LabReportsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<LabRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notifiedId, setNotifiedId] = useState<number | null>(null)
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS)
  const debouncedFilters = useDebounce(filters, 350)

  const load = useCallback(async (f: SearchFilters) => {
    setLoading(true)
    setError(null)
    try {
      const searching = !isFiltersEmpty(f)
      const { items } = await apiFetchList<LabRequest>(`/clinical/labrequest/?${buildParams(f).toString()}`, {
        page: 1,
        pageSize: searching ? 500 : 200,
        clientCache: false,
      })
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar laudos.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(debouncedFilters)
  }, [load, debouncedFilters, safeRefreshToken])

  const buckets = useMemo(() => {
    const bucketer = makeBucketer()
    const grouped: Record<ColumnKey, LabRequest[]> = { today: [], yesterday: [], month: [], older: [] }
    for (const row of rows) {
      grouped[bucketer(row)].push(row)
    }
    return grouped
  }, [rows])

  async function handleNotify(row: LabRequest) {
    setBusyId(row.id)
    setError(null)
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

  function handleClear() {
    setFilters(EMPTY_FILTERS)
    load(EMPTY_FILTERS)
  }

  return (
    <AppLayout>
      <div className="w-full space-y-3">
        <PageHeader title="Laudos" />

        <SearchPanel
          filters={filters}
          onChange={setFilters}
          onSearch={() => load(filters)}
          onClear={handleClear}
          total={rows.length}
          loading={loading}
        />

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {loading && rows.length === 0 ? (
          <p className="text-sm text-[var(--gray-400)]">A carregar...</p>
        ) : (
          <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
            {COLUMNS.map((column) => {
              const items = buckets[column.key]
              return (
                <section key={column.key} className={`flex flex-col rounded-xl border border-white/20 bg-white/15 p-2 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5 ${column.top}`}>
                  <div className="flex items-center justify-between gap-2 px-1 pb-2 pt-1">
                    <h2 className={`text-xs font-semibold uppercase tracking-wide ${column.header}`}>{column.title}</h2>
                    <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${column.badge}`}>
                      {items.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto pr-1 max-h-[calc(100vh-260px)] [scrollbar-width:thin]">
                    {items.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--gray-500)]">
                        Sem laudos.
                      </div>
                    ) : (
                      items.map((row) => (
                        <SmartCard
                          key={row.id}
                          row={row}
                          onNotify={handleNotify}
                          busy={busyId === row.id}
                          notified={notifiedId === row.id}
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
