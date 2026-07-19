"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Check,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  Save,
  Scissors,
  ShieldCheck,
  Upload,
  User,
} from "lucide-react"

import { SearchableRelationSelect } from "@/components/form/AutoForm"
import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"
import type { RelationOption, RelationTarget } from "@/lib/resources/relationOptions"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type Row = Record<string, any>

type FormState = {
  surgery: string
  surgical_request: string
  preoperative_assessment: string
  authorization: string
  uploaded_by: string
  title: string
  document_type: string
  status: string
  external_reference: string
  signed_at: string
  expires_at: string
  notes: string
}

const ENDPOINT = "/surgery/documentos"
const ROUTE_BASE = "/surgery/documents"
const GLASS = "rounded-lg border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const INPUT = "h-7 w-full rounded-md border border-border bg-card/70 px-2 text-[11px] text-foreground outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-violet-800"
const LABEL = "mb-0.5 block text-[8px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]"

const RELATION_TARGETS: Record<string, RelationTarget> = {
  surgery: { endpoint: "/surgery/surgery/", labelFields: ["custom_id", "patient_name", "procedure", "scheduled_for", "id"] },
  surgical_request: { endpoint: "/surgery/pedido_cirurgico/", labelFields: ["custom_id", "patient_name", "requested_procedure", "id"] },
  preoperative_assessment: { endpoint: "/surgery/avaliacao_pre_operatoria/", labelFields: ["custom_id", "patient_name", "surgical_request_code", "status", "id"] },
  authorization: { endpoint: "/surgery/autorizacoes/", labelFields: ["custom_id", "patient_name", "surgery_code", "status", "id"] },
  uploaded_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", "document_number", "id"] },
}

const DOC_TYPES = [
  ["CONSENT", "Consentimento"],
  ["QUOTATION", "Orçamento"],
  ["AUTHORIZATION", "Autorização"],
  ["INSURANCE", "Seguro"],
  ["PREOPERATIVE", "Pré-operatório"],
  ["ANESTHESIA", "Anestesia"],
  ["OPERATIVE_REPORT", "Relatório operatório"],
  ["DISCHARGE", "Alta"],
  ["OTHER", "Outro"],
] as const

const STATUS_OPTIONS = [
  ["DRAFT", "Rascunho"],
  ["PENDING_REVIEW", "Pendente de revisão"],
  ["SIGNED", "Assinado"],
  ["AMENDED", "Retificado"],
  ["CANCELLED", "Cancelado"],
] as const

const INITIAL_FORM: FormState = {
  surgery: "",
  surgical_request: "",
  preoperative_assessment: "",
  authorization: "",
  uploaded_by: "",
  title: "",
  document_type: "OTHER",
  status: "DRAFT",
  external_reference: "",
  signed_at: "",
  expires_at: "",
  notes: "",
}

function asId(value: unknown): string {
  if (value === undefined || value === null || value === "") return ""
  return String(value)
}

function dateTimeLocal(value: unknown): string {
  if (!value) return ""
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toIsoOrNull(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function fmtDateTime(value: unknown): string {
  if (!value) return "—"
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

function option(value: unknown, label: unknown): RelationOption[] {
  const id = asId(value)
  const text = String(label || "").trim()
  return id ? [{ value: id, label: text || "Registo selecionado" }] : []
}

function fileHref(value: unknown): string {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object" && value) {
    const row = value as Row
    return String(row.url || row.file || row.path || "")
  }
  return ""
}

function formFromRow(row: Row): FormState {
  return {
    surgery: asId(row.surgery),
    surgical_request: asId(row.surgical_request),
    preoperative_assessment: asId(row.preoperative_assessment),
    authorization: asId(row.authorization),
    uploaded_by: asId(row.uploaded_by),
    title: String(row.title || ""),
    document_type: String(row.document_type || "OTHER"),
    status: String(row.status || "DRAFT"),
    external_reference: String(row.external_reference || ""),
    signed_at: dateTimeLocal(row.signed_at),
    expires_at: dateTimeLocal(row.expires_at),
    notes: String(row.notes || ""),
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  )
}

function ContextField({ label, value, icon }: { label: string; value: unknown; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-card/35 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-0.5 truncate text-[11px] font-semibold text-foreground">{String(value || "—")}</div>
    </div>
  )
}

function Card({
  title,
  icon,
  children,
  className = "",
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`relative overflow-visible ${GLASS} ${className}`}>
      <span className="absolute left-0 top-0 h-full w-1 bg-violet-400" />
      <div className="space-y-1.5 px-2 py-1.5 pl-3">
        <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--gray-500)]">
          {icon}
          <span>{title}</span>
        </div>
        {children}
      </div>
    </section>
  )
}

export default function SurgeryDocumentEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = routeParamToString((params as any)?.id)

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [row, setRow] = useState<Row | null>(null)
  const [surgery, setSurgery] = useState<Row | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const currentFileHref = fileHref(row?.file)
  const hasClinicalLink = Boolean(form.surgery || form.surgical_request || form.preoperative_assessment || form.authorization)
  const typeLabel = DOC_TYPES.find(([value]) => value === form.document_type)?.[1] || form.document_type
  const statusLabel = STATUS_OPTIONS.find(([value]) => value === form.status)?.[1] || form.status
  const relationOptions = {
    surgery: option(form.surgery, row?.surgery_code || surgery?.custom_id || surgery?.procedure),
    surgical_request: option(form.surgical_request, row?.surgical_request_code),
    preoperative_assessment: option(form.preoperative_assessment, row?.preoperative_assessment_code),
    authorization: option(form.authorization, row?.authorization_code),
    uploaded_by: option(form.uploaded_by, row?.uploaded_by_name),
  }
  const assessmentTarget = useMemo<RelationTarget>(() => ({
    ...RELATION_TARGETS.preoperative_assessment,
    staticFilters: form.surgical_request ? { surgical_request: Number(form.surgical_request) } : undefined,
  }), [form.surgical_request])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const nextRow = await apiFetch<Row>(`${ENDPOINT}/${id}/`)
      setRow(nextRow)
      setForm(formFromRow(nextRow))
      setSurgery(nextRow?.surgery ? await apiFetch<Row>(`/surgery/surgery/${nextRow.surgery}/`).catch(() => null) : null)
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar documento cirúrgico.")
      setRow(null)
      setSurgery(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function buildPayload(): BodyInit {
    const values = {
      surgery: form.surgery ? Number(form.surgery) : null,
      surgical_request: form.surgical_request ? Number(form.surgical_request) : null,
      preoperative_assessment: form.preoperative_assessment ? Number(form.preoperative_assessment) : null,
      authorization: form.authorization ? Number(form.authorization) : null,
      uploaded_by: form.uploaded_by ? Number(form.uploaded_by) : null,
      title: form.title,
      document_type: form.document_type,
      status: form.status,
      external_reference: form.external_reference,
      signed_at: toIsoOrNull(form.signed_at),
      expires_at: toIsoOrNull(form.expires_at),
      notes: form.notes,
    }

    if (!file) return JSON.stringify(values)

    const fd = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      if (value === null || value === undefined) return
      fd.append(key, String(value))
    })
    fd.append("file", file)
    return fd
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!id) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await apiFetch<Row>(`${ENDPOINT}/${id}/`, {
        method: "PATCH",
        body: buildPayload(),
      })
      setSaved(true)
      window.setTimeout(() => router.push(`${ROUTE_BASE}/${id}`), 450)
    } catch (err: any) {
      setError(err?.message || "Erro ao guardar documento cirúrgico.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </div>
      </AppLayout>
    )
  }

  if (error && !row) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
        <div className="mx-auto w-full max-w-[99vw] px-1 py-1">
          <div className="flex items-center gap-2 rounded-lg border border-rose-300/50 bg-rose-50/60 px-3 py-2 text-sm text-rose-700">
            <AlertCircle size={14} /> {error}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[99vw] space-y-1 px-0.5 py-0.5">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-col gap-1 px-2 py-1.5 pl-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href={ROUTE_BASE} className="hover:text-foreground">Documentos</Link>
                <span>/</span>
                <Link href={`${ROUTE_BASE}/${id}`} className="font-mono hover:text-foreground">{row?.custom_id || `#${id}`}</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">Editar</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <h1 className="font-display text-[14px] font-semibold leading-tight text-foreground">
                  Editar documento cirúrgico
                </h1>
                <span className="rounded-full border border-violet-300/70 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300">
                  {typeLabel}
                </span>
                <span className="rounded-full border border-blue-300/70 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
                  {statusLabel}
                </span>
                <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
                  hasClinicalLink
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                    : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
                }`}>
                  {hasClinicalLink ? "Vinculado" : "Sem vínculo"}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1">
              {saved ? (
                <span className="inline-flex h-6 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <Check size={11} />
                  Guardado
                </span>
              ) : null}
              <Link href={`${ROUTE_BASE}/${id}`} className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-card px-2 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <ArrowLeft size={11} /> Voltar
              </Link>
              {currentFileHref ? (
                <a href={currentFileHref} target="_blank" rel="noreferrer" className="inline-flex h-6 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <Download size={11} /> Ficheiro
                </a>
              ) : null}
              <button type="submit" disabled={saving} className="inline-flex h-6 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Guardar
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-1 lg:grid-cols-[1.05fr_0.95fr]">
          <Card title="Documento" icon={<FileCheck2 size={12} />}>
            <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
              <Field label="Título">
                <input value={form.title} onChange={(event) => update("title", event.target.value)} className={INPUT} />
              </Field>
              <Field label="Referência externa">
                <input value={form.external_reference} onChange={(event) => update("external_reference", event.target.value)} className={INPUT} />
              </Field>
              <Field label="Tipo">
                <select value={form.document_type} onChange={(event) => update("document_type", event.target.value)} className={INPUT}>
                  {DOC_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Estado">
                <select value={form.status} onChange={(event) => update("status", event.target.value)} className={INPUT}>
                  {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Assinado em">
                <input type="datetime-local" value={form.signed_at} onChange={(event) => update("signed_at", event.target.value)} className={INPUT} />
              </Field>
              <Field label="Expira em">
                <input type="datetime-local" value={form.expires_at} onChange={(event) => update("expires_at", event.target.value)} className={INPUT} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Ficheiro">
                  <label className="flex h-8 cursor-pointer items-center justify-between gap-2 rounded-md border border-dashed border-violet-300 bg-violet-50/60 px-2 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <Upload size={12} />
                      <span className="truncate">{file ? file.name : currentFileHref ? "Substituir ficheiro existente" : "Selecionar ficheiro"}</span>
                    </span>
                    <input type="file" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                  </label>
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Vínculos clínicos" icon={<ShieldCheck size={12} />} className="z-50">
            <div className="grid grid-cols-1 gap-1.5">
              <Field label="Cirurgia">
                <SearchableRelationSelect
                  fieldName="surgery"
                  value={form.surgery}
                  onChange={(value) => update("surgery", asId(value))}
                  target={RELATION_TARGETS.surgery}
                  initialOptions={relationOptions.surgery}
                  placeholder="Pesquisar cirurgia..."
                />
              </Field>
              <Field label="Pedido cirúrgico">
                <SearchableRelationSelect
                  fieldName="surgical_request"
                  value={form.surgical_request}
                  onChange={(value) => update("surgical_request", asId(value))}
                  target={RELATION_TARGETS.surgical_request}
                  initialOptions={relationOptions.surgical_request}
                  placeholder="Pesquisar pedido..."
                />
              </Field>
              <Field label="Avaliação pré-operatória">
                <SearchableRelationSelect
                  fieldName="preoperative_assessment"
                  value={form.preoperative_assessment}
                  onChange={(value) => update("preoperative_assessment", asId(value))}
                  target={assessmentTarget}
                  initialOptions={relationOptions.preoperative_assessment}
                  placeholder="Pesquisar avaliação..."
                />
              </Field>
              <Field label="Autorização">
                <SearchableRelationSelect
                  fieldName="authorization"
                  value={form.authorization}
                  onChange={(value) => update("authorization", asId(value))}
                  target={RELATION_TARGETS.authorization}
                  initialOptions={relationOptions.authorization}
                  placeholder="Pesquisar autorização..."
                />
              </Field>
              <Field label="Carregado por">
                <SearchableRelationSelect
                  fieldName="uploaded_by"
                  value={form.uploaded_by}
                  onChange={(value) => update("uploaded_by", asId(value))}
                  target={RELATION_TARGETS.uploaded_by}
                  initialOptions={relationOptions.uploaded_by}
                  placeholder="Pesquisar responsável..."
                />
              </Field>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-1 lg:grid-cols-[0.8fr_1.2fr]">
          <Card title="Contexto" icon={<Scissors size={12} />}>
            <div className="grid grid-cols-2 gap-1">
              <ContextField label="Cirurgia" value={row?.surgery_code || surgery?.custom_id || (form.surgery ? `#${form.surgery}` : "—")} icon={<Scissors size={9} />} />
              <ContextField label="Paciente" value={surgery?.patient_name} icon={<User size={9} />} />
              <ContextField label="Procedimento" value={surgery?.procedure} icon={<FileText size={9} />} />
              <ContextField label="Agendada" value={fmtDateTime(surgery?.scheduled_for)} icon={<CalendarClock size={9} />} />
            </div>
          </Card>

          <Card title="Notas" icon={<FileText size={12} />}>
            <Field label="Observações">
              <textarea
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                rows={4}
                className="min-h-[78px] w-full rounded-md border border-border bg-card/70 px-2 py-1.5 text-[11px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-violet-400 focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
                placeholder="Notas do documento cirúrgico..."
              />
            </Field>
          </Card>
        </div>
      </form>
    </AppLayout>
  )
}
