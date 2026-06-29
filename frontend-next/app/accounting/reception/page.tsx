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
import { GROUPS } from "@/lib/rbac"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

type Row = Record<string, any>

const CHECKIN_STATUS: Record<string, { label: string; dot: string; badge: string }> = {
  AGUARD: { label: "Aguardando", dot: "bg-amber-400", badge: "border-amber-200 bg-amber-50 text-amber-700" },
  ATEND: { label: "Em atendimento", dot: "bg-blue-400", badge: "border-blue-200 bg-blue-50 text-blue-700" },
  REQ: { label: "Requisição criada", dot: "bg-violet-400", badge: "border-violet-200 bg-violet-50 text-violet-700" },
  FAT: { label: "Fatura vinculada", dot: "bg-sky-400", badge: "border-sky-200 bg-sky-50 text-sky-700" },
  CONC: { label: "Concluído", dot: "bg-emerald-400", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  CANC: { label: "Cancelado", dot: "bg-rose-400", badge: "border-rose-200 bg-rose-50 text-rose-700" },
}

const INVOICE_STATUS: Record<string, string> = {
  RASC: "border-slate-200 bg-slate-50 text-slate-600",
  EMIT: "border-sky-200 bg-sky-50 text-sky-700",
  PAGA: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANC: "border-rose-200 bg-rose-50 text-rose-700",
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
}: {
  label: string
  value: React.ReactNode
  hint?: string
  accent: string
  icon: React.ElementType
}) {
  return (
    <section className={`relative overflow-hidden ${GLASS}`}>
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
    </section>
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
                {r.invoice_status_display || r.invoice_status}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <FileText size={11} className="shrink-0" />
              {unbilled ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
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
      const params = new URLSearchParams({ ordering: "-arrived_at", page_size: String(pageSize) })
      if (statusFilter) params.set("status", statusFilter)
      if (search) params.set("search", search)
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
  }, [safeRefreshToken, pageSize, statusFilter, search])

  useEffect(() => {
    load().catch(() => {})
  }, [load])

  const visible = useMemo(() => {
    if (billingFilter === "unbilled") return checkins.filter(isUnbilled)
    if (billingFilter === "billed") return checkins.filter((r) => !!r.invoice)
    if (billingFilter === "paid") return checkins.filter((r) => r.invoice_status === "PAGA")
    return checkins
  }, [checkins, billingFilter])

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
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
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
          </div>
        </section>

        {erro ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{erro}</div>
        ) : null}

        {/* ── Métricas ── */}
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          <Metric label="Check-ins" value={loading ? "…" : metrics.total} accent="bg-slate-500" icon={ClipboardList} />
          <Metric label="Com fatura" value={loading ? "…" : metrics.comFatura} accent="bg-sky-500" icon={FileText} />
          <Metric
            label="Sem fatura"
            value={loading ? "…" : metrics.semFatura}
            hint="Atendimentos ativos sem cobrança"
            accent="bg-amber-500"
            icon={AlertTriangle}
          />
          <Metric label="Faturas pagas" value={loading ? "…" : metrics.pagas} accent="bg-emerald-500" icon={Receipt} />
        </div>

        {/* ── Filtros ── */}
        <section className={`relative ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-slate-400" />
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 pl-5">
            <div className="relative min-w-[200px] flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar por código, paciente…"
                className="h-9 w-full rounded-lg border border-border bg-background/60 py-2 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/40 transition"
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
            {visible.map((r) => (
              <CheckinCard key={r.id} r={r} />
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  )
}
