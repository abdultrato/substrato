"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { BadgeCheck, FileText, Receipt, Wallet } from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import CatalogSearchSelect, { type CatalogOption } from "@/components/ui/CatalogSearchSelect"
import SelectInput from "@/components/ui/SelectInput"
import TextAreaInput from "@/components/ui/TextAreaInput"
import TextInput from "@/components/ui/TextInput"
import MoneyValue from "@/components/ui/MoneyValue"
import PdfActionLabel from "@/components/ui/PdfActionLabel"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { apiFetch } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"


type Row = Record<string, any>

type FaturaItem = {
  id: number
  descricao?: string
  quantidade?: string | number
  preco_unitario?: string | number
  aplica_iva?: boolean
  iva_percentual?: string | number
  total_com_iva?: string | number
  tipo_item?: string
  exame?: number | string | null
  exame_medico?: number | string | null
  procedimento_item?: number | string | null
  procedimento_material?: number | string | null
  item_venda?: number | string | null
}

const PAGAMENTO_METODOS = [
  { value: "DIN", label: "Dinheiro" },
  { value: "CAR", label: "Cartão" },
  { value: "TRF", label: "Transferência" },
  { value: "MOB", label: "Mobile Money" },
  { value: "POS", label: "POS" },
  { value: "SEG", label: "Seguro de saúde" },
  { value: "CHQ", label: "Cheque" },
  { value: "OUT", label: "Outro" },
] as const

type MetodoPagamento = (typeof PAGAMENTO_METODOS)[number]["value"]

const GLASS =
  "rounded-xl border-t border-r border-b border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-t-white/10 dark:border-r-white/10 dark:border-b-white/10 dark:bg-white/[0.04]"

const INVOICE_STATUS: Record<string, { label: string; accent: string; bar: string }> = {
  RASC: { label: "Rascunho", accent: "bg-amber-500", bar: "border-l-amber-500" },
  EMIT: { label: "Emitida",  accent: "bg-sky-500",   bar: "border-l-sky-500"   },
  PAGA: { label: "Paga",     accent: "bg-emerald-500", bar: "border-l-emerald-500" },
  CANC: { label: "Cancelada", accent: "bg-rose-500", bar: "border-l-rose-500"  },
}

function listFrom(res: any): any[] {
  if (res && (res as any).results) return (res as any).results
  return Array.isArray(res) ? res : []
}

function toNumberId(value: unknown): number | undefined {
  if (typeof value === "number") return value
  if (value === undefined || value === null || value === "") return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function parseMoneyToCents(value: unknown): number | null {
  if (value === undefined || value === null) return null
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100)

  const raw = String(value).trim()
  if (!raw) return null

  let normalized = raw.replace(/\s+/g, "").replace(/[^\d,.-]/g, "")
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".")
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".")
  }

  const partes = normalized.split(".")
  if (partes.length > 2) {
    normalized = `${partes.slice(0, -1).join("")}.${partes[partes.length - 1]}`
  }

  if (!normalized || normalized === "." || normalized === "-" || normalized === "-.") return null

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  return Math.round(parsed * 100)
}

function centsToMoney(cents: number): string {
  return (cents / 100).toFixed(2)
}

function invoiceOrigin(row?: Row | null): string {
  return String(row?.origin ?? row?.origem ?? row?.origem_fatura ?? "").trim()
}

function isProformaOrigin(row?: Row | null): boolean {
  const origin = invoiceOrigin(row)
  return origin.toUpperCase() === "PRO" || origin.toLowerCase().includes("proforma")
}

export default function FaturaRascunhoPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const idRaw = routeParamToString((params as any)?.id)
  const faturaId = Number(idRaw)
  const podeEditar = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO])
  const podePagar = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE])

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [fatura, setFatura] = useState<Row | null>(null)
  const [paciente, setPaciente] = useState<Row | null>(null)
  const [itens, setItens] = useState<FaturaItem[]>([])
  const [acaoId, setAcaoId] = useState<number | null>(null)
  const [notificacaoEnviando, setNotificacaoEnviando] = useState(false)
  const [addingItemKey, setAddingItemKey] = useState<string | null>(null)
  const addingItemRef = useRef(false)

  const [requisicoes, setRequisicoes] = useState<Row[]>([])
  const [requisicaoItens, setRequisicaoItens] = useState<Record<number, Row[]>>({})
  const [procedimentos, setProcedimentos] = useState<Row[]>([])
  const [procedimentoItens, setProcedimentoItens] = useState<Record<number, Row[]>>({})
  const [procedimentoMateriais, setProcedimentoMateriais] = useState<Record<number, Row[]>>({})
  const [vendas, setVendas] = useState<Row[]>([])
  const [vendaItens, setVendaItens] = useState<Record<number, Row[]>>({})
  const [cirurgias, setCirurgias] = useState<Row[]>([])
  const [consultas, setConsultas] = useState<Row[]>([])
  const [consultaQuery, setConsultaQuery] = useState("")
  const [consultasSelecionadas, setConsultasSelecionadas] = useState<Set<number>>(new Set())

  const [exames, setExames] = useState<Row[]>([])
  const [examesMedicos, setExamesMedicos] = useState<Row[]>([])
  const [produtos, setProdutos] = useState<Row[]>([])


  const [pagamentoMetodosSelecionados, setPagamentoMetodosSelecionados] = useState<MetodoPagamento[]>([])
  const [pagamentoValoresPorMetodo, setPagamentoValoresPorMetodo] = useState<Record<MetodoPagamento, string>>({
    DIN: "",
    CAR: "",
    TRF: "",
    MOB: "",
    POS: "",
    SEG: "",
    CHQ: "",
    OUT: "",
  })
  const [recibo, setRecibo] = useState<Row | null>(null)
  const [pagamentos, setPagamentos] = useState<Row[]>([])
  const [seguradoras, setSeguradoras] = useState<Row[]>([])
  const [planos, setPlanos] = useState<Row[]>([])
  const [pagamentoSeguradora, setPagamentoSeguradora] = useState("")
  const [pagamentoPlano, setPagamentoPlano] = useState("")
  const [numeroAutorizacao, setNumeroAutorizacao] = useState("")
  const [dadosSeguro, setDadosSeguro] = useState("")
  const pagamentoNomePadrao = useMemo(() => {
    if (!fatura) return "Pagamento"
    const codigo = fatura.id_custom || fatura.id
    return `Pagamento ${codigo}`
  }, [fatura])
  const metodosSelecionados = useMemo(
    () => PAGAMENTO_METODOS.filter((op) => pagamentoMetodosSelecionados.includes(op.value)),
    [pagamentoMetodosSelecionados]
  )
  const metodosLabelByValue = useMemo(() => {
    const map = new Map<MetodoPagamento, string>()
    PAGAMENTO_METODOS.forEach((m) => map.set(m.value, m.label))
    return map
  }, [])

  const faturaProforma = isProformaOrigin(fatura)
  const faturaRascunho = fatura?.estado === "RASC"
  const addItemButtonDisabled = !faturaRascunho || faturaProforma || !podeEditar || addingItemKey !== null
  const addItemButtonLabel = useCallback(
    (key: string) => (addingItemKey === key ? "Adicionando..." : "Adicionar"),
    [addingItemKey]
  )

  const exameById = useMemo(() => {
    const map = new Map<number, Row>()
    exames.forEach((e) => {
      if (typeof e.id === "number") map.set(e.id, e)
    })
    return map
  }, [exames])

  const exameMedById = useMemo(() => {
    const map = new Map<number, Row>()
    examesMedicos.forEach((e) => {
      if (typeof e.id === "number") map.set(e.id, e)
    })
    return map
  }, [examesMedicos])

  const produtoById = useMemo(() => {
    const map = new Map<number, Row>()
    produtos.forEach((p) => {
      if (typeof p.id === "number") map.set(p.id, p)
    })
    return map
  }, [produtos])

  const referenciaIds = useMemo(() => {
    const sets = {
      exames: new Set<number>(),
      examesMedicos: new Set<number>(),
      procedimentoItens: new Set<number>(),
      procedimentoMateriais: new Set<number>(),
      itensVenda: new Set<number>(),
    }

    itens.forEach((item) => {
      const exameId = toNumberId(item.exame)
      if (exameId) sets.exames.add(exameId)

      const exameMedId = toNumberId(item.exame_medico)
      if (exameMedId) sets.examesMedicos.add(exameMedId)

      const procItemId = toNumberId(item.procedimento_item)
      if (procItemId) sets.procedimentoItens.add(procItemId)

      const procMatId = toNumberId(item.procedimento_material)
      if (procMatId) sets.procedimentoMateriais.add(procMatId)

      const vendaItemId = toNumberId(item.item_venda)
      if (vendaItemId) sets.itensVenda.add(vendaItemId)
    })

    return sets
  }, [itens])

  const planosDisponiveis = useMemo(() => {
    const seguradoraId = toNumberId(pagamentoSeguradora)
    if (!seguradoraId) return []
    return planos.filter((pl) => {
      const seguroId = toNumberId((pl as any).seguradora)
      return seguroId === seguradoraId
    })
  }, [planos, pagamentoSeguradora])
  const totalAPagarFatura = useMemo(
    () => fatura?.total_a_pagar ?? fatura?.valor_a_pagar ?? fatura?.total,
    [fatura?.total_a_pagar, fatura?.valor_a_pagar, fatura?.total]
  )
  const totalFaturaCents = useMemo(() => parseMoneyToCents(totalAPagarFatura) || 0, [totalAPagarFatura])
  const totalInformadoCents = useMemo(
    () =>
      pagamentoMetodosSelecionados.reduce((acc, metodo) => {
        const cents = parseMoneyToCents(pagamentoValoresPorMetodo[metodo])
        return acc + (cents || 0)
      }, 0),
    [pagamentoMetodosSelecionados, pagamentoValoresPorMetodo]
  )
  const trocoPrevistoCents = Math.max(totalInformadoCents - totalFaturaCents, 0)
  const faltaPagamentoCents = Math.max(totalFaturaCents - totalInformadoCents, 0)
  const totalLiquidoPagamentoCents = totalInformadoCents - trocoPrevistoCents
  const faltamDadosSeguro = pagamentoMetodosSelecionados.includes("SEG")
    && (!pagamentoSeguradora || !numeroAutorizacao.trim())
  const podeConfirmarPagamentoComposto = pagamentoMetodosSelecionados.length > 0
    && pagamentoMetodosSelecionados.every((metodo) => {
      const cents = parseMoneyToCents(pagamentoValoresPorMetodo[metodo])
      return typeof cents === "number" && cents > 0
    })
    && totalLiquidoPagamentoCents === totalFaturaCents
    && !faltamDadosSeguro
  const podeEmitirFatura = faturaRascunho
    && podeEditar
    && !faturaProforma
    && itens.length > 0
    && addingItemKey === null
    && acaoId !== faturaId
  const motivoBloqueioEmissao = useMemo(() => {
    if (!faturaRascunho || !podeEditar) return ""
    if (faturaProforma) return "Fatura originada de proforma não deve ser emitida diretamente neste rascunho."
    if (addingItemKey !== null) return "Aguarde o item em gravação antes de emitir a fatura."
    if (itens.length === 0) return "Adicione pelo menos um item antes de emitir a fatura."
    return ""
  }, [addingItemKey, faturaProforma, faturaRascunho, itens.length, podeEditar])
  const mensagemValidacaoPagamento = useMemo(() => {
    if (fatura?.estado !== "EMIT" || !podePagar) return ""
    if (!pagamentoMetodosSelecionados.length) return "Selecione pelo menos um método de pagamento."
    const metodoInvalido = pagamentoMetodosSelecionados.find((metodo) => {
      const cents = parseMoneyToCents(pagamentoValoresPorMetodo[metodo])
      return typeof cents !== "number" || cents <= 0
    })
    if (metodoInvalido) {
      const label = metodosLabelByValue.get(metodoInvalido) || metodoInvalido
      return `Informe um valor válido para ${label}.`
    }
    if (faltaPagamentoCents > 0) {
      return `Total informado insuficiente. Ainda faltam ${centsToMoney(faltaPagamentoCents)}.`
    }
    if (totalLiquidoPagamentoCents !== totalFaturaCents) {
      return "O valor líquido do pagamento deve ser exatamente o total da fatura."
    }
    if (faltamDadosSeguro) return "Preencha a seguradora e o número de autorização do seguro."
    return ""
  }, [
    faltaPagamentoCents,
    faltamDadosSeguro,
    fatura?.estado,
    metodosLabelByValue,
    pagamentoMetodosSelecionados,
    pagamentoValoresPorMetodo,
    podePagar,
    totalFaturaCents,
    totalLiquidoPagamentoCents,
  ])

  const carregarItens = useCallback(async (fatId: number) => {
    try {
      const res = await apiFetch<any>(`/billing/invoiceitem/?fatura=${fatId}`, {
        clientCache: safeRefreshToken === 0,
      })
      const lista = listFrom(res)
      setItens(lista as FaturaItem[])
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar itens da fatura."))
      setItens([])
    }
  }, [safeRefreshToken])

  const carregarRecibo = useCallback(async (fatId: number) => {
    try {
      const res = await apiFetch<any>(`/payments/receipt/?fatura=${fatId}`, {
        clientCache: safeRefreshToken === 0,
      })
      const lista = listFrom(res)
      setRecibo(lista.length ? lista[0] : null)
    } catch {
      setRecibo(null)
    }
  }, [safeRefreshToken])

  const carregarPagamentos = useCallback(async (fatId: number) => {
    try {
      const res = await apiFetch<any>(`/payments/payment/?fatura=${fatId}&status=CON`, {
        clientCache: safeRefreshToken === 0,
      })
      setPagamentos(listFrom(res))
    } catch {
      setPagamentos([])
    }
  }, [safeRefreshToken])

  const carregarCatalogos = useCallback(async () => {
    try {
      const [exs, exsMed, prods] = await Promise.all([
        apiFetch<any>("/exams/", { clientCache: safeRefreshToken === 0 }),
        apiFetch<any>("/clinical/medicalexam/", { clientCache: safeRefreshToken === 0 }),
        apiFetch<any>("/pharmacy/product/", { clientCache: safeRefreshToken === 0 }),
      ])
      setExames(listFrom(exs))
      setExamesMedicos(listFrom(exsMed))
      setProdutos(listFrom(prods))
    } catch {
      // silencioso
    }
  }, [safeRefreshToken])

  const carregarSeguros = useCallback(async () => {
    try {
      const [segRes, planoRes] = await Promise.all([
        apiFetch<any>("/insurer/insurer/", { clientCache: safeRefreshToken === 0 }),
        apiFetch<any>("/insurer/coverage_plan/", { clientCache: safeRefreshToken === 0 }),
      ])
      setSeguradoras(listFrom(segRes))
      setPlanos(listFrom(planoRes))
    } catch {
      setSeguradoras([])
      setPlanos([])
    }
  }, [safeRefreshToken])

  const carregarRecursosPaciente = useCallback(async (pacienteId: number) => {
    try {
      const [reqRes, procRes, vendaRes, cirRes, consRes] = await Promise.all([
        apiFetch<any>(`/requests/?paciente=${pacienteId}`, { clientCache: safeRefreshToken === 0 }),
        apiFetch<any>(`/nursing/procedure/?paciente=${pacienteId}`, { clientCache: safeRefreshToken === 0 }),
        apiFetch<any>(`/pharmacy/sale/?paciente=${pacienteId}`, { clientCache: safeRefreshToken === 0 }),
        apiFetch<any>(`/surgery/surgery/?paciente=${pacienteId}`, { clientCache: safeRefreshToken === 0 }),
        apiFetch<any>(`/consultations/consultation/?paciente=${pacienteId}`, { clientCache: safeRefreshToken === 0 }),
      ])

      const reqs = listFrom(reqRes)
      const procs = listFrom(procRes)
      const vendasList = listFrom(vendaRes)
      const cirs = listFrom(cirRes)
      const cons = listFrom(consRes)

      setRequisicoes(reqs)
      setProcedimentos(procs)
      setVendas(vendasList)
      setCirurgias(cirs)
      setConsultas(cons)

      const reqItemsPairs = await Promise.all(
        reqs.map((r) => apiFetch<any>(`/clinical/labrequestitem/?requisicao=${r.id}`, { clientCache: safeRefreshToken === 0 }))
      )
      const reqMap: Record<number, Row[]> = {}
      reqs.forEach((r, idx) => {
        reqMap[r.id] = listFrom(reqItemsPairs[idx])
      })
      setRequisicaoItens(reqMap)

      const procItemPairs = await Promise.all(
        procs.map((p) => apiFetch<any>(`/nursing/procedure_item/?procedimento=${p.id}`, { clientCache: safeRefreshToken === 0 }))
      )
      const procMatPairs = await Promise.all(
        procs.map((p) => apiFetch<any>(`/nursing/procedure_material/?procedimento=${p.id}`, { clientCache: safeRefreshToken === 0 }))
      )
      const procItemMap: Record<number, Row[]> = {}
      const procMatMap: Record<number, Row[]> = {}
      procs.forEach((p, idx) => {
        procItemMap[p.id] = listFrom(procItemPairs[idx])
        procMatMap[p.id] = listFrom(procMatPairs[idx])
      })
      setProcedimentoItens(procItemMap)
      setProcedimentoMateriais(procMatMap)

      const vendaItemPairs = await Promise.all(
        vendasList.map((v) => apiFetch<any>(`/pharmacy/sale_item/?venda=${v.id}`, { clientCache: safeRefreshToken === 0 }))
      )
      const vendaMap: Record<number, Row[]> = {}
      vendasList.forEach((v, idx) => {
        vendaMap[v.id] = listFrom(vendaItemPairs[idx])
      })
      setVendaItens(vendaMap)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar itens do paciente."))
    }
  }, [safeRefreshToken])

  useEffect(() => {
    if (!podePagar) return
    carregarSeguros()
  }, [carregarSeguros, podePagar])

  useEffect(() => {
    if (!pagamentoMetodosSelecionados.includes("SEG")) {
      setPagamentoSeguradora("")
      setPagamentoPlano("")
      setNumeroAutorizacao("")
      setDadosSeguro("")
    }
  }, [pagamentoMetodosSelecionados])

  const carregarFatura = useCallback(async () => {
    if (!faturaId || Number.isNaN(faturaId)) return
    setLoading(true)
    setErro(null)
    try {
      const fat = await apiFetch<any>(`/invoices/${faturaId}/`, { clientCache: safeRefreshToken === 0 })
      setFatura(fat)

      if (fat?.paciente) {
        const pac = await apiFetch<any>(`/clinical/patients/${fat.paciente}/`, { clientCache: safeRefreshToken === 0 })
        setPaciente(pac)
        if (podeEditar) {
          await carregarRecursosPaciente(fat.paciente)
        }
      } else {
        setPaciente(null)
      }

      await carregarItens(faturaId)
      await carregarRecibo(faturaId)
      await carregarPagamentos(faturaId)
      if (podeEditar) {
        await carregarCatalogos()
      }

    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar fatura."))
    } finally {
      setLoading(false)
    }
  }, [
    carregarCatalogos,
    carregarItens,
    carregarRecibo,
    carregarPagamentos,
    carregarRecursosPaciente,
    faturaId,
    podeEditar,
    safeRefreshToken,
  ])

  useEffect(() => {
    carregarFatura()
  }, [carregarFatura])

  const adicionarItem = useCallback(async (payload: any, actionKey = "item") => {
    if (addingItemRef.current) return
    if (!faturaId || Number.isNaN(faturaId)) return
    if (!podeEditar) {
      setErro("Sem permissão para adicionar itens.")
      return
    }
    if (!faturaRascunho) {
      setErro("Somente rascunhos podem receber itens.")
      return
    }
    if (faturaProforma) {
      setErro("Itens de fatura proforma devem ser alterados na proforma de origem.")
      return
    }
    addingItemRef.current = true
    setAddingItemKey(actionKey)
    try {
      setErro(null)
      setFeedback(null)
      await apiFetch("/billing/invoiceitem/", {
        method: "POST",
        body: JSON.stringify({ ...payload, fatura: faturaId }),
      })
      await carregarItens(faturaId)
      const fat = await apiFetch<any>(`/invoices/${faturaId}/`)
      setFatura(fat)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao adicionar item."))
    } finally {
      addingItemRef.current = false
      setAddingItemKey(null)
    }
  }, [carregarItens, faturaId, faturaProforma, faturaRascunho, podeEditar])

  const removerItem = useCallback(async (itemId: number) => {
    if (!podeEditar) {
      setErro("Sem permissão para remover itens.")
      return
    }
    if (!faturaRascunho) {
      setErro("Somente rascunhos podem ser alterados.")
      return
    }
    if (faturaProforma) {
      setErro("Itens de fatura proforma devem ser alterados na proforma de origem.")
      return
    }
    try {
      setErro(null)
      await apiFetch(`/billing/invoiceitem/${itemId}/`, { method: "DELETE" })
      if (faturaId) await carregarItens(faturaId)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao remover item."))
    }
  }, [carregarItens, faturaId, faturaProforma, faturaRascunho, podeEditar])

  const toggleIva = useCallback(async (item: FaturaItem) => {
    if (!item?.id) return
    if (!podeEditar) {
      setErro("Sem permissão para alterar IVA.")
      return
    }
    if (faturaProforma) {
      setErro("IVA de fatura proforma deve seguir a proforma de origem.")
      return
    }
    try {
      await apiFetch(`/billing/invoiceitem/${item.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ aplica_iva: !item.aplica_iva }),
      })
      if (faturaId) await carregarItens(faturaId)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao atualizar IVA do item."))
    }
  }, [carregarItens, faturaId, faturaProforma, podeEditar])

  const issueInvoiceAction = useCallback(async () => {
    if (!faturaId) return
    if (acaoId === faturaId) return
    if (!podeEditar) {
      setErro("Sem permissão para emitir fatura.")
      return
    }
    if (!faturaRascunho) {
      setErro("Somente faturas em rascunho podem ser emitidas.")
      return
    }
    if (faturaProforma) {
      setErro("Fatura originada de proforma deve seguir o fluxo de proforma, não a emissão direta do rascunho.")
      return
    }
    if (addingItemRef.current || addingItemKey !== null) {
      setErro("Aguarde o item em gravação antes de emitir a fatura.")
      return
    }
    if (itens.length === 0) {
      setErro("Adicione pelo menos um item antes de emitir a fatura.")
      return
    }
    try {
      setAcaoId(faturaId)
      setErro(null)
      setFeedback(null)
      await apiFetch(`/invoices/${faturaId}/issue/`, { method: "POST" })
      await carregarFatura()
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao emitir fatura."))
    } finally {
      setAcaoId(null)
    }
  }, [acaoId, addingItemKey, carregarFatura, faturaId, faturaProforma, faturaRascunho, itens.length, podeEditar])

  const alternarMetodoPagamento = useCallback((metodo: MetodoPagamento, checked: boolean) => {
    setPagamentoMetodosSelecionados((prev) => {
      if (checked) {
        if (prev.includes(metodo)) return prev
        return [...prev, metodo]
      }
      return prev.filter((m) => m !== metodo)
    })

    if (!checked) {
      setPagamentoValoresPorMetodo((prev) => ({ ...prev, [metodo]: "" }))
    }
  }, [])

  const definirValorMetodoPagamento = useCallback((metodo: MetodoPagamento, valor: string) => {
    setPagamentoValoresPorMetodo((prev) => ({ ...prev, [metodo]: valor }))
  }, [])

  const pagarFatura = useCallback(async () => {
    if (!faturaId) return
    if (!podePagar) {
      setErro("Sem permissão para registrar pagamento.")
      return
    }
    if (!pagamentoMetodosSelecionados.length) {
      setErro("Selecione pelo menos um método de pagamento.")
      return
    }

    const lancamentos = pagamentoMetodosSelecionados.map((metodo) => {
      const cents = parseMoneyToCents(pagamentoValoresPorMetodo[metodo])
      return { metodo, cents: typeof cents === "number" ? cents : 0 }
    })

    const metodoInvalido = lancamentos.find((entry) => entry.cents <= 0)
    if (metodoInvalido) {
      const label = metodosLabelByValue.get(metodoInvalido.metodo) || metodoInvalido.metodo
      setErro(`Informe um valor válido para ${label}.`)
      return
    }

    const somaCents = lancamentos.reduce((acc, entry) => acc + entry.cents, 0)
    if (somaCents < totalFaturaCents) {
      const faltante = totalFaturaCents - somaCents
      setErro(`Total informado insuficiente. Ainda faltam ${centsToMoney(faltante)}.`)
      return
    }
    const trocoTotalCents = somaCents - totalFaturaCents
    const totalLiquidoCents = somaCents - trocoTotalCents
    const trocoPorMetodo: Partial<Record<MetodoPagamento, number>> = {}
    let trocoRestanteCents = trocoTotalCents

    const lancamentosComPrioridadeTroco = [...lancamentos].sort((a, b) => {
      const prioridadeA = a.metodo === "DIN" ? 0 : 1
      const prioridadeB = b.metodo === "DIN" ? 0 : 1
      return prioridadeA - prioridadeB
    })

    for (const entry of lancamentosComPrioridadeTroco) {
      if (trocoRestanteCents <= 0) break
      const trocoMetodoCents = Math.min(entry.cents, trocoRestanteCents)
      if (trocoMetodoCents <= 0) continue
      trocoPorMetodo[entry.metodo] = (trocoPorMetodo[entry.metodo] || 0) + trocoMetodoCents
      trocoRestanteCents -= trocoMetodoCents
    }

    if (trocoRestanteCents > 0) {
      setErro("Não foi possível distribuir o troco entre os métodos informados.")
      return
    }
    if (totalLiquidoCents !== totalFaturaCents) {
      setErro("O valor líquido do pagamento deve ser exatamente o total da fatura.")
      return
    }

    if (pagamentoMetodosSelecionados.includes("SEG")) {
      if (!pagamentoSeguradora) {
        setErro("Selecione a seguradora do seguro de saúde.")
        return
      }
      if (!numeroAutorizacao.trim()) {
        setErro("Informe o número de autorização do seguro.")
        return
      }
    }
    try {
      setAcaoId(faturaId)
      setErro(null)
      setFeedback(null)

      for (const entry of lancamentos) {
        const trocoMetodoCents = trocoPorMetodo[entry.metodo] || 0
        const payload: Record<string, unknown> = {
          fatura: faturaId,
          nome: `${pagamentoNomePadrao} · ${metodosLabelByValue.get(entry.metodo) || entry.metodo}`,
          valor: centsToMoney(entry.cents),
          metodo: entry.metodo,
          status: "CON",
        }
        if (trocoMetodoCents > 0) {
          payload.troco = centsToMoney(trocoMetodoCents)
        }
        if (entry.metodo === "SEG") {
          const seguradoraId = toNumberId(pagamentoSeguradora)
          if (seguradoraId) payload.seguradora = seguradoraId
          const planoId = toNumberId(pagamentoPlano)
          if (planoId) payload.plano_cobertura = planoId
          payload.numero_autorizacao = numeroAutorizacao.trim()
          if (dadosSeguro.trim()) {
            payload.dados_seguro = { observacoes: dadosSeguro.trim() }
          }
        }
        await apiFetch("/payments/payment/", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }

      await carregarFatura()
      await carregarRecibo(faturaId)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao registrar pagamento."))
    } finally {
      setAcaoId(null)
    }
  }, [
    carregarFatura,
    carregarRecibo,
    dadosSeguro,
    faturaId,
    metodosLabelByValue,
    numeroAutorizacao,
    pagamentoMetodosSelecionados,
    pagamentoNomePadrao,
    pagamentoPlano,
    pagamentoSeguradora,
    pagamentoValoresPorMetodo,
    podePagar,
    totalFaturaCents,
  ])

  const downloadInvoicePdf = useCallback(async () => {
    if (!faturaId) return
    try {
      const blob = await apiFetch<Blob>(`/invoices/${faturaId}/pdf/`, {
        method: "GET",
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fatura_${faturaId}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar PDF da fatura."))
    }
  }, [faturaId])

  const downloadReceiptPdf = useCallback(async () => {
    if (!recibo?.id) return
    try {
      const blob = await apiFetch<Blob>(`/payments/receipt/${recibo.id}/pdf/`, {
        method: "GET",
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `recibo_${recibo.id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar PDF do recibo."))
    }
  }, [recibo])

  const sendInvoiceNotification = useCallback(async () => {
    if (!faturaId) return
    try {
      setNotificacaoEnviando(true)
      setErro(null)
      setFeedback(null)
      await apiFetch(`/invoices/${faturaId}/send-notification/`, {
        method: "POST",
        body: JSON.stringify({ channels: ["email", "whatsapp"] }),
      })
      setFeedback("Notificação de fatura processada para email e WhatsApp disponíveis.")
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao enviar notificação da fatura."))
    } finally {
      setNotificacaoEnviando(false)
    }
  }, [faturaId])

  const precoHint = useCallback((...valores: unknown[]): string | undefined => {
    for (const valor of valores) {
      if (valor === undefined || valor === null || valor === "") continue
      const numero = Number(valor)
      if (!Number.isNaN(numero)) return numero.toLocaleString()
    }
    return undefined
  }, [])

  const buscarExames = useCallback(async (q: string): Promise<CatalogOption[]> => {
    const res = await apiFetch<any>(`/exams/?search=${encodeURIComponent(q)}`)
    return listFrom(res).map((e) => ({
      key: e.id,
      label: e.nome || e.id_custom || `Exame ${e.id}`,
      hint: precoHint(e.preco, e.preco_unitario, e.price),
      raw: e,
    }))
  }, [precoHint])

  const buscarExamesMedicos = useCallback(async (q: string): Promise<CatalogOption[]> => {
    const res = await apiFetch<any>(`/clinical/medicalexam/?search=${encodeURIComponent(q)}`)
    return listFrom(res).map((e) => ({
      key: e.id,
      label: e.nome || e.id_custom || `Exame ${e.id}`,
      hint: precoHint(e.preco, e.preco_unitario, e.price),
      raw: e,
    }))
  }, [precoHint])

  const buscarProcedimentosCatalogo = useCallback(async (q: string): Promise<CatalogOption[]> => {
    const res = await apiFetch<any>(`/nursing/procedure_catalog/?search=${encodeURIComponent(q)}`)
    return listFrom(res).map((p) => ({
      key: p.id,
      label: p.nome || p.id_custom || `Procedimento ${p.id}`,
      hint: precoHint(p.preco_padrao, p.preco),
      raw: p,
    }))
  }, [precoHint])

  const buscarProcedimentosCirurgicos = useCallback(async (q: string): Promise<CatalogOption[]> => {
    const res = await apiFetch<any>(`/surgery/surgical_procedure/?search=${encodeURIComponent(q)}`)
    return listFrom(res).map((p) => ({
      key: p.id,
      label: p.nome || p.id_custom || `Cirurgia ${p.id}`,
      hint: precoHint(p.preco_base, p.preco),
      raw: p,
    }))
  }, [precoHint])

  const buscarProdutos = useCallback(async (q: string): Promise<CatalogOption[]> => {
    const res = await apiFetch<any>(`/pharmacy/product/?search=${encodeURIComponent(q)}`)
    return listFrom(res).map((p) => ({
      key: p.id,
      label: p.nome || p.id_custom || `Produto ${p.id}`,
      hint: precoHint(p.preco_venda, p.preco),
      raw: p,
    }))
  }, [precoHint])

  const buscarEmpresas = useCallback(async (q: string): Promise<CatalogOption[]> => {
    const res = await apiFetch<any>(`/companies/?search=${encodeURIComponent(q)}`)
    return listFrom(res).map((c) => ({
      key: c.id,
      label: c.nome || c.name || c.id_custom || `Entidade ${c.id}`,
      hint: c.nuit ? `NUIT: ${c.nuit}` : undefined,
      raw: c,
    }))
  }, [])

  const definirClienteFiscal = useCallback(async (companyId: number | null) => {
    if (!faturaId || !faturaRascunho) return
    try {
      setErro(null)
      const body = companyId
        ? { fiscal_client: companyId }
        : { fiscal_client: null, fiscal_client_name: "", fiscal_client_nuit: "", fiscal_client_address: "" }
      await apiFetch(`/invoices/${faturaId}/`, { method: "PATCH", body: JSON.stringify(body) })
      await carregarFatura()
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao definir cliente fiscal."))
    }
  }, [carregarFatura, faturaId, faturaRascunho])

  const itensCols = useMemo(
    () => [
      { header: "Descrição", render: (i: FaturaItem) => i.descricao || `Item ${i.id}` },
      { header: "Qtd", render: (i: FaturaItem) => i.quantidade || 1 },
      { header: "Preço", render: (i: FaturaItem) => <MoneyValue value={i.preco_unitario} /> },
      { header: "Total", render: (i: FaturaItem) => <MoneyValue value={i.total_com_iva} /> },
      {
        header: "IVA",
        render: (i: FaturaItem) => (
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={!!i.aplica_iva}
              onChange={() => toggleIva(i)}
              disabled={!faturaRascunho || !podeEditar}
              className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
            />
            {i.iva_percentual ?? "-"}%
          </label>
        ),
      },
      {
        header: "Ações",
        render: (i: FaturaItem) => (
          <ConfirmDialog
            title="Remover item"
            message="Este item será removido da fatura em rascunho."
            confirmText="Remover"
            onConfirm={() => removerItem(i.id)}
            disabled={!faturaRascunho || !podeEditar}
          >
            <button
              type="button"
              className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
              disabled={!faturaRascunho || !podeEditar}
            >
              Remover
            </button>
          </ConfirmDialog>
        ),
      },
    ],
    [faturaRascunho, removerItem, toggleIva, podeEditar]
  )

  if (loading) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE]}>
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </AppLayout>
    )
  }

  if (!fatura) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE]}>
        <div className="text-sm text-muted-foreground">Fatura não encontrada.</div>
      </AppLayout>
    )
  }

  const estadoInfo = INVOICE_STATUS[String(fatura.estado || "").toUpperCase()] ?? INVOICE_STATUS.RASC

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE]}>
      <div className="space-y-2">

        {/* ── Hero ── */}
        <section className={`relative overflow-hidden ${GLASS} border-l-4 ${estadoInfo.bar}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 pl-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${estadoInfo.accent} text-white shadow-md`}>
                <Receipt size={17} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">
                  Fatura {fatura.id_custom || fatura.id}
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  {paciente ? `${paciente.nome || "Paciente"} · ${paciente.id_custom || paciente.id}` : "Sem paciente"}
                  {" · "}<span className="font-semibold">{estadoInfo.label}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                onClick={downloadInvoicePdf}
              >
                <PdfActionLabel>PDF da fatura</PdfActionLabel>
              </button>
              {recibo ? (
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                  onClick={downloadReceiptPdf}
                >
                  <PdfActionLabel>PDF do recibo</PdfActionLabel>
                </button>
              ) : null}
              {fatura.estado === "PAGA" ? (
                <button
                  className="inline-flex items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300 disabled:opacity-50"
                  onClick={sendInvoiceNotification}
                  disabled={notificacaoEnviando}
                >
                  {notificacaoEnviando ? "Notificando..." : "Enviar notificação"}
                </button>
              ) : null}
              {faturaRascunho && podeEditar ? (
                <button
                  className={`inline-flex items-center rounded-lg ${estadoInfo.accent} px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50`}
                  onClick={issueInvoiceAction}
                  disabled={!podeEmitirFatura}
                >
                  {acaoId === fatura.id ? "Emitindo..." : "Emitir fatura"}
                </button>
              ) : null}
              <button
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/20 dark:border-white/10"
                onClick={() => router.push("/invoices")}
              >
                Voltar
              </button>
            </div>
          </div>
        </section>

        {/* ── Métricas ── */}
        <div className="flex flex-wrap gap-2 md:flex-nowrap [&>*]:flex-1 [&>*]:min-w-[130px]">
          {[
            { icon: FileText, label: "Subtotal", value: <MoneyValue value={fatura.subtotal} />, accent: "bg-slate-500" },
            { icon: Wallet,   label: "IVA",      value: <MoneyValue value={fatura.iva_valor} />, accent: "bg-violet-500" },
            { icon: BadgeCheck, label: "Total a pagar", value: <MoneyValue value={totalAPagarFatura} />, accent: estadoInfo.accent },
          ].map(({ icon: Icon, label, value, accent }) => (
            <section key={label} className={`relative overflow-hidden ${GLASS} border-l-4 ${accent.replace("bg-", "border-l-")}`}>
              <div className="flex items-center gap-2.5 px-3 py-2 pl-4">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent} text-white shadow-sm`}>
                  <Icon size={13} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                  <p className="font-display text-lg font-bold leading-tight text-foreground tabular-nums">{value}</p>
                </div>
              </div>
            </section>
          ))}
        </div>

        {motivoBloqueioEmissao ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
            {motivoBloqueioEmissao}
          </div>
        ) : null}

        {erro ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        {feedback ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {feedback}
          </div>
        ) : null}

        {/* ── Row: Cliente fiscal (25%) + Itens da fatura (25%) + Registrar pagamento (50%) ── */}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">

        {/* Cliente fiscal — 25% */}
        <section className={`${GLASS} border-l-4 border-l-teal-500 lg:col-span-1`}>
          <div className="px-4 py-3 space-y-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente fiscal</p>
              <p className="text-[11px] text-muted-foreground">Quem paga (pode ser empresa, seguradora, escola, ONG ou hospital). Por omissão, o paciente.</p>
            </div>
            <div className="text-sm text-foreground">
              <span className="font-semibold">Atual:</span>{" "}
              {fatura?.fiscal_client_name
                ? `${fatura.fiscal_client_name}${fatura.fiscal_client_nuit ? ` · NUIT: ${fatura.fiscal_client_nuit}` : ""}`
                : `Paciente${paciente?.nome || paciente?.name ? ` (${paciente?.nome || paciente?.name})` : ""}`}
            </div>
            {faturaRascunho && podeEditar ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[16rem] flex-1">
                  <CatalogSearchSelect
                    placeholder="Pesquisar entidade (empresa/seguradora/escola/ONG/hospital)"
                    fetcher={buscarEmpresas}
                    onSelect={(opt) => definirClienteFiscal(Number(opt.raw.id))}
                  />
                </div>
                {fatura?.fiscal_client_name ? (
                  <button
                    type="button"
                    onClick={() => definirClienteFiscal(null)}
                    className="inline-flex items-center rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
                  >
                    Repor paciente
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">O cliente fiscal só pode ser alterado enquanto a fatura estiver em rascunho.</div>
            )}
          </div>
        </section>

        {/* Itens da fatura — 25% */}
        <section className={`${GLASS} border-l-4 border-l-sky-500 lg:col-span-1`}>
          <div className="px-4 py-3 space-y-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Itens da fatura</p>
              <p className="text-[11px] text-muted-foreground">Adicione itens enquanto estiver em rascunho.</p>
            </div>
            {!podeEditar ? (
              <div className="text-xs text-muted-foreground">Somente leitura para este perfil.</div>
            ) : null}
            {itens.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum item adicionado.</div>
            ) : (
              <DataTable<FaturaItem> columns={itensCols as any} data={itens} />
            )}
          </div>
        </section>

        {/* Registrar pagamento — 50% */}
        <section className={`${GLASS} border-l-4 lg:col-span-2 ${fatura.estado === "PAGA" ? "border-l-emerald-500" : "border-l-violet-500"}`}>
          <div className="px-4 py-3 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {fatura.estado === "PAGA" ? "Fatura paga" : "Registrar pagamento"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {fatura.estado === "PAGA" ? "Imprima a fatura e o recibo." : "Disponível após emissão da fatura."}
              </p>
            </div>
          {fatura.estado === "PAGA" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                Fatura totalmente quitada.
              </div>

              {pagamentos.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Pagamentos</div>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="min-w-full text-sm">
                      <tbody className="divide-y divide-border">
                        {pagamentos.map((p) => (
                          <tr key={p.id}>
                            <td className="px-3 py-2 text-foreground">
                              {metodosLabelByValue.get((p.metodo ?? p.method) as MetodoPagamento) || p.metodo || p.method || "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-foreground">
                              <MoneyValue value={p.valor ?? p.value} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-600)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)]"
                  onClick={downloadInvoicePdf}
                >
                  <PdfActionLabel>Imprimir fatura</PdfActionLabel>
                </button>
                {recibo ? (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    onClick={downloadReceiptPdf}
                  >
                    <PdfActionLabel>Imprimir recibo</PdfActionLabel>
                  </button>
                ) : (
                  <span className="self-center text-xs text-muted-foreground">Recibo a ser gerado.</span>
                )}
              </div>
            </div>
          ) : (
            <>
            {fatura.estado !== "EMIT" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
                Emita a fatura para liberar o pagamento.
              </div>
            ) : !podePagar ? (
              <div className="text-sm text-muted-foreground">Sem permissão para registrar pagamento.</div>
            ) : null}
            {fatura.estado === "EMIT" && podePagar ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Tipos de pagamento</label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {PAGAMENTO_METODOS.map((metodo) => (
                      <label
                        key={metodo.value}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={pagamentoMetodosSelecionados.includes(metodo.value)}
                          onChange={(e) => alternarMetodoPagamento(metodo.value, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-2 focus:ring-slate-400"
                        />
                        {metodo.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Informe manualmente o valor por método. Se ultrapassar o total da fatura, o excedente será registrado como troco.
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {metodosSelecionados.map((metodo) => (
                    <div key={metodo.value}>
                      <label className="text-xs font-semibold text-muted-foreground">{metodo.label} · Valor</label>
                      <TextInput
                        value={pagamentoValoresPorMetodo[metodo.value]}
                        onChange={(e) => definirValorMetodoPagamento(metodo.value, e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 rounded-lg border border-white/20 bg-white/30 p-3 text-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06] md:grid-cols-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Total a pagar (com IVA)</div>
                    <div className="font-semibold text-foreground"><MoneyValue value={totalAPagarFatura} /></div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total informado</div>
                    <div className="font-semibold text-foreground"><MoneyValue value={totalInformadoCents / 100} /></div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Troco previsto</div>
                    <div className={`font-semibold ${trocoPrevistoCents > 0 ? "text-amber-700" : "text-gray-900"}`}>
                      <MoneyValue value={trocoPrevistoCents / 100} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Valor líquido</div>
                    <div className={`font-semibold ${faltaPagamentoCents === 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      <MoneyValue value={totalLiquidoPagamentoCents / 100} />
                    </div>
                  </div>
                </div>
                {faltaPagamentoCents > 0 ? (
                  <div className="text-xs text-rose-700">
                    Faltam <MoneyValue value={faltaPagamentoCents / 100} /> para quitar a fatura.
                  </div>
                ) : null}

                <div className="flex items-end">
                  <button
                    className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    onClick={pagarFatura}
                    disabled={acaoId === fatura.id || !podeConfirmarPagamentoComposto}
                  >
                    {acaoId === fatura.id ? "Registrando..." : "Confirmar pagamento"}
                  </button>
                </div>
                {mensagemValidacaoPagamento ? (
                  <div className="text-xs text-amber-700">{mensagemValidacaoPagamento}</div>
                ) : null}
              </div>
              {pagamentoMetodosSelecionados.includes("SEG") ? (
                <>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Seguradora</label>
                      <SelectInput
                        value={pagamentoSeguradora}
                        onChange={(e) => setPagamentoSeguradora(e.target.value)}
                        options={seguradoras.map((s) => ({
                          value: String(s.id),
                          label: s.nome || s.id_custom || `Seguradora ${s.id}`,
                        }))}
                        placeholder="Selecione"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Plano de cobertura</label>
                      <SelectInput
                        value={pagamentoPlano}
                        onChange={(e) => setPagamentoPlano(e.target.value)}
                        options={planosDisponiveis.map((p) => ({
                          value: String(p.id),
                          label: p.nome || p.id_custom || `Plano ${p.id}`,
                        }))}
                        placeholder="Selecione (opcional)"
                        disabled={!planosDisponiveis.length}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Número de autorização</label>
                      <TextInput
                        value={numeroAutorizacao}
                        onChange={(e) => setNumeroAutorizacao(e.target.value)}
                        placeholder="Autorização"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-xs font-semibold text-muted-foreground">Dados adicionais do seguro</label>
                    <TextAreaInput
                      value={dadosSeguro}
                      onChange={(e) => setDadosSeguro(e.target.value)}
                      placeholder="Ex.: apólice, beneficiário, observações"
                      rows={3}
                    />
                  </div>
                </>
              ) : null}
            </>) : null}
            </>
          )}
          </div>
        </section>

        </div>{/* fim grid 4-col */}

        {/* ── Row: Itens do paciente (50%) + Pesquisa de catálogo (50%) ── */}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:items-start">

        {/* ── Itens do paciente ── */}
        <div className={`${GLASS} border-l-4 border-l-amber-500 flex flex-col gap-0`}>
          <div className="border-b border-white/20 px-4 py-2.5 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Itens do paciente</p>
            <p className="text-[11px] text-muted-foreground">Requisições, procedimentos, vendas, cirurgias e consultas do paciente.</p>
          </div>
          {!podeEditar ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">Sem permissão para adicionar itens do paciente.</div>
          ) : (
          <div className="flex flex-col divide-y divide-white/20 dark:divide-white/10">

            {/* Requisições */}
            <details open className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 select-none">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400 text-[10px] font-bold">R</span>
                <span className="text-xs font-semibold text-foreground flex-1">Requisições (exames)</span>
                <span className="text-[10px] text-muted-foreground">{requisicoes.length === 0 ? "—" : `${requisicoes.length}`}</span>
              </summary>
              <div className="px-4 pb-3 space-y-1.5">
                {requisicoes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem requisições para este paciente.</p>
                ) : requisicoes.map((r) => {
                  const availableItems = (requisicaoItens[r.id] || []).filter((it) => {
                    const exameId = toNumberId(it.exame)
                    if (exameId && referenciaIds.exames.has(exameId)) return false
                    const exameMedId = toNumberId(it.exame_medico)
                    if (exameMedId && referenciaIds.examesMedicos.has(exameMedId)) return false
                    return true
                  })
                  if (availableItems.length === 0) return null
                  return (
                    <div key={r.id} className="rounded-lg border border-white/20 bg-white/30 px-3 py-2 dark:border-white/10 dark:bg-white/[0.05]">
                      <p className="text-[11px] font-semibold text-foreground mb-1">{r.id_custom || `REQ ${r.id}`} <span className="font-normal text-muted-foreground">· {r.tipo || "-"}</span></p>
                      {availableItems.map((it) => {
                        const exame = it.exame ? exameById.get(it.exame) : null
                        const exameMed = it.exame_medico ? exameMedById.get(it.exame_medico) : null
                        const label = exame?.nome || exameMed?.nome || (it.exame ? `Exame ${it.exame}` : `Exame médico ${it.exame_medico}`)
                        const addKey = it.exame ? `req-exam-${it.id}` : `req-medical-exam-${it.id}`
                        return (
                          <div key={it.id} className="flex items-center justify-between gap-2 py-0.5">
                            <span className="text-xs text-foreground">{label}</span>
                            <button className="shrink-0 inline-flex items-center rounded-md border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-700/40 dark:text-emerald-400"
                              onClick={() => it.exame ? adicionarItem({ tipo_item: "EXA", exame: it.exame }, addKey) : adicionarItem({ tipo_item: "EXM", exame_medico: it.exame_medico }, addKey)}
                              disabled={addItemButtonDisabled}
                            >{addItemButtonLabel(addKey)}</button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </details>

            {/* Procedimentos */}
            <details open className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 select-none">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400 text-[10px] font-bold">P</span>
                <span className="text-xs font-semibold text-foreground flex-1">Procedimentos (enfermagem)</span>
                <span className="text-[10px] text-muted-foreground">{procedimentos.length === 0 ? "—" : `${procedimentos.length}`}</span>
              </summary>
              <div className="px-4 pb-3 space-y-1.5">
                {procedimentos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem procedimentos.</p>
                ) : procedimentos.map((p) => {
                  const itensDisp = (procedimentoItens[p.id] || []).filter((it) => { const id = toNumberId(it.id); return !(id && referenciaIds.procedimentoItens.has(id)) })
                  const matsDisp  = (procedimentoMateriais[p.id] || []).filter((mat) => { const id = toNumberId(mat.id); return !(id && referenciaIds.procedimentoMateriais.has(id)) })
                  if (itensDisp.length === 0 && matsDisp.length === 0) return null
                  return (
                    <div key={p.id} className="rounded-lg border border-white/20 bg-white/30 px-3 py-2 dark:border-white/10 dark:bg-white/[0.05]">
                      <p className="text-[11px] font-semibold text-foreground mb-1">{p.id_custom || `PROC ${p.id}`} <span className="font-normal text-muted-foreground">· <MoneyValue value={p.total} /></span></p>
                      {itensDisp.map((it) => (
                        <div key={it.id} className="flex items-center justify-between gap-2 py-0.5">
                          <span className="text-xs text-foreground">{it.descricao || `Serviço ${it.id}`}</span>
                          <button className="shrink-0 inline-flex items-center rounded-md border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-700/40 dark:text-emerald-400"
                            onClick={() => adicionarItem({ tipo_item: "PRC", procedimento_item: it.id }, `procedure-item-${it.id}`)} disabled={addItemButtonDisabled}
                          >{addItemButtonLabel(`procedure-item-${it.id}`)}</button>
                        </div>
                      ))}
                      {matsDisp.map((mat) => {
                        const prod = produtoById.get(mat.produto)
                        return (
                          <div key={mat.id} className="flex items-center justify-between gap-2 py-0.5">
                            <span className="text-xs text-foreground">{prod?.nome || `Material ${mat.produto}`}</span>
                            <button className="shrink-0 inline-flex items-center rounded-md border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-700/40 dark:text-emerald-400"
                              onClick={() => adicionarItem({ tipo_item: "MAT", procedimento_material: mat.id }, `procedure-material-${mat.id}`)} disabled={addItemButtonDisabled}
                            >{addItemButtonLabel(`procedure-material-${mat.id}`)}</button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </details>

            {/* Vendas farmácia */}
            <details open className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 select-none">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400 text-[10px] font-bold">F</span>
                <span className="text-xs font-semibold text-foreground flex-1">Vendas (farmácia)</span>
                <span className="text-[10px] text-muted-foreground">{vendas.length === 0 ? "—" : `${vendas.length}`}</span>
              </summary>
              <div className="px-4 pb-3 space-y-1.5">
                {vendas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem vendas.</p>
                ) : vendas.map((v) => {
                  const itensDisp = (vendaItens[v.id] || []).filter((it) => { const id = toNumberId(it.id); return !(id && referenciaIds.itensVenda.has(id)) })
                  if (itensDisp.length === 0) return null
                  return (
                    <div key={v.id} className="rounded-lg border border-white/20 bg-white/30 px-3 py-2 dark:border-white/10 dark:bg-white/[0.05]">
                      <p className="text-[11px] font-semibold text-foreground mb-1">{v.numero || v.id_custom || `VENDA ${v.id}`} <span className="font-normal text-muted-foreground">· <MoneyValue value={v.total} /></span></p>
                      {itensDisp.map((it) => {
                        const prod = produtoById.get(it.produto)
                        return (
                          <div key={it.id} className="flex items-center justify-between gap-2 py-0.5">
                            <span className="text-xs text-foreground">{prod?.nome || `Produto ${it.produto}`}</span>
                            <button className="shrink-0 inline-flex items-center rounded-md border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-700/40 dark:text-emerald-400"
                              onClick={() => adicionarItem({ tipo_item: "FAR", item_venda: it.id }, `sale-item-${it.id}`)} disabled={addItemButtonDisabled}
                            >{addItemButtonLabel(`sale-item-${it.id}`)}</button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </details>

            {/* Cirurgias */}
            <details open className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 select-none">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 text-[10px] font-bold">C</span>
                <span className="text-xs font-semibold text-foreground flex-1">Cirurgias</span>
                <span className="text-[10px] text-muted-foreground">{cirurgias.length === 0 ? "—" : `${cirurgias.length}`}</span>
              </summary>
              <div className="px-4 pb-3 space-y-1">
                {cirurgias.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem cirurgias.</p>
                ) : cirurgias.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 py-0.5">
                    <span className="text-xs text-foreground">{c.procedimento || c.id_custom || `Cirurgia ${c.id}`}</span>
                    <button className="shrink-0 inline-flex items-center rounded-md border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-700/40 dark:text-emerald-400"
                      onClick={() => adicionarItem({ tipo_item: "AJU", descricao: `Cirurgia: ${c.procedimento || c.id_custom || c.id}`, quantidade: 1, preco_unitario: c.preco_estimado || 0, iva_percentual: c.iva_percentual, aplica_iva: c.aplica_iva_por_padrao }, `patient-surgery-${c.id}`)}
                      disabled={addItemButtonDisabled}
                    >{addItemButtonLabel(`patient-surgery-${c.id}`)}</button>
                  </div>
                ))}
              </div>
            </details>

            {/* Consultas — pesquisa + multi-select */}
            <details open className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 select-none">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 text-[10px] font-bold">Q</span>
                <span className="text-xs font-semibold text-foreground flex-1">Consultas</span>
                <span className="text-[10px] text-muted-foreground">{consultas.length === 0 ? "—" : `${consultas.length} disponível${consultas.length !== 1 ? "s" : ""}`}</span>
              </summary>
              <div className="px-4 pb-3 space-y-2">
                {consultas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem consultas para este paciente.</p>
                ) : (
                  <>
                    <input
                      type="text"
                      value={consultaQuery}
                      onChange={(e) => setConsultaQuery(e.target.value)}
                      placeholder="Pesquisar consulta por especialidade…"
                      className="h-8 w-full rounded-lg border border-border bg-background/60 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--primary-400)]"
                    />
                    {/* resultados da busca — apenas com query */}
                    {consultaQuery.trim() ? (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {consultas
                          .filter((c) => {
                            const q = consultaQuery.toLowerCase()
                            return (
                              (c.type || "").toLowerCase().includes(q) ||
                              (c.specialty_name || "").toLowerCase().includes(q) ||
                              (c.custom_id || "").toLowerCase().includes(q) ||
                              String(c.id).includes(q)
                            )
                          })
                          .map((c) => {
                            const nome = c.type || c.specialty_name || c.custom_id || `Consulta ${c.id}`
                            const sel = consultasSelecionadas.has(c.id)
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setConsultasSelecionadas((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(c.id)) next.delete(c.id); else next.add(c.id)
                                  return next
                                })}
                                className={`w-full text-left flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition ${sel ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-600/50 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-border bg-background/60 text-foreground hover:bg-muted"}`}
                              >
                                <span className={`h-3.5 w-3.5 shrink-0 rounded border flex items-center justify-center text-[8px] ${sel ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"}`}>
                                  {sel ? "✓" : ""}
                                </span>
                                {nome}
                              </button>
                            )
                          })}
                      </div>
                    ) : null}
                    {/* chips das selecionadas */}
                    {consultasSelecionadas.size > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Selecionadas ({consultasSelecionadas.size})</p>
                        <div className="flex flex-wrap gap-1">
                          {consultas.filter((c) => consultasSelecionadas.has(c.id)).map((c) => (
                            <span key={c.id} className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-800 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-300">
                              {c.type || c.specialty_name || `Consulta ${c.id}`}
                              <button type="button" className="hover:text-rose-500" onClick={() => setConsultasSelecionadas((prev) => { const n = new Set(prev); n.delete(c.id); return n })}>×</button>
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          disabled={addItemButtonDisabled}
                          onClick={async () => {
                            for (const c of consultas.filter((c) => consultasSelecionadas.has(c.id))) {
                              await adicionarItem({ tipo_item: "CON", consultation: c.id }, `patient-consultation-${c.id}`)
                            }
                            setConsultasSelecionadas(new Set())
                          }}
                          className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Adicionar {consultasSelecionadas.size} consulta{consultasSelecionadas.size !== 1 ? "s" : ""}
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </details>

          </div>
          )}
        </div>

        {/* ── Pesquisa de catálogo ── */}
        <div className={`${GLASS} border-l-4 border-l-indigo-500 flex flex-col gap-0`}>
          <div className="border-b border-white/20 px-4 py-2.5 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pesquisa de catálogo</p>
            <p className="text-[11px] text-muted-foreground">Busque e adicione itens avulsos ao rascunho.</p>
          </div>
          {!podeEditar ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">Sem permissão para pesquisar catálogo.</div>
          ) : (
          <div className="flex flex-col divide-y divide-white/20 dark:divide-white/10">

            {/* Exames laboratoriais */}
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400 text-[10px] font-bold">E</span>
                <span className="text-xs font-semibold text-foreground">Exames laboratoriais</span>
              </div>
              <CatalogSearchSelect placeholder="Pesquisar exames…" fetcher={buscarExames} disabled={addItemButtonDisabled}
                onSelect={(opt) => adicionarItem({ tipo_item: "EXA", exame: opt.raw.id }, `catalog-exam-${opt.raw.id}`)} />
            </div>

            {/* Exames médicos */}
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400 text-[10px] font-bold">M</span>
                <span className="text-xs font-semibold text-foreground">Exames médicos</span>
              </div>
              <CatalogSearchSelect placeholder="Pesquisar exames médicos…" fetcher={buscarExamesMedicos} disabled={addItemButtonDisabled}
                onSelect={(opt) => adicionarItem({ tipo_item: "EXM", exame_medico: opt.raw.id }, `catalog-medical-exam-${opt.raw.id}`)} />
            </div>

            {/* Procedimentos enfermagem */}
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400 text-[10px] font-bold">P</span>
                <span className="text-xs font-semibold text-foreground">Procedimentos (catálogo)</span>
              </div>
              <CatalogSearchSelect placeholder="Pesquisar procedimentos…" fetcher={buscarProcedimentosCatalogo} disabled={addItemButtonDisabled}
                onSelect={(opt) => { const p = opt.raw; return adicionarItem({ tipo_item: "AJU", descricao: `Procedimento: ${p.nome || p.id_custom || p.id}`, quantidade: 1, preco_unitario: p.preco_padrao || 0, iva_percentual: p.iva_percentual, aplica_iva: p.aplica_iva_por_padrao }, `catalog-procedure-${p.id}`) }} />
            </div>

            {/* Procedimentos cirúrgicos */}
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 text-[10px] font-bold">C</span>
                <span className="text-xs font-semibold text-foreground">Procedimentos cirúrgicos</span>
              </div>
              <CatalogSearchSelect placeholder="Pesquisar cirurgias…" fetcher={buscarProcedimentosCirurgicos} disabled={addItemButtonDisabled}
                onSelect={(opt) => { const p = opt.raw; return adicionarItem({ tipo_item: "AJU", descricao: `Cirurgia: ${p.nome || p.id_custom || p.id}`, quantidade: 1, preco_unitario: p.preco_base || 0, iva_percentual: p.iva_percentual, aplica_iva: p.aplica_iva_por_padrao }, `catalog-surgery-${p.id}`) }} />
            </div>

            {/* Medicamentos / materiais */}
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 text-[10px] font-bold">F</span>
                <span className="text-xs font-semibold text-foreground">Medicamentos / materiais</span>
              </div>
              <CatalogSearchSelect placeholder="Pesquisar produtos…" fetcher={buscarProdutos} disabled={addItemButtonDisabled}
                onSelect={(opt) => { const p = opt.raw; return adicionarItem({ tipo_item: "AJU", descricao: `Produto: ${p.nome || p.id_custom || p.id}`, quantidade: 1, preco_unitario: p.preco_venda || 0, iva_percentual: p.iva_percentual, aplica_iva: p.aplica_iva_por_padrao }, `catalog-product-${p.id}`) }} />
            </div>

          </div>
          )}
        </div>

        </div>{/* fim grid 2-col */}
      </div>
    </AppLayout>
  )
}
