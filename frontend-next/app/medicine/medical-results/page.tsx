"use client"
import { isNotFoundLikeError } from "@/lib/errors/api-error"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Clock3, FileText, ImagePlus, Loader2, Search, UploadCloud } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import useDebounce from "@/hooks/useDebounce"
import { apiFetch, apiFetchList } from "@/lib/api"
import {
  getMedicalResultTypesByMethod,
  medicalResultTypeAcceptMap,
  medicalResultTypeOptions,
} from "@/lib/constants/medical-exam"
import { formatCount } from "@/lib/i18n/plural"
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

const inputGlass =
  "rounded-lg border border-white/25 bg-white/[0.05] px-3 py-2 text-sm text-foreground backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:border-white/10 dark:bg-white/[0.03]"

export default function MedicalResultsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [files, setFiles] = useState<MedicalFileRow[]>([])
  const [exams, setExams] = useState<MedicalExamSummary[]>([])
  const [requests, setRequests] = useState<MedicalRequestSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const debouncedSearch = useDebounce(search.trim().toLowerCase(), 200)
  const [form, setForm] = useState({
    requestId: "",
    medicalExamId: "",
    type: medicalResultTypeOptions[0].value,
    description: "",
  })

  const loadFiles = useCallback(async () => {
    try {
      const { items } = await apiFetchList<MedicalFileRow>("/clinical/medicalresultfile/", {
        page: 1,
        pageSize: 50,
        clientCache: safeRefreshToken === 0,
      })
      setFiles(items.map(normalizeMedicalFile))
    } catch (e: any) {
      setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar anexos médicos."))
    }
  }, [safeRefreshToken])

  const loadExams = useCallback(async () => {
    try {
      const res = await apiFetchList<MedicalExamSummary>("/clinical/medicalexam/", {
        page: 1,
        pageSize: 200,
        clientCache: safeRefreshToken === 0,
      })
      setExams(res.items.map(normalizeMedicalExam))
    } catch (e: any) {
      setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar catálogo de exames médicos."))
    }
  }, [safeRefreshToken])

  const loadRequests = useCallback(async () => {
    try {
      const res = await apiFetchList<MedicalRequestSummary>("/requests/?type=MED", {
        page: 1,
        pageSize: 200,
        clientCache: safeRefreshToken === 0,
      })
      setRequests(res.items.map(normalizeMedicalRequest))
    } catch (e: any) {
      setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao listar requisições de exames médicos."))
    }
  }, [safeRefreshToken])

  useEffect(() => {
    loadExams()
    loadRequests()
    loadFiles()
  }, [loadExams, loadFiles, loadRequests])

  const selectedResultId = useMemo(() => {
    const req = requests.find((r) => String(r.id) === form.requestId)
    return req?.result?.id
  }, [form.requestId, requests])

  const selectedExam = useMemo(
    () => exams.find((exam) => String(exam.id) === form.medicalExamId),
    [exams, form.medicalExamId]
  )

  const typeOptions = useMemo(() => {
    const allowed = selectedExam?.allowed_result_types?.length
      ? selectedExam.allowed_result_types
      : getMedicalResultTypesByMethod(selectedExam?.method)
    return medicalResultTypeOptions.filter((option) => allowed.includes(option.value))
  }, [selectedExam])

  useEffect(() => {
    if (!typeOptions.length) return
    if (!typeOptions.some((option) => option.value === form.type)) {
      setForm((current) => ({ ...current, type: typeOptions[0].value }))
    }
  }, [form.type, typeOptions])

  const fileAccept = medicalResultTypeAcceptMap[form.type] || undefined

  async function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault()
    setFormError(null)
    if (!form.requestId) {
      setFormError("Selecione a requisição do exame.")
      return
    }
    if (!selectedResultId) {
      setFormError("A requisição selecionada ainda não tem resultado associado.")
      return
    }
    if (!form.medicalExamId) {
      setFormError("Selecione o exame médico.")
      return
    }
    if (!file) {
      setFormError("Anexe o arquivo do laudo.")
      return
    }

    const formData = new FormData()
    formData.append("result", String(selectedResultId))
    formData.append("medical_exam", form.medicalExamId)
    formData.append("type", form.type)
    if (form.description.trim()) formData.append("description", form.description.trim())
    formData.append("file", file)

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

  const filtrados = useMemo(() => {
    return rows.filter((row) => {
      if (typeFilter && row.type !== typeFilter) return false
      if (!debouncedSearch) return true
      const alvo = [row.custom_id, row.medical_exam_name, row.description, row.typeLabel, row.request ? `#${row.request}` : null]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return alvo.includes(debouncedSearch)
    })
  }, [debouncedSearch, rows, typeFilter])

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA]}>
      <div className="space-y-3">
        {/* Cabeçalho fundido: banner + pesquisa + filtro num só bloco translúcido */}
        <section className="relative overflow-hidden rounded-xl border border-sky-200/25 bg-gradient-to-br from-sky-100/[0.05] via-white/[0.015] to-cyan-100/[0.03] shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-sky-800/20 dark:from-sky-950/[0.05] dark:via-white/[0.01] dark:to-cyan-950/[0.03]">
          <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-sky-400/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-500/25">
                <ImagePlus size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">Resultados médicos</h1>
                <p className="text-[11px] text-muted-foreground">
                  {formatCount(files.length, { one: "arquivo registado", other: "arquivos registados" })}
                </p>
              </div>
            </div>

            <Link
              href="/medicine/medical-exams"
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/[0.05] px-3 text-xs font-medium text-foreground backdrop-blur-xl transition hover:bg-white/10 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <UploadCloud size={13} />
              Catálogo de exames
            </Link>
          </div>

          <div className="relative flex flex-wrap items-center gap-2 border-t border-white/15 px-4 py-2 dark:border-white/[0.06]">
            <div className="relative w-56">
              <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar código, exame, descrição…"
                className="w-full rounded-lg border border-white/25 bg-white/[0.05] py-1.5 pl-7 pr-6 text-xs text-foreground placeholder:text-muted-foreground backdrop-blur-xl transition-all focus:w-72 focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:border-white/10 dark:bg-white/[0.03]"
              />
            </div>
            <label className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/[0.05] px-2.5 text-[10px] font-medium text-muted-foreground backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
              Tipo
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-md border border-white/20 bg-transparent px-1.5 py-0.5 text-[10px] text-foreground focus:outline-none dark:border-white/10"
              >
                <option value="">Todos</option>
                {medicalResultTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            {debouncedSearch || typeFilter ? (
              <span className="text-[10px] text-muted-foreground">
                {formatCount(filtrados.length, { one: "resultado", other: "resultados" })}
              </span>
            ) : null}
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-xl border border-amber-200/60 bg-amber-50/30 px-4 py-3 text-sm text-amber-800 backdrop-blur-xl dark:border-amber-800/40 dark:bg-amber-950/15 dark:text-amber-300">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[minmax(280px,360px)_1fr]">
          {/* Envio de arquivo */}
          <section className="relative h-fit overflow-hidden rounded-xl border border-sky-200/30 bg-gradient-to-br from-sky-100/[0.06] via-white/[0.02] to-cyan-100/[0.035] shadow-md shadow-slate-900/5 backdrop-blur-2xl dark:border-sky-800/20 dark:from-sky-950/[0.05] dark:via-white/[0.015] dark:to-cyan-950/[0.03]">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-500" />
            <div className="space-y-3 p-4 pt-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enviar arquivo</h2>
              <form onSubmit={handleSubmit} className="grid gap-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                  Requisição (tipo MED)
                  <select
                    value={form.requestId}
                    onChange={(evt) => setForm({ ...form, requestId: evt.target.value })}
                    className={inputGlass}
                  >
                    <option value="">Selecione</option>
                    {requests.map((req) => (
                      <option key={req.id} value={req.id}>
                        {req.custom_id || `#${req.id}`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                  Exame médico
                  <select
                    value={form.medicalExamId}
                    onChange={(evt) => setForm({ ...form, medicalExamId: evt.target.value })}
                    className={inputGlass}
                  >
                    <option value="">Selecione</option>
                    {exams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.name || `Exame #${exam.id}`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                  Tipo (PDF/Imagem)
                  <select
                    value={form.type}
                    onChange={(evt) => setForm({ ...form, type: evt.target.value })}
                    className={inputGlass}
                  >
                    {typeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                  Descrição (opcional)
                  <input
                    type="text"
                    value={form.description}
                    onChange={(evt) => setForm({ ...form, description: evt.target.value })}
                    className={inputGlass}
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                  Arquivo
                  <input
                    type="file"
                    accept={fileAccept}
                    onChange={(evt) => setFile(evt.target.files?.[0] ?? null)}
                    className="mt-1 text-xs text-muted-foreground"
                  />
                </label>

                {formError ? <p className="text-xs text-rose-500">{formError}</p> : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 px-4 text-xs font-semibold text-white shadow-md shadow-sky-500/25 transition hover:from-sky-700 hover:to-cyan-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                  {loading ? "Enviando..." : "Enviar arquivo"}
                </button>
              </form>
            </div>
          </section>

          {/* Arquivos enviados */}
          <div className="space-y-2">
            {filtrados.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/30 bg-white/[0.03] py-16 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.015]">
                <FileText size={26} className="text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">
                  {rows.length === 0 ? "Nenhum laudo registrado ainda" : "Nenhum resultado para o filtro"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rows.length === 0 ? "Envie o primeiro arquivo pelo formulário." : "Altere a pesquisa ou o tipo."}
                </p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                {filtrados.map((row) => (
                  <article
                    key={row.id}
                    className="group relative overflow-hidden rounded-xl border border-sky-200/30 bg-gradient-to-br from-sky-100/[0.06] via-white/[0.02] to-cyan-100/[0.035] shadow-md shadow-slate-900/5 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-sky-300/60 hover:shadow-lg dark:border-sky-800/20 dark:from-sky-950/[0.05] dark:via-white/[0.015] dark:to-cyan-950/[0.03]"
                  >
                    <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-500" />
                    <div className="flex h-full flex-col gap-2 p-3.5 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {row.custom_id || `#${row.id}`}
                          </p>
                          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                            {row.medical_exam_name || "Exame médico"}
                          </h3>
                        </div>
                        <span className="shrink-0 rounded-full border border-sky-300/50 bg-sky-100/40 px-2 py-0.5 text-[9px] font-semibold text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-300">
                          {row.type || "—"}
                        </span>
                      </div>

                      <p className="line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                        {row.description || "Sem descrição"} · Requisição #{row.request || "-"}
                      </p>

                      <div className="mt-auto flex items-center justify-between border-t border-white/20 pt-2 text-[10px] text-muted-foreground dark:border-white/[0.06]">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={10} /> {fmtDate(row.created_at)}
                        </span>
                        {row.file ? (
                          <a
                            href={row.file}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 font-semibold text-sky-700 no-underline hover:underline dark:text-sky-300"
                          >
                            Abrir arquivo
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
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
