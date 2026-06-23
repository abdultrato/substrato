"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  FileText, RotateCcw, Search, Receipt,
  TrendingUp, Calendar, Loader2, Clock, Archive,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import MoneyValue from "@/components/ui/MoneyValue"
import PdfActionLabel from "@/components/ui/PdfActionLabel"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import styles from "@/components/requests/RequestsBoardPage.module.css"

type ReciboRow = Record<string, any>

async function abrirPdfRecibo(reciboId: number) {
  const blob = await apiFetch<Blob>(`/payments/receipt/${reciboId}/pdf/`, {
    responseType: "blob",
  })
  const url = window.URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener,noreferrer")
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
}

function fmtDate(value: any): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })
}

function getCode(r: ReciboRow): string {
  return r.numero || r.id_custom || r.custom_id || (r.id ? `#${r.id}` : "—")
}
function getPatient(r: ReciboRow): string {
  return r.paciente_nome || r.patient_name || "—"
}
function getInvoice(r: ReciboRow): string {
  return r.fatura_codigo || r.invoice_code || r.fatura || ""
}
function getAmount(r: ReciboRow): string | number | undefined {
  return r.valor ?? r.amount ?? r.total
}
function getDate(r: ReciboRow): string {
  return r.criado_em || r.created_at || ""
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

type Bucket = "hoje" | "ontem" | "mes" | "antigas"

function getBucket(value: any): Bucket {
  if (!value) return "antigas"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "antigas"
  const now = new Date()
  const todayStart   = startOfDay(now)
  const yesterStart  = new Date(todayStart.getTime() - 86_400_000)
  const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1)

  if (d >= todayStart)  return "hoje"
  if (d >= yesterStart) return "ontem"
  if (d >= monthStart)  return "mes"
  return "antigas"
}

function sumAmount(rows: ReciboRow[]): number {
  return rows.reduce((acc, r) => {
    const v = parseFloat(String(getAmount(r) ?? "0"))
    return acc + (Number.isNaN(v) ? 0 : v)
  }, 0)
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, accent, iconBg, iconColor,
}: {
  label: string; value: React.ReactNode
  icon: typeof Receipt; accent: string; iconBg: string; iconColor: string
}) {
  return (
    <div className={`relative flex items-center gap-3 overflow-hidden rounded-lg border border-l-4 border-white/20 bg-white/30 px-3 py-2 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10 ${accent}`}>
      <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${iconBg}`}>
        <Icon size={13} className={iconColor} />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground leading-none">{label}</div>
        <div className="mt-0.5 text-lg font-bold text-foreground leading-none">{value}</div>
      </div>
    </div>
  )
}

// ── Receipt card ─────────────────────────────────────────────────────────────

function ReceiptCard({ row, busy, onPdf }: {
  row: ReciboRow; busy: boolean; onPdf: (id: number) => void
}) {
  const code    = getCode(row)
  const patient = getPatient(row)
  const invoice = getInvoice(row)
  const amount  = getAmount(row)
  const date    = getDate(row)

  return (
    <div className="group flex flex-col gap-1 rounded-md border border-white/25 bg-white/30 px-2 py-1.5 shadow-sm backdrop-blur-sm transition-all duration-150 hover:border-[var(--primary-300)]/60 hover:bg-white/45 dark:bg-white/5 dark:border-white/10 dark:hover:border-[var(--primary-500)]/40">

      {/* Top row: code + amount */}
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[10px] font-bold text-[var(--primary-700)] dark:text-white truncate">
          {code}
        </span>
        <div className="shrink-0 rounded border border-[var(--primary-300)] bg-[var(--primary-50)] px-1.5 py-px dark:border-[var(--primary-400)] dark:bg-[var(--primary-800)]/60">
          <span className="text-[10px] font-bold text-[var(--primary-700)] dark:text-white">
            <MoneyValue value={amount} />
          </span>
        </div>
      </div>

      {/* Patient + meta in one compact row */}
      <div className="flex items-center gap-1 min-w-0">
        <p className="truncate text-[10px] font-semibold text-foreground flex-1">{patient}</p>
        <span className="shrink-0 text-[9px] text-muted-foreground">{fmtDate(date)}</span>
      </div>

      {/* Invoice chip + PDF inline */}
      <div className="flex items-center gap-1">
        {invoice && (
          <span className="inline-flex items-center gap-0.5 rounded border border-border bg-muted/40 px-1 py-px text-[9px] font-medium text-foreground-2 truncate max-w-[60%]">
            <FileText size={7} />
            {invoice}
          </span>
        )}
        <button
          type="button"
          onClick={() => onPdf(Number(row.id))}
          disabled={busy}
          className="ml-auto inline-flex h-5 items-center gap-1 rounded-full border border-[var(--primary-300)] bg-[var(--primary-50)] px-2 text-[9px] font-semibold text-[var(--primary-700)] transition hover:bg-[var(--primary-100)] disabled:cursor-wait disabled:opacity-60 dark:border-[var(--primary-400)] dark:bg-[var(--primary-700)]/50 dark:text-white dark:hover:bg-[var(--primary-600)]/60"
        >
          {busy ? <Loader2 size={8} className="animate-spin" /> : <FileText size={8} />}
          <PdfActionLabel loading={busy} loadingLabel="…">PDF</PdfActionLabel>
        </button>
      </div>
    </div>
  )
}

// ── Board column ─────────────────────────────────────────────────────────────

type ColTokens = {
  headerBgHex: string; border: string
  bg: string; text: string; countBg: string; countText: string
}

function BoardColumn({
  title, icon, rows, tokens, emptyText, acaoId, onPdf,
}: {
  title: string; icon: React.ReactNode
  rows: ReciboRow[]; tokens: ColTokens
  emptyText: string; acaoId: number | null
  onPdf: (id: number) => void
}) {
  const cssVars = {
    "--col-border": tokens.border,
    "--col-header": tokens.headerBgHex,
  } as React.CSSProperties

  const total = sumAmount(rows)

  // eslint-disable-next-line react/forbid-dom-props
  return (
    <div className="flex flex-col" style={cssVars}>
      <div className={`${styles.columnHeader} flex items-center gap-2 px-3 py-2 ${tokens.bg} ${tokens.text}`}>
        {icon}
        <span className="text-sm font-semibold tracking-wide">{title}</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${tokens.countBg} ${tokens.countText}`}>
          {rows.length}
        </span>
      </div>

      <div className={styles.columnBody}>
        {rows.length > 0 && (
          <div className="mb-2 rounded-md border border-white/20 bg-white/20 px-2 py-1 text-center text-[10px] font-semibold text-muted-foreground backdrop-blur-sm dark:bg-white/5">
            Total: <MoneyValue value={total.toFixed(2)} />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          {rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-8 text-center text-xs text-[var(--gray-400)]">
              {emptyText}
            </p>
          ) : (
            rows.map((row) => (
              <ReceiptCard
                key={row.id}
                row={row}
                busy={acaoId === row.id}
                onPdf={onPdf}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RecibosPage() {
  const { loading } = useAuthGuard()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [recibos, setRecibos]       = useState<ReciboRow[]>([])
  const [erro, setErro]             = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [acaoId, setAcaoId]         = useState<number | null>(null)
  const [search, setSearch]         = useState("")

  const onPdf = useCallback(async (id: number) => {
    try {
      setAcaoId(id)
      await abrirPdfRecibo(id)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar PDF do recibo."))
    } finally {
      setAcaoId(null)
    }
  }, [])

  const carregar = useCallback(async () => {
    try {
      setCarregando(true)
      setErro(null)
      const res = await apiFetch<any>("/payments/receipt/", { clientCache: safeRefreshToken === 0 })
      const items = res?.results ?? res
      setRecibos(Array.isArray(items) ? items : [])
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar recibos."))
    } finally {
      setCarregando(false)
    }
  }, [safeRefreshToken])

  useEffect(() => { carregar() }, [carregar])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return recibos
    return recibos.filter((r) =>
      getCode(r).toLowerCase().includes(q) ||
      getPatient(r).toLowerCase().includes(q) ||
      getInvoice(r).toLowerCase().includes(q)
    )
  }, [recibos, search])

  const hoje    = useMemo(() => filtered.filter((r) => getBucket(getDate(r)) === "hoje"),    [filtered])
  const ontem   = useMemo(() => filtered.filter((r) => getBucket(getDate(r)) === "ontem"),   [filtered])
  const mes     = useMemo(() => filtered.filter((r) => getBucket(getDate(r)) === "mes"),     [filtered])
  const antigas = useMemo(() => filtered.filter((r) => getBucket(getDate(r)) === "antigas"), [filtered])

  const totalValue = useMemo(() => sumAmount(recibos).toFixed(2), [recibos])

  if (loading) return null

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE]}>
      <div className="space-y-4">
        <PageHeader
          title="Recibos"
          actions={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--gray-400)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar…"
                  className="h-8 w-52 rounded-md border border-[var(--border)] bg-transparent py-1.5 pl-7 pr-3 text-xs text-[var(--text)] transition-colors placeholder:text-[var(--gray-400)] hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
                />
              </div>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--border)] bg-transparent px-2 text-xs font-semibold text-[var(--gray-700)] transition hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)]"
                >
                  <RotateCcw size={11} />
                </button>
              )}
              <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} / {recibos.length}</span>
            </div>
          }
        />

        {erro && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            {erro}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Total de recibos"
            value={recibos.length}
            icon={Receipt}
            accent="border-l-[var(--primary-500)]"
            iconBg="bg-[var(--primary-100)] dark:bg-[var(--primary-900)]/40"
            iconColor="text-[var(--primary-600)] dark:text-[var(--primary-400)]"
          />
          <StatCard
            label="Gerados hoje"
            value={hoje.length}
            icon={Calendar}
            accent="border-l-emerald-500"
            iconBg="bg-emerald-100 dark:bg-emerald-900/40"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="Valor total"
            value={<MoneyValue value={totalValue} />}
            icon={TrendingUp}
            accent="border-l-violet-500"
            iconBg="bg-violet-100 dark:bg-violet-900/40"
            iconColor="text-violet-600 dark:text-violet-400"
          />
        </div>

        {/* Board */}
        {carregando ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            Carregando recibos…
          </div>
        ) : (
          // eslint-disable-next-line react/forbid-dom-props
          <div className="grid grid-cols-4 gap-3" style={{ "--col-max-height": "calc(100vh - 145px)" } as React.CSSProperties}>
            <BoardColumn
              title="Hoje"
              icon={<Receipt size={13} className="text-white/90" />}
              rows={hoje}
              tokens={{
                headerBgHex: "#059669", border: "#6ee7b7",
                bg: "bg-emerald-600", text: "text-white",
                countBg: "bg-emerald-500", countText: "text-white",
              }}
              emptyText="Nenhum recibo hoje"
              acaoId={acaoId}
              onPdf={onPdf}
            />
            <BoardColumn
              title="Ontem"
              icon={<Clock size={13} className="text-white/90" />}
              rows={ontem}
              tokens={{
                headerBgHex: "#0284c7", border: "#7dd3fc",
                bg: "bg-sky-600", text: "text-white",
                countBg: "bg-sky-500", countText: "text-white",
              }}
              emptyText="Nenhum recibo de ontem"
              acaoId={acaoId}
              onPdf={onPdf}
            />
            <BoardColumn
              title="Este mês"
              icon={<Calendar size={13} className="text-white/90" />}
              rows={mes}
              tokens={{
                headerBgHex: "#7c3aed", border: "#c4b5fd",
                bg: "bg-violet-600", text: "text-white",
                countBg: "bg-violet-500", countText: "text-white",
              }}
              emptyText="Nenhum recibo este mês"
              acaoId={acaoId}
              onPdf={onPdf}
            />
            <BoardColumn
              title="Antigas"
              icon={<Archive size={13} className="text-white/90" />}
              rows={antigas}
              tokens={{
                headerBgHex: "#475569", border: "#94a3b8",
                bg: "bg-slate-500", text: "text-white",
                countBg: "bg-slate-400", countText: "text-white",
              }}
              emptyText="Nenhum recibo mais antigo"
              acaoId={acaoId}
              onPdf={onPdf}
            />
          </div>
        )}
      </div>
    </AppLayout>
  )
}
