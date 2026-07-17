"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarClock, ClipboardList, FlaskConical, Stethoscope, Users } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useLanguage } from "@/hooks/useLanguage"

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
  const canAccessClinicalLaboratory = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.LABORATORIO])
  const actions = [
    {
      title: "Pacientes",
      description: t("Cadastro e histórico clínico.", "Clinical registration and history."),
      href: "/patients",
      icon: Users,
      accentClass: "border-l-sky-500",
      iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    },
    {
      title: "Consultas",
      description: t("Agenda clínica e seguimento.", "Clinical schedule and follow-up."),
      href: "/consultations",
      icon: CalendarClock,
      accentClass: "border-l-emerald-500",
      iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    },
    {
      title: "Requisições",
      description: t("Pedidos laboratoriais e operacionais.", "Laboratory and operational requests."),
      href: "/requests",
      icon: ClipboardList,
      accentClass: "border-l-violet-500",
      iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    },
    ...(canAccessClinicalLaboratory
      ? [
          {
            title: "Laboratório",
            description: t("Registo e validação de resultados.", "Result registration and validation."),
            href: "/clinical-laboratory",
            icon: FlaskConical,
            accentClass: "border-l-amber-500",
            iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
          },
        ]
      : []),
  ]

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
          title="Área Clínica"
          subtitle={t(
            "Pacientes, consultas, requisições e resultados do atendimento assistencial.",
            "Patients, consultations, requests, and results for clinical care."
          )}
          dense
          actionsNowrap
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
