"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react"
import {
  ArrowLeft,
  Boxes,
  CalendarClock,
  ClipboardCheck,
  FlaskConical,
  Loader2,
  PackageCheck,
  User,
} from "lucide-react"

import AutoForm from "@/components/form/AutoForm"
import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { apiFetch } from "@/lib/api"
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"
import { GROUPS } from "@/lib/rbac"

const ENDPOINT = "/pathology/recepcao_amostras/"
const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const COMPACT_FIELDS = [
  "patient",
  "request",
  "lab_request",
  "surgery",
  "received_by",
  "accession_number",
  "source",
  "specimen_type",
  "anatomical_site",
  "container_count",
  "fixation_type",
  "priority",
  "status",
  "received_at",
  "accepted_at",
  "rejected_at",
]

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
const PRIORITIES: Record<string, string> = {
  ROUTINE: "Rotina",
  URGENT: "Urgente",
  STAT: "Emergência",
}

type SampleReception = Record<string, any> & {
  id: number
  custom_id?: string
  accession_number?: string
  patient_name?: string
  specimen_type?: string
  anatomical_site?: string
  container_count?: number
  fixation_type?: string
  priority?: string
  status?: string
  received_at?: string
  notes?: string
}

function formatDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function Summary({
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

export default function SampleReceptionFormPage({ id }: { id?: string }) {
  useAuthGuard()
  const router = useRouter()
  const editing = Boolean(id)
  const [item, setItem] = useState<SampleReception | null>(null)
  const [loading, setLoading] = useState(editing)
  const [error, setError] = useState<string | null>(null)

  const config = useMemo(() => {
    const base = getResourceFormConfig("pathology", "recepcao_amostras", ENDPOINT) || {}
    return {
      ...base,
      ordenarCampos: [
        "patient",
        "request",
        "lab_request",
        "surgery",
        "received_by",
        "accession_number",
        "source",
        "specimen_type",
        "anatomical_site",
        "container_count",
        "fixation_type",
        "priority",
        "status",
        "received_at",
        "accepted_at",
        "rejected_at",
        "rejection_reason",
        "clinical_history",
        "notes",
      ],
      widgets: {
        ...base.widgets,
        rejection_reason: "textarea" as const,
        clinical_history: "textarea" as const,
        notes: "textarea" as const,
      },
      etapasEmCartoes: true,
      etapas: [
        {
          titulo: "Paciente e referências",
          descricao: "Vínculos clínicos e profissional responsável pela recepção.",
          campos: ["patient", "request", "lab_request", "surgery", "received_by"],
        },
        {
          titulo: "Identificação da amostra",
          descricao: "Número de patologia, origem, tipo e localização anatómica.",
          campos: ["accession_number", "source", "specimen_type", "anatomical_site"],
        },
        {
          titulo: "Acondicionamento",
          descricao: "Recipientes, fixador e prioridade de processamento.",
          campos: ["container_count", "fixation_type", "priority"],
        },
        {
          titulo: "Estado e cronologia",
          descricao: "Estado operacional e momentos de recepção, aceitação ou rejeição.",
          campos: ["status", "received_at", "accepted_at", "rejected_at", "rejection_reason"],
        },
        {
          titulo: "Contexto clínico",
          descricao: "História clínica e observações complementares.",
          campos: ["clinical_history", "notes"],
        },
      ],
    }
  }, [])

  useEffect(() => {
    if (!id) return
    let mounted = true
    setLoading(true)
    setError(null)
    apiFetch<SampleReception>(`${ENDPOINT}${id}/`, { clientCache: false })
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
  }, [id])

  const rejected = item?.status === "REJECTED"
  const urgent = item?.priority === "URGENT" || item?.priority === "STAT"
  const backHref = editing ? `/pathology/sample-receptions/${id}` : "/pathology/sample-receptions"

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
                    {editing ? `Editar ${item?.accession_number || item?.custom_id || `amostra #${id}`}` : "Nova recepção"}
                  </h1>
                </div>
              </div>
              <Link href={backHref} className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground">
                <ArrowLeft size={13} /> Voltar
              </Link>
            </div>

            {item ? (
              <div className="grid grid-cols-2 gap-1 lg:grid-cols-6">
                <Summary icon={User} label="Paciente" value={item.patient_name} />
                <Summary icon={FlaskConical} label="Amostra" value={SPECIMENS[item.specimen_type || ""] || item.specimen_type} />
                <Summary icon={Boxes} label="Recipientes" value={item.container_count} />
                <Summary icon={PackageCheck} label="Fixador" value={item.fixation_type} />
                <Summary icon={ClipboardCheck} label="Estado" value={STATUS[item.status || ""] || item.status} danger={rejected} />
                <Summary icon={CalendarClock} label="Recebida" value={formatDate(item.received_at)} />
              </div>
            ) : null}
          </div>
        </header>

        {loading ? (
          <div className={`${GLASS} flex min-h-52 items-center justify-center gap-2`}>
            <Loader2 className="animate-spin" size={18} /> A carregar amostra...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : (
          <AutoForm
            endpoint={editing ? `${ENDPOINT}${id}/` : ENDPOINT}
            method={editing ? "put" : "post"}
            initialValues={item ? { ...item, notes: item.notes?.replace("[SEED-PATHOLOGY]", "").trim() } : {}}
            submitLabel={editing ? "Guardar alterações" : "Registar recepção"}
            config={config}
            compactFields={COMPACT_FIELDS}
            presentation="radiology"
            onSuccess={(data) => router.push(`/pathology/sample-receptions/${data?.id || id || ""}`)}
          />
        )}
      </div>
    </AppLayout>
  )
}
