"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ClipboardCheck, ClipboardList, FileText, HeartPulse, PackageCheck, PackageSearch, Scissors, Settings, Users } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

export default function SurgeryPage() {
    const { user } = useAuth()
    const canViewAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
    const safeRefreshToken = useSafeDataRefreshSignal()

    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [smallSurgeries, setSmallSurgeries] = useState<number>(0)
    const [largeSurgeries, setLargeSurgeries] = useState<number>(0)
    const [procedures, setProcedures] = useState<number>(0)

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setLoading(true)
                setErrorMessage(null)

                const [small, large, procs] = await Promise.all([
                    apiFetch<any>("/surgery/small_surgery/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/large_surgery/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/surgical_procedure/", { clientCache: safeRefreshToken === 0 }),
                ])

                if (!mounted) return
                setSmallSurgeries(extractTotalCount(small))
                setLargeSurgeries(extractTotalCount(large))
                setProcedures(extractTotalCount(procs))
            } catch (e: any) {
                if (!mounted) return
                setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar cirurgia."))
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
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]}>
            <div className="space-y-6">
                <PageHeader
                    title="Cirurgia"
                    subtitle="Agendamento e registo de cirurgias."
                    actions={
                        canViewAdmin ? (
                            <Link
                                href="/admin/surgery/surgery/"
                                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                            >
                                Abrir na Administração
                            </Link>
                        ) : null
                    }
                />

                {errorMessage ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {errorMessage}
                    </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Pequenas cirurgias" value={loading ? "..." : smallSurgeries} />
                    <MetricCard label="Grandes cirurgias" value={loading ? "..." : largeSurgeries} />
                    <MetricCard label="Procedimentos (catálogo)" value={loading ? "..." : procedures} />
                    <MetricCard
                        label="Total"
                        value={loading ? "..." : smallSurgeries + largeSurgeries}
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <ActionTile
                        title="Pequenas cirurgias"
                        description="Listar e gerir pequenas cirurgias (CRUD)."
                        href="/surgery/small-surgeries"
                        icon={Scissors}
                    />
                    <ActionTile
                        title="Grandes cirurgias"
                        description="Listar e gerir grandes cirurgias (CRUD)."
                        href="/surgery/large-surgeries"
                        icon={ClipboardList}
                    />
                    <ActionTile
                        title="Procedimentos cirúrgicos"
                        description="Gerir catálogo de procedimentos (CRUD)."
                        href="/surgery/procedures"
                        icon={Settings}
                    />
                    <ActionTile
                        title="Gerenciamento (API)"
                        description="Acesso direto à interface genérica do módulo."
                        href="/surgery/surgeries"
                        icon={ClipboardList}
                    />
                    <ActionTile
                        title="Agenda cirúrgica"
                        description="Marcação por sala, prioridade, estado e horário previsto."
                        href="/resources/surgery/agenda_cirurgica"
                        icon={ClipboardList}
                    />
                    <ActionTile
                        title="Centro cirúrgico"
                        description="Salas, esterilização, disponibilidade e equipamentos."
                        href="/resources/surgery/centro_cirurgico"
                        icon={Scissors}
                    />
                    <ActionTile
                        title="Equipa cirúrgica"
                        description="Cirurgião, anestesista, instrumentista, circulante e assistentes."
                        href="/resources/surgery/equipa_cirurgica"
                        icon={Users}
                    />
                    <ActionTile
                        title="Anestesia"
                        description="Tipo, ASA, fármacos, fluidos, via aérea e complicações."
                        href="/resources/surgery/anestesia"
                        icon={HeartPulse}
                    />
                    <ActionTile
                        title="Checklist de segurança"
                        description="Sign-in, time-out, sign-out e confirmação de segurança."
                        href="/resources/surgery/checklist_seguranca"
                        icon={ClipboardCheck}
                    />
                    <ActionTile
                        title="Materiais"
                        description="Catálogo de materiais cirúrgicos, implantes e consumíveis."
                        href="/resources/surgery/materiais"
                        icon={PackageSearch}
                    />
                    <ActionTile
                        title="Consumos"
                        description="Materiais e produtos consumidos por cirurgia."
                        href="/resources/surgery/consumos"
                        icon={PackageCheck}
                    />
                    <ActionTile
                        title="Recuperação"
                        description="Sala de recuperação, dor, Aldrete, sinais vitais e alta."
                        href="/resources/surgery/recuperacao"
                        icon={HeartPulse}
                    />
                    <ActionTile
                        title="Relatório operatório"
                        description="Achados, técnica, complicações e amostras para patologia."
                        href="/resources/surgery/relatorio_operatorio"
                        icon={FileText}
                    />
                </div>

                <Card
                    title="Nota"
                    subtitle="Este é um MVP focado em agendamento e rastreabilidade."
                >
                    <div className="text-sm text-slate-700">
                        A modelagem agora separa pequenas e grandes cirurgias, mantendo os mesmos campos em ambos.
                        Se precisar, adicionamos equipe, sala e checklist.
                    </div>
                </Card>
            </div>
        </AppLayout>
    )
}

