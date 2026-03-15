"use client"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useEffect, useState } from "react"
import http from "@/lib/http"
import { GROUPS } from "@/lib/rbac"
import {
    ClipboardList,
    FlaskConical,
    Receipt,
    Users,
} from "lucide-react"

interface DashboardStats {
    pacientes: number
    requisicoes_pendentes: number
    exames_hoje: number
    faturamento_hoje: number
}

export default function DashboardPage () {
    const { loading } = useAuthGuard()
    const [stats, setStats] = useState<DashboardStats | null>( null )
    const [error, setError] = useState( false )
    const [hideMoney, setHideMoney] = useState( false )

    useEffect( () => {
        try {
            setHideMoney( window.localStorage.getItem( "substrato_hide_money" ) === "1" )
        } catch {
            // ignore
        }
    }, [] )

    useEffect( () => {
        try {
            window.localStorage.setItem( "substrato_hide_money", hideMoney ? "1" : "0" )
        } catch {
            // ignore
        }
    }, [hideMoney] )

    useEffect( () => {
        async function load () {
            try {
                const { data } = await http.get( "/dashboard/stats/" )
                setStats( data )
            } catch {
                setError( true )
            }
        }
        load()
    }, [] )

    if ( loading ) return null

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.CONTABILIDADE]}>
            <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-800">
                    Dashboard
                </h2>

                {error && (
                    <div className="text-sm text-red-600">
                        Não foi possível carregar os dados.
                    </div>
                )}

                {!stats && !error && (
                    <div className="text-sm text-gray-500">
                        Carregando métricas...
                    </div>
                )}

                {stats && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Pacientes"
                            value={stats.pacientes}
                            icon={Users}
                        />

                        <StatCard
                            title="Requisições Pendentes"
                            value={stats.requisicoes_pendentes}
                            icon={ClipboardList}
                        />

                        <StatCard
                            title="Exames Hoje"
                            value={stats.exames_hoje}
                            icon={FlaskConical}
                        />

                        <StatCard
                            title="Faturamento Hoje"
                            value={`${stats.faturamento_hoje} MZN`}
                            icon={Receipt}
                            isMoney
                            hideMoney={hideMoney}
                            onToggleMoney={() => setHideMoney( ( v ) => !v )}
                        />
                    </div>
                )}
            </div>
        </AppLayout>
    )
}

function StatCard ( {
    title,
    value,
    icon: Icon,
    isMoney,
    hideMoney,
    onToggleMoney,
}: {
    title: string
    value: number | string
    icon: any
    isMoney?: boolean
    hideMoney?: boolean
    onToggleMoney?: () => void
} ) {
    const displayValue =
        isMoney && hideMoney
            ? typeof value === "string"
                ? value.replace( /[0-9]/g, "*" )
                : "********"
            : value

    return (
        <div className="bg-white border rounded-xl p-5 flex items-center justify-between shadow-sm">
            <div>
                <p className="text-sm text-gray-500">{title}</p>
                <p
                    className={ `text-xl font-semibold text-gray-800 mt-1 ${isMoney ? "select-none cursor-pointer" : ""}` }
                    onDoubleClick={ isMoney ? onToggleMoney : undefined }
                    title={ isMoney ? "Duplo clique para ocultar/mostrar valores monetários" : undefined }
                >
                    {displayValue}
                </p>
            </div>

            <div className="bg-gray-100 p-3 rounded-lg">
                <Icon size={22} />
            </div>
        </div>
    )
}
