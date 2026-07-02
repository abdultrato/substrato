"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  CalendarClock,
  Loader2,
  Stethoscope,
  User,
  Users,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { abbreviateMiddleNames } from "@/lib/formatName"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import { routeParamToString } from "@/lib/routeParams"

type Row = Record<string, any>

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const AVATAR_TONES: { grad: string; bar: string; badge: string }[] = [
  { grad: "from-sky-500 to-blue-600", bar: "bg-sky-500", badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300" },
  { grad: "from-emerald-500 to-teal-600", bar: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300" },
  { grad: "from-violet-500 to-purple-600", bar: "bg-violet-500", badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300" },
  { grad: "from-amber-500 to-orange-600", bar: "bg-amber-500", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300" },
  { grad: "from-rose-500 to-pink-600", bar: "bg-rose-500", badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300" },
]

function toneFor(id: any) {
  const n = Number(id) || String(id).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return AVATAR_TONES[Math.abs(n) % AVATAR_TONES.length]
}

function fmtDateTime(value: any): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function consultationStatusMeta(status: string, t: (pt: string, en: string) => string) {
  switch (String(status || "").toUpperCase()) {
    case "CONCLUIDA":
      return { label: t("Concluída", "Completed"), badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300" }
    case "CANCELADA":
      return { label: t("Cancelada", "Cancelled"), badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300" }
    case "PAGA":
      return { label: t("Paga", "Paid"), badge: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-700/30 dark:bg-cyan-900/20 dark:text-cyan-300" }
    default:
      return { label: t("Agendada", "Scheduled"), badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300" }
  }
}

export default function ConsultationsDoctorsDetailPage() {
  const params = useParams()
  const id = routeParamToString(params?.id)
  const { t } = useLanguage()
  const { loading: authLoading } = useAuthGuard()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [doctor, setDoctor] = useState<Row | null>(null)
  const [consultations, setConsultations] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [doctorResponse, consultationsResponse] = await Promise.all([
        apiFetch<Row>(`/consultations/doctors/${id}/`, { clientCache: safeRefreshToken === 0 }),
        apiFetch<any>(`/consultations/consultation/?doctor=${encodeURIComponent(id)}&page_size=6&ordering=-scheduled_for`, { clientCache: safeRefreshToken === 0 }),
      ])
      const items = consultationsResponse?.results ?? consultationsResponse
      setDoctor(doctorResponse || null)
      setConsultations(Array.isArray(items) ? items : [])
    } catch (e: any) {
      setError(
        isNotFoundLikeError(e)
          ? t("Médico não encontrado.", "Doctor not found.")
          : e?.message || t("Falha ao carregar médico.", "Failed to load doctor."),
      )
    } finally {
      setLoading(false)
    }
  }, [id, safeRefreshToken, t])

  useEffect(() => {
    load()
  }, [load])

  const tone = useMemo(() => toneFor(id), [id])
  const name = String(doctor?.name || `${t("Médico", "Doctor")} ${id || ""}`).trim()
  const role = String(doctor?.role_name || "").trim()
  const profession = String(doctor?.profession_name || "").trim()
  const primaryRole = role || profession || t("Profissional clínico", "Clinical professional")
  const initial = name.charAt(0).toUpperCase() || "?"
  const completedCount = consultations.filter((row) => String(row?.status || "").toUpperCase() === "CONCLUIDA").length
  const scheduledCount = consultations.filter((row) => !["CONCLUIDA", "CANCELADA"].includes(String(row?.status || "").toUpperCase())).length
  const summaryText = role && profession
    ? `${t("Atua como", "Works as")} ${role} ${t("com profissão base", "with")} ${profession}.`
    : role
      ? `${t("Atua como", "Works as")} ${role}.`
      : profession
        ? `${t("Profissão registada:", "Recorded profession:")} ${profession}.`
        : t("Sem cargo ou profissão detalhados no registo.", "No role or profession detailed in the record.")

  if (authLoading) return null

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("consultations")}>
      <div className="space-y-1.5">
        {loading ? (
          <div className={`${GLASS} flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground`}>
            <Loader2 size={16} className="animate-spin" /> {t("A carregar…", "Loading…")}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : doctor ? (
          <>
            <section className={`relative overflow-hidden ${GLASS}`}>
              <span className={`absolute left-0 top-0 h-full w-1 ${tone.bar}`} />
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tone.grad} text-lg font-bold text-white shadow-md`}>
                    {initial}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-lg font-bold leading-tight text-foreground">{abbreviateMiddleNames(name)}</h1>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.badge}`}>{primaryRole}</span>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{doctor?.custom_id || `#${doctor?.id ?? id}`}</p>
                  </div>
                </div>
                <Link
                  href="/consultations/doctors"
                  className="group inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/40 py-1.5 pl-1.5 pr-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:border-white/40 hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 transition group-hover:-translate-x-0.5 dark:text-sky-400">
                    <ArrowLeft size={14} />
                  </span>
                  {t("Médicos", "Doctors")}
                </Link>
              </div>
            </section>

            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: User, label: t("Nome completo", "Full name"), value: name },
                { icon: Stethoscope, label: t("Cargo", "Role"), value: role || "—" },
                { icon: User, label: t("Profissão", "Profession"), value: profession || "—" },
                { icon: CalendarClock, label: t("Consultas recentes", "Recent consultations"), value: String(consultations.length) },
              ].map((item, index) => (
                <section key={index} className={`relative overflow-hidden ${GLASS}`}>
                  <span className={`absolute left-0 top-0 h-full w-1 ${tone.bar}`} />
                  <div className="px-3 py-2 pl-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <item.icon size={12} /> {item.label}
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium text-foreground">{item.value}</div>
                  </div>
                </section>
              ))}
            </div>

            <div className="grid gap-1.5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <section className={`relative overflow-hidden ${GLASS}`}>
                <span className={`absolute left-0 top-0 h-full w-1 ${tone.bar}`} />
                <div className="space-y-3 px-4 py-3 pl-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("Resumo profissional", "Professional summary")}
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {summaryText}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-700/30 dark:bg-emerald-900/15">
                      <div className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">{t("Concluídas", "Completed")}</div>
                      <div className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100">{completedCount}</div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-700/30 dark:bg-amber-900/15">
                      <div className="text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300">{t("Em aberto", "Open")}</div>
                      <div className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100">{scheduledCount}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/20 bg-white/35 p-3 text-[11px] text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]">
                    {t("Este detalhe usa os dados reais do cadastro do médico e agrega as últimas consultas associadas para dar contexto operacional imediato.", "This detail uses the real doctor record and aggregates recent consultations to provide immediate operational context.")}
                  </div>
                </div>
              </section>

              <section className={`relative overflow-hidden ${GLASS}`}>
                <span className="absolute left-0 top-0 h-full w-1 bg-sky-500" />
                <div className="space-y-2 px-4 py-3 pl-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Users size={13} /> {t("Últimas consultas", "Latest consultations")}
                    </div>
                    <span className="rounded-full border border-white/25 bg-white/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground dark:border-white/10 dark:bg-white/[0.05]">
                      {consultations.length}
                    </span>
                  </div>

                  {consultations.length ? (
                    <div className="space-y-1.5">
                      {consultations.map((row) => {
                        const meta = consultationStatusMeta(String(row?.status || ""), t)
                        return (
                          <Link
                            key={row?.id}
                            href={`/consultations/medical-consultations/${row?.id}`}
                            className="block rounded-xl border border-white/20 bg-white/35 px-3 py-2 transition hover:border-white/40 hover:bg-white/55 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">{row?.patient_name || t("Sem paciente", "No patient")}</span>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>{meta.label}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              <span className="font-mono">{row?.custom_id || `#${row?.id}`}</span>
                              <span>{fmtDateTime(row?.scheduled_for)}</span>
                              {row?.specialty_name ? <span>{row.specialty_name}</span> : null}
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/25 bg-white/20 px-4 py-8 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]">
                      {t("Nenhuma consulta recente encontrada para este médico.", "No recent consultations found for this doctor.")}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}
