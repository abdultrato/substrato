"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import MoneyValue from "@/components/ui/MoneyValue"
import Card from "@/components/ui/Card"

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

type UserOption = {
  id: number
  username: string
  displayName: string
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

export default function FaturasPage() {
  const { loading } = useAuthGuard()
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const podeCriar = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO])
  const [faturas, setFaturas] = useState<FaturaRow[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [acaoId, setAcaoId] = useState<number | null>(null)
  const [itens, setItens] = useState<FaturaItem[]>([])
  const [itensFaturaId, setItensFaturaId] = useState<number | null>(null)
  const [carregandoItens, setCarregandoItens] = useState(false)
  const [selectedFatura, setSelectedFatura] = useState<FaturaRow | null>(null)
  const [temPagamentoPendente, setTemPagamentoPendente] = useState(false)
  const [reportUsers, setReportUsers] = useState<UserOption[]>([])
  const [reportUserId, setReportUserId] = useState<string>("__all__")
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear())
  const [reportDate, setReportDate] = useState<string>(() => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const dd = String(now.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  })
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1)
  const [reportQuarter, setReportQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3) + 1)
  const [reportSemester, setReportSemester] = useState<number>(new Date().getMonth() + 1 <= 6 ? 1 : 2)
  const [reportLoading, setReportLoading] = useState<
    | null
    | "daily"
    | "monthly"
    | "quarterly"
    | "semiannual"
    | "annual"
    | "general-daily"
    | "general-monthly"
    | "general-annual"
  >(null)
  const [reportUsersLoading, setReportUsersLoading] = useState(false)
  const [reportUsersError, setReportUsersError] = useState<string | null>(null)

  const podeAlterar = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO])
  const rascunhos = useMemo(() => faturas.filter((f) => f.estado === "RASC"), [faturas])
  const totalAPagar = useCallback(
    (f?: FaturaRow | null) => f?.total_a_pagar ?? f?.valor_a_pagar ?? f?.total,
    []
  )

  const carregar = useCallback(async () => {
    try {
      setCarregando(true)
      setErro(null)
      const res = await apiFetch<any>("/invoices/")
      const items = res && (res as any).results ? (res as any).results : res
      setFaturas(Array.isArray(items) ? items : [])
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar faturas."))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const carregarUtilizadores = useCallback(async () => {
    try {
      setReportUsersLoading(true)
      setReportUsersError(null)
      const res = await apiFetch<any>("/identidade/usuario/?page_size=500")
      const items = res && res.results ? res.results : res
      const rows = Array.isArray(items) ? items : []
      const options: UserOption[] = rows.map((row: any) => {
        const firstName = String(row.first_name || "").trim()
        const lastName = String(row.last_name || "").trim()
        const fullName = `${firstName} ${lastName}`.trim()
        const username = String(row.username || "")
        return {
          id: Number(row.id),
          username,
          displayName: fullName || username || `Utilizador ${row.id}`,
        }
      })
      setReportUsers(options)
    } catch (e: any) {
      setReportUsers([])
      setReportUsersError(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar utilizadores."))
    } finally {
      setReportUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarUtilizadores()
  }, [carregarUtilizadores])

  const emitir = useCallback(async (id: number) => {
    if (!podeAlterar) {
      setErro("Sem permissão para emitir fatura.")
      return
    }
    try {
      setAcaoId(id)
      await apiFetch(`/invoices/${id}/emitir/`, { method: "POST" })
      await carregar()
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao emitir fatura."))
    } finally {
      setAcaoId(null)
    }
  }, [carregar, podeAlterar])

  const anular = useCallback(async (id: number) => {
    if (!podeAlterar) {
      setErro("Sem permissão para anular fatura.")
      return
    }
    if (!confirm("Anular esta fatura?")) return
    try {
      setAcaoId(id)
      await apiFetch(`/invoices/${id}/anular/`, { method: "POST" })
      await carregar()
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao anular fatura."))
    } finally {
      setAcaoId(null)
    }
  }, [carregar, podeAlterar])

  const baixarPdf = useCallback(async (id: number) => {
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

  const gerarHistoricoFaturamentoPdf = useCallback(
    async (period: "daily" | "monthly" | "quarterly" | "semiannual" | "annual", forceAll = false) => {
      try {
        const loadingKey =
          forceAll && period === "daily"
            ? "general-daily"
            : forceAll && period === "monthly"
              ? "general-monthly"
              : forceAll && period === "annual"
                ? "general-annual"
                : period
        setReportLoading(loadingKey)

        const scope = forceAll ? "all" : "user"
        if (!forceAll && (!reportUserId || reportUserId === "__all__")) {
          setErro("Selecione um utilizador específico para gerar histórico individual.")
          return
        }

        const params = new URLSearchParams()
        params.set("period", period)
        params.set("scope", scope)
        params.set("year", String(reportYear))
        if (period === "daily") params.set("date", String(reportDate))
        if (period === "monthly") params.set("month", String(reportMonth))
        if (period === "quarterly") params.set("quarter", String(reportQuarter))
        if (period === "semiannual") params.set("semester", String(reportSemester))
        if (scope === "user") params.set("user_id", String(reportUserId))
        params.set("limit", "300")

        const blob = await apiFetch<Blob>(`/invoices/historico_faturamento/pdf/?${params.toString()}`, {
          responseType: "blob",
        })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        const periodRef = period === "daily" ? reportDate : String(reportYear)
        a.download = `historico_faturamento_${period}_${scope}_${periodRef}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      } catch (e: any) {
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar histórico de faturamento."))
      } finally {
        setReportLoading(null)
      }
    },
    [reportDate, reportMonth, reportQuarter, reportSemester, reportUserId, reportYear]
  )

  const carregarItens = useCallback(async (faturaId: number) => {
    setCarregandoItens(true)
    try {
      const res = await apiFetch<any>(`/billing/invoiceitem/?fatura=${faturaId}`)
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
  }, [])

  const carregarPagamentosPendentes = useCallback(async (faturaId: number) => {
    try {
      const res = await apiFetch<any>(`/payments/payment/?fatura=${faturaId}&status=PEN`)
      const lista = res && res.results ? res.results : res
      const pendentes = Array.isArray(lista) ? lista : []
      setTemPagamentoPendente(pendentes.length > 0)
    } catch {
      setTemPagamentoPendente(false)
    }
  }, [])

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

  const confirmarPagamento = useCallback(
    async (id: number) => {
      if (!podeAlterar) {
        setErro("Sem permissão para confirmar pagamentos.")
        return
      }
      try {
        setAcaoId(id)
        await apiFetch(`/invoices/${id}/confirmar_pagamento/`, { method: "POST" })
        await carregar()
        if (selectedFatura?.id === id) {
          const atual = faturas.find((f) => f.id === id)
          if (atual) setSelectedFatura(atual)
        }
        await carregarPagamentosPendentes(id)
      } catch (e: any) {
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao confirmar pagamento."))
      } finally {
        setAcaoId(null)
      }
    },
    [carregar, faturas, podeAlterar, selectedFatura, carregarPagamentosPendentes]
  )

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

  const columns = useMemo(
    () => [
      { header: "Código", render: (f: FaturaRow) => f.id_custom || f.id },
      { header: "Origem", render: (f: FaturaRow) => f.origem || "-" },
      { header: "Estado", render: (f: FaturaRow) => f.estado || "-" },
      { header: "Total a pagar", render: (f: FaturaRow) => <MoneyValue value={totalAPagar(f)} /> },
      {
        header: "Ações",
        render: (f: FaturaRow) => (
          <div className="flex flex-wrap gap-2">
            {f.estado === "RASC" ? (
              <Link
                href={`/invoices/draft/${f.id}`}
                className="inline-flex items-center rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
              >
                {podeAlterar ? "Editar rascunho" : "Ver rascunho"}
              </Link>
            ) : null}
            <button
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              onClick={() => detalhar(f)}
            >
              Detalhes
            </button>
            {podeAlterar && f.estado === "RASC" ? (
              <button
                className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                disabled={acaoId === f.id}
                onClick={() => emitir(f.id)}
              >
                Emitir
              </button>
            ) : null}
            <button
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              disabled={acaoId === f.id}
              onClick={() => baixarPdf(f.id)}
            >
              PDF
            </button>
            <button
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              disabled={carregandoItens && itensFaturaId === f.id}
              onClick={() => carregarItens(f.id)}
            >
              Itens/IVA
            </button>
            {podeAlterar && f.estado === "RASC" ? (
              <button
                className="inline-flex items-center rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                disabled={acaoId === f.id}
                onClick={() => anular(f.id)}
              >
                Anular
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [
      acaoId,
      anular,
      baixarPdf,
      emitir,
      podeAlterar,
      carregarItens,
      carregandoItens,
      itensFaturaId,
      detalhar,
      totalAPagar,
    ]
  )

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
      <div className="space-y-6">
        <PageHeader
          title="Faturas"
          subtitle="Emissão, anulação e PDF via API (admin permanece como backoffice completo)."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {podeCriar ? (
                <Link
                  href="/invoices/new"
                  className="inline-flex items-center rounded-lg bg-[var(--primary-600)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)]"
                >
                  Nova fatura
                </Link>
              ) : null}
              {podeVerAdmin ? (
                <Link
                  href="/admin/billing/invoice/"
                  className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Abrir na Administração
                </Link>
              ) : null}
            </div>
          }
        />

        {erro && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        )}

        <Card
          title="Relatórios de faturamento por utilizador"
          subtitle="Gere PDF diário, mensal, trimestral, semestral e anual por utilizador; e diário, mensal, anual no modo geral."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Utilizador</label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={reportUserId}
                onChange={(e) => setReportUserId(e.target.value)}
                disabled={reportUsersLoading}
              >
                <option value="__all__">Todos os utilizadores</option>
                {reportUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Data (diário)</label>
              <input
                type="date"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Ano</label>
              <input
                type="number"
                min={2000}
                max={2100}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={reportYear}
                onChange={(e) => setReportYear(Number(e.target.value || new Date().getFullYear()))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Mês (mensal)</label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={reportMonth}
                onChange={(e) => setReportMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }).map((_, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {String(idx + 1).padStart(2, "0")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Trimestre</label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={reportQuarter}
                onChange={(e) => setReportQuarter(Number(e.target.value))}
              >
                <option value={1}>1º trimestre</option>
                <option value={2}>2º trimestre</option>
                <option value={3}>3º trimestre</option>
                <option value={4}>4º trimestre</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Semestre</label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={reportSemester}
                onChange={(e) => setReportSemester(Number(e.target.value))}
              >
                <option value={1}>1º semestre</option>
                <option value={2}>2º semestre</option>
              </select>
            </div>
          </div>

          {reportUsersError ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {reportUsersError}
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              Histórico por utilizador selecionado
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                disabled={reportLoading !== null}
                onClick={() => gerarHistoricoFaturamentoPdf("daily")}
              >
                {reportLoading === "daily" ? "Gerando..." : "Gerar histórico diário"}
              </button>
              <button
                className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                disabled={reportLoading !== null}
                onClick={() => gerarHistoricoFaturamentoPdf("monthly")}
              >
                {reportLoading === "monthly" ? "Gerando..." : "Gerar histórico mensal"}
              </button>
              <button
                className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                disabled={reportLoading !== null}
                onClick={() => gerarHistoricoFaturamentoPdf("quarterly")}
              >
                {reportLoading === "quarterly" ? "Gerando..." : "Gerar histórico trimestral"}
              </button>
              <button
                className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                disabled={reportLoading !== null}
                onClick={() => gerarHistoricoFaturamentoPdf("semiannual")}
              >
                {reportLoading === "semiannual" ? "Gerando..." : "Gerar histórico semestral"}
              </button>
              <button
                className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                disabled={reportLoading !== null}
                onClick={() => gerarHistoricoFaturamentoPdf("annual")}
              >
                {reportLoading === "annual" ? "Gerando..." : "Gerar histórico anual"}
              </button>
            </div>

            <div className="text-xs font-semibold uppercase text-muted-foreground">
              Histórico geral (todos utilizadores)
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center rounded-lg border border-[var(--primary-200)] px-3 py-2 text-xs font-semibold text-[var(--primary-700)] transition hover:bg-[var(--primary-50)] disabled:opacity-50"
                disabled={reportLoading !== null}
                onClick={() => gerarHistoricoFaturamentoPdf("daily", true)}
              >
                {reportLoading === "general-daily" ? "Gerando..." : "Gerar histórico geral diário"}
              </button>
              <button
                className="inline-flex items-center rounded-lg border border-[var(--primary-200)] px-3 py-2 text-xs font-semibold text-[var(--primary-700)] transition hover:bg-[var(--primary-50)] disabled:opacity-50"
                disabled={reportLoading !== null}
                onClick={() => gerarHistoricoFaturamentoPdf("monthly", true)}
              >
                {reportLoading === "general-monthly" ? "Gerando..." : "Gerar histórico geral mensal"}
              </button>
              <button
                className="inline-flex items-center rounded-lg border border-[var(--primary-200)] px-3 py-2 text-xs font-semibold text-[var(--primary-700)] transition hover:bg-[var(--primary-50)] disabled:opacity-50"
                disabled={reportLoading !== null}
                onClick={() => gerarHistoricoFaturamentoPdf("annual", true)}
              >
                {reportLoading === "general-annual" ? "Gerando..." : "Gerar histórico geral anual"}
              </button>
            </div>
          </div>
        </Card>

        {carregando ? (
          <div className="text-sm text-gray-500">Carregando faturas...</div>
        ) : (
          <div className="space-y-4">
            <Card
              title="Faturas por criar"
              subtitle="Rascunhos aguardando emissão."
            >
              {rascunhos.length === 0 ? (
                <div className="text-sm text-gray-500">Nenhum rascunho encontrado.</div>
              ) : (
                <div className="space-y-2">
                  {rascunhos.map((f) => (
                    <div
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm"
                    >
                      <div className="text-gray-700">
                        <div className="font-semibold">{f.id_custom || `Fatura ${f.id}`}</div>
                        <div className="text-xs text-gray-500">Paciente: {f.paciente || "-"}</div>
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
            </Card>

            <DataTable<FaturaRow> columns={columns as any} data={faturas} />
          </div>
        )}

        {selectedFatura ? (
          <Card
            title={`Detalhes da fatura ${selectedFatura.id_custom || selectedFatura.id}`}
            subtitle="Revisão e confirmação de pagamento"
            actions={
              temPagamentoPendente && selectedFatura.estado !== "PAGA" && podeAlterar ? (
                <button
                  className="inline-flex items-center rounded-lg border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                  disabled={acaoId === selectedFatura.id}
                  onClick={() => confirmarPagamento(selectedFatura.id)}
                >
                  Confirmar pagamento
                </button>
              ) : null
            }
          >
            <div className="grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Estado</div>
                <div className="text-foreground">{selectedFatura.estado || "-"}</div>
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
