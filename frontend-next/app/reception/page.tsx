"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
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
    Stethoscope,
    UserPlus,
    Users,
    PackageSearch,
    XCircle,
} from "lucide-react"

import { lucideToDataUrl } from "@/lib/icon-svg"
import { getManchesterMeta } from "@/lib/manchesterTriage"
import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
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
                // silently ignore — the section just stays empty
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
    const greeting =
        hour < 12 ? "Bom dia" :
        hour < 18 ? "Boa tarde" :
        "Boa noite"

    const firstName = user?.first_name?.trim() || user?.username?.trim() || null
    const greetingName = firstName ? `${greeting}, ${firstName}` : `${greeting}`

    const todayLabel = now.toLocaleDateString("pt-MZ", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    })

    return (
        <>
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO]}>
            <div className="space-y-6">
                <PageHeader
                    title="Recepção"
                    actions={
                        podeVerAdmin ? (
                            <Link
                                href="/admin/"
                                className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground-2 transition hover:bg-muted hover:text-foreground"
                            >
                                Abrir admin
                            </Link>
                        ) : null
                    }
                />

                {/* Hero greeting strip */}
                <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-5 py-4 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
                    <div className="relative z-10">
                        <p className="text-xs font-medium uppercase tracking-widest text-[var(--primary-500)] dark:text-[var(--primary-400)]">
                            Recepção · Área de Trabalho
                        </p>
                        <h2 className="mt-0.5 text-lg font-bold text-foreground">{greetingName}</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground capitalize">{todayLabel}</p>
                    </div>
                    {/* decorative glow blob */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--primary-200)] opacity-20 blur-3xl dark:bg-[var(--primary-700)]"
                    />
                </div>

                {erro && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
                        {erro}
                    </div>
                )}

                {/* KPI stat cards */}
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                    <ResumoCard
                        title="Check-ins hoje"
                        value={workspace.summary.checkins_today}
                        icon={Users}
                        accentColor="border-l-blue-500"
                        iconBg="bg-blue-100 dark:bg-blue-900/40"
                        iconColor="text-blue-600 dark:text-blue-400"
                        gradientFrom="from-blue-50/60 dark:from-blue-950/20"
                    />
                    <ResumoCard
                        title="Na fila"
                        value={workspace.summary.queue_size}
                        icon={ClipboardList}
                        accentColor="border-l-amber-500"
                        iconBg="bg-amber-100 dark:bg-amber-900/40"
                        iconColor="text-amber-600 dark:text-amber-400"
                        gradientFrom="from-amber-50/60 dark:from-amber-950/20"
                    />
                    <ResumoCard
                        title="Em atendimento"
                        value={workspace.summary.in_care}
                        icon={UserPlus}
                        accentColor="border-l-violet-500"
                        iconBg="bg-violet-100 dark:bg-violet-900/40"
                        iconColor="text-violet-600 dark:text-violet-400"
                        gradientFrom="from-violet-50/60 dark:from-violet-950/20"
                    />
                    <ResumoCard
                        title="Recebido hoje"
                        value={<MoneyValue value={workspace.summary.received_today} />}
                        icon={Receipt}
                        accentColor="border-l-emerald-500"
                        iconBg="bg-emerald-100 dark:bg-emerald-900/40"
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        gradientFrom="from-emerald-50/60 dark:from-emerald-950/20"
                    />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Marcação por Categoria — 2-col mini card grid */}
                    <Card title="Marcação por Categoria">
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            {marcacoesPorSector.map((sector) => (
                                <Link
                                    key={sector.href}
                                    href={sector.href}
                                    className="group flex flex-col gap-2 rounded-xl border border-white/25 bg-white/30 p-3 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[var(--primary-300)] hover:bg-white/50 hover:shadow-md dark:bg-white/5 dark:border-white/10 dark:hover:border-[var(--primary-600)] dark:hover:bg-white/10"
                                >
                                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${sector.iconBg}`}>
                                        <sector.icon size={16} className={sector.iconColor} />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold leading-tight text-foreground group-hover:text-[var(--primary-700)] dark:group-hover:text-[var(--primary-400)]">
                                            {sector.title}
                                        </p>
                                        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                                            {sector.description}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </Card>

                    {/* Fila do dia — horizontal compact cards */}
                    <Card title="Fila do dia">
                        {carregando ? (
                            <div className="text-sm text-muted-foreground">Carregando fila...</div>
                        ) : workspace.queue.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                                Nenhum check-in aberto hoje.
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {workspace.queue.map((item) => {
                                    const meta = getManchesterMeta(item.priority)
                                    return (
                                        <div
                                            key={item.id}
                                            className={`flex items-center gap-3 rounded-xl border border-l-4 border-white/20 bg-white/25 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10 ${meta.accentClass} ${meta.animClass}`}
                                        >
                                            {/* Priority pill */}
                                            <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold leading-none ${meta.badgeClass}`}>
                                                {meta.label}
                                            </span>

                                            {/* Patient info */}
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-foreground">{item.patient_name}</p>
                                                <p className="text-[11px] text-muted-foreground">{item.patient_code}</p>
                                            </div>

                                            {/* Status pill */}
                                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground-2">
                                                {item.status}
                                            </span>

                                            {/* Chips */}
                                            <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
                                                {item.request_code ? (
                                                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                        REQ {item.request_code}
                                                    </span>
                                                ) : (
                                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                        Sem req.
                                                    </span>
                                                )}
                                                {item.invoice_code ? (
                                                    <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                                        FAT {item.invoice_code}
                                                    </span>
                                                ) : (
                                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                        Sem fat.
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </Card>
                </div>

                <div className="grid grid-cols-2 gap-4 items-start">
                    {/* Indicadores operacionais — 2×2 stat tile grid */}
                    <Card title="Indicadores operacionais">
                        <div className="grid grid-cols-2 gap-2">
                            <IndicadorLinha
                                label="Pacientes novos"
                                value={workspace.summary.new_patients}
                                href="/patients"
                                accentColor="text-blue-600 dark:text-blue-400"
                                tileBg="bg-blue-50/60 dark:bg-blue-950/20"
                            />
                            <IndicadorLinha
                                label="Requisições pendentes"
                                value={workspace.summary.pending_requests}
                                href="/requests/pendentes"
                                accentColor="text-amber-600 dark:text-amber-400"
                                tileBg="bg-amber-50/60 dark:bg-amber-950/20"
                            />
                            <IndicadorLinha
                                label="Faturas em aberto"
                                value={workspace.summary.open_invoices}
                                href="/billing/invoices?status=EMIT"
                                accentColor="text-red-600 dark:text-red-400"
                                tileBg="bg-red-50/60 dark:bg-red-950/20"
                            />
                            <IndicadorLinha
                                label="Recibos gerados hoje"
                                value={workspace.summary.receipts_generated_today}
                                href="/payments/receipts"
                                accentColor="text-emerald-600 dark:text-emerald-400"
                                tileBg="bg-emerald-50/60 dark:bg-emerald-950/20"
                            />
                        </div>
                    </Card>

                    {/* Atalhos da recepção — 2-col card grid */}
                    <Card title="Atalhos da recepção">
                        <div className="flex flex-col gap-2">
                            {/* Registar paciente — premium gradient primary card */}
                            <button
                                type="button"
                                onClick={() => setShowWizard(true)}
                                className="group flex w-full items-center gap-3 rounded-xl border border-[var(--primary-300)]/60 bg-[var(--primary-500)]/10 px-3 py-3 text-left shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-[var(--primary-500)]/15 hover:border-[var(--primary-400)]/80 hover:shadow-md dark:bg-[var(--primary-500)]/10 dark:border-[var(--primary-500)]/30"
                            >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-100)] dark:bg-[var(--primary-800)]">
                                    <UserPlus size={17} className="text-[var(--primary-600)] dark:text-[var(--primary-300)]" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <span className="block text-sm font-bold text-[var(--primary-700)] dark:text-[var(--primary-300)]">
                                        Registar paciente
                                    </span>
                                    <span className="text-xs text-[var(--primary-500)] dark:text-[var(--primary-400)]">
                                        Fluxo de entrada com classificação e perfil
                                    </span>
                                </div>
                                <ChevronRight size={14} className="shrink-0 text-[var(--primary-400)] opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                                {atalhos.map((atalho) => {
                                    const iconUrl = lucideToDataUrl(atalho.icon)
                                    return (
                                        <Link
                                            key={atalho.href}
                                            href={atalho.href}
                                            className="group flex flex-col gap-2 rounded-xl border border-white/25 bg-white/20 p-3 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[var(--primary-300)] hover:bg-white/40 dark:bg-white/5 dark:border-white/10 dark:hover:border-[var(--primary-600)] dark:hover:bg-white/10"
                                        >
                                            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                                <span
                                                    aria-hidden
                                                    className="absolute inset-[7px] text-muted-foreground"
                                                    style={{
                                                        backgroundColor: "currentColor",
                                                        WebkitMaskImage: `url("${iconUrl}")`,
                                                        WebkitMaskRepeat: "no-repeat",
                                                        WebkitMaskSize: "contain",
                                                        WebkitMaskPosition: "center",
                                                        maskImage: `url("${iconUrl}")`,
                                                        maskRepeat: "no-repeat",
                                                        maskSize: "contain",
                                                        maskPosition: "center",
                                                    }}
                                                />
                                            </span>
                                            <div>
                                                <p className="text-xs font-semibold leading-tight text-foreground group-hover:text-[var(--primary-700)] dark:group-hover:text-[var(--primary-400)]">
                                                    {atalho.title}
                                                </p>
                                                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                                                    {atalho.description}
                                                </p>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    </Card>
                </div>

                {(loadingNotes || approvedNotes.length > 0 || rejectedNotes.length > 0) && (
                    <div className="grid gap-4 lg:grid-cols-2">
                        <ReceptionDecidedSection
                            title="Notas de crédito aprovadas"
                            icon={<CheckCircle2 size={14} className="text-emerald-600" />}
                            rows={approvedNotes}
                            loading={loadingNotes}
                            emptyMsg="Nenhuma nota de crédito aprovada."
                            tone="emerald"
                        />
                        <ReceptionDecidedSection
                            title="Notas de crédito rejeitadas"
                            icon={<XCircle size={14} className="text-red-500" />}
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
                onSuccess={() => setShowWizard(false)}
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
    const accentBorder = tone === "emerald" ? "border-l-emerald-500" : "border-l-red-500"
    const borderColor = tone === "emerald" ? "border-emerald-200 dark:border-emerald-800/50" : "border-red-200 dark:border-red-800/50"
    const bgColor = tone === "emerald" ? "bg-emerald-50/60 dark:bg-emerald-900/15" : "bg-red-50/60 dark:bg-red-900/15"
    const textColor = tone === "emerald" ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"
    const subTextColor = tone === "emerald" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
    const amountBg = tone === "emerald"
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"

    return (
        <section className="rounded-xl border border-white/20 bg-white/25 p-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
            <div className="flex items-center gap-2 pb-3">
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-muted">{icon}</div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                {!loading && rows.length > 0 && (
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground-2">
                        {rows.length}
                    </span>
                )}
            </div>

            {loading ? (
                <p className="text-[11px] text-muted-foreground">Carregando...</p>
            ) : rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-[11px] text-muted-foreground">
                    {emptyMsg}
                </div>
            ) : (
                <div className="space-y-2">
                    {rows.map((r) => (
                        <div
                            key={r.id}
                            className={`relative rounded-xl border border-l-4 ${borderColor} bg-white/30 ${accentBorder} px-3 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5`}
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
                                <p className={`mt-1 text-[11px] italic ${subTextColor}`}>"{r.decision_note}"</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
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

function ResumoCard({
    title,
    value,
    icon: Icon,
    accentColor,
    iconBg,
    iconColor,
    gradientFrom,
}: {
    title: string
    value: number | string | React.ReactNode
    icon: typeof Users
    accentColor: string
    iconBg: string
    iconColor: string
    gradientFrom: string
}) {
    return (
        <div
            className={`relative overflow-hidden rounded-xl border border-l-4 border-white/20 bg-white/30 px-4 py-3.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10 ${accentColor}`}
        >
            {/* Icon pill top-right */}
            <span className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
                <Icon size={15} className={iconColor} />
            </span>

            <div className="mt-1">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
                <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
            </div>
        </div>
    )
}

function IndicadorLinha({
    label,
    value,
    href,
    accentColor,
    tileBg,
}: {
    label: string
    value: number | string
    href?: string
    accentColor?: string
    tileBg?: string
}) {
    const inner = (
        <div className={`flex flex-col gap-0.5 rounded-xl border border-white/25 bg-white/30 px-3 py-3 shadow-sm backdrop-blur-sm transition-all dark:bg-white/5 dark:border-white/10`}>
            <span className="text-[11px] font-medium text-muted-foreground leading-none">{label}</span>
            <span className={`text-xl font-bold leading-tight ${accentColor ?? "text-foreground"}`}>{value}</span>
        </div>
    )

    if (href) {
        return (
            <Link
                href={href}
                className="group block hover:-translate-y-0.5 transition-transform"
                title="Abrir listagem correspondente"
            >
                {inner}
            </Link>
        )
    }
    return <div>{inner}</div>
}
