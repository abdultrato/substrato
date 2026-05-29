"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, ClipboardCheck, ClipboardList, FileText, HeartPulse, Activity } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"

export default function TelemedicineHubPage() {
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [waitingRoom, setWaitingRoom] = useState(0)
  const [devices, setDevices] = useState(0)
  const [vitals, setVitals] = useState(0)
  const [asyncCases, setAsyncCases] = useState(0)
  const [programs, setPrograms] = useState(0)
  const [alerts, setAlerts] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [waitingRes, deviceRes, vitalRes, asyncRes, programRes, alertRes] = await Promise.all([
          apiFetch<any>("/telemedicine/waiting_room/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/telemedicine/device/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/telemedicine/vital_reading/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/telemedicine/async_case/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/telemedicine/program/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/telemedicine/alert/", { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setWaitingRoom(extractTotalCount(waitingRes))
        setDevices(extractTotalCount(deviceRes))
        setVitals(extractTotalCount(vitalRes))
        setAsyncCases(extractTotalCount(asyncRes))
        setPrograms(extractTotalCount(programRes))
        setAlerts(extractTotalCount(alertRes))
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : e?.message || t("Falha ao carregar o módulo de telemedicina.", "Failed to load the telemedicine module.")
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
    <AppLayout requiredGroups={TELEMEDICINE_GROUPS}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Substrato Telemedicina"
          subtitle={t(
            "Sala de espera virtual, triagem preliminar, dispositivos remotos, consulta assíncrona e monitoramento de doenças crónicas.",
            "Virtual waiting room, preliminary triage, remote devices, asynchronous consultation and chronic disease monitoring."
          )}
          adminHref="/admin/telemedicina/"
          secondaryCta={{ href: "/telemedicine/waiting-room", label: t("Recursos de Telemedicina", "Telemedicine resources") }}
          metrics={[
            { label: "Sala virtual", value: metricValue || waitingRoom },
            { label: "Dispositivos", value: metricValue || devices },
            { label: "Leituras", value: metricValue || vitals },
            { label: "Casos assíncronos", value: metricValue || asyncCases },
            { label: "Programas", value: metricValue || programs },
            { label: "Alertas", value: metricValue || alerts },
          ]}
          actions={[
            {
              title: "Sala de espera virtual",
              description: t("Check-in remoto, triagem preliminar, consentimento e acesso à sala de vídeo.", "Remote check-in, preliminary triage, consent and video room access."),
              href: "/telemedicine/waiting-room",
              icon: ClipboardList,
            },
            {
              title: "Dispositivos remotos",
              description: t("Pressão arterial, glicemia, SpO2, wearables, pareamento e última sincronização.", "Blood pressure, glucose, SpO2, wearables, pairing and last sync."),
              href: "/telemedicine/devices",
              icon: Activity,
            },
            {
              title: "Leituras e sinais vitais",
              description: t("Receção de medições, origem dos dados, valores críticos e payloads de integração.", "Measurement intake, data source, critical values and integration payloads."),
              href: "/telemedicine/vitals",
              icon: HeartPulse,
            },
            {
              title: "Consulta assíncrona",
              description: t("Store-and-forward para dermatologia, radiologia, oftalmologia e feridas.", "Store-and-forward for dermatology, radiology, ophthalmology and wound care."),
              href: "/telemedicine/async-cases",
              icon: FileText,
            },
            {
              title: "Programas crónicos",
              description: t("DPCO, hipertensão, diabetes, metas clínicas, revisão e escalonamento.", "COPD, hypertension, diabetes, clinical targets, review and escalation."),
              href: "/telemedicine/chronic-programs",
              icon: ClipboardCheck,
            },
            {
              title: "Alertas clínicos",
              description: t("Limiar vital, dispositivo offline, leitura em falta, reconhecimento e resolução.", "Vital threshold, offline device, missed reading, acknowledgement and resolution."),
              href: "/telemedicine/alerts",
              icon: Bell,
            },
          ]}
        />
      </div>
    </AppLayout>
  )
}

export const TELEMEDICINE_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ENFERMAGEM,
  GROUPS.TELEMEDICINA,
]
