"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronLeft, FileText, Loader2, Search, SlidersHorizontal } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
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

// ─── Search filters ──────────────────────────────────────────────────────────

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
  search: "", reqNumber: "", patientName: "", docNumber: "",
  birthDate: "", gender: "", priority: "", type: "",
  critical: "", exam: "", physician: "", dateFrom: "", dateTo: "",
}

const PRIORITY_OPTIONS: [string, string][] = [
  ["", "Todas"], ["NAO_URGENTE", "Não urgente"], ["NORMAL", "Normal"],
  ["ROTINA", "Rotina"], ["POUCO_URGENTE", "Pouco urgente"], ["PRIORITARIO", "Prioritário"],
  ["URGENTE", "Urgente"], ["MUITO_URGENTE", "Muito urgente"],
  ["URGENTISSIMO", "Urgentíssimo"], ["EMERGENCIA", "Emergência"],
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

// ─── Search panel ────────────────────────────────────────────────────────────

const INPUT_CLS =
  "h-7 w-full rounded-lg border border-white/30 bg-white/35 px-2 text-[11px] text-[var(--text)] backdrop-blur-sm placeholder:text-[var(--gray-400)] focus:border-sky-400 focus:outline-none dark:border-white/10 dark:bg-white/5"
const LABEL_CLS = "block text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)] mb-0.5"

const QUICK_KEYS: (keyof SearchFilters)[] = ["search", "reqNumber", "patientName"]
const ADVANCED_KEYS = (Object.keys(EMPTY_FILTERS) as (keyof SearchFilters)[]).filter(
  (k) => !QUICK_KEYS.includes(k),
)

function countActive(f: SearchFilters, keys: (keyof SearchFilters)[]): number {
  return keys.filter((k) => f[k].trim()).length
}

function ReportsHeader({
  filters, onChange, onSearch, onClear, total, loading,
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
    <section className="relative overflow-hidden rounded-xl border border-sky-200/50 bg-gradient-to-br from-sky-50/80 via-white/60 to-cyan-50/60 shadow-sm backdrop-blur-sm dark:border-sky-800/30 dark:from-sky-950/30 dark:via-slate-900/40 dark:to-cyan-950/20">
      <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />

      {/* ── Linha 1: banner + pílulas por período + voltar ── */}
      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 pl-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-500/25">
            <FileText size={15} />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-sm font-bold leading-tight text-foreground">Laudos</h1>
            <p className="text-[10px] text-muted-foreground">
              {loading
                ? <><Loader2 size={9} className="inline animate-spin mr-1" />A carregar…</>
                : total > 0
                  ? formatCount(total, { one: "laudo", other: "laudos" })
                  : "Sem laudos"}
            </p>
          </div>
        </div>

        <Link href="/clinical-laboratory"
          className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg border border-white/40 bg-white/30 px-2.5 text-[11px] text-[var(--gray-700)] backdrop-blur-sm transition hover:bg-white/50 dark:border-white/10 dark:text-[var(--gray-300)] dark:hover:bg-white/10">
          <ChevronLeft size={11} /> Voltar
        </Link>
      </div>

      {/* ── Linha 2: pesquisa rápida + filtros avançados ── */}
      <div className="relative flex flex-wrap items-end gap-2 border-t border-white/20 px-3 py-2 pl-4 dark:border-white/10">
        <div className="min-w-[180px] flex-1">
          <label className={LABEL_CLS}>Pesquisa livre</label>
          <div className="relative">
            <Search size={11} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--gray-400)]" />
            <input type="search" value={filters.search} onChange={(e) => set("search", e.target.value)} onKeyDown={handleKey} placeholder="Código, paciente, documento…" className={`${INPUT_CLS} pl-6`} />
          </div>
        </div>
        <div className="w-32 sm:w-40">
          <label className={LABEL_CLS}>Nº requisição</label>
          <input value={filters.reqNumber} onChange={(e) => set("reqNumber", e.target.value)} onKeyDown={handleKey} placeholder="REQ-…" className={INPUT_CLS} />
        </div>
        <div className="w-36 sm:w-48">
          <label className={LABEL_CLS}>Nome do paciente</label>
          <input value={filters.patientName} onChange={(e) => set("patientName", e.target.value)} onKeyDown={handleKey} placeholder="ex: João…" className={INPUT_CLS} />
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-white/30 bg-white/25 px-2.5 text-[11px] font-medium text-[var(--gray-700)] backdrop-blur-sm hover:bg-white/40 dark:border-white/10 dark:bg-white/5 dark:text-[#ffffff]"
        >
          <SlidersHorizontal size={11} />
          Filtros avançados
          {advancedCount > 0 && (
            <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[9px] font-semibold text-white">
              {advancedCount}
            </span>
          )}
          <ChevronDown size={11} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        {anyActive && (
          <button type="button" onClick={onClear}
            className="h-7 rounded-lg border border-white/30 bg-white/25 px-2.5 text-[11px] font-medium text-[var(--gray-700)] backdrop-blur-sm hover:bg-white/40 dark:border-white/10 dark:bg-white/5 dark:text-[var(--gray-300)]">
            Limpar
          </button>
        )}

        <span className="ml-auto self-center whitespace-nowrap text-[11px] text-[var(--gray-500)]">
          {loading ? <><Loader2 size={10} className="inline animate-spin mr-1" />A procurar…</> : formatCount(total, { one: "laudo", other: "laudos" })}
        </span>
      </div>

      {expanded && (
        <div className="relative border-t border-white/20 px-3 py-2 pl-4 dark:border-white/10">
          <div className="grid grid-cols-2 gap-x-2 gap-y-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            <div>
              <label className={LABEL_CLS}>Nº documento</label>
              <input value={filters.docNumber} onChange={(e) => set("docNumber", e.target.value)} onKeyDown={handleKey} placeholder="BI / passaporte" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Data de nascimento</label>
              <input type="date" value={filters.birthDate} onChange={(e) => set("birthDate", e.target.value)} className={INPUT_CLS} />
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
                {PRIORITY_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
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
              <input type="date" value={filters.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Validado — até</label>
              <input type="date" value={filters.dateTo} onChange={(e) => set("dateTo", e.target.value)} className={INPUT_CLS} />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ─── Report Card ─────────────────────────────────────────────────────────────

const NAME_PARTICLES = new Set(["de", "da", "do", "das", "dos", "e"])

/** Mais de 3 nomes: mantém primeiro e último, abrevia os do meio (partículas omitidas). */
function shortPatientName(name?: string): string {
  if (!name) return "—"
  const parts = name.trim().split(/\s+/)
  if (parts.length <= 3) return name.trim()
  const middle = parts
    .slice(1, -1)
    .filter((p) => !NAME_PARTICLES.has(p.toLowerCase()))
    .map((p) => `${p[0]}.`)
  return [parts[0], ...middle, parts[parts.length - 1]].join(" ")
}

function ReportCard({
  row, onNotify, busy, notified,
}: {
  row: LabRequest
  onNotify: (row: LabRequest) => void
  busy: boolean
  notified: boolean
}) {
  const router = useRouter()
  const priority = getClinicalStatusLabel(row.clinical_status, row.clinical_status_display)
  const meta = [row.patient_age, genderLabel(row.patient_gender)].filter(Boolean).join(" · ")

  function openPdf(e: React.MouseEvent) {
    e.stopPropagation()
    window.open(`/api/v1/clinical/labrequest/${row.id}/results-pdf/`, "_blank")
  }
  function handleNotify(e: React.MouseEvent) {
    e.stopPropagation()
    onNotify(row)
  }

  return (
    <div
      onClick={() => router.push(`/clinical-laboratory/reports/request/${row.id}`)}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/50 bg-white/30 px-2 py-1.5 pl-3 shadow-sm backdrop-blur-sm transition hover:border-white/70 hover:bg-white/50 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.08]">
      <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />

      <div className="flex items-center justify-between gap-1.5">
        <Link href={`/clinical-laboratory/reports/request/${row.id}`} onClick={(e) => e.stopPropagation()}
          className="font-mono text-[10px] font-bold text-sky-700 hover:underline dark:text-sky-300 truncate">
          {row.custom_id ?? `#${row.id}`}
        </Link>
        {priority && (
          <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {priority}
          </span>
        )}
      </div>

      <p className="mt-0.5 truncate text-[12px] font-semibold text-foreground leading-snug" title={row.patient_name || undefined}>
        {shortPatientName(row.patient_name)}
        {meta && <span className="ml-1.5 text-[10px] font-normal text-[var(--gray-500)]">{meta}</span>}
      </p>

      <div className="mt-1 flex items-center gap-1.5">
        <button type="button" onClick={openPdf}
          className="inline-flex h-6 items-center gap-1 rounded-lg bg-sky-600 px-2 text-[9px] font-semibold text-white shadow-sm transition hover:bg-sky-700">
          Imprimir PDF
        </button>
        <button type="button" onClick={handleNotify} disabled={busy}
          className={`inline-flex h-6 items-center gap-1 rounded-lg border px-2 text-[9px] font-medium shadow-sm transition disabled:opacity-60 ${
            notified
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300"
              : "border-white/40 bg-white/30 text-[var(--gray-700)] hover:bg-white/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#ffffff]"
          }`}>
          {busy ? <><Loader2 size={9} className="animate-spin" /> A notificar…</> : notified ? "✓ Notificado" : "Notificar"}
        </button>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

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

  useEffect(() => { load(debouncedFilters) }, [load, debouncedFilters, safeRefreshToken])

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

  const total = rows.length

  return (
    <AppLayout fullWidth>
      <div className="w-full min-w-0 max-w-none space-y-2 px-1 py-1">

        {/* ── Cabeçalho fundido: banner + pesquisa + filtros ── */}
        <ReportsHeader
          filters={filters}
          onChange={setFilters}
          onSearch={() => load(filters)}
          onClear={handleClear}
          total={total}
          loading={loading}
        />

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2.5 text-[12px] text-rose-800 dark:border-rose-800/40 dark:bg-rose-900/15 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* ── Cartões de laudos ── */}
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[12px] text-[var(--gray-400)]">
            <Loader2 size={16} className="animate-spin" /> A carregar laudos...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/60 px-3 py-10 text-center text-[11px] text-[var(--gray-400)] dark:border-white/10">
            Sem laudos.
          </div>
        ) : (
          <div className={`grid w-full min-w-0 gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))] transition-opacity ${loading ? "opacity-60" : ""}`}>
            {rows.map((row) => (
              <ReportCard
                key={row.id}
                row={row}
                onNotify={handleNotify}
                busy={busyId === row.id}
                notified={notifiedId === row.id}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
