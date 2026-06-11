"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarClock, ClipboardList, FlaskConical, Users } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useLanguage } from "@/hooks/useLanguage"

export default function HealthcarePage() {
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patients, setPatients] = useState(0)
  const [consultations, setConsultations] = useState(0)
  const [requests, setRequests] = useState(0)
  const [results, setResults] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [patientsRes, consultationsRes, requestsRes, resultsRes] = await Promise.all([
          apiFetch<any>("/clinical/patient/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/consultations/consultation/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical/labrequest/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical/resultitem/", { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setPatients(extractTotalCount(patientsRes))
        setConsultations(extractTotalCount(consultationsRes))
        setRequests(extractTotalCount(requestsRes))
        setResults(extractTotalCount(resultsRes))
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

  return (
    <AppLayout requiredGroups={[
      GROUPS.ADMIN,
      GROUPS.RECEPCAO,
      GROUPS.ENFERMAGEM,
      GROUPS.MEDICINA,
      GROUPS.MEDICINA_OCUPACIONAL,
      GROUPS.LABORATORIO,
    ]}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Substrato Saúde"
          adminHref="/admin/"
          secondaryCta={{ href: "/patients", label: t("Abrir pacientes", "Open Patients") }}
          metrics={[
            { label: "Pacientes", value: metricValue || patients },
            { label: "Consultas", value: metricValue || consultations },
            { label: "Requisições laboratoriais", value: metricValue || requests },
            { label: "Itens de resultado", value: metricValue || results },
          ]}
          actions={[
            {
              title: "Pacientes",
              description: t("Cadastro e histórico clínico.", "Clinical registration and history."),
              href: "/patients",
              icon: Users,
            },
            {
              title: "Consultas",
              description: t("Agenda clínica e seguimento.", "Clinical schedule and follow-up."),
              href: "/consultations",
              icon: CalendarClock,
            },
            {
              title: "Requisições",
              description: t("Pedidos laboratoriais e operacionais.", "Laboratory and operational requests."),
              href: "/requests",
              icon: ClipboardList,
            },
            {
              title: "Laboratório",
              description: t("Registo e validação de resultados.", "Result registration and validation."),
              href: "/clinical-laboratory",
              icon: FlaskConical,
            },
          ]}
        />
      </div>
    </AppLayout>
  )
}
