"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import styles from "./RequestsBoardPage.module.css"
import { useEffect, useMemo, useState } from "react"
import { Search, RotateCcw, BarChart2, Clock, XCircle, CheckCircle2, FlaskConical, AlertTriangle, ChevronLeft, Microscope, Hourglass } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import useDebounce from "@/hooks/useDebounce"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchAll } from "@/lib/api"
import { canonicalCollectionPath } from "@/lib/openapi/endpointResolver"
import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { buildRecordDetailHref } from "@/lib/resources/recordIdentity"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import ManchesterBadge from "@/components/ui/ManchesterBadge"
import { getManchesterMeta } from "@/lib/manchesterTriage"

type Row = Record<string, any>

const ENDPOINT = "/clinical/labrequest/"
const ROUTE_BASE = "/requests"

// Estados terminais negativos agrupados sob "Canceladas" (toggle).
const STATUS_CANCELLED = ["cancelado", "desconsiderado"]

function getStatus(row: Row): string {
  return String(row?.status || row?.estado || "").toLowerCase().trim()
}

function getPatientName(row: Row): string {
  return (
    row?.patient_name ||
    row?.paciente_nome ||
    row?.nome_paciente ||
    row?.patient?.name ||
    row?.patient?.nome ||
    "—"
  )
}

function getCode(row: Row): string {
  return (
    row?.custom_id ||
    row?.id_custom ||
    row?.codigo ||
    row?.code ||
    (row?.id ? `#${row.id}` : "—")
  )
}

function getItemCount(row: Row): number {
  const items = row?.items || row?.itens || []
  if (Array.isArray(items)) return items.length
  const exams = row?.exams || row?.exames || []
  return Array.isArray(exams) ? exams.length : 0
}

function formatDate(value: any): string {
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

function rowClinicalStatus(row: Row): { status: string; display: string } {
  return {
    status:  String(row?.clinical_status  || row?.status_clinico  || ""),
    display: String(row?.clinical_status_display || row?.prioridade_display || ""),
  }
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pendente: "Pendente",
    em_analise: "Em Análise",
    aguardando_validacao: "Aguardando Validação",
    validado: "Validado",
    cancelado: "Cancelado",
    desconsiderado: "Desconsiderado",
  }
  return map[status] || status
}

type CardProps = {
  row: Row
  href: string
}

function RequestCard({ row, href }: CardProps) {
  const code = getCode(row)
  const patientName = getPatientName(row)
  const itemCount = getItemCount(row)
  const date = formatDate(row?.created_at || row?.criado_em)
  const { status: cStatus, display: cDisplay } = rowClinicalStatus(row)
  const hasCritical = row?.has_critical_result || row?.possui_resultado_critico
  const status = getStatus(row)
  const statusLabel = getStatusLabel(status)

  return (
    <Link
      href={href}
      className="group block rounded-lg border border-white/30 bg-transparent backdrop-blur-sm px-2.5 py-2 shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:border-[var(--primary-300)] hover:bg-white/20 hover:shadow-md hover:ring-[var(--primary-200)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-400)]"
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="font-mono text-[11px] font-semibold text-[var(--primary-700)] group-hover:text-[var(--primary-800)]">
          {code}
        </span>
        {hasCritical && (
          <span title="Resultado crítico" className="flex items-center gap-0.5 rounded border border-red-300 bg-red-50 px-1 py-px text-[9px] font-semibold text-red-700">
            <AlertTriangle size={9} />
            Crítico
          </span>
        )}
      </div>

      <p className="mt-0.5 text-xs font-medium text-[var(--text)] leading-snug line-clamp-1">
        {patientName}
      </p>

      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
        {(cStatus || cDisplay) ? (
          <ManchesterBadge status={cStatus} display={cDisplay} />
        ) : null}
        <span className="flex items-center gap-0.5 text-[10px] text-[var(--gray-500)]">
          <FlaskConical size={10} />
          {itemCount}
        </span>
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
  scrollbar?: string
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
  // CSS custom properties injectadas no wrapper — usadas pelo módulo CSS
  const cssVars = {
    "--col-border": colorTokens.border,
    "--col-header": colorTokens.headerBgHex,
  } as React.CSSProperties

  // eslint-disable-next-line react/forbid-dom-props
  return (
    <div className="flex flex-col" style={cssVars}>
      {/* Cabeçalho com topo arredondado */}
      <div className={`${styles.columnHeader} flex items-center gap-2 px-3 py-2 ${colorTokens.bg} ${colorTokens.text}`}>
        {icon}
        <span className="text-sm font-semibold tracking-wide">{title}</span>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${colorTokens.countBg} ${colorTokens.countText}`}>
          {rows.length}
        </span>
      </div>

      {/* Corpo da coluna com scroll independente */}
      <div className={styles.columnBody}>
        <div className="flex flex-col gap-1.5">
          {rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-8 text-center text-xs text-[var(--gray-400)]">
              {emptyText}
            </p>
          ) : (
            rows.map((row) => (
              <RequestCard key={row.id} row={row} href={rowHref(row)} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function RequestsSubNav() {
  const pathname = usePathname() || "/"
  const router = useRouter()
  const tabs = [
    { href: "/requests", label: "Painel" },
    { href: "/requests/pendentes", label: "Pendentes" },
  ]
  const active = tabs.find((t) => pathname === t.href || pathname.startsWith(t.href + "/"))
  const isRoot = pathname === "/requests" || pathname === "/requests/"

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
              router.push("/requests")
            }}
            className="inline-flex h-6 shrink-0 items-center gap-0.5 rounded border border-border bg-background px-1.5 text-[11px] font-semibold text-foreground-2 shadow-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft size={12} />
            Voltar
          </button>
        )}
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const isActive = active?.href === tab.href
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

type ColumnDef = {
  key: string
  title: string
  icon: React.ReactNode
  statuses: string[]
  colorTokens: ColumnColorTokens
  emptyText: string
}

export default function RequestsBoardPage() {
  const { loading } = useAuthGuard()
  const { t } = useLanguage()
  const [search, setSearch] = useState("")
  const [showCancelled, setShowCancelled] = useState(false)
  const [data, setData] = useState<Row[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debouncedSearch = useDebounce(search, 300)
  const safeRefreshToken = useSafeDataRefreshSignal()

  const canList = hasOpenApiMethod(ENDPOINT, "get")
  const normalizedEndpoint = canonicalCollectionPath(ENDPOINT) || ENDPOINT

  const requestUrl = useMemo(() => {
    if (!debouncedSearch.trim()) return normalizedEndpoint
    const url = new URL(normalizedEndpoint, "http://local")
    url.searchParams.set("search", debouncedSearch.trim())
    return `${url.pathname}${url.search}`
  }, [debouncedSearch, normalizedEndpoint])

  useEffect(() => {
    if (!canList) return
    let mounted = true
    async function load() {
      try {
        setLoadingData(true)
        setError(null)
        // Carrega o conjunto completo para que as colunas reflictam os totais
        // reais por estado (não apenas a primeira página do servidor).
        const all = await apiFetchAll<Row>(requestUrl, {
          pageSize: 200,
          clientCache: safeRefreshToken === 0,
        })
        if (!mounted) return
        setData(Array.isArray(all) ? all : [])
      } catch (e: any) {
        if (mounted) setError(e?.message || t("Falha ao carregar dados.", "Failed to load data."))
      } finally {
        if (mounted) setLoadingData(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [canList, requestUrl, safeRefreshToken, t])

  // Agrupamento por estado sobre o conjunto completo.
  const byStatus = useMemo(() => {
    const map = new Map<string, Row[]>()
    for (const row of data) {
      const s = getStatus(row)
      const bucket = map.get(s)
      if (bucket) bucket.push(row)
      else map.set(s, [row])
    }
    return map
  }, [data])

  const columns: ColumnDef[] = useMemo(() => {
    const pipeline: ColumnDef[] = [
      {
        key: "pendente",
        title: "Pendentes",
        icon: <Clock size={14} className="text-amber-600" />,
        statuses: ["pendente"],
        colorTokens: { bg: "bg-amber-50/80", headerBgHex: "#fffbeb", border: "#fcd34d", text: "text-amber-800", countBg: "bg-amber-100", countText: "text-amber-700" },
        emptyText: "Nenhuma requisição pendente",
      },
      {
        key: "em_analise",
        title: "Em Análise",
        icon: <Microscope size={14} className="text-blue-600" />,
        statuses: ["em_analise"],
        colorTokens: { bg: "bg-blue-50/80", headerBgHex: "#eff6ff", border: "#93c5fd", text: "text-blue-800", countBg: "bg-blue-100", countText: "text-blue-700" },
        emptyText: "Nenhuma requisição em análise",
      },
      {
        key: "aguardando_validacao",
        title: "Aguard. Validação",
        icon: <Hourglass size={14} className="text-indigo-600" />,
        statuses: ["aguardando_validacao"],
        colorTokens: { bg: "bg-indigo-50/80", headerBgHex: "#eef2ff", border: "#a5b4fc", text: "text-indigo-800", countBg: "bg-indigo-100", countText: "text-indigo-700" },
        emptyText: "Nenhuma requisição a aguardar validação",
      },
      {
        key: "validado",
        title: "Validadas",
        icon: <CheckCircle2 size={14} className="text-emerald-600" />,
        statuses: ["validado"],
        colorTokens: { bg: "bg-emerald-50/80", headerBgHex: "#ecfdf5", border: "#6ee7b7", text: "text-emerald-800", countBg: "bg-emerald-100", countText: "text-emerald-700" },
        emptyText: "Nenhuma requisição validada",
      },
    ]
    if (!showCancelled) return pipeline
    return [
      ...pipeline,
      {
        key: "cancelado",
        title: "Canceladas",
        icon: <XCircle size={14} className="text-red-600" />,
        statuses: STATUS_CANCELLED,
        colorTokens: { bg: "bg-red-50/80", headerBgHex: "#fef2f2", border: "#fca5a5", text: "text-red-800", countBg: "bg-red-100", countText: "text-red-700" },
        emptyText: "Nenhuma requisição cancelada",
      },
    ]
  }, [showCancelled])

  function columnRows(col: ColumnDef): Row[] {
    return col.statuses.flatMap((s) => byStatus.get(s) ?? [])
  }

  function rowHref(row: Row): string {
    return buildRecordDetailHref(ROUTE_BASE, row) ?? `${ROUTE_BASE}/${row.id}`
  }

  const reportHref = `/reports?endpoint=${encodeURIComponent(normalizedEndpoint)}&group=${encodeURIComponent("Área Clínica")}&resource=${encodeURIComponent("Requisição")}`
  const gridColsClass = columns.length >= 5 ? "xl:grid-cols-5" : "xl:grid-cols-4"

  if (loading) return null

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical")} subNav={<RequestsSubNav />}>
      <div className="w-full space-y-1.5 px-1">
        <PageHeader
          title="Área Clínica / Requisição"
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

        {/* Barra de pesquisa minimalista – fundo 100% transparente */}
        <div className="flex flex-wrap items-center gap-2 bg-transparent">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--gray-400)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                "Pesquise em requisição por código, nome, estado ou descrição",
                "Search by code, name, status or description"
              )}
              className="w-full rounded-md border border-[var(--border)] bg-transparent py-2 pl-8 pr-3 text-sm text-[var(--text)] transition-colors duration-150 placeholder:text-[var(--gray-400)] hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
            />
          </div>

          <div className="text-xs text-[var(--gray-500)]">
            <span>Total: {data.length}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowCancelled((v) => !v)}
            aria-pressed={showCancelled}
            className={`inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold shadow-sm transition-all duration-150 ${
              showCancelled
                ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                : "border-[var(--border)] bg-transparent text-[var(--gray-700)] hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
            }`}
          >
            <XCircle size={12} />
            {showCancelled ? t("Ocultar canceladas", "Hide cancelled") : t("Mostrar canceladas", "Show cancelled")}
          </button>

          <button
            type="button"
            onClick={() => { setSearch(""); setShowCancelled(false) }}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--border)] bg-transparent px-2.5 text-xs font-semibold text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
          >
            <RotateCcw size={12} />
            {t("Limpar filtros", "Clear filters")}
          </button>
        </div>

        {/* Board: colunas por etapa do pipeline (totais reais por estado) */}
        {loadingData ? (
          <div className="text-sm text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
        ) : (
          <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${gridColsClass}`}>
            {columns.map((col) => (
              <BoardColumn
                key={col.key}
                title={col.title}
                icon={col.icon}
                rows={columnRows(col)}
                colorTokens={col.colorTokens}
                emptyText={col.emptyText}
                rowHref={rowHref}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
