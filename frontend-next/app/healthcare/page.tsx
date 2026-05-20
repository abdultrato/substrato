"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarClock, ClipboardList, FlaskConical, Users } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useLanguage } from "@/hooks/useLanguage"

export default function HealthcarePage() {
  const { t } = useLanguage()
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
          apiFetch<any>("/clinical/patient/"),
          apiFetch<any>("/consultations/consultation/"),
          apiFetch<any>("/clinical/labrequest/"),
          apiFetch<any>("/clinical/resultitem/"),
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
            : (e?.message || t("Falha ao carregar o workspace Healthcare.", "Failed to load the Healthcare workspace."))
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [t])

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
          title="Substrato Healthcare"
          subtitle={t(
            "Domínio clínico com o mesmo padrão visual do Education.",
            "Clinical domain with the same visual standard as Education."
          )}
          adminHref="/admin/"
          secondaryCta={{ href: "/patients", label: t("Abrir Pacientes", "Open Patients") }}
          metrics={[
            { label: "Patients", value: metricValue || patients },
            { label: "Consultations", value: metricValue || consultations },
            { label: "Lab Requests", value: metricValue || requests },
            { label: "Result Items", value: metricValue || results },
          ]}
          actions={[
            {
              title: "Patients",
              description: t("Cadastro e histórico clínico.", "Clinical registration and history."),
              href: "/patients",
              icon: Users,
            },
            {
              title: "Consultations",
              description: t("Agenda clínica e seguimento.", "Clinical schedule and follow-up."),
              href: "/consultations",
              icon: CalendarClock,
            },
            {
              title: "Requests",
              description: t("Pedidos laboratoriais e operacionais.", "Laboratory and operational requests."),
              href: "/requests",
              icon: ClipboardList,
            },
            {
              title: "Laboratory",
              description: t("Registo e validação de resultados.", "Result registration and validation."),
              href: "/laboratory",
              icon: FlaskConical,
            },
          ]}
        />
      </div>
    </AppLayout>
  )
}
