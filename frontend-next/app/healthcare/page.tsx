"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarClock, ClipboardList, Stethoscope, Users } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { NAV_ITEMS } from "@/components/layout/Sidebar"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { isPathAllowedForScope } from "@/lib/workspaceScope"
import { useLanguage } from "@/hooks/useLanguage"

// Hrefs que são a "porta de entrada" de cada módulo de saúde. Derivamos os
// cartões do hub a partir do NAV_ITEMS (única fonte de verdade partilhada com a
// sidebar), filtrando pelo scope "healthcare" e pelos grupos RBAC do utilizador.
// Estas rotas já constam do NAV_ITEMS com label/descrição/ícone curados; aqui só
// escolhemos quais entram no hub (exclui métricas de topo e back-office).
const HEALTHCARE_HUB_HREFS = [
  "/reception",
  "/patients",
  "/consultations",
  "/requests",
  "/medical-records",
  "/medicine",
  "/nursing",
  "/clinical-laboratory",
  "/pharmacy",
  "/clinical-pharmacy",
  "/telemedicine",
  "/public-health",
  "/dental",
  "/veterinary",
  "/physiotherapy",
  "/occupational-therapy",
  "/radiology",
  "/pathology",
  "/cardiology",
  "/neurology",
  "/ophthalmology",
  "/bloodbank",
  "/maternity",
  "/surgery",
  "/occupational-medicine",
]

const ACCENTS = [
  { accentClass: "border-l-sky-500", iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
  { accentClass: "border-l-emerald-500", iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  { accentClass: "border-l-violet-500", iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
  { accentClass: "border-l-amber-500", iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  { accentClass: "border-l-rose-500", iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
  { accentClass: "border-l-cyan-500", iconClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300" },
]

export default function HealthcarePage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patients, setPatients] = useState(0)
  const [consultations, setConsultations] = useState(0)
  const [requests, setRequests] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [patientsRes, consultationsRes, requestsRes] = await Promise.all([
          apiFetch<any>("/clinical/patient/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/consultations/consultation/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical/labrequest/", { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setPatients(extractTotalCount(patientsRes))
        setConsultations(extractTotalCount(consultationsRes))
        setRequests(extractTotalCount(requestsRes))
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : (e?.message || t("Falha ao carregar a área de Saúde.", "Failed to load the Healthcare workspace."))
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken, t])

  const metricValue = useMemo(() => (loading ? "..." : null), [loading])

  // Cartões do hub: um por módulo de saúde a que o utilizador tem acesso,
  // preservando a ordem de HEALTHCARE_HUB_HREFS e reutilizando os metadados
  // (label/descrição/ícone) do NAV_ITEMS.
  const actions = useMemo(() => {
    const byHref = new Map(NAV_ITEMS.map((item) => [item.href, item]))
    const items = HEALTHCARE_HUB_HREFS
      .map((href) => byHref.get(href))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) => isPathAllowedForScope(item.href, "healthcare"))
      .filter((item) => !item.groups || userHasAnyGroup(user, item.groups))

    return items.map((item, index) => {
      const accent = ACCENTS[index % ACCENTS.length]
      return {
        title: item.label,
        description: t(item.desc || "", item.descEn || item.desc || ""),
        href: item.href,
        icon: item.icon,
        accentClass: accent.accentClass,
        iconClass: accent.iconClass,
      }
    })
  }, [user, t])

  return (
    <AppLayout requiredGroups={[
      GROUPS.ADMIN,
      GROUPS.RECEPCAO,
      GROUPS.ENFERMAGEM,
      GROUPS.MEDICINA,
      GROUPS.MEDICINA_OCUPACIONAL,
      GROUPS.LABORATORIO,
    ]}>
      <div className="space-y-2">
        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Saúde"
          icon={Stethoscope}
          iconClass="bg-violet-500/15 text-violet-600 dark:text-violet-300"
          barClass="bg-violet-500"
          metrics={[
            { label: "Pacientes", value: metricValue || patients, icon: Users, accentClass: "border-l-sky-500", iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300", href: "/patients" },
            { label: "Consultas", value: metricValue || consultations, icon: CalendarClock, accentClass: "border-l-emerald-500", iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", href: "/consultations" },
            { label: "Requisições laboratoriais", value: metricValue || requests, icon: ClipboardList, accentClass: "border-l-violet-500", iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300", href: "/requests" },
          ]}
          actions={actions}
        />
      </div>
    </AppLayout>
  )
}
