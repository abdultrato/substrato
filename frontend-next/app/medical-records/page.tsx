"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, ClipboardList, ScrollText, Pill, PlusCircle } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

const recordMetricCards = [
    { label: "Cardex (registros)", accentClass: "from-sky-500 via-cyan-500 to-teal-400" },
    { label: "Itens de prescrição", accentClass: "from-emerald-500 via-lime-500 to-amber-400" },
    { label: "Consultas", accentClass: "from-violet-500 via-fuchsia-500 to-pink-400", hint: "Vínculo via many-to-many" },
    { label: "História clínica", accentClass: "from-indigo-500 via-blue-500 to-cyan-400", hint: "Visão agregada por paciente" },
] as const

const recordActionTiles = [
    {
        title: "Cardex",
        description: "Listar e gerir registros (CRUD).",
        href: "/medical-records/cardex",
        icon: ScrollText,
        accentClass: "from-sky-500 via-cyan-500 to-teal-400",
    },
    {
        title: "Criar Cardex",
        description: "Criar registro de cardex para um paciente.",
        href: "/medical-records/records/new",
        icon: PlusCircle,
        accentClass: "from-emerald-500 via-lime-500 to-amber-400",
    },
    {
        title: "Itens de prescrição",
        description: "Gerir prescrição estruturada (CRUD).",
        href: "/medical-records/prescriptions",
        icon: Pill,
        accentClass: "from-violet-500 via-fuchsia-500 to-pink-400",
    },
    {
        title: "Gerenciamento (API)",
        description: "Acesso direto à interface genérica do prontuário.",
        href: "/medical-records/records",
        icon: ClipboardList,
        accentClass: "from-indigo-500 via-blue-500 to-cyan-400",
        fullWidth: true,
    },
] as const

export default function ProntuarioPage() {
    const { user } = useAuth()
    const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
    const safeRefreshToken = useSafeDataRefreshSignal()

    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState<string | null>(null)
    const [cardex, setCardex] = useState<number>(0)
    const [itensPrescricao, setItensPrescricao] = useState<number>(0)

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setLoading(true)
                setErro(null)

                const [registros, itens] = await Promise.all([
                    apiFetch<any>("/medical-records/registro/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/medical-records/prescricaoitem/", { clientCache: safeRefreshToken === 0 }),
                ])

                if (!mounted) return
                setCardex(extractTotalCount(registros))
                setItensPrescricao(extractTotalCount(itens))
            } catch (e: any) {
                if (!mounted) return
                setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar prontuário."))
            } finally {
                if (mounted) setLoading(false)
            }
        }
        load()
        return () => {
            mounted = false
        }
    }, [safeRefreshToken])

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]}>
            <div className="space-y-6">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/75 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/45">
                    <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-sky-500 via-cyan-500 to-teal-400" />
                    <div className="flex flex-wrap items-start justify-between gap-3 pl-2">
                        <div className="min-w-0 space-y-1">
                            <h1 className="text-lg font-bold text-foreground">Prontuário</h1>
                            <p className="text-sm text-muted-foreground">Cardex e prescrição estruturada.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/medicine"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-900"
                            >
                                <ArrowLeft size={15} />
                                Voltar
                            </Link>
                            {podeVerAdmin ? (
                            <Link
                                href="/admin/medical-records/medicalrecordentry/"
                                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-900"
                            >
                                Abrir na Administração
                            </Link>
                            ) : null}
                        </div>
                    </div>
                </div>

                {erro ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {erro}
                    </div>
                ) : null}

                <div className="flex flex-wrap gap-4">
                    {recordMetricCards.map((card) => (
                        <div
                            key={card.label}
                            className="group relative min-w-[220px] flex-1 basis-[220px] overflow-hidden rounded-xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-950/45 dark:hover:border-slate-700"
                        >
                            <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${card.accentClass}`} />
                            <div className="pl-2">
                                <MetricCard
                                    label={card.label}
                                    value={
                                        card.label === "Cardex (registros)"
                                            ? loading ? "..." : cardex
                                            : card.label === "Itens de prescrição"
                                                ? loading ? "..." : itensPrescricao
                                                : "—"
                                    }
                                    hint={card.hint}
                                />
                            </div>
                        </div>
                    ))}
                    {recordActionTiles.map((tile) => (
                        <div
                            key={tile.href}
                            className={`group relative overflow-hidden rounded-xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-950/45 dark:hover:border-slate-700 ${tile.fullWidth ? "basis-full w-full" : "min-w-[220px] flex-1 basis-[220px]"}`}
                        >
                            <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${tile.accentClass}`} />
                            <div className="pl-2">
                                <ActionTile
                                    title={tile.title}
                                    description={tile.description}
                                    href={tile.href}
                                    icon={tile.icon}
                                />
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </AppLayout>
    )
}
