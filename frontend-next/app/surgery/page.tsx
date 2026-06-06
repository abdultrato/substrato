"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useState } from "react"
import {
    Activity,
    ClipboardCheck,
    ClipboardList,
    CreditCard,
    FileText,
    HeartPulse,
    Microscope,
    PackageCheck,
    PackageSearch,
    Scissors,
    Settings,
    ShieldCheck,
    Stethoscope,
    Users,
} from "lucide-react"

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
    const [requests, setRequests] = useState<number>(0)
    const [preoperativeAssessments, setPreoperativeAssessments] = useState<number>(0)
    const [smallSurgeries, setSmallSurgeries] = useState<number>(0)
    const [largeSurgeries, setLargeSurgeries] = useState<number>(0)
    const [procedures, setProcedures] = useState<number>(0)
    const [schedules, setSchedules] = useState<number>(0)
    const [operatingRooms, setOperatingRooms] = useState<number>(0)
    const [authorizations, setAuthorizations] = useState<number>(0)
    const [billingItems, setBillingItems] = useState<number>(0)
    const [specimens, setSpecimens] = useState<number>(0)
    const [operativeReports, setOperativeReports] = useState<number>(0)

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setLoading(true)
                setErrorMessage(null)

                const [reqs, assessments, small, large, procs, agenda, rooms, auths, billing, samples, reports] = await Promise.all([
                    apiFetch<any>("/surgery/pedido_cirurgico/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/avaliacao_pre_operatoria/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/small_surgery/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/large_surgery/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/surgical_procedure/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/agenda_cirurgica/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/centro_cirurgico/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/autorizacoes/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/faturacao/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/amostras/", { clientCache: safeRefreshToken === 0 }),
                    apiFetch<any>("/surgery/relatorio_operatorio/", { clientCache: safeRefreshToken === 0 }),
                ])

                if (!mounted) return
                setRequests(extractTotalCount(reqs))
                setPreoperativeAssessments(extractTotalCount(assessments))
                setSmallSurgeries(extractTotalCount(small))
                setLargeSurgeries(extractTotalCount(large))
                setProcedures(extractTotalCount(procs))
                setSchedules(extractTotalCount(agenda))
                setOperatingRooms(extractTotalCount(rooms))
                setAuthorizations(extractTotalCount(auths))
                setBillingItems(extractTotalCount(billing))
                setSpecimens(extractTotalCount(samples))
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
                    subtitle="Orquestração do pedido cirúrgico, avaliação, sala, equipa, consumos, recuperação e faturação."
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

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <MetricCard label="Pedidos cirúrgicos" value={loading ? "..." : requests} />
                    <MetricCard label="Avaliações pré-op." value={loading ? "..." : preoperativeAssessments} />
                    <MetricCard label="Pequenas cirurgias" value={loading ? "..." : smallSurgeries} />
                    <MetricCard label="Grandes cirurgias" value={loading ? "..." : largeSurgeries} />
                    <MetricCard label="Procedimentos (catálogo)" value={loading ? "..." : procedures} />
                    <MetricCard label="Agenda cirúrgica" value={loading ? "..." : schedules} />
                    <MetricCard label="Salas operatórias" value={loading ? "..." : operatingRooms} />
                    <MetricCard label="Autorizações" value={loading ? "..." : authorizations} />
                    <MetricCard label="Itens faturáveis" value={loading ? "..." : billingItems} />
                    <MetricCard label="Amostras cirúrgicas" value={loading ? "..." : specimens} />
                    <MetricCard label="Relatórios operatórios" value={loading ? "..." : operativeReports} />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <ActionTile
                        title="Pedidos cirúrgicos"
                        description="Indicações cirúrgicas com diagnóstico, prioridade, especialidade e estado."
                        href="/surgery/requests"
                        icon={ClipboardList}
                    />
                    <ActionTile
                        title="Avaliação pré-operatória"
                        description="Aptidão clínica e anestésica, ASA, exames obrigatórios e consentimento."
                        href="/surgery/preoperative-assessments"
                        icon={Stethoscope}
                    />
                    <ActionTile
                        title="Autorizações cirúrgicas"
                        description="Orçamento, pagamento inicial, seguro, sala, equipa e consentimento."
                        href="/surgery/authorizations"
                        icon={ShieldCheck}
                    />
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
                        title="Procedimentos realizados"
                        description="Procedimentos efetivos dentro da cirurgia, lateralidade, ordem e cirurgião."
                        href="/surgery/procedure-items"
                        icon={ClipboardCheck}
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
                        title="Faturação cirúrgica"
                        description="Itens faturáveis por sala, equipa, procedimento, anestesia e consumos."
                        href="/surgery/billing"
                        icon={CreditCard}
                    />
                    <ActionTile
                        title="Amostras cirúrgicas"
                        description="Amostras colhidas durante cirurgia e ligação ao pedido de patologia."
                        href="/surgery/specimens"
                        icon={Microscope}
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
                    <ActionTile
                        title="Documentos cirúrgicos"
                        description="Consentimentos, orçamentos, autorizações, relatórios e anexos."
                        href="/surgery/documents"
                        icon={FileText}
                    />
                    <ActionTile
                        title="Auditoria cirúrgica"
                        description="Rastreabilidade de estados, sala, equipa, materiais, documentos e faturação."
                        href="/surgery/audit-events"
                        icon={Activity}
                    />
                </div>

                <Card
                    title="Fluxo cirúrgico"
                    subtitle="Indicação -> avaliação -> autorização -> agenda -> sala -> equipa -> materiais -> checklist -> anestesia -> cirurgia -> recuperação -> relatório -> faturação."
                >
                    <div className="text-sm text-slate-700">
                        O caso cirúrgico centraliza os vínculos clínicos, operacionais e financeiros, mantendo integração
                        opcional com patologia, farmácia/stock e faturação final.
                    </div>
                </Card>
            </div>
        </AppLayout>
    )
}
