"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  Calculator,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  Microscope,
  PackageCheck,
  PackageSearch,
  Pill,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react"

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
  const [consultations, setConsultations] = useState(0)
  const [treatmentPlans, setTreatmentPlans] = useState(0)
  const [quotations, setQuotations] = useState(0)
  const [payments, setPayments] = useState(0)
  const [executions, setExecutions] = useState(0)
  const [validPatientPlans, setValidPatientPlans] = useState(0)
  const [expiredPatientPlans, setExpiredPatientPlans] = useState(0)
  const [labOrders, setLabOrders] = useState(0)
  const [billingItems, setBillingItems] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [
          procedureRes,
          appointmentRes,
          consultationRes,
          recordRes,
          planRes,
          quotationRes,
          paymentRes,
          executionRes,
          validPlanRes,
          expiredPlanRes,
          labOrderRes,
          billingItemRes,
        ] = await Promise.all([
          apiFetch<any>("/dental/procedure/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/appointment/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/consultation/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/record/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/treatment_plan/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/quotation/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/payment/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/procedure_execution/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/patient_treatment_plan/?validity=valid", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/patient_treatment_plan/?validity=expired", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/prosthesis_lab_order/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/dental/billing_item/", { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setProcedures(extractTotalCount(procedureRes))
        setAppointments(extractTotalCount(appointmentRes))
        setConsultations(extractTotalCount(consultationRes))
        setRecords(extractTotalCount(recordRes))
        setTreatmentPlans(extractTotalCount(planRes))
        setQuotations(extractTotalCount(quotationRes))
        setPayments(extractTotalCount(paymentRes))
        setExecutions(extractTotalCount(executionRes))
        setValidPatientPlans(extractTotalCount(validPlanRes))
        setExpiredPatientPlans(extractTotalCount(expiredPlanRes))
        setLabOrders(extractTotalCount(labOrderRes))
        setBillingItems(extractTotalCount(billingItemRes))
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
            "Fluxo especializado para agenda, consulta, odontograma, plano, orçamento, pagamento, execução e acompanhamento.",
            "Specialized flow for scheduling, consultation, odontogram, plan, quotation, payment, execution and follow-up."
          )}
          adminHref="/admin/odontologia/"
          secondaryCta={{ href: "/dental/appointments", label: t("Recursos de Odontologia", "Dental resources") }}
          metrics={[
            { label: "Procedimentos", value: metricValue || procedures },
            { label: "Consultas", value: metricValue || appointments },
            { label: "Atendimentos", value: metricValue || consultations },
            { label: "Prontuários", value: metricValue || records },
            { label: "Planos", value: metricValue || treatmentPlans },
            { label: "Orçamentos", value: metricValue || quotations },
            { label: "Pagamentos", value: metricValue || payments },
            { label: "Execuções", value: metricValue || executions },
            { label: "Planos válidos", value: metricValue || validPatientPlans },
            { label: "Planos expirados", value: metricValue || expiredPatientPlans },
            { label: "Ordens de prótese", value: metricValue || labOrders },
            { label: "Itens faturáveis", value: metricValue || billingItems },
          ]}
          actions={[
            {
              title: "Agenda dentária",
              href: "/dental/appointments",
              icon: CalendarClock,
            },
            {
              title: "Atendimento clínico",
              href: "/dental/consultations",
              icon: Stethoscope,
            },
            {
              title: "Prontuários dentários",
              href: "/dental/records",
              icon: FileText,
            },
            {
              title: "Mapas odontológicos",
              href: "/dental/odontogram-charts",
              icon: ClipboardCheck,
            },
            {
              title: "Odontograma",
              href: "/dental/odontograms",
              icon: ClipboardCheck,
            },
            {
              title: "Diagnósticos",
              href: "/dental/diagnoses",
              icon: ClipboardCheck,
            },
            {
              title: "Planos de tratamento",
              href: "/dental/treatment-plans",
              icon: ClipboardList,
            },
            {
              title: "Fases do plano",
              href: "/dental/treatment-phases",
              icon: ClipboardList,
            },
            {
              title: "Orçamentos",
              href: "/dental/quotations",
              icon: Calculator,
            },
            {
              title: "Aprovações",
              href: "/dental/approvals",
              icon: ShieldCheck,
            },
            {
              title: "Pagamentos",
              href: "/dental/payments",
              icon: CreditCard,
            },
            {
              title: "Pacientes com plano válido",
              href: "/dental/patient-treatment-plans/valid",
              icon: Users,
            },
            {
              title: "Pacientes com plano expirado",
              href: "/dental/patient-treatment-plans/expired",
              icon: Users,
            },
            {
              title: "Itens do plano",
              href: "/dental/treatment-items",
              icon: Stethoscope,
            },
            {
              title: "Procedimentos executados",
              href: "/dental/procedure-executions",
              icon: Stethoscope,
            },
            {
              title: "Laboratório de prótese",
              href: "/dental/prosthesis-lab-orders",
              icon: PackageCheck,
            },
            {
              title: "Imagem dentária",
              href: "/dental/imaging-orders",
              icon: Microscope,
            },
            {
              title: "Prescrições",
              href: "/dental/prescriptions",
              icon: Pill,
            },
            {
              title: "Follow-ups",
              href: "/dental/followups",
              icon: CalendarClock,
            },
            {
              title: "Consumo de materiais",
              href: "/dental/material-consumptions",
              icon: PackageSearch,
            },
            {
              title: "Evolução clínica",
              href: "/dental/clinical-evolutions",
              icon: Activity,
            },
            {
              title: "Faturamento dentário",
              href: "/dental/billing-items",
              icon: Calculator,
            },
            {
              title: "Documentos",
              href: "/dental/documents",
              icon: FileText,
            },
            {
              title: "Auditoria dentária",
              href: "/dental/audit-events",
              icon: ShieldCheck,
            },
            {
              title: "Resumo por paciente",
              href: "/dental/patient-plan-summaries",
              icon: Users,
            },
            {
              title: "Catálogo de procedimentos",
              href: "/dental/procedures",
              icon: Stethoscope,
            },
          ]}
        />
      </div>
    </AppLayout>
  )
}
