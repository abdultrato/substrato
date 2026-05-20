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

type TelemetryTotals = {
    errors_total?: number
    client_4xx?: number
    server_5xx?: number
    unique_paths?: number
}

type TelemetryResponse = {
    totals?: TelemetryTotals
    activity_totals?: TelemetryTotals
}

type MonitoringMetrics = {
    totalErrors: number
    client4xx: number
    server5xx: number
    affectedPages: number
}

const AUTO_REFRESH_MS = 60_000
const REPORT_WINDOW_DAYS = 90

const EMPTY_METRICS: MonitoringMetrics = {
    totalErrors: 0,
    client4xx: 0,
    server5xx: 0,
    affectedPages: 0,
}

function toNumber(value: unknown): number {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

export default function MonitoramentoPage() {
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState<string | null>(null)
    const [metrics, setMetrics] = useState<MonitoringMetrics>(EMPTY_METRICS)

    useEffect(() => {
        let mounted = true
        let timer: ReturnType<typeof setInterval> | null = null

        async function load(showSpinner = false) {
            if (showSpinner) setLoading(true)

            const [errorsResult, telemetryResult] = await Promise.allSettled([
                apiFetch<any>("/monitoring/error/", { clientCache: false }),
                apiFetch<TelemetryResponse>(
                    `/monitoring/telemetry/?days=${REPORT_WINDOW_DAYS}&top=10`,
                    { clientCache: false }
                ),
            ])

            if (!mounted) return

            const telemetryTotals =
                telemetryResult.status === "fulfilled" ? telemetryResult.value?.totals || {} : {}
            const activityTotals =
                telemetryResult.status === "fulfilled" ? telemetryResult.value?.activity_totals || {} : {}
            const fallbackTotal =
                errorsResult.status === "fulfilled" ? extractTotalCount(errorsResult.value) : 0
            const telemetryTotalRaw = telemetryTotals.errors_total
            const hasTelemetryTotal = telemetryTotalRaw !== undefined && telemetryTotalRaw !== null
            const telemetryAvailable = telemetryResult.status === "fulfilled"

            const combinedTotal = Math.max(toNumber(telemetryTotals.errors_total), toNumber(activityTotals.errors_total))
            const combined4xx = Math.max(toNumber(telemetryTotals.client_4xx), toNumber(activityTotals.client_4xx))
            const combined5xx = Math.max(toNumber(telemetryTotals.server_5xx), toNumber(activityTotals.server_5xx))
            const combinedPaths = Math.max(toNumber(telemetryTotals.unique_paths), toNumber(activityTotals.unique_paths))

            setMetrics((prev) => ({
                totalErrors: hasTelemetryTotal ? combinedTotal : fallbackTotal,
                client4xx: telemetryAvailable ? combined4xx : prev.client4xx,
                server5xx: telemetryAvailable ? combined5xx : prev.server5xx,
                affectedPages: telemetryAvailable ? combinedPaths : prev.affectedPages,
            }))

            const telemetryError =
                telemetryResult.status === "rejected" ? telemetryResult.reason : null
            const listError = errorsResult.status === "rejected" ? errorsResult.reason : null
            const allFailed = !!telemetryError && !!listError

            if (allFailed) {
                const message = telemetryError?.message || listError?.message || "Falha ao carregar monitorização."
                setErro(isNotFoundLikeError(telemetryError) || isNotFoundLikeError(listError) ? null : message)
            } else {
                setErro(null)
            }

            if (showSpinner) {
                setLoading(false)
            }
        }

        void load(true)
        timer = setInterval(() => {
            void load(false)
        }, AUTO_REFRESH_MS)

        return () => {
            mounted = false
            if (timer) clearInterval(timer)
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
                    <MetricCard
                        label="Erros registados"
                        value={loading ? "..." : metrics.totalErrors}
                        hint="Atualizado automaticamente"
                    />
                    <MetricCard
                        label="Erros do cliente (4xx)"
                        value={loading ? "..." : metrics.client4xx}
                        hint="Filtrável na lista"
                    />
                    <MetricCard
                        label="Erros do servidor (5xx)"
                        value={loading ? "..." : metrics.server5xx}
                        hint="Filtrável na lista"
                    />
                    <MetricCard
                        label="Páginas afetadas"
                        value={loading ? "..." : metrics.affectedPages}
                        hint="Agregado por rota"
                    />
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
                        As métricas combinam erros monitorados e atividade HTTP dos últimos {REPORT_WINDOW_DAYS} dias, com atualização automática a cada {AUTO_REFRESH_MS / 1000} segundos.
                    </div>
                </Card>
            </div>
        </AppLayout>
    )
}



