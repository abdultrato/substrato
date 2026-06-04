"use client"

import { useEffect, useMemo, useState } from "react"
import { Archive, ClipboardCheck, FileText, FlaskConical, Gauge, Microscope, Search } from "lucide-react"

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
  GROUPS.LABORATORIO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
]

const pathologyEndpoints = [
  ["recepcao_amostras", "/pathology/recepcao_amostras/"],
  ["macroscopia", "/pathology/macroscopia/"],
  ["processamento", "/pathology/processamento/"],
  ["histologia", "/pathology/histologia/"],
  ["citologia", "/pathology/citologia/"],
  ["imunohistoquimica", "/pathology/imunohistoquimica/"],
  ["laudos", "/pathology/laudos/"],
  ["arquivamento", "/pathology/arquivamento/"],
] as const

type MetricKey = (typeof pathologyEndpoints)[number][0]
type Metrics = Record<MetricKey, number>

const emptyMetrics: Metrics = {
  recepcao_amostras: 0,
  macroscopia: 0,
  processamento: 0,
  histologia: 0,
  citologia: 0,
  imunohistoquimica: 0,
  laudos: 0,
  arquivamento: 0,
}

export default function PathologyPage() {
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const responses = await Promise.all(
          pathologyEndpoints.map(([, endpoint]) => apiFetch<any>(endpoint, { clientCache: safeRefreshToken === 0 }))
        )

        if (!mounted) return
        const nextMetrics = { ...emptyMetrics }
        pathologyEndpoints.forEach(([key], index) => {
          nextMetrics[key] = extractTotalCount(responses[index])
        })
        setMetrics(nextMetrics)
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : e?.message || t("Falha ao carregar o módulo de Patologia.", "Failed to load the Pathology module.")
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
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Patologia"
          subtitle={t(
            "Rastreabilidade de amostras, macroscopia, processamento, histologia, citologia, imunohistoquímica, laudos e arquivamento.",
            "Sample traceability, grossing, processing, histology, cytology, immunohistochemistry, reports and archiving."
          )}
          adminHref="/admin/patologia/"
          secondaryCta={{ href: "/resources/pathology", label: t("Recursos técnicos", "Technical resources") }}
          metrics={[
            { label: "Amostras", value: metricValue || metrics.recepcao_amostras },
            { label: "Macroscopia", value: metricValue || metrics.macroscopia },
            { label: "Processamento", value: metricValue || metrics.processamento },
            { label: "Histologia", value: metricValue || metrics.histologia },
            { label: "Citologia", value: metricValue || metrics.citologia },
            { label: "Imuno-histoquímica", value: metricValue || metrics.imunohistoquimica },
            { label: "Laudos", value: metricValue || metrics.laudos },
            { label: "Arquivos", value: metricValue || metrics.arquivamento },
          ]}
          actions={[
            {
              title: "Recepção de amostras",
              description: t("Entrada, aceitação/rejeição e prioridade da amostra.", "Sample intake, acceptance/rejection and priority."),
              href: "/pathology/sample-receptions",
              icon: FlaskConical,
            },
            {
              title: "Macroscopia",
              description: t("Descrição macroscópica, fragmentos e cassetes.", "Gross description, fragments and cassettes."),
              href: "/pathology/grossing",
              icon: Search,
            },
            {
              title: "Processamento",
              description: t("Lotes, protocolos, processador e reagentes.", "Batches, protocols, processor and reagents."),
              href: "/pathology/processing",
              icon: Gauge,
            },
            {
              title: "Histologia",
              description: t("Lâminas, blocos, coloração e qualidade.", "Slides, blocks, stain and quality."),
              href: "/pathology/histology",
              icon: Microscope,
            },
            {
              title: "Citologia",
              description: t("Adequabilidade, triagem e interpretação citológica.", "Adequacy, screening and cytology interpretation."),
              href: "/pathology/cytology",
              icon: ClipboardCheck,
            },
            {
              title: "Imunohistoquímica",
              description: t("Marcadores, clones, resultados e controlo.", "Markers, clones, results and controls."),
              href: "/pathology/immunohistochemistry",
              icon: FlaskConical,
            },
            {
              title: "Laudos",
              description: t("Diagnóstico, conclusão, assinatura e entrega.", "Diagnosis, conclusion, signature and delivery."),
              href: "/pathology/reports",
              icon: FileText,
            },
            {
              title: "Arquivamento",
              description: t("Blocos, lâminas, localização e retenção.", "Blocks, slides, location and retention."),
              href: "/pathology/archives",
              icon: Archive,
            },
          ]}
        />
      </div>
    </AppLayout>
  )
}
