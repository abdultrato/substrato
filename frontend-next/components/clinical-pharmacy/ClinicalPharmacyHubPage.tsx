"use client"

import { useEffect, useMemo, useState } from "react"
import { ClipboardCheck, ClipboardList, FlaskConical, Pill, ShieldCheck } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useLanguage } from "@/hooks/useLanguage"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"

export default function ClinicalPharmacyHubPage() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preparations, setPreparations] = useState(0)
  const [ingredients, setIngredients] = useState(0)
  const [interactionRules, setInteractionRules] = useState(0)
  const [interactionChecks, setInteractionChecks] = useState(0)
  const [controlledMovements, setControlledMovements] = useState(0)
  const [antibioticReviews, setAntibioticReviews] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [preparationRes, ingredientRes, ruleRes, checkRes, controlledRes, antibioticRes] = await Promise.all([
          apiFetch<any>("/clinical_pharmacy/preparation/"),
          apiFetch<any>("/clinical_pharmacy/ingredient/"),
          apiFetch<any>("/clinical_pharmacy/interaction_rule/"),
          apiFetch<any>("/clinical_pharmacy/interaction_check/"),
          apiFetch<any>("/clinical_pharmacy/controlled_movement/"),
          apiFetch<any>("/clinical_pharmacy/antibiotic_review/"),
        ])

        if (!mounted) return
        setPreparations(extractTotalCount(preparationRes))
        setIngredients(extractTotalCount(ingredientRes))
        setInteractionRules(extractTotalCount(ruleRes))
        setInteractionChecks(extractTotalCount(checkRes))
        setControlledMovements(extractTotalCount(controlledRes))
        setAntibioticReviews(extractTotalCount(antibioticRes))
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : e?.message || t("Falha ao carregar o módulo de Farmácia Clínica.", "Failed to load the Clinical Pharmacy module.")
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
    <AppLayout requiredGroups={CLINICAL_PHARMACY_GROUPS}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Substrato Farmácia Clínica"
          subtitle={t(
            "Preparação de quimioterápicos e TPN, terapia IV, interações, controlados e antibiotic stewardship.",
            "Chemotherapy and TPN preparation, IV therapy, interactions, controlled drugs and antibiotic stewardship."
          )}
          adminHref="/admin/farmacia_clinica/"
          secondaryCta={{ href: "/clinical-pharmacy/preparations", label: t("Recursos de Farmácia Clínica", "Clinical Pharmacy resources") }}
          metrics={[
            { label: "Preparações IV", value: metricValue || preparations },
            { label: "Ingredientes", value: metricValue || ingredients },
            { label: "Regras", value: metricValue || interactionRules },
            { label: "Interações", value: metricValue || interactionChecks },
            { label: "Controlados", value: metricValue || controlledMovements },
            { label: "Antibióticos", value: metricValue || antibioticReviews },
          ]}
          actions={[
            {
              title: "Preparações IV",
              description: t("Quimioterapia, TPN, antibióticos IV, estabilidade e dupla verificação.", "Chemotherapy, TPN, IV antibiotics, stability and double check."),
              href: "/clinical-pharmacy/iv-preparations",
              icon: Pill,
            },
            {
              title: "Ingredientes e lotes",
              description: t("Composição rastreada por produto, lote, quantidade e risco.", "Composition tracked by product, lot, quantity and risk."),
              href: "/clinical-pharmacy/ingredients",
              icon: FlaskConical,
            },
            {
              title: "Interações",
              description: t("Regras, verificação farmacêutica, gravidade e conduta.", "Rules, pharmacist check, severity and action taken."),
              href: "/clinical-pharmacy/interactions",
              icon: ClipboardCheck,
            },
            {
              title: "Substâncias controladas",
              description: t("Livro por lote, custódia, saldos e movimentos auditáveis.", "Lot ledger, custody, balances and auditable movements."),
              href: "/clinical-pharmacy/controlled-substances",
              icon: ShieldCheck,
            },
            {
              title: "Stewardship antibiótico",
              description: t("Indicação, cultura, otimização, descalonamento e revisão.", "Indication, culture, optimization, de-escalation and review."),
              href: "/clinical-pharmacy/antibiotic-stewardship",
              icon: ClipboardList,
            },
          ]}
        />
      </div>
    </AppLayout>
  )
}

export const CLINICAL_PHARMACY_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.FARMACIA,
  GROUPS.FARMACIA_CLINICA,
]
