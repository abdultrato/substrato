"use client"

import { useEffect, useMemo, useState } from "react"
import { Calculator, ClipboardList, CreditCard, FileText, GraduationCap } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useLanguage } from "@/hooks/useLanguage"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"

export default function CreditFinancingHubPage() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [consortiums, setConsortiums] = useState(0)
  const [procedureFinancings, setProcedureFinancings] = useState(0)
  const [installments, setInstallments] = useState(0)
  const [reimbursements, setReimbursements] = useState(0)
  const [studentFunding, setStudentFunding] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [consortiumRes, procedureRes, installmentRes, reimbursementRes, studentRes] = await Promise.all([
          apiFetch<any>("/credit_financing/consortium/"),
          apiFetch<any>("/credit_financing/procedure_financing/"),
          apiFetch<any>("/credit_financing/installment/"),
          apiFetch<any>("/credit_financing/reimbursement_claim/"),
          apiFetch<any>("/credit_financing/student_funding/"),
        ])

        if (!mounted) return
        setConsortiums(extractTotalCount(consortiumRes))
        setProcedureFinancings(extractTotalCount(procedureRes))
        setInstallments(extractTotalCount(installmentRes))
        setReimbursements(extractTotalCount(reimbursementRes))
        setStudentFunding(extractTotalCount(studentRes))
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : e?.message || t("Falha ao carregar o módulo de créditos.", "Failed to load the credit financing module.")
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
    <AppLayout requiredGroups={CREDIT_FINANCING_GROUPS}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Substrato Créditos e Financiamento"
          subtitle={t(
            "Consórcios de saúde, financiamento de procedimentos, reembolsos, glosas e bolsas estudantis.",
            "Health consortiums, procedure financing, reimbursements, denials and student funding."
          )}
          adminHref="/admin/creditos_financiamento/"
          secondaryCta={{ href: "/credit-financing/consortiums", label: t("Recursos de Crédito", "Credit resources") }}
          metrics={[
            { label: "Consórcios", value: metricValue || consortiums },
            { label: "Financiamentos", value: metricValue || procedureFinancings },
            { label: "Parcelas", value: metricValue || installments },
            { label: "Reembolsos", value: metricValue || reimbursements },
            { label: "Apoios estudantis", value: metricValue || studentFunding },
          ]}
          actions={[
            {
              title: "Consórcios de saúde",
              description: t("Quotas, prestações, contemplação e planos de saúde ou odontológicos.", "Quotas, installments, awards and health or dental plans."),
              href: "/credit-financing/consortiums",
              icon: ClipboardList,
            },
            {
              title: "Financiamento de procedimentos",
              description: t("Parcelamento de procedimentos eletivos com juros e risco controlados.", "Elective procedure installments with controlled interest and risk."),
              href: "/credit-financing/procedure-financing",
              icon: CreditCard,
            },
            {
              title: "Parcelas",
              description: t("Cronograma financeiro, vencimentos, pagamentos parciais e incumprimento.", "Financial schedule, due dates, partial payments and default."),
              href: "/credit-financing/installments",
              icon: Calculator,
            },
            {
              title: "Convênios e reembolsos",
              description: t("Acompanhamento de glosas, recursos administrativos e valores a receber.", "Track denials, administrative appeals and receivables."),
              href: "/credit-financing/reimbursements",
              icon: FileText,
            },
            {
              title: "Bolsas e financiamento estudantil",
              description: t("Cobertura, patrocinadores, propinas, bolsas e crédito académico.", "Coverage, sponsors, tuition, scholarships and academic credit."),
              href: "/credit-financing/student-funding",
              icon: GraduationCap,
            },
          ]}
        />
      </div>
    </AppLayout>
  )
}

export const CREDIT_FINANCING_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.CONTABILIDADE,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.DIRETOR_ESCOLA,
  GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO,
  GROUPS.CREDITO_FINANCIAMENTO,
]
