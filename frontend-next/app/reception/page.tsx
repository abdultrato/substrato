"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
    ClipboardList,
    CreditCard,
    FilePlus2,
    FileText,
    CalendarClock,
    Receipt,
    UserPlus,
    Users,
    PackageSearch,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MoneyValue from "@/components/ui/MoneyValue"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

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
        title: "Registrar paciente",
        description: "Abrir o cadastro clínico e preparar o atendimento.",
        href: "/patients",
        icon: UserPlus,
    },
    {
        title: "Criar requisição",
        description: "Encaminhar o paciente direto para a jornada laboratorial.",
        href: "/requests/nova",
        icon: FilePlus2,
    },
    {
        title: "Requisição externa",
        description: "Criar requisição para empresa solicitante ou terceirizada.",
        href: "/requests/externa/nova",
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
        href: "/recibos",
        icon: Receipt,
    },
    {
        title: "Agendar consulta",
        description: "Marcar consulta médica e (opcionalmente) emitir fatura.",
        href: "/consultas",
        icon: CalendarClock,
    },
    {
        title: "Criar requisição de materiais",
        description: "Abrir o formulário para solicitar consumíveis ao almoxarifado/farmácia.",
        href: "/farmacia/requisicoes-materiais/nova",
        icon: PackageSearch,
    },
]

export default function RecepcaoPage() {
    const { loading } = useAuthGuard()
    const { user } = useAuth()
    const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

    const [workspace, setWorkspace] = useState<ReceptionWorkspace>(EMPTY_WORKSPACE)
    const [erro, setErro] = useState<string | null>(null)
    const [carregando, setCarregando] = useState(true)

    useEffect(() => {
        async function carregarWorkspace() {
            try {
                const data = await apiFetch<any>("/recepcao/workspace/")
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

        carregarWorkspace()
    }, [])

    if (loading) return null

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO]}>
            <div className="space-y-6">
                <PageHeader
                    title="Recepção"
                    subtitle="Área de trabalho do balcão para entrada, triagem administrativa e encaminhamento financeiro."
                    actions={
                        podeVerAdmin ? (
                            <Link
                                href="/admin/"
                                className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
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

                <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
                    <Card
                        title="Fila do dia"
                        subtitle="Pacientes que passaram pela recepção hoje."
                    >
                        {carregando ? (
                            <div className="text-sm text-gray-500">Carregando fila...</div>
                        ) : workspace.queue.length === 0 ? (
                            <div className="text-sm text-gray-500">
                                Nenhum check-in aberto hoje. A recepção já pode começar a registrar entradas.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-gray-500">
                                            <th className="pb-2 pr-4 font-medium">Paciente</th>
                                            <th className="pb-2 pr-4 font-medium">Prioridade</th>
                                            <th className="pb-2 pr-4 font-medium">Estado</th>
                                            <th className="pb-2 pr-4 font-medium">Requisição</th>
                                            <th className="pb-2 font-medium">Fatura</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {workspace.queue.map((item) => (
                                            <tr key={item.id} className="border-b last:border-b-0">
                                                <td className="py-2 pr-4">
                                                    <div className="font-medium text-gray-900">{item.patient_name}</div>
                                                    <div className="text-xs text-gray-500">{item.patient_code}</div>
                                                </td>
                                                <td className="py-2 pr-4 text-gray-700">{item.priority}</td>
                                                <td className="py-2 pr-4 text-gray-700">{item.status}</td>
                                                <td className="py-2 pr-4 text-gray-700">
                                                    {item.request_code || "Pendente"}
                                                </td>
                                                <td className="py-2 text-gray-700">
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
                                <IndicadorLinha label="Pacientes novos" value={workspace.summary.new_patients} />
                                <IndicadorLinha label="Requisições pendentes" value={workspace.summary.pending_requests} />
                                <IndicadorLinha label="Faturas em aberto" value={workspace.summary.open_invoices} />
                                <IndicadorLinha label="Recibos gerados hoje" value={workspace.summary.receipts_generated_today} />
                            </div>
                        </Card>

                        <Card
                            title="Atalhos da recepção"
                            subtitle="Entradas rápidas para os fluxos já existentes do sistema."
                        >
                            <div className="space-y-3">
                                {atalhos.map((atalho) => {
                                    const Icon = atalho.icon

                                    return (
                                        <Link
                                            key={atalho.href}
                                            href={atalho.href}
                                            className="flex items-start gap-3 rounded-xl border border-gray-200 px-3 py-2 transition hover:border-gray-300 hover:bg-gray-50"
                                        >
                                            <div className="rounded-lg bg-gray-100 p-2 text-gray-700">
                                                <Icon size={18} />
                                            </div>

                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {atalho.title}
                                                </div>
                                                <div className="mt-1 text-xs text-gray-500">
                                                    {atalho.description}
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
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
    return (
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm text-gray-500">{title}</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
                </div>

                <div className="rounded-xl bg-gray-100 p-2 text-gray-700">
                    <Icon size={20} />
                </div>
            </div>
        </div>
    )
}

function IndicadorLinha({
    label,
    value,
}: {
    label: string
    value: number | string
}) {
    return (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5">
            <span className="text-gray-600">{label}</span>
            <span className="font-medium text-gray-900">{value}</span>
        </div>
    )
}
