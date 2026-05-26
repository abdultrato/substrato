"use client"
import { isNotFoundLikeError } from "@/lib/errors/api-error"

import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch, apiFetchList } from "@/lib/api"
import {
  getMedicalResultTypesByMethod,
  medicalResultTypeAcceptMap,
  medicalResultTypeOptions,
} from "@/lib/constants/medical-exam"
import { GROUPS } from "@/lib/rbac"

type MedicalRequestSummary = {
  id: number
  custom_id?: string
  type: string
  result?: { id: number }
}

type MedicalExamSummary = {
  id: number
  name?: string
  method?: string
  allowed_result_types?: string[]
  registered_result_types?: string[]
}

type MedicalFileRow = {
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

export default function MedicalResultsPage() {
  const [files, setFiles] = useState<MedicalFileRow[]>([])
  const [exams, setExams] = useState<MedicalExamSummary[]>([])
  const [requests, setRequests] = useState<MedicalRequestSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    requestId: "",
    medicalExamId: "",
    type: medicalResultTypeOptions[0].value,
    description: "",
  })

  useEffect(() => {
    loadExams()
    loadRequests()
    loadFiles()
  }, [])

  async function loadFiles() {
    try {
      const { items } = await apiFetchList<MedicalFileRow>("/clinical/medicalresultfile/", {
        page: 1,
        pageSize: 50,
      })
      setFiles(items.map(normalizeMedicalFile))
    } catch (e: any) {
      setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar anexos médicos."))
    }
  }

  async function loadExams() {
    try {
      const res = await apiFetchList<MedicalExamSummary>("/clinical/medicalexam/", { page: 1, pageSize: 200 })
      setExams(res.items.map(normalizeMedicalExam))
    } catch (e: any) {
      setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar catálogo de exames médicos."))
    }
  }

  async function loadRequests() {
    try {
      const res = await apiFetchList<MedicalRequestSummary>("/requests/?type=MED", { page: 1, pageSize: 200 })
      setRequests(res.items.map(normalizeMedicalRequest))
    } catch (e: any) {
      setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao listar requisições de exames médicos."))
    }
  }

  const selectedResultId = useMemo(() => {
    const req = requests.find((r) => String(r.id) === form.requestId)
    return req?.result?.id
  }, [form.requestId, requests])

  const selectedExam = useMemo(
    () => exams.find((exam) => String(exam.id) === form.medicalExamId),
    [exams, form.medicalExamId]
  )

  const allowedTypes = useMemo(() => {
    if (!selectedExam) return medicalResultTypeOptions.map((opt) => opt.value)
    if (selectedExam.registered_result_types?.length) {
      return selectedExam.registered_result_types
    }
    if (selectedExam.allowed_result_types?.length) {
      return selectedExam.allowed_result_types
    }
    return getMedicalResultTypesByMethod(selectedExam.method)
  }, [selectedExam])

  const typeOptions = useMemo(
    () => medicalResultTypeOptions.filter((opt) => allowedTypes.includes(opt.value)),
    [allowedTypes]
  )

  useEffect(() => {
    if (!typeOptions.length) return
    if (!typeOptions.some((opt) => opt.value === form.type)) {
      setForm((prev) => ({ ...prev, type: typeOptions[0].value }))
    }
  }, [form.type, typeOptions])

  const fileAccept = medicalResultTypeAcceptMap[form.type] ?? ".pdf,image/*,video/*,application/dicom"

  async function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault()
    setFormError(null)

    if (!form.requestId) {
      setFormError("Selecione a requisição associada ao arquivo.")
      return
    }
    if (!form.medicalExamId) {
      setFormError("Selecione o exame médico relacionado.")
      return
    }
    if (!file) {
      setFormError("Envie um arquivo (PDF/Imagem/DICOM).")
      return
    }
    if (!selectedResultId) {
      setFormError("A requisição ainda não possui resultado gerado.")
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("medical_exam", form.medicalExamId)
    formData.append("result", String(selectedResultId))
    formData.append("type", form.type)
    if (form.description.trim()) {
      formData.append("description", form.description.trim())
    }

    setLoading(true)
    try {
      await apiFetch("/clinical/medicalresultfile/", {
        method: "POST",
        body: formData,
      })
      setFile(null)
      setForm({ ...form, description: "" })
      loadFiles()
    } catch (e: any) {
      setFormError(e?.message || "Falha ao enviar arquivo.")
    } finally {
      setLoading(false)
    }
  }

  const rows = useMemo(
    () =>
      files.map((medicalFile) => ({
        ...medicalFile,
        typeLabel: medicalResultTypeOptions.find((option) => option.value === medicalFile.type)?.label || medicalFile.type,
      })),
    [files]
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
                value={form.requestId}
                onChange={(evt) => setForm({ ...form, requestId: evt.target.value })}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              >
                <option value="">Selecione</option>
                {requests.map((req) => (
                  <option key={req.id} value={req.id}>
                    {req.custom_id || `#${req.id}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-sm text-slate-700">
              Exame médico
              <select
                value={form.medicalExamId}
                onChange={(evt) => setForm({ ...form, medicalExamId: evt.target.value })}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              >
                <option value="">Selecione</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name || `Exame #${exam.id}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-sm text-slate-700">
              Tipo (PDF/Imagem)
              <select
                value={form.type}
                onChange={(evt) => setForm({ ...form, type: evt.target.value })}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              >
                {typeOptions.map((opt) => (
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
                value={form.description}
                onChange={(evt) => setForm({ ...form, description: evt.target.value })}
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
          {errorMessage ? (
            <p className="text-sm text-rose-600">{errorMessage}</p>
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
                        <span className="text-xs text-slate-500">{row.typeLabel}</span>
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

function normalizeMedicalRequest(raw: any): MedicalRequestSummary {
  return {
    id: Number(raw?.id ?? 0),
    custom_id: raw?.custom_id,
    type: raw?.type ?? "",
    result: raw?.result,
  }
}

function normalizeMedicalExam(raw: any): MedicalExamSummary {
  return {
    id: Number(raw?.id ?? 0),
    name: raw?.name,
    method: raw?.method,
    allowed_result_types: raw?.allowed_result_types,
    registered_result_types: raw?.registered_result_types,
  }
}

function normalizeMedicalFile(raw: any): MedicalFileRow {
  return {
    id: Number(raw?.id ?? 0),
    custom_id: raw?.custom_id,
    result: raw?.result,
    medical_exam: raw?.medical_exam,
    medical_exam_name: raw?.medical_exam_name,
    type: raw?.type,
    description: raw?.description,
    file: raw?.file,
    created_at: raw?.created_at,
    request: raw?.request,
  }
}



