"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  FileText,
  Loader2,
  Scissors,
  ShieldCheck,
  User,
  X,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type Row = Record<string, any>

const ENDPOINT = "/surgery/checklist_seguranca"
const ROUTE_BASE = "/surgery/safety-checklists"
const GLASS = "rounded-lg border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const CHECK_FIELDS = [
  { key: "patient_identity_confirmed", label: "Identidade confirmada", detail: "Paciente, pulseira e processo conferidos." },
  { key: "procedure_confirmed", label: "Procedimento confirmado", detail: "Procedimento e lado cirúrgico revistos." },
  { key: "site_marked", label: "Local marcado", detail: "Sítio operatório marcado quando aplicável." },
  { key: "consent_confirmed", label: "Consentimento confirmado", detail: "Consentimento cirúrgico/anestésico disponível." },
  { key: "anesthesia_safety_checked", label: "Segurança anestésica", detail: "Equipamento, via aérea e plano anestésico confirmados." },
  { key: "antibiotic_prophylaxis", label: "Profilaxia antibiótica", detail: "Antibiótico administrado no tempo correto." },
  { key: "instrument_count_confirmed", label: "Contagem de instrumentos", detail: "Compressas, agulhas e instrumental conferidos." },
  { key: "specimens_labeled", label: "Amostras identificadas", detail: "Amostras rotuladas ou confirmado que não há amostras." },
]

const PHASES: Record<string, { label: string; tone: string }> = {
  SIGN_IN: { label: "Antes da indução", tone: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300" },
  TIME_OUT: { label: "Antes da incisão", tone: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300" },
  SIGN_OUT: { label: "Antes da saída", tone: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700/30 dark:bg-indigo-900/20 dark:text-indigo-300" },
}

const STATUSES: Record<string, { label: string; bar: string; badge: string }> = {
  PENDING: { label: "Pendente", bar: "bg-slate-400", badge: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700/30 dark:bg-slate-900/20 dark:text-slate-300" },
  PARTIALLY_COMPLETED: { label: "Parcial", bar: "bg-amber-500", badge: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300" },
  COMPLETED: { label: "Concluído", bar: "bg-emerald-500", badge: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300" },
  FAILED: { label: "Falhou", bar: "bg-rose-500", badge: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300" },
  OVERRIDDEN: { label: "Sobrescrito", bar: "bg-fuchsia-500", badge: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-700/30 dark:bg-fuchsia-900/20 dark:text-fuchsia-300" },
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

function StatusPill({ value }: { value: unknown }) {
  const status = STATUSES[String(value || "").toUpperCase()] || STATUSES.PENDING
  return (
    <span className={`inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-semibold ${status.badge}`}>
      {status.label}
    </span>
  )
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

function ChecklistItem({ label, detail, checked }: { label: string; detail: string; checked: boolean }) {
  return (
    <div className={`flex min-w-0 items-start gap-2 rounded-md border px-2 py-1.5 ${
      checked
        ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-700/30 dark:bg-emerald-900/15"
        : "border-border/70 bg-card/35"
    }`}>
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
        checked ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
      }`}>
        {checked ? <Check size={12} /> : <X size={12} />}
      </span>
      <div className="min-w-0">
        <div className={`truncate text-[11px] font-semibold ${checked ? "text-foreground" : "text-muted-foreground"}`}>{label}</div>
        <div className="line-clamp-2 text-[9px] leading-snug text-muted-foreground">{detail}</div>
      </div>
    </div>
  )
}

export default function SurgerySafetyChecklistDetailPage() {
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
      setError(err?.message || "Erro ao carregar checklist de segurança.")
      setData(null)
      setSurgery(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const status = STATUSES[String(data?.status || "").toUpperCase()] || STATUSES.PENDING
  const phase = PHASES[String(data?.phase || "").toUpperCase()]
  const done = useMemo(() => data ? CHECK_FIELDS.filter((field) => Boolean(data[field.key])).length : 0, [data])
  const total = CHECK_FIELDS.length
  const pct = Math.round((done / total) * 100)

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
            <AlertCircle size={14} /> {error || "Checklist não encontrado."}
          </div>
        </div>
      </AppLayout>
    )
  }

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
                <Link href={ROUTE_BASE} className="hover:text-foreground">Checklist de segurança</Link>
                <span>/</span>
                <span className="font-mono text-foreground">{data.custom_id || `#${id}`}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <h1 className="font-display text-[14px] font-semibold leading-tight text-foreground">
                  Checklist de segurança cirúrgica
                </h1>
                <StatusPill value={data.status} />
                {phase ? (
                  <span className={`inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-semibold ${phase.tone}`}>
                    {phase.label}
                  </span>
                ) : null}
                <span className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-semibold ${
                  done === total
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                    : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
                }`}>
                  <ShieldCheck size={11} /> {done}/{total}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1">
              <Link
                href={ROUTE_BASE}
                className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-card px-2 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft size={11} />
                Voltar
              </Link>
              <Link
                href={`${ROUTE_BASE}/${id}/edit`}
                className="inline-flex h-6 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300"
              >
                <Edit3 size={11} />
                Editar
              </Link>
            </div>
          </div>
        </section>

        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-emerald-500" />
          <div className="space-y-1.5 px-2 py-1.5 pl-3">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  <ClipboardCheck size={12} />
                  <span>Resumo de segurança</span>
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {done === total ? "Todos os pontos críticos foram confirmados." : "Existem pontos pendentes neste checklist."}
                </p>
              </div>
              <div className="min-w-[180px]">
                <div className="mb-0.5 flex items-center justify-between text-[9px] font-semibold text-muted-foreground">
                  <span>Conclusão</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full ${done === total ? "bg-emerald-500" : done >= 4 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>

            {String(data.status || "").toUpperCase() === "OVERRIDDEN" && data.override_reason ? (
              <div className="flex items-start gap-1.5 rounded-md border border-fuchsia-300 bg-fuchsia-50 px-2 py-1 text-[10px] font-semibold text-fuchsia-800 dark:border-fuchsia-700/30 dark:bg-fuchsia-900/20 dark:text-fuchsia-300">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>{data.override_reason}</span>
              </div>
            ) : null}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-1 lg:grid-cols-[1.15fr_0.85fr]">
          <Card title="Verificações" icon={<CheckCircle2 size={12} />}>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {CHECK_FIELDS.map((field) => (
                <ChecklistItem
                  key={field.key}
                  label={field.label}
                  detail={field.detail}
                  checked={Boolean(data[field.key])}
                />
              ))}
            </div>
          </Card>

          <div className="space-y-1">
            <Card title="Contexto cirúrgico" icon={<Scissors size={12} />}>
              <div className="grid grid-cols-2 gap-1">
                <Field label="Cirurgia" value={data.surgery_code || surgery?.custom_id || (data.surgery ? `#${data.surgery}` : "—")} icon={<Scissors size={9} />} />
                <Field label="Paciente" value={data.patient_name || surgery?.patient_name} icon={<User size={9} />} />
                <Field label="Procedimento" value={surgery?.procedure} icon={<FileText size={9} />} />
                <Field label="Agendada para" value={fmtDateTime(surgery?.scheduled_for)} icon={<CalendarClock size={9} />} />
                <Field label="Sala" value={surgery?.operating_room_name || surgery?.operating_room_code || surgery?.operating_room} />
                <Field label="Estado da cirurgia" value={surgery?.status} />
              </div>
            </Card>

            <Card title="Registo" icon={<ClipboardCheck size={12} />}>
              <div className="grid grid-cols-2 gap-1">
                <Field label="Preenchido por" value={data.completed_by_name || (data.completed_by ? `#${data.completed_by}` : "—")} />
                <Field label="Concluído em" value={fmtDateTime(data.completed_at)} />
                <Field label="Criado em" value={fmtDateTime(data.created_at)} />
                <Field label="Atualizado em" value={fmtDateTime(data.updated_at)} />
              </div>
            </Card>
          </div>
        </div>

        <Card title="Notas" icon={<FileText size={12} />}>
          <p className="min-h-[42px] rounded-md border border-border/60 bg-card/35 px-2 py-1.5 text-[11px] leading-relaxed text-foreground">
            {data.notes || "Sem observações registadas."}
          </p>
        </Card>
      </div>
    </AppLayout>
  )
}
