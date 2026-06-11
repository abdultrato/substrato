"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarClock, ClipboardCheck, ClipboardList, FileText, FlaskConical, HeartPulse, Pill, ShieldCheck } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"
import { useLanguage } from "@/hooks/useLanguage"

export default function VeterinaryPage() {
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [animals, setAnimals] = useState(0)
  const [appointments, setAppointments] = useState(0)
  const [records, setRecords] = useState(0)
  const [vaccinations, setVaccinations] = useState(0)
  const [labRequests, setLabRequests] = useState(0)
  const [admissions, setAdmissions] = useState(0)
  const [prescriptions, setPrescriptions] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [animalRes, appointmentRes, recordRes, vaccinationRes, labRequestRes, admissionRes, prescriptionRes] =
          await Promise.all([
            apiFetch<any>("/veterinary/animal/", { clientCache: safeRefreshToken === 0 }),
            apiFetch<any>("/veterinary/appointment/", { clientCache: safeRefreshToken === 0 }),
            apiFetch<any>("/veterinary/record/", { clientCache: safeRefreshToken === 0 }),
            apiFetch<any>("/veterinary/vaccination/", { clientCache: safeRefreshToken === 0 }),
            apiFetch<any>("/veterinary/lab_request/", { clientCache: safeRefreshToken === 0 }),
            apiFetch<any>("/veterinary/admission/", { clientCache: safeRefreshToken === 0 }),
            apiFetch<any>("/veterinary/prescription/", { clientCache: safeRefreshToken === 0 }),
          ])

        if (!mounted) return
        setAnimals(extractTotalCount(animalRes))
        setAppointments(extractTotalCount(appointmentRes))
        setRecords(extractTotalCount(recordRes))
        setVaccinations(extractTotalCount(vaccinationRes))
        setLabRequests(extractTotalCount(labRequestRes))
        setAdmissions(extractTotalCount(admissionRes))
        setPrescriptions(extractTotalCount(prescriptionRes))
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : e?.message || t("Falha ao carregar o módulo de Medicina Veterinária.", "Failed to load the Veterinary module.")
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
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.VETERINARIA]}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Veterinária"
          subtitle={t(
            "Fluxo veterinário para animais, vacinação, laboratório, internamento e prescrição.",
            "Veterinary flow for animals, vaccination, laboratory, admission and prescription."
          )}
          adminHref="/admin/veterinaria/"
          secondaryCta={{ href: "/veterinary/animals", label: t("Recursos de Veterinária", "Veterinary resources") }}
          metrics={[
            { label: "Animais", value: metricValue || animals },
            { label: "Consultas", value: metricValue || appointments },
            { label: "Prontuários", value: metricValue || records },
            { label: "Vacinações", value: metricValue || vaccinations },
            { label: "Requisições laboratoriais", value: metricValue || labRequests },
            { label: "Internamentos", value: metricValue || admissions },
            { label: "Receitas", value: metricValue || prescriptions },
          ]}
          actions={[
            {
              title: "Animais",
              description: "",
              href: "/veterinary/animals",
              icon: HeartPulse,
            },
            {
              title: "Agenda veterinária",
              description: "",
              href: "/veterinary/appointments",
              icon: CalendarClock,
            },
            {
              title: "Prontuários",
              description: "",
              href: "/veterinary/records",
              icon: FileText,
            },
            {
              title: "Vacinação",
              description: "",
              href: "/veterinary/vaccinations",
              icon: ShieldCheck,
            },
            {
              title: "Exames laboratoriais",
              description: "",
              href: "/veterinary/lab-requests",
              icon: FlaskConical,
            },
            {
              title: "Internamentos",
              description: "",
              href: "/veterinary/admissions",
              icon: ClipboardList,
            },
            {
              title: "Receitas",
              description: "",
              href: "/veterinary/prescriptions",
              icon: Pill,
            },
            {
              title: "Itens laboratoriais",
              description: "",
              href: "/veterinary/lab-request-items",
              icon: ClipboardCheck,
            },
          ]}
        />
      </div>
    </AppLayout>
  )
}
