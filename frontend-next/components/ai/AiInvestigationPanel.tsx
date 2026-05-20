"use client"

import Link from "next/link"
import { ArrowRight, Lightbulb, Router, ShieldAlert } from "lucide-react"

import Badge from "@/components/ui/Badge"
import { useLanguage } from "@/hooks/useLanguage"

export type AiInvestigationFinding = {
  severity?: "info" | "warning" | "critical" | string
  title?: string
  detail?: string
  source?: string
}

export type AiInvestigationStep = {
  label?: string
  kind?: string
  href?: string
  priority?: string
}

export type AiInvestigation = {
  id?: number
  custom_id?: string
  title?: string
  question?: string
  intent?: string
  status?: string
  confidence_score?: number
  findings?: AiInvestigationFinding[]
  next_steps?: AiInvestigationStep[]
  recommended_questions?: string[]
  result_summary?: string
  created_at?: string
}

type Props = {
  investigation?: AiInvestigation | null
  onAsk?: (question: string) => void
}

function severityVariant(severity?: string) {
  if (severity === "critical") return "danger"
  if (severity === "warning") return "warning"
  return "info"
}

export default function AiInvestigationPanel({ investigation, onAsk }: Props) {
  const { t } = useLanguage()
  if (!investigation) return null

  const findings = investigation.findings || []
  const nextSteps = investigation.next_steps || []
  const recommendedQuestions = investigation.recommended_questions || []

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/70 text-emerald-950 shadow-sm dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-50">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 px-3 py-2 dark:border-emerald-500/20">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} />
          <span className="text-sm font-semibold">
            {investigation.title || t("Investigação da IA", "AI investigation")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={investigation.status === "blocked" ? "warning" : "success"}>
            {investigation.status || "ready"}
          </Badge>
          <span className="text-xs text-emerald-800/80 dark:text-emerald-100/70">
            {investigation.confidence_score ?? 0}% {t("confiança", "confidence")}
          </span>
        </div>
      </div>

      <div className="grid gap-3 p-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800/70 dark:text-emerald-100/60">
            {t("Achados", "Findings")}
          </div>
          <div className="space-y-2">
            {findings.length ? findings.slice(0, 5).map((finding, index) => (
              <div key={`${finding.title}-${index}`} className="rounded-xl bg-white/70 p-2 text-xs shadow-sm dark:bg-black/15">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{finding.title || t("Achado", "Finding")}</span>
                  <Badge variant={severityVariant(finding.severity)}>{finding.severity || "info"}</Badge>
                </div>
                <p className="mt-1 text-emerald-900/80 dark:text-emerald-50/75">{finding.detail || "—"}</p>
                {finding.source ? (
                  <p className="mt-1 text-[11px] text-emerald-800/60 dark:text-emerald-100/55">{finding.source}</p>
                ) : null}
              </div>
            )) : (
              <p className="text-xs text-emerald-900/75 dark:text-emerald-100/70">
                {t("Sem achados estruturados nesta resposta.", "No structured findings in this answer.")}
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-800/70 dark:text-emerald-100/60">
            <Router size={14} />
            {t("Próximos passos", "Next steps")}
          </div>
          <div className="space-y-2">
            {nextSteps.length ? nextSteps.slice(0, 4).map((step, index) => {
              const content = (
                <>
                  <span>{step.label || t("Dar seguimento", "Follow up")}</span>
                  <ArrowRight size={13} />
                </>
              )
              if (step.href) {
                return (
                  <Link
                    key={`${step.label}-${index}`}
                    href={step.href}
                    prefetch={false}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white/75 px-2.5 py-2 text-xs font-semibold shadow-sm transition hover:bg-white dark:bg-black/15 dark:hover:bg-black/25"
                  >
                    {content}
                  </Link>
                )
              }
              return (
                <div
                  key={`${step.label}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white/60 px-2.5 py-2 text-xs font-semibold shadow-sm dark:bg-black/15"
                >
                  {content}
                </div>
              )
            }) : (
              <div className="flex items-center gap-2 rounded-xl bg-white/60 px-2.5 py-2 text-xs dark:bg-black/15">
                <ShieldAlert size={14} />
                {t("Refine a pergunta para criar próximos passos.", "Refine the question to create next steps.")}
              </div>
            )}
          </div>

          {recommendedQuestions.length ? (
            <div className="mt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800/70 dark:text-emerald-100/60">
                {t("Perguntas recomendadas", "Recommended questions")}
              </div>
              <div className="flex flex-wrap gap-2">
                {recommendedQuestions.slice(0, 3).map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => onAsk?.(question)}
                    className="rounded-full border border-emerald-200 bg-white/75 px-2.5 py-1 text-xs font-medium shadow-sm transition hover:bg-white dark:border-emerald-500/30 dark:bg-black/15 dark:hover:bg-black/25"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
