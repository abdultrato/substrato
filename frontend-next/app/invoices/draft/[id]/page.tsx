"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { BadgeCheck, FileText, Receipt, Search, Wallet } from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import CatalogSearchSelect, { type CatalogOption } from "@/components/ui/CatalogSearchSelect"
import SelectInput from "@/components/ui/SelectInput"
import TextAreaInput from "@/components/ui/TextAreaInput"
import TextInput from "@/components/ui/TextInput"
import MoneyValue from "@/components/ui/MoneyValue"
import PdfActionLabel from "@/components/ui/PdfActionLabel"
import { apiFetch } from "@/lib/api"
import { mapWithConcurrency } from "@/lib/concurrency"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

// ─── Tipos de item de fatura (espelham InvoiceItem.TipoItem no backend) ───────
type TipoItem = "EXA" | "EXM" | "FAR" | "PRC" | "MAT" | "CON" | "AJU"

// ─── Payload discriminado por tipo — garante que só os campos certos são enviados
type AdicionarItemPayload =
  | { tipo_item: "EXA"; exame: number | string }
  | { tipo_item: "EXM"; exame_medico: number | string }
  | { tipo_item: "FAR"; item_venda: number | string }
  | { tipo_item: "PRC"; procedimento_item: number | string }
  | { tipo_item: "MAT"; procedimento_material: number | string; quantidade?: number }
  | { tipo_item: "CON"; consultation: number | string }
  | { tipo_item: "AJU"; descricao: string; quantidade?: number; preco_unitario?: number; iva_percentual?: number | string | null; aplica_iva?: boolean | null }

type FaturaItem = {
  id: number
  tipo_item: TipoItem
  descricao?: string | null
  quantidade?: string | number | null
  preco_unitario?: string | number | null
  aplica_iva?: boolean | null
  iva_percentual?: string | number | null
  total_com_iva?: string | number | null
  // FKs de referência — chegam como número (alias PT → EN já resolvido pelo serializer)
  exame?: number | string | null
  exame_medico?: number | string | null
  procedimento_item?: number | string | null
  procedimento_material?: number | string | null
  item_venda?: number | string | null
  consulta?: number | string | null
  produto?: number | string | null
}

const TIPO_ITEM_META: Record<TipoItem, { label: string; sigla: string; tone: string }> = {
  EXA: { label: "Exame laboratorial", sigla: "EXA", tone: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  EXM: { label: "Exame médico", sigla: "EXM", tone: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
  FAR: { label: "Medicação", sigla: "FAR", tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  PRC: { label: "Procedimento", sigla: "PRC", tone: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  MAT: { label: "Material", sigla: "MAT", tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  CON: { label: "Consulta", sigla: "CON", tone: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  AJU: { label: "Serviço / ajuste", sigla: "AJU", tone: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300" },
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

  const [exames, setExames] = useState<Row[]>([])
  const [examesMedicos, setExamesMedicos] = useState<Row[]>([])
  const [produtos, setProdutos] = useState<Row[]>([])
  const [produtoStagiado, setProdutoStagiado] = useState<{ raw: Row; label: string; qty: number } | null>(null)
  const [matProcStagiado, setMatProcStagiado] = useState<{ matId: number | string; label: string; qty: number; defaultQty: number; unitPrice: number | null } | null>(null)


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
      // AJU sem FK direto: rastreados por nome normalizado
      cirurgiasNomes: new Set<string>(),
      procedimentosNomes: new Set<string>(),
      produtosNomes: new Set<string>(),
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

      if (item.tipo_item === "AJU" && item.descricao) {
        const desc = String(item.descricao)
        if (desc.startsWith("Cirurgia:"))
          sets.cirurgiasNomes.add(desc.replace(/^Cirurgia:\s*/, "").toLowerCase().trim())
        else if (desc.startsWith("Procedimento:"))
          sets.procedimentosNomes.add(desc.replace(/^Procedimento:\s*/, "").toLowerCase().trim())
        else if (desc.startsWith("Produto:"))
          sets.produtosNomes.add(desc.replace(/^Produto:\s*/, "").toLowerCase().trim())
      }
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

  const carregarItens = useCallback(async (fatId: number, forceRefresh = false) => {
    try {
      const res = await apiFetch<any>(`/billing/invoiceitem/?fatura=${fatId}`, {
        clientCache: !forceRefresh && safeRefreshToken === 0,
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

      const reqItemsPairs = await mapWithConcurrency(
        reqs,
        (r) => apiFetch<any>(`/clinical/labrequestitem/?requisicao=${r.id}`, { clientCache: safeRefreshToken === 0 })
      )
      const reqMap: Record<number, Row[]> = {}
      reqs.forEach((r, idx) => {
        reqMap[r.id] = listFrom(reqItemsPairs[idx])
      })
      setRequisicaoItens(reqMap)

      const procItemPairs = await mapWithConcurrency(
        procs,
        (p) => apiFetch<any>(`/nursing/procedure_item/?procedimento=${p.id}`, { clientCache: safeRefreshToken === 0 })
      )
      const procMatPairs = await mapWithConcurrency(
        procs,
        (p) => apiFetch<any>(`/nursing/procedure_material/?procedimento=${p.id}`, { clientCache: safeRefreshToken === 0 })
      )
      const procItemMap: Record<number, Row[]> = {}
      const procMatMap: Record<number, Row[]> = {}
      procs.forEach((p, idx) => {
        procItemMap[p.id] = listFrom(procItemPairs[idx])
        procMatMap[p.id] = listFrom(procMatPairs[idx])
      })
      setProcedimentoItens(procItemMap)
      setProcedimentoMateriais(procMatMap)

      const vendaItemPairs = await mapWithConcurrency(
        vendasList,
        (v) => apiFetch<any>(`/pharmacy/sale_item/?venda=${v.id}`, { clientCache: safeRefreshToken === 0 })
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

  const definirAcompanhanteComoCliente = useCallback(async () => {
    if (!faturaId || !faturaRascunho || !paciente) return
    const nome = paciente.companion_name || paciente.acompanhante_nome
    if (!nome) return
    const relacao = paciente.companion_relationship || paciente.acompanhante_relacao || ""
    const label = relacao ? `${nome} (${relacao})` : nome
    try {
      setErro(null)
      await apiFetch(`/invoices/${faturaId}/`, {
        method: "PATCH",
        body: JSON.stringify({ fiscal_client: null, fiscal_client_name: label, fiscal_client_nuit: "", fiscal_client_address: "" }),
      })
      setFiscalMode(null)
      await carregarFatura()
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao definir acompanhante."))
    }
  }, [faturaId, faturaRascunho, paciente, carregarFatura])

  const adicionarItem = useCallback(async (payload: AdicionarItemPayload, actionKey = "item") => {
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
      await carregarItens(faturaId, true)
      await new Promise((r) => setTimeout(r, 300))
      const fat = await apiFetch<any>(`/invoices/${faturaId}/`, { clientCache: false })
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
      if (faturaId) {
        await carregarItens(faturaId, true)
        await new Promise((r) => setTimeout(r, 300))
        const fat = await apiFetch<any>(`/invoices/${faturaId}/`, { clientCache: false })
        setFatura(fat)
      }
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao remover item."))
    }
  }, [carregarItens, faturaId, faturaProforma, faturaRascunho, podeEditar])

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
      added: referenciaIds.exames.has(e.id),
    }))
  }, [precoHint, referenciaIds.exames])

  const buscarExamesMedicos = useCallback(async (q: string): Promise<CatalogOption[]> => {
    const res = await apiFetch<any>(`/clinical/medicalexam/?search=${encodeURIComponent(q)}`)
    return listFrom(res).map((e) => ({
      key: e.id,
      label: e.nome || e.id_custom || `Exame ${e.id}`,
      hint: precoHint(e.preco, e.preco_unitario, e.price),
      raw: e,
      added: referenciaIds.examesMedicos.has(e.id),
    }))
  }, [precoHint, referenciaIds.examesMedicos])

  const buscarProcedimentosCatalogo = useCallback(async (q: string): Promise<CatalogOption[]> => {
    const res = await apiFetch<any>(`/nursing/procedure_catalog/?search=${encodeURIComponent(q)}`)
    return listFrom(res).map((p) => ({
      key: p.id,
      label: p.nome || p.id_custom || `Procedimento ${p.id}`,
      hint: precoHint(p.preco_padrao, p.preco),
      raw: p,
      added: referenciaIds.procedimentosNomes.has((String(p.nome || p.id_custom || "")).toLowerCase().trim()),
    }))
  }, [precoHint, referenciaIds.procedimentosNomes])

  const buscarProcedimentosCirurgicos = useCallback(async (q: string): Promise<CatalogOption[]> => {
    const res = await apiFetch<any>(`/surgery/surgical_procedure/?search=${encodeURIComponent(q)}`)
    return listFrom(res).map((p) => ({
      key: p.id,
      label: p.nome || p.id_custom || `Cirurgia ${p.id}`,
      hint: precoHint(p.preco_base, p.preco),
      raw: p,
      added: referenciaIds.cirurgiasNomes.has((String(p.nome || p.id_custom || "")).toLowerCase().trim()),
    }))
  }, [precoHint, referenciaIds.cirurgiasNomes])

  const buscarProdutos = useCallback(async (q: string): Promise<CatalogOption[]> => {
    const res = await apiFetch<any>(`/pharmacy/product/?search=${encodeURIComponent(q)}`)
    return listFrom(res).map((p) => ({
      key: p.id,
      label: p.nome || p.id_custom || `Produto ${p.id}`,
      hint: precoHint(p.preco_venda, p.preco),
      raw: p,
      added: referenciaIds.produtosNomes.has((String(p.nome || p.id_custom || "")).toLowerCase().trim()),
    }))
  }, [precoHint, referenciaIds.produtosNomes])

  const consultasAdicionadasIds = useMemo(() => {
    const s = new Set<number>()
    itens.forEach((i) => {
      if (i.tipo_item === "CON") {
        // consulta chega como número (campo FK consulta/consultation no serializer)
        const id = toNumberId(i.consulta)
        if (id) s.add(id)
      }
    })
    return s
  }, [itens])

  const buscarConsultas = useCallback(async (q: string): Promise<CatalogOption[]> => {
    const lower = q.toLowerCase()
    return consultas
      .filter((c) => {
        if (consultasAdicionadasIds.has(toNumberId(c.id) ?? -1)) return false
        return (
          (c.type || "").toLowerCase().includes(lower) ||
          (c.specialty_name || "").toLowerCase().includes(lower) ||
          (c.custom_id || "").toLowerCase().includes(lower) ||
          String(c.id).includes(lower)
        )
      })
      .map((c) => ({
        key: c.id,
        label: c.type || c.specialty_name || c.custom_id || `Consulta ${c.id}`,
        hint: c.specialty_name || undefined,
        raw: c,
        added: consultasAdicionadasIds.has(toNumberId(c.id) ?? -1),
      }))
  }, [consultas, consultasAdicionadasIds])

  const buscarEmpresas = useCallback(async (q: string): Promise<CatalogOption[]> => {
    const res = await apiFetch<any>(`/companies/?search=${encodeURIComponent(q)}`)
    return listFrom(res).map((c) => ({
      key: c.id,
      label: c.nome || c.name || c.id_custom || `Entidade ${c.id}`,
      hint: c.nuit ? `NUIT: ${c.nuit}` : undefined,
      raw: c,
    }))
  }, [])

  const [fiscalMode, setFiscalMode] = useState<"entidade" | "acompanhante" | null>(null)

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

        {/* ── Masonry: Cliente fiscal + Pagamento + Itens fluem pelo espaço livre ── */}
        <div className="columns-1 gap-2 lg:columns-2 [&>*]:mb-2 [&>*]:break-inside-avoid">

        {/* Cliente fiscal */}
        <section className={`${GLASS} border-l-4 border-l-teal-500`}>
          <div className="px-4 py-3 space-y-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente fiscal</p>
            </div>
            <div className="text-sm text-foreground">
              {fatura?.fiscal_client_name
                ? <>{fatura.fiscal_client_name}{fatura.fiscal_client_nuit ? <span className="text-muted-foreground"> · NUIT: {fatura.fiscal_client_nuit}</span> : null}</>
                : <>Paciente{(paciente?.nome || paciente?.name) ? <> <span className="text-muted-foreground">[{paciente?.nome || paciente?.name}]</span></> : null}</>}
            </div>
            {faturaRascunho && podeEditar ? (
              <div className="space-y-2">
                {/* mode selector */}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFiscalMode(fiscalMode === "entidade" ? null : "entidade")}
                    className={`rounded-md border px-3 py-1 text-[11px] font-medium transition ${fiscalMode === "entidade" ? "border-teal-400 bg-teal-50 text-teal-700 dark:border-teal-600 dark:bg-teal-900/30 dark:text-teal-300" : "border-border bg-background/60 text-muted-foreground hover:bg-muted"}`}
                  >
                    Entidade
                  </button>
                  {(paciente?.companion_name || paciente?.acompanhante_nome) ? (
                    <button
                      type="button"
                      onClick={() => setFiscalMode(fiscalMode === "acompanhante" ? null : "acompanhante")}
                      className={`rounded-md border px-3 py-1 text-[11px] font-medium transition ${fiscalMode === "acompanhante" ? "border-teal-400 bg-teal-50 text-teal-700 dark:border-teal-600 dark:bg-teal-900/30 dark:text-teal-300" : "border-border bg-background/60 text-muted-foreground hover:bg-muted"}`}
                    >
                      Acompanhante
                    </button>
                  ) : null}
                  {fatura?.fiscal_client_name ? (
                    <button
                      type="button"
                      onClick={() => { setFiscalMode(null); definirClienteFiscal(null) }}
                      className="ml-auto rounded-md border border-border bg-background/60 px-3 py-1 text-[11px] text-muted-foreground hover:bg-muted transition"
                    >
                      Repor paciente
                    </button>
                  ) : null}
                </div>
                {/* entidade search */}
                {fiscalMode === "entidade" && (
                  <CatalogSearchSelect
                    placeholder="Pesquisar empresa, seguradora, escola, ONG…"
                    fetcher={buscarEmpresas}
                    onSelect={(opt) => { setFiscalMode(null); definirClienteFiscal(Number(opt.raw.id)) }}
                  />
                )}
                {/* acompanhante */}
                {fiscalMode === "acompanhante" && (() => {
                  const nome = paciente?.companion_name || paciente?.acompanhante_nome || ""
                  const relacao = paciente?.companion_relationship || paciente?.acompanhante_relacao || ""
                  const contacto = paciente?.companion_contact || paciente?.acompanhante_contacto || ""
                  return (
                    <div className="rounded-lg border border-teal-200 bg-teal-50/60 dark:border-teal-700/40 dark:bg-teal-900/20 px-3 py-2 space-y-1.5">
                      <p className="text-xs font-medium text-foreground">{nome}{relacao ? <span className="text-muted-foreground font-normal"> · {relacao}</span> : null}</p>
                      {contacto ? <p className="text-[11px] text-muted-foreground">{contacto}</p> : null}
                      <button
                        type="button"
                        onClick={definirAcompanhanteComoCliente}
                        className="rounded-md bg-teal-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-teal-700 transition"
                      >
                        Usar como cliente fiscal
                      </button>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">O cliente fiscal só pode ser alterado enquanto a fatura estiver em rascunho.</div>
            )}
          </div>
        </section>

        {/* Registrar pagamento — em EMIT ocupa a largura toda do masonry */}
        <section className={`${GLASS} border-l-4 ${fatura.estado === "PAGA" ? "border-l-emerald-500" : "border-l-violet-500"} ${fatura.estado === "EMIT" && podePagar ? "[column-span:all] mt-3" : ""}`}>
          <div className={`px-4 py-3 ${fatura.estado === "PAGA" ? "space-y-2" : "space-y-3"}`}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {fatura.estado === "PAGA" ? "Fatura paga" : "Registrar pagamento"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {fatura.estado === "PAGA" ? "Imprima a fatura e o recibo." : "Disponível após emissão da fatura."}
              </p>
            </div>
          {fatura.estado === "PAGA" ? (
            <div className="space-y-2">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
                Fatura totalmente quitada.
              </div>

              {pagamentos.length > 0 ? (
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">Pagamentos</div>
                  <div className="overflow-hidden rounded-md border border-border">
                    <table className="min-w-full text-xs">
                      <tbody className="divide-y divide-border">
                        {pagamentos.map((p) => (
                          <tr key={p.id}>
                            <td className="px-2.5 py-1.5 text-foreground">
                              {metodosLabelByValue.get((p.metodo ?? p.method) as MetodoPagamento) || p.metodo || p.method || "-"}
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-medium text-foreground">
                              <MoneyValue value={p.valor ?? p.value} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <button
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--primary-600)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--primary-700)]"
                  onClick={downloadInvoicePdf}
                >
                  <PdfActionLabel>Imprimir fatura</PdfActionLabel>
                </button>
                {recibo ? (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                    onClick={downloadReceiptPdf}
                  >
                    <PdfActionLabel>Imprimir recibo</PdfActionLabel>
                  </button>
                ) : (
                  <span className="self-center text-[11px] text-muted-foreground">Recibo a ser gerado.</span>
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
                          label: s.nome || s.name || s.id_custom || `Seguradora ${s.id}`,
                        }))}
                        placeholder={seguradoras.length ? "Selecione" : "Nenhuma seguradora cadastrada"}
                        disabled={!seguradoras.length}
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

        {/* ── Itens da fatura — ocupa o espaço restante da coluna direita ── */}
        {fatura.estado === "PAGA" ? (
          <section className={`${GLASS} border-l-4 border-l-sky-500 overflow-hidden`}>
            <div className="space-y-1.5 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Itens da fatura</p>
                {itens.length > 0 ? (
                  <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                    {itens.length} {itens.length === 1 ? "item" : "itens"}
                  </span>
                ) : null}
              </div>
              {itens.length === 0 ? (
                <div className="rounded-md border border-dashed border-white/30 px-3 py-4 text-center text-xs text-muted-foreground dark:border-white/10">
                  Nenhum item registado.
                </div>
              ) : (
                <div className="space-y-1">
                  {itens.map((i) => {
                    const meta = TIPO_ITEM_META[i.tipo_item] ?? TIPO_ITEM_META.AJU
                    const qtd = Number(i.quantidade) || 1
                    return (
                      <div
                        key={i.id}
                        className="flex items-center gap-2 rounded-md border border-white/20 bg-white/40 px-2 py-1.5 transition hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                      >
                        <span
                          className={`flex h-5 w-7 shrink-0 items-center justify-center rounded text-[8px] font-bold tracking-wide ${meta.tone}`}
                          title={meta.label}
                        >
                          {meta.sigla}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium leading-tight text-foreground">{i.descricao || `Item ${i.id}`}</div>
                          <div className="mt-px flex items-center gap-1.5 text-[10px] leading-tight text-muted-foreground">
                            <span className="tabular-nums">{qtd} × <MoneyValue value={i.preco_unitario} /></span>
                            <span className="opacity-50">·</span>
                            <span className={i.aplica_iva ? "" : "opacity-60"}>
                              {i.aplica_iva ? `IVA ${i.iva_percentual ?? 0}%` : "Isento de IVA"}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-xs font-semibold text-foreground tabular-nums">
                          <MoneyValue value={i.total_com_iva} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        ) : null}

        </div>{/* fim masonry topo */}

        {/* ── Adicionar itens — grid 3 colunas ── */}
        {podeEditar && faturaRascunho && !faturaProforma ? (<>
          <div className="columns-1 gap-2 md:columns-2 lg:columns-3 [&>*]:break-inside-avoid [&>*]:mb-2">

            {/* Exames laboratoriais */}
            <section className={`${GLASS} border-l-4 border-l-sky-500 flex flex-col`}>
              <div className="px-4 pt-3 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400 text-[10px] font-bold">E</span>
                  <span className="text-xs font-semibold text-foreground">Exames laboratoriais</span>
                  {referenciaIds.exames.size > 0 && (
                    <span className="ml-auto shrink-0 text-[10px] font-semibold text-sky-600 dark:text-sky-400">{referenciaIds.exames.size} ✓</span>
                  )}
                </div>
                <CatalogSearchSelect
                  placeholder="Pesquisar e selecionar…"
                  fetcher={buscarExames}
                  disabled={addItemButtonDisabled}
                  onSelect={(opt) => adicionarItem({ tipo_item: "EXA", exame: opt.raw.id }, `catalog-exam-${opt.raw.id}`)}
                />
              </div>
              {(() => {
                const adicionados = itens.filter(i => i.tipo_item === "EXA" && toNumberId(i.exame) && referenciaIds.exames.has(toNumberId(i.exame)!))
                // Deduplica por ID do exame — mesmo exame pode aparecer em múltiplas requisições
                const pendentes = Array.from(
                  new Map(
                    requisicoes.flatMap((r) =>
                      (requisicaoItens[r.id] || []).filter((it) => {
                        const exameId = toNumberId(it.exame)
                        return exameId != null && !referenciaIds.exames.has(exameId)
                      }).map((it) => ({ r, it }))
                    ).map((entry) => [toNumberId(entry.it.exame), entry])
                  ).values()
                )
                if (!adicionados.length && !pendentes.length) return null
                return (
                  <div className="border-t border-white/20 dark:border-white/10 px-4 py-2.5 space-y-2">
                    {adicionados.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {adicionados.map(i => (
                          <button key={`exa-added-${i.id}`} type="button" disabled={!faturaRascunho || !podeEditar} onClick={() => removerItem(i.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] text-sky-800 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-default dark:border-sky-700/50 dark:bg-sky-900/20 dark:text-sky-300">
                            <span className="text-[8px]">✓</span>{i.descricao || `Exame ${i.exame}`}<span className="text-[9px] opacity-60">×</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {pendentes.length > 0 && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Do paciente</p>
                        <div className="flex flex-wrap gap-1">
                          {pendentes.map(({ it }) => {
                            const exameId = toNumberId(it.exame)!
                            const exame = exameById.get(exameId)
                            const label = exame?.nome || `Exame ${it.exame}`
                            return (
                              <button key={`exa-pending-${exameId}`} type="button" disabled={addItemButtonDisabled}
                                onClick={() => adicionarItem({ tipo_item: "EXA", exame: exameId }, `req-exam-${exameId}`)}
                                className="inline-flex items-center gap-1 rounded-full border border-dashed border-sky-400 bg-sky-50/60 px-2 py-0.5 text-[10px] text-sky-700 transition hover:bg-sky-100 disabled:opacity-50 dark:border-sky-600/50 dark:bg-sky-900/10 dark:text-sky-400"
                              >+ {label}</button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </section>

            {/* Exames médicos */}
            <section className={`${GLASS} border-l-4 border-l-violet-500 flex flex-col`}>
              <div className="px-4 pt-3 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400 text-[10px] font-bold">M</span>
                  <span className="text-xs font-semibold text-foreground">Exames médicos</span>
                  {referenciaIds.examesMedicos.size > 0 && (
                    <span className="ml-auto shrink-0 text-[10px] font-semibold text-violet-600 dark:text-violet-400">{referenciaIds.examesMedicos.size} ✓</span>
                  )}
                </div>
                <CatalogSearchSelect
                  placeholder="Pesquisar e selecionar…"
                  fetcher={buscarExamesMedicos}
                  disabled={addItemButtonDisabled}
                  onSelect={(opt) => adicionarItem({ tipo_item: "EXM", exame_medico: opt.raw.id }, `catalog-medical-exam-${opt.raw.id}`)}
                />
              </div>
              {(() => {
                const adicionados = itens.filter(i => i.tipo_item === "EXM" && toNumberId(i.exame_medico) && referenciaIds.examesMedicos.has(toNumberId(i.exame_medico)!))
                // Deduplica por ID do exame médico
                const pendentes = Array.from(
                  new Map(
                    requisicoes.flatMap((r) =>
                      (requisicaoItens[r.id] || []).filter((it) => {
                        const exameMedId = toNumberId(it.exame_medico)
                        return exameMedId != null && !referenciaIds.examesMedicos.has(exameMedId)
                      }).map((it) => ({ r, it }))
                    ).map((entry) => [toNumberId(entry.it.exame_medico), entry])
                  ).values()
                )
                if (!adicionados.length && !pendentes.length) return null
                return (
                  <div className="border-t border-white/20 dark:border-white/10 px-4 py-2.5 space-y-2">
                    {adicionados.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {adicionados.map(i => (
                          <button key={`exm-added-${i.id}`} type="button" disabled={!faturaRascunho || !podeEditar} onClick={() => removerItem(i.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-50 px-2 py-0.5 text-[10px] text-violet-800 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-default dark:border-violet-700/50 dark:bg-violet-900/20 dark:text-violet-300">
                            <span className="text-[8px]">✓</span>{i.descricao || `Exame ${i.exame_medico}`}<span className="text-[9px] opacity-60">×</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {pendentes.length > 0 && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Do paciente</p>
                        <div className="flex flex-wrap gap-1">
                          {pendentes.map(({ it }) => {
                            const exameMedId = toNumberId(it.exame_medico)!
                            const exameMed = exameMedById.get(exameMedId)
                            const label = exameMed?.nome || `Exame méd. ${it.exame_medico}`
                            return (
                              <button key={`exm-pending-${exameMedId}`} type="button" disabled={addItemButtonDisabled}
                                onClick={() => adicionarItem({ tipo_item: "EXM", exame_medico: exameMedId }, `req-medical-exam-${exameMedId}`)}
                                className="inline-flex items-center gap-1 rounded-full border border-dashed border-violet-400 bg-violet-50/60 px-2 py-0.5 text-[10px] text-violet-700 transition hover:bg-violet-100 disabled:opacity-50 dark:border-violet-600/50 dark:bg-violet-900/10 dark:text-violet-400"
                              >+ {label}</button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </section>

            {/* Procedimentos */}
            <section className={`${GLASS} border-l-4 border-l-teal-500 flex flex-col`}>
              <div className="px-4 pt-3 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400 text-[10px] font-bold">P</span>
                  <span className="text-xs font-semibold text-foreground">Procedimentos</span>
                </div>
                <CatalogSearchSelect
                  placeholder="Pesquisar e selecionar…"
                  fetcher={buscarProcedimentosCatalogo}
                  disabled={addItemButtonDisabled}
                  onSelect={(opt) => { const p = opt.raw; return adicionarItem({ tipo_item: "AJU", descricao: `Procedimento: ${p.nome || p.id_custom || p.id}`, quantidade: 1, preco_unitario: p.preco_padrao || 0, iva_percentual: p.iva_percentual, aplica_iva: p.aplica_iva_por_padrao }, `catalog-procedure-${p.id}`) }}
                />
              </div>
              {(() => {
                const adicionados = itens.filter(i =>
                  (i.tipo_item === "AJU" && String(i.descricao).startsWith("Procedimento:")) ||
                  i.tipo_item === "PRC"
                )
                const pendentes = Array.from(
                  new Map(
                    procedimentos.flatMap((p) => [
                      ...(procedimentoItens[p.id] || []).filter((it) => { const id = toNumberId(it.id); return !(id && referenciaIds.procedimentoItens.has(id)) }).map((it) => ({ tipo: "item" as const, p, it })),
                      // materiais de procedimento aparecem na seção Medicamentos / materiais
                    ]).map((entry) => [`${entry.tipo}-${entry.it.id}`, entry])
                  ).values()
                )
                if (!adicionados.length && !pendentes.length) return null
                return (
                  <div className="border-t border-white/20 dark:border-white/10 px-4 py-2.5 space-y-2">
                    {adicionados.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {adicionados.map(i => (
                          <button key={`prc-added-${i.id}`} type="button" disabled={!faturaRascunho || !podeEditar} onClick={() => removerItem(i.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-teal-300 bg-teal-50 px-2 py-0.5 text-[10px] text-teal-800 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-default dark:border-teal-700/50 dark:bg-teal-900/20 dark:text-teal-300">
                            <span className="text-[8px]">✓</span>{String(i.descricao ?? "").replace(/^Procedimento:\s*/, "")}<span className="text-[9px] opacity-60">×</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {pendentes.length > 0 && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Do paciente (enfermagem)</p>
                        <div className="flex flex-wrap gap-1">
                          {pendentes.map(({ tipo, p, it }) => {
                            const label = tipo === "item"
                              ? (it.descricao || `Serviço ${it.id}`)
                              : (produtoById.get(toNumberId(it.produto) ?? it.produto)?.nome || `Material ${it.produto}`)
                            const addKey = tipo === "item" ? `prc-pending-${it.id}` : `mat-pending-${it.id}`
                            const payload: AdicionarItemPayload = tipo === "item"
                              ? { tipo_item: "PRC", procedimento_item: it.id }
                              : { tipo_item: "MAT", procedimento_material: it.id }
                            return (
                              <button key={addKey} type="button" disabled={addItemButtonDisabled}
                                onClick={() => adicionarItem(payload, addKey)}
                                className="inline-flex items-center gap-1 rounded-full border border-dashed border-teal-400 bg-teal-50/60 px-2 py-0.5 text-[10px] text-teal-700 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-600/50 dark:bg-teal-900/10 dark:text-teal-400"
                              >+ {label}</button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </section>

            {/* Cirurgias */}
            <section className={`${GLASS} border-l-4 border-l-rose-500 flex flex-col`}>
              <div className="px-4 pt-3 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 text-[10px] font-bold">C</span>
                  <span className="text-xs font-semibold text-foreground">Cirurgias</span>
                </div>
                <CatalogSearchSelect
                  placeholder="Pesquisar e selecionar…"
                  fetcher={buscarProcedimentosCirurgicos}
                  disabled={addItemButtonDisabled}
                  onSelect={(opt) => { const p = opt.raw; return adicionarItem({ tipo_item: "AJU", descricao: `Cirurgia: ${p.nome || p.id_custom || p.id}`, quantidade: 1, preco_unitario: p.preco_base || 0, iva_percentual: p.iva_percentual, aplica_iva: p.aplica_iva_por_padrao }, `catalog-surgery-${p.id}`) }}
                />
              </div>
              {(() => {
                const adicionadas = itens.filter(i => i.tipo_item === "AJU" && String(i.descricao ?? "").startsWith("Cirurgia:"))
                const cirurgiasPendentes = cirurgias.filter(c => {
                  const nome = String(c.procedimento || c.id_custom || c.id).toLowerCase().trim()
                  return !referenciaIds.cirurgiasNomes.has(nome)
                })
                if (!adicionadas.length && !cirurgiasPendentes.length) return null
                return (
                  <div className="border-t border-white/20 dark:border-white/10 px-4 py-2.5 space-y-2">
                    {adicionadas.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {adicionadas.map(i => (
                          <button key={`aju-cir-${i.id}`} type="button" disabled={!faturaRascunho || !podeEditar} onClick={() => removerItem(i.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] text-rose-800 transition hover:border-rose-500 hover:bg-rose-100 disabled:cursor-default dark:border-rose-700/50 dark:bg-rose-900/20 dark:text-rose-300">
                            <span className="text-[8px]">✓</span>{String(i.descricao ?? "").replace(/^Cirurgia:\s*/, "")}<span className="text-[9px] opacity-60">×</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {cirurgiasPendentes.length > 0 && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Do paciente</p>
                        <div className="flex flex-wrap gap-1">
                          {cirurgiasPendentes.map((c) => {
                            const addKey = `patient-surgery-${c.id}`
                            return (
                              <button key={`cir-pending-${c.id}`} type="button" disabled={addItemButtonDisabled}
                                onClick={() => adicionarItem({ tipo_item: "AJU", descricao: `Cirurgia: ${c.procedimento || c.id_custom || c.id}`, quantidade: 1, preco_unitario: c.preco_estimado || 0, iva_percentual: c.iva_percentual, aplica_iva: c.aplica_iva_por_padrao }, addKey)}
                                className="inline-flex items-center gap-1 rounded-full border border-dashed border-rose-400 bg-rose-50/60 px-2 py-0.5 text-[10px] text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-600/50 dark:bg-rose-900/10 dark:text-rose-400"
                              >+ {c.procedimento || c.id_custom || `Cirurgia ${c.id}`}</button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </section>

            {/* Consultas */}
            <section className={`${GLASS} border-l-4 border-l-amber-500 flex flex-col`}>
              <div className="px-4 pt-3 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 text-[10px] font-bold">Q</span>
                  <span className="text-xs font-semibold text-foreground">Consultas</span>
                  {consultas.length > 0 && <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{consultas.length} disp.</span>}
                </div>
                {consultas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem consultas para este paciente.</p>
                ) : (
                  <CatalogSearchSelect
                    placeholder="Pesquisar e selecionar…"
                    fetcher={buscarConsultas}
                    disabled={addItemButtonDisabled}
                    onSelect={(opt) => adicionarItem({ tipo_item: "CON", consultation: opt.raw.id }, `patient-consultation-${opt.raw.id}`)}
                  />
                )}
              </div>
              {itens.filter(i => i.tipo_item === "CON").length > 0 && (
                <div className="border-t border-white/20 dark:border-white/10 px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {itens.filter(i => i.tipo_item === "CON").map(i => (
                      <button key={i.id} type="button" disabled={!faturaRascunho || !podeEditar} onClick={() => removerItem(i.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-default dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300">
                        <span className="text-[8px]">✓</span>{i.descricao || `Consulta ${i.id}`}<span className="text-[9px] opacity-60">×</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Medicamentos / materiais */}
            <section className={`${GLASS} border-l-4 border-l-indigo-500 flex flex-col`}>
              <div className="px-4 pt-3 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 text-[10px] font-bold">F</span>
                  <span className="text-xs font-semibold text-foreground">Medicamentos / materiais</span>
                </div>
                {produtoStagiado ? (
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 dark:border-indigo-700/40 dark:bg-indigo-900/20 px-3 py-2.5 space-y-2">
                    <p className="text-xs font-medium text-foreground truncate">{produtoStagiado.label}</p>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-muted-foreground shrink-0">Qtd.</label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={produtoStagiado.qty}
                        onChange={(e) => {
                          const v = Math.max(1, parseInt(e.target.value) || 1)
                          setProdutoStagiado((s) => s ? { ...s, qty: v } : s)
                        }}
                        className="w-20 h-7 rounded-md border border-border bg-background px-2 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                      />
                      <button
                        type="button"
                        disabled={addItemButtonDisabled}
                        onClick={() => {
                          const p = produtoStagiado.raw
                          setProdutoStagiado(null)
                          adicionarItem({ tipo_item: "AJU", descricao: `Produto: ${p.nome || p.id_custom || p.id}`, quantidade: produtoStagiado.qty, preco_unitario: p.preco_venda || 0, iva_percentual: p.iva_percentual, aplica_iva: p.aplica_iva_por_padrao }, `catalog-product-${p.id}`)
                        }}
                        className="h-7 rounded-md bg-indigo-600 px-3 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        Adicionar
                      </button>
                      <button
                        type="button"
                        onClick={() => setProdutoStagiado(null)}
                        className="h-7 rounded-md border border-border px-2 text-[11px] text-muted-foreground hover:bg-muted transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <CatalogSearchSelect
                    placeholder="Pesquisar e selecionar…"
                    fetcher={buscarProdutos}
                    disabled={addItemButtonDisabled}
                    onSelect={(opt) => {
                      const p = opt.raw
                      setProdutoStagiado({ raw: p, label: p.nome || p.id_custom || `Produto ${p.id}`, qty: 1 })
                    }}
                  />
                )}
              </div>
              {(() => {
                const adicionados = itens.filter(i =>
                  (i.tipo_item === "AJU" && String(i.descricao).startsWith("Produto:")) ||
                  i.tipo_item === "MAT"
                )
                const pendentesFarmacia = vendas.flatMap((v) =>
                  (vendaItens[v.id] || []).filter((it) => { const id = toNumberId(it.id); return !(id && referenciaIds.itensVenda.has(id)) }).map((it) => ({ v, it }))
                )
                // IDs de produtos já faturados como MAT (para excluir por produto, não só por mat.id)
                const produtosJaAdicionados = new Set(
                  adicionados.map(i => toNumberId(i.produto)).filter((id): id is number => id != null)
                )
                // Materiais de procedimentos pendentes — deduplica por produto (não mat.id) para evitar
                // que o mesmo produto apareça múltiplas vezes quando referenciado por procedimentos distintos
                const pendentesProcedimento = Array.from(
                  new Map(
                    procedimentos.flatMap((p) =>
                      (procedimentoMateriais[p.id] || []).filter((mat) => {
                        const matId = toNumberId(mat.id)
                        const prodId = toNumberId(mat.produto)
                        return matId != null
                          && !referenciaIds.procedimentoMateriais.has(matId)
                          && (prodId == null || !produtosJaAdicionados.has(prodId))
                      }).map((mat) => ({ p, mat }))
                    ).map((entry) => [toNumberId(entry.mat.produto) ?? entry.mat.id, entry])
                  ).values()
                )
                if (!adicionados.length && !pendentesFarmacia.length && !pendentesProcedimento.length) return null
                return (
                  <div className="border-t border-white/20 dark:border-white/10 px-4 py-2.5 space-y-2">
                    {adicionados.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {adicionados.map(i => (
                          <button key={`far-added-${i.id}`} type="button" disabled={!faturaRascunho || !podeEditar} onClick={() => removerItem(i.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-800 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-default dark:border-indigo-700/50 dark:bg-indigo-900/20 dark:text-indigo-300">
                            <span className="text-[8px]">✓</span>{String(i.descricao ?? "").replace(/^Produto:\s*/, "")}{Math.round(Number(i.quantidade)) > 1 ? ` ×${Math.round(Number(i.quantidade))}` : ""}<span className="text-[9px] opacity-60">×</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {pendentesProcedimento.length > 0 && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Do procedimento (enfermagem)</p>
                        {matProcStagiado ? (
                          <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 dark:border-indigo-700/40 dark:bg-indigo-900/20 px-3 py-2.5 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-medium text-foreground truncate">{matProcStagiado.label}</p>
                              {matProcStagiado.unitPrice != null && (
                                <span className="shrink-0 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                                  {matProcStagiado.unitPrice.toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] text-muted-foreground shrink-0">Qtd.</label>
                              <input
                                type="number"
                                min={1}
                                step={1}
                                value={matProcStagiado.qty}
                                onChange={(e) => {
                                  const v = Math.max(1, parseInt(e.target.value) || 1)
                                  setMatProcStagiado((s) => s ? { ...s, qty: v } : s)
                                }}
                                className="w-20 h-7 rounded-md border border-border bg-background px-2 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                              />
                              <button
                                type="button"
                                disabled={addItemButtonDisabled}
                                onClick={() => {
                                  const { matId, qty } = matProcStagiado
                                  setMatProcStagiado(null)
                                  adicionarItem({ tipo_item: "MAT", procedimento_material: matId, quantidade: qty }, `procedure-material-${matId}`)
                                }}
                                className="h-7 rounded-md bg-indigo-600 px-3 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                              >
                                Adicionar
                              </button>
                              <button
                                type="button"
                                onClick={() => setMatProcStagiado(null)}
                                className="h-7 rounded-md border border-border px-2 text-[11px] text-muted-foreground hover:bg-muted transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {pendentesProcedimento.map(({ p, mat }) => {
                              const prod = produtoById.get(toNumberId(mat.produto) ?? mat.produto)
                              const label = prod?.nome || mat.produto_nome || `Material ${mat.produto}`
                              const defaultQty: number = Math.max(1, Number(mat.quantidade) || 1)
                              const rawPrice = mat.unit_cost ?? mat.preco_unitario ?? prod?.preco_venda ?? prod?.preco ?? null
                              const unitPrice: number | null = rawPrice != null && !Number.isNaN(Number(rawPrice)) ? Number(rawPrice) : null
                              return (
                                <button key={`pm-${mat.id}`} type="button" disabled={addItemButtonDisabled}
                                  onClick={() => setMatProcStagiado({ matId: mat.id, label, qty: defaultQty, defaultQty, unitPrice })}
                                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-indigo-400 bg-indigo-50/60 px-2 py-0.5 text-[10px] text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-600/50 dark:bg-indigo-900/10 dark:text-indigo-400"
                                >+ {label}{defaultQty > 1 ? ` ×${defaultQty}` : ""}</button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    {pendentesFarmacia.length > 0 && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Do paciente (farmácia)</p>
                        <div className="flex flex-wrap gap-1">
                          {pendentesFarmacia.map(({ v, it }) => {
                            const prod = produtoById.get(it.produto)
                            const label = prod?.nome || `Produto ${it.produto}`
                            const addKey = `sale-item-${it.id}`
                            return (
                              <button key={`far-pending-${it.id}`} type="button" disabled={addItemButtonDisabled}
                                onClick={() => adicionarItem({ tipo_item: "FAR", item_venda: it.id }, addKey)}
                                className="inline-flex items-center gap-1 rounded-full border border-dashed border-indigo-400 bg-indigo-50/60 px-2 py-0.5 text-[10px] text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-600/50 dark:bg-indigo-900/10 dark:text-indigo-400"
                              >+ {label}</button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </section>

          </div>
        </>) : null}
      </div>
    </AppLayout>
  )
}
