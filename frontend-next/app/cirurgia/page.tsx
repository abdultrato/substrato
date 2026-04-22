"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ClipboardList, PlusCircle, Scissors, Wrench } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

export default function CirurgiaPage() {
    const { user } = useAuth()
    const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState<string | null>(null)
    const [cirurgias, setCirurgias] = useState<number>(0)
    const [procedimentos, setProcedimentos] = useState<number>(0)

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setLoading(true)
                setErro(null)

                const [cirs, procs] = await Promise.all([
                    apiFetch<any>("/cirurgia/cirurgia/"),
                    apiFetch<any>("/cirurgia/procedimentocirurgico/"),
                ])

                if (!mounted) return
                setCirurgias(extractTotalCount(cirs))
                setProcedimentos(extractTotalCount(procs))
            } catch (e: any) {
                if (!mounted) return
                setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar cirurgia."))
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
                    title="Cirurgia"
                    subtitle="Agendamento e registo de cirurgias."
                    actions={
                        podeVerAdmin ? (
                            <Link
                                href="/admin/surgery/surgery/"
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
                    <MetricCard label="Cirurgias" value={loading ? "..." : cirurgias} />
                    <MetricCard label="Procedimentos (catálogo)" value={loading ? "..." : procedimentos} />
                    <MetricCard label="Em andamento" value="—" hint="Filtro por estado" />
                    <MetricCard label="Concluídas" value="—" hint="Filtro por estado" />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <ActionTile
                        title="Cirurgias"
                        description="Listar e gerir cirurgias (CRUD)."
                        href="/cirurgia/cirurgias"
                        icon={Scissors}
                    />
                    <ActionTile
                        title="Nova cirurgia"
                        description="Criar um agendamento/registo."
                        href="/recursos/cirurgia/cirurgia/novo"
                        icon={PlusCircle}
                    />
                    <ActionTile
                        title="Procedimentos cirúrgicos"
                        description="Gerir catálogo de procedimentos (CRUD)."
                        href="/cirurgia/procedimentos"
                        icon={Wrench}
                    />
                    <ActionTile
                        title="Gerenciamento (API)"
                        description="Acesso direto à interface genérica do módulo."
                        href="/recursos/cirurgia"
                        icon={ClipboardList}
                    />
                </div>

                <Card
                    title="Nota"
                    subtitle="Este é um MVP focado em agendamento e rastreabilidade."
                >
                    <div className="text-sm text-slate-700">
                        A modelagem suporta múltiplos procedimentos por cirurgia e estado (agendada, em andamento, concluída).
                        Se precisar, adicionamos equipe, sala e checklist.
                    </div>
                </Card>
            </div>
        </AppLayout>
    )
}



