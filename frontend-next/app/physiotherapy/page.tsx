"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, ClipboardCheck, ClipboardList, FileText, HeartPulse, Stethoscope, Wrench } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"

const REQUIRED_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.FISIOTERAPIA,
]

export default function PhysiotherapyPage() {
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState(0)
  const [assessments, setAssessments] = useState(0)
  const [plans, setPlans] = useState(0)
  const [sessions, setSessions] = useState(0)
  const [progressNotes, setProgressNotes] = useState(0)
  const [deviceUsages, setDeviceUsages] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [deviceRes, assessmentRes, planRes, sessionRes, progressRes, usageRes] = await Promise.all([
          apiFetch<any>("/physiotherapy/device/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/physiotherapy/assessment/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/physiotherapy/treatment_plan/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/physiotherapy/session/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/physiotherapy/progress_note/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/physiotherapy/device_usage/", { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setDevices(extractTotalCount(deviceRes))
        setAssessments(extractTotalCount(assessmentRes))
        setPlans(extractTotalCount(planRes))
        setSessions(extractTotalCount(sessionRes))
        setProgressNotes(extractTotalCount(progressRes))
        setDeviceUsages(extractTotalCount(usageRes))
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : e?.message || t("Falha ao carregar o módulo de Fisioterapia.", "Failed to load the Physiotherapy module.")
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
    <AppLayout requiredGroups={REQUIRED_GROUPS}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Fisioterapia"
          subtitle={t(
            "Avaliação funcional, planos de tratamento, acompanhamento de evolução e gestão de aparelhos.",
            "Functional assessment, treatment plans, progress monitoring and device management."
          )}
          adminHref="/admin/fisioterapia/"
          secondaryCta={{ href: "/physiotherapy/assessments", label: t("Recursos de Fisioterapia", "Physiotherapy resources") }}
          metrics={[
            { label: "Aparelhos", value: metricValue || devices },
            { label: "Avaliações", value: metricValue || assessments },
            { label: "Planos", value: metricValue || plans },
            { label: "Sessões", value: metricValue || sessions },
            { label: "Evoluções", value: metricValue || progressNotes },
            { label: "Usos de aparelho", value: metricValue || deviceUsages },
          ]}
          actions={[
            {
              title: "Avaliações funcionais",
              description: t("Dor, mobilidade, força, equilíbrio e limitações.", "Pain, mobility, strength, balance and limitations."),
              href: "/physiotherapy/assessments",
              icon: ClipboardCheck,
            },
            {
              title: "Planos de tratamento",
              description: t("Objetivos, frequência, sessões e ligação à prescrição médica.", "Goals, frequency, sessions and medical prescription link."),
              href: "/physiotherapy/treatment-plans",
              icon: ClipboardList,
            },
            {
              title: "Intervenções",
              description: t("Exercícios, terapia manual, eletroterapia e instruções.", "Exercises, manual therapy, electrotherapy and instructions."),
              href: "/physiotherapy/interventions",
              icon: Activity,
            },
            {
              title: "Sessões",
              description: t("Execução do plano, dor antes/depois e resposta do paciente.", "Plan execution, before/after pain and patient response."),
              href: "/physiotherapy/sessions",
              icon: HeartPulse,
            },
            {
              title: "Evoluções",
              description: t("Tendência, pontuação funcional e recomendações.", "Trend, functional score and recommendations."),
              href: "/physiotherapy/progress-notes",
              icon: FileText,
            },
            {
              title: "Aparelhos",
              description: t("Equipamentos, manutenção, localização e disponibilidade.", "Devices, maintenance, location and availability."),
              href: "/physiotherapy/devices",
              icon: Wrench,
            },
            {
              title: "Uso de aparelhos",
              description: t("Configurações, duração e resultado por sessão.", "Settings, duration and outcome by session."),
              href: "/physiotherapy/device-usages",
              icon: Stethoscope,
            },
          ]}
        />
      </div>
    </AppLayout>
  )
}
