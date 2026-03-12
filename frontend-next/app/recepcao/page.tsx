"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
    ClipboardList,
    CreditCard,
    FilePlus2,
    Receipt,
    UserPlus,
    Users,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { apiFetch } from "@/lib/api"

interface WorkspaceResumo {
    checkins_hoje: number
    na_fila: number
    em_atendimento: number
    pacientes_novos: number
    requisicoes_pendentes: number
    faturas_em_aberto: number
    recibos_gerados_hoje: number
    recebido_hoje: string
}

interface WorkspaceFilaItem {
    id: number
    id_custom: string
    paciente_id: number
    paciente_nome: string
    paciente_codigo: string
    prioridade: string
    estado: string
    chegou_em: string
    atendente: string
    requisicao_id: number | null
    requisicao_codigo: string
    fatura_id: number | null
    fatura_codigo: string
}

interface WorkspaceRecepcao {
    data: string
    resumo: WorkspaceResumo
    fila: WorkspaceFilaItem[]
}

const EMPTY_WORKSPACE: WorkspaceRecepcao = {
    data: "",
    resumo: {
        checkins_hoje: 0,
        na_fila: 0,
        em_atendimento: 0,
        pacientes_novos: 0,
        requisicoes_pendentes: 0,
        faturas_em_aberto: 0,
        recibos_gerados_hoje: 0,
        recebido_hoje: "0.00",
    },
    fila: [],
}

const atalhos = [
    {
        title: "Registrar paciente",
        description: "Abrir o cadastro clínico e preparar o atendimento.",
        href: "/pacientes",
        icon: UserPlus,
    },
    {
        title: "Criar requisição",
        description: "Encaminhar o paciente direto para a jornada laboratorial.",
        href: "/requisicoes/nova",
        icon: FilePlus2,
    },
    {
        title: "Faturas",
        description: "Abrir o backoffice de faturamento para emissão e revisão.",
        href: "/admin/faturamento/fatura/",
        icon: CreditCard,
    },
    {
        title: "Recibos",
        description: "Consultar recibos já gerados no módulo de pagamentos.",
        href: "/admin/pagamentos/recibo/",
        icon: Receipt,
    },
]

export default function RecepcaoPage() {
    const { loading } = useAuthGuard()
    const [workspace, setWorkspace] = useState<WorkspaceRecepcao>(EMPTY_WORKSPACE)
    const [erro, setErro] = useState<string | null>(null)
    const [carregando, setCarregando] = useState(true)

    useEffect(() => {
        async function carregarWorkspace() {
            try {
                const data = await apiFetch<WorkspaceRecepcao>("/recepcao/workspace/")
                setWorkspace(data || EMPTY_WORKSPACE)
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
        <AppLayout>
            <div className="space-y-6">
                <PageHeader
                    title="Recepção"
                    subtitle="Área de trabalho do balcão para entrada, triagem administrativa e encaminhamento financeiro."
                    actions={
                        <Link
                            href="/admin/recepcao/checkinrecepcao/"
                            className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                            Abrir check-ins no admin
                        </Link>
                    }
                />

                {erro && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {erro}
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <ResumoCard title="Check-ins hoje" value={workspace.resumo.checkins_hoje} icon={Users} />
                    <ResumoCard title="Na fila" value={workspace.resumo.na_fila} icon={ClipboardList} />
                    <ResumoCard title="Em atendimento" value={workspace.resumo.em_atendimento} icon={UserPlus} />
                    <ResumoCard title="Recebido hoje" value={`${workspace.resumo.recebido_hoje} MZN`} icon={Receipt} />
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
                    <Card
                        title="Fila do dia"
                        subtitle="Pacientes que passaram pela recepção hoje."
                    >
                        {carregando ? (
                            <div className="text-sm text-gray-500">Carregando fila...</div>
                        ) : workspace.fila.length === 0 ? (
                            <div className="text-sm text-gray-500">
                                Nenhum check-in aberto hoje. A recepção já pode começar a registrar entradas.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-gray-500">
                                            <th className="pb-3 pr-4 font-medium">Paciente</th>
                                            <th className="pb-3 pr-4 font-medium">Prioridade</th>
                                            <th className="pb-3 pr-4 font-medium">Estado</th>
                                            <th className="pb-3 pr-4 font-medium">Requisição</th>
                                            <th className="pb-3 font-medium">Fatura</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {workspace.fila.map((item) => (
                                            <tr key={item.id} className="border-b last:border-b-0">
                                                <td className="py-3 pr-4">
                                                    <div className="font-medium text-gray-900">{item.paciente_nome}</div>
                                                    <div className="text-xs text-gray-500">{item.paciente_codigo}</div>
                                                </td>
                                                <td className="py-3 pr-4 text-gray-700">{item.prioridade}</td>
                                                <td className="py-3 pr-4 text-gray-700">{item.estado}</td>
                                                <td className="py-3 pr-4 text-gray-700">
                                                    {item.requisicao_codigo || "Pendente"}
                                                </td>
                                                <td className="py-3 text-gray-700">
                                                    {item.fatura_codigo || "Pendente"}
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
                                <IndicadorLinha label="Pacientes novos" value={workspace.resumo.pacientes_novos} />
                                <IndicadorLinha label="Requisições pendentes" value={workspace.resumo.requisicoes_pendentes} />
                                <IndicadorLinha label="Faturas em aberto" value={workspace.resumo.faturas_em_aberto} />
                                <IndicadorLinha label="Recibos gerados hoje" value={workspace.resumo.recibos_gerados_hoje} />
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
                                            className="flex items-start gap-3 rounded-xl border border-gray-200 px-4 py-3 transition hover:border-gray-300 hover:bg-gray-50"
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

function ResumoCard({
    title,
    value,
    icon: Icon,
}: {
    title: string
    value: number | string
    icon: typeof Users
}) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm text-gray-500">{title}</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
                </div>

                <div className="rounded-xl bg-gray-100 p-3 text-gray-700">
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
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-gray-600">{label}</span>
            <span className="font-medium text-gray-900">{value}</span>
        </div>
    )
}
