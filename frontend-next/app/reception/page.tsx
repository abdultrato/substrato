"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
    Activity,
    CheckCircle2,
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
    },
    {
        title: "Consultas cirúrgicas",
        description: "Agendar cirurgia pequena, grande ou geral com procedimento e data prevista.",
        href: "/surgery/surgeries/new",
        icon: Scissors,
    },
    {
        title: "Odontologia",
        description: "Marcar consulta dentária com cadeira/gabinete, motivo e estado do atendimento.",
        href: "/dental/appointments/new",
        icon: CalendarClock,
    },
    {
        title: "Medicina veterinária",
        description: "Marcar consulta veterinária para animal/paciente e tutor responsável.",
        href: "/veterinary/appointments/new",
        icon: HeartPulse,
    },
    {
        title: "Fisioterapia e reabilitação",
        description: "Abrir marcação de avaliação funcional inicial antes do plano e das sessões.",
        href: "/physiotherapy/assessments/new",
        icon: Activity,
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

                {erro && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {erro}
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <ResumoCard title="Check-ins hoje" value={workspace.summary.checkins_today} icon={Users} />
                    <ResumoCard title="Na fila" value={workspace.summary.queue_size} icon={ClipboardList} />
                    <ResumoCard title="Em atendimento" value={workspace.summary.in_care} icon={UserPlus} />
                    <ResumoCard
                        title="Recebido hoje"
                        value={<MoneyValue value={workspace.summary.received_today} />}
                        icon={Receipt}
                    />
                </div>

                <Card title="Marcação por Categoria">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        {marcacoesPorSector.map((sector) => {
                            const iconUrl = lucideToDataUrl(sector.icon)
                            return (
                                <Link
                                    key={sector.href}
                                    href={sector.href}
                                    className="group relative flex min-h-[100px] flex-col justify-end overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/40 hover:shadow-md"
                                >
                                    <span
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0"
                                        style={{
                                            background: "currentColor",
                                            color: "hsl(var(--muted-foreground-hsl))",
                                            opacity: 0.13,
                                            WebkitMaskImage: `url("${iconUrl}")`,
                                            WebkitMaskRepeat: "no-repeat",
                                            WebkitMaskSize: "52%",
                                            WebkitMaskPosition: "center 30%",
                                            maskImage: `url("${iconUrl}")`,
                                            maskRepeat: "no-repeat",
                                            maskSize: "52%",
                                            maskPosition: "center 30%",
                                        }}
                                    />
                                    <p className="relative text-sm font-semibold text-foreground">{sector.title}</p>
                                </Link>
                            )
                        })}
                    </div>
                </Card>

                <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
                    <Card
                        title="Fila do dia"
                        subtitle="Pacientes que passaram pela recepção hoje."
                    >
                        {carregando ? (
                            <div className="text-sm text-muted-foreground">Carregando fila...</div>
                        ) : workspace.queue.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                                Nenhum check-in aberto hoje. A recepção já pode começar a registrar entradas.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-left text-muted-foreground">
                                            <th className="pb-2 pr-4 font-medium">Paciente</th>
                                            <th className="pb-2 pr-4 font-medium">Prioridade</th>
                                            <th className="pb-2 pr-4 font-medium">Estado</th>
                                            <th className="pb-2 pr-4 font-medium">Requisição</th>
                                            <th className="pb-2 font-medium">Fatura</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {workspace.queue.map((item) => (
                                            <tr key={item.id} className="border-b border-border last:border-b-0">
                                                <td className="py-2 pr-4">
                                                    <div className="font-medium text-foreground">{item.patient_name}</div>
                                                    <div className="text-xs text-muted-foreground">{item.patient_code}</div>
                                                </td>
                                                <td className="py-2 pr-4 text-foreground-2">{item.priority}</td>
                                                <td className="py-2 pr-4 text-foreground-2">{item.status}</td>
                                                <td className="py-2 pr-4 text-foreground-2">
                                                    {item.request_code || "Pendente"}
                                                </td>
                                                <td className="py-2 text-foreground-2">
                                                    {item.invoice_code || "Pendente"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    <div className="space-y-6">
                        <Card
                            title="Indicadores operacionais"
                            subtitle="Pendências que impactam diretamente o balcão."
                        >
                            <div className="space-y-3 text-sm">
                                <IndicadorLinha label="Pacientes novos" value={workspace.summary.new_patients} href="/patients" />
                                <IndicadorLinha label="Requisições pendentes" value={workspace.summary.pending_requests} href="/requests/pendentes" />
                                <IndicadorLinha label="Faturas em aberto" value={workspace.summary.open_invoices} href="/billing/invoices?status=EMIT" />
                                <IndicadorLinha label="Recibos gerados hoje" value={workspace.summary.receipts_generated_today} href="/payments/receipts" />
                            </div>
                        </Card>

                        <Card
                            title="Atalhos da recepção"
                            subtitle="Entradas rápidas para os fluxos já existentes do sistema."
                        >
                            <div className="space-y-3">
                                {/* Entrada de paciente — abre o wizard de registo por etapas */}
                                <button
                                    type="button"
                                    onClick={() => setShowWizard(true)}
                                    className="flex w-full items-center gap-3 rounded-lg border border-[var(--primary-200)] bg-[var(--primary-50)] px-3 py-2.5 text-left transition hover:bg-[var(--primary-100)]"
                                >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-100)]">
                                        <UserPlus size={16} className="text-[var(--primary-600)]" />
                                    </span>
                                    <div>
                                        <span className="block text-sm font-semibold text-[var(--primary-700)]">Registar paciente</span>
                                        <span className="text-xs text-[var(--primary-500)]">Fluxo de entrada com classificação e perfil</span>
                                    </div>
                                </button>

                                {atalhos.map((atalho) => {
                                    const iconUrl = lucideToDataUrl(atalho.icon)
                                    return (
                                        <Link
                                            key={atalho.href}
                                            href={atalho.href}
                                            className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition hover:border-primary/40 hover:bg-muted/40"
                                        >
                                            <span
                                                aria-hidden
                                                className="pointer-events-none relative h-8 w-8 shrink-0 rounded-lg bg-muted"
                                            >
                                                <span
                                                    className="absolute inset-[6px] text-muted-foreground"
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
                                            <span className="text-sm font-medium text-foreground">{atalho.title}</span>
                                        </Link>
                                    )
                                })}
                            </div>
                        </Card>
                    </div>
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
    const borderColor = tone === "emerald" ? "border-emerald-200" : "border-red-200"
    const bgColor = tone === "emerald" ? "bg-emerald-50" : "bg-red-50"
    const textColor = tone === "emerald" ? "text-emerald-800" : "text-red-800"
    const subTextColor = tone === "emerald" ? "text-emerald-700" : "text-red-700"

    return (
        <section className="rounded-lg border border-border bg-card p-2 shadow-sm">
            <div className="flex items-center gap-2 pb-2">
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted">{icon}</div>
                <p className="text-xs font-semibold text-foreground">{title}</p>
                {!loading && rows.length > 0 && (
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground-2">
                        {rows.length}
                    </span>
                )}
            </div>

            {loading ? (
                <p className="text-[11px] text-muted-foreground">Carregando...</p>
            ) : rows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
                    {emptyMsg}
                </div>
            ) : (
                <div className="space-y-2">
                    {rows.map((r) => (
                        <div key={r.id} className={`rounded-lg border ${borderColor} ${bgColor} px-3 py-2`}>
                            <div className="flex flex-wrap items-start justify-between gap-1">
                                <div>
                                    <span className={`text-xs font-semibold ${textColor}`}>{r.custom_id || `#${r.id}`}</span>
                                    <span className={`ml-1.5 text-[11px] ${subTextColor}`}>{r.invoice_code || "-"}</span>
                                    {r.patient_name && (
                                        <span className={`ml-1.5 text-[11px] ${subTextColor}`}>· {r.patient_name}</span>
                                    )}
                                </div>
                                <MoneyValue value={r.amount} className={`text-xs font-semibold ${textColor}`} />
                            </div>
                            {r.reason && <p className={`mt-0.5 text-[11px] ${subTextColor}`}>{r.reason}</p>}
                            <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] ${subTextColor}`}>
                                {r.reviewed_by_name && <span>Decidido por: <strong>{r.reviewed_by_name}</strong></span>}
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
}: {
    title: string
    value: number | string | React.ReactNode
    icon: typeof Users
}) {
    const iconUrl = lucideToDataUrl(Icon)
    return (
        <div className="relative overflow-hidden rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
            <span
                aria-hidden
                className="pointer-events-none absolute right-3 top-1/2 h-12 w-12 -translate-y-1/2"
                style={{
                    background: "currentColor",
                    color: "hsl(var(--muted-foreground-hsl))",
                    opacity: 0.11,
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
            <div className="text-sm text-muted-foreground">{title}</div>
            <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
        </div>
    )
}

function IndicadorLinha({
    label,
    value,
    href,
}: {
    label: string
    value: number | string
    href?: string
}) {
    const content = (
        <>
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground">{value}</span>
        </>
    )
    if (href) {
        return (
            <Link
                href={href}
                className="flex items-center justify-between rounded-lg bg-muted px-3 py-1.5 transition-colors hover:bg-[var(--gray-200)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
                title="Abrir listagem correspondente"
            >
                {content}
            </Link>
        )
    }
    return (
        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-1.5">
            {content}
        </div>
    )
}
