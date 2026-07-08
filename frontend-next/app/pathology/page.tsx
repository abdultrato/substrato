"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Archive,
  BrainCircuit,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  FlaskConical,
  Gauge,
  Microscope,
  PackageCheck,
  PackageSearch,
  Scissors,
  Search,
  ShieldCheck,
} from "lucide-react"

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

const pathologyResources = [
  {
    key: "pedidos",
    endpoint: "/pathology/pedidos/",
    metricLabel: "Pedidos",
    title: "Pedidos",
    description: "Solicitação médica, prioridade, CID e procedência anatómica.",
    href: "/pathology/requests",
    icon: ClipboardList,
  },
  {
    key: "recepcao_amostras",
    endpoint: "/pathology/recepcao_amostras/",
    metricLabel: "Recepção",
    title: "Recepção de amostras",
    description: "Recipientes, fixador, aceitação/rejeição e hora de recepção.",
    href: "/pathology/sample-receptions",
    icon: FlaskConical,
  },
  {
    key: "acessionamento",
    endpoint: "/pathology/acessionamento/",
    metricLabel: "Accessioning",
    title: "Acessionamento",
    description: "Número PAT, sub-amostras, códigos QR/DataMatrix/RFID.",
    href: "/pathology/accessioning",
    icon: PackageCheck,
  },
  {
    key: "macroscopia",
    endpoint: "/pathology/macroscopia/",
    metricLabel: "Macroscopia",
    title: "Macroscopia",
    description: "Peso, dimensões, margens, lesões observadas e cassetes.",
    href: "/pathology/grossing",
    icon: Search,
  },
  {
    key: "processamento",
    endpoint: "/pathology/processamento/",
    metricLabel: "Processamento",
    title: "Processamento",
    description: "Fixação, desidratação, clarificação, parafina e equipamento.",
    href: "/pathology/processing",
    icon: Gauge,
  },
  {
    key: "inclusao",
    endpoint: "/pathology/inclusao/",
    metricLabel: "Inclusão",
    title: "Inclusão em parafina",
    description: "Blocos, cassetes, estação de inclusão e técnico responsável.",
    href: "/pathology/embedding",
    icon: PackageSearch,
  },
  {
    key: "microtomia",
    endpoint: "/pathology/microtomia/",
    metricLabel: "Microtomia",
    title: "Microtomia",
    description: "Espessura do corte, secções, micrótomo e lâminas produzidas.",
    href: "/pathology/microtomy",
    icon: Scissors,
  },
  {
    key: "histologia",
    endpoint: "/pathology/histologia/",
    metricLabel: "Lâminas",
    title: "Gestão de lâminas",
    description: "Criação, estado, localização, bloco, coloração e qualidade.",
    href: "/pathology/histology",
    icon: Microscope,
  },
  {
    key: "coloracoes",
    endpoint: "/pathology/coloracoes/",
    metricLabel: "Colorações",
    title: "Colorações",
    description: "H&E, especiais, lote de reagente, equipamento e preço.",
    href: "/pathology/staining",
    icon: FlaskConical,
  },
  {
    key: "citologia",
    endpoint: "/pathology/citologia/",
    metricLabel: "Citologia",
    title: "Citologia",
    description: "Recepção, preparação, coloração, leitura e interpretação.",
    href: "/pathology/cytology",
    icon: ClipboardCheck,
  },
  {
    key: "imunohistoquimica",
    endpoint: "/pathology/imunohistoquimica/",
    metricLabel: "IHC",
    title: "Imunohistoquímica",
    description: "Marcadores, clones, lote do anticorpo, equipamento e controlo.",
    href: "/pathology/immunohistochemistry",
    icon: FlaskConical,
  },
  {
    key: "molecular",
    endpoint: "/pathology/molecular/",
    metricLabel: "Molecular",
    title: "Patologia molecular",
    description: "PCR, HPV, EGFR, KRAS, BRAF, ALK e NGS.",
    href: "/pathology/molecular",
    icon: BrainCircuit,
  },
  {
    key: "diagnosticos",
    endpoint: "/pathology/diagnosticos/",
    metricLabel: "Diagnóstico",
    title: "Diagnóstico",
    description: "Rascunho, revisão, segunda opinião, patologia digital e IA.",
    href: "/pathology/diagnosis",
    icon: ClipboardCheck,
  },
  {
    key: "laudos",
    endpoint: "/pathology/laudos/",
    metricLabel: "Laudos",
    title: "Laudos",
    description: "Diagnóstico, estadiamento, margens, conclusão e assinatura.",
    href: "/pathology/reports",
    icon: FileText,
  },
  {
    key: "faturacao",
    endpoint: "/pathology/faturacao/",
    metricLabel: "Faturação",
    title: "Faturação",
    description: "Eventos faturáveis por recepção, coloração, IHC e molecular.",
    href: "/pathology/billing",
    icon: CreditCard,
  },
  {
    key: "inventario",
    endpoint: "/pathology/inventario/",
    metricLabel: "Inventário",
    title: "Inventário",
    description: "Reagentes, materiais, lotes, quantidades e custos consumidos.",
    href: "/pathology/inventory",
    icon: PackageCheck,
  },
  {
    key: "controlo_qualidade",
    endpoint: "/pathology/controlo_qualidade/",
    metricLabel: "Qualidade",
    title: "Controlo de qualidade",
    description: "TAT, rejeição, retrabalho, falhas e concordância diagnóstica.",
    href: "/pathology/quality-control",
    icon: ShieldCheck,
  },
  {
    key: "arquivamento",
    endpoint: "/pathology/arquivamento/",
    metricLabel: "Arquivo",
    title: "Arquivamento",
    description: "Blocos, lâminas, fotos, laudos, localização e retenção.",
    href: "/pathology/archives",
    icon: Archive,
  },
] as const

type MetricKey = (typeof pathologyResources)[number]["key"]
type Metrics = Record<MetricKey, number>

const emptyMetrics = Object.fromEntries(pathologyResources.map((resource) => [resource.key, 0])) as Metrics

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
          pathologyResources.map((resource) => apiFetch<any>(resource.endpoint, { clientCache: safeRefreshToken === 0 }))
        )

        if (!mounted) return
        const nextMetrics = { ...emptyMetrics }
        pathologyResources.forEach((resource, index) => {
          nextMetrics[resource.key] = extractTotalCount(responses[index])
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
          metrics={pathologyResources.map((resource) => ({
            label: resource.metricLabel,
            value: metricValue || metrics[resource.key],
            href: resource.href,
          }))}
          actions={pathologyResources.map((resource) => ({
            title: resource.title,
            description: "",
            href: resource.href,
            icon: resource.icon,
          }))}
        />
      </div>
    </AppLayout>
  )
}
