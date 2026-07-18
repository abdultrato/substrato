"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Scissors, Search } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

interface Procedure {
  id: number
  custom_id: string
  name: string
  description: string
  base_price: string
  vat_percentage: string
  applies_vat_by_default: boolean
  active: boolean
}

function fmtMT(v: string) {
  const n = parseFloat(v || "0")
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MT"
}

export default function SurgicalProceduresPage() {
  const [items, setItems] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [filtered, setFiltered] = useState<Procedure[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch<any>("/surgery/surgical_procedure/?limit=200&ordering=name")
      setItems(res.results ?? res ?? [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const lower = q.toLowerCase()
    setFiltered(
      q ? items.filter(p => p.name.toLowerCase().includes(lower) || p.description?.toLowerCase().includes(lower)) : items
    )
  }, [q, items])

  const active = items.filter(p => p.active).length
  const totalValue = items.reduce((s, p) => s + parseFloat(p.base_price || "0"), 0)

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-[99vw] space-y-1 px-1">

        {/* header */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-400" />
          <div className="flex flex-wrap items-center justify-between gap-1 px-2 py-1.5 pl-4">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">Procedimentos cirúrgicos</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1">
                <Scissors size={14} className="text-violet-500" />
                <h1 className="font-display text-base font-semibold text-foreground">Catálogo de procedimentos</h1>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* search */}
              <div className="flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2">
                <Search size={11} className="text-[var(--gray-400)]" />
                <input
                  value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Pesquisar..."
                  className="w-36 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:w-48 transition-all"
                />
              </div>
              <Link href="/surgery/surgical-procedures/new"
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                <Plus size={12} /> Novo procedimento
              </Link>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-3 divide-x divide-white/30 border-t border-white/20 dark:divide-white/10 dark:border-white/10">
            {[
              { label: "Total no catálogo", value: items.length, color: "text-violet-600 dark:text-violet-400" },
              { label: "Activos", value: active, color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Preço médio", value: items.length ? fmtMT(String(totalValue / items.length)) : "—", color: "text-teal-600 dark:text-teal-400" },
            ].map(k => (
              <div key={k.label} className="flex flex-col items-center py-1">
                <span className={`text-[13px] font-semibold ${k.color}`}>{k.value}</span>
                <span className="text-[9px] font-medium uppercase tracking-wide text-[var(--gray-500)]">{k.label}</span>
              </div>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="flex h-32 items-center justify-center text-sm text-[var(--gray-500)]">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className={`flex flex-col items-center gap-1 py-5 ${GLASS}`}>
            <Scissors size={28} className="text-[var(--gray-300)]" />
            <p className="text-sm text-[var(--gray-400)]">{q ? "Nenhum resultado para a pesquisa." : "Nenhum procedimento no catálogo."}</p>
            {!q && (
              <Link href="/surgery/surgical-procedures/new"
                className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100">
                <Plus size={12} /> Adicionar primeiro procedimento
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map(p => {
              const base = parseFloat(p.base_price || "0")
              const vat = parseFloat(p.vat_percentage || "0")
              const total = p.applies_vat_by_default ? base * (1 + vat / 100) : base

              return (
                <Link key={p.id} href={`/surgery/surgical-procedures/${p.id}`}
                  className={`relative overflow-hidden rounded-lg border border-white/30 bg-white/30 px-1.5 py-1 shadow-sm backdrop-blur-sm transition hover:border-violet-200/60 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]`}>
                  {/* active bar */}
                  <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${p.active ? "bg-emerald-400" : "bg-slate-300 dark:bg-slate-600"}`} />

                  <div className="pl-2">
                    {/* name + badge */}
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="line-clamp-2 flex-1 text-[11px] font-semibold leading-tight text-foreground">{p.name}</h3>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                        p.active
                          ? "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                          : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700/30 dark:bg-slate-800/20 dark:text-slate-400"
                      }`}>
                        {p.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    {/* description */}
                    {p.description && (
                      <p className="mt-0.5 line-clamp-1 text-[9px] leading-tight text-[var(--gray-500)]">{p.description}</p>
                    )}

                    {/* price row */}
                    <div className="mt-1 grid grid-cols-2 gap-1 border-t border-white/20 pt-1 dark:border-white/10">
                      <div className="min-w-0">
                        <span className="text-[9px] font-medium uppercase tracking-wide text-[var(--gray-400)]">Preço base</span>
                        <span className="block truncate text-[10px] font-semibold text-foreground">{fmtMT(p.base_price)}</span>
                      </div>
                      {p.applies_vat_by_default && vat > 0 && (
                        <div className="min-w-0 text-right">
                          <span className="text-[9px] font-medium uppercase tracking-wide text-[var(--gray-400)]">c/ IVA {vat}%</span>
                          <span className="block truncate text-[10px] font-bold text-teal-600 dark:text-teal-400">{fmtMT(String(total))}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
