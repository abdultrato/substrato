"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ClipboardList, ScrollText, Pill, PlusCircle } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

export default function ProntuarioPage() {
    const { user } = useAuth()
    const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState<string | null>(null)
    const [cardex, setCardex] = useState<number>(0)
    const [itensPrescricao, setItensPrescricao] = useState<number>(0)

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setLoading(true)
                setErro(null)

                const [registros, itens] = await Promise.all([
                    apiFetch<any>("/prontuario/registro/"),
                    apiFetch<any>("/prontuario/prescricaoitem/"),
                ])

                if (!mounted) return
                setCardex(extractTotalCount(registros))
                setItensPrescricao(extractTotalCount(itens))
            } catch (e: any) {
                if (!mounted) return
                setErro(e?.message || "Falha ao carregar prontuário.")
            } finally {
                if (mounted) setLoading(false)
            }
        }
        load()
        return () => {
            mounted = false
        }
    }, [])

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]}>
            <div className="space-y-6">
                <PageHeader
                    title="Prontuário"
                    subtitle="Cardex e prescrição estruturada."
                    actions={
                        podeVerAdmin ? (
                            <Link
                                href="/admin/prontuario/registroprontuario/"
                                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                            >
                                Abrir no admin
                            </Link>
                        ) : null
                    }
                />

                {erro ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {erro}
                    </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Cardex (registros)" value={loading ? "..." : cardex} />
                    <MetricCard label="Itens de prescrição" value={loading ? "..." : itensPrescricao} />
                    <MetricCard label="Consultas" value="—" hint="Vínculo via many-to-many" />
                    <MetricCard label="História clínica" value="—" hint="Visão agregada por paciente" />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <ActionTile
                        title="Cardex"
                        description="Listar e gerir registros (CRUD)."
                        href="/prontuario/cardex"
                        icon={ScrollText}
                    />
                    <ActionTile
                        title="Novo Cardex"
                        description="Criar registro de cardex para um paciente."
                        href="/recursos/prontuario/registro/novo"
                        icon={PlusCircle}
                    />
                    <ActionTile
                        title="Itens de prescrição"
                        description="Gerir prescrição estruturada (CRUD)."
                        href="/prontuario/prescricoes"
                        icon={Pill}
                    />
                    <ActionTile
                        title="Gerenciamento (API)"
                        description="Acesso direto à interface genérica do prontuário."
                        href="/recursos/prontuario"
                        icon={ClipboardList}
                    />
                </div>

                <Card
                    title="Atalho por paciente"
                    subtitle="A história clínica já agrega Cardex, requisições, enfermaria, farmácia e faturamento."
                >
                    <div className="text-sm text-slate-700">
                        Use a página do paciente e clique em <strong>História clínica</strong> para ver tudo consolidado.
                    </div>
                </Card>
            </div>
        </AppLayout>
    )
}
