"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock3,
  ClipboardList,
  FileText,
  Package2,
  Stethoscope,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"

type ProcedureDetail = Record<string, any> & {
  id?: number
  custom_id?: string | null
  patient_name?: string
  ward_name?: string
  professional_name?: string
  professional_names?: string | string[]
  workflow_status?: string | null
  workflow_status_display?: string
  billing_status?: string | null
  billing_status_display?: string
  items_count?: number
  performed_date?: string | null
  notes?: string | null
  selected_catalogs?: Array<number | string> | null
  created_at?: string | null
  updated_at?: string | null
  executed_at?: string | null
  completed_at?: string | null
  billed_at?: string | null
}

type ProcedureCatalog = {
  id?: number
  name?: string
  nome?: string
  procedure_code?: string
}

type ProcedureItem = {
  id?: number
  custom_id?: string | null
  catalog_name?: string
  catalog_code?: string
  description?: string | null
  quantity?: number | null
  execution_status?: string | null
  execution_status_display?: string
  billed?: boolean
  performed?: boolean
  observation?: string | null
  created_at?: string | null
  executed_at?: string | null
  completed_at?: string | null
  billed_at?: string | null
}

type ProcedureMaterial = {
  id?: number
  custom_id?: string | null
  product_name?: string
  product_type?: string
  lot_number?: string
  quantity?: number | null
  observation?: string | null
  created_at?: string | null
}

type TimelineStep = {
  label: string
  date: string | null | undefined
  done: boolean
  note?: string
  status?: string
  state?: "done" | "active" | "pending"
}

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const GLASS_SOFT =
  "rounded-lg border border-white/20 bg-white/25 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

function ensureTrailingSlash(url: string) {
  return url.endsWith("/") ? url : `${url}/`
}

function fmtDate(value: any): string {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function val(record: Record<string, any> | null | undefined, ...keys: string[]): any {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null && record?.[key] !== "") {
      return record[key]
    }
  }
  return null
}

function ageFromBirthDate(value: any): string | null {
  if (!value) return null
  const birth = new Date(value)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const hasNotHadBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (hasNotHadBirthday) years -= 1
  return years >= 0 ? `${years} anos` : null
}

function genderLabel(value: any): string | null {
  const raw = String(value || "").trim()
  if (!raw) return null
  const code = raw.toUpperCase()
  if (code === "M" || code === "MASCULINO" || code === "MALE") return "Masculino"
  if (code === "F" || code === "FEMENINO" || code === "FEMININO" || code === "FEMALE") return "Feminino"
  return raw
}

function userDisplayName(user: Record<string, any> | null | undefined): string | null {
  const direct = val(user, "full_name", "display_name", "name", "nome")
  if (direct) return String(direct).trim()
  const composed = [val(user, "first_name", "nome_proprio"), val(user, "last_name", "apelido")]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(" ")
  if (composed) return composed
  const username = val(user, "username", "email")
  return username ? String(username).trim() : null
}

function normalizeProfessionalNames(value: ProcedureDetail["professional_names"], fallback?: string): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean)
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return fallback ? [fallback] : []
}

function normalizeCatalogIds(value: ProcedureDetail["selected_catalogs"]): number[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0)
}

function workflowMeta(status: string | null | undefined): { label: string; badge: string; dot: string; tone: string } {
  const code = String(status || "").toUpperCase()
  if (code === "REQ") {
    return {
      label: "Requisitado",
      badge: "border-amber-300/70 bg-amber-50/80 text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300",
      dot: "bg-amber-400",
      tone: "from-amber-400/20 via-white/20 to-transparent",
    }
  }
  if (code === "EXE") {
    return {
      label: "Em execução",
      badge: "border-sky-300/70 bg-sky-50/80 text-sky-800 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300",
      dot: "bg-sky-400",
      tone: "from-sky-400/20 via-white/20 to-transparent",
    }
  }
  if (code === "CON") {
    return {
      label: "Concluído",
      badge: "border-emerald-300/70 bg-emerald-50/80 text-emerald-800 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300",
      dot: "bg-emerald-400",
      tone: "from-emerald-400/20 via-white/20 to-transparent",
    }
  }
  if (code === "PAR") {
    return {
      label: "Parcial",
      badge: "border-indigo-300/70 bg-indigo-50/80 text-indigo-800 dark:border-indigo-700/30 dark:bg-indigo-900/20 dark:text-indigo-300",
      dot: "bg-indigo-400",
      tone: "from-indigo-400/20 via-white/20 to-transparent",
    }
  }
  if (code === "NCO") {
    return {
      label: "Não concluído",
      badge: "border-rose-300/70 bg-rose-50/80 text-rose-800 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300",
      dot: "bg-rose-400",
      tone: "from-rose-400/20 via-white/20 to-transparent",
    }
  }
  if (code === "BIL") {
    return {
      label: "Faturado",
      badge: "border-emerald-300/70 bg-emerald-50/80 text-emerald-800 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300",
      dot: "bg-emerald-400",
      tone: "from-emerald-400/20 via-white/20 to-transparent",
    }
  }
  return {
    label: status || "—",
    badge: "border-slate-300/70 bg-slate-50/80 text-slate-700 dark:border-slate-700/30 dark:bg-slate-900/20 dark:text-slate-300",
    dot: "bg-slate-400",
    tone: "from-slate-400/15 via-white/20 to-transparent",
  }
}

function billingMeta(status: string | null | undefined): { label: string; badge: string } {
  const code = String(status || "").toUpperCase()
  if (code === "BIL") return { label: "Faturado", badge: "border-emerald-300/70 bg-emerald-50/80 text-emerald-800 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300" }
  if (code === "PAR") return { label: "Parcial", badge: "border-amber-300/70 bg-amber-50/80 text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300" }
  if (code === "PEN") return { label: "Pendente", badge: "border-slate-300/70 bg-slate-50/80 text-slate-700 dark:border-slate-700/30 dark:bg-slate-900/20 dark:text-slate-300" }
  return { label: status || "Sem faturação", badge: "border-slate-200/70 bg-slate-50/80 text-slate-600 dark:border-slate-700/30 dark:bg-slate-900/20 dark:text-slate-300" }
}

function itemStatusMeta(status: string | null | undefined): string {
  const code = String(status || "").toUpperCase()
  if (code === "CON") return "border-emerald-200/70 bg-emerald-50/80 text-emerald-700"
  if (code === "EXE") return "border-sky-200/70 bg-sky-50/80 text-sky-700"
  if (code === "NCO") return "border-rose-200/70 bg-rose-50/80 text-rose-700"
  return "border-amber-200/70 bg-amber-50/80 text-amber-700"
}

function SurfaceCard({
  title,
  icon,
  children,
  className = "",
  accent = "bg-sky-400",
  iconTone = "bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:bg-[var(--primary-400)]/10 dark:text-[var(--primary-400)]",
  header,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
  accent?: string
  iconTone?: string
  header?: React.ReactNode
}) {
  return (
    <section className={`relative block min-w-0 self-start overflow-hidden ${GLASS} ${className}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="flex flex-col gap-1.5 px-3 py-2.5 pl-4">
        {header ?? (
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${iconTone}`}>{icon}</span>
            <span>{title}</span>
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

function timelineBadgeTone(state: TimelineStep["state"] = "pending") {
  if (state === "done") {
    return "border-emerald-200/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
  }
  if (state === "active") {
    return "border-amber-200/70 bg-amber-50/80 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
  }
  return "border-slate-200/70 bg-slate-50/80 text-slate-600 dark:border-slate-700/30 dark:bg-slate-900/20 dark:text-slate-300"
}

function MiniPanel({
  label,
  value,
  tone,
}: {
  label: string
  value: React.ReactNode
  tone: string
}) {
  return (
    <div className={`rounded-lg border px-2 py-1.5 backdrop-blur-sm ${tone}`}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">{label}</p>
      <div className="mt-0.5 text-[12px] font-semibold leading-tight text-[var(--text)]">{value || "—"}</div>
    </div>
  )
}

function InlineMiniPanel({
  label,
  value,
  tone,
}: {
  label: string
  value: React.ReactNode
  tone: string
}) {
  return (
    <div className={`inline-flex min-h-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-1 backdrop-blur-sm ${tone}`}>
      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--gray-500)]">{label}</span>
      <span className="text-[10px] font-semibold text-[var(--gray-400)]">:</span>
      <span className="text-[12px] font-semibold leading-none text-[var(--text)]">{value || "—"}</span>
    </div>
  )
}

function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="space-y-1">
      {steps.map((step, index) => (
        <li key={index} className="relative flex gap-2">
          <div className="flex flex-col items-center">
            <span className="relative z-10 mt-0.5 shrink-0">
              {step.state === "active" ? (
                <Clock3 size={14} className="text-amber-500" />
              ) : step.done ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <Circle size={14} className="text-[var(--gray-300)]" />
              )}
            </span>
            {index < steps.length - 1 ? <span className="mt-1 w-px flex-1 bg-white/40 dark:bg-white/10" /> : null}
          </div>
          <div className="min-w-0 pb-1.5">
            <div className="flex flex-wrap items-center gap-1">
              <p className={`text-[12px] font-semibold ${step.done || step.state === "active" ? "text-[var(--text)]" : "text-[var(--gray-500)]"}`}>{step.label}</p>
              {step.status ? (
                <span className={`rounded-full border px-1.5 py-px text-[9px] font-semibold ${timelineBadgeTone(step.state)}`}>
                  {step.status}
                </span>
              ) : null}
            </div>
            {step.date ? <p className="text-[11px] text-[var(--gray-500)]">{fmtDate(step.date)}</p> : null}
            {step.note ? <p className="text-[11px] text-[var(--gray-500)]">{step.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

function HorizontalTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="grid min-w-[680px] grid-cols-[repeat(4,minmax(140px,1fr))]">
      {steps.map((step, index) => (
        <li key={index} className="relative min-w-0 px-2 first:pl-0 last:pr-0">
          <div className="flex items-center">
            <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/50 bg-white/55 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/60">
              {step.state === "active" ? (
                <Clock3 size={13} className="text-amber-500" />
              ) : step.done ? (
                <CheckCircle2 size={13} className="text-emerald-500" />
              ) : (
                <Circle size={13} className="text-[var(--gray-300)]" />
              )}
            </span>
            {index < steps.length - 1 ? <span className="h-px flex-1 bg-gradient-to-r from-violet-300/70 to-slate-200/60 dark:from-violet-700/50 dark:to-slate-700/40" /> : null}
          </div>
          <div className="mt-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-1">
              <p className={`text-[11px] font-semibold ${step.done || step.state === "active" ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
              {step.status ? <span className={`rounded-full border px-1.5 py-px text-[8px] font-semibold ${timelineBadgeTone(step.state)}`}>{step.status}</span> : null}
            </div>
            {step.date ? <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{fmtDate(step.date)}</p> : null}
            {step.note ? <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{step.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

function ProcedureItemCard({ item }: { item: ProcedureItem }) {
  const title = item.catalog_name || item.description || item.custom_id || "Item do procedimento"
  const statusLabel = item.execution_status_display || item.execution_status || "Pendente"
  const href = item.id ? `/nursing/procedure-items/${item.id}` : null
  const content = (
    <article className={`${GLASS_SOFT} p-2 transition hover:border-sky-300/60 hover:bg-white/35 dark:hover:bg-white/[0.06]`}>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[12px] font-semibold leading-tight text-[var(--text)]">{title}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${itemStatusMeta(item.execution_status)}`}>
              {statusLabel}
            </span>
            {item.billed ? (
              <span className="rounded-full border border-emerald-200/70 bg-emerald-50/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                Faturado
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 break-words text-[10px] text-[var(--gray-500)]">
            {[item.catalog_code, item.quantity ? `Qtd. ${item.quantity}` : null].filter(Boolean).join(" · ") || "Sem detalhe adicional"}
          </p>
        </div>
        <ClipboardList size={14} className="mt-0.5 shrink-0 text-sky-500" />
      </div>
      {item.observation ? <p className="mt-1 text-[10px] text-[var(--gray-600)]">{item.observation}</p> : null}
    </article>
  )

  if (!href) return content

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  )
}

function ProcedureMaterialCard({ item }: { item: ProcedureMaterial }) {
  const title = item.product_name || item.custom_id || "Material"

  return (
    <article className={`${GLASS_SOFT} p-2`}>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold leading-tight text-[var(--text)]">{title}</p>
          <p className="mt-0.5 break-words text-[10px] text-[var(--gray-500)]">
            {[item.product_type, item.quantity ? `Qtd. ${item.quantity}` : null, item.lot_number ? `Lote ${item.lot_number}` : null]
              .filter(Boolean)
              .join(" · ") || "Sem detalhe adicional"}
          </p>
        </div>
        <Package2 size={14} className="mt-0.5 shrink-0 text-violet-500" />
      </div>
      {item.observation ? <p className="mt-1 text-[10px] text-[var(--gray-600)]">{item.observation}</p> : null}
    </article>
  )
}

export default function ProcedureDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [data, setData] = useState<ProcedureDetail | null>(null)
  const [patientProfile, setPatientProfile] = useState<Record<string, any> | null>(null)
  const [createdByName, setCreatedByName] = useState<string | null>(null)
  const [catalogs, setCatalogs] = useState<ProcedureCatalog[]>([])
  const [items, setItems] = useState<ProcedureItem[]>([])
  const [materials, setMaterials] = useState<ProcedureMaterial[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const detailEndpoint = ensureTrailingSlash("/nursing/procedure/") + `${id}/`
      const [procedureRes, catalogRes, itemRes, materialRes] = await Promise.all([
        apiFetch<ProcedureDetail>(detailEndpoint, { clientCache: safeRefreshToken === 0 }),
        apiFetchList<ProcedureCatalog>("/nursing/procedure_catalog/", {
          page: 1,
          pageSize: 200,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        }),
        apiFetchList<ProcedureItem>("/nursing/procedure_item/", {
          page: 1,
          pageSize: 100,
          query: { procedure: Number(id) },
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        }),
        apiFetchList<ProcedureMaterial>("/nursing/procedure_material/", {
          page: 1,
          pageSize: 100,
          query: { procedure: Number(id) },
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        }),
      ])

      const patientId = Number(val(procedureRes, "patient", "paciente"))
      const createdById = Number(val(procedureRes, "created_by"))
      const materialItems = Array.isArray(materialRes.items) ? materialRes.items : []
      const [patientRes, creatorRes] = await Promise.all([
        Number.isInteger(patientId) && patientId > 0
          ? apiFetch<Record<string, any>>(`/clinical/patient/${patientId}/`, { clientCache: safeRefreshToken === 0 })
          : Promise.resolve(null),
        Number.isInteger(createdById) && createdById > 0
          ? apiFetch<Record<string, any>>(`/identity/user/${createdById}/`, { clientCache: safeRefreshToken === 0 })
              .catch(() => null)
          : Promise.resolve(null),
      ])

      setData(procedureRes)
      setPatientProfile(patientRes)
      setCreatedByName(
        String(val(procedureRes, "created_by_name", "creator_name") || "").trim() || userDisplayName(creatorRes),
      )
      setCatalogs(Array.isArray(catalogRes.items) ? catalogRes.items : [])
      setItems(Array.isArray(itemRes.items) ? itemRes.items : [])
      setMaterials(materialItems)
    } catch (error: any) {
      setPatientProfile(null)
      setCreatedByName(null)
      setErrorMessage(isNotFoundLikeError(error) ? null : (error?.message || "Falha ao carregar procedimento."))
    } finally {
      setLoading(false)
    }
  }, [id, safeRefreshToken])

  useEffect(() => {
    reload().catch(() => {})
  }, [reload])

  const catalogNameById = useMemo(() => {
    const next = new Map<number, ProcedureCatalog>()
    for (const catalog of catalogs) {
      const catalogId = Number(catalog.id)
      if (Number.isInteger(catalogId) && catalogId > 0) next.set(catalogId, catalog)
    }
    return next
  }, [catalogs])

  const selectedCatalogs = useMemo(() => {
    if (!data) return []
    return normalizeCatalogIds(data.selected_catalogs)
      .map((catalogId) => {
        const catalog = catalogNameById.get(catalogId)
        if (!catalog) return null
        return {
          id: catalogId,
          name: String(catalog.name || catalog.nome || "").trim(),
          code: String(catalog.procedure_code || "").trim() || null,
        }
      })
      .filter((item): item is { id: number; name: string; code: string | null } => Boolean(item?.name))
  }, [catalogNameById, data])

  const professionals = useMemo(
    () => normalizeProfessionalNames(data?.professional_names, data?.professional_name),
    [data?.professional_name, data?.professional_names],
  )

  const workflowCode = String(data?.workflow_status || data?.workflow_status_display || "").toUpperCase()
  const billingCode = String(data?.billing_status || data?.billing_status_display || "").toUpperCase()

  const timelineSteps: TimelineStep[] = [
    { label: "Criado", date: data?.created_at, done: !!data?.created_at },
    { label: "Executado", date: data?.executed_at || data?.performed_date, done: !!(data?.executed_at || data?.performed_date) },
    { label: "Concluído", date: data?.completed_at, done: !!data?.completed_at },
    { label: "Faturado", date: data?.billed_at, done: !!data?.billed_at },
  ]

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
          {errorMessage || "Procedimento não encontrado."}
        </div>
      </AppLayout>
    )
  }

  const code = val(data, "custom_id", "id_custom", "codigo") || `#${data.id}`
  const patientName = val(data, "patient_name", "paciente_nome") || "—"
  const wardName = val(data, "ward_name", "enfermaria_nome")
  const createdBy = createdByName
  const notes = val(data, "notes", "observacoes", "observações")
  const patientAge =
    val(data, "patient_age", "idade_paciente", "age_display") ||
    val(patientProfile, "age_display", "patient_age") ||
    ageFromBirthDate(val(patientProfile, "birth_date", "data_nascimento"))
  const patientGender = genderLabel(
    val(data, "patient_gender", "gender", "sexo", "sex") ||
    val(patientProfile, "gender", "sexo", "sex"),
  )
  const hasOperationalGap = String(data?.workflow_status || "").toUpperCase() === "NCO"
  const totalItems = items.length || Number(data.items_count || 0)
  const hasTeamCard = Boolean(wardName) || professionals.length > 0 || Boolean(createdBy) || Boolean(data.updated_at)
  const hasWorkflowCard =
    Boolean(data.workflow_status_display || data.workflow_status || data.billing_status_display || data.billing_status) ||
    Boolean(data.executed_at || data.performed_date || data.completed_at || data.billed_at)
  const hasTimelineCard = timelineSteps.some((step) => step.done || Boolean(step.date) || Boolean(step.note))
  const hasNotesCard = Boolean(notes)
  const hasItemsCard = items.length > 0
  const hasMaterialsCard = materials.length > 0
  const requestDone = Boolean(data?.created_at || workflowCode)
  const executionDone = ["CON", "BIL"].includes(workflowCode) || Boolean(data?.completed_at)
  const executionActive =
    !executionDone && (["EXE", "PAR", "NCO"].includes(workflowCode) || Boolean(data?.executed_at || data?.performed_date))
  const completionDone = ["CON", "BIL"].includes(workflowCode) || Boolean(data?.completed_at)
  const billingDone = billingCode === "BIL" || Boolean(data?.billed_at)
  const workflowSteps: TimelineStep[] = [
    {
      label: "Requisição",
      date: data?.created_at,
      done: requestDone,
      state: requestDone ? "done" : "pending",
      status: requestDone ? "Concluído" : "Pendente",
    },
    {
      label: "Execução",
      date: data?.executed_at || data?.performed_date,
      done: executionDone,
      state: executionDone ? "done" : executionActive ? "active" : "pending",
      status: executionDone ? "Concluído" : executionActive ? "Em execução" : "Pendente",
    },
    {
      label: "Encerramento",
      date: data?.completed_at,
      done: completionDone,
      state: completionDone ? "done" : "pending",
      status: completionDone ? "Concluído" : "Pendente",
    },
    {
      label: "Faturação",
      date: data?.billed_at,
      done: billingDone,
      state: billingDone ? "done" : "pending",
      status: billingDone ? "Concluído" : data?.billing_status_display || "Pendente",
    },
  ]

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-6xl space-y-2.5 px-1">
        <section className={`relative overflow-hidden ${GLASS} h-[80px]`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-[var(--primary-500)]" />
          <div className="flex h-full items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                <Link href="/nursing/procedures" className="transition-colors hover:text-foreground">Procedimentos</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">{code}</span>
              </div>

              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-sky-700 dark:bg-sky-400/10 dark:text-sky-400">
                  <User size={13} />
                </span>
                <h1 className="min-w-0 truncate font-display text-base font-semibold text-foreground">
                  {patientName}
                  {(patientGender || patientAge) ? (
                    <span className="ml-2 text-[11px] font-medium text-[var(--gray-500)]">
                      {[patientGender, patientAge].filter(Boolean).join(" . ")}
                    </span>
                  ) : null}
                </h1>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto">
              {selectedCatalogs.length > 0 ? (
                <span className="inline-flex flex-col items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-400 sm:flex-sm-row sm:items-sm-center sm:justify-sm-center">
                  <span className="uppercase tracking-wide text-violet-500/80">Catálogos</span>
                  <span className="text-xs leading-none">{selectedCatalogs.length}</span>
                </span>
              ) : null}
              {totalItems > 0 ? (
                <span className="inline-flex flex-col items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-400 sm:flex-sm-row sm:items-sm-center sm:justify-sm-center">
                  <span className="uppercase tracking-wide text-sky-500/80">Itens</span>
                  <span className="text-xs leading-none">{totalItems}</span>
                </span>
              ) : null}
              <div className="flex flex-nowrap gap-1.5">
              <Link
                href={`/nursing/procedures/${id}/edit`}
                className="inline-flex h-7 items-center justify-center rounded-md border border-border bg-card px-2.5 text-[11px] font-medium text-foreground transition hover:bg-muted"
              >
                Editar
              </Link>
              <Link
                href="/nursing/procedures"
                className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft size={11} />
                Voltar
              </Link>
            </div>
              {hasOperationalGap ? (
                <span className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[10px] font-semibold text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-400">
                  <AlertTriangle size={10} />
                  Atenção
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 px-4 py-3 text-sm text-amber-800 backdrop-blur-sm">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-start gap-3">
          {/* Coluna esquerda */}
          <div className="flex min-w-0 flex-1 basis-56 flex-col gap-3">
            {professionals.length > 0 || wardName ? (
              <SurfaceCard
                title="Serviços"
                icon={<Stethoscope size={14} />}
                accent="bg-orange-400"
                iconTone="bg-orange-500/10 text-orange-700 dark:bg-orange-400/10 dark:text-orange-400"
              >
                <div className="grid gap-1.5">
                  {wardName ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Building2 size={11} className="text-amber-600" />
                      <span className="truncate font-medium text-foreground">{wardName}</span>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-1.5">
                    {professionals.map((name) => (
                      <span
                        key={name}
                        className="rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700 dark:border-orange-700/30 dark:bg-orange-900/20 dark:text-orange-300"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </SurfaceCard>
            ) : null}

            {selectedCatalogs.length > 0 || totalItems > 0 ? (
              <SurfaceCard
                title="Volume Clínico"
                icon={<ClipboardList size={14} />}
                accent="bg-yellow-400"
                iconTone="bg-yellow-500/10 text-yellow-700 dark:bg-yellow-400/10 dark:text-yellow-400"
              >
                <div className="grid gap-2">
                  {selectedCatalogs.length > 0 ? (
                    <div className="rounded-lg border border-orange-200 bg-orange-50/80 px-2.5 py-2 dark:border-orange-700/30 dark:bg-orange-900/20">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-300">Catálogos</p>
                      <ol className="mt-1 list-inside list-decimal space-y-0.5 text-[11px] font-medium text-orange-800 dark:text-orange-200">
                        {selectedCatalogs.map((catalog) => (
                          <li key={catalog.id} className="truncate" title={catalog.name}>{catalog.name}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                  {totalItems > 0 ? (
                    <div className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50/80 px-2.5 py-1.5 text-[10px] dark:border-yellow-700/30 dark:bg-yellow-900/20">
                      <span className="font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-300">Itens</span>
                      <span className="font-bold text-yellow-900 dark:text-yellow-100">{totalItems}</span>
                    </div>
                  ) : null}
                </div>
              </SurfaceCard>
            ) : null}

            {hasNotesCard ? (
              <SurfaceCard
                title="Observações Clínicas"
                icon={<FileText size={14} />}
                accent="bg-slate-400"
                iconTone="bg-slate-500/10 text-slate-700 dark:bg-slate-400/10 dark:text-slate-400"
              >
                <p className="whitespace-pre-wrap text-[13px] text-[var(--text)]">{notes}</p>
              </SurfaceCard>
            ) : null}

            {hasMaterialsCard ? (
              <SurfaceCard
                title={`Materiais Consumidos (${materials.length})`}
                icon={<Package2 size={14} />}
                accent="bg-violet-400"
                iconTone="bg-violet-500/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-400"
              >
                <div className="grid gap-1.5">
                  {materials.map((item) => (
                    <ProcedureMaterialCard key={item.id || item.custom_id} item={item} />
                  ))}
                </div>
              </SurfaceCard>
            ) : null}
          </div>

          {/* Coluna direita */}
          <div className="flex min-w-0 flex-1 basis-56 flex-col gap-3">
            {hasWorkflowCard ? (
              <SurfaceCard
                title="Fluxo Operacional"
                icon={<Stethoscope size={14} />}
                accent="bg-emerald-400"
                iconTone="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400"
              >
                <Timeline steps={workflowSteps} />
              </SurfaceCard>
            ) : null}

            {createdBy || data.updated_at ? (
              <SurfaceCard
                title="Auditoria"
                icon={<CalendarClock size={14} />}
                accent="bg-slate-400"
                iconTone="bg-slate-500/10 text-slate-700 dark:bg-slate-400/10 dark:text-slate-400"
              >
                <div className="grid gap-1.5">
                  {createdBy ? (
                    <InlineMiniPanel
                      label="Criado por"
                      value={createdBy}
                      tone="border-slate-200 bg-slate-50 dark:border-slate-700/30 dark:bg-slate-900/20"
                    />
                  ) : null}
                  {data.updated_at ? (
                    <InlineMiniPanel
                      label="Atualizado"
                      value={fmtDate(data.updated_at)}
                      tone="border-slate-200 bg-slate-50 dark:border-slate-700/30 dark:bg-slate-900/20"
                    />
                  ) : null}
                </div>
              </SurfaceCard>
            ) : null}

            {hasTimelineCard ? (
              <SurfaceCard
                title="Linha do Tempo"
                icon={<CalendarClock size={14} />}
                accent="bg-indigo-400"
                iconTone="bg-indigo-500/10 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-400"
              >
                <div className="overflow-x-auto pb-1">
                  <HorizontalTimeline steps={timelineSteps} />
                </div>
              </SurfaceCard>
            ) : null}

            {hasOperationalGap ? (
              <section className="rounded-xl border border-rose-300/60 bg-rose-50/60 p-4 text-sm text-rose-800 backdrop-blur-sm dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <p>O procedimento está marcado como não concluído. Revise itens, execução e materiais antes de encerrar o fluxo.</p>
                </div>
              </section>
            ) : null}

            {!hasOperationalGap && data.completed_at ? (
              <section className="rounded-xl border border-emerald-300/50 bg-emerald-50/55 p-4 text-sm text-emerald-800 backdrop-blur-sm dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  <p>Fluxo concluído com registo finalizado e pronto para auditoria ou faturação.</p>
                </div>
              </section>
            ) : null}

            {hasItemsCard ? (
              <SurfaceCard
                title={`Itens do Procedimento (${items.length})`}
                icon={<ClipboardList size={14} />}
                accent="bg-sky-400"
                iconTone="bg-sky-500/10 text-sky-700 dark:bg-sky-400/10 dark:text-sky-400"
              >
                <div className="grid gap-1.5">
                  {items.map((item) => <ProcedureItemCard key={item.id || item.custom_id} item={item} />)}
                </div>
              </SurfaceCard>
            ) : null}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
