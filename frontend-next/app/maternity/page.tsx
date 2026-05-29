"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Baby, ClipboardList, PackageSearch, PlusCircle } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

export default function MaternidadePage() {
    const { user } = useAuth()
    const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
    const safeRefreshToken = useSafeDataRefreshSignal()

    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState<string | null>(null)
    const [gestacoes, setGestacoes] = useState<number>(0)

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setLoading(true)
                setErro(null)
                const res = await apiFetch<any>("/maternity/gestacao/", { clientCache: safeRefreshToken === 0 })
                if (!mounted) return
                setGestacoes(extractTotalCount(res))
            } catch (e: any) {
                if (!mounted) return
                setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar maternidade."))
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
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]}>
            <div className="space-y-6">
                <PageHeader
                    title="Maternidade"
                    subtitle="Gestação, berçário, camas e histórico de partos."
                    actions={
                        podeVerAdmin ? (
                            <Link
                                href="/admin/maternity/pregnancy/"
                                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                            >
                                Abrir na Administração
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
                    <MetricCard label="Gestações" value={loading ? "..." : gestacoes} />
                    <MetricCard label="Berçário" value="—" hint="Campos na gestação" />
                    <MetricCard label="Camas" value="—" hint="Campos na gestação" />
                    <MetricCard label="Partos" value="—" hint="Totais/normal/cesariana por gestação" />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <ActionTile
                        title="Gestações"
                        description="Lista e gestão de gestações (CRUD)."
                        href="/maternity/pregnancies"
                        icon={Baby}
                    />
                    <ActionTile
                        title="Criar gestação"
                        description="Criar um registo de gestação para um paciente."
                        href="/maternity/pregnancies/new"
                        icon={PlusCircle}
                    />
                    <ActionTile
                        title="CRUD (API)"
                        description="Acesso direto ao CRUD genérico deste módulo."
                        href="/maternity/pregnancies"
                        icon={ClipboardList}
                    />
                    <ActionTile
                        title="Criar requisição de materiais"
                        description="Solicitar consumíveis à farmácia para rotinas da maternidade."
                        href="/pharmacy/material-requests/new"
                        icon={PackageSearch}
                    />
                </div>

                <Card
                    title="Nota"
                    subtitle="Os campos adicionais (berçário/cama/partos/cesarianas) ficam no modelo Gestação."
                >
                    <div className="text-sm text-slate-700">
                        Para manter o fluxo simples, a criação/edição completa está no CRUD. Em seguida podemos
                        derivar dashboards específicos (ocupação de camas, estatísticas por período, etc.).
                    </div>
                </Card>
            </div>
        </AppLayout>
    )
}



