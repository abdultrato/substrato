"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Edit2,
  ExternalLink,
  FileText,
  FlaskConical,
  Loader2,
  Microscope,
  Stethoscope,
  User,
  XCircle,
} from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

const GLASS = "rounded-xl border border-amber-200/60 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const ASA_COLOR: Record<string, string> = {
  ASA_I:   "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300",
  ASA_II:  "border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-700/30 dark:bg-lime-900/20 dark:text-lime-300",
  ASA_III: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300",
  ASA_IV:  "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/30 dark:bg-orange-900/20 dark:text-orange-300",
  ASA_V:   "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300",
  ASA_VI:  "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
  UNKNOWN: "border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300",
}

const STATUS_LABEL: Record<string, string> = {
  PENDING:            "Pendente",
  IN_PROGRESS:        "Em curso",
  FIT:                "Apto",
  TEMPORARILY_UNFIT:  "Temp. inapto",
  UNFIT:              "Inapto",
  REQUIRES_EXAMS:     "Requer exames",
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:           "border-gray-200 bg-gray-50 text-gray-600",
  IN_PROGRESS:       "border-sky-200 bg-sky-50 text-sky-700",
  FIT:               "border-emerald-200 bg-emerald-50 text-emerald-700",
  TEMPORARILY_UNFIT: "border-amber-200 bg-amber-50 text-amber-700",
  UNFIT:             "border-rose-200 bg-rose-50 text-rose-700",
  REQUIRES_EXAMS:    "border-violet-200 bg-violet-50 text-violet-700",
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })
}

function Pill({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  )
}

function SectionCard({ accent, icon, title, children }: {
  accent: string; icon: React.ReactNode; title: string; children: React.ReactNode
}) {
  return (
    <div className={`relative overflow-hidden ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="px-3 py-3 pl-4">
        <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">
          {icon} {title}
        </div>
        {children}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-white/20 py-1.5 last:border-b-0 dark:border-white/5">
      <span className="w-36 shrink-0 text-[11px] text-[var(--gray-500)]">{label}</span>
      <span className="flex-1 text-[11px] font-medium text-foreground">{children}</span>
    </div>
  )
}

function ExamBadge({ name, meta, color }: { name: string; meta?: string; color: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${color}`}>
      <span className="text-[11px] font-semibold">{name}</span>
      {meta ? <span className="text-[10px] opacity-70">· {meta}</span> : null}
    </div>
  )
}

function RequestBox({
  code,
  href,
  tone,
}: {
  code: string
  href?: string | null
  tone: "sky" | "violet"
}) {
  const palette = tone === "sky"
    ? {
        wrapper: "border-sky-300/70 bg-sky-100/80 dark:border-sky-700/40 dark:bg-sky-900/20",
        label: "text-sky-900 dark:text-sky-100",
        code: "bg-sky-700 text-white dark:bg-sky-500 dark:text-slate-950",
        link: "text-sky-800 hover:text-sky-900 dark:text-sky-200 dark:hover:text-white",
      }
    : {
        wrapper: "border-violet-300/70 bg-violet-100/80 dark:border-violet-700/40 dark:bg-violet-900/20",
        label: "text-violet-900 dark:text-violet-100",
        code: "bg-violet-700 text-white dark:bg-violet-500 dark:text-slate-950",
        link: "text-violet-800 hover:text-violet-900 dark:text-violet-200 dark:hover:text-white",
      }

  return (
    <div className={`mt-2 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] ${palette.wrapper}`}>
      <span className={`font-medium ${palette.label}`}>Requisição:</span>
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold shadow-sm ${palette.code}`}>
        {code}
      </span>
      {href ? (
        <Link href={href} className={`ml-auto inline-flex items-center gap-1 font-semibold transition ${palette.link}`}>
          Ver pedido <ExternalLink size={10} />
        </Link>
      ) : null}
    </div>
  )
}

export default function PreoperativeAssessmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<any>(`/surgery/avaliacao_pre_operatoria/${id}/`)
      .then(setData)
      .catch((e) => setError(e?.message || "Erro ao carregar avaliação."))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-[var(--gray-500)]">
        <Loader2 size={16} className="animate-spin" /> A carregar avaliação...
      </div>
    </AppLayout>
  )

  if (error || !data) return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto max-w-3xl px-2 py-4">
        <div className="rounded-xl border border-rose-300/50 bg-rose-50/60 px-4 py-3 text-sm text-rose-700">
          {error || "Avaliação não encontrada."}
        </div>
      </div>
    </AppLayout>
  )

  const statusCls = STATUS_COLOR[data.status] ?? "border-gray-200 bg-gray-50 text-gray-600"
  const asaCls = ASA_COLOR[data.asa_class] ?? ASA_COLOR.UNKNOWN

  // parse required_exams — may be array of strings or structured object
  let labExams: any[] = []
  let medExams: any[] = []
  let labRequest: any = null
  let medRequest: any = null

  if (data.laboratory_exams_details?.length) labExams = data.laboratory_exams_details
  if (data.medical_exams_details?.length) medExams = data.medical_exams_details
  if (data.laboratory_request_code) labRequest = { id: data.laboratory_request_id, code: data.laboratory_request_code }
  if (data.medical_request_code) medRequest = { id: data.medical_request_id, code: data.medical_request_code }

  // fallback: parse required_exams JSONField
  if (!labExams.length && !medExams.length && data.required_exams) {
    const raw = data.required_exams
    if (Array.isArray(raw)) {
      labExams = raw.filter((e: any) => typeof e === "string" && e.startsWith("LAB:")).map((e: string) => ({ name: e.replace(/^LAB:\s*/, "") }))
      medExams = raw.filter((e: any) => typeof e === "string" && e.startsWith("MED:")).map((e: string) => ({ name: e.replace(/^MED:\s*/, "") }))
      if (!labExams.length && !medExams.length) labExams = raw.map((e: any) => ({ name: String(e) }))
    } else if (typeof raw === "object" && raw !== null) {
      labExams = raw.laboratory_exams || []
      medExams = raw.medical_exams || []
      labRequest = labRequest || raw.laboratory_request || null
      medRequest = medRequest || raw.medical_request || null
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-3xl space-y-2 px-1 py-1">

        {/* ── HERO HEADER ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-amber-400" />
          {/* amber gradient wash */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-400/10 via-transparent to-transparent" />
          <div className="relative px-3 py-3 pl-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                  <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                  <span>/</span>
                  <Link href="/surgery/preoperative-assessments" className="hover:text-foreground">Avaliações pré-op.</Link>
                  <span>/</span>
                  <span className="font-semibold text-foreground">{data.custom_id || `#${id}`}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Stethoscope size={14} className="text-amber-600 dark:text-amber-400" />
                  </span>
                  <h1 className="font-display text-sm font-semibold text-foreground">
                    Avaliação pré-operatória
                  </h1>
                  <span className="font-mono text-[11px] text-[var(--gray-400)]">{data.custom_id}</span>
                </div>
                {/* KPI strip */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Pill label={STATUS_LABEL[data.status] ?? data.status} cls={statusCls} />
                  <Pill label={data.asa_class?.replace("_", " ") || "ASA ?"} cls={asaCls} />
                  {data.fit_for_surgery === true && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <CheckCircle2 size={10} /> Apto
                    </span>
                  )}
                  {data.fit_for_surgery === false && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700">
                      <XCircle size={10} /> Inapto
                    </span>
                  )}
                  {data.consent_signed && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-semibold text-sky-700">
                      <FileText size={10} /> Consentimento
                    </span>
                  )}
                  {data.exam_results_reviewed && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[10px] font-semibold text-teal-700">
                      <ClipboardCheck size={10} /> Exames revistos
                    </span>
                  )}
                  {data.surgical_risk && (
                    <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold text-orange-700">
                      Risco {data.surgical_risk}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Link href="/surgery/preoperative-assessments"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:bg-muted">
                  <ArrowLeft size={11} /> Voltar
                </Link>
                <Link href={`/surgery/preoperative-assessments/${id}/edit`}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
                  <Edit2 size={11} /> Editar
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-2 sm:grid-cols-2">

          {/* ── DADOS PRINCIPAIS ── */}
          <SectionCard accent="bg-sky-400" icon={<User size={11} />} title="Dados do paciente e avaliador">
            <Row label="Paciente">{data.patient_name || "—"}</Row>
            <Row label="Avaliador">{data.evaluator_name || "—"}</Row>
            <Row label="Avaliado em">{fmt(data.assessed_at)}</Row>
            <Row label="Pedido cirúrgico">
              {data.surgical_request_code
                ? <Link href={`/surgery/requests/${data.surgical_request}`} className="inline-flex items-center gap-1 text-sky-600 hover:underline">{data.surgical_request_code} <ExternalLink size={10} /></Link>
                : "—"}
            </Row>
            <Row label="Cirurgia proposta">
              {data.proposed_surgery_code
                ? <Link href={`/surgery/surgeries/${data.proposed_surgery}`} className="inline-flex items-center gap-1 text-sky-600 hover:underline">{data.proposed_surgery_code} <ExternalLink size={10} /></Link>
                : "—"}
            </Row>
            <Row label="Criado em">{fmtDate(data.created_at)}</Row>
          </SectionCard>

          {/* ── AVALIAÇÃO CLÍNICA ── */}
          <SectionCard accent="bg-emerald-400" icon={<Stethoscope size={11} />} title="Avaliação clínica">
            <Row label="Classificação ASA">
              <Pill label={data.asa_class?.replace("_", " ") || "—"} cls={asaCls} />
            </Row>
            <Row label="Risco cirúrgico">{data.surgical_risk || "—"}</Row>
            <Row label="Aptidão">
              {data.fit_for_surgery === true
                ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={11} /> Apto</span>
                : data.fit_for_surgery === false
                ? <span className="inline-flex items-center gap-1 text-rose-600"><XCircle size={11} /> Inapto</span>
                : <span className="text-[var(--gray-400)]">Não definido</span>}
            </Row>
            <Row label="Consentimento">{data.consent_signed ? "Assinado" : "Pendente"}</Row>
            <Row label="Exames revistos">{data.exam_results_reviewed ? "Sim" : "Não"}</Row>
            <Row label="Estado">
              <Pill label={STATUS_LABEL[data.status] ?? data.status} cls={statusCls} />
            </Row>
          </SectionCard>

        </div>

        {/* ── AVALIAÇÃO MÉDICA ── */}
        {(data.medical_evaluation || data.anesthetic_evaluation) ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {data.medical_evaluation ? (
              <SectionCard accent="bg-teal-400" icon={<ClipboardCheck size={11} />} title="Avaliação médica">
                <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">
                  {data.medical_evaluation}
                </p>
              </SectionCard>
            ) : null}
            {data.anesthetic_evaluation ? (
              <SectionCard accent="bg-indigo-400" icon={<Stethoscope size={11} />} title="Avaliação anestésica">
                <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">
                  {data.anesthetic_evaluation}
                </p>
              </SectionCard>
            ) : null}
          </div>
        ) : null}

        {/* ── EXAMES LABORATORIAIS ── */}
        {labExams.length > 0 ? (
          <SectionCard accent="bg-sky-500" icon={<FlaskConical size={11} />} title="Exames laboratoriais">
            <div className="grid gap-1.5 sm:grid-cols-2">
              {labExams.map((exam: any, i: number) => (
                <ExamBadge key={i}
                  name={exam.name || exam.custom_id || `Exame #${i+1}`}
                  meta={[exam.code, exam.sector_name, exam.sample_type].filter(Boolean).join(" · ")}
                  color="border border-sky-200 bg-sky-50/60 text-sky-800 dark:border-sky-700/30 dark:bg-sky-900/10 dark:text-sky-200"
                />
              ))}
            </div>
            {labRequest && (
              <RequestBox
                code={labRequest.code}
                href={labRequest.id ? `/clinical/lab-requests/${labRequest.id}` : null}
                tone="sky"
              />
            )}
          </SectionCard>
        ) : null}

        {/* ── EXAMES MÉDICOS ── */}
        {medExams.length > 0 ? (
          <SectionCard accent="bg-violet-500" icon={<Microscope size={11} />} title="Exames médicos complementares">
            <div className="grid gap-1.5 sm:grid-cols-2">
              {medExams.map((exam: any, i: number) => (
                <ExamBadge key={i}
                  name={exam.name || exam.custom_id || `Exame #${i+1}`}
                  meta={[exam.method, exam.sector, exam.modality].filter(Boolean).join(" · ")}
                  color="border border-violet-200 bg-violet-50/60 text-violet-800 dark:border-violet-700/30 dark:bg-violet-900/10 dark:text-violet-200"
                />
              ))}
            </div>
            {medRequest && (
              <RequestBox
                code={medRequest.code}
                href={medRequest.id ? `/clinical/lab-requests/${medRequest.id}` : null}
                tone="violet"
              />
            )}
          </SectionCard>
        ) : null}

        {/* ── OBSERVAÇÕES ── */}
        {data.observations ? (
          <SectionCard accent="bg-slate-400" icon={<FileText size={11} />} title="Observações clínicas">
            <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">
              {data.observations}
            </p>
          </SectionCard>
        ) : null}

        {/* ── FOOTER META ── */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-1 pb-1 text-[10px] text-[var(--gray-400)]">
          <span>Criado: {fmt(data.created_at)}</span>
          <span>Actualizado: {fmt(data.updated_at)}</span>
          <span>Versão: {data.version}</span>
          <span className="ml-auto font-mono">{data.custom_id}</span>
        </div>

      </div>
    </AppLayout>
  )
}
