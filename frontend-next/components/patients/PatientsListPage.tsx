"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  HeartHandshake,
  Phone,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { PatientIntakeWizard } from "@/components/reception/PatientIntakeWizard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"

type PatientRow = {
  id: number
  custom_id?: string | null
  name: string
  gender?: string | null
  birth_date?: string | null
  age_display?: string | null
  age_years?: number | null
  document_type?: string | null
  document_number?: string | null
  contact?: string | null
  email?: string | null
  provenance?: string | null
  origin_company_name?: string | null
  pregnant?: boolean
  is_blood_donor?: boolean
  created_at?: string | null
}

type Summary = {
  total: number
  female: number
  male: number
  pregnant: number
  occupational: number
  blood_donors: number
  new_last_30_days: number
}

const DEFAULT_PAGE_SIZE = 20
const MIN_PAGE_SIZE = 1
const MAX_PAGE_SIZE = 999

const PROVENANCE_OPTIONS = [
  "Ambulatório",
  "Clínica Externa",
  "Medicina Ocupacional",
  "Maternidade",
  "Ginecologia",
  "Pediatria",
  "Banco de Socorros",
  "Consulta Externa",
  "Urologia",
  "Cirurgia",
  "Dentária",
  "Oftalmologia",
  "Outro",
]

function fmtDate(value?: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString("pt-PT", { dateStyle: "short" })
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function genderTone(gender?: string | null): string {
  switch ((gender || "").trim().toLowerCase()) {
    case "masculino":
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
    case "femenino":
    case "feminino":
      return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300"
    default:
      return "bg-[var(--gray-100)] text-[var(--gray-700)] dark:bg-[var(--gray-800)] dark:text-[var(--gray-200)]"
  }
}

function genderLabel(gender?: string | null): string {
  const value = (gender || "").trim().toLowerCase()
  if (value === "masculino") return "Masculino"
  if (value === "femenino" || value === "feminino") return "Feminino"
  return gender || "-"
}

function KpiCard({
  title,
  value,
  icon: Icon,
  accentClass,
  iconBg,
  iconColor,
}: {
  title: string
  value: number | string
  icon: typeof Users
  accentClass: string
  iconBg: string
  iconColor: string
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-l-4 border-white/20 bg-white/30 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10 ${accentClass}`}
    >
      <span className={`absolute right-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon size={13} className={iconColor} />
      </span>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-0.5 text-xl font-bold text-foreground">{value}</div>
    </div>
  )
}

export default function PatientsListPage() {
  const router = useRouter()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [rows, setRows] = useState<PatientRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [pageSizeDraft, setPageSizeDraft] = useState(String(DEFAULT_PAGE_SIZE))

  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [gender, setGender] = useState("")
  const [provenance, setProvenance] = useState("")
  const [donorsOnly, setDonorsOnly] = useState(false)
  const [showWizard, setShowWizard] = useState(false)

  // Debounce da pesquisa.
  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(handle)
  }, [searchInput])

  // Volta à primeira página sempre que um filtro ou o tamanho da página muda.
  useEffect(() => {
    setPage(1)
  }, [search, gender, provenance, donorsOnly, pageSize])

  const loadSummary = useCallback(async () => {
    try {
      const raw = await apiFetch<any>("/clinical/patient/summary/", { clientCache: false })
      setSummary((raw?.data ?? raw) as Summary)
    } catch {
      // O resumo é acessório: silenciar para não bloquear a listagem.
    }
  }, [])

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query: Record<string, string | number | boolean | undefined> = { ordering: "name" }
      if (search) query.search = search
      if (gender) query.gender = gender
      if (provenance) query.provenance = provenance
      if (donorsOnly) query.is_blood_donor = true

      const { items, meta } = await apiFetchList<PatientRow>("/clinical/patient/", {
        page,
        pageSize,
        query,
        clientCache: false,
        clientPaginate: true,
      })
      setRows(items)
      setTotal(typeof meta.total === "number" ? meta.total : items.length)
      setTotalPages(typeof meta.totalPages === "number" && meta.totalPages > 0 ? meta.totalPages : 1)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar pacientes.")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, gender, provenance, donorsOnly])

  useEffect(() => {
    loadList()
  }, [loadList, safeRefreshToken])

  useEffect(() => {
    loadSummary()
  }, [loadSummary, safeRefreshToken])

  const hasFilters = Boolean(search || gender || provenance || donorsOnly)
  const clearFilters = () => {
    setSearchInput("")
    setSearch("")
    setGender("")
    setProvenance("")
    setDonorsOnly(false)
  }

  // Aceita um inteiro entre 1 e 999; valores fora do intervalo são fixados nos limites.
  const commitPageSize = () => {
    const parsed = Math.round(Number(pageSizeDraft))
    const next = Number.isFinite(parsed)
      ? Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, parsed))
      : DEFAULT_PAGE_SIZE
    setPageSizeDraft(String(next))
    setPageSize(next)
  }

  const kpis = useMemo(
    () => [
      { title: "Total", value: summary?.total ?? "—", icon: Users, accentClass: "border-l-blue-500", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400" },
      { title: "Novos (30 dias)", value: summary?.new_last_30_days ?? "—", icon: UserPlus, accentClass: "border-l-emerald-500", iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconColor: "text-emerald-600 dark:text-emerald-400" },
      { title: "Gestantes", value: summary?.pregnant ?? "—", icon: HeartHandshake, accentClass: "border-l-pink-500", iconBg: "bg-pink-100 dark:bg-pink-900/40", iconColor: "text-pink-600 dark:text-pink-400" },
      { title: "Med. Ocupacional", value: summary?.occupational ?? "—", icon: Building2, accentClass: "border-l-violet-500", iconBg: "bg-violet-100 dark:bg-violet-900/40", iconColor: "text-violet-600 dark:text-violet-400" },
      { title: "Doadores", value: summary?.blood_donors ?? "—", icon: Droplets, accentClass: "border-l-rose-500", iconBg: "bg-rose-100 dark:bg-rose-900/40", iconColor: "text-rose-600 dark:text-rose-400" },
    ],
    [summary],
  )

  return (
    <>
      <AppLayout>
        <div className="space-y-3">
          <PageHeader
            title="Pacientes"
            actions={
              <button
                type="button"
                onClick={() => setShowWizard(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
              >
                <UserPlus size={14} />
                Registar paciente
              </button>
            }
          />

          {/* KPIs */}
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.title} {...kpi} />
            ))}
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/20 bg-white/25 px-3 py-2 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
            <div className="relative min-w-[180px] flex-1">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Pesquisar nome, documento, contacto..."
                className="h-8 w-full rounded-lg border border-border bg-background pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="">Todos os géneros</option>
              <option value="Femenino">Feminino</option>
              <option value="Masculino">Masculino</option>
            </select>

            <select
              value={provenance}
              onChange={(e) => setProvenance(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="">Todas as proveniências</option>
              {PROVENANCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setDonorsOnly((value) => !value)}
              aria-pressed={donorsOnly}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition ${
                donorsOnly
                  ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300"
                  : "border-border bg-card text-foreground-2 hover:bg-muted"
              }`}
            >
              <Droplets size={13} />
              Doadores
            </button>

            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground-2 transition hover:bg-muted"
              >
                <X size={13} />
                Limpar
              </button>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {/* Cards */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <span className="animate-spin">⟳</span> Carregando pacientes...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-white/20 bg-white/25 py-14 text-center shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
              <Users size={26} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {hasFilters ? "Nenhum paciente para os filtros aplicados." : "Sem pacientes registados."}
              </p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => (
                <Link key={row.id} href={`/patients/${row.id}`}
                  className="group flex items-center gap-3 rounded-xl border border-white/20 bg-white/25 px-3 py-2.5 shadow-sm backdrop-blur-sm transition hover:bg-white/40 hover:shadow-md dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/8">

                  {/* Avatar */}
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${genderTone(row.gender)}`}>
                    {initials(row.name)}
                  </span>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-sm font-semibold text-foreground">{row.name}</span>
                      {row.pregnant && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-pink-100 px-1 py-0.5 text-[9px] font-semibold text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                          <HeartHandshake size={8} /> Gestante
                        </span>
                      )}
                      {row.is_blood_donor && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1 py-0.5 text-[9px] font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                          <Droplets size={8} /> Doador
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span>{row.custom_id || `ID ${row.id}`}</span>
                      {row.age_display && <span>· {row.age_display}</span>}
                      {row.gender && <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${genderTone(row.gender)}`}>{genderLabel(row.gender)}</span>}
                      {row.contact && <span className="flex items-center gap-0.5"><Phone size={8} />{row.contact}</span>}
                      {row.document_number && <span>{row.document_type} {row.document_number}</span>}
                      {row.provenance && <span>· {row.provenance}</span>}
                    </div>
                  </div>

                  <ChevronRight size={13} className="shrink-0 text-muted-foreground/30 group-hover:text-[var(--primary-600)] transition" />
                </Link>
              ))}
            </div>
          )}

          {/* Paginação */}
          {(total > 0 || totalPages > 1) && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/20 bg-white/25 px-3 py-2 shadow-sm backdrop-blur-sm text-[11px] text-muted-foreground dark:bg-white/5 dark:border-white/10">
              <span>
                {total > 0 ? `Página ${page} de ${totalPages} · ${total} paciente${total > 1 ? "s" : ""}` : "—"}
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label htmlFor="patients-page-size">Por página</label>
                  <input
                    id="patients-page-size"
                    type="number"
                    min={MIN_PAGE_SIZE}
                    max={MAX_PAGE_SIZE}
                    value={pageSizeDraft}
                    onChange={(e) => setPageSizeDraft(e.target.value)}
                    onBlur={commitPageSize}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        commitPageSize()
                      }
                    }}
                    className="h-7 w-16 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={loading || page <= 1}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2 font-medium text-foreground-2 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft size={13} />
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    disabled={loading || page >= totalPages}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2 font-medium text-foreground-2 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Próximo
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppLayout>

      {showWizard ? (
        <PatientIntakeWizard
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            setShowWizard(false)
            loadList()
            loadSummary()
          }}
        />
      ) : null}
    </>
  )
}
