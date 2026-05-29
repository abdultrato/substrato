"use client"

import { useEffect, useMemo, useState } from "react"
import { ClipboardList, FileText, Layers, Microscope, TerminalSquare, Wrench } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useLanguage } from "@/hooks/useLanguage"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"

const REQUIRED_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.LABORATORIO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.RADIOLOGIA,
]

export default function RadiologyPage() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [equipment, setEquipment] = useState(0)
  const [protocols, setProtocols] = useState(0)
  const [studies, setStudies] = useState(0)
  const [series, setSeries] = useState(0)
  const [files, setFiles] = useState(0)
  const [reports, setReports] = useState(0)
  const [pacsEvents, setPacsEvents] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [equipmentRes, protocolRes, studyRes, seriesRes, fileRes, reportRes, pacsRes] = await Promise.all([
          apiFetch<any>("/radiology/equipment/"),
          apiFetch<any>("/radiology/protocol/"),
          apiFetch<any>("/radiology/study/"),
          apiFetch<any>("/radiology/series/"),
          apiFetch<any>("/radiology/file/"),
          apiFetch<any>("/radiology/report/"),
          apiFetch<any>("/radiology/pacs_event/"),
        ])

        if (!mounted) return
        setEquipment(extractTotalCount(equipmentRes))
        setProtocols(extractTotalCount(protocolRes))
        setStudies(extractTotalCount(studyRes))
        setSeries(extractTotalCount(seriesRes))
        setFiles(extractTotalCount(fileRes))
        setReports(extractTotalCount(reportRes))
        setPacsEvents(extractTotalCount(pacsRes))
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : e?.message || t("Falha ao carregar o módulo de Radiologia.", "Failed to load the Radiology module.")
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
    <AppLayout requiredGroups={REQUIRED_GROUPS}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Substrato Radiologia"
          subtitle={t(
            "Raio-X, ultrassom, tomografia, ressonância, laudos e integração PACS.",
            "X-ray, ultrasound, CT, MRI, reports and PACS integration."
          )}
          adminHref="/admin/radiologia/"
          secondaryCta={{ href: "/radiology/studies", label: t("Recursos de Radiologia", "Radiology resources") }}
          metrics={[
            { label: "Equipamentos", value: metricValue || equipment },
            { label: "Protocolos", value: metricValue || protocols },
            { label: "Estudos", value: metricValue || studies },
            { label: "Séries", value: metricValue || series },
            { label: "Ficheiros", value: metricValue || files },
            { label: "Laudos", value: metricValue || reports },
            { label: "Eventos PACS", value: metricValue || pacsEvents },
          ]}
          actions={[
            {
              title: "Estudos de imagem",
              description: t("Pedido, agenda, aquisição, estado e vínculo clínico.", "Order, schedule, acquisition, status and clinical link."),
              href: "/radiology/studies",
              icon: Microscope,
            },
            {
              title: "Protocolos",
              description: t("Modalidade, região anatómica, contraste e instruções.", "Modality, body region, contrast and instructions."),
              href: "/radiology/protocols",
              icon: ClipboardList,
            },
            {
              title: "Equipamentos",
              description: t("Estações, AE Title, localização e controlo de qualidade.", "Stations, AE Title, location and quality control."),
              href: "/radiology/equipment",
              icon: Wrench,
            },
            {
              title: "Séries DICOM",
              description: t("UID da série, contagem de imagens e armazenamento.", "Series UID, image count and storage."),
              href: "/radiology/series",
              icon: Layers,
            },
            {
              title: "Ficheiros de imagem",
              description: t("DICOM, imagens, PDFs e referências no PACS.", "DICOM, images, PDFs and PACS references."),
              href: "/radiology/files",
              icon: FileText,
            },
            {
              title: "Laudos",
              description: t("Achados, impressão, assinatura e resultados críticos.", "Findings, impression, signature and critical results."),
              href: "/radiology/reports",
              icon: FileText,
            },
            {
              title: "Eventos PACS",
              description: t("Worklist, store, query/retrieve, envio de laudo e erros.", "Worklist, store, query/retrieve, report send and errors."),
              href: "/radiology/pacs-events",
              icon: TerminalSquare,
            },
          ]}
        />
      </div>
    </AppLayout>
  )
}
