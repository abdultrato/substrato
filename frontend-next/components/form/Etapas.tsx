"use client"

type Etapa = {
    titulo: string
    descricao?: string
}

type Props = {
    etapas: Etapa[]
    etapaAtual: number
    onChange: ( next: number ) => void
}

export default function Etapas( { etapas, etapaAtual, onChange }: Props ) {
    return (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-foreground">
                    Etapa {etapaAtual + 1} de {etapas.length}
                </div>
                <div className="hidden text-xs text-muted-foreground md:block">
                    {etapas[etapaAtual]?.descricao || etapas[etapaAtual]?.titulo}
                </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
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
                                "inline-flex items-center justify-center rounded-xl border px-3 py-2 text-left text-xs font-semibold transition",
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

