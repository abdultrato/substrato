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
                const res = await apiFetch<any>("/monitoramento/erro/")
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
                    title="Monitoramento"
                    subtitle="Erros do sistema e rastreabilidade de falhas."
                    actions={
                        <Link
                            href="/admin/monitoramento/errosistema/"
                            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                        >
                            Abrir no admin
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
                    <MetricCard label="4xx/5xx" value="—" hint="Filtrável na lista" />
                    <MetricCard label="Exceções" value="—" hint="exception_class" />
                    <MetricCard label="Views" value="—" hint="view_basename/action" />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <ActionTile
                        title="Erros do sistema"
                        description="Lista de erros (status, rota, exceção, mensagem)."
                        href="/monitoring/errors"
                        icon={Bug}
                    />
                    <ActionTile
                        title="Gerenciamento (API)"
                        description="Acesso à interface genérica do monitoramento."
                        href="/recursos/monitoramento"
                        icon={ClipboardList}
                    />
                    <ActionTile
                        title="Alertas (Admin)"
                        description="Revisão detalhada no Django Admin."
                        href="/admin/monitoramento/errosistema/"
                        icon={ShieldAlert}
                    />
                </div>

                <Card title="Nota" subtitle="O registro de erros é multi-tenant e guarda traceback/metadata.">
                    <div className="text-sm text-slate-700">
                        Esta área é administrativa. Para produção, recomendamos rotação/retenção e exportação para observabilidade externa.
                    </div>
                </Card>
            </div>
        </AppLayout>
    )
}


