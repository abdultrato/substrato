"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Clipboard, Clock3, Edit3, FileText, FlaskConical, Trash2, User } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"

type NursingRecordDetail = Record<string, any> & {
  id?: number
  custom_id?: string | null
  name?: string | null
  patient?: number | null
  patient_name?: string | null
  ward?: number | null
  ward_name?: string | null
  record_kind?: string | null
  origin_role?: string | null
  priority?: string | null
  observation?: string | null
  lab_request?: number | null
  lab_request_code?: string | null
  lab_request_status?: string | null
  collection_guidance?: unknown
  record_date?: string | null
  created_at?: string | null
  updated_at?: string | null
}

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const PRIORITIES: Record<string, { label: string; accent: string; badge: string }> = {
  URG: { label: "Urgente", accent: "bg-red-500", badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300" },
  NOR: { label: "Normal", accent: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300" },
  BAI: { label: "Baixa", accent: "bg-sky-500", badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-300" },
}

const LAB_STATUSES: Record<string, string> = {
  pendente: "Pendente",
  solicitado: "Solicitada",
  coletado: "Coletada",
  colhido: "Colhida",
  em_analise: "Em análise",
  validado: "Validada",
  concluido: "Concluída",
  cancelado: "Cancelada",
}

function ensureTrailingSlash(url: string) {
  return url.endsWith("/") ? url : `${url}/`
}

function fmtDate(value?: string | null) {
  if (!value) return "—"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function humanize(value?: string | null) {
  if (!value) return "—"
  return value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase())
}

function guidanceSummary(guidance: unknown) {
  if (Array.isArray(guidance)) {
    if (!guidance.length) return "Sem orientações registadas"
    return `${guidance.length} ${guidance.length === 1 ? "orientação de coleta" : "orientações de coleta"}`
  }
  if (guidance && typeof guidance === "object") {
    const count = Object.keys(guidance).length
    return count ? `${count} ${count === 1 ? "orientação de coleta" : "orientações de coleta"}` : "Sem orientações registadas"
  }
  return "Sem orientações registadas"
}

function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-1.5 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="min-w-0 break-words text-sm leading-relaxed text-foreground">{value || "—"}</div>
    </div>
  )
}

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  accent,
  children,
}: {
  title: string
  subtitle?: string
  icon: typeof Clipboard
  accent: string
  children: ReactNode
}) {
  return (
    <section className={`relative overflow-hidden ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="px-4 py-2 pl-5">
        <div className="mb-2 flex items-start gap-3">
          <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent} text-white shadow-sm`}>
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight text-foreground">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        <div className="divide-y divide-border/60">{children}</div>
      </div>
    </section>
  )
}

export default function NursingRecordsDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = routeParamToString((params as any)?.id)
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [data, setData] = useState<NursingRecordDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const detailEndpoint = ensureTrailingSlash("/nursing/nursing_record/") + `${id}/`
      const response = await apiFetch<NursingRecordDetail>(detailEndpoint, {
        clientCache: safeRefreshToken === 0,
      })
      setData(response)
    } catch (reason: any) {
      setData(null)
      setError(isNotFoundLikeError(reason) ? null : reason?.message || "Falha ao carregar o registo de enfermagem.")
    } finally {
      setLoading(false)
    }
  }, [id, safeRefreshToken])

  useEffect(() => {
    load().catch(() => {})
  }, [load])

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await apiFetch(`/nursing/nursing_record/${id}/`, { method: "DELETE" })
      router.push("/nursing/nursing-records")
    } catch (reason: any) {
      setError(isNotFoundLikeError(reason) ? "Registo não encontrado." : reason?.message || "Não foi possível apagar o registo.")
    } finally {
      setDeleting(false)
    }
  }

  const title = useMemo(() => data?.name || data?.patient_name || `Registo #${id}`, [data, id])
  const priority = PRIORITIES[data?.priority || ""] || PRIORITIES.NOR
  const isLabRequest = data?.record_kind === "LAB_COLLECTION_REQUEST"

  if (loading) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Carregando...</div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
        <div className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error || "Registo de enfermagem não encontrado."}
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-5xl space-y-4 px-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${priority.accent}`} />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20">
                <Clipboard size={17} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-bold leading-tight text-foreground">{title}</h1>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${priority.badge}`}>{priority.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {isLabRequest ? "Coleta laboratorial" : "Registo manual"} · {data.custom_id || `REG-${data.id}`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/nursing/nursing-records/${id}/edit`} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted">
                <Edit3 size={15} /> Editar
              </Link>
              <ConfirmDialog title="Apagar registo" message="Esta ação apaga definitivamente o registo de enfermagem selecionado." confirmText="Apagar" onConfirm={handleDelete} disabled={deleting}>
                <button type="button" disabled={deleting} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-red-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:opacity-60">
                  <Trash2 size={15} /> {deleting ? "Apagando..." : "Apagar"}
                </button>
              </ConfirmDialog>
              <Link href="/nursing/nursing-records" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted">
                <ArrowLeft size={16} /> Voltar
              </Link>
            </div>
          </div>
        </section>

        {error ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Identificação" subtitle="Chave do registo e controlo temporal." icon={Clipboard} accent="bg-violet-500">
            <FieldRow label="Código" value={data.custom_id || `REG-${data.id}`} />
            <FieldRow label="Nome do registo" value={data.name || "Registo de enfermagem"} />
            <FieldRow label="Data do registo" value={fmtDate(data.record_date)} />
            <FieldRow label="Atualizado em" value={fmtDate(data.updated_at)} />
          </SectionCard>

          <SectionCard title="Paciente e local" subtitle="Pessoa assistida e contexto de internamento." icon={User} accent="bg-sky-500">
            <FieldRow label="Paciente" value={data.patient_name || (data.patient ? `Paciente #${data.patient}` : "—")} />
            <FieldRow label="Enfermaria" value={data.ward_name || (data.ward ? `Enfermaria #${data.ward}` : "—")} />
            <FieldRow label="Perfil de origem" value={humanize(data.origin_role)} />
            <FieldRow label="Prioridade" value={priority.label} />
          </SectionCard>

          <SectionCard title="Tipo e requisição" subtitle="Origem clínica e ligação laboratorial." icon={FlaskConical} accent="bg-emerald-500">
            <FieldRow label="Tipo de registo" value={isLabRequest ? "Requisição laboratorial para coleta" : "Manual"} />
            <FieldRow label="Requisição" value={data.lab_request_code || (data.lab_request ? `Requisição #${data.lab_request}` : "—")} />
            <FieldRow label="Estado da requisição" value={LAB_STATUSES[String(data.lab_request_status || "").toLowerCase()] || humanize(data.lab_request_status)} />
            <FieldRow label="Guia de coleta" value={guidanceSummary(data.collection_guidance)} />
          </SectionCard>

          <SectionCard title="Datas" subtitle="Histórico temporal do registo." icon={Clock3} accent="bg-amber-500">
            <FieldRow label="Registado em" value={fmtDate(data.record_date)} />
            <FieldRow label="Criado em" value={fmtDate(data.created_at)} />
            <FieldRow label="Atualizado em" value={fmtDate(data.updated_at)} />
            <FieldRow label="Identificador" value={data.custom_id || `REG-${data.id}`} />
          </SectionCard>
        </div>

        <SectionCard title="Observações" subtitle="Notas clínicas e detalhes do atendimento." icon={FileText} accent="bg-rose-500">
          <FieldRow label="Observação" value={data.observation || "Sem observações registadas."} />
          <FieldRow label="Paciente" value={data.patient_name || (data.patient ? `Paciente #${data.patient}` : "—")} />
          <FieldRow label="Contexto" value={`${isLabRequest ? "Coleta laboratorial" : "Registo manual"} · Prioridade ${priority.label.toLowerCase()}`} />
        </SectionCard>
      </div>
    </AppLayout>
  )
}
