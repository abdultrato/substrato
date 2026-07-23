"use client"

import { useEffect, useMemo, useState } from "react"
import { ClipboardList, FileText, Layers, Microscope, TerminalSquare, Wrench } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"

const REQUIRED_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RADIOLOGIA,
]

export default function RadiologyPage() {
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
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
          apiFetch<any>("/radiology/equipment/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/radiology/protocol/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/radiology/study/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/radiology/series/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/radiology/file/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/radiology/report/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/radiology/pacs_event/", { clientCache: safeRefreshToken === 0 }),
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
          title="Radiologia"
          icon={Microscope}
          iconClass="bg-sky-500/15 text-sky-600 dark:text-sky-300"
          barClass="bg-sky-500"
          dense
          metricsNowrap
          actionsNowrap
          metrics={[
            { label: "Equipamentos", value: metricValue || equipment, icon: Wrench, accentClass: "border-l-slate-500", iconClass: "bg-slate-500/15 text-slate-600 dark:text-slate-300", href: "/radiology/equipment" },
            { label: "Protocolos", value: metricValue || protocols, icon: ClipboardList, accentClass: "border-l-amber-500", iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300", href: "/radiology/protocols" },
            { label: "Estudos", value: metricValue || studies, icon: Microscope, accentClass: "border-l-sky-500", iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300", href: "/radiology/studies" },
            { label: "Séries", value: metricValue || series, icon: Layers, accentClass: "border-l-violet-500", iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300", href: "/radiology/series" },
            { label: "Ficheiros", value: metricValue || files, icon: FileText, accentClass: "border-l-emerald-500", iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", href: "/radiology/files" },
            { label: "Laudos", value: metricValue || reports, icon: FileText, accentClass: "border-l-rose-500", iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300", href: "/radiology/reports" },
            { label: "Eventos PACS", value: metricValue || pacsEvents, icon: TerminalSquare, accentClass: "border-l-cyan-500", iconClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300", href: "/radiology/pacs-events" },
          ]}
          actions={[
            {
              title: "Estudos de imagem",
              description: t("Pedido, agenda, aquisição, estado e vínculo clínico.", "Order, schedule, acquisition, status and clinical link."),
              href: "/radiology/studies",
              icon: Microscope,
              accentClass: "border-l-sky-500",
              iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
            },
            {
              title: "Protocolos",
              description: t("Modalidade, região anatómica, contraste e instruções.", "Modality, body region, contrast and instructions."),
              href: "/radiology/protocols",
              icon: ClipboardList,
              accentClass: "border-l-amber-500",
              iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
            },
            {
              title: "Equipamentos",
              description: t("Estações, AE Title, localização e controlo de qualidade.", "Stations, AE Title, location and quality control."),
              href: "/radiology/equipment",
              icon: Wrench,
              accentClass: "border-l-slate-500",
              iconClass: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
            },
            {
              title: "Séries DICOM",
              description: t("UID da série, contagem de imagens e armazenamento.", "Series UID, image count and storage."),
              href: "/radiology/series",
              icon: Layers,
              accentClass: "border-l-violet-500",
              iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
            },
            {
              title: "Ficheiros de imagem",
              description: t("DICOM, imagens, PDFs e referências no PACS.", "DICOM, images, PDFs and PACS references."),
              href: "/radiology/files",
              icon: FileText,
              accentClass: "border-l-emerald-500",
              iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
            },
            {
              title: "Laudos",
              description: t("Achados, impressão, assinatura e resultados críticos.", "Findings, impression, signature and critical results."),
              href: "/radiology/reports",
              icon: FileText,
              accentClass: "border-l-rose-500",
              iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
            },
            {
              title: "Eventos PACS",
              description: t("Worklist, store, query/retrieve, envio de laudo e erros.", "Worklist, store, query/retrieve, report send and errors."),
              href: "/radiology/pacs-events",
              icon: TerminalSquare,
              accentClass: "border-l-cyan-500",
              iconClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
            },
          ]}
        />
      </div>
    </AppLayout>
  )
}
