"use client" // Necessário para hooks e chamadas client-side.
import { isNotFoundLikeError } from "@/lib/errors/api-error"

import { useEffect, useMemo, useState } from "react"

// Estrutura de layout e UI reutilizada pelo app.
import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
// Clientes REST autenticados.
import { apiFetch, apiFetchList } from "@/lib/api"
// Constantes de domínio de exames médicos.
import {
  getTiposResultadoMedicoPorMetodo,
  tipoResultadoMedicoAcceptMap,
  tipoResultadoMedicoOptions,
} from "@/lib/constants/medical-exam"
// Controle de acesso por grupo.
import { GROUPS } from "@/lib/rbac"

type RequisicaoResumo = {
  id: number
  custom_id?: string
  type: string
  result?: { id: number }
}

// Dados mínimos de um exame médico retornado pela API.
type ExameMedicoResumo = {
  id: number
  name?: string
  method?: string
  allowed_result_types?: string[]
  registered_result_types?: string[]
}

// Linha de arquivo de resultado médico já enviado.
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

// Formata datas vindas da API para exibição amigável.
function fmtDate(value: any): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

export default function ResultadosMedicosPage() {
  // Estado local para tabelas e formulários.
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

  // Carrega dados iniciais ao montar a página.
  useEffect(() => {
    loadExames()
    loadRequisicoes()
    loadArquivos()
  }, [])

  // Busca lista paginada de arquivos já enviados.
  async function loadArquivos() {
    try {
      const { items } = await apiFetchList<ArquivoRow>("/clinical/medicalresultfile/", {
        page: 1,
        pageSize: 50,
      })
      setArquivos(items.map(normalizeMedicalFile))
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar anexos médicos."))
    }
  }

  // Busca catálogo de exames médicos.
  async function loadExames() {
    try {
      const res = await apiFetchList<ExameMedicoResumo>("/clinical/medicalexam/", { page: 1, pageSize: 200 })
      setExames(res.items.map(normalizeMedicalExam))
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar catálogo de exames médicos."))
    }
  }

  // Busca requisições médicas para relacionar uploads.
  async function loadRequisicoes() {
    try {
      const res = await apiFetchList<RequisicaoResumo>("/requests/?tipo=MED", { page: 1, pageSize: 200 })
      setRequisicoes(res.items.map(normalizeMedicalRequest))
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao listar requisições de exames médicos."))
    }
  }

  // Resultado (se existir) da requisição selecionada.
  const selectedResultadoId = useMemo(() => {
    const req = requisicoes.find((r) => String(r.id) === form.requisicaoId)
    return req?.result?.id
  }, [form.requisicaoId, requisicoes])

  // Exame médico selecionado no formulário.
  const selectedExame = useMemo(
    () => exames.find((ex) => String(ex.id) === form.exameMedicoId),
    [exames, form.exameMedicoId]
  )

  // Tipos de arquivo permitidos de acordo com exame/método.
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

  // Garante que o tipo selecionado sempre é permitido pelo exame.
  useEffect(() => {
    if (!tipoOptions.length) return
    if (!tipoOptions.some((opt) => opt.value === form.tipo)) {
      setForm((prev) => ({ ...prev, tipo: tipoOptions[0].value }))
    }
  }, [form.tipo, tipoOptions])

  // Aceites de upload por tipo (mapa definido em constants).
  const fileAccept = tipoResultadoMedicoAcceptMap[form.tipo] ?? ".pdf,image/*,video/*,application/dicom"

  // Handler principal de envio do formulário.
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

    // Monta payload multipart exigido pela API para upload de arquivos.
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
      await apiFetch("/clinical/medicalresultfile/", {
        method: "POST",
        body: formData,
      })
      setFile(null)
      setForm({ ...form, descricao: "" })
      loadArquivos()
    } catch (e: any) {
      setFormError(e?.message || "Falha ao enviar arquivo.")
    } finally {
      setLoading(false)
    }
  }

  // Normaliza linhas para tabela (inclui label legível do tipo).
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
  // Converte payload da API (campos PT/EN) para shape interno.
  return {
    id: Number(raw?.id ?? 0),
    custom_id: raw?.custom_id ?? raw?.id_custom,
    type: raw?.type ?? raw?.tipo ?? "",
    result: raw?.result ?? raw?.resultado,
  }
}

function normalizeMedicalExam(raw: any): ExameMedicoResumo {
  // Normaliza exame médico combinando aliases portugueses/ingleses.
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
  // Normaliza linha de arquivo médico para consumo na UI.
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



