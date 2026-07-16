"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, Brain, ClipboardList, Eye, FileText, HeartPulse, TerminalSquare, Wrench } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"

type SpecialtyDiagnosticsHubPageProps = {
  specialty: "CARDIOLOGY" | "NEUROLOGY" | "OPHTHALMOLOGY"
  title: string
  resourceBasePath: "/cardiology" | "/neurology" | "/ophthalmology"
  requiredGroups: string[]
}

const SPECIALTY_HEADER_META = {
  CARDIOLOGY: {
    icon: HeartPulse,
    iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    barClass: "bg-rose-500",
  },
  NEUROLOGY: {
    icon: Brain,
    iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    barClass: "bg-violet-500",
  },
  OPHTHALMOLOGY: {
    icon: Eye,
    iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    barClass: "bg-sky-500",
  },
} as const

export default function SpecialtyDiagnosticsHubPage({
  specialty,
  title,
  resourceBasePath,
  requiredGroups,
}: SpecialtyDiagnosticsHubPageProps) {
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [equipment, setEquipment] = useState(0)
  const [protocols, setProtocols] = useState(0)
  const [orders, setOrders] = useState(0)
  const [measurements, setMeasurements] = useState(0)
  const [reports, setReports] = useState(0)
  const [integrationEvents, setIntegrationEvents] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const qs = `?specialty=${specialty}`
        const [equipmentRes, protocolRes, orderRes, measurementRes, reportRes, integrationRes] = await Promise.all([
          apiFetch<any>(`/specialty_diagnostics/equipment/${qs}`, { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>(`/specialty_diagnostics/protocol/${qs}`, { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>(`/specialty_diagnostics/order/${qs}`, { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>(`/specialty_diagnostics/measurement/${qs}`, { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>(`/specialty_diagnostics/report/${qs}`, { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>(`/specialty_diagnostics/integration_event/${qs}`, { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setEquipment(extractTotalCount(equipmentRes))
        setProtocols(extractTotalCount(protocolRes))
        setOrders(extractTotalCount(orderRes))
        setMeasurements(extractTotalCount(measurementRes))
        setReports(extractTotalCount(reportRes))
        setIntegrationEvents(extractTotalCount(integrationRes))
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : e?.message || t("Falha ao carregar diagnósticos especializados.", "Failed to load specialty diagnostics.")
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken, specialty, t])

  const metricValue = useMemo(() => (loading ? "..." : null), [loading])
  const headerMeta = SPECIALTY_HEADER_META[specialty]

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="space-y-2">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title={title}
          dense
          backHref="/healthcare"
          icon={headerMeta.icon}
          iconClass={headerMeta.iconClass}
          barClass={headerMeta.barClass}
          metrics={[
            { label: "Equipamentos", value: metricValue || equipment, href: `${resourceBasePath}/equipment`, icon: Wrench, accentClass: "border-l-slate-500", iconClass: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
            { label: "Protocolos", value: metricValue || protocols, href: `${resourceBasePath}/protocols`, icon: ClipboardList, accentClass: "border-l-violet-500", iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
            { label: "Exames", value: metricValue || orders, href: `${resourceBasePath}/exams`, icon: HeartPulse, accentClass: "border-l-rose-500", iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
            { label: "Medições", value: metricValue || measurements, href: `${resourceBasePath}/measurements`, icon: Activity, accentClass: "border-l-blue-500", iconClass: "bg-blue-500/15 text-blue-600 dark:text-blue-300" },
            { label: "Laudos", value: metricValue || reports, href: `${resourceBasePath}/reports`, icon: FileText, accentClass: "border-l-emerald-500", iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
            { label: "Integrações", value: metricValue || integrationEvents, href: `${resourceBasePath}/integrations`, icon: TerminalSquare, accentClass: "border-l-amber-500", iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
          ]}
          actions={[
            {
              title: "Exames",
              description: t("Pedido, agenda, execução, estado e vínculo clínico.", "Order, schedule, execution, status and clinical link."),
              href: `${resourceBasePath}/exams`,
              icon: HeartPulse,
            },
            {
              title: "Protocolos",
              description: t("Preparação, duração, medições padrão e modelo de laudo.", "Preparation, duration, default measurements and report template."),
              href: `${resourceBasePath}/protocols`,
              icon: ClipboardList,
            },
            {
              title: "Medições",
              description: t("Valores, unidades, intervalos, alterações e críticos.", "Values, units, ranges, abnormalities and critical flags."),
              href: `${resourceBasePath}/measurements`,
              icon: Activity,
            },
            {
              title: "Laudos",
              description: t("Técnica, achados, impressão, assinatura e críticos.", "Technique, findings, impression, signature and critical results."),
              href: `${resourceBasePath}/reports`,
              icon: FileText,
            },
            {
              title: "Equipamentos",
              description: t("Estações, localização, série e controlo de qualidade.", "Stations, location, serial number and quality control."),
              href: `${resourceBasePath}/equipment`,
              icon: Wrench,
            },
            {
              title: "Integrações",
              description: t("Worklist, importação de equipamento, sincronização e erros.", "Worklist, device import, synchronization and errors."),
              href: `${resourceBasePath}/integrations`,
              icon: TerminalSquare,
            },
          ]}
        />
      </div>
    </AppLayout>
  )
}

export const SPECIALTY_DIAGNOSTICS_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.CARDIOLOGIA,
  GROUPS.NEUROLOGIA,
  GROUPS.OFTALMOLOGIA,
]
