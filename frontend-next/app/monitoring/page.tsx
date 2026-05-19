"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Bug, ClipboardList, ShieldAlert } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

export default function MonitoramentoPage() {
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState<string | null>(null)
    const [erros, setErros] = useState<number>(0)

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setLoading(true)
                setErro(null)
                const res = await apiFetch<any>("/monitoring/error/")
                if (!mounted) return
                setErros(extractTotalCount(res))
            } catch (e: any) {
                if (!mounted) return
                setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar monitoramento."))
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
        <AppLayout requiredGroups={[GROUPS.ADMIN]}>
            <div className="space-y-6">
                <PageHeader
                    title="Monitorização"
                    subtitle="Acompanhe erros e o estado do sistema."
                    actions={
                        <Link
                            href="/admin/monitoring/systemerror/"
                            className="inline-flex items-center rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
                        >
                            Abrir na Administração
                        </Link>
                    }
                />

                {erro ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {erro}
                    </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Erros registados" value={loading ? "..." : erros} />
                    <MetricCard label="Erros do cliente (4xx)" value="—" hint="Filtrável na lista" />
                    <MetricCard label="Erros do servidor (5xx)" value="—" hint="Filtrável na lista" />
                    <MetricCard label="Páginas afetadas" value="—" hint="Agregado por rota" />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <ActionTile
                        title="Erros do sistema"
                        description="Lista detalhada com rota, código e mensagem."
                        href="/monitoring/errors"
                        icon={Bug}
                    />
                    <ActionTile
                        title="Atividade dos utilizadores"
                        description="Pedidos recentes por utilizador."
                        href="/audit"
                        icon={ClipboardList}
                    />
                    <ActionTile
                        title="Painel de Administração"
                        description="Revisão detalhada e ferramentas avançadas."
                        href="/admin/monitoring/systemerror/"
                        icon={ShieldAlert}
                    />
                </div>

                <Card title="Sobre esta página">
                    <div className="text-sm text-foreground-2">
                        Os registos ficam organizados por organização e incluem o detalhe técnico necessário para investigar cada falha.
                    </div>
                </Card>
            </div>
        </AppLayout>
    )
}



