"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, CalendarClock, ClipboardCheck, ClipboardList, FileText, HeartPulse, Stethoscope, Wrench } from "lucide-react"

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
  const [consultations, setConsultations] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [deviceRes, assessmentRes, planRes, sessionRes, progressRes, usageRes, consultationRes] = await Promise.all([
          apiFetch<any>("/physiotherapy/device/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/physiotherapy/assessment/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/physiotherapy/treatment_plan/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/physiotherapy/session/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/physiotherapy/progress_note/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/physiotherapy/device_usage/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/consultations/consultation/?sector=PHYSIOTHERAPY", { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setDevices(extractTotalCount(deviceRes))
        setAssessments(extractTotalCount(assessmentRes))
        setPlans(extractTotalCount(planRes))
        setSessions(extractTotalCount(sessionRes))
        setProgressNotes(extractTotalCount(progressRes))
        setDeviceUsages(extractTotalCount(usageRes))
        setConsultations(extractTotalCount(consultationRes))
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
      <div className="space-y-2">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Fisioterapia"
          dense
          backHref="/healthcare"
          icon={Activity}
          iconClass="bg-orange-500/15 text-orange-600 dark:text-orange-300"
          barClass="bg-orange-500"
          metrics={[
            { label: "Aparelhos", value: metricValue || devices, href: "/physiotherapy/devices", icon: Wrench, accentClass: "border-l-slate-500", iconClass: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
            { label: "Consultas", value: metricValue || consultations, href: "/consultations?sector=PHYSIOTHERAPY", icon: CalendarClock, accentClass: "border-l-cyan-500", iconClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300" },
            { label: "Avaliações", value: metricValue || assessments, href: "/physiotherapy/assessments", icon: ClipboardCheck, accentClass: "border-l-orange-500", iconClass: "bg-orange-500/15 text-orange-600 dark:text-orange-300" },
            { label: "Planos", value: metricValue || plans, href: "/physiotherapy/treatment-plans", icon: ClipboardList, accentClass: "border-l-violet-500", iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
            { label: "Sessões", value: metricValue || sessions, href: "/physiotherapy/sessions", icon: HeartPulse, accentClass: "border-l-rose-500", iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
            { label: "Evoluções", value: metricValue || progressNotes, href: "/physiotherapy/progress-notes", icon: FileText, accentClass: "border-l-emerald-500", iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
            { label: "Usos de aparelho", value: metricValue || deviceUsages, href: "/physiotherapy/device-usages", icon: Stethoscope, accentClass: "border-l-cyan-500", iconClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300" },
          ]}
          actions={[
            {
              title: "Consultas",
              description: t("Consultas marcadas para este sector clínico.", "Consultations scheduled for this clinical sector."),
              href: "/consultations?sector=PHYSIOTHERAPY",
              icon: CalendarClock,
            },
            {
              title: "Avaliações funcionais",
              description: t("Escalas, mobilidade, dor e capacidade funcional.", "Scales, mobility, pain and functional capacity."),
              href: "/physiotherapy/assessments",
              icon: ClipboardCheck,
            },
            {
              title: "Planos de tratamento",
              description: t("Objectivos, frequência, duração e protocolos terapêuticos.", "Goals, frequency, duration and therapeutic protocols."),
              href: "/physiotherapy/treatment-plans",
              icon: ClipboardList,
            },
            {
              title: "Intervenções",
              description: t("Técnicas, exercícios, recursos aplicados e resposta clínica.", "Techniques, exercises, resources applied and clinical response."),
              href: "/physiotherapy/interventions",
              icon: Activity,
            },
            {
              title: "Sessões",
              description: t("Atendimentos executados, evolução e presença do paciente.", "Performed sessions, progress and patient attendance."),
              href: "/physiotherapy/sessions",
              icon: HeartPulse,
            },
            {
              title: "Evoluções",
              description: t("Notas de progresso, ganhos funcionais e recomendações.", "Progress notes, functional gains and recommendations."),
              href: "/physiotherapy/progress-notes",
              icon: FileText,
            },
            {
              title: "Aparelhos",
              description: t("Equipamentos terapêuticos, disponibilidade e manutenção.", "Therapeutic equipment, availability and maintenance."),
              href: "/physiotherapy/devices",
              icon: Wrench,
            },
            {
              title: "Uso de aparelhos",
              description: t("Registo de utilização por sessão, paciente e aparelho.", "Usage record by session, patient and device."),
              href: "/physiotherapy/device-usages",
              icon: Stethoscope,
            },
          ]}
        />
      </div>
    </AppLayout>
  )
}
