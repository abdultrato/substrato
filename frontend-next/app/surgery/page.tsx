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
    const [schedules, setSchedules] = useState<number>(0)
    const [operatingRooms, setOperatingRooms] = useState<number>(0)
    const [operativeReports, setOperativeReports] = useState<number>(0)

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setLoading(true)
                setErrorMessage(null)

                const [small, large, procs, agenda, rooms, reports] = await Promise.all([
                    apiFetch<any>("/surgery/small_surgery/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/large_surgery/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/surgical_procedure/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/agenda_cirurgica/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/centro_cirurgico/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/relatorio_operatorio/", { clientCache: safeRefreshToken === 0 }),
                ])

                if (!mounted) return
                setSmallSurgeries(extractTotalCount(small))
                setLargeSurgeries(extractTotalCount(large))
                setProcedures(extractTotalCount(procs))
                setSchedules(extractTotalCount(agenda))
                setOperatingRooms(extractTotalCount(rooms))
                setOperativeReports(extractTotalCount(reports))
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

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <MetricCard label="Pequenas cirurgias" value={loading ? "..." : smallSurgeries} />
                    <MetricCard label="Grandes cirurgias" value={loading ? "..." : largeSurgeries} />
                    <MetricCard label="Procedimentos (catálogo)" value={loading ? "..." : procedures} />
                    <MetricCard label="Agenda cirúrgica" value={loading ? "..." : schedules} />
                    <MetricCard label="Salas operatórias" value={loading ? "..." : operatingRooms} />
                    <MetricCard label="Relatórios operatórios" value={loading ? "..." : operativeReports} />
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
                        href="/surgery/surgical-procedures"
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
                        href="/surgery/schedules"
                        icon={ClipboardList}
                    />
                    <ActionTile
                        title="Centro cirúrgico"
                        description="Salas, esterilização, disponibilidade e equipamentos."
                        href="/surgery/operating-rooms"
                        icon={Scissors}
                    />
                    <ActionTile
                        title="Equipa cirúrgica"
                        description="Cirurgião, anestesista, instrumentista, circulante e assistentes."
                        href="/surgery/teams"
                        icon={Users}
                    />
                    <ActionTile
                        title="Anestesia"
                        description="Tipo, ASA, fármacos, fluidos, via aérea e complicações."
                        href="/surgery/anesthesia"
                        icon={HeartPulse}
                    />
                    <ActionTile
                        title="Checklist de segurança"
                        description="Sign-in, time-out, sign-out e confirmação de segurança."
                        href="/surgery/safety-checklists"
                        icon={ClipboardCheck}
                    />
                    <ActionTile
                        title="Materiais"
                        description="Catálogo de materiais cirúrgicos, implantes e consumíveis."
                        href="/surgery/materials"
                        icon={PackageSearch}
                    />
                    <ActionTile
                        title="Consumos"
                        description="Materiais e produtos consumidos por cirurgia."
                        href="/surgery/consumptions"
                        icon={PackageCheck}
                    />
                    <ActionTile
                        title="Recuperação"
                        description="Sala de recuperação, dor, Aldrete, sinais vitais e alta."
                        href="/surgery/recovery"
                        icon={HeartPulse}
                    />
                    <ActionTile
                        title="Relatório operatório"
                        description="Achados, técnica, complicações e amostras para patologia."
                        href="/surgery/operative-reports"
                        icon={FileText}
                    />
                </div>

                <Card
                    title="Nota"
                    subtitle="Fluxo operatório expandido com sala, equipa, anestesia, checklist, consumos, recuperação e relatório."
                >
                    <div className="text-sm text-slate-700">
                        A modelagem separa pequenas e grandes cirurgias e inclui os documentos operatórios necessários
                        para rastrear o paciente desde a agenda até ao relatório final.
                    </div>
                </Card>
            </div>
        </AppLayout>
    )
}
