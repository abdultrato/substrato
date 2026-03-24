"use client"

import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch, apiFetchList } from "@/lib/api"
import {
  getTiposResultadoMedicoPorMetodo,
  tipoResultadoMedicoAcceptMap,
  tipoResultadoMedicoOptions,
} from "@/lib/constants/exame-medico"
import { GROUPS } from "@/lib/rbac"

type RequisicaoResumo = {
  id: number
  id_custom?: string
  tipo: string
  resultado?: { id: number }
}

type ExameMedicoResumo = {
  id: number
  nome?: string
  metodo?: string
  tipos_resultado_permitidos?: string[]
  tipos_resultado_cadastrados?: string[]
}

type ArquivoRow = {
  id: number
  id_custom?: string
  resultado?: number
  exame_medico?: number
  exame_medico_nome?: string
  tipo?: string
  descricao?: string
  arquivo?: string
  criado_em?: string
  requisicao?: number
}

function fmtDate(value: any): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

export default function ResultadosMedicosPage() {
  const [arquivos, setArquivos] = useState<ArquivoRow[]>([])
  const [exames, setExames] = useState<ExameMedicoResumo[]>([])
  const [requisicoes, setRequisicoes] = useState<RequisicaoResumo[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    requisicaoId: "",
    exameMedicoId: "",
    tipo: tipoResultadoMedicoOptions[0].value,
    descricao: "",
  })

  useEffect(() => {
    loadExames()
    loadRequisicoes()
    loadArquivos()
  }, [])

  async function loadArquivos() {
    try {
      const { items } = await apiFetchList<ArquivoRow>("/clinico/resultadomedicoarquivo/", {
        page: 1,
        pageSize: 50,
      })
      setArquivos(items)
    } catch (e: any) {
      setErro(e?.message || "Falha ao carregar anexos médicos.")
    }
  }

  async function loadExames() {
    try {
      const res = await apiFetchList<ExameMedicoResumo>("/clinico/examemedico/", { page: 1, pageSize: 200 })
      setExames(res.items)
    } catch (e: any) {
      setErro(e?.message || "Falha ao carregar catálogo de exames médicos.")
    }
  }

  async function loadRequisicoes() {
    try {
      const res = await apiFetchList<RequisicaoResumo>("/requisicoes/?tipo=MED", { page: 1, pageSize: 200 })
      setRequisicoes(res.items)
    } catch (e: any) {
      setErro(e?.message || "Falha ao listar requisições de exames médicos.")
    }
  }

  const selectedResultadoId = useMemo(() => {
    const req = requisicoes.find((r) => String(r.id) === form.requisicaoId)
    return req?.resultado?.id
  }, [form.requisicaoId, requisicoes])

  const selectedExame = useMemo(
    () => exames.find((ex) => String(ex.id) === form.exameMedicoId),
    [exames, form.exameMedicoId]
  )

  const tiposPermitidos = useMemo(() => {
    if (!selectedExame) return tipoResultadoMedicoOptions.map((opt) => opt.value)
    if (selectedExame.tipos_resultado_cadastrados?.length) {
      return selectedExame.tipos_resultado_cadastrados
    }
    if (selectedExame.tipos_resultado_permitidos?.length) {
      return selectedExame.tipos_resultado_permitidos
    }
    return getTiposResultadoMedicoPorMetodo(selectedExame.metodo)
  }, [selectedExame])

  const tipoOptions = useMemo(
    () => tipoResultadoMedicoOptions.filter((opt) => tiposPermitidos.includes(opt.value)),
    [tiposPermitidos]
  )

  useEffect(() => {
    if (!tipoOptions.length) return
    if (!tipoOptions.some((opt) => opt.value === form.tipo)) {
      setForm((prev) => ({ ...prev, tipo: tipoOptions[0].value }))
    }
  }, [form.tipo, tipoOptions])

  const fileAccept = tipoResultadoMedicoAcceptMap[form.tipo] ?? ".pdf,image/*,video/*,application/dicom"

  async function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault()
    setFormError(null)

    if (!form.requisicaoId) {
      setFormError("Selecione a requisição associada ao arquivo.")
      return
    }
    if (!form.exameMedicoId) {
      setFormError("Selecione o exame médico relacionado.")
      return
    }
    if (!file) {
      setFormError("Envie um arquivo (PDF/Imagem/DICOM).")
      return
    }
    if (!selectedResultadoId) {
      setFormError("A requisição ainda não possui resultado gerado.")
      return
    }

    const formData = new FormData()
    formData.append("arquivo", file)
    formData.append("exame_medico", form.exameMedicoId)
    formData.append("resultado", String(selectedResultadoId))
    formData.append("requisicao", form.requisicaoId)
    formData.append("tipo", form.tipo)
    if (form.descricao.trim()) {
      formData.append("descricao", form.descricao.trim())
    }

    setLoading(true)
    try {
      const res = await fetch("/api/v1/clinico/resultadomedicoarquivo/", {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Falha ao enviar arquivo.")
      }
      setFile(null)
      setForm({ ...form, descricao: "" })
      loadArquivos()
    } catch (e: any) {
      setFormError(e?.message || "Falha ao enviar arquivo.")
    } finally {
      setLoading(false)
    }
  }

  const rows = useMemo(
    () =>
      arquivos.map((arquivo) => ({
        ...arquivo,
        tipo_label: tipoResultadoMedicoOptions.find((o) => o.value === arquivo.tipo)?.label || arquivo.tipo,
      })),
    [arquivos]
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA]}>
      <div className="space-y-6">
        <PageHeader
          title="Resultados médicos"
          subtitle="Lance laudos e imagens para exames de diagnóstico."
        />

        <Card title="Enviar arquivo">
          <form onSubmit={handleSubmit} className="grid gap-3">
            <label className="flex flex-col text-sm text-slate-700">
              Requisição (tipo MED)
              <select
                value={form.requisicaoId}
                onChange={(evt) => setForm({ ...form, requisicaoId: evt.target.value })}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              >
                <option value="">Selecione</option>
                {requisicoes.map((req) => (
                  <option key={req.id} value={req.id}>
                    {req.id_custom || `#${req.id}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-sm text-slate-700">
              Exame médico
              <select
                value={form.exameMedicoId}
                onChange={(evt) => setForm({ ...form, exameMedicoId: evt.target.value })}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              >
                <option value="">Selecione</option>
                {exames.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.nome || `Exame #${ex.id}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-sm text-slate-700">
              Tipo (PDF/Imagem)
              <select
                value={form.tipo}
                onChange={(evt) => setForm({ ...form, tipo: evt.target.value })}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              >
                {tipoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-sm text-slate-700">
              Descrição (opcional)
              <input
                type="text"
                value={form.descricao}
                onChange={(evt) => setForm({ ...form, descricao: evt.target.value })}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700">
              Arquivo
              <input
                type="file"
                accept={fileAccept}
                onChange={(evt) => setFile(evt.target.files?.[0] ?? null)}
                className="mt-1 text-sm text-slate-700"
              />
            </label>

            {formError ? (
              <p className="text-sm text-rose-600">{formError}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 py-2 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar arquivo"}
            </button>
          </form>
        </Card>

        <Card title="Arquivos enviados">
          {erro ? (
            <p className="text-sm text-rose-600">{erro}</p>
          ) : (
            <div className="space-y-3">
              {rows.length === 0 ? (
                <p className="text-sm text-slate-600">Nenhum laudo registrado ainda.</p>
              ) : (
                <div className="grid gap-3">
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong>{row.id_custom || `#${row.id}`}</strong>
                        <span className="text-xs text-slate-500">{row.tipo_label}</span>
                      </div>
                      <div className="text-sm text-slate-600">{row.exame_medico_nome || "Exame médico"}</div>
                      <div className="text-sm text-slate-600">
                        {row.descricao || "Sem descrição"} · Requisição #{row.requisicao || "-"}
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                        <a
                          href={row.arquivo}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-slate-900 underline"
                        >
                          Abrir arquivo
                        </a>
                        <span>{fmtDate(row.criado_em)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
