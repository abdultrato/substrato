"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { FileText } from "lucide-react"

import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"

type PeriodKey = "daily" | "weekly" | "monthly" | "quarterly" | "annual"
type ModeKey = "general" | "activity" | "complete"
type DropdownDirection = "up" | "down"

const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string }> = [
    { value: "daily", label: "Diário (1 dia)" },
    { value: "weekly", label: "Semanal (7 dias)" },
    { value: "monthly", label: "Mensal (30 dias)" },
    { value: "quarterly", label: "Trimestral (90 dias)" },
    { value: "annual", label: "Anual (365 dias)" },
]

const MODE_OPTIONS: Array<{ value: ModeKey; label: string }> = [
    { value: "complete", label: "Completo (geral + actividade + detalhes)" },
    { value: "general", label: "Geral da página" },
    { value: "activity", label: "Por actividade" },
]

function downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
}

export default function PageActivityReportMenu() {
    return <PageActivityReportMenuWithDirection direction="down" />
}

type Props = {
    direction?: DropdownDirection
}

export function PageActivityReportMenuWithDirection({ direction = "down" }: Props) {
    const pathname = usePathname() || "/"
    const [open, setOpen] = useState(false)
    const [period, setPeriod] = useState<PeriodKey>("daily")
    const [mode, setMode] = useState<ModeKey>("complete")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (!containerRef.current) return
            if (containerRef.current.contains(event.target as Node)) return
            setOpen(false)
        }
        if (open) document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [open])

    async function handleGeneratePdf() {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            params.set("period", period)
            params.set("mode", mode)
            params.set("page_path", pathname || "/")
            params.set("limit", mode === "complete" ? "300" : "500")

            const blob = await apiFetch<Blob>(`/audit/atividade/relatorio/pdf/?${params.toString()}`, {
                responseType: "blob",
                timeoutMs: 120000,
                clientCache: false,
            })

            const pageSlug = (pathname || "pagina").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "pagina"
            downloadBlob(blob, `relatorio_atividades_${period}_${pageSlug}.pdf`)
            setOpen(false)
        } catch (e: any) {
            setError(isNotFoundLikeError(e) ? "Endpoint de relatório não encontrado." : (e?.message || "Falha ao gerar relatório."))
        } finally {
            setLoading(false)
        }
    }

    const isUp = direction === "up"

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/25 bg-white/15 px-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                title="Gerar relatório de actividade da página"
            >
                <FileText size={14} />
                <span className="hidden sm:inline">Relatório</span>
            </button>

            {open ? (
                <div
                    className={[
                        "absolute right-0 z-50 w-80 rounded-2xl border border-white/20 bg-black/70 p-3 text-white shadow-lg backdrop-blur",
                        isUp ? "bottom-10 mb-1.5" : "mt-1.5",
                    ].join(" ")}
                >
                    <div className="text-sm font-semibold text-white">Relatório de actividade</div>
                    <div className="mt-1 text-xs text-white/70">Página: {pathname}</div>

                    <div className="mt-3 space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase text-white/80">Período</label>
                            <select
                                className="h-9 w-full rounded-lg border border-white/20 bg-white/10 px-2 text-sm text-white outline-none focus:border-white/40"
                                value={period}
                                onChange={(e) => setPeriod(e.target.value as PeriodKey)}
                                disabled={loading}
                            >
                                {PERIOD_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase text-white/80">Tipo de relatório</label>
                            <select
                                className="h-9 w-full rounded-lg border border-white/20 bg-white/10 px-2 text-sm text-white outline-none focus:border-white/40"
                                value={mode}
                                onChange={(e) => setMode(e.target.value as ModeKey)}
                                disabled={loading}
                            >
                                {MODE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error ? (
                        <div className="mt-3 rounded-lg border border-rose-300/40 bg-rose-500/15 px-2 py-1.5 text-xs text-rose-100">
                            {error}
                        </div>
                    ) : null}

                    <div className="mt-3 flex justify-end">
                        <button
                            type="button"
                            onClick={handleGeneratePdf}
                            disabled={loading}
                            className="inline-flex items-center rounded-lg border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25 disabled:opacity-60"
                        >
                            {loading ? "Gerando..." : "Gerar PDF"}
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
