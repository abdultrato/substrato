"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Download,
  Edit3,
  FileCheck2,
  FileText,
  Loader2,
  Scissors,
  ShieldCheck,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type Row = Record<string, any>

const ENDPOINT = "/surgery/documentos"
const ROUTE_BASE = "/surgery/documents"
const GLASS = "rounded-lg border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const DOC_TYPES: Record<string, { label: string; tone: string }> = {
  CONSENT: { label: "Consentimento", tone: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300" },
  QUOTATION: { label: "Orçamento", tone: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300" },
  AUTHORIZATION: { label: "Autorização", tone: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300" },
  INSURANCE: { label: "Seguro", tone: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300" },
  PREOPERATIVE: { label: "Pré-operatório", tone: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300" },
  ANESTHESIA: { label: "Anestesia", tone: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-700/30 dark:bg-fuchsia-900/20 dark:text-fuchsia-300" },
  OPERATIVE_REPORT: { label: "Relatório operatório", tone: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700/30 dark:bg-indigo-900/20 dark:text-indigo-300" },
  DISCHARGE: { label: "Alta", tone: "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700/30 dark:bg-teal-900/20 dark:text-teal-300" },
  OTHER: { label: "Outro", tone: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700/30 dark:bg-slate-900/20 dark:text-slate-300" },
}

const STATUSES: Record<string, { label: string; bar: string; badge: string }> = {
  DRAFT: { label: "Rascunho", bar: "bg-slate-400", badge: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700/30 dark:bg-slate-900/20 dark:text-slate-300" },
  PENDING_REVIEW: { label: "Pendente de revisão", bar: "bg-amber-500", badge: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300" },
  SIGNED: { label: "Assinado", bar: "bg-emerald-500", badge: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300" },
  AMENDED: { label: "Retificado", bar: "bg-blue-500", badge: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300" },
  CANCELLED: { label: "Cancelado", bar: "bg-rose-500", badge: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300" },
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

function isExpired(value: unknown): boolean {
  if (!value) return false
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
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

function Field({ label, value, icon }: { label: string; value: unknown; icon?: React.ReactNode }) {
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
    <section className={`relative overflow-hidden ${GLASS} ${className}`}>
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

export default function SurgeryDocumentDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)

  const [data, setData] = useState<Row | null>(null)
  const [surgery, setSurgery] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const row = await apiFetch<Row>(`${ENDPOINT}/${id}/`)
      setData(row)
      setSurgery(row?.surgery ? await apiFetch<Row>(`/surgery/surgery/${row.surgery}/`).catch(() => null) : null)
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar documento cirúrgico.")
      setData(null)
      setSurgery(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </div>
      </AppLayout>
    )
  }

  if (error || !data) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
        <div className="mx-auto w-full max-w-[99vw] px-1 py-1">
          <div className="flex items-center gap-2 rounded-lg border border-rose-300/50 bg-rose-50/60 px-3 py-2 text-sm text-rose-700">
            <AlertCircle size={14} /> {error || "Documento não encontrado."}
          </div>
        </div>
      </AppLayout>
    )
  }

  const status = STATUSES[String(data.status || "").toUpperCase()] || STATUSES.DRAFT
  const docType = DOC_TYPES[String(data.document_type || "").toUpperCase()] || DOC_TYPES.OTHER
  const expired = isExpired(data.expires_at)
  const href = fileHref(data.file)

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
      <div className="mx-auto w-full max-w-[99vw] space-y-1 px-0.5 py-0.5">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${status.bar}`} />
          <div className="flex flex-col gap-1 px-2 py-1.5 pl-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href={ROUTE_BASE} className="hover:text-foreground">Documentos</Link>
                <span>/</span>
                <span className="font-mono text-foreground">{data.custom_id || `#${id}`}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <h1 className="font-display text-[14px] font-semibold leading-tight text-foreground">
                  {data.title || "Documento cirúrgico"}
                </h1>
                <span className={`inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-semibold ${docType.tone}`}>
                  {docType.label}
                </span>
                <span className={`inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-semibold ${status.badge}`}>
                  {status.label}
                </span>
                {expired ? (
                  <span className="inline-flex h-6 items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2 text-[10px] font-semibold text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
                    <AlertTriangle size={11} /> Expirado
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1">
              <Link href={ROUTE_BASE} className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-card px-2 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <ArrowLeft size={11} /> Voltar
              </Link>
              <Link href={`${ROUTE_BASE}/${id}/edit`} className="inline-flex h-6 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                <Edit3 size={11} /> Editar
              </Link>
              {href ? (
                <a href={href} target="_blank" rel="noreferrer" className="inline-flex h-6 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <Download size={11} /> Abrir ficheiro
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-1 lg:grid-cols-[1.05fr_0.95fr]">
          <Card title="Documento" icon={<FileCheck2 size={12} />}>
            <div className="grid grid-cols-2 gap-1">
              <Field label="Código" value={data.custom_id || `#${id}`} icon={<FileText size={9} />} />
              <Field label="Referência externa" value={data.external_reference} />
              <Field label="Assinado em" value={fmtDateTime(data.signed_at)} icon={<CheckCircle2 size={9} />} />
              <Field label="Expira em" value={fmtDateTime(data.expires_at)} icon={<CalendarClock size={9} />} />
              <Field label="Carregado por" value={data.uploaded_by_name || (data.uploaded_by ? `#${data.uploaded_by}` : "—")} icon={<User size={9} />} />
              <Field label="Ficheiro" value={href ? "Disponível" : "Sem ficheiro"} />
            </div>
          </Card>

          <Card title="Vínculo clínico" icon={<ShieldCheck size={12} />}>
            <div className="grid grid-cols-2 gap-1">
              <Field label="Cirurgia" value={data.surgery_code || surgery?.custom_id || (data.surgery ? `#${data.surgery}` : "—")} icon={<Scissors size={9} />} />
              <Field label="Paciente" value={surgery?.patient_name} icon={<User size={9} />} />
              <Field label="Pedido" value={data.surgical_request_code || (data.surgical_request ? `#${data.surgical_request}` : "—")} />
              <Field label="Avaliação pré-op." value={data.preoperative_assessment_code || (data.preoperative_assessment ? `#${data.preoperative_assessment}` : "—")} />
              <Field label="Autorização" value={data.authorization_code || (data.authorization ? `#${data.authorization}` : "—")} />
              <Field label="Procedimento" value={surgery?.procedure} />
            </div>
          </Card>
        </div>

        <Card title="Notas" icon={<FileText size={12} />}>
          <p className="min-h-[54px] rounded-md border border-border/60 bg-card/35 px-2 py-1.5 text-[11px] leading-relaxed text-foreground">
            {data.notes || "Sem observações registadas."}
          </p>
        </Card>
      </div>
    </AppLayout>
  )
}
