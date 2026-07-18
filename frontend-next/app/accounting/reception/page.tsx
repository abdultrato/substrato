"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  FileText,
  Loader2,
  Receipt,
  Search,
  User,
  UserCog,
  X,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageSizeInput from "@/components/ui/PageSizeInput"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { formatInvoiceStatus } from "@/lib/billingStatus"
import { GROUPS } from "@/lib/rbac"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const FETCH_PAGE_SIZE = 200

type Row = Record<string, any>

const CHECKIN_STATUS: Record<string, { label: string; dot: string; badge: string }> = {
  AGUARD: { label: "Aguardando", dot: "bg-amber-400", badge: "border-amber-300/50 bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  ATEND: { label: "Em atendimento", dot: "bg-blue-400", badge: "border-blue-300/50 bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  REQ: { label: "Requisição criada", dot: "bg-violet-400", badge: "border-violet-300/50 bg-violet-500/15 text-violet-700 dark:text-violet-400" },
  FAT: { label: "Fatura vinculada", dot: "bg-sky-400", badge: "border-sky-300/50 bg-sky-500/15 text-sky-700 dark:text-sky-400" },
  CONC: { label: "Concluído", dot: "bg-emerald-400", badge: "border-emerald-300/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  CANC: { label: "Cancelado", dot: "bg-rose-400", badge: "border-rose-300/50 bg-rose-500/15 text-rose-600 dark:text-rose-400" },
}

const INVOICE_STATUS: Record<string, string> = {
  RASC: "border-slate-300/50 bg-slate-500/15 text-slate-600 dark:text-slate-300",
  EMIT: "border-sky-300/50 bg-sky-500/15 text-sky-700 dark:text-sky-400",
  PAGA: "border-emerald-300/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  CANC: "border-rose-300/50 bg-rose-500/15 text-rose-600 dark:text-rose-400",
}

function fmtDate(value: any): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

function fmtMoney(value: any): string {
  if (value === null || value === undefined || value === "") return "—"
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  return n.toLocaleString("pt-PT", { style: "currency", currency: "MZN" })
}

/** Atendimento ativo (não cancelado) sem fatura vinculada = risco de receita não faturada. */
function isUnbilled(r: Row): boolean {
  return !r.invoice && r.status !== "CANC"
}

function Metric({
  label,
  value,
  hint,
  accent,
  icon: Icon,
  active = false,
  onClick,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  accent: string
  icon: React.ElementType
  active?: boolean
  onClick?: () => void
}) {
  const Component = onClick ? "button" : "section"
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`relative overflow-hidden text-left transition ${GLASS} ${onClick ? "hover:bg-white/40 dark:hover:bg-white/[0.08]" : ""} ${active ? "ring-2 ring-rose-500/40" : ""}`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="flex items-center gap-3 px-4 py-3 pl-5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent} text-white shadow-sm`}>
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="font-display text-xl font-bold leading-tight text-foreground tabular-nums">{value}</p>
          {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
    </Component>
  )
}

function CheckinCard({ r }: { r: Row }) {
  const st = CHECKIN_STATUS[r.status] ?? CHECKIN_STATUS.AGUARD
  const unbilled = isUnbilled(r)
  const invBadge = INVOICE_STATUS[r.invoice_status] ?? INVOICE_STATUS.RASC
  return (
    <Link
      href={`/reception/reception-checkins/${r.id}`}
      className={`group relative block overflow-hidden ${GLASS} transition hover:border-pink-500/30 hover:shadow-md`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${st.dot}`} />
      <div className="px-4 py-3 pl-5">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500">
              <User size={13} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground">{r.patient_name || "—"}</p>
              <p className="text-[10px] text-muted-foreground">{r.patient_code || r.id_custom || `#${r.id}`}</p>
            </div>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${st.badge}`}>{st.label}</span>
        </div>

        <div className="space-y-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ClipboardList size={11} className="shrink-0" />
            <span className="truncate">Requisição: {r.request_code || "—"}</span>
          </div>

          {r.invoice ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <FileText size={11} className="shrink-0" />
              <span className="font-medium text-foreground">{r.invoice_code || `#${r.invoice}`}</span>
              <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${invBadge}`}>
                {r.invoice_status_display || formatInvoiceStatus(r.invoice_status)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <FileText size={11} className="shrink-0" />
              {unbilled ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-300/50 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={10} /> Sem fatura
                </span>
              ) : (
                <span>Sem fatura</span>
              )}
            </div>
          )}

          {r.invoice ? (
            <div className="flex items-center gap-1.5">
              <Receipt size={11} className="shrink-0" />
              <span className="text-foreground tabular-nums">{fmtMoney(r.invoice_total)}</span>
              {r.invoice_patient_amount != null ? (
                <span className="text-muted-foreground">· doente {fmtMoney(r.invoice_patient_amount)}</span>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-1.5">
            <UserCog size={11} className="shrink-0" />
            <span className="truncate">{r.attendant_name || "Sem atendente"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarClock size={11} className="shrink-0" />
            <span>{fmtDate(r.arrived_at || r.criado_em)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function ContabilidadeRecepcaoAuditPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [checkins, setCheckins] = useState<Row[]>([])
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [billingFilter, setBillingFilter] = useState("")
  const [pageSize, setPageSize] = useState(10)
  const reqId = useRef(0)
  const loadedOnce = useRef(false)

  // Debounce da pesquisa para não disparar uma chamada por tecla.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    const id = ++reqId.current
    if (loadedOnce.current) setRefreshing(true)
    else setLoading(true)
    setErro(null)
    try {
      const params = new URLSearchParams({ ordering: "-arrived_at", page_size: String(FETCH_PAGE_SIZE) })
      const res = await apiFetch<any>(`/reception/checkin/?${params}`, { clientCache: safeRefreshToken === 0 })
      // Descarta respostas fora de ordem (só aplica a mais recente).
      if (id !== reqId.current) return
      const list = (v: any) => (v && v.results ? v.results : v) || []
      setCheckins(Array.isArray(list(res)) ? list(res) : [])
    } catch (e: any) {
      if (id !== reqId.current) return
      setErro(isNotFoundLikeError(e) ? null : e?.message || "Falha ao carregar dados da recepção.")
    } finally {
      if (id === reqId.current) {
        loadedOnce.current = true
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [safeRefreshToken])

  useEffect(() => {
    load().catch(() => {})
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => {
      load().catch(() => {})
    }, 15000)
    return () => window.clearInterval(timer)
  }, [load])

  const visible = useMemo(() => {
    let rows = [...checkins]
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter)
    if (billingFilter === "unbilled") rows = rows.filter(isUnbilled)
    if (billingFilter === "billed") rows = rows.filter((r) => !!r.invoice)
    if (billingFilter === "paid") rows = rows.filter((r) => r.invoice_status === "PAGA")
    const q = search.toLowerCase()
    if (q) {
      rows = rows.filter((r) => {
        const haystack = [
          r.patient_name,
          r.patient_code,
          r.id_custom,
          r.attendant_name,
          r.request_code,
          r.invoice_code,
          r.invoice_status,
          r.invoice_status_display,
          r.status,
          CHECKIN_STATUS[r.status]?.label,
          r.invoice_total,
          r.invoice_patient_amount,
        ]
          .map((value) => String(value ?? "").toLowerCase())
          .join(" ")
        return haystack.includes(q)
      })
    }
    return rows
  }, [billingFilter, checkins, search, statusFilter])

  const paginatedVisible = useMemo(() => visible.slice(0, pageSize), [pageSize, visible])

  const metrics = useMemo(() => {
    const total = checkins.length
    const comFatura = checkins.filter((r) => !!r.invoice).length
    const semFatura = checkins.filter(isUnbilled).length
    const pagas = checkins.filter((r) => r.invoice_status === "PAGA").length
    return { total, comFatura, semFatura, pagas }
  }, [checkins])

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.CONTABILIDADE]}>
      <div className="w-full space-y-3 px-1">

        {/* ── Cabeçalho ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-rose-500" />
          <div className="space-y-3 px-4 py-3 pl-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20">
                  <Receipt size={17} />
                </span>
                <div>
                  <h1 className="text-lg font-bold leading-tight text-foreground">Recepção · auditoria financeira</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar…" : `${metrics.total} check-in${metrics.total !== 1 ? "s" : ""} · ligados a fatura e cobrança`}
                  </p>
                </div>
              </div>

              {refreshing ? (
                <div className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/30 px-2 py-1 text-[11px] text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" />
                  Actualizando
                </div>
              ) : null}
            </div>

            {erro ? (
              <div className="rounded-lg border border-amber-300/50 bg-amber-500/15 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">{erro}</div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
              <Metric
                label="Check-ins"
                value={loading ? "…" : metrics.total}
                accent="bg-slate-500"
                icon={ClipboardList}
                active={!statusFilter && !billingFilter}
                onClick={() => {
                  setStatusFilter("")
                  setBillingFilter("")
                }}
              />
              <Metric
                label="Com fatura"
                value={loading ? "…" : metrics.comFatura}
                accent="bg-sky-500"
                icon={FileText}
                active={billingFilter === "billed"}
                onClick={() => setBillingFilter((current) => (current === "billed" ? "" : "billed"))}
              />
              <Metric
                label="Sem fatura"
                value={loading ? "…" : metrics.semFatura}
                hint="Atendimentos ativos sem cobrança"
                accent="bg-amber-500"
                icon={AlertTriangle}
                active={billingFilter === "unbilled"}
                onClick={() => setBillingFilter((current) => (current === "unbilled" ? "" : "unbilled"))}
              />
              <Metric
                label="Faturas pagas"
                value={loading ? "…" : metrics.pagas}
                accent="bg-emerald-500"
                icon={Receipt}
                active={billingFilter === "paid"}
                onClick={() => setBillingFilter((current) => (current === "paid" ? "" : "paid"))}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px] flex-1">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pesquisar paciente, atendente, requisição ou fatura…"
                  className="w-full rounded-lg border border-border bg-background/60 py-1.5 pl-7 pr-6 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {refreshing ? (
                  <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : searchInput ? (
                  <button
                    type="button"
                    aria-label="Limpar pesquisa"
                    onClick={() => setSearchInput("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={13} />
                  </button>
                ) : null}
              </div>
              <select
                aria-label="Estado do check-in"
                className={`h-9 w-44 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40 transition ${statusFilter ? "text-foreground" : "text-muted-foreground"}`}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Estado: todos</option>
                <option value="AGUARD">Aguardando</option>
                <option value="ATEND">Em atendimento</option>
                <option value="REQ">Requisição criada</option>
                <option value="FAT">Fatura vinculada</option>
                <option value="CONC">Concluído</option>
                <option value="CANC">Cancelado</option>
              </select>
              <select
                aria-label="Cobrança"
                className={`h-9 w-44 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40 transition ${billingFilter ? "text-foreground" : "text-muted-foreground"}`}
                value={billingFilter}
                onChange={(e) => setBillingFilter(e.target.value)}
              >
                <option value="">Cobrança: todas</option>
                <option value="billed">Com fatura</option>
                <option value="unbilled">Sem fatura</option>
                <option value="paid">Pagas</option>
              </select>
              <div className="inline-flex h-9 items-center gap-1.5" title="Registos por página">
                <PageSizeInput value={pageSize} onChange={setPageSize} ariaLabel="Registos por página" />
                <span className="text-xs text-muted-foreground">/pág</span>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {paginatedVisible.length} de {visible.length}
              </span>
            </div>
          </div>
        </section>

        {/* ── Cartões ── */}
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <section className={`relative overflow-hidden ${GLASS}`}>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                <Receipt size={22} />
              </span>
              <p className="text-sm font-medium text-foreground">Nenhum check-in encontrado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {search || statusFilter || billingFilter ? "Tente ajustar os filtros." : "Ainda não há check-ins registados."}
              </p>
            </div>
          </section>
        ) : (
          <div className={`grid grid-cols-1 gap-2 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${refreshing ? "opacity-60" : "opacity-100"}`}>
            {paginatedVisible.map((r) => (
              <CheckinCard key={r.id} r={r} />
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  )
}
