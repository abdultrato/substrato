"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  Search, RotateCcw, BarChart2,
  Clock, XCircle, CheckCircle2,
  AlertTriangle, ChevronLeft, Info,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import ManchesterBadge from "@/components/ui/ManchesterBadge"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import useDebounce from "@/hooks/useDebounce"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { abbreviateMiddleNames } from "@/lib/formatName"
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

function statusAccent(status: string): { bar: string; badge: string } {
  if (STATUS_CANCELLED.includes(status)) return { bar: "bg-rose-500", badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-400" }
  if (STATUS_ATTENDED.includes(status)) return { bar: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400" }
  return { bar: "bg-amber-500", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400" }
}

/** Consulta em aberto (agendada/pendente) cuja hora já passou. */
function rowIsOverdue(row: Row): boolean {
  const s = getStatus(row)
  if (!STATUS_SCHEDULED.includes(s)) return false
  const raw = row?.scheduled_at || row?.data_consulta
  if (!raw) return false
  const ts = new Date(raw).getTime()
  return !Number.isNaN(ts) && ts < Date.now()
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
  const accent     = statusAccent(status)
  const overdue    = rowIsOverdue(row)
  const initial    = (patient || "?").trim().charAt(0).toUpperCase()

  return (
    <Link
      href={href}
      className="group relative flex items-start gap-1.5 rounded-lg border border-white/20 bg-white/40 p-1.5 pl-2.5 shadow-sm backdrop-blur-sm transition hover:-translate-y-px hover:border-white/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-white/10 dark:bg-white/[0.04]"
    >
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-lg ${accent.bar}`} />

      {overdue ? (
        <span className="group/info absolute right-1 top-1 z-20">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-white shadow-sm ring-1 ring-amber-500/40">
            <Info size={11} />
          </span>
          <span role="tooltip" className="pointer-events-none absolute right-0 top-5 z-30 hidden w-max max-w-[12rem] rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 shadow-lg group-hover/info:block dark:border-amber-500/40 dark:bg-amber-900/40 dark:text-amber-200">
            Consulta atrasada — hora agendada já passou.
          </span>
        </span>
      ) : null}

      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white shadow-sm ${accent.bar}`}>
        {initial}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className={`truncate text-xs font-semibold leading-tight text-[var(--text)] ${overdue ? "pr-5" : ""}`}>
            {abbreviateMiddleNames(patient) || "—"}
          </span>
          {isUrgent && (
            <span title="Urgente" className="flex shrink-0 items-center gap-0.5 rounded border border-red-300 bg-red-50 px-1 py-px text-[8px] font-semibold text-red-700">
              <AlertTriangle size={8} />
            </span>
          )}
        </div>

        <div className="truncate text-[10px] leading-tight text-[var(--gray-500)]">
          {[doctor, specialty].filter(Boolean).join(" · ") || <span className="font-mono">{code}</span>}
        </div>

        <div className="mt-1 flex items-center justify-between gap-1.5">
          <span className="min-w-0 truncate text-[9px] text-[var(--gray-400)]">
            {date}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {(pStatus || pDisplay) ? <ManchesterBadge status={pStatus} display={pDisplay} /> : null}
            <span className={`rounded-full border px-1.5 py-0 text-[9px] font-semibold ${accent.badge}`}>
              {statusLabel}
            </span>
          </div>
        </div>
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
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("consultations")} subNav={<ConsultationsSubNav />}>
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
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-3">
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
