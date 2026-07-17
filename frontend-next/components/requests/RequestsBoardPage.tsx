"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import styles from "./RequestsBoardPage.module.css"
import { useEffect, useMemo, useState } from "react"
import { Search, RotateCcw, BarChart2, Clock, XCircle, CheckCircle2, FlaskConical, AlertTriangle, ChevronLeft, Microscope, Hourglass, ClipboardList } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import useDebounce from "@/hooks/useDebounce"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchAll } from "@/lib/api"
import { abbreviateMiddleNames } from "@/lib/formatName"
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
  const raw = (
    row?.patient_name ||
    row?.paciente_nome ||
    row?.nome_paciente ||
    row?.patient?.name ||
    row?.patient?.nome ||
    "—"
  )
  return raw === "—" ? raw : abbreviateMiddleNames(String(raw))
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

function statusTone(status: string) {
  switch (status) {
    case "pendente":
      return { grad: "from-amber-500 to-orange-600", bar: "bg-amber-500", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300" }
    case "em_analise":
      return { grad: "from-sky-500 to-blue-600", bar: "bg-sky-500", badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300" }
    case "aguardando_validacao":
      return { grad: "from-violet-500 to-indigo-600", bar: "bg-violet-500", badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300" }
    case "validado":
      return { grad: "from-emerald-500 to-teal-600", bar: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300" }
    default:
      return { grad: "from-rose-500 to-pink-600", bar: "bg-rose-500", badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300" }
  }
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
  const tone = statusTone(status)

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-lg border border-white/20 bg-white/30 px-2 py-1.5 pl-3 shadow-sm backdrop-blur-sm transition hover:-translate-y-px hover:border-white/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-400)] dark:border-white/10 dark:bg-white/[0.04]"
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${tone.bar}`} />

      <div className="flex items-start gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${tone.grad} text-white shadow-sm`}>
          <FlaskConical size={14} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-bold leading-tight text-foreground">{patientName}</div>

          <div className="mt-1 flex items-center justify-between gap-1 text-[10px]">
            <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-white/20 bg-white/35 px-1.5 py-0.5 font-mono text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]">
              <span className="truncate">{code}</span>
              <span className="text-[9px] text-muted-foreground/70">•</span>
              <span className="inline-flex shrink-0 items-center gap-0.5">
                <FlaskConical size={9} />
                {itemCount}
              </span>
            </span>

            {hasCritical ? (
              <span title="Resultado crítico" className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
                <AlertTriangle size={9} />
                {`Crítico`}
              </span>
            ) : (
              <span className={`inline-flex shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${tone.badge}`}>
                {statusLabel}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center justify-between gap-1">
            {(cStatus || cDisplay) ? (
              <ManchesterBadge status={cStatus} display={cDisplay} className="shrink-0 px-1.5 text-[9px]" />
            ) : (
              <span className={`inline-flex shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${tone.badge}`}>
                {statusLabel}
              </span>
            )}
            <span className="truncate text-[9px] text-muted-foreground">{date}</span>
          </div>

          {(row?.notes || row?.descricao || row?.description) ? (
            <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">
              {String(row?.notes || row?.descricao || row?.description)}
            </p>
          ) : null}
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
    <div className="flex flex-col rounded-lg border border-white/20 bg-white/20 p-0.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]" style={cssVars}>
      {/* Cabeçalho com topo arredondado */}
      <div className={`${styles.columnHeader} flex items-center gap-1.5 px-2 py-1.5 ${colorTokens.bg} ${colorTokens.text}`}>
        {icon}
        <span className="text-xs font-semibold tracking-wide">{title}</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${colorTokens.countBg} ${colorTokens.countText}`}>
          {rows.length}
        </span>
      </div>

      {/* Corpo da coluna com scroll independente */}
      <div className={styles.columnBody}>
        <div className="flex flex-col gap-1">
          {rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--border)] px-2 py-6 text-center text-[11px] text-[var(--gray-400)]">
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

  const stats = useMemo(() => ({
    total: data.length,
    pending: (byStatus.get("pendente") ?? []).length,
    analysing: (byStatus.get("em_analise") ?? []).length,
    validated: (byStatus.get("validado") ?? []).length,
    cancelled: STATUS_CANCELLED.reduce((acc, status) => acc + (byStatus.get(status) ?? []).length, 0),
    critical: data.filter((row) => row?.has_critical_result || row?.possui_resultado_critico).length,
  }), [byStatus, data])

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
  const visibleCount = columns.reduce((acc, col) => acc + columnRows(col).length, 0)
  // Colunas sem requisições ficam ocultas para o quadro só mostrar etapas com conteúdo.
  const visibleColumns = columns.filter((col) => columnRows(col).length > 0)

  if (loading) return null

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("clinical")} subNav={<RequestsSubNav />}>
      <div className="w-full space-y-1">
        <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-500" />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 pl-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20">
                <ClipboardList size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">{t("Requisições clínicas", "Clinical requests")}</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loadingData ? t("A carregar…", "Loading…") : `${visibleCount} ${t("itens visíveis", "visible items")}`}
                </p>
              </div>
            </div>

            <Link
              href="/healthcare"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/30 bg-white/50 px-3 py-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:border-sky-400 hover:bg-white/70 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <ChevronLeft size={14} />
              {t("Voltar", "Back")}
            </Link>

            <Link
              href={reportHref}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sky-500/25 transition hover:brightness-110"
            >
              <BarChart2 size={14} />
              {t("Ver relatório", "View report")}
            </Link>

            <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-sm">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Código, paciente, estado ou descrição…", "Code, patient, status or description…")}
                className="w-full rounded-lg border border-white/30 bg-white/50 py-1.5 pl-8 pr-7 text-xs text-foreground shadow-sm backdrop-blur-sm transition placeholder:text-muted-foreground hover:border-sky-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25 dark:border-white/10 dark:bg-white/10"
              />
              {search ? (
                <button
                  type="button"
                  aria-label={t("Limpar", "Clear")}
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                >
                  <XCircle size={14} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 border-t border-white/20 px-3 py-1.5 pl-4 dark:border-white/10">
            {[
              { label: t("Total", "Total"), count: stats.total, cls: "border-sky-200/50 bg-sky-100/30 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300" },
              { label: t("Pendentes", "Pending"), count: stats.pending, cls: "border-amber-200/50 bg-amber-100/30 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300" },
              { label: t("Em análise", "Analysing"), count: stats.analysing, cls: "border-blue-200/50 bg-blue-100/30 text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300" },
              { label: t("Validadas", "Validated"), count: stats.validated, cls: "border-emerald-200/50 bg-emerald-100/30 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300" },
              { label: t("Críticas", "Critical"), count: stats.critical, cls: "border-rose-200/50 bg-rose-100/30 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300" },
            ].map((item) => (
              <span key={item.label} className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold backdrop-blur-xl ${item.cls}`}>
                {item.label}
                <strong className="text-[11px] tabular-nums">{item.count}</strong>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setShowCancelled((v) => !v)}
              className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                showCancelled
                  ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300"
                  : "border-white/30 bg-white/40 text-foreground hover:bg-white/60 dark:border-white/10 dark:bg-white/10"
              }`}
            >
              <XCircle size={11} />
              {showCancelled ? t("Ocultar canceladas", "Hide cancelled") : t("Mostrar canceladas", "Show cancelled")}
              <span className="rounded-full bg-black/5 px-1 tabular-nums dark:bg-white/10">{stats.cancelled}</span>
            </button>
            {(search || showCancelled) ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("")
                  setShowCancelled(false)
                }}
                className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/40 px-2 py-0.5 text-[10px] font-semibold text-foreground transition hover:bg-white/60 dark:border-white/10 dark:bg-white/10"
              >
                <RotateCcw size={11} /> {t("Limpar", "Clear")}
              </button>
            ) : null}
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </div>
        )}

        {/* Board: colunas por etapa do pipeline (totais reais por estado) */}
        {loadingData ? (
          <div className="rounded-xl border border-white/20 bg-white/30 px-4 py-8 text-sm text-muted-foreground shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
            {t("Carregando...", "Loading...")}
          </div>
        ) : visibleColumns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
            {t("Sem requisições para mostrar com os filtros actuais.", "No requests to show with the current filters.")}
          </div>
        ) : (
          <div className="overflow-x-auto [scrollbar-width:thin]">
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))`,
                minWidth: `${visibleColumns.length * 230}px`,
              }}
            >
              {visibleColumns.map((col) => (
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
          </div>
        )}
      </div>
    </AppLayout>
  )
}
