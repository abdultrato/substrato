"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Beaker,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FlaskConical,
  Gauge,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Syringe,
  Timer,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"

export default function ClinicalPharmacyHubPage() {
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preparations, setPreparations] = useState(0)
  const [ingredients, setIngredients] = useState(0)
  const [interactionRules, setInteractionRules] = useState(0)
  const [interactionChecks, setInteractionChecks] = useState(0)
  const [controlledMovements, setControlledMovements] = useState(0)
  const [antibioticReviews, setAntibioticReviews] = useState(0)
  const [urgentPreparations, setUrgentPreparations] = useState(0)
  const [pendingPreparations, setPendingPreparations] = useState(0)
  const [pendingInteractions, setPendingInteractions] = useState(0)
  const [criticalInteractions, setCriticalInteractions] = useState(0)
  const [pendingAntibiotics, setPendingAntibiotics] = useState(0)
  const [controlledWaste, setControlledWaste] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [
          preparationRes,
          ingredientRes,
          ruleRes,
          checkRes,
          controlledRes,
          antibioticRes,
          urgentPreparationRes,
          pendingPreparationRes,
          pendingInteractionRes,
          criticalInteractionRes,
          pendingAntibioticRes,
          controlledWasteRes,
        ] = await Promise.all([
          apiFetch<any>("/clinical_pharmacy/preparation/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical_pharmacy/ingredient/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical_pharmacy/interaction_rule/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical_pharmacy/interaction_check/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical_pharmacy/controlled_movement/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical_pharmacy/antibiotic_review/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical_pharmacy/preparation/?priority=URGENT", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical_pharmacy/preparation/?status=REQUESTED", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical_pharmacy/interaction_check/?status=PENDING", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical_pharmacy/interaction_check/?severity=CONTRAINDICATED", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical_pharmacy/antibiotic_review/?status=PENDING", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical_pharmacy/controlled_movement/?movement_type=WASTE", { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setPreparations(extractTotalCount(preparationRes))
        setIngredients(extractTotalCount(ingredientRes))
        setInteractionRules(extractTotalCount(ruleRes))
        setInteractionChecks(extractTotalCount(checkRes))
        setControlledMovements(extractTotalCount(controlledRes))
        setAntibioticReviews(extractTotalCount(antibioticRes))
        setUrgentPreparations(extractTotalCount(urgentPreparationRes))
        setPendingPreparations(extractTotalCount(pendingPreparationRes))
        setPendingInteractions(extractTotalCount(pendingInteractionRes))
        setCriticalInteractions(extractTotalCount(criticalInteractionRes))
        setPendingAntibiotics(extractTotalCount(pendingAntibioticRes))
        setControlledWaste(extractTotalCount(controlledWasteRes))
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
  }, [safeRefreshToken, t])

  const metricValue = useMemo(() => (loading ? "..." : null), [loading])
  const queueValue = useMemo(() => (loading ? "..." : null), [loading])

  return (
    <AppLayout requiredGroups={CLINICAL_PHARMACY_GROUPS}>
      <div className="space-y-2">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Farmácia Clínica"
          dense
          backHref="/healthcare"
          subtitle={t("Validação farmacêutica, preparações IV, interações, controlados e stewardship.", "Pharmacist validation, IV preparations, interactions, controlled substances and stewardship.")}
          icon={Syringe}
          iconClass="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
          barClass="bg-emerald-500"
          metrics={[
            { label: "Urgentes", value: metricValue || urgentPreparations, href: "/clinical-pharmacy/iv-preparations?priority=URGENT", icon: Timer, accentClass: "border-l-rose-500", iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
            { label: "Por validar", value: metricValue || pendingPreparations, href: "/clinical-pharmacy/iv-preparations?status=REQUESTED", icon: ClipboardCheck, accentClass: "border-l-amber-500", iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
            { label: "Interações pend.", value: metricValue || pendingInteractions, href: "/clinical-pharmacy/interactions?status=PENDING", icon: AlertTriangle, accentClass: "border-l-orange-500", iconClass: "bg-orange-500/15 text-orange-600 dark:text-orange-300" },
            { label: "Críticas", value: metricValue || criticalInteractions, href: "/clinical-pharmacy/interactions?severity=CONTRAINDICATED", icon: ShieldAlert, accentClass: "border-l-red-500", iconClass: "bg-red-500/15 text-red-600 dark:text-red-300" },
            { label: "Antibióticos", value: metricValue || pendingAntibiotics, href: "/clinical-pharmacy/antibiotic-stewardship?status=PENDING", icon: Pill, accentClass: "border-l-cyan-500", iconClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300" },
            { label: "Controlados", value: metricValue || controlledMovements, href: "/clinical-pharmacy/controlled-substances", icon: ShieldCheck, accentClass: "border-l-violet-500", iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
            { label: "Preparações", value: metricValue || preparations, href: "/clinical-pharmacy/iv-preparations", icon: Syringe, accentClass: "border-l-emerald-500", iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
            { label: "Ingredientes", value: metricValue || ingredients, href: "/clinical-pharmacy/ingredients", icon: FlaskConical, accentClass: "border-l-sky-500", iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
            { label: "Regras", value: metricValue || interactionRules, href: "/clinical-pharmacy/interaction-rules", icon: Gauge, accentClass: "border-l-slate-500", iconClass: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
            { label: "Verificações", value: metricValue || interactionChecks, href: "/clinical-pharmacy/interactions", icon: CheckCircle2, accentClass: "border-l-teal-500", iconClass: "bg-teal-500/15 text-teal-600 dark:text-teal-300" },
          ]}
          actions={[
            {
              title: "Fila de preparações IV",
              description: t("Quimioterapia, TPN, antibióticos IV, estabilidade e dupla verificação.", "Chemotherapy, TPN, IV antibiotics, stability and double check."),
              href: "/clinical-pharmacy/iv-preparations",
              icon: Syringe,
              accentClass: "border-l-emerald-500",
              iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
            },
            {
              title: "Composição e lotes",
              description: t("Composição rastreada por produto, lote, quantidade e risco.", "Composition tracked by product, lot, quantity and risk."),
              href: "/clinical-pharmacy/ingredients",
              icon: FlaskConical,
              accentClass: "border-l-sky-500",
              iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
            },
            {
              title: "Regras de interação",
              description: t("Base farmacológica ativa para alertas e recomendações.", "Active pharmacological base for alerts and recommendations."),
              href: "/clinical-pharmacy/interaction-rules",
              icon: Gauge,
              accentClass: "border-l-slate-500",
              iconClass: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
            },
            {
              title: "Verificar interações",
              description: t("Regras, verificação farmacêutica, gravidade e conduta.", "Rules, pharmacist check, severity and action taken."),
              href: "/clinical-pharmacy/interactions",
              icon: ClipboardCheck,
              accentClass: "border-l-orange-500",
              iconClass: "bg-orange-500/15 text-orange-600 dark:text-orange-300",
            },
            {
              title: "Substâncias controladas",
              description: t("Livro por lote, custódia, saldos e movimentos auditáveis.", "Lot ledger, custody, balances and auditable movements."),
              href: "/clinical-pharmacy/controlled-substances",
              icon: ShieldCheck,
              accentClass: "border-l-violet-500",
              iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
            },
            {
              title: "Stewardship antibiótico",
              description: t("Indicação, cultura, otimização, descalonamento e revisão.", "Indication, culture, optimization, de-escalation and review."),
              href: "/clinical-pharmacy/antibiotic-stewardship",
              icon: ClipboardList,
              accentClass: "border-l-cyan-500",
              iconClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
            },
          ]}
        />

        <div className="grid gap-2 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 p-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
            <span className="absolute left-0 top-0 h-full w-1 bg-rose-500" />
            <div className="mb-2 flex items-center gap-2 pl-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-300">
                <AlertTriangle size={15} />
              </span>
              <div>
                <h2 className="text-sm font-semibold leading-tight text-foreground">{t("Fila de segurança medicamentosa", "Medication safety queue")}</h2>
                <p className="text-[11px] text-muted-foreground">{t("Itens que exigem revisão farmacêutica antes da dispensa ou administração.", "Items requiring pharmacist review before dispensing or administration.")}</p>
              </div>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-3">
              {[
                { label: t("Preparações solicitadas", "Requested preparations"), value: pendingPreparations, href: "/clinical-pharmacy/iv-preparations?status=REQUESTED", tone: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200" },
                { label: t("Interações pendentes", "Pending interactions"), value: pendingInteractions, href: "/clinical-pharmacy/interactions?status=PENDING", tone: "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-200" },
                { label: t("Revisões antibióticas", "Antibiotic reviews"), value: pendingAntibiotics, href: "/clinical-pharmacy/antibiotic-stewardship?status=PENDING", tone: "border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-700/40 dark:bg-cyan-900/20 dark:text-cyan-200" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className={`rounded-xl border px-3 py-2 transition hover:brightness-95 ${item.tone}`}>
                  <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{item.label}</div>
                  <div className="mt-1 text-2xl font-bold tabular-nums">{queueValue || item.value}</div>
                </Link>
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 p-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
            <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
            <div className="mb-2 flex items-center gap-2 pl-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-300">
                <Beaker size={15} />
              </span>
              <div>
                <h2 className="text-sm font-semibold leading-tight text-foreground">{t("Rastreabilidade técnica", "Technical traceability")}</h2>
                <p className="text-[11px] text-muted-foreground">{t("Lotes, controlados e descartes auditáveis.", "Lots, controlled substances and auditable waste.")}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Link href="/clinical-pharmacy/controlled-substances" className="rounded-xl border border-white/30 bg-white/35 px-3 py-2 text-foreground transition hover:bg-white/50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Movimentos", "Movements")}</div>
                <div className="mt-1 text-2xl font-bold tabular-nums">{queueValue || controlledMovements}</div>
              </Link>
              <Link href="/clinical-pharmacy/controlled-substances?movement_type=WASTE" className="rounded-xl border border-white/30 bg-white/35 px-3 py-2 text-foreground transition hover:bg-white/50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Descartes", "Waste")}</div>
                <div className="mt-1 text-2xl font-bold tabular-nums">{queueValue || controlledWaste}</div>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  )
}

export const CLINICAL_PHARMACY_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.FARMACIA,
]
