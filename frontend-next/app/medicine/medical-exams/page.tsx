"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useEffect, useMemo, useState } from "react"
import {
  Banknote,
  Building2,
  ClipboardList,
  Clock3,
  Loader2,
  Search,
  Stethoscope,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import MoneyValue from "@/components/ui/MoneyValue"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import useDebounce from "@/hooks/useDebounce"
import {
  medicalExamMethodOptions,
  medicalExamSectorOptions,
  medicalResultTypeOptions,
} from "@/lib/constants/medical-exam"
import { formatCount } from "@/lib/i18n/plural"
import { GROUPS } from "@/lib/rbac"

type ExameMedicoRow = Record<string, any>

const METHOD_LABEL = new Map(medicalExamMethodOptions.map((o) => [o.value, o.label]))
const SECTOR_LABEL = new Map(medicalExamSectorOptions.map((o) => [o.value, o.label]))
const RESULT_TYPE_LABEL = new Map(medicalResultTypeOptions.map((o) => [o.value, o.label]))

function methodLabel(code?: string | null): string {
  if (!code) return "Método não definido"
  return METHOD_LABEL.get(code) || code
}

function sectorLabel(code?: string | null): string | null {
  if (!code) return null
  return SECTOR_LABEL.get(code) || code
}

export default function ExamesMedicosPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [exames, setExames] = useState<ExameMedicoRow[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const debouncedSearch = useDebounce(search.trim().toLowerCase(), 200)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const { items } = await apiFetchList<ExameMedicoRow>("/clinical/medicalexam/", {
          page: 1,
          pageSize: 500,
          clientCache: safeRefreshToken === 0,
        })
        if (!mounted) return
        setExames(items)
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar exames médicos."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken])

  const filtrados = useMemo(() => {
    if (!debouncedSearch) return exames
    return exames.filter((e) => {
      const alvo = [
        e.nome || e.name,
        e.id_custom || e.custom_id,
        e.metodo || e.method,
        methodLabel(e.metodo || e.method),
        sectorLabel(e.setor || e.sector),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return alvo.includes(debouncedSearch)
    })
  }, [debouncedSearch, exames])

  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize))
  const paginaAtual = Math.min(page, totalPages)
  const visiveis = useMemo(
    () => filtrados.slice((paginaAtual - 1) * pageSize, paginaAtual * pageSize),
    [filtrados, paginaAtual, pageSize]
  )

  const stats = useMemo(() => {
    const metodos = new Set(exames.map((e) => e.metodo || e.method).filter(Boolean))
    const setores = new Set(exames.map((e) => e.setor || e.sector).filter(Boolean))
    const trls = exames.map((e) => Number(e.trl_horas ?? e.turnaround_hours)).filter((v) => v > 0)
    const trlMedio = trls.length ? Math.round(trls.reduce((a, b) => a + b, 0) / trls.length) : null
    return { metodos: metodos.size, setores: setores.size, trlMedio }
  }, [exames])

  const statPill =
    "inline-flex h-7 items-center gap-1.5 rounded-full border border-sky-200/40 bg-sky-100/20 px-2.5 text-[10px] font-semibold text-sky-800 backdrop-blur-xl dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300"

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA]}>
      <div className="space-y-3">
        {/* Cabeçalho fundido: banner + pesquisa + filtro num só bloco translúcido */}
        <section className="relative overflow-hidden rounded-xl border border-sky-200/25 bg-gradient-to-br from-sky-100/[0.05] via-white/[0.015] to-cyan-100/[0.03] shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-sky-800/20 dark:from-sky-950/[0.05] dark:via-white/[0.01] dark:to-cyan-950/[0.03]">
          <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-sky-400/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-500/25">
                <Stethoscope size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">Exames médicos</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? "A carregar…" : formatCount(exames.length, { one: "exame no catálogo", other: "exames no catálogo" })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className={statPill}>
                <ClipboardList size={11} /> {formatCount(stats.metodos, { one: "método", other: "métodos" })}
              </span>
              <span className={statPill}>
                <Building2 size={11} /> {formatCount(stats.setores, { one: "setor", other: "setores" })}
              </span>
              {stats.trlMedio ? (
                <span className={statPill}>
                  <Clock3 size={11} /> TRL médio {stats.trlMedio}h
                </span>
              ) : null}
            </div>

          </div>

          <div className="relative flex flex-wrap items-center gap-2 border-t border-white/15 px-4 py-2 dark:border-white/[0.06]">
            <div className="relative w-56">
              <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Pesquisar nome, método, setor…"
                className="w-full rounded-lg border border-white/25 bg-white/[0.05] py-1.5 pl-7 pr-6 text-xs text-foreground placeholder:text-muted-foreground backdrop-blur-xl transition-all focus:w-72 focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:border-white/10 dark:bg-white/[0.03]"
              />
            </div>
            <label className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/[0.05] px-2.5 text-[10px] font-medium text-muted-foreground backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
              Mostrar
              <select
                value={pageSize}
                onChange={(e) => {
                  setPage(1)
                  setPageSize(Number(e.target.value))
                }}
                className="rounded-md border border-white/20 bg-transparent px-1.5 py-0.5 text-[10px] text-foreground focus:outline-none dark:border-white/10"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
              por página
            </label>
            {debouncedSearch ? (
              <span className="text-[10px] text-muted-foreground">
                {formatCount(filtrados.length, { one: "resultado", other: "resultados" })}
              </span>
            ) : null}
          </div>
        </section>

        {erro ? (
          <div className="rounded-xl border border-amber-200/60 bg-amber-50/30 px-4 py-3 text-sm text-amber-800 backdrop-blur-xl dark:border-amber-800/40 dark:bg-amber-950/15 dark:text-amber-300">
            {erro}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> A carregar exames…
          </div>
        ) : visiveis.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/30 bg-white/[0.03] py-16 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.015]">
            <Stethoscope size={26} className="text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">Nenhum exame médico encontrado</p>
            <p className="text-xs text-muted-foreground">
              {debouncedSearch ? "Altere o termo de pesquisa." : "Cadastre exames na Administração."}
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visiveis.map((exame) => {
              const tipos: string[] = exame.tipos_resultado_permitidos || exame.allowed_result_types || []
              const setor = sectorLabel(exame.setor || exame.sector)
              const trl = Number(exame.trl_horas ?? exame.turnaround_hours) || null
              const preco = exame.preco ?? exame.price
              const aplicaIva = exame.aplica_iva ?? exame.applies_vat_by_default
              return (
                <article
                  key={exame.id}
                  className="group relative min-h-[150px] overflow-hidden rounded-xl border border-sky-200/30 bg-gradient-to-br from-sky-100/[0.06] via-white/[0.02] to-cyan-100/[0.035] shadow-md shadow-slate-900/5 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-sky-300/60 hover:shadow-lg dark:border-sky-800/20 dark:from-sky-950/[0.05] dark:via-white/[0.015] dark:to-cyan-950/[0.03]"
                >
                  <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-500" />
                  <div className="flex h-full flex-col gap-2 p-3.5 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {exame.id_custom || exame.custom_id || `EXM-${exame.id}`}
                        </p>
                        <h2 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                          {exame.nome || exame.name || `Exame ${exame.id}`}
                        </h2>
                      </div>
                      <span className="shrink-0 rounded-full border border-sky-300/50 bg-sky-100/40 px-2 py-0.5 text-[9px] font-semibold text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-300">
                        {exame.metodo || exame.method || "—"}
                      </span>
                    </div>

                    <div className="grid gap-1 text-[10px] text-muted-foreground">
                      <p className="flex min-w-0 items-center gap-1">
                        <ClipboardList size={10} className="shrink-0" />
                        <span className="truncate">{methodLabel(exame.metodo || exame.method)}</span>
                      </p>
                      <p className="flex min-w-0 items-center gap-1">
                        <Building2 size={10} className="shrink-0" />
                        <span className="truncate">{setor || "Setor não definido"}</span>
                      </p>
                      <p className="flex min-w-0 items-center gap-1">
                        <Banknote size={10} className="shrink-0" />
                        <span className="truncate">
                          <MoneyValue value={preco} /> MZN{aplicaIva ? ` · IVA ${exame.percentagem_iva ?? exame.vat_percentage ?? 0}%` : " · Isento de IVA"}
                        </span>
                      </p>
                    </div>

                    {tipos.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tipos.map((t) => (
                          <span
                            key={t}
                            title={RESULT_TYPE_LABEL.get(t) || t}
                            className="rounded-full border border-white/25 bg-white/[0.06] px-1.5 py-0.5 text-[8px] font-semibold text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-auto flex items-center justify-between border-t border-white/20 pt-2 text-[10px] text-muted-foreground dark:border-white/[0.06]">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={10} /> {trl ? `Resultado em até ${trl}h` : "Prazo não definido"}
                      </span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-muted-foreground">
              Página {paginaAtual} de {totalPages} · {formatCount(filtrados.length, { one: "exame", other: "exames" })}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPage((c) => Math.max(1, c - 1))}
                disabled={paginaAtual === 1}
                className="h-7 rounded-lg border border-white/30 bg-white/[0.05] px-3 text-xs text-foreground backdrop-blur-xl transition hover:bg-white/10 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.03]"
              >
                ← Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
                disabled={paginaAtual === totalPages}
                className="h-7 rounded-lg border border-white/30 bg-white/[0.05] px-3 text-xs text-foreground backdrop-blur-xl transition hover:bg-white/10 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.03]"
              >
                Seguinte →
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
