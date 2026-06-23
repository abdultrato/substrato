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
            <div className="space-y-3">
                <PageHeader
                    title="Cirurgia"
                    subtitle="Orquestração do pedido cirúrgico, avaliação, sala, equipa, consumos, recuperação e faturação."
                    actions={
                        canViewAdmin ? (
                            <Link
                                href="/admin/surgery/surgery/"
                                className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground-2 transition hover:bg-muted hover:text-foreground"
                            >
                                Admin
                            </Link>
                        ) : null
                    }
                />

                {errorMessage ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
                        {errorMessage}
                    </div>
                ) : null}

                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                    <MetricCard label="Pedidos cirúrgicos" value={loading ? "..." : requests} accentClass="border-l-red-500" />
                    <MetricCard label="Avaliações pré-op." value={loading ? "..." : preoperativeAssessments} accentClass="border-l-amber-500" />
                    <MetricCard label="Pequenas cirurgias" value={loading ? "..." : smallSurgeries} accentClass="border-l-blue-500" />
                    <MetricCard label="Grandes cirurgias" value={loading ? "..." : largeSurgeries} accentClass="border-l-violet-500" />
                    <MetricCard label="Procedimentos (catálogo)" value={loading ? "..." : procedures} accentClass="border-l-slate-500" />
                    <MetricCard label="Agenda cirúrgica" value={loading ? "..." : schedules} accentClass="border-l-cyan-500" />
                    <MetricCard label="Salas operatórias" value={loading ? "..." : operatingRooms} accentClass="border-l-emerald-500" />
                    <MetricCard label="Autorizações" value={loading ? "..." : authorizations} accentClass="border-l-orange-500" />
                    <MetricCard label="Itens faturáveis" value={loading ? "..." : billingItems} accentClass="border-l-teal-500" />
                    <MetricCard label="Amostras cirúrgicas" value={loading ? "..." : specimens} accentClass="border-l-pink-500" />
                    <MetricCard label="Relatórios operatórios" value={loading ? "..." : operativeReports} accentClass="border-l-indigo-500" />
                </div>

                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
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
                        description="Amostras coletadas durante cirurgia e ligação ao pedido de patologia."
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

                <section className="rounded-xl border border-white/20 bg-white/25 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
                    <p className="mb-1 text-xs font-semibold text-foreground">Fluxo cirúrgico</p>
                    <p className="text-[10px] text-muted-foreground">Indicação → avaliação → autorização → agenda → sala → equipa → materiais → checklist → anestesia → cirurgia → recuperação → relatório → faturação.</p>
                </section>
            </div>
        </AppLayout>
    )
}
