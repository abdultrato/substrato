"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarClock,
  Check,
  Edit3,
  FileText,
  Loader2,
  ShieldCheck,
  Stethoscope,
  X,
  XCircle,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type Row = Record<string, any>

const ENDPOINT = "/surgery/autorizacoes"
const ROUTE_BASE = "/surgery/authorizations"
const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const STATUS: Record<string, { label: string; tone: string; bar: string }> = {
  PENDING: { label: "Pendente", tone: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", bar: "bg-amber-400" },
  APPROVED: { label: "Aprovada", tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", bar: "bg-emerald-500" },
  PARTIALLY_APPROVED: { label: "Parcialmente aprovada", tone: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", bar: "bg-blue-500" },
  REJECTED: { label: "Rejeitada", tone: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300", bar: "bg-rose-500" },
  EXPIRED: { label: "Expirada", tone: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", bar: "bg-orange-400" },
  CANCELLED: { label: "Cancelada", tone: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300", bar: "bg-gray-400" },
}

const SURGERY_STATUS: Record<string, string> = {
  DRAFT: "Rascunho",
  REQUESTED: "Solicitada",
  AUTHORIZED: "Autorizada",
  AGENDADA: "Agendada",
  IN_OPERATING_ROOM: "Em sala operatória",
  SURGERY_STARTED: "Cirurgia iniciada",
  SURGERY_COMPLETED: "Cirurgia realizada",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
}

const CHECKLIST: [string, string][] = [
  ["budget_approved", "Orçamento aprovado"],
  ["initial_payment_received", "Pagamento inicial recebido"],
  ["insurance_authorized", "Seguro autorizou"],
  ["special_materials_approved", "Materiais especiais aprovados"],
  ["room_available", "Sala disponível"],
  ["team_available", "Equipa disponível"],
  ["preoperative_assessment_completed", "Avaliação pré-operatória concluída"],
  ["consent_signed", "Consentimento assinado"],
]

function fmtDateTime(value: any): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d)
}

function fmtDate(value: any): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(d)
}

function fmtAmount(value: any): string {
  const n = parseFloat(String(value ?? "0"))
  if (!Number.isFinite(n)) return "—"
  return `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} MT`
}

function surgeryHref(surgery: Row | null, fallbackId?: any): string {
  const id = surgery?.id ?? fallbackId
  if (!id) return "/surgery/surgeries"
  return surgery?.surgery_size === "GRANDE"
    ? `/surgery/large-surgeries/${id}`
    : `/surgery/small-surgeries/${id}`
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border border-white/20 bg-white/25 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-foreground">{value || "—"}</div>
    </div>
  )
}

export default function SurgicalAuthorizationDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)

  const [auth, setAuth] = useState<Row | null>(null)
  const [surgery, setSurgery] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const status = STATUS[String(auth?.status || "").toUpperCase()] || STATUS.PENDING
  const done = auth ? CHECKLIST.filter(([k]) => auth[k]).length : 0

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const nextAuth = await apiFetch<Row>(`${ENDPOINT}/${id}/`)
      setAuth(nextAuth)
      setSurgery(
        nextAuth?.surgery
          ? await apiFetch<Row>(`/surgery/surgery/${nextAuth.surgery}/`).catch(() => null)
          : null,
      )
    } catch (e: any) {
      setError(e?.message || "Falha ao carregar autorização cirúrgica.")
      setAuth(null)
      setSurgery(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </div>
      </AppLayout>
    )
  }

  if (error || !auth) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-2 rounded-xl border border-rose-300/50 bg-rose-50/60 px-4 py-3 text-sm text-rose-700">
            <AlertCircle size={14} /> {error || "Autorização não encontrada."}
          </div>
        </div>
      </AppLayout>
    )
  }

  const operationHref = surgeryHref(surgery, auth.surgery)

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
      <div className="mx-auto w-full max-w-6xl space-y-2 px-1 py-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${status.bar}`} />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
          <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 pl-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href={ROUTE_BASE} className="hover:text-foreground">Autorizações</Link>
                <span>/</span>
                <span className="font-mono text-foreground">{auth.custom_id || `#${auth.id}`}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold leading-tight text-foreground">{auth.patient_name || "Paciente por definir"}</h1>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.tone}`}>
                  {status.label}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${done === 8 ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/12 text-amber-700 dark:text-amber-300"}`}>
                  <ShieldCheck size={10} /> {done}/8 requisitos
                </span>
              </div>
              {auth.valid_until ? (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CalendarClock size={11} /> Válida até {fmtDate(auth.valid_until)}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Link href={ROUTE_BASE} className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted">
                <ArrowLeft size={11} /> Voltar
              </Link>
              <Link href={`${ROUTE_BASE}/${auth.id}/edit`} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                <Edit3 size={11} /> Editar
              </Link>
            </div>
          </div>
        </section>

        {auth.rejected_reason ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-300/50 bg-rose-50/60 px-4 py-3 text-sm text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
            <XCircle size={14} className="mt-0.5 shrink-0" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide">Motivo de rejeição</div>
              <p className="text-xs leading-relaxed">{auth.rejected_reason}</p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-2 lg:grid-cols-[1.1fr_0.9fr]">
          <section className={`${GLASS} overflow-hidden`}>
            <div className="flex items-center justify-between gap-2 border-b border-white/20 px-4 py-3 dark:border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-violet-600 dark:text-violet-300" />
                <div>
                  <h2 className="text-sm font-bold text-foreground">Requisitos de autorização</h2>
                  <p className="text-[11px] text-muted-foreground">Condições necessárias para liberar a cirurgia.</p>
                </div>
              </div>
              <span className={`text-[11px] font-bold ${done === 8 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {done}/8
              </span>
            </div>
            <div className="grid gap-1.5 p-3 sm:grid-cols-2">
              {CHECKLIST.map(([key, label]) => {
                const ok = Boolean(auth[key])
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                      ok
                        ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-700/30 dark:bg-emerald-900/15"
                        : "border-white/20 bg-white/20 dark:border-white/10 dark:bg-white/[0.03]"
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ok ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400"}`}>
                      {ok ? <Check size={12} /> : <X size={12} />}
                    </span>
                    <span className={`text-xs ${ok ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>
                  </div>
                )
              })}
            </div>
          </section>

          <div className="space-y-2">
            <section className={`${GLASS} overflow-hidden`}>
              <div className="flex items-center gap-2 border-b border-white/20 px-4 py-3 dark:border-white/10">
                <Banknote size={16} className="text-violet-600 dark:text-violet-300" />
                <div>
                  <h2 className="text-sm font-bold text-foreground">Valores</h2>
                  <p className="text-[11px] text-muted-foreground">Orçamento e aprovações financeiras.</p>
                </div>
              </div>
              <div className="grid gap-2 p-4 sm:grid-cols-3">
                <Field label="Orçamentado" value={fmtAmount(auth.quotation_amount)} />
                <Field label="Aprovado" value={fmtAmount(auth.approved_amount)} />
                <Field label="Pagamento inicial" value={fmtAmount(auth.initial_payment_amount)} />
              </div>
            </section>

            <section className={`${GLASS} overflow-hidden`}>
              <div className="flex items-center gap-2 border-b border-white/20 px-4 py-3 dark:border-white/10">
                <CalendarClock size={16} className="text-violet-600 dark:text-violet-300" />
                <div>
                  <h2 className="text-sm font-bold text-foreground">Datas</h2>
                  <p className="text-[11px] text-muted-foreground">Validade e aprovação.</p>
                </div>
              </div>
              <div className="grid gap-2 p-4 sm:grid-cols-3">
                <Field label="Válida até" value={fmtDate(auth.valid_until)} />
                <Field label="Aprovada em" value={fmtDateTime(auth.approved_at)} />
                <Field label="Criada em" value={fmtDateTime(auth.created_at)} />
              </div>
            </section>
          </div>
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          <section className={`${GLASS} overflow-hidden`}>
            <div className="flex items-center justify-between gap-2 border-b border-white/20 px-4 py-3 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Stethoscope size={16} className="text-violet-600 dark:text-violet-300" />
                <div>
                  <h2 className="text-sm font-bold text-foreground">Contexto da cirurgia</h2>
                  <p className="text-[11px] text-muted-foreground">Cirurgia e documentos vinculados.</p>
                </div>
              </div>
              {auth.surgery ? (
                <Link href={operationHref} className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 hover:underline dark:text-violet-300">
                  Abrir cirurgia <ArrowRight size={11} />
                </Link>
              ) : null}
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-2">
              <Field label="Cirurgia" value={auth.surgery_code || (auth.surgery ? `#${auth.surgery}` : "—")} />
              <Field label="Paciente" value={auth.patient_name} />
              <Field label="Estado da cirurgia" value={SURGERY_STATUS[String(surgery?.status || "").toUpperCase()] || surgery?.status || "—"} />
              <Field label="Agendada para" value={fmtDateTime(surgery?.scheduled_for)} />
              <Field label="Pedido cirúrgico" value={auth.surgical_request_code || (auth.surgical_request ? `#${auth.surgical_request}` : "—")} />
              <Field label="Avaliação pré-operatória" value={auth.preoperative_assessment_code || (auth.preoperative_assessment ? `#${auth.preoperative_assessment}` : "—")} />
            </div>
          </section>

          <section className={`${GLASS} overflow-hidden`}>
            <div className="flex items-center gap-2 border-b border-white/20 px-4 py-3 dark:border-white/10">
              <FileText size={16} className="text-violet-600 dark:text-violet-300" />
              <div>
                <h2 className="text-sm font-bold text-foreground">Observações</h2>
                <p className="text-[11px] text-muted-foreground">Notas registadas nesta autorização.</p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs leading-relaxed text-foreground">{auth.notes || "Sem observações."}</p>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  )
}
