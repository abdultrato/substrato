"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  ClipboardEdit,
  FileHeart,
  Info,
  Loader2,
  Save,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import SearchableSelect from "@/components/ui/SearchableSelect"
import { useLanguage } from "@/hooks/useLanguage"
import { apiFetch, apiFetchList } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type PatientRow = {
  id: number
  name?: string | null
  custom_id?: string | null
  document_number?: string | null
}

type WardRow = {
  id: number
  name?: string | null
  custom_id?: string | null
  active?: boolean | null
}

type CreatedRecord = {
  id?: number
}

const FIELD_CLASS =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section className="relative z-10 overflow-visible rounded-xl border border-white/25 bg-white/[0.02] shadow-md shadow-slate-900/5 ring-1 ring-white/10 backdrop-blur-xl focus-within:z-30 dark:border-white/[0.08] dark:bg-white/[0.01] dark:ring-white/[0.04]">
      <div className="flex items-center gap-2.5 border-b border-white/20 bg-transparent px-4 py-3 dark:border-white/[0.06]">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
          <Icon size={15} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] font-semibold text-muted-foreground">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      {children}
    </label>
  )
}

function localizeError(message: string | undefined, fallback: string) {
  const raw = (message || "").trim()
  if (!raw || /^internal server error$/i.test(raw)) return fallback
  return raw
}

export default function CreateNursingRecordPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [wards, setWards] = useState<WardRow[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [patientId, setPatientId] = useState("")
  const [wardId, setWardId] = useState("")
  const [name, setName] = useState("")
  const [priority, setPriority] = useState("NOR")
  const [observation, setObservation] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadOptions() {
      try {
        setLoadingOptions(true)
        const [patientResponse, wardResponse] = await Promise.all([
          apiFetchList<PatientRow>("/clinical/patient/", {
            page: 1,
            pageSize: 200,
            query: { ordering: "name" },
            clientCache: false,
          }),
          apiFetchList<WardRow>("/nursing/ward/", {
            page: 1,
            pageSize: 200,
            query: { active: true, ordering: "name" },
            clientCache: false,
          }),
        ])
        if (!mounted) return
        setPatients(patientResponse.items || [])
        setWards(wardResponse.items || [])
      } catch (error: any) {
        if (!mounted) return
        setFormError(
          localizeError(
            error?.message,
            t("Não foi possível carregar pacientes e enfermarias.", "Could not load patients and wards."),
          ),
        )
      } finally {
        if (mounted) setLoadingOptions(false)
      }
    }

    loadOptions()
    return () => {
      mounted = false
    }
  }, [t])

  const patientOptions = useMemo(
    () =>
      patients.map((patient) => ({
        value: String(patient.id),
        label: patient.name || patient.custom_id || `${t("Paciente", "Patient")} ${patient.id}`,
        hint: patient.document_number || patient.custom_id || undefined,
      })),
    [patients, t],
  )

  const wardOptions = useMemo(
    () =>
      wards.map((ward) => ({
        value: String(ward.id),
        label: ward.name || ward.custom_id || `${t("Enfermaria", "Ward")} ${ward.id}`,
        hint: ward.custom_id || undefined,
      })),
    [t, wards],
  )

  function clearError() {
    if (formError) setFormError(null)
  }

  async function createRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedObservation = observation.trim()

    if (!patientId) {
      setFormError(t("Selecione o paciente.", "Select the patient."))
      return
    }
    if (!trimmedName) {
      setFormError(t("Informe o título do registo.", "Enter the record title."))
      return
    }

    setSaving(true)
    setFormError(null)
    try {
      const created = await apiFetch<CreatedRecord>("/nursing/nursing_record/", {
        method: "POST",
        body: JSON.stringify({
          patient: Number(patientId),
          ward: wardId ? Number(wardId) : null,
          name: trimmedName,
          priority,
          observation: trimmedObservation,
          record_kind: "MANUAL",
          origin_role: "ENFERMAGEM",
        }),
      })
      router.push(created.id ? `/nursing/nursing-records/${created.id}` : "/nursing/nursing-records")
      router.refresh()
    } catch (error: any) {
      setFormError(
        localizeError(error?.message, t("Falha ao criar o registo de enfermagem.", "Failed to create nursing record.")),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-5xl space-y-3 px-1">
        <section className="relative overflow-hidden rounded-xl border border-emerald-200/30 bg-gradient-to-br from-emerald-100/[0.08] via-white/[0.03] to-teal-100/[0.05] px-4 py-3 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-emerald-800/20 dark:from-emerald-950/[0.07] dark:via-white/[0.02] dark:to-teal-950/[0.04]">
          <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25">
                <ClipboardEdit size={18} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">
                  {t("Novo registo de enfermagem", "New nursing record")}
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  {t("Registe uma observação clínica associada ao paciente.", "Record a clinical note associated with the patient.")}
                </p>
              </div>
            </div>
            <Link
              href="/nursing/nursing-records"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card/70 px-3 text-xs font-medium text-foreground shadow-sm backdrop-blur transition hover:bg-muted"
            >
              <ArrowLeft size={13} /> {t("Voltar", "Back")}
            </Link>
          </div>
        </section>

        {formError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-300">
            {formError}
          </div>
        ) : null}

        <form onSubmit={createRecord} className="space-y-3">
          <SectionCard
            icon={User}
            title={t("Paciente e localização", "Patient and location")}
            subtitle={t("Identifique o paciente e, quando aplicável, a enfermaria.", "Identify the patient and, when applicable, the ward.")}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={t("Paciente", "Patient")} required>
                <SearchableSelect
                  value={patientId}
                  onChange={(value) => {
                    setPatientId(value)
                    clearError()
                  }}
                  options={patientOptions}
                  disabled={loadingOptions}
                  placeholder={loadingOptions ? t("A carregar...", "Loading...") : t("Selecione o paciente", "Select patient")}
                  searchPlaceholder={t("Pesquisar por nome ou documento...", "Search by name or document...")}
                  emptyMessage={t("Nenhum paciente encontrado.", "No patient found.")}
                />
              </Field>

              <Field label={t("Enfermaria", "Ward")}>
                <SearchableSelect
                  value={wardId}
                  onChange={(value) => {
                    setWardId(value)
                    clearError()
                  }}
                  options={wardOptions}
                  disabled={loadingOptions}
                  allowClear
                  placeholder={loadingOptions ? t("A carregar...", "Loading...") : t("Sem enfermaria", "No ward")}
                  searchPlaceholder={t("Pesquisar enfermaria...", "Search ward...")}
                  emptyMessage={t("Nenhuma enfermaria ativa.", "No active ward.")}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            icon={FileHeart}
            title={t("Dados clínicos", "Clinical details")}
            subtitle={t("Descreva o motivo, a prioridade e a observação de enfermagem.", "Describe the reason, priority, and nursing note.")}
          >
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
                <Field label={t("Título do registo", "Record title")} required>
                  <input
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      clearError()
                    }}
                    className={FIELD_CLASS}
                    placeholder={t("Ex.: Avaliação inicial de enfermagem", "E.g. Initial nursing assessment")}
                    autoFocus
                  />
                </Field>

                <Field label={t("Prioridade", "Priority")} required>
                  <select value={priority} onChange={(event) => setPriority(event.target.value)} className={FIELD_CLASS}>
                    <option value="URG">{t("Urgente", "Urgent")}</option>
                    <option value="NOR">{t("Normal", "Normal")}</option>
                    <option value="BAI">{t("Baixa", "Low")}</option>
                  </select>
                </Field>
              </div>

              <Field label={t("Observação de enfermagem", "Nursing note")}>
                <textarea
                  value={observation}
                  onChange={(event) => setObservation(event.target.value)}
                  className={`${FIELD_CLASS} min-h-32 resize-y leading-relaxed`}
                  placeholder={t(
                    "Descreva o estado do paciente, cuidados prestados e orientações relevantes...",
                    "Describe the patient's condition, care provided, and relevant guidance...",
                  )}
                />
              </Field>
            </div>
          </SectionCard>

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/25 bg-white/[0.02] px-4 py-3 text-xs text-sky-900 shadow-md shadow-slate-900/5 ring-1 ring-white/10 backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.01] dark:text-sky-200 dark:ring-white/[0.04]">
            <p className="inline-flex items-center gap-2">
              <Info size={14} className="shrink-0" />
              {t(
                "A data, o profissional e a origem Enfermagem serão registados automaticamente.",
                "The date, professional, and Nursing origin will be recorded automatically.",
              )}
            </p>
            <div className="flex items-center gap-2">
              <Link href="/nursing/nursing-records" className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-4 text-xs font-medium text-foreground transition hover:bg-muted">
                {t("Cancelar", "Cancel")}
              </Link>
              <button
                type="submit"
                disabled={saving || loadingOptions || !patientId || !name.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-semibold text-white shadow-md shadow-emerald-500/25 transition hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? t("A guardar...", "Saving...") : t("Guardar registo", "Save record")}
              </button>
            </div>
          </section>
        </form>
      </div>
    </AppLayout>
  )
}
