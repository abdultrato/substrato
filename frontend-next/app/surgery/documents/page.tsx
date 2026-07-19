"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageSizeInput from "@/components/ui/PageSizeInput"
import useAuthGuard from "@/hooks/useAuthGuard"
import useDebounce from "@/hooks/useDebounce"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type Row = Record<string, any>

const ENDPOINT = "/surgery/documentos/"
const ROUTE_BASE = "/surgery/documents"
const GLASS = "rounded-lg border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const DOC_TYPES: Record<string, { label: string; tone: string }> = {
  CONSENT: { label: "Consentimento", tone: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300" },
  QUOTATION: { label: "Orçamento", tone: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300" },
  AUTHORIZATION: { label: "Autorização", tone: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300" },
  INSURANCE: { label: "Seguro", tone: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300" },
  PREOPERATIVE: { label: "Pré-operatório", tone: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300" },
  ANESTHESIA: { label: "Anestesia", tone: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-700/30 dark:bg-fuchsia-900/20 dark:text-fuchsia-300" },
  OPERATIVE_REPORT: { label: "Relatório operatório", tone: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700/30 dark:bg-indigo-900/20 dark:text-indigo-300" },
  DISCHARGE: { label: "Alta", tone: "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700/30 dark:bg-teal-900/20 dark:text-teal-300" },
  OTHER: { label: "Outro", tone: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700/30 dark:bg-slate-900/20 dark:text-slate-300" },
}

const STATUSES: Record<string, { label: string; bar: string; badge: string }> = {
  DRAFT: { label: "Rascunho", bar: "bg-slate-400", badge: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700/30 dark:bg-slate-900/20 dark:text-slate-300" },
  PENDING_REVIEW: { label: "Pendente de revisão", bar: "bg-amber-500", badge: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300" },
  SIGNED: { label: "Assinado", bar: "bg-emerald-500", badge: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300" },
  AMENDED: { label: "Retificado", bar: "bg-blue-500", badge: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300" },
  CANCELLED: { label: "Cancelado", bar: "bg-rose-500", badge: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300" },
}

function fmtDateTime(value: unknown): string {
  if (!value) return "—"
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

function isExpired(value: unknown): boolean {
  if (!value) return false
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}

function documentHref(row: Row): string {
  return `${ROUTE_BASE}/${row.id}`
}

function DocumentCard({ row }: { row: Row }) {
  const status = STATUSES[String(row.status || "").toUpperCase()] || STATUSES.DRAFT
  const docType = DOC_TYPES[String(row.document_type || "").toUpperCase()] || DOC_TYPES.OTHER
  const expired = isExpired(row.expires_at)
  const context = row.surgery_code || row.surgical_request_code || row.preoperative_assessment_code || row.authorization_code

  return (
    <Link href={documentHref(row)} className="group block">
      <article className={`relative overflow-hidden ${GLASS} p-2 pl-3 transition hover:border-violet-300 hover:shadow-md dark:hover:border-violet-600/40`}>
        <span className={`absolute left-0 top-0 h-full w-1 ${status.bar}`} />
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1">
              <span className="font-mono text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                {row.custom_id || `#${row.id}`}
              </span>
              <span className={`inline-flex h-5 items-center rounded-full border px-1.5 text-[9px] font-semibold ${docType.tone}`}>
                {docType.label}
              </span>
              <span className={`inline-flex h-5 items-center rounded-full border px-1.5 text-[9px] font-semibold ${status.badge}`}>
                {status.label}
              </span>
            </div>
            <h2 className="mt-0.5 truncate text-[12px] font-semibold text-foreground">
              {row.title || "Documento cirúrgico"}
            </h2>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {context || "Sem vínculo clínico visível"} {row.uploaded_by_name ? ` · ${row.uploaded_by_name}` : ""}
            </p>
          </div>
          {String(row.status || "").toUpperCase() === "SIGNED" ? (
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
          ) : expired ? (
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-600" />
          ) : (
            <FileText size={14} className="mt-0.5 shrink-0 text-muted-foreground transition group-hover:text-violet-600" />
          )}
        </div>

        <div className="mt-1.5 grid grid-cols-2 gap-1">
          <div className="rounded-md border border-border/60 bg-card/35 px-1.5 py-1">
            <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Assinado</div>
            <div className="truncate text-[10px] font-semibold text-foreground">{fmtDateTime(row.signed_at)}</div>
          </div>
          <div className={`rounded-md border px-1.5 py-1 ${expired ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300" : "border-border/60 bg-card/35"}`}>
            <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Expira</div>
            <div className="truncate text-[10px] font-semibold">{fmtDateTime(row.expires_at)}</div>
          </div>
        </div>

        {row.external_reference || row.notes ? (
          <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
            {row.external_reference ? `${row.external_reference} · ` : ""}{row.notes}
          </p>
        ) : null}
      </article>
    </Link>
  )
}

export default function SurgeryDocumentsListPage() {
  const { loading: authLoading } = useAuthGuard()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(18)
  const debouncedSearch = useDebounce(search, 250)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const payload = await apiFetchList<Row>(ENDPOINT, {
          page: 1,
          pageSize: 500,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        })
        if (active) setRows(payload.items)
      } catch (err: any) {
        if (active) setError(err?.message || "Erro ao carregar documentos cirúrgicos.")
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [safeRefreshToken])

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {}
    const byType: Record<string, number> = {}
    for (const row of rows) {
      const status = String(row.status || "").toUpperCase()
      const type = String(row.document_type || "").toUpperCase()
      byStatus[status] = (byStatus[status] || 0) + 1
      byType[type] = (byType[type] || 0) + 1
    }
    return { byStatus, byType }
  }, [rows])

  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    return rows.filter((row) => {
      if (statusFilter && String(row.status || "").toUpperCase() !== statusFilter) return false
      if (typeFilter && String(row.document_type || "").toUpperCase() !== typeFilter) return false
      if (!query) return true
      const haystack = [
        row.custom_id,
        row.title,
        row.surgery_code,
        row.surgical_request_code,
        row.preoperative_assessment_code,
        row.authorization_code,
        row.uploaded_by_name,
        row.external_reference,
        row.notes,
        DOC_TYPES[String(row.document_type || "").toUpperCase()]?.label,
        STATUSES[String(row.status || "").toUpperCase()]?.label,
      ].map((value) => String(value || "").toLowerCase()).join(" ")
      return haystack.includes(query)
    })
  }, [rows, debouncedSearch, statusFilter, typeFilter])

  const visible = filtered.slice(0, pageSize)
  const signed = rows.filter((row) => String(row.status || "").toUpperCase() === "SIGNED").length
  const expired = rows.filter((row) => isExpired(row.expires_at)).length

  if (authLoading) return null

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
      <div className="mx-auto w-full max-w-[99vw] space-y-1 px-0.5 py-0.5">
        <section className={`relative overflow-visible ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-col gap-1.5 px-2 py-1.5 pl-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white shadow-sm">
                  <FileCheck2 size={16} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                    <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                    <span>/</span>
                    <span className="font-semibold text-foreground">Documentos</span>
                  </div>
                  <h1 className="font-display text-[14px] font-semibold leading-tight text-foreground">Documentos cirúrgicos</h1>
                </div>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-1">
                <span className="inline-flex h-6 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <CheckCircle2 size={11} /> {signed} assinados
                </span>
                <span className={`inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold ${
                  expired
                    ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300"
                    : "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700/30 dark:bg-slate-900/20 dark:text-slate-300"
                }`}>
                  <AlertTriangle size={11} /> {expired} expirados
                </span>
                <Link href="/surgery" className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-card px-2 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">
                  <ArrowLeft size={11} /> Voltar
                </Link>
                <Link href={`${ROUTE_BASE}/new`} className="inline-flex h-6 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                  <Plus size={11} /> Novo
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 border-t border-white/20 pt-1 dark:border-white/10">
              <div className="relative min-w-[220px] flex-1">
                <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-7 w-full rounded-md border border-border bg-card/60 pl-7 pr-7 text-[11px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-violet-400 focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
                  placeholder="Pesquisar título, cirurgia, pedido, autorização..."
                />
                {search ? (
                  <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={12} />
                  </button>
                ) : null}
              </div>
              <PageSizeInput value={pageSize} onChange={setPageSize} ariaLabel="Itens por página" />
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Estado</span>
              {Object.entries(STATUSES).map(([key, item]) => {
                const active = statusFilter === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(active ? null : key)}
                    className={`inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[9px] font-semibold transition ${active ? item.badge : "border-transparent text-muted-foreground hover:bg-muted"}`}
                  >
                    {item.label}
                    <span className="tabular-nums opacity-70">{stats.byStatus[key] || 0}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tipo</span>
              {Object.entries(DOC_TYPES).map(([key, item]) => {
                const active = typeFilter === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTypeFilter(active ? null : key)}
                    className={`inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[9px] font-semibold transition ${active ? item.tone : "border-transparent text-muted-foreground hover:bg-muted"}`}
                  >
                    {item.label}
                    <span className="tabular-nums opacity-70">{stats.byType[key] || 0}</span>
                  </button>
                )
              })}
              {(statusFilter || typeFilter || search) ? (
                <button type="button" onClick={() => { setStatusFilter(null); setTypeFilter(null); setSearch("") }} className="ml-auto inline-flex h-5 items-center gap-1 rounded-full border border-border bg-card px-1.5 text-[9px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X size={10} /> Limpar
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className={`h-28 animate-pulse ${GLASS}`} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <section className={`${GLASS} flex flex-col items-center justify-center gap-2 px-4 py-10 text-center`}>
            <ClipboardList size={26} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Nenhum documento encontrado.</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {rows.length === 0 ? "Ainda não existem documentos cirúrgicos registados." : "Nenhum documento corresponde aos filtros aplicados."}
            </p>
          </section>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visible.map((row) => (
                <DocumentCard key={row.id} row={row} />
              ))}
            </div>
            {filtered.length > visible.length ? (
              <div className="px-1 text-center text-[11px] text-muted-foreground">
                A mostrar {visible.length} de {filtered.length}
              </div>
            ) : null}
          </>
        )}
      </div>
    </AppLayout>
  )
}
