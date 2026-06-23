"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  Search, RotateCcw, BarChart2,
  Clock, XCircle, CheckCircle2,
  Stethoscope, AlertTriangle, ChevronLeft, User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import ManchesterBadge from "@/components/ui/ManchesterBadge"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import useDebounce from "@/hooks/useDebounce"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { canonicalCollectionPath } from "@/lib/openapi/endpointResolver"
import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { buildRecordDetailHref } from "@/lib/resources/recordIdentity"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import styles from "../requests/RequestsBoardPage.module.css"

type Row = Record<string, any>

const ENDPOINT   = "/consultations/consultation/"
const ROUTE_BASE = "/consultations/medical-consultations"

const STATUS_SCHEDULED  = ["agendada", "scheduled", "pendente"]
const STATUS_CANCELLED  = ["cancelada", "cancelado", "cancelled"]
const STATUS_ATTENDED   = ["atendida", "atendido", "concluida", "concluido", "attended", "completed", "validado"]

function getStatus(row: Row): string {
  return String(row?.status || row?.estado || "").toLowerCase().trim()
}

function getPatientName(row: Row): string {
  return (
    row?.patient_name    ||
    row?.paciente_nome   ||
    row?.nome_paciente   ||
    row?.patient?.name   ||
    row?.patient?.nome   ||
    "—"
  )
}

function getCode(row: Row): string {
  return (
    row?.custom_id ||
    row?.id_custom ||
    row?.codigo    ||
    row?.code      ||
    (row?.id ? `#${row.id}` : "—")
  )
}

function getDoctorName(row: Row): string | null {
  return (
    row?.doctor_name ||
    row?.medico_nome ||
    row?.doctor?.name ||
    row?.doctor?.nome ||
    null
  )
}

function getSpecialty(row: Row): string | null {
  return (
    row?.specialty_name   ||
    row?.especialidade    ||
    row?.specialty?.name  ||
    null
  )
}

function formatDate(value: any): string {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(value))
  } catch { return String(value) }
}

function rowPriority(row: Row): { status: string; display: string } {
  return {
    status:  String(row?.priority || row?.prioridade || row?.urgency || row?.urgencia || ""),
    display: String(row?.priority_display || row?.prioridade_display || row?.urgency_display || ""),
  }
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    agendada: "Agendada", scheduled: "Agendada", pendente: "Pendente",
    cancelada: "Cancelada", cancelado: "Cancelada", cancelled: "Cancelada",
    atendida: "Atendida", atendido: "Atendida", concluida: "Concluída",
    concluido: "Concluída", attended: "Atendida", completed: "Concluída", validado: "Concluída",
  }
  return map[status] || status
}

type CardProps = { row: Row; href: string }

function ConsultationCard({ row, href }: CardProps) {
  const code       = getCode(row)
  const patient    = getPatientName(row)
  const doctor     = getDoctorName(row)
  const specialty  = getSpecialty(row)
  const date       = formatDate(row?.scheduled_at || row?.data_consulta || row?.created_at || row?.criado_em)
  const status     = getStatus(row)
  const statusLabel = getStatusLabel(status)
  const { status: pStatus, display: pDisplay } = rowPriority(row)
  const isUrgent   = row?.is_urgent || row?.urgente

  return (
    <Link
      href={href}
      className="group block rounded-lg border border-white/30 bg-transparent backdrop-blur-sm px-2.5 py-2 shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:border-[var(--primary-300)] hover:bg-white/20 hover:shadow-md hover:ring-[var(--primary-200)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-400)]"
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="font-mono text-[11px] font-semibold text-[var(--primary-700)] group-hover:text-[var(--primary-800)]">
          {code}
        </span>
        {isUrgent && (
          <span title="Urgente" className="flex items-center gap-0.5 rounded border border-red-300 bg-red-50 px-1 py-px text-[9px] font-semibold text-red-700">
            <AlertTriangle size={9} />
            Urgente
          </span>
        )}
      </div>

      <p className="mt-0.5 text-xs font-medium text-[var(--text)] leading-snug line-clamp-1">
        {patient}
      </p>

      {(doctor || specialty) && (
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--gray-500)] line-clamp-1">
          <User size={9} />
          <span>{[doctor, specialty].filter(Boolean).join(" · ")}</span>
        </div>
      )}

      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
        {(pStatus || pDisplay) ? (
          <ManchesterBadge status={pStatus} display={pDisplay} />
        ) : null}
        <span className="ml-auto text-[10px] text-[var(--gray-400)]">{date}</span>
      </div>

      <div className="mt-1 border-t border-white/30 pt-1 text-[9px] font-medium text-[var(--gray-400)]">
        {statusLabel}
      </div>
    </Link>
  )
}

type ColumnColorTokens = {
  bg: string
  headerBgHex: string
  border: string
  text: string
  countBg: string
  countText: string
}

type ColumnProps = {
  title: string
  icon: React.ReactNode
  rows: Row[]
  colorTokens: ColumnColorTokens
  emptyText: string
  rowHref: (row: Row) => string
}

function BoardColumn({ title, icon, rows, colorTokens, emptyText, rowHref }: ColumnProps) {
  const cssVars = {
    "--col-border": colorTokens.border,
    "--col-header": colorTokens.headerBgHex,
  } as React.CSSProperties

  // eslint-disable-next-line react/forbid-dom-props
  return (
    <div className="flex flex-col" style={cssVars}>
      <div className={`${styles.columnHeader} flex items-center gap-2 px-3 py-2 ${colorTokens.bg} ${colorTokens.text}`}>
        {icon}
        <span className="text-sm font-semibold tracking-wide">{title}</span>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${colorTokens.countBg} ${colorTokens.countText}`}>
          {rows.length}
        </span>
      </div>
      <div className={styles.columnBody}>
        <div className="flex flex-col gap-1.5">
          {rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-8 text-center text-xs text-[var(--gray-400)]">
              {emptyText}
            </p>
          ) : (
            rows.map((row) => (
              <ConsultationCard key={row.id} row={row} href={rowHref(row)} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function ConsultationsSubNav() {
  const pathname = usePathname() || "/"
  const router   = useRouter()
  const tabs = [
    { href: "/consultations/medical-consultations", label: "Painel" },
    { href: "/consultations", label: "Consultas" },
  ]
  const isRoot = pathname === "/consultations/medical-consultations" || pathname === "/consultations/medical-consultations/"

  return (
    <nav className="shrink-0 border-b border-border/60 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center gap-1.5 px-2 py-1 sm:px-3 md:px-4">
        {!isRoot && (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back()
                return
              }
              router.push("/consultations/medical-consultations")
            }}
            className="inline-flex h-6 shrink-0 items-center gap-0.5 rounded border border-border bg-background px-1.5 text-[11px] font-semibold text-foreground-2 shadow-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft size={12} />
            Voltar
          </button>
        )}
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/")
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
                  isActive
                    ? "border-primary/40 bg-primary-soft text-foreground"
                    : "border-transparent text-foreground-2 hover:border-border hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

export default function ConsultationsBoardPage() {
  const { loading } = useAuthGuard()
  const { t } = useLanguage()
  const [search, setSearch]       = useState("")
  const [page, setPage]           = useState(1)
  const [pageSize]                = useState(100)
  const [data, setData]           = useState<Row[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const debouncedSearch           = useDebounce(search, 300)
  const safeRefreshToken          = useSafeDataRefreshSignal()

  const canList = hasOpenApiMethod(ENDPOINT, "get")
  const normalizedEndpoint = canonicalCollectionPath(ENDPOINT) || ENDPOINT

  const requestUrl = useMemo(() => {
    if (!debouncedSearch.trim()) return normalizedEndpoint
    const url = new URL(normalizedEndpoint, "http://local")
    url.searchParams.set("search", debouncedSearch.trim())
    return `${url.pathname}${url.search}`
  }, [debouncedSearch, normalizedEndpoint])

  useEffect(() => { setPage(1) }, [requestUrl])

  useEffect(() => {
    if (!canList) return
    let mounted = true
    async function load() {
      try {
        setLoadingData(true)
        setError(null)
        const res = await apiFetchList<Row>(requestUrl, {
          page,
          pageSize,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        })
        if (!mounted) return
        const items = Array.isArray(res?.items) ? res.items : []
        setData(items)
        setTotalItems(res?.meta?.total ?? items.length)
      } catch (e: any) {
        if (mounted) setError(e?.message || t("Falha ao carregar dados.", "Failed to load data."))
      } finally {
        if (mounted) setLoadingData(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [canList, page, pageSize, requestUrl, safeRefreshToken, t])

  const scheduled = useMemo(() => data.filter((r) => STATUS_SCHEDULED.includes(getStatus(r))), [data])
  const cancelled = useMemo(() => data.filter((r) => STATUS_CANCELLED.includes(getStatus(r))), [data])
  const attended  = useMemo(() => data.filter((r) => STATUS_ATTENDED.includes(getStatus(r))), [data])
  const other     = useMemo(() => data.filter((r) => {
    const s = getStatus(r)
    return !STATUS_SCHEDULED.includes(s) && !STATUS_CANCELLED.includes(s) && !STATUS_ATTENDED.includes(s)
  }), [data])

  const pendingRows  = useMemo(() => [...scheduled, ...other], [scheduled, other])

  function rowHref(row: Row): string {
    return buildRecordDetailHref(ROUTE_BASE, row) ?? `${ROUTE_BASE}/${row.id}`
  }

  const reportHref = `/reports?endpoint=${encodeURIComponent(normalizedEndpoint)}&group=${encodeURIComponent("Consultas")}&resource=${encodeURIComponent("Consulta Médica")}`

  if (loading) return null

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("consultations")} subNav={<ConsultationsSubNav />}>
      <div className="w-full space-y-1.5 px-1">
        <PageHeader
          title="Consultas Médicas"
          actions={
            <Link
              href={reportHref}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--primary-200)] bg-[var(--primary-50)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-700)] shadow-sm transition hover:bg-[var(--primary-100)] h-9"
            >
              <BarChart2 size={12} />
              {t("Ver relatório", "View report")}
            </Link>
          }
        />

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 bg-transparent">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--gray-400)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Pesquise por código, paciente, médico ou estado", "Search by code, patient, doctor or status")}
              className="w-full rounded-md border border-[var(--border)] bg-transparent py-2 pl-8 pr-3 text-sm text-[var(--text)] transition-colors duration-150 placeholder:text-[var(--gray-400)] hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[var(--gray-500)]">
            <span>Total: {totalItems}</span>
            <span className="text-[var(--gray-300)]">·</span>
            <span>Na página: {data.length}</span>
          </div>

          <button
            type="button"
            onClick={() => { setSearch(""); setPage(1) }}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--border)] bg-transparent px-2.5 text-xs font-semibold text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
          >
            <RotateCcw size={12} />
            {t("Limpar filtros", "Clear filters")}
          </button>
        </div>

        {loadingData ? (
          <div className="text-sm text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <BoardColumn
              title="Pendentes / Agendadas"
              icon={<Clock size={14} className="text-amber-600" />}
              rows={pendingRows}
              colorTokens={{
                bg: "bg-amber-50/80",
                headerBgHex: "#fffbeb",
                border: "#fcd34d",
                text: "text-amber-800",
                countBg: "bg-amber-100",
                countText: "text-amber-700",
              }}
              emptyText="Nenhuma consulta agendada"
              rowHref={rowHref}
            />
            <BoardColumn
              title="Canceladas"
              icon={<XCircle size={14} className="text-red-600" />}
              rows={cancelled}
              colorTokens={{
                bg: "bg-red-50/80",
                headerBgHex: "#fef2f2",
                border: "#fca5a5",
                text: "text-red-800",
                countBg: "bg-red-100",
                countText: "text-red-700",
              }}
              emptyText="Nenhuma consulta cancelada"
              rowHref={rowHref}
            />
            <BoardColumn
              title="Atendidas"
              icon={<CheckCircle2 size={14} className="text-emerald-600" />}
              rows={attended}
              colorTokens={{
                bg: "bg-emerald-50/80",
                headerBgHex: "#ecfdf5",
                border: "#6ee7b7",
                text: "text-emerald-800",
                countBg: "bg-emerald-100",
                countText: "text-emerald-700",
              }}
              emptyText="Nenhuma consulta atendida"
              rowHref={rowHref}
            />
          </div>
        )}
      </div>
    </AppLayout>
  )
}
