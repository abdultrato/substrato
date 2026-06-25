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
  HeartPulse,
  Package2,
  Stethoscope,
  User,
  Wallet,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PdfActionLabel from "@/components/ui/PdfActionLabel"
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
  total?: string | number | null
  services_subtotal?: string | number | null
  materials_subtotal?: string | number | null
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
  value_unitario?: string | number | null
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
  product?: number | null
  lot?: number | null
  quantity?: number | null
  value_unitario?: string | number | null
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

function fmtMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—"
  const numeric = typeof value === "string" ? Number.parseFloat(value) : value
  if (Number.isNaN(numeric)) return String(value)
  return numeric.toLocaleString("pt-PT", { style: "currency", currency: "MZN" })
}

function val(record: Record<string, any> | null | undefined, ...keys: string[]): any {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null && record?.[key] !== "") {
      return record[key]
    }
  }
  return null
}

function numberValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value
  return Number.isFinite(parsed) ? parsed : null
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
    <section className={`relative block w-full self-start overflow-hidden ${GLASS} ${className}`}>
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

function FinancialRow({
  label,
  meta,
  value,
}: {
  label: string
  meta?: string | null
  value: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 dark:border-emerald-700/30 dark:bg-emerald-900/20 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[var(--text)]">{label}</p>
        {meta ? <p className="mt-0.5 text-[10px] text-[var(--gray-500)]">{meta}</p> : null}
      </div>
      <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 sm:shrink-0">{value}</div>
    </div>
  )
}

function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="space-y-1.5">
      {steps.map((step, index) => (
        <li key={index} className="relative flex gap-3">
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
          <div className="min-w-0 pb-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className={`text-[12px] font-semibold ${step.done || step.state === "active" ? "text-[var(--text)]" : "text-[var(--gray-500)]"}`}>{step.label}</p>
              {step.status ? (
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${timelineBadgeTone(step.state)}`}>
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

function CatalogPill({ name, code }: { name: string; code?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--primary-200)] bg-[var(--primary-50)]/90 px-2 py-0.5 text-[10px] font-semibold text-[var(--primary-700)] shadow-sm backdrop-blur-sm">
      <HeartPulse size={9} />
      {code ? `${code} · ${name}` : name}
    </span>
  )
}

function ProcedureItemCard({ item }: { item: ProcedureItem }) {
  const title = item.catalog_name || item.description || item.custom_id || "Item do procedimento"
  const unitValue = fmtMoney(item.value_unitario)
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
            {[item.catalog_code, item.quantity ? `Qtd. ${item.quantity}` : null, unitValue !== "—" ? unitValue : null].filter(Boolean).join(" · ") || "Sem detalhe adicional"}
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

function ProcedureMaterialCard({
  item,
  resolvedUnitValue,
}: {
  item: ProcedureMaterial
  resolvedUnitValue?: string | number | null
}) {
  const title = item.product_name || item.custom_id || "Material"
  const unitValue = fmtMoney(resolvedUnitValue ?? item.value_unitario)

  return (
    <article className={`${GLASS_SOFT} p-2`}>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold leading-tight text-[var(--text)]">{title}</p>
          <p className="mt-0.5 break-words text-[10px] text-[var(--gray-500)]">
            {[item.product_type, item.quantity ? `Qtd. ${item.quantity}` : null, item.lot_number ? `Lote ${item.lot_number}` : null, unitValue !== "—" ? unitValue : null]
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
  const [productPriceById, setProductPriceById] = useState<Record<number, string>>({})
  const [lotPriceById, setLotPriceById] = useState<Record<number, string>>({})
  const [catalogs, setCatalogs] = useState<ProcedureCatalog[]>([])
  const [items, setItems] = useState<ProcedureItem[]>([])
  const [materials, setMaterials] = useState<ProcedureMaterial[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
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
      const materialItems = Array.isArray(materialRes.items) ? materialRes.items : []
      const productIds = [...new Set(materialItems.map((item) => Number(item.product)).filter((value) => Number.isInteger(value) && value > 0))]
      const lotIds = [...new Set(materialItems.map((item) => Number(item.lot)).filter((value) => Number.isInteger(value) && value > 0))]
      const patientRes =
        Number.isInteger(patientId) && patientId > 0
          ? await apiFetch<Record<string, any>>(`/clinical/patient/${patientId}/`, { clientCache: safeRefreshToken === 0 })
          : null
      const [productResults, lotResults] = await Promise.all([
        Promise.allSettled(
          productIds.map(async (productId) => ({
            id: productId,
            data: await apiFetch<Record<string, any>>(`/pharmacy/product/${productId}/`, { clientCache: safeRefreshToken === 0 }),
          })),
        ),
        Promise.allSettled(
          lotIds.map(async (lotId) => ({
            id: lotId,
            data: await apiFetch<Record<string, any>>(`/pharmacy/lot/${lotId}/`, { clientCache: safeRefreshToken === 0 }),
          })),
        ),
      ])
      const nextProductPrices: Record<number, string> = {}
      const nextLotPrices: Record<number, string> = {}
      for (const result of productResults) {
        if (result.status === "fulfilled") {
          const price = val(result.value.data, "sale_price", "preco", "preço")
          if (price !== null) nextProductPrices[result.value.id] = String(price)
        }
      }
      for (const result of lotResults) {
        if (result.status === "fulfilled") {
          const price = val(result.value.data, "sale_price", "preco", "preço")
          if (price !== null) nextLotPrices[result.value.id] = String(price)
        }
      }

      setData(procedureRes)
      setPatientProfile(patientRes)
      setProductPriceById(nextProductPrices)
      setLotPriceById(nextLotPrices)
      setCatalogs(Array.isArray(catalogRes.items) ? catalogRes.items : [])
      setItems(Array.isArray(itemRes.items) ? itemRes.items : [])
      setMaterials(materialItems)
    } catch (error: any) {
      setPatientProfile(null)
      setProductPriceById({})
      setLotPriceById({})
      setErrorMessage(isNotFoundLikeError(error) ? null : (error?.message || "Falha ao carregar procedimento."))
    } finally {
      setLoading(false)
    }
  }, [id, safeRefreshToken])

  useEffect(() => {
    reload().catch(() => {})
  }, [reload])

  async function handleOpenPdf() {
    setDownloadingPdf(true)
    setErrorMessage(null)
    try {
      const endpoint = ensureTrailingSlash("/nursing/procedure/") + `${id}/pdf/`
      const blob = await apiFetch<Blob>(endpoint, { responseType: "blob" })
      const url = window.URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener,noreferrer")
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
    } catch (error: any) {
      setErrorMessage(isNotFoundLikeError(error) ? null : (error?.message || "Falha ao gerar PDF."))
    } finally {
      setDownloadingPdf(false)
    }
  }

  const reportHref = `/reports?endpoint=${encodeURIComponent("/nursing/procedure/")}&group=Enfermagem&resource=Procedimento`

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
  const createdBy = val(data, "created_by")
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
  const billedItems = items.filter((item) => !!item.billed).length
  const resolveMaterialUnitValue = (item: ProcedureMaterial): string | number | null =>
    item.value_unitario ??
    (item.lot ? lotPriceById[Number(item.lot)] : null) ??
    (item.product ? productPriceById[Number(item.product)] : null) ??
    null
  const materialsValue = materials.reduce((sum, item) => {
    const unit = numberValue(resolveMaterialUnitValue(item))
    const quantity = Number(item.quantity || 0)
    return sum + (unit && quantity ? unit * quantity : 0)
  }, 0)
  const serviceBreakdown = items
    .map((item) => {
      const unit = numberValue(item.value_unitario)
      const quantity = Math.max(1, Number(item.quantity || 1))
      if (unit === null) return null
      return {
        id: item.id || item.custom_id || `${item.catalog_name}-${quantity}`,
        label: item.catalog_name || item.description || item.custom_id || "Serviço",
        meta: [`Qtd. ${quantity}`, fmtMoney(unit)].filter(Boolean).join(" * "),
        total: unit * quantity,
      }
    })
    .filter((item): item is { id: string | number; label: string; meta: string; total: number } => Boolean(item))
  const materialBreakdown = materials
    .map((item) => {
      const unit = numberValue(resolveMaterialUnitValue(item))
      const quantity = Math.max(1, Number(item.quantity || 1))
      if (unit === null) return null
      return {
        id: item.id || item.custom_id || `${item.product_name}-${quantity}`,
        label: item.product_name || item.custom_id || "Material",
        meta: [item.product_type, `Qtd. ${quantity}`, fmtMoney(unit)].filter(Boolean).join(" * "),
        total: unit * quantity,
      }
    })
    .filter((item): item is { id: string | number; label: string; meta: string; total: number } => Boolean(item))
  const servicesValue = serviceBreakdown.reduce((sum, item) => sum + item.total, 0)
  const backendServiceSubtotal = numberValue(data.services_subtotal)
  const backendMaterialSubtotal = numberValue(data.materials_subtotal)
  const serviceSubtotal = servicesValue > 0 ? servicesValue : backendServiceSubtotal
  const materialSubtotal = materialsValue > 0 ? materialsValue : backendMaterialSubtotal
  const combinedTotal =
    serviceSubtotal !== null || materialSubtotal !== null
      ? (serviceSubtotal || 0) + (materialSubtotal || 0)
      : numberValue(data.total)
  const hasTeamCard = professionals.length > 0 || Boolean(createdBy) || Boolean(data.updated_at)
  const hasWorkflowCard =
    Boolean(data.workflow_status_display || data.workflow_status || data.billing_status_display || data.billing_status) ||
    Boolean(data.executed_at || data.performed_date || data.completed_at || data.billed_at)
  const hasTimelineCard = timelineSteps.some((step) => step.done || Boolean(step.date) || Boolean(step.note))
  const hasCatalogsCard = selectedCatalogs.length > 0
  const hasFinanceCard =
    serviceBreakdown.length > 0 ||
    materialBreakdown.length > 0 ||
    serviceSubtotal !== null ||
    materialSubtotal !== null ||
    combinedTotal !== null ||
    billedItems > 0
  const hasNotesCard = Boolean(notes)
  const hasItemsCard = items.length > 0
  const hasMaterialsCard = materials.length > 0
  const hasContextRail = hasTeamCard || hasWorkflowCard || hasTimelineCard || hasCatalogsCard
  const hasMainDeck =
    hasFinanceCard ||
    hasNotesCard ||
    hasItemsCard ||
    hasMaterialsCard ||
    hasOperationalGap ||
    Boolean(data.completed_at)
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
                      {[patientGender, patientAge].filter(Boolean).join(" * ")}
                    </span>
                  ) : null}
                </h1>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto">
              {selectedCatalogs.length > 0 ? (
                <span className="inline-flex h-8 min-w-[74px] flex-col justify-center rounded-lg border border-violet-200 bg-violet-50 px-2 text-center text-[10px] font-semibold text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-400">
                  <span className="uppercase tracking-wide text-violet-500/80">Catálogos</span>
                  <span className="text-xs leading-none">{selectedCatalogs.length}</span>
                </span>
              ) : null}
              {totalItems > 0 ? (
                <span className="inline-flex h-8 min-w-[74px] flex-col justify-center rounded-lg border border-sky-200 bg-sky-50 px-2 text-center text-[10px] font-semibold text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-400">
                  <span className="uppercase tracking-wide text-sky-500/80">Itens</span>
                  <span className="text-xs leading-none">{totalItems}</span>
                </span>
              ) : null}
              {numberValue(data.total) !== null ? (
                <span className="inline-flex h-8 min-w-[92px] flex-col justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-center text-[10px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400">
                  <span className="uppercase tracking-wide text-emerald-500/80">Valor</span>
                  <span className="text-xs leading-none">{fmtMoney(data.total)}</span>
                </span>
              ) : null}
              <button
                type="button"
                onClick={handleOpenPdf}
                disabled={downloadingPdf}
                className="inline-flex h-8 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
              >
                <PdfActionLabel loading={downloadingPdf} loadingLabel="Gerando PDF...">
                  PDF cotação
                </PdfActionLabel>
              </button>
              <Link
                href={`/nursing/procedures/${id}/edit`}
                className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                Editar
              </Link>
              <Link
                href={reportHref}
                className="inline-flex h-8 items-center rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-400"
              >
                Relatório
              </Link>
              <Link
                href="/nursing/procedures"
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft size={12} />
                Voltar
              </Link>
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

        <div className={`grid gap-3 ${hasContextRail && hasMainDeck ? "xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]" : ""}`}>
          {hasContextRail ? (
            <div className="space-y-3">
              {hasTeamCard ? (
                <SurfaceCard
                  title="Sectores e Serviços"
                  icon={<Building2 size={14} />}
                  accent="bg-amber-400"
                  iconTone="bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400"
                >
                  <div className="grid gap-2">
                    {wardName ? (
                      <MiniPanel
                        label="Sector"
                        value={wardName}
                        tone="border-amber-200 bg-amber-50 dark:border-amber-700/30 dark:bg-amber-900/20"
                      />
                    ) : null}
                    {professionals.length > 0 ? (
                      <MiniPanel
                        label="Serviços"
                        value={professionals.join(", ")}
                        tone="border-amber-200 bg-amber-50 dark:border-amber-700/30 dark:bg-amber-900/20"
                      />
                    ) : null}
                    <div className="grid grid-cols-2 gap-2">
                      {selectedCatalogs.length > 0 ? (
                        <MiniPanel label="Catálogos" value={selectedCatalogs.length} tone="border-orange-200 bg-orange-50 dark:border-orange-700/30 dark:bg-orange-900/20" />
                      ) : null}
                      {totalItems > 0 ? (
                        <MiniPanel label="Itens" value={totalItems} tone="border-yellow-200 bg-yellow-50 dark:border-yellow-700/30 dark:bg-yellow-900/20" />
                      ) : null}
                      {createdBy ? (
                        <MiniPanel label="Criado por" value={createdBy} tone="border-orange-200 bg-orange-50 dark:border-orange-700/30 dark:bg-orange-900/20" />
                      ) : null}
                      {data.updated_at ? (
                        <MiniPanel label="Atualizado" value={fmtDate(data.updated_at)} tone="border-yellow-200 bg-yellow-50 dark:border-yellow-700/30 dark:bg-yellow-900/20" />
                      ) : null}
                    </div>
                  </div>
                </SurfaceCard>
              ) : null}

              {hasWorkflowCard || hasTimelineCard ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
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

                  {hasTimelineCard ? (
                    <SurfaceCard
                      title="Linha do Tempo"
                      icon={<CalendarClock size={14} />}
                      accent="bg-indigo-400"
                      iconTone="bg-indigo-500/10 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-400"
                    >
                      <Timeline steps={timelineSteps} />
                    </SurfaceCard>
                  ) : null}
                </div>
              ) : null}

              {hasCatalogsCard ? (
                <SurfaceCard
                  title="Catálogos Selecionados"
                  icon={<HeartPulse size={14} />}
                  accent="bg-violet-400"
                  iconTone="bg-violet-500/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-400"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCatalogs.map((catalog) => (
                      <CatalogPill key={catalog.id} name={catalog.name} code={catalog.code} />
                    ))}
                  </div>
                </SurfaceCard>
              ) : null}
            </div>
          ) : null}

          {hasMainDeck ? (
            <div className="space-y-3">
              {hasFinanceCard ? (
                <SurfaceCard
                  title="Resumo Financeiro"
                  icon={<Wallet size={14} />}
                  accent="bg-emerald-400"
                  iconTone="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400"
                >
                  <div className="grid gap-2">
                    {serviceBreakdown.length > 0 ? (
                      <div className="grid gap-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">Serviços</p>
                        {serviceBreakdown.map((item) => (
                          <FinancialRow key={item.id} label={item.label} meta={item.meta} value={fmtMoney(item.total)} />
                        ))}
                      </div>
                    ) : null}
                    {materialBreakdown.length > 0 ? (
                      <div className="grid gap-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">Materiais</p>
                        {materialBreakdown.map((item) => (
                          <FinancialRow key={item.id} label={item.label} meta={item.meta} value={fmtMoney(item.total)} />
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {serviceSubtotal !== null ? (
                        <InlineMiniPanel label="Subtotal serviços" value={fmtMoney(serviceSubtotal)} tone="border-emerald-200 bg-emerald-50 dark:border-emerald-700/30 dark:bg-emerald-900/20" />
                      ) : null}
                      {materialSubtotal !== null ? (
                        <InlineMiniPanel label="Subtotal materiais" value={fmtMoney(materialSubtotal)} tone="border-teal-200 bg-teal-50 dark:border-teal-700/30 dark:bg-teal-900/20" />
                      ) : null}
                      {billedItems > 0 ? (
                        <InlineMiniPanel label="Faturados" value={`${billedItems}/${items.length}`} tone="border-lime-200 bg-lime-50 dark:border-lime-700/30 dark:bg-lime-900/20" />
                      ) : null}
                    </div>
                    {combinedTotal !== null ? (
                      <div className="w-full rounded-lg border border-emerald-300 bg-emerald-100/90 px-3 py-2 backdrop-blur-sm dark:border-emerald-700/30 dark:bg-emerald-900/25">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-300">Total geral</span>
                          <span className="text-[16px] font-semibold leading-none text-emerald-800 dark:text-emerald-200">{fmtMoney(combinedTotal)}</span>
                        </div>
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

              {hasItemsCard ? (
                <SurfaceCard
                  title={`Itens do Procedimento (${items.length})`}
                  icon={<ClipboardList size={14} />}
                  accent="bg-sky-400"
                  iconTone="bg-sky-500/10 text-sky-700 dark:bg-sky-400/10 dark:text-sky-400"
                >
                  <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))]">
                    {items.map((item) => <ProcedureItemCard key={item.id || item.custom_id} item={item} />)}
                  </div>
                </SurfaceCard>
              ) : null}

              {hasMaterialsCard ? (
                <SurfaceCard
                  title={`Materiais Consumidos (${materials.length})`}
                  icon={<Package2 size={14} />}
                  accent="bg-violet-400"
                  iconTone="bg-violet-500/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-400"
                >
                  <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))]">
                    {materials.map((item) => (
                      <ProcedureMaterialCard
                        key={item.id || item.custom_id}
                        item={item}
                        resolvedUnitValue={resolveMaterialUnitValue(item)}
                      />
                    ))}
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
            </div>
          ) : null}
        </div>
      </div>
    </AppLayout>
  )
}
