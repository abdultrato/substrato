"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, ClipboardCheck, ClipboardList, FileText, HeartPulse, Pill, Wrench } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"

type TherapyHubPageProps = {
  discipline: "OCCUPATIONAL_THERAPY" | "SPECIALIZED_PHYSIOTHERAPY"
  title: string
  resourceBasePath: "/occupational-therapy" | "/physical-therapy"
  requiredGroups: string[]
}

export default function TherapyHubPage({
  discipline,
  title,
  resourceBasePath,
  requiredGroups,
}: TherapyHubPageProps) {
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resources, setResources] = useState(0)
  const [evaluations, setEvaluations] = useState(0)
  const [plans, setPlans] = useState(0)
  const [goals, setGoals] = useState(0)
  const [sessions, setSessions] = useState(0)
  const [progressNotes, setProgressNotes] = useState(0)
  const [prescriptions, setPrescriptions] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const qs = `?discipline=${discipline}`
        const [resourceRes, evaluationRes, planRes, goalRes, sessionRes, progressRes, prescriptionRes] = await Promise.all([
          apiFetch<any>(`/therapy/resource/${qs}`, { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>(`/therapy/evaluation/${qs}`, { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>(`/therapy/treatment_plan/${qs}`, { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>(`/therapy/goal/${qs}`, { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>(`/therapy/session/${qs}`, { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>(`/therapy/progress_note/${qs}`, { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>(`/therapy/prescription_link/${qs}`, { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setResources(extractTotalCount(resourceRes))
        setEvaluations(extractTotalCount(evaluationRes))
        setPlans(extractTotalCount(planRes))
        setGoals(extractTotalCount(goalRes))
        setSessions(extractTotalCount(sessionRes))
        setProgressNotes(extractTotalCount(progressRes))
        setPrescriptions(extractTotalCount(prescriptionRes))
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : e?.message || t("Falha ao carregar o módulo de Terapias.", "Failed to load the Therapy module.")
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [discipline, safeRefreshToken, t])

  const metricValue = useMemo(() => (loading ? "..." : null), [loading])

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title={title}
          metrics={[
            { label: "Recursos", value: metricValue || resources, href: `${resourceBasePath}/resources` },
            { label: "Avaliações", value: metricValue || evaluations, href: `${resourceBasePath}/evaluations` },
            { label: "Planos", value: metricValue || plans, href: `${resourceBasePath}/treatment-plans` },
            { label: "Objetivos", value: metricValue || goals, href: `${resourceBasePath}/goals` },
            { label: "Sessões", value: metricValue || sessions, href: `${resourceBasePath}/sessions` },
            { label: "Evoluções", value: metricValue || progressNotes, href: `${resourceBasePath}/progress-notes` },
            { label: "Prescrições", value: metricValue || prescriptions, href: `${resourceBasePath}/prescription-links` },
          ]}
          actions={[
            {
              title: "Avaliações",
              description: t("Função, motricidade, cognição, comunicação e AVD.", "Function, motor skills, cognition, communication and ADL."),
              href: `${resourceBasePath}/evaluations`,
              icon: ClipboardCheck,
            },
            {
              title: "Planos de tratamento",
              description: t("Objetivos, frequência, sessões, adaptações e prescrição.", "Goals, frequency, sessions, adaptations and prescription."),
              href: `${resourceBasePath}/treatment-plans`,
              icon: ClipboardList,
            },
            {
              title: "Objetivos",
              description: t("Metas mensuráveis por domínio terapêutico.", "Measurable goals by therapeutic domain."),
              href: `${resourceBasePath}/goals`,
              icon: Activity,
            },
            {
              title: "Sessões",
              description: t("Intervenções realizadas, resposta e orientação domiciliar.", "Performed interventions, response and home guidance."),
              href: `${resourceBasePath}/sessions`,
              icon: HeartPulse,
            },
            {
              title: "Evoluções",
              description: t("Tendência, pontuações funcionais e recomendações.", "Trend, functional scores and recommendations."),
              href: `${resourceBasePath}/progress-notes`,
              icon: FileText,
            },
            {
              title: "Prescrições",
              description: t("Ligação a itens de prescrição médica.", "Link to medical prescription items."),
              href: `${resourceBasePath}/prescription-links`,
              icon: Pill,
            },
            {
              title: "Recursos terapêuticos",
              description: t("Materiais, tecnologias assistivas e equipamentos.", "Materials, assistive technologies and equipment."),
              href: `${resourceBasePath}/resources`,
              icon: Wrench,
            },
          ]}
        />
      </div>
    </AppLayout>
  )
}

export const THERAPY_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.FISIOTERAPIA,
  GROUPS.TERAPIA_OCUPACIONAL,
  GROUPS.FONOAUDIOLOGIA,
]
