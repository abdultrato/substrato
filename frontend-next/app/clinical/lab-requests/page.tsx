"use client"

import Link from "next/link"
import { useEffect, useState, useCallback, useRef } from "react"
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  Stethoscope,
  User,
} from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"

type LabRequest = {
  id: number
  custom_id?: string
  type?: string
  status?: string
  clinical_status_display?: string
  patient_name?: string
  patient_age?: string
  patient_gender?: string
  requesting_physician_name?: string
  created_at?: string
  has_critical_result?: boolean
}

type Page = { count: number; next: string | null; previous: string | null; results: LabRequest[] }

const PAGE_SIZE = 20

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pendente:    { label: "Pendente",    cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200" },
  em_analise:  { label: "Em análise", cls: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200" },
  concluido:   { label: "Concluído",  cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" },
  cancelado:   { label: "Cancelado",  cls: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200" },
  validado:    { label: "Validado",   cls: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200" },
  transferido: { label: "Transferido",cls: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200" },
}

const TYPE_META: Record<string, { label: string; cls: string }> = {
  LAB: { label: "Lab",    cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  MED: { label: "Médico", cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
}

function fmt(v?: string) {
  if (!v) return "—"
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

const GLASS = "rounded-xl border border-[var(--border)] bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

export default function LabRequestsListPage() {
  const [rows, setRows] = useState<LabRequest[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
      if (query) params.set("search", query)
      const data = await apiFetch<Page>(`/clinical/labrequest/?${params}`)
      setRows(data.results ?? [])
      setCount(data.count ?? 0)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar pedidos.")
    } finally {
      setLoading(false)
    }
  }, [page, query])

  useEffect(() => { load() }, [load])

  function handleSearchChange(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      setQuery(value)
    }, 350)
  }

  function clearSearch() {
    setSearch("")
    setQuery("")
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-5xl space-y-3 px-1 py-1">

        {/* ── header + search ── */}
        <section className="relative overflow-hidden rounded-xl border border-sky-200/50 bg-gradient-to-br from-sky-50/80 via-white/60 to-cyan-50/60 shadow-sm backdrop-blur-sm dark:border-sky-800/30 dark:from-sky-950/30 dark:via-slate-900/40 dark:to-cyan-950/20">
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />
          <div className="px-4 py-3 pl-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FlaskConical size={15} className="text-sky-500" />
                <div>
                  <h1 className="font-display text-sm font-bold text-foreground leading-tight">Pedidos laboratoriais</h1>
                  <p className="text-[10px] text-[var(--gray-500)]">
                    {loading ? <Loader2 size={9} className="inline animate-spin mr-1" /> : null}
                    {count > 0 ? `${count} pedido${count !== 1 ? "s" : ""}` : "Sem pedidos"}
                    {query ? ` · "${query}"` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* search inline */}
                <div className="flex items-center gap-1.5 rounded-lg border border-white/50 bg-white/50 px-2.5 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06]">
                  <Search size={11} className="shrink-0 text-[var(--gray-400)]" />
                  <input
                    value={search}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder="Pesquisar paciente, código, médico..."
                    className="w-48 bg-transparent text-[11px] text-[var(--text)] outline-none placeholder-[var(--gray-400)]"
                  />
                  {search && (
                    <button type="button" onClick={clearSearch}
                      className="text-[var(--gray-400)] hover:text-foreground">
                      <span className="text-[10px]">×</span>
                    </button>
                  )}
                </div>
                <Link href="/clinical/lab-requests/new"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-sky-600 px-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-sky-700">
                  <Plus size={12} /> Novo pedido
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── error ── */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2.5 text-[12px] text-rose-800 dark:border-rose-800/40 dark:bg-rose-900/15 dark:text-rose-300">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        {/* ── list ── */}
        {loading && rows.length === 0 ? (
          <div className={`${GLASS} flex items-center gap-2 px-4 py-8 text-[12px] text-[var(--gray-400)]`}>
            <Loader2 size={14} className="animate-spin" /> A carregar...
          </div>
        ) : rows.length === 0 ? (
          <div className={`${GLASS} px-4 py-8 text-center text-[12px] text-[var(--gray-400)]`}>
            Nenhum pedido encontrado.
          </div>
        ) : (
          <section className={`${GLASS} overflow-hidden`}>
            <table className="w-full table-fixed text-[11px]">
              <colgroup>
                <col className="w-[13%]" />
                <col className="w-[8%]" />
                <col className="w-[22%]" />
                <col className="w-[20%]" />
                <col className="w-[16%]" />
                <col className="w-[13%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--gray-50)]/60 dark:bg-white/[0.03]">
                  <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Código</th>
                  <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Tipo</th>
                  <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Paciente</th>
                  <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Médico</th>
                  <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Estado</th>
                  <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Criado</th>
                  <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map(row => {
                  const statusKey = (row.status || "").toLowerCase()
                  const sm = STATUS_META[statusKey] ?? { label: row.status || "—", cls: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300" }
                  const tm = TYPE_META[row.type || ""] ?? null
                  return (
                    <tr key={row.id} className="transition hover:bg-sky-50/30 dark:hover:bg-sky-900/10">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          {row.has_critical_result && <ShieldAlert size={10} className="shrink-0 text-rose-500" />}
                          <span className="truncate font-mono text-[10px] font-semibold text-foreground">
                            {row.custom_id ?? `#${row.id}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {tm && (
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${tm.cls}`}>
                            {tm.label}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 truncate">
                          <User size={9} className="shrink-0 text-[var(--gray-400)]" />
                          <span className="truncate text-foreground">{row.patient_name ?? "—"}</span>
                        </div>
                        {(row.patient_age || row.patient_gender) && (
                          <p className="mt-0.5 truncate text-[9px] text-[var(--gray-500)]">
                            {[row.patient_age, row.patient_gender].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 truncate">
                          <Stethoscope size={9} className="shrink-0 text-[var(--gray-400)]" />
                          <span className="truncate text-[var(--gray-600)] dark:text-[var(--gray-400)]">
                            {row.requesting_physician_name ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${sm.cls}`}>
                          {sm.label}
                        </span>
                        {row.clinical_status_display && (
                          <p className="mt-0.5 text-[9px] text-[var(--gray-500)]">{row.clinical_status_display}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[10px] text-[var(--gray-500)]">{fmt(row.created_at)}</td>
                      <td className="px-3 py-2.5">
                        <Link href={`/clinical/lab-requests/${row.id}`}
                          className="inline-flex h-6 items-center gap-1 rounded-md border border-[var(--border)] bg-card px-2 text-[10px] font-medium transition hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-900/20 dark:hover:text-sky-300">
                          Ver <ChevronRight size={9} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* ── pagination ── */}
        {totalPages > 1 && (
          <div className={`${GLASS} flex items-center justify-between px-4 py-2.5`}>
            <span className="text-[10px] text-[var(--gray-500)]">
              Página {page} de {totalPages} · {count} total
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] bg-card text-[var(--gray-500)] transition hover:bg-muted disabled:opacity-40">
                <ChevronLeft size={11} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] bg-card text-[var(--gray-500)] transition hover:bg-muted disabled:opacity-40">
                <ChevronRight size={11} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
