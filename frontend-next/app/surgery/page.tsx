"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useState } from "react"
import {
    Activity,
    ArrowRight,
    CalendarDays,
    ClipboardCheck,
    ClipboardList,
    CreditCard,
    FileText,
    HeartPulse,
    Layers,
    Microscope,
    PackageCheck,
    PackageSearch,
    Plus,
    Scissors,
    Settings,
    ShieldCheck,
    Stethoscope,
    Users,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

const TODAY = new Date().toISOString().slice(0, 10)

function todayLabel() {
    return new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())
}

function KpiPill({
    value,
    label,
    loading,
    accent,
    href,
}: {
    value: number
    label: string
    loading: boolean
    accent: string
    href?: string
}) {
    const inner = (
        <div className={`flex items-center gap-2 rounded-lg border bg-white/40 px-3 py-1.5 shadow-sm backdrop-blur-sm transition dark:bg-white/[0.05] ${accent} ${href ? "hover:bg-white/60 dark:hover:bg-white/[0.09] cursor-pointer" : ""}`}>
            <span className="font-display text-lg font-bold tabular-nums text-foreground leading-none">
                {loading ? <span className="inline-block h-4 w-6 animate-pulse rounded bg-current opacity-20" /> : value}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-tight max-w-[72px]">{label}</span>
        </div>
    )
    if (href) return <Link href={href}>{inner}</Link>
    return inner
}

export default function SurgeryPage() {
    const { user } = useAuth()
    const canViewAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
    const safeRefreshToken = useSafeDataRefreshSignal()

    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [requests, setRequests] = useState(0)
    const [preoperativeAssessments, setPreoperativeAssessments] = useState(0)
    const [smallSurgeries, setSmallSurgeries] = useState(0)
    const [largeSurgeries, setLargeSurgeries] = useState(0)
    const [procedures, setProcedures] = useState(0)
    const [schedules, setSchedules] = useState(0)
    const [operatingRooms, setOperatingRooms] = useState(0)
    const [authorizations, setAuthorizations] = useState(0)
    const [billingItems, setBillingItems] = useState(0)
    const [specimens, setSpecimens] = useState(0)
    const [operativeReports, setOperativeReports] = useState(0)

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
        return () => { mounted = false }
    }, [safeRefreshToken])

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]}>
            <div className="space-y-3">

                {/* ── HERO HEADER ─────────────────────────────────────────── */}
                <header className="relative overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-br from-slate-50/80 via-white/60 to-slate-100/50 shadow-sm backdrop-blur-md dark:border-white/10 dark:from-slate-900/60 dark:via-slate-800/40 dark:to-slate-900/60">
                    {/* decorative scalpel silhouette */}
                    <span className="pointer-events-none absolute -right-6 -top-6 select-none text-[120px] leading-none opacity-[0.04] dark:opacity-[0.06]" aria-hidden>
                        ✂
                    </span>

                    <div className="relative px-5 pt-4 pb-0">
                        {/* breadcrumb */}
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Layers size={9} className="shrink-0" />
                            <span>Módulos clínicos</span>
                            <span>/</span>
                            <span className="font-semibold text-foreground">Cirurgia</span>
                        </div>

                        {/* title row */}
                        <div className="mt-1.5 flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/10 dark:bg-white/10">
                                        <Scissors size={18} className="text-slate-700 dark:text-slate-200" strokeWidth={1.8} />
                                    </span>
                                    <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                                        Cirurgia
                                    </h1>
                                </div>
                                <p className="mt-1 text-[11px] text-muted-foreground max-w-xl">
                                    Pedido → avaliação → autorização → agenda → sala → equipa → checklist → anestesia → recuperação → relatório → faturação
                                </p>
                            </div>

                            {/* right: date + actions */}
                            <div className="flex shrink-0 flex-col items-end gap-2">
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <CalendarDays size={12} className="shrink-0" />
                                    <span className="capitalize">{todayLabel()}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {canViewAdmin && (
                                        <Link href="/admin/surgery/surgery/"
                                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card/70 px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground">
                                            Admin
                                        </Link>
                                    )}
                                    <Link href="/surgery/schedules"
                                        className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-card/70 px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground">
                                        <CalendarDays size={11} /> Agenda
                                    </Link>
                                    <Link href="/surgery/large-surgeries/new"
                                        className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-slate-800 px-3 text-[11px] font-semibold text-white transition hover:bg-slate-700 dark:bg-white/15 dark:hover:bg-white/20">
                                        <Plus size={11} /> Nova cirurgia
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* KPI strip */}
                    <div className="mt-3 border-t border-white/30 dark:border-white/10 px-5 py-3 flex flex-wrap items-center gap-2">
                        <KpiPill value={requests} label="Pedidos" loading={loading} accent="border-red-200 dark:border-red-900/40" href="/surgery/requests" />
                        <KpiPill value={preoperativeAssessments} label="Avaliações pré-op" loading={loading} accent="border-amber-200 dark:border-amber-900/40" href="/surgery/preoperative-assessments" />
                        <KpiPill value={authorizations} label="Autorizações" loading={loading} accent="border-orange-200 dark:border-orange-900/40" href="/surgery/authorizations" />
                        <KpiPill value={smallSurgeries} label="Peq. cirurgias" loading={loading} accent="border-blue-200 dark:border-blue-900/40" href="/surgery/small-surgeries" />
                        <KpiPill value={largeSurgeries} label="Grd. cirurgias" loading={loading} accent="border-violet-200 dark:border-violet-900/40" href="/surgery/large-surgeries" />
                        <KpiPill value={schedules} label="Agendamentos" loading={loading} accent="border-cyan-200 dark:border-cyan-900/40" href="/surgery/schedules" />
                        <KpiPill value={operatingRooms} label="Salas op." loading={loading} accent="border-emerald-200 dark:border-emerald-900/40" href="/surgery/operating-rooms" />
                        <KpiPill value={operativeReports} label="Relatórios" loading={loading} accent="border-purple-200 dark:border-purple-900/40" href="/surgery/operative-reports" />
                        <KpiPill value={billingItems} label="Faturáveis" loading={loading} accent="border-teal-200 dark:border-teal-900/40" href="/surgery/billing" />

                        {/* shortcut: ver agenda de hoje */}
                        <Link href={`/surgery/surgeries/?scheduled_date=${TODAY}`}
                            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white/60 px-3 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:bg-white/90 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/10">
                            Cirurgias de hoje <ArrowRight size={11} />
                        </Link>
                    </div>
                </header>
                {/* ── /HERO HEADER ─────────────────────────────────────────── */}

                {errorMessage && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
                        {errorMessage}
                    </div>
                )}

                <div className="grid auto-rows-fr grid-cols-5 gap-2">
                    <MetricCard label="Pedidos cirúrgicos" value={loading ? "..." : requests} accentClass="border-l-red-500" href="/surgery/requests" />
                    <MetricCard label="Avaliações pré-op." value={loading ? "..." : preoperativeAssessments} accentClass="border-l-amber-500" href="/surgery/preoperative-assessments" />
                    <MetricCard label="Pequenas cirurgias" value={loading ? "..." : smallSurgeries} accentClass="border-l-blue-500" href="/surgery/small-surgeries" />
                    <MetricCard label="Grandes cirurgias" value={loading ? "..." : largeSurgeries} accentClass="border-l-violet-500" href="/surgery/large-surgeries" />
                    <MetricCard label="Procedimentos (catálogo)" value={loading ? "..." : procedures} accentClass="border-l-slate-500" href="/surgery/surgical-procedures" />
                    <MetricCard label="Agenda cirúrgica" value={loading ? "..." : schedules} accentClass="border-l-cyan-500" href="/surgery/schedules" />
                    <MetricCard label="Salas operatórias" value={loading ? "..." : operatingRooms} accentClass="border-l-emerald-500" href="/surgery/operating-rooms" />
                    <MetricCard label="Autorizações" value={loading ? "..." : authorizations} accentClass="border-l-orange-500" href="/surgery/authorizations" />
                    <MetricCard label="Itens faturáveis" value={loading ? "..." : billingItems} accentClass="border-l-teal-500" href="/surgery/billing" />
                    <MetricCard label="Amostras cirúrgicas" value={loading ? "..." : specimens} accentClass="border-l-pink-500" href="/surgery/specimens" />
                    <MetricCard label="Relatórios operatórios" value={loading ? "..." : operativeReports} accentClass="border-l-indigo-500" href="/surgery/operative-reports" />
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <ActionTile title="Pedidos cirúrgicos" description="Indicações cirúrgicas com diagnóstico, prioridade, especialidade e estado." href="/surgery/requests" icon={ClipboardList} accentClass="border-l-red-500" />
                    <ActionTile title="Avaliação pré-operatória" description="Aptidão clínica e anestésica, ASA, exames obrigatórios e consentimento." href="/surgery/preoperative-assessments" icon={Stethoscope} accentClass="border-l-amber-500" />
                    <ActionTile title="Autorizações cirúrgicas" description="Orçamento, pagamento inicial, seguro, sala, equipa e consentimento." href="/surgery/authorizations" icon={ShieldCheck} accentClass="border-l-orange-500" />
                    <ActionTile title="Pequenas cirurgias" description="Listar e gerir pequenas cirurgias." href="/surgery/small-surgeries" icon={Scissors} accentClass="border-l-blue-500" />
                    <ActionTile title="Grandes cirurgias" description="Listar e gerir grandes cirurgias." href="/surgery/large-surgeries" icon={ClipboardList} accentClass="border-l-violet-500" />
                    <ActionTile title="Procedimentos cirúrgicos" description="Gerir catálogo de procedimentos." href="/surgery/surgical-procedures" icon={Settings} accentClass="border-l-slate-500" />
                    <ActionTile title="Procedimentos realizados" description="Procedimentos efetivos dentro da cirurgia, lateralidade, ordem e cirurgião." href="/surgery/procedure-items" icon={ClipboardCheck} accentClass="border-l-sky-500" />
                    <ActionTile title="Todas as cirurgias" description="Vista consolidada de todas as cirurgias com filtros por estado e data." href="/surgery/surgeries" icon={ClipboardList} accentClass="border-l-zinc-500" />
                    <ActionTile title="Agenda cirúrgica" description="Marcação por sala, prioridade, estado e horário previsto." href="/surgery/schedules" icon={ClipboardList} accentClass="border-l-cyan-500" />
                    <ActionTile title="Centro cirúrgico" description="Salas, esterilização, disponibilidade e equipamentos." href="/surgery/operating-rooms" icon={Scissors} accentClass="border-l-emerald-500" />
                    <ActionTile title="Equipa cirúrgica" description="Cirurgião, anestesista, instrumentista, circulante e assistentes." href="/surgery/teams" icon={Users} accentClass="border-l-teal-500" />
                    <ActionTile title="Anestesia" description="Tipo, ASA, fármacos, fluidos, via aérea e complicações." href="/surgery/anesthesia" icon={HeartPulse} accentClass="border-l-rose-500" />
                    <ActionTile title="Checklist de segurança" description="Sign-in, time-out, sign-out e confirmação de segurança." href="/surgery/safety-checklists" icon={ClipboardCheck} accentClass="border-l-green-500" />
                    <ActionTile title="Materiais" description="Catálogo de materiais cirúrgicos, implantes e consumíveis." href="/surgery/materials" icon={PackageSearch} accentClass="border-l-yellow-500" />
                    <ActionTile title="Consumos" description="Materiais e produtos consumidos por cirurgia." href="/surgery/consumptions" icon={PackageCheck} accentClass="border-l-lime-500" />
                    <ActionTile title="Faturação cirúrgica" description="Itens faturáveis por sala, equipa, procedimento, anestesia e consumos." href="/surgery/billing" icon={CreditCard} accentClass="border-l-indigo-500" />
                    <ActionTile title="Amostras cirúrgicas" description="Amostras coletadas durante cirurgia e ligação ao pedido de patologia." href="/surgery/specimens" icon={Microscope} accentClass="border-l-pink-500" />
                    <ActionTile title="Recuperação" description="Sala de recuperação, dor, Aldrete, sinais vitais e alta." href="/surgery/recovery" icon={HeartPulse} accentClass="border-l-fuchsia-500" />
                    <ActionTile title="Relatório operatório" description="Achados, técnica, complicações e amostras para patologia." href="/surgery/operative-reports" icon={FileText} accentClass="border-l-purple-500" />
                    <ActionTile title="Documentos cirúrgicos" description="Consentimentos, orçamentos, autorizações, relatórios e anexos." href="/surgery/documents" icon={FileText} accentClass="border-l-stone-500" />
                    <ActionTile title="Auditoria cirúrgica" description="Rastreabilidade de estados, sala, equipa, materiais, documentos e faturação." href="/surgery/audit-events" icon={Activity} accentClass="border-l-neutral-500" />
                </div>

            </div>
        </AppLayout>
    )
}
