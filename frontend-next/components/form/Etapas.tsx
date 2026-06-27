"use client"

import { Check } from "lucide-react"

type Etapa = {
    titulo: string
    descricao?: string
}

type Props = {
    etapas: Etapa[]
    etapaAtual: number
    onChange: ( next: number ) => void
    variant?: "default" | "modern"
}

export default function Etapas( { etapas, etapaAtual, onChange, variant = "default" }: Props ) {
    if (variant === "modern") {
        return (
            <div className="overflow-hidden rounded-xl border border-white/25 bg-white/20 p-2 shadow-lg shadow-slate-900/5 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]">
                <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">
                            Progresso do registo
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Etapa {etapaAtual + 1} de {etapas.length} · {etapas[etapaAtual]?.descricao || etapas[etapaAtual]?.titulo}
                        </p>
                    </div>
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                        {Math.round(((etapaAtual + 1) / etapas.length) * 100)}%
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                    {etapas.map((etapa, idx) => {
                        const ativa = idx === etapaAtual
                        const concluida = idx < etapaAtual
                        const podeClique = idx <= etapaAtual
                        return (
                            <button
                                key={etapa.titulo}
                                type="button"
                                onClick={() => podeClique && onChange(idx)}
                                disabled={!podeClique}
                                aria-current={ativa ? "step" : undefined}
                                className={[
                                    "group flex min-h-10 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition",
                                    ativa
                                        ? "border-violet-400 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                                        : concluida
                                            ? "border-emerald-200/70 bg-emerald-50/45 text-emerald-800 hover:bg-emerald-50/70 dark:border-emerald-700/30 dark:bg-emerald-900/15 dark:text-emerald-300"
                                            : "border-white/30 bg-white/20 text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]",
                                    podeClique ? "cursor-pointer" : "cursor-not-allowed opacity-65",
                                ].join(" ")}
                            >
                                <span className={[
                                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                                    ativa
                                        ? "bg-white/20 text-white"
                                        : concluida
                                            ? "bg-emerald-500 text-white"
                                            : "bg-muted text-muted-foreground",
                                ].join(" ")}>
                                    {concluida ? <Check size={12} strokeWidth={3} /> : idx + 1}
                                </span>
                                <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{etapa.titulo}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="text-sm font-semibold text-foreground">
                    Etapa {etapaAtual + 1} de {etapas.length}
                </div>
                <div className="hidden text-xs text-muted-foreground md:block">
                    {etapas[etapaAtual]?.descricao || etapas[etapaAtual]?.titulo}
                </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
                {etapas.map( ( e, idx ) => {
                    const ativa = idx === etapaAtual
                    const concluida = idx < etapaAtual
                    const podeClique = idx <= etapaAtual
                    return (
                        <button
                            key={e.titulo}
                            type="button"
                            onClick={() => podeClique && onChange( idx )}
                            className={[
                                "inline-flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-left text-xs font-semibold transition",
                                ativa
                                    ? "border-primary bg-primary/10 text-primary"
                                    : concluida
                                        ? "border-border bg-muted text-foreground hover:bg-muted/70"
                                        : "border-border bg-card text-muted-foreground",
                                podeClique ? "cursor-pointer" : "cursor-not-allowed opacity-70",
                            ].join( " " )}
                            aria-current={ativa ? "step" : undefined}
                        >
                            <span className="line-clamp-2">{e.titulo}</span>
                        </button>
                    )
                } )}
            </div>
        </div>
    )
}

