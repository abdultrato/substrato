"use client"

import Link from "next/link"
import { useState } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  AlertTriangle, ArrowLeft, BarChart2, CheckCircle2,
  Circle, Clock, FlaskConical, Stethoscope, TestTube2,
  User, Building2, CalendarClock, Droplets, Zap, FileText,
  Loader2, Send, Printer, Bell,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import ManchesterBadge from "@/components/ui/ManchesterBadge"

import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { abbreviateMiddleNames } from "@/lib/formatName"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import { RequestsSubNav } from "./RequestsBoardPage"

const ENDPOINT = "/clinical/labrequest/"

/* ── helpers ────────────────────────────────────────────── */

function fmtDate(v: any): string {
  if (!v) return "—"
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(v))
  } catch { return String(v) }
}

function statusMeta(status: string): { label: string; color: string; dot: string } {
  const s = String(status || "").toLowerCase()
  if (s === "pendente")              return { label: "Pendente",              color: "border-amber-300 bg-amber-50 text-amber-800",     dot: "bg-amber-400" }
  if (s === "em_analise")            return { label: "Em Análise",            color: "border-blue-300 bg-blue-50 text-blue-800",         dot: "bg-blue-400" }
  if (s === "aguardando_validacao")  return { label: "Aguard. Validação",     color: "border-indigo-300 bg-indigo-50 text-indigo-800",   dot: "bg-indigo-400" }
  if (s === "validado")              return { label: "Validado",              color: "border-emerald-300 bg-emerald-50 text-emerald-800", dot: "bg-emerald-400" }
  if (s === "cancelado")             return { label: "Cancelado",             color: "border-red-300 bg-red-50 text-red-800",            dot: "bg-red-400" }
  if (s === "desconsiderado")        return { label: "Desconsiderado",        color: "border-gray-300 bg-gray-50 text-gray-600",         dot: "bg-gray-400" }
  return { label: status, color: "border-gray-200 bg-gray-50 text-gray-700", dot: "bg-gray-400" }
}


function val(r: any, ...keys: string[]): any {
  for (const k of keys) if (r?.[k] !== undefined && r?.[k] !== null && r?.[k] !== "") return r[k]
  return null
}

function isRequestEditable(record: any): boolean {
  const status = String(val(record, "status", "estado") || "").toLowerCase()
  const validatedAt = val(record, "validated_at")
  const collectedAt = val(record, "collected_at")
  const items = Array.isArray(record?.items) ? record.items : Array.isArray(record?.itens) ? record.itens : []
  const hasLockedSample = items.some((item: any) => {
    const sampleStatus = String(item?.sample_status || "").toLowerCase()
    return Boolean(item?.sample_received_at) || ["coletada", "colhida", "recebida"].includes(sampleStatus)
  })

  return status === "pendente" && !validatedAt && !collectedAt && !hasLockedSample
}

/* ── sub-components ─────────────────────────────────────── */

const GLASS =
  "border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

function SectionCard({ icon, title, accent = "bg-[var(--primary-600)]", className = "", children }: {
  icon: React.ReactNode; title: string; accent?: string; className?: string; children: React.ReactNode
}) {
  return (
    <div className={`relative flex flex-col gap-1.5 overflow-hidden rounded-lg ${GLASS} px-2.5 py-2 pl-3.5 ${className}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="flex items-center gap-1.5 border-b border-border/50 pb-1.5">
        <span className="text-[var(--primary-600)]">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="w-24 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="min-w-0 text-xs font-medium text-foreground">{value || "—"}</span>
    </div>
  )
}

function ExamPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--primary-200)] bg-[var(--primary-50)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary-700)]">
      <FlaskConical size={9} />
      {name}
    </span>
  )
}

function SampleCard({ item }: { item: any }) {
  const name    = val(item, "name", "nome") || "Amostra"
  const bottle  = val(item, "bottle_type_display", "bottle_type")
  const volume  = val(item, "minimum_volume_ml")
  const fasting = item?.fasting_required
  const hours   = item?.fasting_hours

  return (
    <div className="flex items-start gap-1.5 rounded-lg border border-white/20 bg-white/40 px-2 py-1.5 text-[11px] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
      <Droplets size={13} className="mt-0.5 shrink-0 text-sky-500" />
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{name}</p>
        {bottle  ? <p className="text-muted-foreground">{bottle}{volume ? ` · vol. mín. ${volume} ml` : ""}</p> : null}
        {fasting ? <p className="mt-0.5 flex items-center gap-1 text-amber-700"><Zap size={9} />Jejum{Number(hours) > 0 ? ` ${hours}h` : " obrigatório"}</p> : null}
      </div>
    </div>
  )
}

type TimelineStep = { label: string; date: any; by?: string; done: boolean }

function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-0">
      {steps.map((step, i) => (
        <li key={i} className="relative flex flex-1 items-start gap-2.5 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
          <span className="relative z-10 mt-0.5 shrink-0">
            {step.done
              ? <CheckCircle2 size={16} className="text-emerald-500" />
              : <Circle      size={16} className="text-[var(--gray-300)]" />}
          </span>
          {i < steps.length - 1 && (
            <>
              {/* conector vertical (mobile) */}
              <span className="absolute left-[7px] top-6 h-full w-px bg-border sm:hidden" />
              {/* conector horizontal (desktop) */}
              <span className={`absolute left-1/2 top-2 hidden h-px w-full sm:block ${step.done ? "bg-emerald-400/60" : "bg-border"}`} />
            </>
          )}
          <div className="min-w-0">
            <p className={`text-xs font-semibold ${step.done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
            {step.date  ? <p className="text-[10px] text-muted-foreground">{fmtDate(step.date)}</p> : null}
            {step.by    ? <p className="text-[10px] text-muted-foreground">{step.by}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

/* ── main page ──────────────────────────────────────────── */

export default function RequestDetailPage() {
  useAuthGuard()
  const { t } = useLanguage()
  const params = useParams()
  const id = String((params as any)?.id || "")
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [forwarding, setForwarding] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [actionNotice, setActionNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  const { data: r, isLoading, error, refetch } = useQuery({
    queryKey: ["request-detail", id, safeRefreshToken],
    queryFn: () => apiFetch<Record<string, any>>(`${ENDPOINT}${id}/`, { clientCache: safeRefreshToken === 0 }),
    enabled: !!id,
  })

  const reportHref = `/reports?endpoint=${encodeURIComponent(ENDPOINT)}&group=Área+Clínica&resource=Requisição`

  if (isLoading) {
    return (
      <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical")} subNav={<RequestsSubNav />}>
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">{t("Carregando...", "Loading...")}</div>
      </AppLayout>
    )
  }

  if (error || !r) {
    return (
      <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical")} subNav={<RequestsSubNav />}>
        <div className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {(error as any)?.message || t("Requisição não encontrada.", "Request not found.")}
        </div>
      </AppLayout>
    )
  }

  /* derived values */
  const code            = val(r, "custom_id", "id_custom", "codigo") || `#${r.id}`
  const patientNameFull = val(r, "patient_name", "paciente_nome") || "—"
  const patientName     = patientNameFull === "—" ? patientNameFull : abbreviateMiddleNames(String(patientNameFull))
  const patientCode     = val(r, "patient_code", "paciente_codigo")
  const company         = val(r, "requesting_company_name", "empresa_solicitante_nome")
  const extCompany      = val(r, "external_executing_company_name", "empresa_executora_externa_nome")
  const physicianRaw    = val(r, "requesting_physician_name")
  const physicianProfessionRaw = val(r, "requesting_physician_profession_name")
  const physicianRoleRaw = val(r, "requesting_physician_role_name")
  const physicianDocument = val(r, "requesting_physician_document_number")
  const analystRaw      = val(r, "analyst_name")
  const physician       = physicianRaw ? String(physicianRaw) : physicianRaw
  const physicianProfession = physicianProfessionRaw ? String(physicianProfessionRaw) : physicianProfessionRaw
  const physicianRole   = physicianRoleRaw ? String(physicianRoleRaw) : physicianRoleRaw
  const analystName     = analystRaw ? abbreviateMiddleNames(String(analystRaw)) : analystRaw
  const reqType         = val(r, "type", "tipo")
  const status          = val(r, "status", "estado") || ""
  const requestStatus   = String(status).toLowerCase()
  const clinicalStatus  = val(r, "clinical_status", "status_clinico") || ""
  const clinicalDisplay = val(r, "clinical_status_display", "prioridade_display") || ""
  const hasCritical     = r?.has_critical_result || r?.possui_resultado_critico
  const isOccupational  = r?.is_occupational || r?.ocupacional
  const requiresFasting = r?.requires_fasting || r?.requer_jejum
  const fastingHours    = r?.fasting_hours || r?.horas_jejum
  const createdAt       = val(r, "created_at", "criado_em")
  const updatedAt       = val(r, "updated_at", "atualizado_em")
  const validatedAt     = val(r, "validated_at")
  const validatedBy     = val(r, "validated_by_name")
  const collectedAt     = val(r, "collected_at")
  const collectedBy     = val(r, "collected_by_name")
  const canceledAt      = val(r, "canceled_at", "cancelado_em", "cancelada_em") || (String(status).toLowerCase() === "cancelado" ? updatedAt : null)
  const canForward      = requestStatus === "pendente" && !validatedAt
  const canNotifyPatient = reqType === "LAB" && requestStatus === "validado"
  const reqTypeLabel    = reqType === "LAB" ? "Requisição Laboratorial"
                        : reqType === "MED" ? "Requisição de Exame Médico"
                        : reqType

  const tests: any[]   = Array.isArray(r?.requested_tests) ? r.requested_tests
                       : Array.isArray(r?.items)            ? r.items
                       : Array.isArray(r?.itens)            ? r.itens
                       : []
  // Depois da validação/colheita/receção, alterações passam por nota de crédito.
  const canEdit = isRequestEditable(r)
  const samples: any[] = Array.isArray(r?.sample_details)  ? r.sample_details
                       : Array.isArray(r?.sample_options)   ? r.sample_options
                       : []

  const sm = statusMeta(status)

  const timelineSteps: TimelineStep[] = [
    { label: "Criada",    date: createdAt,   done: !!createdAt },
    { label: "Validada",  date: validatedAt, by: validatedBy || undefined, done: !!validatedAt },
    { label: "Coletada",  date: collectedAt, by: collectedBy || undefined, done: !!collectedAt },
    { label: "Resultados validados", date: null, done: requestStatus === "validado" },
  ]

  async function forwardRequest() {
    setForwarding(true)
    setActionNotice(null)
    try {
      await apiFetch(`${ENDPOINT}${id}/validar/`, {
        method: "POST",
        body: JSON.stringify({}),
        clientCache: false,
      })
      await refetch()
      setActionNotice({
        kind: "ok",
        text: t(
          "Requisição encaminhada para sala de procedimentos e examinacao.",
          "Request forwarded to the procedure and examination room."
        ),
      })
    } catch (err: any) {
      setActionNotice({
        kind: "error",
        text: err?.message || t("Falha ao encaminhar a requisição.", "Failed to forward request."),
      })
    } finally {
      setForwarding(false)
    }
  }

  async function notifyPatient() {
    setNotifying(true)
    setActionNotice(null)
    try {
      await apiFetch(`${ENDPOINT}${id}/send-results-notification/`, {
        method: "POST",
        body: JSON.stringify({}),
        clientCache: false,
      })
      setActionNotice({
        kind: "ok",
        text: t("Notificação enviada ao paciente.", "Notification sent to the patient."),
      })
    } catch (err: any) {
      setActionNotice({
        kind: "error",
        text: err?.message || t("Falha ao notificar o paciente.", "Failed to notify the patient."),
      })
    } finally {
      setNotifying(false)
    }
  }

  function openRequestPdf() {
    if (!id) return
    window.open(`/api/v1/clinical/labrequest/${id}/request-pdf/`, "_blank")
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical")} subNav={<RequestsSubNav />}>
      <div className="w-full space-y-2 px-1">

        {/* ── HERO ────────────────────────────────────────── */}
        <div className={`flex flex-col gap-1.5 rounded-lg ${GLASS} px-3 py-2.5`}>
          <div className="flex min-w-0 flex-col gap-1">
            {/* breadcrumb + acções na mesma fila */}
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
              <Link href="/requests" className="hover:text-foreground transition-colors">Requisições</Link>
              <span>/</span>
              <span className="font-semibold text-foreground">{code}</span>

              <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1">
                {canForward ? (
                  <button
                    type="button"
                    onClick={() => void forwardRequest()}
                    disabled={forwarding}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[var(--primary-600)] px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {forwarding ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    {forwarding ? "Encaminhando..." : "Encaminhar"}
                  </button>
                ) : null}
                {canNotifyPatient ? (
                  <button
                    type="button"
                    onClick={() => void notifyPatient()}
                    disabled={notifying}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/35"
                  >
                    {notifying ? <Loader2 size={11} className="animate-spin" /> : <Bell size={11} />}
                    {notifying ? "A notificar..." : "Notificar paciente"}
                  </button>
                ) : null}
                {canEdit ? (
                  <Link
                    href={`/requests/${id}/edit`}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground-2 shadow-sm transition hover:bg-muted hover:text-foreground"
                  >
                    Editar
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={openRequestPdf}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground-2 shadow-sm transition hover:bg-muted hover:text-foreground"
                >
                  <Printer size={11} />
                  Imprimir requisição
                </button>
                <Link
                  href={reportHref}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[var(--primary-200)] bg-[var(--primary-50)] px-2.5 text-xs font-semibold text-[var(--primary-700)] shadow-sm transition hover:bg-[var(--primary-100)]"
                >
                  <BarChart2 size={11} />
                  Relatório
                </Link>
                <Link
                  href="/requests"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground"
                >
                  <ArrowLeft size={12} />
                  Voltar
                </Link>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-1.5">
              <h1 className="truncate text-base font-bold text-foreground">{patientName}</h1>
              {patientCode ? <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{patientCode}</span> : null}
            </div>

            {/* linha de contexto: atributos críticos sempre na mesma linha */}
            <div className="flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-0.5">
              {reqTypeLabel ? (
                <span className="shrink-0 whitespace-nowrap rounded-full border border-[var(--primary-200)] bg-[var(--primary-50)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--primary-700)]">
                  {reqTypeLabel}
                </span>
              ) : null}
              <span className="shrink-0 whitespace-nowrap rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                {code}
              </span>
              <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${sm.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />
                {sm.label}
              </span>
              <span className="inline-flex shrink-0 whitespace-nowrap">
                <ManchesterBadge status={clinicalStatus} display={clinicalDisplay} className="px-2.5 py-0.5 text-[11px]" />
              </span>
              {hasCritical ? (
                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-red-400 bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                  <AlertTriangle size={9} />
                  Resultado crítico
                </span>
              ) : null}
              {isOccupational ? (
                <span className="shrink-0 whitespace-nowrap rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                  Ocupacional
                </span>
              ) : null}
              {requiresFasting ? (
                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                  <Zap size={9} />
                  Jejum{Number(fastingHours) > 0 ? ` ${fastingHours}h` : ""}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {actionNotice ? (
          <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${
            actionNotice.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}>
            {actionNotice.text}
          </div>
        ) : null}

        {/* ── Masonry details ─────────────────────────────── */}
        <div className="columns-1 gap-2 md:columns-2 [&>*]:mb-2 [&>*]:break-inside-avoid">
          <SectionCard icon={<User size={13} />} title="Paciente" accent="bg-sky-500">
            <Row label="Nome"   value={patientNameFull} />
            <Row label="Código" value={patientCode} />
          </SectionCard>

          {(company || physician || physicianProfession || physicianRole || physicianDocument || extCompany || analystName) ? (
            <SectionCard icon={<Building2 size={13} />} title="Requisitante" accent="bg-indigo-500">
                {company     ? <Row label="Empresa"       value={company} />     : null}
                {physician   ? <Row label="Médico"        value={physician} />   : null}
                {physicianProfession ? <Row label="Especialidade" value={physicianProfession} /> : null}
                {physicianRole ? <Row label="Cargo" value={physicianRole} /> : null}
                {physicianDocument ? <Row label="N.º profissional" value={physicianDocument} /> : null}
                {extCompany  ? <Row label="Exec. externa" value={extCompany} />  : null}
                {analystName ? <Row label="Analista"      value={analystName} /> : null}
              </SectionCard>
          ) : null}

          <SectionCard icon={<CalendarClock size={13} />} title="Datas" accent="bg-teal-500">
            <Row label="Criada em"   value={fmtDate(createdAt)} />
            <Row label="Validada em" value={fmtDate(validatedAt)} />
            <Row label={canceledAt ? "Cancelada em" : "Coletada em"} value={fmtDate(canceledAt || collectedAt)} />
          </SectionCard>

          <SectionCard icon={<Clock size={13} />} title="Estado de prioridade" accent="bg-rose-500">
            <ManchesterBadge status={clinicalStatus} display={clinicalDisplay} className="px-3 py-2 text-xs rounded-lg" />
            {hasCritical ? (
              <div className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50/70 px-3 py-2 text-[11px] text-red-800 backdrop-blur-sm">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>Esta requisição possui pelo menos um resultado crítico que requer atenção imediata.</span>
              </div>
            ) : null}
          </SectionCard>

          {tests.length > 0 ? (
            <SectionCard icon={<FlaskConical size={13} />} title={`Exames (${tests.length})`} accent="bg-violet-500">
              <div className="flex flex-wrap gap-0.5">
                {tests.map((item: any, i: number) => {
                  const name = val(item, "test_name", "exam_name", "medical_exam_name", "name", "nome") || `Exame ${i + 1}`
                  return <ExamPill key={i} name={name} />
                })}
              </div>
            </SectionCard>
          ) : (
            <SectionCard icon={<FlaskConical size={13} />} title="Exames" accent="bg-violet-500">
              <p className="text-[11px] text-muted-foreground">Nenhum exame registado.</p>
            </SectionCard>
          )}

          {samples.length > 0 ? (
            <SectionCard icon={<TestTube2 size={13} />} title={`Amostras (${samples.length})`} accent="bg-cyan-500">
              <div className="flex flex-col gap-1">
                {samples.map((s: any, i: number) => <SampleCard key={i} item={s} />)}
              </div>
            </SectionCard>
          ) : null}

          {r?.notes || r?.observacoes ? (
            <SectionCard icon={<FileText size={13} />} title="Observações" accent="bg-amber-500">
              <p className="whitespace-pre-wrap text-xs text-foreground">{r.notes || r.observacoes}</p>
            </SectionCard>
          ) : null}
        </div>

        {/* ── Linha do tempo (largura total) ──────────────── */}
        <SectionCard icon={<Stethoscope size={13} />} title="Linha do tempo" accent="bg-emerald-500">
          <Timeline steps={timelineSteps} />
        </SectionCard>
      </div>
    </AppLayout>
  )
}
