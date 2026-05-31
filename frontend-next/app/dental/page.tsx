"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarClock, ClipboardCheck, ClipboardList, FileText, PackageCheck, Stethoscope, Users } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"
import { useLanguage } from "@/hooks/useLanguage"

export default function DentalPage() {
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [procedures, setProcedures] = useState(0)
  const [appointments, setAppointments] = useState(0)
  const [records, setRecords] = useState(0)
  const [treatmentPlans, setTreatmentPlans] = useState(0)
  const [validPatientPlans, setValidPatientPlans] = useState(0)
  const [expiredPatientPlans, setExpiredPatientPlans] = useState(0)
  const [labOrders, setLabOrders] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [procedureRes, appointmentRes, recordRes, planRes, validPlanRes, expiredPlanRes, labOrderRes] = await Promise.all([
          apiFetch<any>("/dental/procedure/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/appointment/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/record/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/treatment_plan/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/patient_treatment_plan/?validity=valid", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/patient_treatment_plan/?validity=expired", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/prosthesis_lab_order/", { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setProcedures(extractTotalCount(procedureRes))
        setAppointments(extractTotalCount(appointmentRes))
        setRecords(extractTotalCount(recordRes))
        setTreatmentPlans(extractTotalCount(planRes))
        setValidPatientPlans(extractTotalCount(validPlanRes))
        setExpiredPatientPlans(extractTotalCount(expiredPlanRes))
        setLabOrders(extractTotalCount(labOrderRes))
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : e?.message || t("Falha ao carregar o módulo de Odontologia.", "Failed to load the Dental module.")
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
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.ODONTOLOGIA]}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Odontologia"
          subtitle={t(
            "Fluxo especializado para atendimento dentário, odontograma, tratamento e prótese.",
            "Specialized flow for dental care, odontogram, treatment and prosthesis."
          )}
          adminHref="/admin/odontologia/"
          secondaryCta={{ href: "/dental/appointments", label: t("Recursos de Odontologia", "Dental resources") }}
          metrics={[
            { label: "Procedimentos", value: metricValue || procedures },
            { label: "Consultas", value: metricValue || appointments },
            { label: "Prontuários", value: metricValue || records },
            { label: "Planos", value: metricValue || treatmentPlans },
            { label: "Planos válidos", value: metricValue || validPatientPlans },
            { label: "Planos expirados", value: metricValue || expiredPatientPlans },
            { label: "Ordens de prótese", value: metricValue || labOrders },
          ]}
          actions={[
            {
              title: "Agenda dentária",
              description: t("Consultas, cadeira/gabinete e estado do atendimento.", "Appointments, chair/room and care status."),
              href: "/dental/appointments",
              icon: CalendarClock,
            },
            {
              title: "Prontuários dentários",
              description: t("Queixa, histórico, diagnóstico e resumo clínico.", "Complaint, history, diagnosis and clinical summary."),
              href: "/dental/records",
              icon: FileText,
            },
            {
              title: "Odontograma",
              description: t("Condição por dente e face, ligada ao prontuário.", "Condition by tooth and surface, linked to the record."),
              href: "/dental/odontograms",
              icon: ClipboardCheck,
            },
            {
              title: "Planos de tratamento",
              description: t("Catálogo de planos, itens e custo estimado.", "Plan catalog, items and estimated cost."),
              href: "/dental/treatment-plans",
              icon: ClipboardList,
            },
            {
              title: "Pacientes com plano válido",
              description: t("Pacientes com plano dentário ativo dentro da vigência.", "Patients with active dental plans within validity."),
              href: "/dental/patient-treatment-plans/valid",
              icon: Users,
            },
            {
              title: "Pacientes com plano expirado",
              description: t("Pacientes cujo plano dentário expirou.", "Patients whose dental plan has expired."),
              href: "/dental/patient-treatment-plans/expired",
              icon: Users,
            },
            {
              title: "Itens do plano",
              description: t("Itens pertencentes ao plano dentário, sem paciente direto.", "Items belonging to the dental plan, without direct patient ownership."),
              href: "/dental/treatment-items",
              icon: Stethoscope,
            },
            {
              title: "Laboratório de prótese",
              description: t("Ordens, moldagem, material, estado e entrega.", "Orders, impressions, material, status and delivery."),
              href: "/dental/prosthesis-lab-orders",
              icon: PackageCheck,
            },
            {
              title: "Catálogo de procedimentos",
              description: t("Preços, duração e indicação de laboratório.", "Prices, duration and laboratory requirement."),
              href: "/dental/procedures",
              icon: Stethoscope,
            },
          ]}
        />
      </div>
    </AppLayout>
  )
}
