"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    Activity,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    CreditCard,
    FilePlus2,
    FileText,
    CalendarClock,
    HeartPulse,
    Receipt,
    Scissors,
    Search,
    Stethoscope,
    UserPlus,
    Users,
    PackageSearch,
    XCircle,
} from "lucide-react"

import { getManchesterMeta } from "@/lib/manchesterTriage"
import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import MoneyValue from "@/components/ui/MoneyValue"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { PatientIntakeWizard } from "@/components/reception/PatientIntakeWizard"

interface ReceptionWorkspaceSummary {
    checkins_today: number
    queue_size: number
    in_care: number
    new_patients: number
    pending_requests: number
    open_invoices: number
    receipts_generated_today: number
    received_today: string
}

interface ReceptionQueueItem {
    id: number
    custom_id: string
    patient_id: number
    patient_name: string
    patient_code: string
    priority: string
    status: string
    arrived_at: string
    attendant: string
    request_id: number | null
    request_code: string
    invoice_id: number | null
    invoice_code: string
}

interface ReceptionWorkspace {
    date: string
    summary: ReceptionWorkspaceSummary
    queue: ReceptionQueueItem[]
}

type CreditNoteRow = {
    id: number
    custom_id?: string
    invoice_code?: string
    consultation_code?: string | null
    patient_name?: string | null
    amount?: string | number
    reason?: string
    status?: string
    requested_by_name?: string | null
    reviewed_by_name?: string | null
    decision_note?: string
    created_at?: string
    reviewed_at?: string
}

function fmtDate(value: any): string {
    if (!value) return "-"
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString()
}

const EMPTY_WORKSPACE: ReceptionWorkspace = {
    date: "",
    summary: {
        checkins_today: 0,
        queue_size: 0,
        in_care: 0,
        new_patients: 0,
        pending_requests: 0,
        open_invoices: 0,
        receipts_generated_today: 0,
        received_today: "0.00",
    },
    queue: [],
}

const atalhos = [
    {
        title: "Criar requisição",
        description: "Encaminhar o paciente direto para a jornada laboratorial.",
        href: "/requests/new",
        icon: FilePlus2,
    },
    {
        title: "Requisição externa",
        description: "Criar requisição para empresa solicitante ou terceirizada.",
        href: "/requests/external/new",
        icon: FileText,
    },
    {
        title: "Faturas",
        description: "Abrir o backoffice de faturamento para emissão e revisão.",
        href: "/invoices",
        icon: CreditCard,
    },
    {
        title: "Recibos",
        description: "Consultar recibos já gerados no módulo de pagamentos.",
        href: "/receipts",
        icon: Receipt,
    },
    {
        title: "Agendar consulta",
        description: "Marcar consulta médica e (opcionalmente) emitir fatura.",
        href: "/consultations",
        icon: CalendarClock,
    },
    {
        title: "Criar requisição de materiais",
        description: "Abrir o formulário para solicitar consumíveis ao almoxarifado/farmácia.",
        href: "/pharmacy/material-requests/new",
        icon: PackageSearch,
    },
    {
        title: "Marcar procedimento",
        description: "Marcar procedimento de enfermagem para um paciente (catálogo, materiais e execução).",
        href: "/nursing/procedures/new",
        icon: ClipboardList,
    },
]

const marcacoesPorSector = [
    {
        title: "Consultas médicas",
        description: "Marcar consulta clínica para um paciente, com especialidade, horário e faturação.",
        href: "/consultations",
        icon: Stethoscope,
        iconBg: "bg-blue-100 dark:bg-blue-900/40",
        iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
        title: "Consultas cirúrgicas",
        description: "Agendar cirurgia pequena, grande ou geral com procedimento e data prevista.",
        href: "/surgery/surgeries/new",
        icon: Scissors,
        iconBg: "bg-violet-100 dark:bg-violet-900/40",
        iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
        title: "Odontologia",
        description: "Marcar consulta dentária com cadeira/gabinete, motivo e estado do atendimento.",
        href: "/dental/appointments/new",
        icon: CalendarClock,
        iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
        iconColor: "text-cyan-600 dark:text-cyan-400",
    },
    {
        title: "Medicina veterinária",
        description: "Marcar consulta veterinária para animal/paciente e tutor responsável.",
        href: "/veterinary/appointments/new",
        icon: HeartPulse,
        iconBg: "bg-pink-100 dark:bg-pink-900/40",
        iconColor: "text-pink-600 dark:text-pink-400",
    },
    {
        title: "Fisioterapia e reabilitação",
        description: "Abrir marcação de avaliação funcional inicial antes do plano e das sessões.",
        href: "/physiotherapy/assessments/new",
        icon: Activity,
        iconBg: "bg-amber-100 dark:bg-amber-900/40",
        iconColor: "text-amber-600 dark:text-amber-400",
    },
]

export default function RecepcaoPage() {
    const { loading } = useAuthGuard()
    const router = useRouter()
    const { user } = useAuth()
    const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
    const safeRefreshToken = useSafeDataRefreshSignal()

    const [workspace, setWorkspace] = useState<ReceptionWorkspace>(EMPTY_WORKSPACE)
    const [erro, setErro] = useState<string | null>(null)
    const [carregando, setCarregando] = useState(true)
    const [approvedNotes, setApprovedNotes] = useState<CreditNoteRow[]>([])
    const [rejectedNotes, setRejectedNotes] = useState<CreditNoteRow[]>([])
    const [loadingNotes, setLoadingNotes] = useState(true)
    const [showWizard, setShowWizard] = useState(false)
    const [search, setSearch] = useState("")

    useEffect(() => {
        async function carregarWorkspace() {
            try {
                const data = await apiFetch<any>("/reception/workspace/", {
                    clientCache: safeRefreshToken === 0,
                })
                setWorkspace(normalizeReceptionWorkspace(data))
            } catch (error) {
                setErro(
                    error instanceof Error
                        ? error.message
                        : "Falha ao carregar a área de trabalho da recepção."
                )
            } finally {
                setCarregando(false)
            }
        }

        async function carregarNotasCredito() {
            try {
                const [apro, reje] = await Promise.all([
                    apiFetch<any>("/billing/credit-note-request/?status=APRO&ordering=-reviewed_at", { clientCache: false }),
                    apiFetch<any>("/billing/credit-note-request/?status=REJE&ordering=-reviewed_at", { clientCache: false }),
                ])
                setApprovedNotes(Array.isArray(apro?.results ?? apro) ? (apro?.results ?? apro) : [])
                setRejectedNotes(Array.isArray(reje?.results ?? reje) ? (reje?.results ?? reje) : [])
            } catch {
                // silently ignore
            } finally {
                setLoadingNotes(false)
            }
        }

        carregarWorkspace()
        carregarNotasCredito()
    }, [safeRefreshToken])

    if (loading) return null

    const now = new Date()
    const hour = now.getHours()
    const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"
    const firstName = user?.first_name?.trim() || user?.username?.trim() || null
    const greetingName = firstName ? `${greeting}, ${firstName}` : greeting
    const todayLabel = now.toLocaleDateString("pt-MZ", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    })

    const q = search.trim().toLowerCase()
    const filteredQueue = q
        ? workspace.queue.filter(
            (item) =>
                item.patient_name.toLowerCase().includes(q) ||
                item.patient_code.toLowerCase().includes(q) ||
                item.request_code.toLowerCase().includes(q) ||
                item.invoice_code.toLowerCase().includes(q) ||
                item.status.toLowerCase().includes(q),
        )
        : workspace.queue

    return (
        <>
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO]}>
            <div className="space-y-3">
                <PageHeader
                    title="Recepção"
                    actions={
                        <div className="flex items-center gap-2">
                            {/* Global search */}
                            <div className="relative w-48">
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Pesquisar…"
                                    className="w-full rounded-lg border border-border bg-background/60 py-1.5 pl-7 pr-6 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:w-72 focus:ring-2 focus:ring-violet-500/40 transition-all"
                                />
                            </div>
                            {podeVerAdmin && (
                                <Link
                                    href="/admin/"
                                    className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground-2 transition hover:bg-muted hover:text-foreground"
                                >
                                    Admin
                                </Link>
                            )}
                        </div>
                    }
                />

                {/* Hero greeting strip — compact */}
                <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
                    <div className="relative z-10 flex items-center gap-4">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--primary-500)] dark:text-[var(--primary-400)]">
                                Recepção · Área de Trabalho
                            </p>
                            <h2 className="text-base font-bold text-foreground leading-tight">{greetingName}</h2>
                            <p className="text-[11px] text-muted-foreground capitalize">{todayLabel}</p>
                        </div>
                    </div>
                    <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--primary-200)] opacity-20 blur-3xl dark:bg-[var(--primary-700)]" />
                </div>

                {erro && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
                        {erro}
                    </div>
                )}

                {/* KPI row — compact */}
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                    <KpiCard title="Check-ins hoje" value={workspace.summary.checkins_today} icon={Users} accentClass="border-l-blue-500 dark:border-l-blue-400" iconBg="bg-blue-100 dark:bg-blue-900/40" iconColor="text-blue-600 dark:text-blue-400" />
                    <KpiCard title="Na fila" value={workspace.summary.queue_size} icon={ClipboardList} accentClass="border-l-amber-500 dark:border-l-amber-400" iconBg="bg-amber-100 dark:bg-amber-900/40" iconColor="text-amber-600 dark:text-amber-400" />
                    <KpiCard title="Em atendimento" value={workspace.summary.in_care} icon={UserPlus} accentClass="border-l-violet-500 dark:border-l-violet-400" iconBg="bg-violet-100 dark:bg-violet-900/40" iconColor="text-violet-600 dark:text-violet-400" />
                    <KpiCard title="Recebido hoje" value={<MoneyValue value={workspace.summary.received_today} />} icon={Receipt} accentClass="border-l-emerald-500 dark:border-l-emerald-400" iconBg="bg-emerald-100 dark:bg-emerald-900/40" iconColor="text-emerald-600 dark:text-emerald-400" />
                </div>

                {/* Main board — 3-col: fila (wide) | atalhos | marcações */}
                <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
                    {/* Fila do dia */}
                    <section className="rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
                        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
                            <span className="text-xs font-semibold text-foreground">Fila do dia</span>
                            {!carregando && (
                                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground-2">
                                    {filteredQueue.length}{q ? `/${workspace.queue.length}` : ""}
                                </span>
                            )}
                        </div>
                        <div className="max-h-[calc(100vh-310px)] min-h-[120px] overflow-y-auto p-2 [scrollbar-width:thin]">
                            {carregando ? (
                                <p className="px-2 py-4 text-center text-xs text-muted-foreground">Carregando fila...</p>
                            ) : filteredQueue.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
                                    {q ? "Nenhum resultado para a pesquisa." : "Nenhum check-in aberto hoje."}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    {filteredQueue.map((item) => {
                                        const meta = getManchesterMeta(item.priority)
                                        return (
                                            <div
                                                key={item.id}
                                                className={`flex items-center gap-2 rounded-lg border border-l-4 border-white/20 bg-white/30 px-2.5 py-1.5 shadow-sm backdrop-blur-sm dark:bg-white/5 ${meta.accentClass} ${meta.animClass}`}
                                            >
                                                <span className={`shrink-0 rounded border px-1 py-0.5 text-[9px] font-bold leading-none ${meta.badgeClass}`}>
                                                    {meta.label}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-semibold text-foreground">{item.patient_name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{item.patient_code}</p>
                                                </div>
                                                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-foreground-2">
                                                    {item.status}
                                                </span>
                                                <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
                                                    {item.request_code ? (
                                                        <span className="rounded bg-blue-50 px-1 py-0.5 text-[9px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                            REQ {item.request_code}
                                                        </span>
                                                    ) : (
                                                        <span className="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">—</span>
                                                    )}
                                                    {item.invoice_code ? (
                                                        <span className="rounded bg-violet-50 px-1 py-0.5 text-[9px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                                            FAT {item.invoice_code}
                                                        </span>
                                                    ) : (
                                                        <span className="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">—</span>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Atalhos */}
                    <section className="rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
                        <div className="border-b border-border/60 px-3 py-2">
                            <span className="text-xs font-semibold text-foreground">Atalhos</span>
                        </div>
                        <div className="flex flex-col gap-1.5 p-2">
                            {/* Registar paciente */}
                            <button
                                type="button"
                                onClick={() => setShowWizard(true)}
                                className="group flex w-full items-center gap-2 rounded-lg bg-primary px-2.5 py-2 text-left text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
                            >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20">
                                    <UserPlus size={13} className="text-primary-foreground" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <span className="block text-xs font-bold leading-tight text-primary-foreground">
                                        Registar paciente
                                    </span>
                                    <span className="text-[10px] leading-tight text-primary-foreground/80">
                                        Fluxo de entrada
                                    </span>
                                </div>
                                <ChevronRight size={12} className="shrink-0 text-primary-foreground/70 opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>
                            {atalhos.map((atalho) => (
                                <Link
                                    key={atalho.href}
                                    href={atalho.href}
                                    className="group flex items-center gap-2 rounded-lg border border-white/20 bg-white/20 px-2.5 py-1.5 shadow-sm backdrop-blur-sm transition-all hover:border-[var(--primary-300)] hover:bg-white/40 dark:bg-white/5 dark:border-white/10 dark:hover:border-[var(--primary-600)] dark:hover:bg-white/10"
                                >
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                                        <atalho.icon size={13} className="text-muted-foreground" />
                                    </span>
                                    <p className="truncate text-xs font-medium text-foreground group-hover:text-[var(--primary-700)] dark:group-hover:text-[var(--primary-400)]">
                                        {atalho.title}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </section>

                    {/* Marcações + Indicadores empilhados */}
                    <div className="flex flex-col gap-3">
                        {/* Indicadores operacionais */}
                        <section className="rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
                            <div className="border-b border-border/60 px-3 py-2">
                                <span className="text-xs font-semibold text-foreground">Indicadores</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 p-2">
                                <IndicadorTile label="Pacientes novos" value={workspace.summary.new_patients} href="/patients" accent="text-blue-600 dark:text-blue-400" bar="border-l-blue-500 dark:border-l-blue-400" />
                                <IndicadorTile label="Req. pendentes" value={workspace.summary.pending_requests} href="/requests/pendentes" accent="text-amber-600 dark:text-amber-400" bar="border-l-amber-500 dark:border-l-amber-400" />
                                <IndicadorTile label="Faturas abertas" value={workspace.summary.open_invoices} href="/billing/invoices?status=EMIT" accent="text-red-600 dark:text-red-400" bar="border-l-red-500 dark:border-l-red-400" />
                                <IndicadorTile label="Recibos hoje" value={workspace.summary.receipts_generated_today} href="/payments/receipts" accent="text-emerald-600 dark:text-emerald-400" bar="border-l-emerald-500 dark:border-l-emerald-400" />
                            </div>
                        </section>

                        {/* Marcação por Categoria */}
                        <section className="rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
                            <div className="border-b border-border/60 px-3 py-2">
                                <span className="text-xs font-semibold text-foreground">Marcações</span>
                            </div>
                            <div className="flex flex-col gap-1 p-2">
                                {marcacoesPorSector.map((sector) => (
                                    <Link
                                        key={sector.href}
                                        href={sector.href}
                                        className="group flex items-center gap-2 rounded-lg border border-white/20 bg-white/20 px-2.5 py-1.5 transition-all hover:border-[var(--primary-300)] hover:bg-white/40 dark:bg-white/5 dark:border-white/10 dark:hover:border-[var(--primary-600)] dark:hover:bg-white/10"
                                    >
                                        <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded ${sector.iconBg}`}>
                                            <sector.icon size={12} className={sector.iconColor} />
                                        </span>
                                        <p className="truncate text-xs font-medium text-foreground group-hover:text-[var(--primary-700)] dark:group-hover:text-[var(--primary-400)]">
                                            {sector.title}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>

                {(loadingNotes || approvedNotes.length > 0 || rejectedNotes.length > 0) && (
                    <div className="grid gap-3 lg:grid-cols-2">
                        <ReceptionDecidedSection
                            title="Notas de crédito aprovadas"
                            icon={<CheckCircle2 size={13} className="text-emerald-600" />}
                            rows={approvedNotes}
                            loading={loadingNotes}
                            emptyMsg="Nenhuma nota de crédito aprovada."
                            tone="emerald"
                        />
                        <ReceptionDecidedSection
                            title="Notas de crédito rejeitadas"
                            icon={<XCircle size={13} className="text-red-500" />}
                            rows={rejectedNotes}
                            loading={loadingNotes}
                            emptyMsg="Nenhuma nota de crédito rejeitada."
                            tone="red"
                        />
                    </div>
                )}
            </div>
        </AppLayout>

        {showWizard && (
            <PatientIntakeWizard
                onClose={() => setShowWizard(false)}
                onSuccess={(result) => {
                    setShowWizard(false)
                    if (result.pregnant) {
                        router.push(`/maternity/pregnancies/new?patient=${result.id}`)
                    }
                }}
            />
        )}
        </>
    )
}

function ReceptionDecidedSection({
    title,
    icon,
    rows,
    loading,
    emptyMsg,
    tone,
}: {
    title: string
    icon: React.ReactNode
    rows: CreditNoteRow[]
    loading: boolean
    emptyMsg: string
    tone: "emerald" | "red"
}) {
    const accentBorder = tone === "emerald" ? "border-l-emerald-500 dark:border-l-emerald-400" : "border-l-red-500 dark:border-l-red-400"
    const borderColor = tone === "emerald" ? "border-emerald-200 dark:border-emerald-800/50" : "border-red-200 dark:border-red-800/50"
    const bgColor = tone === "emerald" ? "bg-emerald-50/60 dark:bg-emerald-900/15" : "bg-red-50/60 dark:bg-red-900/15"
    const textColor = tone === "emerald" ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"
    const subTextColor = tone === "emerald" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
    const amountBg = tone === "emerald"
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"

    return (
        <section className="rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
            <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
                <div className="inline-flex h-6 w-6 items-center justify-center rounded bg-muted">{icon}</div>
                <p className="text-xs font-semibold text-foreground">{title}</p>
                {!loading && rows.length > 0 && (
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground-2">
                        {rows.length}
                    </span>
                )}
            </div>
            <div className="p-2">
            {loading ? (
                <p className="text-[11px] text-muted-foreground">Carregando...</p>
            ) : rows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    {emptyMsg}
                </div>
            ) : (
                <div className="space-y-1.5">
                    {rows.map((r) => (
                        <div
                            key={r.id}
                            className={`relative rounded-lg border border-l-4 ${borderColor} bg-white/30 ${accentBorder} px-2.5 py-2 shadow-sm backdrop-blur-sm dark:bg-white/[0.06]`}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-1">
                                <div className="min-w-0">
                                    <span className={`text-xs font-bold ${textColor}`}>{r.custom_id || `#${r.id}`}</span>
                                    {r.invoice_code && (
                                        <span className={`ml-1.5 text-[11px] ${subTextColor}`}>{r.invoice_code}</span>
                                    )}
                                    {r.patient_name && (
                                        <span className={`ml-1.5 text-[11px] ${subTextColor}`}>· {r.patient_name}</span>
                                    )}
                                </div>
                                <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${amountBg}`}>
                                    <MoneyValue value={r.amount} />
                                </span>
                            </div>
                            {r.reason && <p className={`mt-1 text-[11px] ${subTextColor}`}>{r.reason}</p>}
                            <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] ${subTextColor}`}>
                                {r.reviewed_by_name && (
                                    <span>Decidido por: <strong>{r.reviewed_by_name}</strong></span>
                                )}
                                {r.reviewed_at && <span>{fmtDate(r.reviewed_at)}</span>}
                            </div>
                            {r.decision_note && (
                                <p className={`mt-1 text-[11px] italic ${subTextColor}`}>&quot;{r.decision_note}&quot;</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
            </div>
        </section>
    )
}

function normalizeReceptionWorkspace ( raw: any ): ReceptionWorkspace {
    const summary = raw?.summary ?? raw?.resumo ?? {}
    const queue = raw?.queue ?? raw?.fila ?? []

    return {
        date: String( raw?.date ?? raw?.data ?? "" ),
        summary: {
            checkins_today: Number( summary?.checkins_today ?? summary?.checkins_hoje ?? 0 ),
            queue_size: Number( summary?.queue_size ?? summary?.na_fila ?? 0 ),
            in_care: Number( summary?.in_care ?? summary?.em_atendimento ?? 0 ),
            new_patients: Number( summary?.new_patients ?? summary?.pacientes_novos ?? 0 ),
            pending_requests: Number( summary?.pending_requests ?? summary?.requisicoes_pendentes ?? 0 ),
            open_invoices: Number( summary?.open_invoices ?? summary?.faturas_em_aberto ?? 0 ),
            receipts_generated_today: Number(
                summary?.receipts_generated_today ?? summary?.recibos_gerados_hoje ?? 0
            ),
            received_today: String( summary?.received_today ?? summary?.recebido_hoje ?? "0.00" ),
        },
        queue: Array.isArray( queue )
            ? queue.map( ( item: any ) => ( {
                id: Number( item?.id ?? 0 ),
                custom_id: String( item?.custom_id ?? item?.id_custom ?? "" ),
                patient_id: Number( item?.patient_id ?? item?.paciente_id ?? 0 ),
                patient_name: String( item?.patient_name ?? item?.paciente_nome ?? "" ),
                patient_code: String( item?.patient_code ?? item?.paciente_codigo ?? "" ),
                priority: String( item?.priority ?? item?.prioridade ?? "" ),
                status: String( item?.status ?? item?.estado ?? "" ),
                arrived_at: String( item?.arrived_at ?? item?.chegou_em ?? "" ),
                attendant: String( item?.attendant ?? item?.atendente ?? "" ),
                request_id: item?.request_id ?? item?.requisicao_id ?? null,
                request_code: String( item?.request_code ?? item?.requisicao_codigo ?? "" ),
                invoice_id: item?.invoice_id ?? item?.fatura_id ?? null,
                invoice_code: String( item?.invoice_code ?? item?.fatura_codigo ?? "" ),
            } ) )
            : [],
    }
}

function KpiCard({
    title,
    value,
    icon: Icon,
    accentClass,
    iconBg,
    iconColor,
}: {
    title: string
    value: number | string | React.ReactNode
    icon: typeof Users
    accentClass: string
    iconBg: string
    iconColor: string
}) {
    return (
        <div className={`relative overflow-hidden rounded-xl border border-l-4 border-white/20 bg-white/30 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 ${accentClass}`}>
            <span className={`absolute right-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
                <Icon size={13} className={iconColor} />
            </span>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
            <div className="mt-0.5 text-xl font-bold text-foreground">{value}</div>
        </div>
    )
}

function IndicadorTile({
    label,
    value,
    href,
    accent,
    bar,
}: {
    label: string
    value: number | string
    href?: string
    accent?: string
    bar?: string
}) {
    const inner = (
        <div className={`flex flex-col gap-0.5 rounded-lg border border-l-4 border-white/20 bg-white/25 px-2.5 py-2 backdrop-blur-sm dark:bg-white/5 ${bar ?? "border-l-border"}`}>
            <span className="text-[10px] font-medium text-muted-foreground leading-none">{label}</span>
            <span className={`text-lg font-bold leading-tight ${accent ?? "text-foreground"}`}>{value}</span>
        </div>
    )
    if (href) {
        return (
            <Link href={href} className="group block hover:-translate-y-0.5 transition-transform" title="Abrir listagem">
                {inner}
            </Link>
        )
    }
    return <div>{inner}</div>
}
