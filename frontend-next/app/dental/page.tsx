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
  const [sectorConsultations, setSectorConsultations] = useState(0)
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
          sectorConsultationRes,
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
          apiFetch<any>("/consultations/consultation/?sector=DENTISTRY", { clientCache: safeRefreshToken === 0 }),
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
        setSectorConsultations(extractTotalCount(sectorConsultationRes))
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
      <div className="space-y-2">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Odontologia"
          dense
          backHref="/healthcare"
          icon={Stethoscope}
          iconClass="bg-cyan-500/15 text-cyan-600 dark:text-cyan-300"
          barClass="bg-cyan-500"
          metrics={[
            { label: "Consultas", value: metricValue || sectorConsultations, href: "/consultations?sector=DENTISTRY", icon: CalendarClock, accentClass: "border-l-cyan-500", iconClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300" },
            { label: "Agenda", value: metricValue || appointments, href: "/dental/appointments", icon: CalendarClock, accentClass: "border-l-sky-500", iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
            { label: "Atendimentos", value: metricValue || consultations, href: "/dental/consultations", icon: Stethoscope, accentClass: "border-l-teal-500", iconClass: "bg-teal-500/15 text-teal-600 dark:text-teal-300" },
            { label: "Procedimentos", value: metricValue || procedures, href: "/dental/procedures", icon: ClipboardCheck, accentClass: "border-l-violet-500", iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
            { label: "Prontuários", value: metricValue || records, href: "/dental/records", icon: FileText, accentClass: "border-l-slate-500", iconClass: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
            { label: "Planos", value: metricValue || treatmentPlans, href: "/dental/treatment-plans", icon: ClipboardList, accentClass: "border-l-emerald-500", iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
            { label: "Orçamentos", value: metricValue || quotations, href: "/dental/quotations", icon: Calculator, accentClass: "border-l-amber-500", iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
            { label: "Pagamentos", value: metricValue || payments, href: "/dental/payments", icon: CreditCard, accentClass: "border-l-rose-500", iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
            { label: "Execuções", value: metricValue || executions, href: "/dental/procedure-executions", icon: Activity, accentClass: "border-l-orange-500", iconClass: "bg-orange-500/15 text-orange-600 dark:text-orange-300" },
            { label: "Planos válidos", value: metricValue || validPatientPlans, href: "/dental/patient-treatment-plans/valid", icon: Users, accentClass: "border-l-emerald-500", iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
            { label: "Planos expirados", value: metricValue || expiredPatientPlans, href: "/dental/patient-treatment-plans/expired", icon: Users, accentClass: "border-l-amber-500", iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
            { label: "Prótese", value: metricValue || labOrders, href: "/dental/prosthesis-lab-orders", icon: PackageCheck, accentClass: "border-l-indigo-500", iconClass: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300" },
            { label: "Itens faturáveis", value: metricValue || billingItems, href: "/dental/billing-items", icon: Calculator, accentClass: "border-l-pink-500", iconClass: "bg-pink-500/15 text-pink-600 dark:text-pink-300" },
          ]}
          actions={[
            {
              title: "Consultas",
              description: t("Consultas marcadas para o sector de odontologia.", "Consultations scheduled for the dental sector."),
              href: "/consultations?sector=DENTISTRY",
              icon: CalendarClock,
            },
            {
              title: "Agenda dentária",
              description: t("Marcações clínicas, presença e fluxo diário.", "Clinical appointments, attendance and daily flow."),
              href: "/dental/appointments",
              icon: CalendarClock,
            },
            {
              title: "Atendimento clínico",
              description: t("Registo clínico do atendimento odontológico.", "Clinical record of dental care."),
              href: "/dental/consultations",
              icon: Stethoscope,
            },
            {
              title: "Prontuários dentários",
              description: t("Histórico dentário, documentos e informação clínica.", "Dental history, documents and clinical information."),
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
