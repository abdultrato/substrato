"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, CalendarClock, Loader2, Save, Stethoscope } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import MoneyValue from "@/components/ui/MoneyValue"
import SearchableSelect from "@/components/ui/SearchableSelect"
import TextAreaInput from "@/components/ui/TextAreaInput"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/hooks/useLanguage"
import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { abbreviateMiddleNames } from "@/lib/formatName"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import { routeParamToString } from "@/lib/routeParams"

type Row = Record<string, any>

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

function toLocalInput(value: any): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function MedicalConsultationEditPage() {
  const params = useParams()
  const id = routeParamToString(params?.id)
  const router = useRouter()
  const { t } = useLanguage()
  const { loading: authLoading } = useAuthGuard()
  const { user } = useAuth()

  const canWrite = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
  ])

  const [row, setRow] = useState<Row | null>(null)
  const [patients, setPatients] = useState<Row[]>([])
  const [doctors, setDoctors] = useState<Row[]>([])
  const [specialties, setSpecialties] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Form state
  const [patientId, setPatientId] = useState("")
  const [doctorId, setDoctorId] = useState("")
  const [specialtyId, setSpecialtyId] = useState("")
  const [scheduledFor, setScheduledFor] = useState("")
  const [manualHoliday, setManualHoliday] = useState(false)
  const [description, setDescription] = useState("")
  const [pricePreview, setPricePreview] = useState<Row | null>(null)

  const listOf = (v: any) => (v && v.results ? v.results : v) || []

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [rec, pRes, dRes, sRes] = await Promise.all([
        apiFetch<Row>(`/consultations/consultation/${id}/`),
        apiFetch<any>("/clinical/patients/"),
        apiFetch<any>("/consultations/doctors/"),
        apiFetch<any>("/consultations/specialty/"),
      ])
      setRow(rec || null)
      setPatients(Array.isArray(listOf(pRes)) ? listOf(pRes) : [])
      setDoctors(Array.isArray(listOf(dRes)) ? listOf(dRes) : [])
      setSpecialties(Array.isArray(listOf(sRes)) ? listOf(sRes) : [])
      if (rec) {
        setPatientId(rec.patient ? String(rec.patient) : "")
        setDoctorId(rec.doctor ? String(rec.doctor) : "")
        setSpecialtyId(rec.specialty ? String(rec.specialty) : "")
        setScheduledFor(toLocalInput(rec.scheduled_for))
        setManualHoliday(Boolean(rec.manual_holiday))
        setDescription(rec.description || "")
      }
    } catch (e: any) {
      setError(
        isNotFoundLikeError(e)
          ? t("Consulta não encontrada.", "Consultation not found.")
          : e?.message || t("Falha ao carregar a consulta.", "Failed to load the consultation."),
      )
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => { load() }, [load])

  const patientOptions = useMemo(
    () => patients.map((p) => ({ value: String(p.id), label: p.name || `${t("Paciente", "Patient")} ${p.id}` })),
    [patients, t],
  )
  const doctorOptions = useMemo(
    () => doctors.map((m) => ({ value: String(m.id), label: m.name || `${t("Médico", "Doctor")} ${m.id}`, hint: m.role_name || m.profession_name || undefined })),
    [doctors, t],
  )
  const specialtyOptions = useMemo(
    () => specialties.filter((x) => x.active !== false).map((s) => ({ value: String(s.id), label: s.name || `${t("Especialidade", "Specialty")} ${s.id}` })),
    [specialties, t],
  )

  // Pré-visualização de preço conforme especialidade/data/feriado.
  useEffect(() => {
    let mounted = true
    async function loadPreview() {
      if (!specialtyId) { if (mounted) setPricePreview(null); return }
      try {
        const p = new URLSearchParams()
        p.set("specialty", String(specialtyId))
        if (scheduledFor) {
          const d = new Date(scheduledFor)
          p.set("scheduled_for", Number.isNaN(d.getTime()) ? scheduledFor : d.toISOString())
        }
        if (manualHoliday) p.set("manual_holiday", "true")
        const res = await apiFetch<Row>(`/consultations/consultation/price/?${p.toString()}`)
        if (mounted) setPricePreview(res || null)
      } catch { if (mounted) setPricePreview(null) }
    }
    loadPreview()
    return () => { mounted = false }
  }, [specialtyId, scheduledFor, manualHoliday])

  const onSubmit = useCallback(async (e: any) => {
    e.preventDefault()
    if (!id || !canWrite) return
    setFormError(null)
    if (!patientId) { setFormError(t("Selecione um paciente.", "Select a patient.")); return }
    if (!specialtyId) { setFormError(t("Selecione uma especialidade.", "Select a specialty.")); return }
    setSaving(true)
    try {
      const payload: Row = {
        patient: Number(patientId),
        specialty: Number(specialtyId),
        doctor: doctorId ? Number(doctorId) : null,
        manual_holiday: manualHoliday,
        description: description || "",
      }
      if (scheduledFor) {
        const d = new Date(scheduledFor)
        payload.scheduled_for = Number.isNaN(d.getTime()) ? scheduledFor : d.toISOString()
      }
      await apiFetch(`/consultations/consultation/${id}/`, { method: "PATCH", body: JSON.stringify(payload) })
      router.push(`/consultations/medical-consultations/${id}`)
    } catch (err: any) {
      setFormError(err?.message || t("Falha ao guardar alterações.", "Failed to save changes."))
    } finally {
      setSaving(false)
    }
  }, [id, canWrite, patientId, specialtyId, doctorId, manualHoliday, description, scheduledFor, router, t])

  const setNow = useCallback(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    setScheduledFor(now.toISOString().slice(0, 16))
  }, [])

  if (authLoading) return null

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("consultations")}>
      <div className="mx-auto max-w-3xl space-y-1.5">
        <Link
          href={id ? `/consultations/medical-consultations/${id}` : "/consultations/medical-consultations"}
          className="group inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/40 py-1.5 pl-1.5 pr-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:border-white/40 hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 transition group-hover:-translate-x-0.5 dark:text-indigo-400">
            <ArrowLeft size={14} />
          </span>
          {t("Voltar ao detalhe", "Back to detail")}
        </Link>

        {loading ? (
          <div className={`${GLASS} px-4 py-6 text-sm text-muted-foreground`}>{t("A carregar…", "Loading…")}</div>
        ) : error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : row ? (
          <>
            {/* Hero */}
            <section className={`relative overflow-hidden ${GLASS}`}>
              <span className="absolute left-0 top-0 h-full w-1 bg-indigo-500" />
              <div className="flex items-center gap-2.5 px-4 py-3 pl-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
                  <Stethoscope size={17} />
                </span>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold leading-tight text-foreground">{t("Editar consulta", "Edit consultation")}</h1>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{row.custom_id || `#${row.id}`} · {abbreviateMiddleNames(row.patient_name)}</p>
                </div>
              </div>
            </section>

            {!canWrite ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {t("Sem permissão para editar consultas.", "No permission to edit consultations.")}
              </div>
            ) : (
              <form onSubmit={onSubmit} className={`${GLASS} space-y-3 p-4`}>
                {formError ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">{formError}</div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">{t("Paciente", "Patient")}</label>
                    <SearchableSelect
                      value={patientId}
                      onChange={setPatientId}
                      options={patientOptions}
                      placeholder={t("Pesquisar…", "Search…")}
                      searchPlaceholder={t("Pesquisar paciente…", "Search patient…")}
                      emptyMessage={t("Nenhum paciente.", "No patient.")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">{t("Médico", "Doctor")}</label>
                    <SearchableSelect
                      value={doctorId}
                      onChange={setDoctorId}
                      options={doctorOptions}
                      allowClear
                      placeholder={t("Opcional", "Optional")}
                      searchPlaceholder={t("Pesquisar médico…", "Search doctor…")}
                      emptyMessage={t("Nenhum médico.", "No doctor.")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">{t("Especialidade", "Specialty")}</label>
                    <SearchableSelect
                      value={specialtyId}
                      onChange={setSpecialtyId}
                      options={specialtyOptions}
                      placeholder={t("Selecione", "Select")}
                      searchPlaceholder={t("Pesquisar…", "Search…")}
                      emptyMessage={t("Nenhuma especialidade.", "No specialty.")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">{t("Preço c/ IVA", "Price incl. VAT")}</label>
                    <div className="flex h-[38px] items-center rounded-lg border border-border bg-muted/40 px-3 text-sm font-semibold text-foreground tabular-nums">
                      {pricePreview?.price_with_vat ? <MoneyValue value={pricePreview.price_with_vat} /> : "—"}
                      {pricePreview?.manual_holiday ? <span className="ml-1.5 text-[10px] font-normal text-amber-600 dark:text-amber-400">· {t("Feriado", "Holiday")}</span> : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    aria-label={t("Data e hora", "Date and time")}
                    className="min-w-[11rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
                  />
                  <button type="button" onClick={setNow} className="shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted">
                    <CalendarClock size={13} className="mr-1 inline" /> {t("Agora", "Now")}
                  </button>
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-violet-400">
                    <input type="checkbox" checked={manualHoliday} onChange={(e) => setManualHoliday(e.target.checked)} className="h-3.5 w-3.5 rounded border-border accent-violet-600" />
                    {t("Feriado", "Holiday")}
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">{t("Descrição", "Description")}</label>
                  <TextAreaInput value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={t("Notas da consulta (opcional)", "Consultation notes (optional)")} />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-white/20 pt-3 dark:border-white/10">
                  <Link
                    href={`/consultations/medical-consultations/${id}`}
                    className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                  >
                    {t("Cancelar", "Cancel")}
                  </Link>
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    {saving ? t("A guardar…", "Saving…") : t("Guardar alterações", "Save changes")}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}
