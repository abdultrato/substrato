"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  ClipboardCheck,
  FilePlus2,
  FlaskConical,
  Loader2,
  MapPin,
  PackageCheck,
  Search,
  X,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

export type SampleReception = Record<string, any> & {
  id: number
  custom_id?: string
  accession_number?: string
  patient?: number
  patient_name?: string
  request?: number
  request_code?: string
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
  clinical_history?: string
}

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
const PRIORITIES: Record<string, string> = {
  ROUTINE: "Rotina",
  URGENT: "Urgente",
  STAT: "Emergência",
}

function formatDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function Metric({ icon: Icon, label, value }: { icon: ElementType; label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-1 text-xs">
      <Icon size={12} className="shrink-0 text-fuchsia-600" />
      <span className="font-semibold text-muted-foreground">{label}:</span>
      <strong className="break-words text-foreground">{value}</strong>
    </div>
  )
}

function SampleCard({ item }: { item: SampleReception }) {
  const rejected = item.status === "REJECTED"
  const urgent = item.priority === "URGENT" || item.priority === "STAT"
  const accent = rejected ? "bg-rose-500" : urgent ? "bg-amber-500" : "bg-fuchsia-500"
  const statusTone = rejected
    ? "border-rose-300/60 bg-rose-500/10 text-rose-700 dark:text-rose-300"
    : "border-fuchsia-200/60 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300"

  return (
    <Link
      href={`/pathology/sample-receptions/${item.id}`}
      className={`${GLASS} group relative block overflow-hidden transition hover:-translate-y-0.5 hover:border-fuchsia-300/60 hover:shadow-md`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="space-y-2 px-3 py-2 pl-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-300">
              <FlaskConical size={17} />
            </span>
            <div className="min-w-0">
              <p className="break-words text-sm font-bold leading-4 group-hover:text-fuchsia-700 dark:group-hover:text-fuchsia-300">
                {item.accession_number || item.custom_id || `Amostra #${item.id}`}
              </p>
              <p className="break-words text-[10px] text-muted-foreground">{item.patient_name || "Paciente não informado"}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${statusTone}`}>
            {STATUS[item.status || ""] || item.status || "Sem estado"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1">
          <div className="rounded-md border border-border/50 bg-background/40 px-2 py-1">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Amostra</p>
            <p className="break-words text-[11px] font-bold">{SPECIMENS[item.specimen_type || ""] || item.specimen_type || "—"}</p>
          </div>
          <div className="rounded-md border border-border/50 bg-background/40 px-2 py-1">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Prioridade</p>
            <p className={`break-words text-[11px] font-bold ${urgent ? "text-rose-600" : ""}`}>
              {PRIORITIES[item.priority || ""] || item.priority || "—"}
            </p>
          </div>
        </div>

        <div className="space-y-1 border-t border-border/50 pt-1.5 text-[10px] text-muted-foreground">
          <p className="flex min-w-0 items-start gap-1">
            <MapPin size={11} className="mt-0.5 shrink-0" />
            <span className="break-words">{item.anatomical_site || "Sítio anatómico não informado"}</span>
          </p>
          <p className="flex min-w-0 items-start gap-1">
            <PackageCheck size={11} className="mt-0.5 shrink-0" />
            <span className="break-words">
              {item.container_count || 0} recipiente(s) · {item.fixation_type || "Fixador não informado"}
            </span>
          </p>
          <p className="flex min-w-0 items-start gap-1">
            <CalendarClock size={11} className="mt-0.5 shrink-0" />
            <span className="break-words">{formatDate(item.received_at)}</span>
          </p>
        </div>
      </div>
    </Link>
  )
}

export default function PathologySampleReceptionsListPage() {
  useAuthGuard()
  const refresh = useSafeDataRefreshSignal()
  const [items, setItems] = useState<SampleReception[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("ALL")
  const [specimen, setSpecimen] = useState("ALL")
  const [priority, setPriority] = useState("ALL")
  const [limit, setLimit] = useState(10)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    apiFetchList<SampleReception>(ENDPOINT, {
      page: 1,
      pageSize: 500,
      clientPaginate: true,
      clientCache: refresh === 0,
    })
      .then((response) => {
        if (mounted) setItems(response.items || [])
      })
      .catch((cause) => {
        if (mounted) setError(cause?.message || "Falha ao carregar as recepções de amostras.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [refresh])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter(
      (item) =>
        (status === "ALL" || item.status === status) &&
        (specimen === "ALL" || item.specimen_type === specimen) &&
        (priority === "ALL" || item.priority === priority) &&
        (!query ||
          [
            item.accession_number,
            item.custom_id,
            item.patient_name,
            item.anatomical_site,
            item.received_by_name,
            item.clinical_history,
            item.fixation_type,
          ].some((value) => String(value || "").toLowerCase().includes(query)))
    )
  }, [items, priority, search, specimen, status])

  const visible = filtered.slice(0, limit)
  const urgent = items.filter((item) => item.priority === "URGENT" || item.priority === "STAT").length
  const rejected = items.filter((item) => item.status === "REJECTED").length
  const pending = items.filter((item) => ["RECEIVED", "ACCEPTED"].includes(item.status || "")).length

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.LABORATORIO, GROUPS.MEDICINA]}>
      <div className="w-full space-y-1.5 px-0.5">
        <header className={`${GLASS} relative overflow-hidden`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-fuchsia-500" />
          <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-fuchsia-500/12 text-fuchsia-600">
                  <FlaskConical size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="break-words text-base font-bold">Recepção de amostras</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar..." : `${visible.length} de ${filtered.length} recepções`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Link href="/pathology" className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground">
                  <ArrowLeft size={13} /> Voltar
                </Link>
                <Link href="/pathology/sample-receptions/new" className="inline-flex h-7 items-center gap-1 rounded-md border border-fuchsia-400/50 bg-fuchsia-500/15 px-2 text-xs font-semibold text-fuchsia-700">
                  <FilePlus2 size={13} /> Nova recepção
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-border/40 py-1">
              <Metric icon={FlaskConical} label="Recepções" value={items.length} />
              <Metric icon={ClipboardCheck} label="Pendentes" value={pending} />
              <Metric icon={AlertTriangle} label="Urgentes" value={urgent} />
              <Metric icon={X} label="Rejeitadas" value={rejected} />
            </div>

            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-[minmax(220px,1fr)_72px_minmax(135px,auto)_minmax(130px,auto)_minmax(125px,auto)]">
              <div className="relative col-span-2 min-w-[220px] md:col-span-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar amostra, paciente ou local..."
                  className="h-7 w-full rounded-md border border-border bg-background/70 pl-8 pr-8 text-xs outline-none"
                />
                {search ? (
                  <button type="button" onClick={() => setSearch("")} aria-label="Limpar pesquisa" className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <X size={12} />
                  </button>
                ) : null}
              </div>
              <input
                type="number"
                min={1}
                max={500}
                value={limit}
                onChange={(event) => setLimit(Math.max(1, Math.min(500, Number(event.target.value || 1))))}
                aria-label="Quantidade de registos"
                className="h-7 min-w-[72px] rounded-md border border-border bg-background/70 px-2 text-center text-xs"
              />
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-7 min-w-[135px] rounded-md border border-border bg-background/70 px-2 text-xs">
                <option value="ALL">Todos os estados</option>
                {Object.entries(STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <select value={specimen} onChange={(event) => setSpecimen(event.target.value)} className="h-7 min-w-[130px] rounded-md border border-border bg-background/70 px-2 text-xs">
                <option value="ALL">Todas as amostras</option>
                {Object.entries(SPECIMENS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <select value={priority} onChange={(event) => setPriority(event.target.value)} className="h-7 min-w-[125px] rounded-md border border-border bg-background/70 px-2 text-xs">
                <option value="ALL">Prioridades</option>
                {Object.entries(PRIORITIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
          </div>
        </header>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        {loading ? (
          <div className={`${GLASS} flex h-32 items-center justify-center gap-2`}>
            <Loader2 className="animate-spin" size={20} /> A carregar recepções...
          </div>
        ) : visible.length ? (
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-4">
            {visible.map((item) => <SampleCard key={item.id} item={item} />)}
          </div>
        ) : (
          <div className={`${GLASS} flex h-32 items-center justify-center text-sm text-muted-foreground`}>
            Nenhuma recepção encontrada.
          </div>
        )}
      </div>
    </AppLayout>
  )
}
