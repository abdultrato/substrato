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
              description: t("Consultas, cadeira/gabinete e estado do atendimento.", "Appointments, chair/room and care status."),
              href: "/dental/appointments",
              icon: CalendarClock,
            },
            {
              title: "Atendimento clínico",
              description: t("Anamnese, exames intraoral e extraoral, hábitos e observações.", "Anamnesis, intraoral and extraoral exams, habits and observations."),
              href: "/dental/consultations",
              icon: Stethoscope,
            },
            {
              title: "Prontuários dentários",
              description: t("Queixa, histórico, diagnóstico e resumo clínico.", "Complaint, history, diagnosis and clinical summary."),
              href: "/dental/records",
              icon: FileText,
            },
            {
              title: "Mapas odontológicos",
              description: t("Odontogramas por paciente, consulta e tipo de dentição.", "Odontograms by patient, consultation and dentition type."),
              href: "/dental/odontogram-charts",
              icon: ClipboardCheck,
            },
            {
              title: "Odontograma",
              description: t("Condição por dente e face, ligada ao prontuário.", "Condition by tooth and surface, linked to the record."),
              href: "/dental/odontograms",
              icon: ClipboardCheck,
            },
            {
              title: "Diagnósticos",
              description: t("Diagnósticos por consulta, dente e gravidade clínica.", "Diagnoses by consultation, tooth and clinical severity."),
              href: "/dental/diagnoses",
              icon: ClipboardCheck,
            },
            {
              title: "Planos de tratamento",
              description: t("Catálogo de planos, itens e custo estimado.", "Plan catalog, items and estimated cost."),
              href: "/dental/treatment-plans",
              icon: ClipboardList,
            },
            {
              title: "Fases do plano",
              description: t("Urgência, controlo da doença, reabilitação, estética e manutenção.", "Emergency, disease control, rehabilitation, aesthetics and maintenance."),
              href: "/dental/treatment-phases",
              icon: ClipboardList,
            },
            {
              title: "Orçamentos",
              description: t("Propostas financeiras antes da execução clínica.", "Financial proposals before clinical execution."),
              href: "/dental/quotations",
              icon: Calculator,
            },
            {
              title: "Aprovações",
              description: t("Aprovação clínica, financeira e consentimento do paciente.", "Clinical, financial and consent approval by the patient."),
              href: "/dental/approvals",
              icon: ShieldCheck,
            },
            {
              title: "Pagamentos",
              description: t("Sinais, prestações e pagamentos ligados ao plano.", "Deposits, installments and payments linked to the plan."),
              href: "/dental/payments",
              icon: CreditCard,
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
              title: "Procedimentos executados",
              description: t("Execução clínica, materiais, anestesia e notas do dentista.", "Clinical execution, materials, anesthesia and dentist notes."),
              href: "/dental/procedure-executions",
              icon: Stethoscope,
            },
            {
              title: "Laboratório de prótese",
              description: t("Ordens, moldagem, material, estado e entrega.", "Orders, impressions, material, status and delivery."),
              href: "/dental/prosthesis-lab-orders",
              icon: PackageCheck,
            },
            {
              title: "Imagem dentária",
              description: t("Radiografias, CBCT, fotografias e scanners intraorais.", "X-rays, CBCT, photos and intraoral scans."),
              href: "/dental/imaging-orders",
              icon: Microscope,
            },
            {
              title: "Prescrições",
              description: t("Medicação, dose, frequência, duração e instruções.", "Medication, dose, frequency, duration and instructions."),
              href: "/dental/prescriptions",
              icon: Pill,
            },
            {
              title: "Follow-ups",
              description: t("Revisões pós-procedimento, manutenção e retornos.", "Post-procedure reviews, maintenance and returns."),
              href: "/dental/followups",
              icon: CalendarClock,
            },
            {
              title: "Consumo de materiais",
              description: t("Materiais usados no procedimento e ligação ao stock.", "Materials used in procedures and stock linkage."),
              href: "/dental/material-consumptions",
              icon: PackageSearch,
            },
            {
              title: "Evolução clínica",
              description: t("Registos de evolução e próximos passos do tratamento.", "Clinical evolution records and treatment next steps."),
              href: "/dental/clinical-evolutions",
              icon: Activity,
            },
            {
              title: "Faturamento dentário",
              description: t("Itens faturáveis, faturas e ligação aos pagamentos.", "Billable items, invoices and payment linkage."),
              href: "/dental/billing-items",
              icon: Calculator,
            },
            {
              title: "Documentos",
              description: t("Consentimentos, contratos, fotografias e anexos externos.", "Consents, contracts, photos and external attachments."),
              href: "/dental/documents",
              icon: FileText,
            },
            {
              title: "Auditoria dentária",
              description: t("Eventos auditáveis do plano, aprovação, faturamento e execução.", "Auditable events for plans, approvals, billing and execution."),
              href: "/dental/audit-events",
              icon: ShieldCheck,
            },
            {
              title: "Resumo por paciente",
              description: t("Plano ativo, saldo, itens pendentes e próxima consulta.", "Active plan, balance, pending items and next appointment."),
              href: "/dental/patient-plan-summaries",
              icon: Users,
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
