"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import SearchInput from "@/components/ui/SearchInput"
import SelectInput from "@/components/ui/SelectInput"
import TextInput from "@/components/ui/TextInput"
import StatusBadge from "@/components/ui/StatusBadge"
import MoneyValue from "@/components/ui/MoneyValue"
import { apiFetch } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"
import { useAuth } from "@/hooks/useAuth"


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
}

const PAGAMENTO_METODOS = [
  { value: "DIN", label: "Dinheiro" },
  { value: "CAR", label: "Cartão" },
  { value: "TRF", label: "Transferência" },
  { value: "MOB", label: "Mobile Money" },
  { value: "POS", label: "POS" },
  { value: "CHQ", label: "Cheque" },
  { value: "OUT", label: "Outro" },
]

function listFrom(res: any): any[] {
  if (res && (res as any).results) return (res as any).results
  return Array.isArray(res) ? res : []
}

export default function FaturaRascunhoPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const idRaw = routeParamToString((params as any)?.id)
  const faturaId = Number(idRaw)
  const podeEditar = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO])
  const podePagar = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE])

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [fatura, setFatura] = useState<Row | null>(null)
  const [paciente, setPaciente] = useState<Row | null>(null)
  const [itens, setItens] = useState<FaturaItem[]>([])
  const [acaoId, setAcaoId] = useState<number | null>(null)

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

  const [searchExame, setSearchExame] = useState<Row[]>([])
  const [searchExameMedico, setSearchExameMedico] = useState<Row[]>([])
  const [searchProcedimentoCatalogo, setSearchProcedimentoCatalogo] = useState<Row[]>([])
  const [searchProcedimentoCirurgico, setSearchProcedimentoCirurgico] = useState<Row[]>([])
  const [searchProduto, setSearchProduto] = useState<Row[]>([])

  const [pagamentoMetodo, setPagamentoMetodo] = useState("DIN")
  const [pagamentoValor, setPagamentoValor] = useState("")
  const [recibo, setRecibo] = useState<Row | null>(null)

  const faturaRascunho = fatura?.estado === "RASC"

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

  const carregarItens = useCallback(async (fatId: number) => {
    try {
      const res = await apiFetch<any>(`/faturamento/faturaitem/?fatura=${fatId}`)
      const lista = listFrom(res)
      setItens(lista as FaturaItem[])
    } catch (e: any) {
      setErro(e?.message || "Falha ao carregar itens da fatura.")
      setItens([])
    }
  }, [])

  const carregarRecibo = useCallback(async (fatId: number) => {
    try {
      const res = await apiFetch<any>(`/pagamentos/recibo/?fatura=${fatId}`)
      const lista = listFrom(res)
      setRecibo(lista.length ? lista[0] : null)
    } catch {
      setRecibo(null)
    }
  }, [])

  const carregarCatalogos = useCallback(async () => {
    try {
      const [exs, exsMed, prods] = await Promise.all([
        apiFetch<any>("/exames/"),
        apiFetch<any>("/clinico/examemedico/"),
        apiFetch<any>("/farmacia/produto/"),
      ])
      setExames(listFrom(exs))
      setExamesMedicos(listFrom(exsMed))
      setProdutos(listFrom(prods))
    } catch {
      // silencioso
    }
  }, [])

  const carregarRecursosPaciente = useCallback(async (pacienteId: number) => {
    try {
      const [reqRes, procRes, vendaRes, cirRes, consRes] = await Promise.all([
        apiFetch<any>(`/requisicoes/?paciente=${pacienteId}`),
        apiFetch<any>(`/enfermagem/procedimento/?paciente=${pacienteId}`),
        apiFetch<any>(`/farmacia/venda/?paciente=${pacienteId}`),
        apiFetch<any>(`/cirurgia/cirurgia/?paciente=${pacienteId}`),
        apiFetch<any>(`/consultas/consulta/?paciente=${pacienteId}`),
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
        reqs.map((r) => apiFetch<any>(`/clinico/requisicaoitem/?requisicao=${r.id}`))
      )
      const reqMap: Record<number, Row[]> = {}
      reqs.forEach((r, idx) => {
        reqMap[r.id] = listFrom(reqItemsPairs[idx])
      })
      setRequisicaoItens(reqMap)

      const procItemPairs = await Promise.all(
        procs.map((p) => apiFetch<any>(`/enfermagem/procedimentoitem/?procedimento=${p.id}`))
      )
      const procMatPairs = await Promise.all(
        procs.map((p) => apiFetch<any>(`/enfermagem/procedimentomaterial/?procedimento=${p.id}`))
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
        vendasList.map((v) => apiFetch<any>(`/farmacia/itemvenda/?venda=${v.id}`))
      )
      const vendaMap: Record<number, Row[]> = {}
      vendasList.forEach((v, idx) => {
        vendaMap[v.id] = listFrom(vendaItemPairs[idx])
      })
      setVendaItens(vendaMap)
    } catch (e: any) {
      setErro(e?.message || "Falha ao carregar itens do paciente.")
    }
  }, [])

  const carregarFatura = useCallback(async () => {
    if (!faturaId || Number.isNaN(faturaId)) return
    setLoading(true)
    setErro(null)
    try {
      const fat = await apiFetch<any>(`/faturas/${faturaId}/`)
      setFatura(fat)

      if (fat?.paciente) {
        const pac = await apiFetch<any>(`/pacientes/${fat.paciente}/`)
        setPaciente(pac)
        if (podeEditar) {
          await carregarRecursosPaciente(fat.paciente)
        }
      } else {
        setPaciente(null)
      }

      await carregarItens(faturaId)
      await carregarRecibo(faturaId)
      if (podeEditar) {
        await carregarCatalogos()
      }

      if (fat?.total && !pagamentoValor) {
        setPagamentoValor(String(fat.total))
      }
    } catch (e: any) {
      setErro(e?.message || "Falha ao carregar fatura.")
    } finally {
      setLoading(false)
    }
  }, [carregarCatalogos, carregarItens, carregarRecibo, carregarRecursosPaciente, faturaId, pagamentoValor, podeEditar])

  useEffect(() => {
    carregarFatura()
  }, [carregarFatura])

  const adicionarItem = useCallback(async (payload: any) => {
    if (!faturaId || Number.isNaN(faturaId)) return
    if (!podeEditar) {
      setErro("Sem permissão para adicionar itens.")
      return
    }
    if (!faturaRascunho) {
      setErro("Somente rascunhos podem receber itens.")
      return
    }
    try {
      setErro(null)
      await apiFetch("/faturamento/faturaitem/", {
        method: "POST",
        body: JSON.stringify({ ...payload, fatura: faturaId }),
      })
      await carregarItens(faturaId)
      const fat = await apiFetch<any>(`/faturas/${faturaId}/`)
      setFatura(fat)
    } catch (e: any) {
      setErro(e?.message || "Falha ao adicionar item.")
    }
  }, [carregarItens, faturaId, faturaRascunho, podeEditar])

  const removerItem = useCallback(async (itemId: number) => {
    if (!podeEditar) {
      setErro("Sem permissão para remover itens.")
      return
    }
    if (!faturaRascunho) {
      setErro("Somente rascunhos podem ser alterados.")
      return
    }
    if (!confirm("Remover item da fatura?")) return
    try {
      await apiFetch(`/faturamento/faturaitem/${itemId}/`, { method: "DELETE" })
      if (faturaId) await carregarItens(faturaId)
    } catch (e: any) {
      setErro(e?.message || "Falha ao remover item.")
    }
  }, [carregarItens, faturaId, faturaRascunho, podeEditar])

  const toggleIva = useCallback(async (item: FaturaItem) => {
    if (!item?.id) return
    if (!podeEditar) {
      setErro("Sem permissão para alterar IVA.")
      return
    }
    try {
      await apiFetch(`/faturamento/faturaitem/${item.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ aplica_iva: !item.aplica_iva }),
      })
      if (faturaId) await carregarItens(faturaId)
    } catch (e: any) {
      setErro(e?.message || "Falha ao atualizar IVA do item.")
    }
  }, [carregarItens, faturaId, podeEditar])

  const emitirFatura = useCallback(async () => {
    if (!faturaId) return
    if (!podeEditar) {
      setErro("Sem permissão para emitir fatura.")
      return
    }
    try {
      setAcaoId(faturaId)
      await apiFetch(`/faturas/${faturaId}/emitir/`, { method: "POST" })
      await carregarFatura()
    } catch (e: any) {
      setErro(e?.message || "Falha ao emitir fatura.")
    } finally {
      setAcaoId(null)
    }
  }, [carregarFatura, faturaId, podeEditar])

  const pagarFatura = useCallback(async () => {
    if (!faturaId) return
    if (!podePagar) {
      setErro("Sem permissão para registrar pagamento.")
      return
    }
    if (!pagamentoValor) {
      setErro("Informe o valor do pagamento.")
      return
    }
    try {
      setAcaoId(faturaId)
      await apiFetch("/pagamentos/pagamento/", {
        method: "POST",
        body: JSON.stringify({
          fatura: faturaId,
          valor: pagamentoValor,
          metodo: pagamentoMetodo,
          status: "CON",
        }),
      })
      await carregarFatura()
      await carregarRecibo(faturaId)
    } catch (e: any) {
      setErro(e?.message || "Falha ao registrar pagamento.")
    } finally {
      setAcaoId(null)
    }
  }, [carregarFatura, carregarRecibo, faturaId, pagamentoMetodo, pagamentoValor, podePagar])

  const baixarPdfFatura = useCallback(async () => {
    if (!faturaId) return
    try {
      const blob = await apiFetch<Blob>(`/faturas/${faturaId}/pdf/`, {
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
      setErro(e?.message || "Falha ao gerar PDF da fatura.")
    }
  }, [faturaId])

  const baixarPdfRecibo = useCallback(async () => {
    if (!recibo?.id) return
    try {
      const blob = await apiFetch<Blob>(`/pagamentos/recibo/${recibo.id}/pdf/`, {
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
      setErro(e?.message || "Falha ao gerar PDF do recibo.")
    }
  }, [recibo])

  const buscarExames = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchExame([])
      return
    }
    try {
      const res = await apiFetch<any>(`/exames/?search=${encodeURIComponent(q)}`)
      setSearchExame(listFrom(res))
    } catch {
      setSearchExame([])
    }
  }, [])

  const buscarExamesMedicos = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchExameMedico([])
      return
    }
    try {
      const res = await apiFetch<any>(`/clinico/examemedico/?search=${encodeURIComponent(q)}`)
      setSearchExameMedico(listFrom(res))
    } catch {
      setSearchExameMedico([])
    }
  }, [])

  const buscarProcedimentosCatalogo = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchProcedimentoCatalogo([])
      return
    }
    try {
      const res = await apiFetch<any>(`/enfermagem/procedimentocatalogo/?search=${encodeURIComponent(q)}`)
      setSearchProcedimentoCatalogo(listFrom(res))
    } catch {
      setSearchProcedimentoCatalogo([])
    }
  }, [])

  const buscarProcedimentosCirurgicos = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchProcedimentoCirurgico([])
      return
    }
    try {
      const res = await apiFetch<any>(`/cirurgia/procedimentocirurgico/?search=${encodeURIComponent(q)}`)
      setSearchProcedimentoCirurgico(listFrom(res))
    } catch {
      setSearchProcedimentoCirurgico([])
    }
  }, [])

  const buscarProdutos = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchProduto([])
      return
    }
    try {
      const res = await apiFetch<any>(`/farmacia/produto/?search=${encodeURIComponent(q)}`)
      setSearchProduto(listFrom(res))
    } catch {
      setSearchProduto([])
    }
  }, [])

  const itensCols = useMemo(
    () => [
      { header: "Descrição", render: (i: FaturaItem) => i.descricao || `Item ${i.id}` },
      { header: "Qtd", render: (i: FaturaItem) => i.quantidade || 1 },
      { header: "Preço", render: (i: FaturaItem) => <MoneyValue value={i.preco_unitario} /> },
      { header: "Total", render: (i: FaturaItem) => <MoneyValue value={i.total_com_iva} /> },
      {
        header: "IVA",
        render: (i: FaturaItem) => (
          <label className="flex items-center gap-2 text-xs text-gray-700">
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
          <button
            className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
            onClick={() => removerItem(i.id)}
            disabled={!faturaRascunho || !podeEditar}
          >
            Remover
          </button>
        ),
      },
    ],
    [faturaRascunho, removerItem, toggleIva, podeEditar]
  )

  if (loading) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE]}>
        <div className="text-sm text-gray-500">Carregando...</div>
      </AppLayout>
    )
  }

  if (!fatura) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE]}>
        <div className="text-sm text-gray-500">Fatura não encontrada.</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE]}>
      <div className="space-y-6">
        <PageHeader
          title={`Fatura ${fatura.id_custom || fatura.id}`}
          subtitle={
            paciente
              ? `${paciente.nome || "Paciente"} · ${paciente.id_custom || paciente.id}`
              : "Sem paciente"
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={fatura.estado} />
              <button
                className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                onClick={() => router.push("/faturas")}
              >
                Voltar
              </button>
            </div>
          }
        />

        {erro ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        <Card title="Resumo" subtitle="Fluxo: rascunho → emitir → pagar → recibo.">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-100 bg-white p-3 text-sm">
              <div className="text-xs text-gray-500">Subtotal</div>
              <div className="text-base font-semibold text-gray-900"><MoneyValue value={fatura.subtotal} /></div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-white p-3 text-sm">
              <div className="text-xs text-gray-500">IVA</div>
              <div className="text-base font-semibold text-gray-900"><MoneyValue value={fatura.iva_valor} /></div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-white p-3 text-sm">
              <div className="text-xs text-gray-500">Total</div>
              <div className="text-base font-semibold text-gray-900"><MoneyValue value={fatura.total} /></div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {faturaRascunho && podeEditar ? (
              <button
                className="inline-flex items-center rounded-lg bg-[var(--primary-600)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:opacity-50"
                onClick={emitirFatura}
                disabled={acaoId === fatura.id}
              >
                Emitir fatura
              </button>
            ) : null}
            {faturaRascunho && !podeEditar ? (
              <div className="text-xs text-amber-700">Sem permissão para emitir fatura.</div>
            ) : null}

            {fatura.estado === "EMIT" ? (
              <div className="text-sm text-sky-700">Aguardando pagamento</div>
            ) : null}

            <button
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              onClick={baixarPdfFatura}
            >
              PDF da fatura
            </button>

            {recibo ? (
              <button
                className="inline-flex items-center rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                onClick={baixarPdfRecibo}
              >
                PDF do recibo
              </button>
            ) : null}
          </div>
        </Card>

        <Card title="Itens da fatura" subtitle="Adicione itens enquanto estiver em rascunho.">
          {!podeEditar ? (
            <div className="mb-3 text-xs text-gray-500">Somente leitura para este perfil.</div>
          ) : null}
          {itens.length === 0 ? (
            <div className="text-sm text-gray-500">Nenhum item adicionado.</div>
          ) : (
            <DataTable<FaturaItem> columns={itensCols as any} data={itens} />
          )}
        </Card>

        <Card title="Registrar pagamento" subtitle="Disponível após emissão da fatura.">
          {fatura.estado !== "EMIT" ? (
            <div className="text-sm text-gray-500">Emita a fatura para liberar o pagamento.</div>
          ) : !podePagar ? (
            <div className="text-sm text-gray-500">Sem permissão para registrar pagamento.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">Método</label>
                <SelectInput
                  value={pagamentoMetodo}
                  onChange={(e) => setPagamentoMetodo(e.target.value)}
                  options={PAGAMENTO_METODOS}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Valor</label>
                <TextInput
                  value={pagamentoValor}
                  onChange={(e) => setPagamentoValor(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="flex items-end">
                <button
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  onClick={pagarFatura}
                  disabled={acaoId === fatura.id}
                >
                  Confirmar pagamento
                </button>
              </div>
            </div>
          )}
        </Card>

        <Card title="Itens do paciente" subtitle="Requisições, procedimentos, vendas e cirurgias.">
          {!podeEditar ? (
            <div className="text-sm text-gray-500">Sem permissão para adicionar itens do paciente.</div>
          ) : (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-800">Requisições (exames)</div>
              {requisicoes.length === 0 ? (
                <div className="text-sm text-gray-500">Sem requisições.</div>
              ) : (
                <div className="space-y-2">
                  {requisicoes.map((r) => (
                    <div key={r.id} className="rounded-lg border border-slate-100 bg-white p-3 text-sm">
                      <div className="font-semibold text-gray-800">{r.id_custom || `REQ ${r.id}`}</div>
                      <div className="text-xs text-gray-500">Tipo: {r.tipo || "-"}</div>
                      <div className="mt-2 space-y-1">
                        {(requisicaoItens[r.id] || []).map((it) => {
                          const exame = it.exame ? exameById.get(it.exame) : null
                          const exameMed = it.exame_medico ? exameMedById.get(it.exame_medico) : null
                          const label = exame?.nome || exameMed?.nome || (it.exame ? `Exame ${it.exame}` : `Exame médico ${it.exame_medico}`)
                          return (
                            <div key={it.id} className="flex items-center justify-between gap-2">
                              <div className="text-gray-700">{label}</div>
                              <button
                                className="inline-flex items-center rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                                onClick={() => {
                                  if (it.exame) {
                                    adicionarItem({ tipo_item: "EXA", exame: it.exame })
                                  } else if (it.exame_medico) {
                                    adicionarItem({ tipo_item: "EXM", exame_medico: it.exame_medico })
                                  }
                                }}
                                disabled={!faturaRascunho}
                              >
                                Adicionar
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-800">Procedimentos (enfermagem)</div>
              {procedimentos.length === 0 ? (
                <div className="text-sm text-gray-500">Sem procedimentos.</div>
              ) : (
                <div className="space-y-2">
                  {procedimentos.map((p) => (
                    <div key={p.id} className="rounded-lg border border-slate-100 bg-white p-3 text-sm">
                      <div className="font-semibold text-gray-800">{p.id_custom || `PROC ${p.id}`}</div>
                      <div className="text-xs text-gray-500">Total: <MoneyValue value={p.total} /></div>
                      <div className="mt-2 space-y-1">
                        {(procedimentoItens[p.id] || []).map((it) => (
                          <div key={it.id} className="flex items-center justify-between gap-2">
                            <div className="text-gray-700">{it.descricao || `Serviço ${it.id}`}</div>
                            <button
                              className="inline-flex items-center rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                              onClick={() => adicionarItem({ tipo_item: "PRC", procedimento_item: it.id })}
                              disabled={!faturaRascunho}
                            >
                              Adicionar
                            </button>
                          </div>
                        ))}
                        {(procedimentoMateriais[p.id] || []).map((mat) => {
                          const prod = produtoById.get(mat.produto)
                          const nome = prod?.nome || `Material ${mat.produto}`
                          return (
                            <div key={mat.id} className="flex items-center justify-between gap-2">
                              <div className="text-gray-700">{nome}</div>
                              <button
                                className="inline-flex items-center rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                                onClick={() => adicionarItem({ tipo_item: "MAT", procedimento_material: mat.id })}
                                disabled={!faturaRascunho}
                              >
                                Adicionar
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-800">Vendas (farmácia)</div>
              {vendas.length === 0 ? (
                <div className="text-sm text-gray-500">Sem vendas.</div>
              ) : (
                <div className="space-y-2">
                  {vendas.map((v) => (
                    <div key={v.id} className="rounded-lg border border-slate-100 bg-white p-3 text-sm">
                      <div className="font-semibold text-gray-800">{v.numero || v.id_custom || `VENDA ${v.id}`}</div>
                      <div className="text-xs text-gray-500">Total: <MoneyValue value={v.total} /></div>
                      <div className="mt-2 space-y-1">
                        {(vendaItens[v.id] || []).map((it) => {
                          const prod = produtoById.get(it.produto)
                          return (
                            <div key={it.id} className="flex items-center justify-between gap-2">
                              <div className="text-gray-700">{prod?.nome || `Produto ${it.produto}`}</div>
                              <button
                                className="inline-flex items-center rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                                onClick={() => adicionarItem({ tipo_item: "FAR", item_venda: it.id })}
                                disabled={!faturaRascunho}
                              >
                                Adicionar
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-800">Cirurgias</div>
              {cirurgias.length === 0 ? (
                <div className="text-sm text-gray-500">Sem cirurgias.</div>
              ) : (
                <div className="space-y-2">
                  {cirurgias.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white p-3 text-sm">
                      <div className="text-gray-700">{c.procedimento || c.id_custom || `Cirurgia ${c.id}`}</div>
                      <button
                        className="inline-flex items-center rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                        onClick={() => adicionarItem({
                          tipo_item: "AJU",
                          descricao: `Cirurgia: ${c.procedimento || c.id_custom || c.id}`,
                          quantidade: 1,
                          preco_unitario: c.preco_estimado || 0,
                          iva_percentual: c.iva_percentual,
                          aplica_iva: c.aplica_iva_por_padrao,
                        })}
                        disabled={!faturaRascunho}
                      >
                        Adicionar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-800">Consultas</div>
              {consultas.length === 0 ? (
                <div className="text-sm text-gray-500">Sem consultas.</div>
              ) : (
                <div className="space-y-2">
                  {consultas.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white p-3 text-sm">
                      <div className="text-gray-700">{c.tipo || c.id_custom || `Consulta ${c.id}`}</div>
                      <button
                        className="inline-flex items-center rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                        onClick={() => adicionarItem({
                          tipo_item: "AJU",
                          descricao: `Consulta: ${c.tipo || c.id_custom || c.id}`,
                          quantidade: 1,
                          preco_unitario: c.preco || 0,
                          iva_percentual: c.iva_percentual,
                          aplica_iva: true,
                        })}
                        disabled={!faturaRascunho}
                      >
                        Adicionar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}
        </Card>

        <Card title="Pesquisa de catálogo" subtitle="Busque e adicione itens avulsos.">
          {!podeEditar ? (
            <div className="text-sm text-gray-500">Sem permissão para pesquisar catálogo.</div>
          ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-800">Exames laboratoriais</div>
              <SearchInput placeholder="Pesquisar exames" onSearch={buscarExames} />
              <div className="space-y-2">
                {searchExame.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm">
                    <div className="text-gray-700">{e.nome || e.id_custom || `Exame ${e.id}`}</div>
                    <button
                      className="inline-flex items-center rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                      onClick={() => adicionarItem({ tipo_item: "EXA", exame: e.id })}
                      disabled={!faturaRascunho}
                    >
                      Adicionar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-800">Exames médicos</div>
              <SearchInput placeholder="Pesquisar exames médicos" onSearch={buscarExamesMedicos} />
              <div className="space-y-2">
                {searchExameMedico.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm">
                    <div className="text-gray-700">{e.nome || e.id_custom || `Exame ${e.id}`}</div>
                    <button
                      className="inline-flex items-center rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                      onClick={() => adicionarItem({ tipo_item: "EXM", exame_medico: e.id })}
                      disabled={!faturaRascunho}
                    >
                      Adicionar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-800">Procedimentos (catálogo)</div>
              <SearchInput placeholder="Pesquisar procedimentos" onSearch={buscarProcedimentosCatalogo} />
              <div className="space-y-2">
                {searchProcedimentoCatalogo.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm">
                    <div className="text-gray-700">{p.nome || p.id_custom || `Procedimento ${p.id}`}</div>
                    <button
                      className="inline-flex items-center rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                      onClick={() => adicionarItem({
                        tipo_item: "AJU",
                        descricao: `Procedimento: ${p.nome || p.id_custom || p.id}`,
                        quantidade: 1,
                        preco_unitario: p.preco_padrao || 0,
                        iva_percentual: p.iva_percentual,
                        aplica_iva: p.aplica_iva_por_padrao,
                      })}
                      disabled={!faturaRascunho}
                    >
                      Adicionar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-800">Procedimentos cirúrgicos</div>
              <SearchInput placeholder="Pesquisar cirurgias" onSearch={buscarProcedimentosCirurgicos} />
              <div className="space-y-2">
                {searchProcedimentoCirurgico.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm">
                    <div className="text-gray-700">{p.nome || p.id_custom || `Cirurgia ${p.id}`}</div>
                    <button
                      className="inline-flex items-center rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                      onClick={() => adicionarItem({
                        tipo_item: "AJU",
                        descricao: `Cirurgia: ${p.nome || p.id_custom || p.id}`,
                        quantidade: 1,
                        preco_unitario: p.preco_base || 0,
                        iva_percentual: p.iva_percentual,
                        aplica_iva: p.aplica_iva_por_padrao,
                      })}
                      disabled={!faturaRascunho}
                    >
                      Adicionar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-800">Medicamentos / materiais</div>
              <SearchInput placeholder="Pesquisar produtos" onSearch={buscarProdutos} />
              <div className="space-y-2">
                {searchProduto.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm">
                    <div className="text-gray-700">{p.nome || p.id_custom || `Produto ${p.id}`}</div>
                    <button
                      className="inline-flex items-center rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                      onClick={() => adicionarItem({
                        tipo_item: "AJU",
                        descricao: `Produto: ${p.nome || p.id_custom || p.id}`,
                        quantidade: 1,
                        preco_unitario: p.preco_venda || 0,
                        iva_percentual: p.iva_percentual,
                        aplica_iva: p.aplica_iva_por_padrao,
                      })}
                      disabled={!faturaRascunho}
                    >
                      Adicionar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
