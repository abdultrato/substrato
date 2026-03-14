"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { FileDown, FlaskConical, Loader2 } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import Card from "@/components/ui/Card"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type LabResultadoItem = {
  id: number
  id_custom?: string | null
  estado: "pendente" | "em_analise" | "aguardando_validacao" | "validado" | "rejeitado" | string
  resultado_valor: string | number | null
  status_clinico?: string | null
  alerta_critico?: boolean
  data_validacao?: string | null

  exame_nome?: string | null
  exame_campo_nome?: string | null
  exame_campo_unidade?: string | null
  exame_campo_referencia?: string | null
}

type ResultadoItensResponse = {
  requisicao: {
    id: number
    id_custom: string
    paciente: number
    paciente_nome: string
    estado: string
    status_clinico: string
    possui_resultado_critico: boolean
  }
  resumo: Record<string, number>
  itens: LabResultadoItem[]
}

async function abrirPdfResultados(requisicaoId: number) {
  const blob = await apiFetch<Blob>(`/requisicoes/${requisicaoId}/pdf_resultados/`, {
    responseType: "blob",
  })
  const url = window.URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener,noreferrer")
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
}

function toKey(v: any): string {
  return v == null ? "" : String(v)
}

export default function LaboratorioRequisicaoResultadosPage() {
  const params = useParams() as any
  const idRaw = params?.id
  const requisicaoId = Number(Array.isArray(idRaw) ? idRaw[0] : idRaw)

  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [requisicao, setRequisicao] = useState<ResultadoItensResponse["requisicao"] | null>(null)
  const [itens, setItens] = useState<LabResultadoItem[]>([])

  const [draft, setDraft] = useState<Record<string, string>>({})
  const [busyAll, setBusyAll] = useState<null | "lancar" | "gravar" | "validar">(null)
  const [busyRow, setBusyRow] = useState<Record<string, boolean>>({})

  async function load() {
    if (!requisicaoId || Number.isNaN(requisicaoId)) return

    try {
      setLoading(true)
      setErro(null)

      const res = await apiFetch<ResultadoItensResponse>(`/requisicoes/${requisicaoId}/resultado_itens/`)

      setRequisicao(res.requisicao)
      setItens(Array.isArray(res.itens) ? res.itens : [])

      // Initialize draft inputs from saved values (or empty).
      const next: Record<string, string> = {}
      for (const it of res.itens || []) {
        next[toKey(it.id)] = it.resultado_valor == null ? "" : String(it.resultado_valor)
      }
      setDraft(next)
    } catch (e: any) {
      setErro(e?.message || "Falha ao carregar resultados da requisição.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requisicaoId])

  const resumo = useMemo(() => {
    const acc = { pendente: 0, em_analise: 0, aguardando_validacao: 0, validado: 0, rejeitado: 0, total: 0 }
    for (const it of itens) {
      acc.total += 1
      const k = String(it.estado || "").toLowerCase() as keyof typeof acc
      if (k in acc) (acc as any)[k] += 1
    }
    return acc
  }, [itens])

  const temValidado = resumo.validado > 0
  const podeLancarTudo = !busyAll && itens.some((it) => it.estado === "pendente" || it.estado === "rejeitado")
  const podeGravarTudo =
    !busyAll &&
    resumo.pendente === 0 &&
    resumo.rejeitado === 0 &&
    itens.some((it) => it.estado === "em_analise")
  const podeValidarTudo =
    !busyAll &&
    resumo.pendente === 0 &&
    resumo.em_analise === 0 &&
    resumo.rejeitado === 0 &&
    itens.some((it) => it.estado === "aguardando_validacao")

  const grupos = useMemo(() => {
    const map = new Map<string, LabResultadoItem[]>()
    for (const it of itens) {
      const exame = (it.exame_nome || "Exame").toString()
      const arr = map.get(exame) || []
      arr.push(it)
      map.set(exame, arr)
    }
    return Array.from(map.entries())
  }, [itens])

  function setRowBusy(id: number, v: boolean) {
    setBusyRow((prev) => ({ ...prev, [toKey(id)]: v }))
  }

  function updateItem(next: LabResultadoItem) {
    setItens((prev) => prev.map((p) => (p.id === next.id ? next : p)))
    setDraft((prev) => ({
      ...prev,
      [toKey(next.id)]: next.resultado_valor == null ? "" : String(next.resultado_valor),
    }))
  }

  async function lancarItem(id: number) {
    setRowBusy(id, true)
    try {
      const updated = await apiFetch<LabResultadoItem>(`/clinico/resultadoitem/${id}/lancar/`, {
        method: "POST",
      })
      updateItem(updated)
    } finally {
      setRowBusy(id, false)
    }
  }

  async function gravarItem(id: number) {
    const value = (draft[toKey(id)] || "").trim()
    if (!value) throw new Error("Informe um valor antes de gravar.")

    setRowBusy(id, true)
    try {
      const updated = await apiFetch<LabResultadoItem>(`/clinico/resultadoitem/${id}/gravar/`, {
        method: "POST",
        body: JSON.stringify({ resultado_valor: value }),
      })
      updateItem(updated)
    } finally {
      setRowBusy(id, false)
    }
  }

  async function validarItem(id: number) {
    setRowBusy(id, true)
    try {
      const updated = await apiFetch<LabResultadoItem>(`/clinico/resultadoitem/${id}/validar/`, {
        method: "POST",
      })
      updateItem(updated)
    } finally {
      setRowBusy(id, false)
    }
  }

  async function lancarTudo() {
    try {
      setBusyAll("lancar")
      setErro(null)
      for (const it of itens) {
        if (it.estado !== "pendente" && it.estado !== "rejeitado") continue
        await lancarItem(it.id)
      }
    } catch (e: any) {
      setErro(e?.message || "Falha ao lançar itens.")
    } finally {
      setBusyAll(null)
    }
  }

  async function gravarTudo() {
    try {
      setBusyAll("gravar")
      setErro(null)

      if (resumo.pendente > 0 || resumo.rejeitado > 0) {
        throw new Error("Lance todos os itens antes de gravar.")
      }

      for (const it of itens) {
        if (it.estado !== "em_analise") continue
        const value = (draft[toKey(it.id)] || "").trim()
        if (!value) throw new Error("Não é possível gravar: existe resultado vazio.")
      }

      for (const it of itens) {
        if (it.estado !== "em_analise") continue
        await gravarItem(it.id)
      }
    } catch (e: any) {
      setErro(e?.message || "Falha ao gravar resultados.")
    } finally {
      setBusyAll(null)
    }
  }

  async function validarTudo() {
    try {
      setBusyAll("validar")
      setErro(null)

      if (resumo.pendente > 0 || resumo.em_analise > 0 || resumo.rejeitado > 0) {
        throw new Error("Grave todos os resultados antes de validar.")
      }

      for (const it of itens) {
        if (it.estado !== "aguardando_validacao") continue
        await validarItem(it.id)
      }
    } catch (e: any) {
      setErro(e?.message || "Falha ao validar resultados.")
    } finally {
      setBusyAll(null)
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="space-y-6">
        <PageHeader
          title="Lançar resultados"
          subtitle={requisicao ? `${requisicao.id_custom} · ${requisicao.paciente_nome}` : "Carregando..."}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/laboratorio/requisicoes"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <FlaskConical size={16} />
                Voltar
              </Link>

              <button
                type="button"
                onClick={lancarTudo}
                disabled={!podeLancarTudo}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                {busyAll === "lancar" ? <Loader2 className="animate-spin" size={16} /> : null}
                1. Lançar
              </button>

              <button
                type="button"
                onClick={gravarTudo}
                disabled={!podeGravarTudo}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                {busyAll === "gravar" ? <Loader2 className="animate-spin" size={16} /> : null}
                2. Gravar
              </button>

              <button
                type="button"
                onClick={validarTudo}
                disabled={!podeValidarTudo}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                {busyAll === "validar" ? <Loader2 className="animate-spin" size={16} /> : null}
                3. Validar
              </button>

              <button
                type="button"
                onClick={() => (requisicao ? abrirPdfResultados(requisicao.id) : null)}
                disabled={!requisicao || !temValidado}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                title={!temValidado ? "Precisa ter pelo menos 1 resultado validado." : "Gerar PDF (somente validados)"}
              >
                <FileDown size={16} />
                PDF
              </button>
            </div>
          }
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Pendentes</div>
              <div className="text-2xl font-semibold text-slate-900">{resumo.pendente}</div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Em análise</div>
              <div className="text-2xl font-semibold text-slate-900">{resumo.em_analise}</div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Aguardando validação</div>
              <div className="text-2xl font-semibold text-slate-900">{resumo.aguardando_validacao}</div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Validados</div>
              <div className="text-2xl font-semibold text-slate-900">{resumo.validado}</div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Total</div>
              <div className="text-2xl font-semibold text-slate-900">{resumo.total}</div>
            </div>
          </div>
        )}

        {!loading ? (
          <div className="space-y-4">
            {grupos.map(([exame, rows]) => (
              <Card key={exame} title={exame} subtitle={`${rows.length} parâmetros`}>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                        <th className="py-2 pr-3">Parâmetro</th>
                        <th className="py-2 pr-3">Unidade</th>
                        <th className="py-2 pr-3">Referência</th>
                        <th className="py-2 pr-3">Resultado</th>
                        <th className="py-2 pr-3">Estado</th>
                        <th className="py-2 pr-0">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const id = toKey(r.id)
                        const isBusy = !!busyRow[id]
                        const isEditable = r.estado === "em_analise"
                        const draftValue = draft[id] ?? ""
                        const canGravar = isEditable && !isBusy && !busyAll && !!draftValue.trim()
                        const canLancar = (r.estado === "pendente" || r.estado === "rejeitado") && !isBusy && !busyAll
                        const canValidar = r.estado === "aguardando_validacao" && !isBusy && !busyAll

                        return (
                          <tr key={r.id} className="border-b border-slate-100 last:border-b-0">
                            <td className="py-2 pr-3">
                              <div className="font-medium text-slate-900">{r.exame_campo_nome || "-"}</div>
                              {r.alerta_critico ? (
                                <div className="text-xs text-rose-600">Crítico</div>
                              ) : r.status_clinico ? (
                                <div className="text-xs text-slate-500">Status: {r.status_clinico}</div>
                              ) : null}
                            </td>
                            <td className="py-2 pr-3 text-slate-700">{r.exame_campo_unidade || "-"}</td>
                            <td className="py-2 pr-3 text-slate-700">{r.exame_campo_referencia || "-"}</td>
                            <td className="py-2 pr-3">
                              <input
                                value={draftValue}
                                onChange={(e) => setDraft((p) => ({ ...p, [id]: e.target.value }))}
                                disabled={!isEditable || !!busyAll}
                                inputMode="decimal"
                                className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm disabled:bg-slate-50 disabled:text-slate-500"
                                placeholder={isEditable ? "Digite..." : "-"}
                              />
                            </td>
                            <td className="py-2 pr-3 text-slate-700">{r.estado || "-"}</td>
                            <td className="py-2 pr-0">
                              <div className="flex items-center gap-2">
                                {isBusy ? (
                                  <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                                    <Loader2 className="animate-spin" size={14} />
                                    Processando
                                  </span>
                                ) : null}

                                {canLancar ? (
                                  <button
                                    type="button"
                                    onClick={() => lancarItem(r.id).catch((e: any) => setErro(e?.message || String(e)))}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                                  >
                                    Lançar
                                  </button>
                                ) : null}

                                {isEditable ? (
                                  <button
                                    type="button"
                                    disabled={!canGravar}
                                    onClick={() => gravarItem(r.id).catch((e: any) => setErro(e?.message || String(e)))}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                                  >
                                    Gravar
                                  </button>
                                ) : null}

                                {canValidar ? (
                                  <button
                                    type="button"
                                    onClick={() => validarItem(r.id).catch((e: any) => setErro(e?.message || String(e)))}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                                  >
                                    Validar
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
