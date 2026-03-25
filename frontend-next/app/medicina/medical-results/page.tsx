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
} from "@/lib/constants/medical-exam"
import { GROUPS } from "@/lib/rbac"

type RequisicaoResumo = {
  id: number
  custom_id?: string
  type: string
  result?: { id: number }
}

type ExameMedicoResumo = {
  id: number
  name?: string
  method?: string
  allowed_result_types?: string[]
  registered_result_types?: string[]
}

type ArquivoRow = {
  id: number
  custom_id?: string
  result?: number
  medical_exam?: number
  medical_exam_name?: string
  type?: string
  description?: string
  file?: string
  created_at?: string
  request?: number
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
      setArquivos(items.map(normalizeMedicalFile))
    } catch (e: any) {
      setErro(e?.message || "Falha ao carregar anexos médicos.")
    }
  }

  async function loadExames() {
    try {
      const res = await apiFetchList<ExameMedicoResumo>("/clinico/examemedico/", { page: 1, pageSize: 200 })
      setExames(res.items.map(normalizeMedicalExam))
    } catch (e: any) {
      setErro(e?.message || "Falha ao carregar catálogo de exames médicos.")
    }
  }

  async function loadRequisicoes() {
    try {
      const res = await apiFetchList<RequisicaoResumo>("/requisicoes/?tipo=MED", { page: 1, pageSize: 200 })
      setRequisicoes(res.items.map(normalizeMedicalRequest))
    } catch (e: any) {
      setErro(e?.message || "Falha ao listar requisições de exames médicos.")
    }
  }

  const selectedResultadoId = useMemo(() => {
    const req = requisicoes.find((r) => String(r.id) === form.requisicaoId)
    return req?.result?.id
  }, [form.requisicaoId, requisicoes])

  const selectedExame = useMemo(
    () => exames.find((ex) => String(ex.id) === form.exameMedicoId),
    [exames, form.exameMedicoId]
  )

  const tiposPermitidos = useMemo(() => {
    if (!selectedExame) return tipoResultadoMedicoOptions.map((opt) => opt.value)
    if (selectedExame.registered_result_types?.length) {
      return selectedExame.registered_result_types
    }
    if (selectedExame.allowed_result_types?.length) {
      return selectedExame.allowed_result_types
    }
    return getTiposResultadoMedicoPorMetodo(selectedExame.method)
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
    formData.append("file", file)
    formData.append("medical_exam", form.exameMedicoId)
    formData.append("result", String(selectedResultadoId))
    formData.append("type", form.tipo)
    if (form.descricao.trim()) {
      formData.append("description", form.descricao.trim())
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
        tipo_label: tipoResultadoMedicoOptions.find((o) => o.value === arquivo.type)?.label || arquivo.type,
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
                    {req.custom_id || `#${req.id}`}
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
                    {ex.name || `Exame #${ex.id}`}
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
                        <strong>{row.custom_id || `#${row.id}`}</strong>
                        <span className="text-xs text-slate-500">{row.tipo_label}</span>
                      </div>
                      <div className="text-sm text-slate-600">{row.medical_exam_name || "Exame médico"}</div>
                      <div className="text-sm text-slate-600">
                        {row.description || "Sem descrição"} · Requisição #{row.request || "-"}
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                        <a
                          href={row.file}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-slate-900 underline"
                        >
                          Abrir arquivo
                        </a>
                        <span>{fmtDate(row.created_at)}</span>
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

function normalizeMedicalRequest(raw: any): RequisicaoResumo {
  return {
    id: Number(raw?.id ?? 0),
    custom_id: raw?.custom_id ?? raw?.id_custom,
    type: raw?.type ?? raw?.tipo ?? "",
    result: raw?.result ?? raw?.resultado,
  }
}

function normalizeMedicalExam(raw: any): ExameMedicoResumo {
  return {
    id: Number(raw?.id ?? 0),
    name: raw?.name ?? raw?.nome,
    method: raw?.method ?? raw?.metodo,
    allowed_result_types:
      raw?.allowed_result_types ?? raw?.tipos_resultado_permitidos ?? raw?.tipos_result_permitidos,
    registered_result_types:
      raw?.registered_result_types ?? raw?.tipos_resultado_cadastrados ?? raw?.tipos_result_cadastrados,
  }
}

function normalizeMedicalFile(raw: any): ArquivoRow {
  return {
    id: Number(raw?.id ?? 0),
    custom_id: raw?.custom_id ?? raw?.id_custom,
    result: raw?.result ?? raw?.resultado,
    medical_exam: raw?.medical_exam ?? raw?.exame_medico,
    medical_exam_name: raw?.medical_exam_name ?? raw?.exame_medico_nome,
    type: raw?.type ?? raw?.tipo,
    description: raw?.description ?? raw?.descricao,
    file: raw?.file ?? raw?.arquivo,
    created_at: raw?.created_at ?? raw?.criado_em,
    request: raw?.request ?? raw?.requisicao,
  }
}
