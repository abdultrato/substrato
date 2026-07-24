"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState, type ElementType, type ReactNode } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CalendarClock,
  ClipboardCheck,
  Edit3,
  FileText,
  FlaskConical,
  Loader2,
  MapPin,
  PackageCheck,
  Stethoscope,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

const ENDPOINT = "/pathology/recepcao_amostras/"
const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const STATUS: Record<string, string> = {
  RECEIVED: "Recebida",
  ACCEPTED: "Aceite",
  REJECTED: "Rejeitada",
  IN_GROSSING: "Em macroscopia",
  IN_PROCESSING: "Em processamento",
  READY_FOR_REPORT: "Pronta para laudo",
  REPORTED: "Laudada",
  ARCHIVED: "Arquivada",
  CANCELLED: "Cancelada",
}
const SPECIMENS: Record<string, string> = {
  BIOPSY: "Biópsia",
  SURGICAL_SPECIMEN: "Peça cirúrgica",
  CYTOLOGY: "Citologia",
  FLUID: "Líquido",
  SMEAR: "Esfregaço",
  OTHER: "Outro",
}
const SOURCES: Record<string, string> = {
  OUTPATIENT: "Ambulatório",
  INPATIENT: "Internamento",
  OPERATING_ROOM: "Bloco operatório",
  EXTERNAL: "Externo",
  OTHER: "Outro",
}
const PRIORITIES: Record<string, string> = {
  ROUTINE: "Rotina",
  URGENT: "Urgente",
  STAT: "Emergência",
}

type SampleReception = Record<string, any> & {
  id: number
  custom_id?: string
  accession_number?: string
  patient?: number
  patient_name?: string
  request?: number
  request_code?: string
  lab_request?: number
  lab_request_code?: string
  surgery?: number
  surgery_code?: string
  received_by?: number
  received_by_name?: string
  source?: string
  specimen_type?: string
  anatomical_site?: string
  container_count?: number
  fixation_type?: string
  priority?: string
  status?: string
  received_at?: string
  accepted_at?: string
  rejected_at?: string
  rejection_reason?: string
  clinical_history?: string
  notes?: string
}

function formatDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function Metric({
  icon: Icon,
  label,
  value,
  danger = false,
}: {
  icon: ElementType
  label: string
  value: ReactNode
  danger?: boolean
}) {
  return (
    <div className={`min-w-0 rounded-md border px-2 py-1 ${danger ? "border-rose-300/60 bg-rose-500/10" : "border-border/60 bg-background/45"}`}>
      <div className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-[.1em] ${danger ? "text-rose-700 dark:text-rose-300" : "text-muted-foreground"}`}>
        <Icon size={11} />
        {label}
      </div>
      <div className="break-words text-sm font-bold">{value || "—"}</div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: ElementType
  title: string
  accent: string
  children: ReactNode
}) {
  return (
    <section className={`${GLASS} relative overflow-hidden`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="space-y-2 px-3 py-2 pl-4">
        <div className="flex items-center gap-2 border-b border-border/50 pb-1.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground/10">
            <Icon size={14} />
          </span>
          <h2 className="text-sm font-bold">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  )
}

function TextBlock({ label, value }: { label: string; value?: string }) {
  const visible = value?.replace("[SEED-PATHOLOGY]", "").trim()
  return (
    <div className="rounded-md border border-border/60 bg-background/45 px-2.5 py-2">
      <p className="mb-1 text-[9px] font-bold uppercase tracking-[.1em] text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">{visible || "Não informado."}</p>
    </div>
  )
}

export default function PathologySampleReceptionsDetailPage() {
  useAuthGuard()
  const id = String((useParams() as { id?: string }).id || "")
  const refresh = useSafeDataRefreshSignal()
  const [item, setItem] = useState<SampleReception | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    apiFetch<SampleReception>(`${ENDPOINT}${id}/`, { clientCache: refresh === 0 })
      .then((data) => {
        if (mounted) setItem(data)
      })
      .catch((cause) => {
        if (mounted) setError(cause?.message || "Falha ao carregar a recepção da amostra.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [id, refresh])

  const rejected = item?.status === "REJECTED"
  const urgent = item?.priority === "URGENT" || item?.priority === "STAT"

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.LABORATORIO, GROUPS.MEDICINA]} fullWidth>
      <div className="w-auto space-y-1.5 px-0.5">
        <header className={`${GLASS} relative overflow-hidden`}>
          <span className={`absolute inset-y-0 left-0 w-1 ${rejected ? "bg-rose-500" : urgent ? "bg-amber-500" : "bg-fuchsia-500"}`} />
          <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-fuchsia-500/12 text-fuchsia-600">
                  <FlaskConical size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[.12em] text-fuchsia-700 dark:text-fuchsia-300">Recepção de amostra</p>
                  <h1 className="break-words text-base font-bold">
                    {loading ? "Amostra..." : item?.accession_number || item?.custom_id || `Amostra #${id}`}
                  </h1>
                  <p className="break-words text-[10px] text-muted-foreground">{item?.patient_name || "Paciente não informado"}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Link href="/pathology/sample-receptions" className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground">
                  <ArrowLeft size={13} /> Voltar
                </Link>
                <Link href={`/pathology/sample-receptions/${id}/edit`} className="inline-flex h-7 items-center gap-1 rounded-md border border-fuchsia-400/50 bg-fuchsia-500/15 px-2 text-xs font-semibold text-fuchsia-700">
                  <Edit3 size={13} /> Editar
                </Link>
              </div>
            </div>
            {item ? (
              <div className="grid grid-cols-2 gap-1 lg:grid-cols-5">
                <Metric icon={ClipboardCheck} label="Estado" value={STATUS[item.status || ""] || item.status} danger={rejected} />
                <Metric icon={FlaskConical} label="Amostra" value={SPECIMENS[item.specimen_type || ""] || item.specimen_type} />
                <Metric icon={Stethoscope} label="Origem" value={SOURCES[item.source || ""] || item.source} />
                <Metric icon={AlertTriangle} label="Prioridade" value={PRIORITIES[item.priority || ""] || item.priority} danger={urgent} />
                <Metric icon={CalendarClock} label="Recebida" value={formatDate(item.received_at)} />
              </div>
            ) : null}
          </div>
        </header>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        {loading ? (
          <div className={`${GLASS} flex h-40 items-center justify-center gap-2`}>
            <Loader2 className="animate-spin" size={20} /> A carregar amostra...
          </div>
        ) : item ? (
          <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
            <Section icon={User} title="Paciente e referências" accent="bg-fuchsia-500">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <Metric icon={User} label="Paciente" value={item.patient_name || item.patient} />
                <Metric icon={FileText} label="Pedido de Patologia" value={item.request_code || item.request} />
                <Metric icon={FileText} label="Requisição laboratorial" value={item.lab_request_code || item.lab_request} />
                <Metric icon={Stethoscope} label="Cirurgia associada" value={item.surgery_code || item.surgery} />
              </div>
            </Section>

            <Section icon={PackageCheck} title="Recepção e acondicionamento" accent="bg-emerald-500">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <Metric icon={FlaskConical} label="Tipo de amostra" value={SPECIMENS[item.specimen_type || ""] || item.specimen_type} />
                <Metric icon={Boxes} label="Recipientes" value={item.container_count} />
                <Metric icon={PackageCheck} label="Fixador" value={item.fixation_type} />
                <Metric icon={User} label="Recebido por" value={item.received_by_name || item.received_by} />
              </div>
            </Section>

            <Section icon={MapPin} title="Origem e localização clínica" accent="bg-sky-500">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <Metric icon={Stethoscope} label="Origem" value={SOURCES[item.source || ""] || item.source} />
                <Metric icon={MapPin} label="Sítio anatómico" value={item.anatomical_site} />
              </div>
              <TextBlock label="História clínica" value={item.clinical_history} />
            </Section>

            <Section icon={CalendarClock} title="Cronologia e decisão" accent={rejected ? "bg-rose-500" : "bg-violet-500"}>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
                <Metric icon={CalendarClock} label="Recebida" value={formatDate(item.received_at)} />
                <Metric icon={ClipboardCheck} label="Aceite" value={formatDate(item.accepted_at)} />
                <Metric icon={AlertTriangle} label="Rejeitada" value={formatDate(item.rejected_at)} danger={rejected} />
              </div>
              {rejected ? <TextBlock label="Motivo da rejeição" value={item.rejection_reason} /> : null}
              <TextBlock label="Observações" value={item.notes} />
            </Section>
          </div>
        ) : (
          <div className={`${GLASS} flex h-40 items-center justify-center`}>Recepção de amostra não encontrada.</div>
        )}
      </div>
    </AppLayout>
  )
}
