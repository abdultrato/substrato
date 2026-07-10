"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import { BadgeCheck, BarChart3, Building2, FilePlus2, Plus, Receipt, Search, Wallet, X } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageSizeInput from "@/components/ui/PageSizeInput"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import MoneyValue from "@/components/ui/MoneyValue"
import Card from "@/components/ui/Card"
import PdfActionLabel from "@/components/ui/PdfActionLabel"
import ConfirmDialog from "@/components/ui/ConfirmDialog"

type FaturaRow = Record<string, any>

type InvoiceStatusColumn = {
  key: string
  title: string
  subtitle: string
  empty: string
  accentBar: string
  countAccent: string
  statuses: string[]
}

function invoiceOrigin(row?: FaturaRow | null): string {
  return String(row?.origin ?? row?.origem ?? row?.origem_fatura ?? "").trim()
}

function isProformaOrigin(row?: FaturaRow | null): boolean {
  const origin = invoiceOrigin(row)
  return origin.toUpperCase() === "PRO" || origin.toLowerCase().includes("proforma")
}

function invoiceOriginLabel(row?: FaturaRow | null): string {
  const origin = invoiceOrigin(row)
  if (!origin) return "-"
  return isProformaOrigin(row) ? "Proforma" : origin
}

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const INVOICE_STATUS: Record<string, { label: string; badge: string }> = {
  RASC: { label: "Rascunho", badge: "border-slate-200 bg-slate-50 text-slate-600" },
  EMIT: { label: "Emitida", badge: "border-sky-200 bg-sky-50 text-sky-700" },
  PAGA: { label: "Paga", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  CANC: { label: "Cancelada", badge: "border-rose-200 bg-rose-50 text-rose-700" },
}

const STATUS_COLUMNS: InvoiceStatusColumn[] = [
  {
    key: "pending",
    title: "Pendentes",
    subtitle: "Rascunhos, emitidas e demais não pagas.",
    empty: "Nenhuma fatura pendente.",
    accentBar: "bg-amber-500",
    countAccent: "text-amber-700 bg-amber-50 border-amber-200",
    statuses: ["RASC", "EMIT", "CANC"],
  },
  {
    key: "paid",
    title: "Pagas",
    subtitle: "Faturas já liquidadas.",
    empty: "Nenhuma fatura paga.",
    accentBar: "bg-emerald-500",
    countAccent: "text-emerald-700 bg-emerald-50 border-emerald-200",
    statuses: ["PAGA"],
  },
]

function invoiceStatusCode(row?: FaturaRow | null): string {
  return String(row?.estado ?? row?.status ?? "").toUpperCase().trim()
}

function EstadoBadge({ estado }: { estado?: string }) {
  const m = INVOICE_STATUS[String(estado || "").toUpperCase()]
  if (!m) return <span className="text-xs text-muted-foreground">{estado || "-"}</span>
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${m.badge}`}>
      {m.label}
    </span>
  )
}

function InvoiceMetric({
  icon: Icon,
  label,
  value,
  accent,
  active = false,
  onClick,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  accent: string
  active?: boolean
  onClick?: () => void
}) {
  const Component = onClick ? "button" : "section"
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`relative overflow-hidden text-left transition ${GLASS} ${onClick ? "hover:bg-white/40 dark:hover:bg-white/[0.08]" : ""} ${active ? "ring-2 ring-sky-500/40" : ""}`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="flex items-center gap-2.5 px-3 py-2 pl-4">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${accent} text-white shadow-sm`}>
          <Icon size={15} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="font-display text-xl font-bold leading-tight text-foreground tabular-nums">{value}</p>
        </div>
      </div>
    </Component>
  )
}

export default function FaturasPage() {
  const FETCH_PAGE_SIZE = 200
  const { loading } = useAuthGuard()
  const { user } = useAuth()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const podeCriar = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO])
  const [faturas, setFaturas] = useState<FaturaRow[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [acaoId, setAcaoId] = useState<number | null>(null)
  const [notificacaoId, setNotificacaoId] = useState<number | null>(null)
  const [busca, setBusca] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(10)

  const podeAlterar = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO])
  const stats = useMemo(() => ({
    total: faturas.length,
    rascunhos: faturas.filter((f) => invoiceStatusCode(f) === "RASC").length,
    emitidas: faturas.filter((f) => invoiceStatusCode(f) === "EMIT").length,
    pagas: faturas.filter((f) => invoiceStatusCode(f) === "PAGA").length,
  }), [faturas])
  const faturasFiltradas = useMemo(() => {
    let lista = faturas
    if (filtroEstado) lista = lista.filter((f) => invoiceStatusCode(f) === filtroEstado)
    const q = busca.trim().toLowerCase()
    if (!q) return lista
    return lista.filter((f) => {
      const statusCode = invoiceStatusCode(f)
      const estado = INVOICE_STATUS[statusCode]?.label || statusCode
      const haystack = [
        f.id_custom, f.id, f.paciente, f.estado, f.status, estado, invoiceOriginLabel(f), f.total, f.total_a_pagar,
      ].map((v) => String(v ?? "").toLowerCase()).join(" ")
      return haystack.includes(q)
    })
  }, [faturas, busca, filtroEstado])
  const colunaFaturas = useMemo(
    () =>
      STATUS_COLUMNS.map((column) => ({
        ...column,
        rows: faturasFiltradas.filter((f) => column.statuses.includes(invoiceStatusCode(f))),
        visibleRows: faturasFiltradas
          .filter((f) => column.statuses.includes(invoiceStatusCode(f)))
          .slice(0, pageSize),
      })),
    [faturasFiltradas, pageSize]
  )
  const totalFaturasVisiveis = useMemo(
    () => colunaFaturas.reduce((total, column) => total + column.visibleRows.length, 0),
    [colunaFaturas]
  )
  const colunasVisiveis = useMemo(() => {
    if (!filtroEstado) return colunaFaturas

    if (filtroEstado === "PAGA") {
      return [{
        key: "paid-filter",
        title: "Pagas",
        subtitle: "Faturas pagas filtradas.",
        empty: "Nenhuma fatura paga.",
        accentBar: "bg-emerald-500",
        countAccent: "text-emerald-700 bg-emerald-50 border-emerald-200",
        rows: faturasFiltradas,
        visibleRows: faturasFiltradas.slice(0, pageSize),
      }]
    }

    if (filtroEstado === "EMIT") {
      return [{
        key: "issued-filter",
        title: "Emitidas",
        subtitle: "Faturas emitidas filtradas.",
        empty: "Nenhuma fatura emitida.",
        accentBar: "bg-sky-500",
        countAccent: "text-sky-700 bg-sky-50 border-sky-200",
        rows: faturasFiltradas,
        visibleRows: faturasFiltradas.slice(0, pageSize),
      }]
    }

    return [{
      key: "draft-filter",
      title: "Rascunhos",
      subtitle: "Faturas em rascunho filtradas.",
      empty: "Nenhum rascunho encontrado.",
      accentBar: "bg-amber-500",
      countAccent: "text-amber-700 bg-amber-50 border-amber-200",
      rows: faturasFiltradas,
      visibleRows: faturasFiltradas.slice(0, pageSize),
    }]
  }, [colunaFaturas, faturasFiltradas, filtroEstado, pageSize])
  const totalAPagar = useCallback(
    (f?: FaturaRow | null) => f?.total_a_pagar ?? f?.valor_a_pagar ?? f?.total,
    []
  )

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    // Retenta resets transitórios de ligação ao backend (ECONNRESET / socket hang up).
    const maxTentativas = 3
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
        const res = await apiFetch<any>(`/invoices/?page_size=${FETCH_PAGE_SIZE}`, { clientCache: safeRefreshToken === 0 })
        const items = res && (res as any).results ? (res as any).results : res
        setFaturas(Array.isArray(items) ? items : [])
        setCarregando(false)
        return
      } catch (e: any) {
        const transitorio = /ECONNRESET|socket hang up|network|fetch failed|Failed to fetch/i.test(String(e?.message || ""))
        if (transitorio && tentativa < maxTentativas) {
          await new Promise((r) => setTimeout(r, 500 * tentativa))
          continue
        }
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar faturas."))
        setCarregando(false)
        return
      }
    }
  }, [safeRefreshToken])

  useEffect(() => {
    carregar()
  }, [carregar])

  const issueInvoiceAction = useCallback(async (id: number) => {
    if (!podeAlterar) {
      setErro("Sem permissão para emitir fatura.")
      return
    }
    try {
      setErro(null)
      setFeedback(null)
      setAcaoId(id)
      await apiFetch(`/invoices/${id}/issue/`, { method: "POST" })
      await carregar()
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao emitir fatura."))
    } finally {
      setAcaoId(null)
    }
  }, [carregar, podeAlterar])

  const voidInvoiceAction = useCallback(async (id: number) => {
    if (!podeAlterar) {
      setErro("Sem permissão para anular fatura.")
      return
    }
    try {
      setErro(null)
      setFeedback(null)
      setAcaoId(id)
      await apiFetch(`/invoices/${id}/void/`, { method: "POST" })
      await carregar()
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao anular fatura."))
    } finally {
      setAcaoId(null)
    }
  }, [carregar, podeAlterar])

  const downloadPdf = useCallback(async (id: number) => {
    try {
      setAcaoId(id)
      const blob = await apiFetch<Blob>(`/invoices/${id}/pdf/`, {
        method: "GET",
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fatura_${id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar PDF."))
    } finally {
      setAcaoId(null)
    }
  }, [])

  const sendInvoiceNotification = useCallback(async (id: number) => {
    if (!id) return
    try {
      setNotificacaoId(id)
      setErro(null)
      setFeedback(null)
      await apiFetch(`/invoices/${id}/send-notification/`, {
        method: "POST",
        body: JSON.stringify({ channels: ["email", "whatsapp"] }),
      })
      setFeedback("Notificação de fatura processada para email e WhatsApp disponíveis.")
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao enviar notificação da fatura."))
    } finally {
      setNotificacaoId(null)
    }
  }, [])

  const acaoBtn =
    "inline-flex h-8 w-full items-center justify-center rounded-md border px-2 py-1 text-[11px] font-medium transition disabled:opacity-50"
  const renderAcoes = useCallback((f: FaturaRow) => {
    const isProforma = isProformaOrigin(f)
    return (
      <div className="grid grid-cols-2 gap-1">
        {invoiceStatusCode(f) === "RASC" ? (
          <Link
            href={`/invoices/draft/${f.id}`}
            className={`${acaoBtn} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
          >
            {isProforma ? "Rever proforma" : podeAlterar ? "Editar" : "Ver"}
          </Link>
        ) : null}
        <Link href={`/invoices/${f.id}`} className={`${acaoBtn} border-gray-200 text-gray-700 hover:bg-gray-50`}>
          Detalhes
        </Link>
        {podeAlterar && invoiceStatusCode(f) === "RASC" && !isProforma ? (
          <button type="button" className={`${acaoBtn} border-gray-200 text-gray-700 hover:bg-gray-50`} disabled={acaoId === f.id} onClick={() => issueInvoiceAction(f.id)}>
            Emitir
          </button>
        ) : null}
        <button type="button" className={`${acaoBtn} gap-1 border-gray-200 text-gray-700 hover:bg-gray-50`} disabled={acaoId === f.id} onClick={() => downloadPdf(f.id)}>
          <PdfActionLabel loading={acaoId === f.id} loadingLabel="PDF...">PDF</PdfActionLabel>
        </button>
        <Link href={`/invoices/${f.id}`} className={`${acaoBtn} border-gray-200 text-gray-700 hover:bg-gray-50`}>
          Itens
        </Link>
        {invoiceStatusCode(f) === "PAGA" ? (
          <button type="button" className={`${acaoBtn} border-sky-200 text-sky-700 hover:bg-sky-50`} disabled={notificacaoId === f.id} onClick={() => sendInvoiceNotification(f.id)}>
            {notificacaoId === f.id ? "Notificando..." : "Notificar"}
          </button>
        ) : null}
        {podeAlterar && invoiceStatusCode(f) === "RASC" ? (
          <ConfirmDialog
            title="Anular fatura"
            message="Esta fatura será anulada. Confirme apenas se já revisou o rascunho."
            confirmText="Anular"
            onConfirm={() => voidInvoiceAction(f.id)}
            disabled={acaoId === f.id}
          >
            <button type="button" className={`${acaoBtn} border-red-200 text-red-700 hover:bg-red-50`} disabled={acaoId === f.id}>
              Anular
            </button>
          </ConfirmDialog>
        ) : null}
      </div>
    )
  }, [acaoId, downloadPdf, issueInvoiceAction, voidInvoiceAction, podeAlterar, notificacaoId, sendInvoiceNotification])

  if (loading) return null

  return (
    <AppLayout
      requiredGroups={[
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.CONTABILIDADE,
      ]}
    >
      <div className="space-y-2">
        {/* ── Hero ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-500" />
          <div className="space-y-3 px-3 py-2 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20">
                  <Receipt size={17} />
                </span>
                <div>
                  <h1 className="text-lg font-bold leading-tight text-foreground">Faturas</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {carregando ? "A carregar…" : `${stats.total} fatura${stats.total !== 1 ? "s" : ""} · gestão e emissão`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {podeCriar ? (
                  <Link
                    href="/invoices/new"
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-br from-sky-500 to-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-sky-500/20 transition hover:opacity-90"
                  >
                    <Plus size={15} /> Criar fatura
                  </Link>
                ) : null}
                {podeVerAdmin ? (
                  <Link
                    href="/admin/billing/invoice/"
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/20"
                  >
                    <Building2 size={15} /> Administração
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <InvoiceMetric
                icon={FilePlus2}
                label="Total"
                value={carregando ? "…" : stats.total}
                accent="bg-slate-500"
                active={filtroEstado === null}
                onClick={() => setFiltroEstado(null)}
              />
              <InvoiceMetric
                icon={FilePlus2}
                label="Rascunhos"
                value={carregando ? "…" : stats.rascunhos}
                accent="bg-amber-500"
                active={filtroEstado === "RASC"}
                onClick={() => setFiltroEstado((current) => (current === "RASC" ? null : "RASC"))}
              />
              <InvoiceMetric
                icon={Wallet}
                label="Emitidas"
                value={carregando ? "…" : stats.emitidas}
                accent="bg-sky-500"
                active={filtroEstado === "EMIT"}
                onClick={() => setFiltroEstado((current) => (current === "EMIT" ? null : "EMIT"))}
              />
              <InvoiceMetric
                icon={BadgeCheck}
                label="Pagas"
                value={carregando ? "…" : stats.pagas}
                accent="bg-emerald-500"
                active={filtroEstado === "PAGA"}
                onClick={() => setFiltroEstado((current) => (current === "PAGA" ? null : "PAGA"))}
              />
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md lg:flex-1">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pesquisar…"
                  className="w-full rounded-lg border border-border bg-background/60 py-1.5 pl-7 pr-6 text-xs text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
                {busca && (
                  <button
                    type="button"
                    aria-label="Limpar pesquisa"
                    onClick={() => setBusca("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
                {(["RASC", "EMIT", "PAGA"] as const).map((cod) => {
                  const { label, badge } = INVOICE_STATUS[cod]
                  const ativo = filtroEstado === cod
                  return (
                    <button
                      key={cod}
                      type="button"
                      onClick={() => setFiltroEstado(ativo ? null : cod)}
                      className={`inline-flex h-9 min-w-[108px] items-center justify-center rounded-lg border px-3 text-xs font-semibold transition ${ativo ? badge + " ring-2 ring-offset-1 ring-current/30" : "border-border bg-background/60 text-muted-foreground hover:bg-muted"}`}
                    >
                      {label}
                    </button>
                  )
                })}
                <div className="inline-flex h-9 min-w-[104px] items-center justify-center gap-1.5 rounded-lg border border-border bg-background/60 px-2" title="Itens por coluna">
                  <PageSizeInput value={pageSize} onChange={setPageSize} ariaLabel="Itens por coluna" />
                  <span className="text-xs text-muted-foreground">/coluna</span>
                </div>
                <Link
                  href="/invoices/reports"
                  className="inline-flex h-9 min-w-[120px] items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300"
                >
                  <BarChart3 size={15} /> Relatórios
                </Link>
              </div>
            </div>
          </div>
        </section>

        {erro && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        )}

        {feedback && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {feedback}
          </div>
        )}

        {carregando ? (
          <div className="text-sm text-gray-500">Carregando faturas...</div>
        ) : (
          <div className="space-y-2">
            <div className="px-1 text-[11px] text-muted-foreground">
              A mostrar {totalFaturasVisiveis} de {faturasFiltradas.length} fatura{faturasFiltradas.length !== 1 ? "s" : ""} no quadro
            </div>

            {faturasFiltradas.length === 0 ? (
              <Card glass>
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {busca ? "Nenhuma fatura corresponde à pesquisa." : "Nenhuma fatura encontrada."}
                </div>
              </Card>
            ) : (
              <div className={`grid gap-2 ${filtroEstado ? "grid-cols-1" : "xl:grid-cols-2"}`}>
                {colunasVisiveis.map((column) => (
                  <Card
                    key={column.key}
                    glass
                    title={column.title}
                    subtitle={column.subtitle}
                    actions={
                      <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ${column.countAccent}`}>
                        {column.rows.length}
                      </span>
                    }
                  >
                    {column.visibleRows.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">{column.empty}</div>
                    ) : (
                      <div className={`grid gap-1.5 ${filtroEstado ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6" : "grid-cols-2 md:grid-cols-3"}`}>
                        {column.visibleRows.map((f) => {
                          const statusCode = invoiceStatusCode(f)
                          const accentBar =
                            statusCode === "PAGA" ? "bg-emerald-500"
                            : statusCode === "EMIT" ? "bg-sky-500"
                            : statusCode === "CANC" ? "bg-rose-500"
                            : "bg-amber-500"
                          return (
                            <article
                              key={f.id}
                              className="relative flex min-h-[138px] flex-col overflow-hidden rounded-lg border border-white/15 bg-white/20 p-2.5 pl-3 shadow-sm backdrop-blur-sm transition hover:border-white/30 hover:bg-white/24 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]"
                            >
                              <span className={`absolute left-0 top-0 h-full w-1 ${accentBar}`} />
                              <Link href={`/invoices/${f.id}`} className="absolute inset-0 z-10" aria-label={`Abrir detalhes da fatura ${f.id_custom || f.id}`} />
                              <div className="relative flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="truncate text-[12px] font-bold leading-tight text-foreground">{f.id_custom || `Fatura ${f.id}`}</div>
                                  <div className="mt-1 line-clamp-2 min-h-[1.75rem] text-[10px] leading-3.5 text-muted-foreground">
                                    {f.paciente || "Paciente não identificado"}
                                  </div>
                                </div>
                                <div className="pointer-events-none">
                                  <EstadoBadge estado={statusCode} />
                                </div>
                              </div>
                              <div className="relative mt-1.5 grid gap-1 text-[10px] text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  {isProformaOrigin(f) ? (
                                    <span className="inline-flex rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">Proforma</span>
                                  ) : (
                                    <span className="truncate">{invoiceOriginLabel(f)}</span>
                                  )}
                                </div>
                                <span className="text-sm font-bold leading-none text-foreground tabular-nums">
                                  <MoneyValue value={totalAPagar(f)} />
                                </span>
                              </div>
                              <div className="relative z-20 mt-auto border-t border-white/10 pt-1.5">{renderAcoes(f)}</div>
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
