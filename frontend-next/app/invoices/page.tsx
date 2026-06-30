"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

import { BadgeCheck, BarChart3, Building2, FilePlus2, FileText, Plus, Receipt, Search, Wallet, X } from "lucide-react"

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
type FaturaItem = {
  id: number
  descricao?: string
  tipo_item?: string
  quantidade?: string | number
  preco_unitario?: string | number
  aplica_iva?: boolean
  iva_percentual?: string | number
  iva_valor?: string | number
  total_sem_iva?: string | number
  total_com_iva?: string | number
}

type RequisicaoPendente = {
  id: number
  id_custom?: string
  paciente?: string | null
  tipo?: string
  tipo_display?: string
  estado?: string
  num_exames?: number
  medico?: string | null
}

const ITEM_TYPE_ORDER = ["EXM", "EXA", "AJU", "PRC", "MAT", "FAR"] as const

const ITEM_TYPE_LABELS: Record<string, string> = {
  EXM: "Exames médicos",
  EXA: "Exames",
  AJU: "Consultas e ajustes",
  PRC: "Procedimentos",
  MAT: "Materiais",
  FAR: "Medicação",
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
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  accent: string
}) {
  return (
    <section className={`relative overflow-hidden ${GLASS}`}>
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
    </section>
  )
}

export default function FaturasPage() {
  const router = useRouter()
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
  const [itens, setItens] = useState<FaturaItem[]>([])
  const [itensFaturaId, setItensFaturaId] = useState<number | null>(null)
  const [carregandoItens, setCarregandoItens] = useState(false)
  const [selectedFatura, setSelectedFatura] = useState<FaturaRow | null>(null)
  const [temPagamentoPendente, setTemPagamentoPendente] = useState(false)
  const [busca, setBusca] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(10)
  const [requisicoes, setRequisicoes] = useState<RequisicaoPendente[]>([])
  const [carregandoRequisicoes, setCarregandoRequisicoes] = useState(true)
  const [acaoRequisicaoId, setAcaoRequisicaoId] = useState<number | null>(null)

  const podeAlterar = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO])
  const rascunhos = useMemo(() => faturas.filter((f) => f.estado === "RASC"), [faturas])
  const stats = useMemo(() => ({
    total: faturas.length,
    rascunhos: faturas.filter((f) => f.estado === "RASC").length,
    emitidas: faturas.filter((f) => f.estado === "EMIT").length,
    pagas: faturas.filter((f) => f.estado === "PAGA").length,
  }), [faturas])
  const faturasFiltradas = useMemo(() => {
    let lista = faturas
    if (filtroEstado) lista = lista.filter((f) => f.estado === filtroEstado)
    const q = busca.trim().toLowerCase()
    if (!q) return lista
    return lista.filter((f) => {
      const estado = INVOICE_STATUS[String(f.estado || "").toUpperCase()]?.label || f.estado || ""
      const haystack = [
        f.id_custom, f.id, f.paciente, f.estado, estado, invoiceOriginLabel(f), f.total, f.total_a_pagar,
      ].map((v) => String(v ?? "").toLowerCase()).join(" ")
      return haystack.includes(q)
    })
  }, [faturas, busca, filtroEstado])
  const faturasVisiveis = useMemo(
    () => faturasFiltradas.slice(0, pageSize),
    [faturasFiltradas, pageSize]
  )
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
        const res = await apiFetch<any>(`/invoices/?page_size=${pageSize}`, { clientCache: safeRefreshToken === 0 })
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
  }, [safeRefreshToken, pageSize])

  useEffect(() => {
    carregar()
  }, [carregar])

  const carregarRequisicoes = useCallback(async () => {
    try {
      setCarregandoRequisicoes(true)
      const res = await apiFetch<any>("/invoices/pending-requisitions/", {
        clientCache: safeRefreshToken === 0,
      })
      const items = res && (res as any).results ? (res as any).results : res
      setRequisicoes(Array.isArray(items) ? items : [])
    } catch (e: any) {
      if (!isNotFoundLikeError(e)) {
        setRequisicoes([])
      }
    } finally {
      setCarregandoRequisicoes(false)
    }
  }, [safeRefreshToken])

  useEffect(() => {
    carregarRequisicoes()
  }, [carregarRequisicoes])

  const iniciarFaturacao = useCallback(
    async (requisicaoId: number) => {
      if (!podeAlterar) {
        setErro("Sem permissão para iniciar faturação.")
        return
      }
      try {
        setErro(null)
        setFeedback(null)
        setAcaoRequisicaoId(requisicaoId)
        const fatura = await apiFetch<any>("/invoices/start-billing/", {
          method: "POST",
          body: JSON.stringify({ request: requisicaoId }),
        })
        await carregarRequisicoes()
        await carregar()
        if (fatura?.id) {
          router.push(`/invoices/draft/${fatura.id}`)
        }
      } catch (e: any) {
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao iniciar faturação."))
      } finally {
        setAcaoRequisicaoId(null)
      }
    },
    [carregar, carregarRequisicoes, podeAlterar, router]
  )

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

  const carregarItens = useCallback(async (faturaId: number) => {
    setCarregandoItens(true)
    try {
      const res = await apiFetch<any>(`/billing/invoiceitem/?fatura=${faturaId}`, {
        clientCache: safeRefreshToken === 0,
      })
      const lista = res && res.results ? res.results : res
      setItens(Array.isArray(lista) ? lista : [])
      setItensFaturaId(faturaId)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar itens da fatura."))
      setItens([])
      setItensFaturaId(null)
    } finally {
      setCarregandoItens(false)
    }
  }, [safeRefreshToken])

  const carregarPagamentosPendentes = useCallback(async (faturaId: number) => {
    try {
      const res = await apiFetch<any>(`/payments/payment/?fatura=${faturaId}&status=PEN`, {
        clientCache: safeRefreshToken === 0,
      })
      const lista = res && res.results ? res.results : res
      const pendentes = Array.isArray(lista) ? lista : []
      setTemPagamentoPendente(pendentes.length > 0)
    } catch {
      setTemPagamentoPendente(false)
    }
  }, [safeRefreshToken])

  const detalhar = useCallback(
    (fatura: FaturaRow) => {
      setSelectedFatura(fatura)
      carregarItens(fatura.id)
      carregarPagamentosPendentes(fatura.id)
    },
    [carregarItens, carregarPagamentosPendentes]
  )

  useEffect(() => {
    if (!selectedFatura) return
    const atual = faturas.find((f) => f.id === selectedFatura.id)
    if (atual && atual !== selectedFatura) {
      setSelectedFatura(atual)
    }
  }, [faturas, selectedFatura])

  useEffect(() => {
    if (!selectedFatura) {
      setTemPagamentoPendente(false)
    }
  }, [selectedFatura])

  useEffect(() => {
    if (!selectedFatura?.id) return
    carregarItens(selectedFatura.id)
    carregarPagamentosPendentes(selectedFatura.id)
  }, [carregarItens, carregarPagamentosPendentes, safeRefreshToken, selectedFatura?.id])

  const confirmPayment = useCallback(
    async (id: number) => {
      if (!podeAlterar) {
        setErro("Sem permissão para confirmar pagamentos.")
        return
      }
      try {
        setErro(null)
        setFeedback(null)
        setAcaoId(id)
        const updated = await apiFetch<FaturaRow>(`/invoices/${id}/confirm-payment/`, { method: "POST" })
        if (updated?.id) {
          setFaturas((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
          if (selectedFatura?.id === updated.id) setSelectedFatura(updated)
          setTemPagamentoPendente(false)
          setFeedback("Pagamento confirmado. Pode enviar a notificação da fatura por email e WhatsApp.")
        }
        await carregar()
        await carregarPagamentosPendentes(id)
      } catch (e: any) {
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao confirmar pagamento."))
      } finally {
        setAcaoId(null)
      }
    },
    [carregar, podeAlterar, selectedFatura, carregarPagamentosPendentes]
  )

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

  const toggleIva = useCallback(
    async (item: FaturaItem) => {
      if (!item?.id) return
      if (!podeAlterar) {
        setErro("Sem permissão para alterar IVA.")
        return
      }
      try {
        await apiFetch(`/billing/invoiceitem/${item.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ aplica_iva: !item.aplica_iva }),
        })
        if (itensFaturaId) await carregarItens(itensFaturaId)
      } catch (e: any) {
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao atualizar IVA do item."))
      }
    },
    [carregarItens, itensFaturaId, podeAlterar]
  )

  const acaoBtn = "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium transition disabled:opacity-50"
  const renderAcoes = useCallback((f: FaturaRow) => {
    const isProforma = isProformaOrigin(f)
    return (
      <div className="flex flex-wrap gap-1.5">
        {f.estado === "RASC" ? (
          <Link
            href={`/invoices/draft/${f.id}`}
            className={`${acaoBtn} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
          >
            {isProforma ? "Rever proforma" : podeAlterar ? "Editar" : "Ver"}
          </Link>
        ) : null}
        <button type="button" className={`${acaoBtn} border-gray-200 text-gray-700 hover:bg-gray-50`} onClick={() => detalhar(f)}>
          Detalhes
        </button>
        {podeAlterar && f.estado === "RASC" && !isProforma ? (
          <button type="button" className={`${acaoBtn} border-gray-200 text-gray-700 hover:bg-gray-50`} disabled={acaoId === f.id} onClick={() => issueInvoiceAction(f.id)}>
            Emitir
          </button>
        ) : null}
        <button type="button" className={`${acaoBtn} gap-1 border-gray-200 text-gray-700 hover:bg-gray-50`} disabled={acaoId === f.id} onClick={() => downloadPdf(f.id)}>
          <PdfActionLabel loading={acaoId === f.id} loadingLabel="PDF...">PDF</PdfActionLabel>
        </button>
        <button type="button" className={`${acaoBtn} border-gray-200 text-gray-700 hover:bg-gray-50`} disabled={carregandoItens && itensFaturaId === f.id} onClick={() => carregarItens(f.id)}>
          Itens/IVA
        </button>
        {f.estado === "PAGA" ? (
          <button type="button" className={`${acaoBtn} border-sky-200 text-sky-700 hover:bg-sky-50`} disabled={notificacaoId === f.id} onClick={() => sendInvoiceNotification(f.id)}>
            {notificacaoId === f.id ? "Notificando..." : "Notificar"}
          </button>
        ) : null}
        {podeAlterar && f.estado === "RASC" ? (
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
  }, [acaoId, downloadPdf, issueInvoiceAction, voidInvoiceAction, podeAlterar, carregarItens, carregandoItens, itensFaturaId, detalhar, notificacaoId, sendInvoiceNotification])

  const groupedItens = useMemo(() => {
    const normalize = (item: FaturaItem) => (item.tipo_item ?? "").toString().toUpperCase()
    const groups: { key: string; label: string; items: FaturaItem[] }[] = []

    ITEM_TYPE_ORDER.forEach((type) => {
      const itensDoTipo = itens.filter((item) => normalize(item) === type)
      if (itensDoTipo.length) {
        groups.push({
          key: type,
          label: ITEM_TYPE_LABELS[type] || type,
          items: itensDoTipo,
        })
      }
    })

    const restantes = itens.filter((item) => !ITEM_TYPE_ORDER.includes(normalize(item) as typeof ITEM_TYPE_ORDER[number]))
    if (restantes.length) {
      groups.push({
        key: "OUTROS",
        label: "Outros itens",
        items: restantes,
      })
    }

    return groups
  }, [itens])

  const ivaPercentual = useMemo(() => {
    if (!selectedFatura) return "0.00"
    const subtotal = Number(selectedFatura.subtotal ?? 0)
    const iva = Number(selectedFatura.iva_valor ?? 0)
    if (!subtotal) return "0.00"
    const percentual = (iva / subtotal) * 100
    return Number.isFinite(percentual) ? percentual.toFixed(2) : "0.00"
  }, [selectedFatura])

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
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 pl-4">
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
        </section>

        {/* ── Métricas ── */}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <InvoiceMetric icon={FileText} label="Total" value={carregando ? "…" : stats.total} accent="bg-slate-500" />
          <InvoiceMetric icon={FilePlus2} label="Rascunhos" value={carregando ? "…" : stats.rascunhos} accent="bg-amber-500" />
          <InvoiceMetric icon={Wallet} label="Emitidas" value={carregando ? "…" : stats.emitidas} accent="bg-sky-500" />
          <InvoiceMetric icon={BadgeCheck} label="Pagas" value={carregando ? "…" : stats.pagas} accent="bg-emerald-500" />
        </div>

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

        {/* ── Busca + filtros + relatórios ── */}
        <section className={`relative ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-slate-400" />
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 pl-4">
            <div className="relative min-w-[160px] flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar…"
                className="h-9 w-full rounded-lg border border-border bg-background/60 py-2 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition"
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
            {(["RASC", "EMIT", "PAGA"] as const).map((cod) => {
              const { label, badge } = INVOICE_STATUS[cod]
              const ativo = filtroEstado === cod
              return (
                <button
                  key={cod}
                  type="button"
                  onClick={() => setFiltroEstado(ativo ? null : cod)}
                  className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold transition ${ativo ? badge + " ring-2 ring-offset-1 ring-current/30" : "border-border bg-background/60 text-muted-foreground hover:bg-muted"}`}
                >
                  {label}
                </button>
              )
            })}
            <div className="inline-flex h-9 items-center gap-1.5" title="Itens por página">
              <PageSizeInput value={pageSize} onChange={setPageSize} ariaLabel="Itens por página" />
              <span className="text-xs text-muted-foreground">/pág</span>
            </div>
            <Link
              href="/invoices/reports"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300"
            >
              <BarChart3 size={15} /> Relatórios
            </Link>
          </div>
        </section>

        {carregando ? (
          <div className="text-sm text-gray-500">Carregando faturas...</div>
        ) : (
          <div className="space-y-2">
            <Card
              glass
              title="Faturas por criar"
              subtitle="Requisições por faturar e rascunhos aguardando emissão."
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Requisições por faturar
                    </div>
                    {requisicoes.length > 0 ? (
                      <span className="text-[11px] text-muted-foreground">
                        A mostrar {Math.min(requisicoes.length, pageSize)} de {requisicoes.length}
                      </span>
                    ) : null}
                  </div>
                  {carregandoRequisicoes ? (
                    <div className="text-sm text-gray-500">Carregando requisições...</div>
                  ) : requisicoes.length === 0 ? (
                    <div className="text-sm text-gray-500">Nenhuma requisição por faturar.</div>
                  ) : (
                    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {requisicoes.slice(0, pageSize).map((r) => (
                        <div
                          key={r.id}
                          className={`relative flex min-h-[150px] flex-col justify-between overflow-hidden ${GLASS} p-3 pl-4 transition hover:shadow`}
                        >
                          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
                          <div>
                            <div className="font-semibold text-foreground">
                              {r.id_custom || `REQ ${r.id}`}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">{r.paciente || "Paciente não identificado"}</div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs text-violet-700">
                                {r.tipo_display || r.tipo || "Requisição"}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-white/30 bg-white/40 px-2 py-0.5 text-xs text-muted-foreground backdrop-blur-sm dark:bg-white/10">
                                {(r.num_exames ?? 0)} {r.num_exames === 1 ? "exame" : "exames"}
                              </span>
                            </div>
                            {r.medico ? (
                              <div className="mt-1 text-xs text-muted-foreground">Médico: {r.medico}</div>
                            ) : null}
                          </div>
                          {podeAlterar ? (
                            <button
                              type="button"
                              onClick={() => iniciarFaturacao(r.id)}
                              disabled={acaoRequisicaoId === r.id}
                              className="mt-3 inline-flex items-center justify-center rounded-lg bg-[var(--primary-600)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:opacity-50"
                            >
                              {acaoRequisicaoId === r.id ? "Iniciando..." : "Iniciar faturação"}
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Rascunhos aguardando emissão
                    </div>
                    {rascunhos.length > 0 ? (
                      <span className="text-[11px] text-muted-foreground">
                        A mostrar {Math.min(rascunhos.length, pageSize)} de {rascunhos.length}
                      </span>
                    ) : null}
                  </div>
                  {rascunhos.length === 0 ? (
                    <div className="text-sm text-gray-500">Nenhum rascunho encontrado.</div>
                  ) : (
                    <div className="space-y-2">
                      {rascunhos.slice(0, pageSize).map((f) => (
                        <div
                          key={f.id}
                          className={`relative flex flex-wrap items-center justify-between gap-2 overflow-hidden ${GLASS} px-3 py-2 pl-4 text-sm`}
                        >
                          <span className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
                          <div className="text-foreground">
                            <div className="font-semibold">{f.id_custom || `Fatura ${f.id}`}</div>
                            <div className="text-xs text-muted-foreground">Paciente: {f.paciente || "-"}</div>
                          </div>
                          <Link
                            href={`/invoices/draft/${f.id}`}
                            className="inline-flex items-center rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                          >
                            {podeAlterar ? "Editar" : "Ver"}
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <div className="px-1 text-[11px] text-muted-foreground">
              A mostrar {faturasVisiveis.length} de {faturasFiltradas.length} fatura{faturasFiltradas.length !== 1 ? "s" : ""}
            </div>

            {faturasVisiveis.length === 0 ? (
              <Card glass>
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {busca ? "Nenhuma fatura corresponde à pesquisa." : "Nenhuma fatura encontrada."}
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
                {faturasVisiveis.map((f) => {
                  const accent = INVOICE_STATUS[String(f.estado || "").toUpperCase()]
                  const accentBar =
                    f.estado === "PAGA" ? "bg-emerald-500"
                    : f.estado === "EMIT" ? "bg-sky-500"
                    : f.estado === "CANC" ? "bg-rose-500"
                    : "bg-amber-500"
                  return (
                    <article
                      key={f.id}
                      className={`relative flex aspect-[2/1] flex-col overflow-hidden ${GLASS} p-2.5 pl-3.5`}
                    >
                      <span className={`absolute left-0 top-0 h-full w-1 ${accentBar}`} />
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-foreground">{f.id_custom || `Fatura ${f.id}`}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{f.paciente || "—"}</div>
                        </div>
                        <EstadoBadge estado={f.estado} />
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {isProformaOrigin(f) ? (
                          <span className="inline-flex rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">Proforma</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">{invoiceOriginLabel(f)}</span>
                        )}
                        <span className="ml-auto text-sm font-bold text-foreground tabular-nums">
                          <MoneyValue value={totalAPagar(f)} />
                        </span>
                      </div>
                      <div className="mt-auto pt-2">{renderAcoes(f)}</div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {selectedFatura ? (
          <Card
            glass
            title={`Detalhes da fatura ${selectedFatura.id_custom || selectedFatura.id}`}
            subtitle="Revisão e confirmação de pagamento"
            actions={
              <div className="flex flex-wrap gap-2">
                {temPagamentoPendente && selectedFatura.estado !== "PAGA" && podeAlterar ? (
                  <button
                    className="inline-flex items-center rounded-lg border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                    disabled={acaoId === selectedFatura.id}
                    onClick={() => confirmPayment(selectedFatura.id)}
                  >
                    Confirmar pagamento
                  </button>
                ) : null}
                {selectedFatura.estado === "PAGA" ? (
                  <button
                    className="inline-flex items-center rounded-lg border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 disabled:opacity-50"
                    disabled={notificacaoId === selectedFatura.id}
                    onClick={() => sendInvoiceNotification(selectedFatura.id)}
                  >
                    {notificacaoId === selectedFatura.id ? "Notificando..." : "Enviar notificação"}
                  </button>
                ) : null}
              </div>
            }
          >
            <div className="grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Estado</div>
                <div className="text-foreground"><EstadoBadge estado={selectedFatura.estado} /></div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Origem</div>
                <div className="text-foreground">{selectedFatura.origem || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Subtotal (sem IVA)</div>
                <div className="text-foreground"><MoneyValue value={selectedFatura.subtotal} /></div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">IVA (%)</div>
                <div className="text-foreground">{ivaPercentual}%</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Valor do IVA</div>
                <div className="text-foreground"><MoneyValue value={selectedFatura.iva_valor} /></div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Total a pagar (com IVA)</div>
                <div className="text-foreground"><MoneyValue value={totalAPagar(selectedFatura)} /></div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Valor paciente</div>
                <div className="text-foreground"><MoneyValue value={selectedFatura.valor_paciente} /></div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Valor seguro</div>
                <div className="text-foreground"><MoneyValue value={selectedFatura.valor_seguro} /></div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Itens</h3>
              {carregandoItens && itensFaturaId === selectedFatura.id ? (
                <div className="py-2 text-sm text-gray-500">Carregando itens...</div>
              ) : itensFaturaId === selectedFatura.id && groupedItens.length ? (
                <div className="mt-2 space-y-6">
                  {groupedItens.map((group) => (
                    <div key={group.key} className="space-y-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">{group.label}</div>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="min-w-full text-xs text-left">
                          <thead className="bg-muted text-muted-foreground">
                            <tr>
                              <th className="px-2 py-1">Descrição</th>
                              <th className="px-2 py-1 text-right">Qtd</th>
                              <th className="px-2 py-1 text-right">Preço</th>
                              <th className="px-2 py-1 text-right">Subtotal</th>
                              <th className="px-2 py-1 text-right">IVA (%)</th>
                              <th className="px-2 py-1 text-right">Valor IVA</th>
                              <th className="px-2 py-1 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-foreground">
                            {group.items.map((item) => (
                              <tr key={item.id}>
                                <td className="px-2 py-1 font-semibold">{item.descricao || `Item ${item.id}`}</td>
                                <td className="px-2 py-1 text-right">{item.quantidade ?? "-"}</td>
                                <td className="px-2 py-1 text-right"><MoneyValue value={item.preco_unitario} /></td>
                                <td className="px-2 py-1 text-right"><MoneyValue value={item.total_sem_iva} /></td>
                                <td className="px-2 py-1 text-right">{item.iva_percentual ?? "-"}%</td>
                                <td className="px-2 py-1 text-right"><MoneyValue value={item.iva_valor} /></td>
                                <td className="px-2 py-1 text-right"><MoneyValue value={item.total_com_iva} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : itensFaturaId === selectedFatura.id ? (
                <div className="py-2 text-sm text-gray-500">Nenhum item adicionado nesta fatura.</div>
              ) : (
                <div className="py-2 text-sm text-gray-500">
                  Clique em “Detalhes” para carregar os itens da fatura.
                </div>
              )}
            </div>

            {!temPagamentoPendente && (
              <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                Nenhum pagamento pendente encontrado para esta fatura.
              </div>
            )}
          </Card>
        ) : null}
      </div>
    </AppLayout>
  )
}
