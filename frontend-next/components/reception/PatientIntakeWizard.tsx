"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Droplets,
  HeartHandshake,
  Home,
  Badge,
  Phone,
  Printer,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { apiFetch, apiFetchList } from "@/lib/api"

async function openBloodBagLabel(donationId: number) {
  const blob = await apiFetch<Blob>(`/bloodbank/donation/${donationId}/etiqueta/`, { responseType: "blob" })
  const url = URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener")
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}

type LookupItem = {
  id: number
  name: string
  nome?: string | null
  custom_id?: string | null
  document_number?: string | null
  nuit?: string | null
  phone1?: string | null
  email?: string | null
}

type DonorRole = "VOL" | "REP"
type TestResult = "PEN" | "NEG" | "POS" | "INC" | "NDO"
type DonationStatus = "REG" | "SCR" | "COM" | "CAN"
type ScreeningStatus = "PEN" | "APR" | "REJ"
type StepKey = "origin" | "identity" | "contact" | "clinical" | "donation" | "confirm"
type VisitPurpose = "occupational" | "clinical" | "donor"

type WizardData = {
  visit_purpose: VisitPurpose
  provenance: string
  origin_company_id: number | null
  origin_company_name: string
  is_blood_donor: boolean
  donor_role: DonorRole
  is_organ_donor: boolean
  name: string
  birth_date: string
  gender: string
  blood_type: string
  race_origin: string
  document_type: string
  document_number: string
  contact: string
  email: string
  address_street: string
  address_number: string
  address_neighborhood: string
  address_city: string
  address_province: string
  address_postal_code: string
  address_country: string
  address_complement: string
  address: string
  pregnant: boolean
  gestational_age_weeks: string
  is_replacement_donor_inapt: boolean
  replacement_donor_inapt_at: string
  replacement_donor_inapt_reason: string
  companion_name: string
  companion_relationship: string
  companion_contact: string
  companion_email: string
  donation_type: "WBL" | "APH"
  donation_status: DonationStatus
  screening_status: ScreeningStatus
  collected_at: string
  processed_at: string
  volume_ml: string
  donor_weight_kg: string
  hemoglobin_g_dl: string
  donor_height_cm: string
  blood_pressure_systolic: string
  blood_pressure_diastolic: string
  pulse_bpm: string
  temperature_c: string
  hiv_test: TestResult
  syphilis_rpr_test: TestResult
  hepatitis_b_hbsag_test: TestResult
  hepatitis_c_anti_hcv_test: TestResult
  malaria_test: TestResult
  test_notes: string
  contraindications: string
  donation_notes: string
  replacement_for_id: number | null
  replacement_for_name: string
}

type CreatedPatient = {
  id: number
  custom_id?: string | null
  name: string
  pregnant: boolean
  donationCreated?: boolean
  donationId?: number | null
  bagIdentifier?: string | null
  warning?: string
}

type ExistingPatientRecord = {
  id: number
  custom_id?: string | null
  name?: string | null
  provenance?: string | null
  origin_company?: number | { id?: number | null; name?: string | null; nome?: string | null } | null
  origin_company_name?: string | null
  is_blood_donor?: boolean | null
  is_organ_donor?: boolean | null
  birth_date?: string | null
  gender?: string | null
  blood_type?: string | null
  race_origin?: string | null
  document_type?: string | null
  document_number?: string | null
  contact?: string | null
  email?: string | null
  address_street?: string | null
  address_number?: string | null
  address_neighborhood?: string | null
  address_city?: string | null
  address_province?: string | null
  address_postal_code?: string | null
  address_country?: string | null
  address_complement?: string | null
  address?: string | null
  pregnant?: boolean | null
  gestational_age_weeks?: number | string | null
  is_replacement_donor_inapt?: boolean | null
  replacement_donor_inapt_at?: string | null
  replacement_donor_inapt_reason?: string | null
  companion_name?: string | null
  companion_relationship?: string | null
  companion_contact?: string | null
  companion_email?: string | null
}

const EMPTY: WizardData = {
  visit_purpose: "clinical",
  provenance: "Clínica Externa",
  origin_company_id: null,
  origin_company_name: "",
  is_blood_donor: false,
  donor_role: "VOL",
  is_organ_donor: false,
  name: "",
  birth_date: "",
  gender: "Femenino",
  blood_type: "UNK",
  race_origin: "Negra",
  document_type: "BI",
  document_number: "",
  contact: "",
  email: "",
  address_street: "",
  address_number: "",
  address_neighborhood: "",
  address_city: "",
  address_province: "",
  address_postal_code: "",
  address_country: "MZ",
  address_complement: "",
  address: "",
  pregnant: false,
  gestational_age_weeks: "",
  is_replacement_donor_inapt: false,
  replacement_donor_inapt_at: "",
  replacement_donor_inapt_reason: "",
  companion_name: "",
  companion_relationship: "",
  companion_contact: "",
  companion_email: "",
  donation_type: "WBL",
  donation_status: "REG",
  screening_status: "PEN",
  collected_at: "",
  processed_at: "",
  volume_ml: "450",
  donor_weight_kg: "",
  hemoglobin_g_dl: "",
  donor_height_cm: "",
  blood_pressure_systolic: "",
  blood_pressure_diastolic: "",
  pulse_bpm: "",
  temperature_c: "",
  hiv_test: "PEN",
  syphilis_rpr_test: "PEN",
  hepatitis_b_hbsag_test: "PEN",
  hepatitis_c_anti_hcv_test: "PEN",
  malaria_test: "PEN",
  test_notes: "",
  contraindications: "",
  donation_notes: "",
  replacement_for_id: null,
  replacement_for_name: "",
}

const PROVENANCE_OPTIONS = [
  "Clínica Externa",
  "Medicina Ocupacional",
  "Ambulatório",
  "Maternidade",
  "Ginecologia",
  "Pediatria",
  "Banco de Socorros",
  "Consulta Externa",
  "Urologia",
  "Cirurgia",
  "Dentária",
  "Oftalmologia",
  "Outro",
]

const CLINICAL_PROVENANCE_OPTIONS = PROVENANCE_OPTIONS.filter(
  (option) => option !== "Medicina Ocupacional",
)

const DONOR_PROVENANCE = "Doação de Sangue"

const PURPOSE_OPTIONS: Array<{
  value: VisitPurpose
  title: string
  description: string
  icon: typeof ClipboardList
}> = [
  {
    value: "occupational",
    title: "Medicina Ocupacional",
    description: "Admissional ou periódico por uma empresa",
    icon: Building2,
  },
  {
    value: "clinical",
    title: "Paciente clínico",
    description: "Atendimento clínico geral",
    icon: Stethoscope,
  },
  {
    value: "donor",
    title: "Doador de sangue",
    description: "Colheita para o banco de sangue",
    icon: Droplets,
  },
]

function purposeLabel(purpose: VisitPurpose) {
  return PURPOSE_OPTIONS.find((option) => option.value === purpose)?.title ?? "Paciente clínico"
}

const BLOOD_TYPE_OPTIONS = [
  { value: "UNK", label: "Não informado" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
]

const RACE_OPTIONS = ["Negra", "Branca", "Parda", "Amarela", "Indígena", "Outro"]

const DOCUMENT_OPTIONS = [
  { value: "BI", label: "Bilhete de Identidade" },
  { value: "PASS", label: "Passaporte" },
  { value: "DIRE", label: "DIRE" },
  { value: "CC", label: "Carta de Condução" },
  { value: "NUIT", label: "NUIT" },
  { value: "CE", label: "Cartão de Eleitor" },
  { value: "CN", label: "Certidão de Nascimento" },
  { value: "OUT", label: "Outro" },
]

const TEST_RESULT_OPTIONS: Array<{ value: TestResult; label: string }> = [
  { value: "PEN", label: "Pendente" },
  { value: "NEG", label: "Negativo" },
  { value: "POS", label: "Positivo" },
  { value: "INC", label: "Inconclusivo" },
  { value: "NDO", label: "Não realizado" },
]

const STEP_DEFINITIONS: Array<{ key: StepKey; label: string; icon: typeof ClipboardList }> = [
  { key: "origin", label: "Propósito", icon: ClipboardList },
  { key: "identity", label: "Identificação", icon: Badge },
  { key: "contact", label: "Contacto e morada", icon: Home },
  { key: "clinical", label: "Clínico e acompanhante", icon: ShieldCheck },
  { key: "donation", label: "Doação de sangue", icon: Droplets },
  { key: "confirm", label: "Confirmação", icon: CheckCircle2 },
]

const inputCls =
  "w-full rounded-xl border border-white/25 bg-white/45 px-3 py-2 text-sm text-[var(--text)] shadow-sm backdrop-blur-sm outline-none transition placeholder:text-[var(--gray-400)] hover:border-[var(--primary-300)] hover:bg-white/60 focus:border-[var(--primary-500)] focus:bg-white/70 focus:ring-2 focus:ring-[var(--primary-200)] dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.10] dark:focus:bg-white/[0.12] disabled:bg-white/20 disabled:text-[var(--gray-500)] dark:disabled:bg-white/[0.03]"

const compactInputCls =
  "w-full rounded-lg border border-white/25 bg-white/42 px-2.5 py-1.5 text-xs text-[var(--text)] shadow-sm backdrop-blur-sm outline-none transition placeholder:text-[var(--gray-400)] hover:border-[var(--primary-300)] hover:bg-white/58 focus:border-[var(--primary-500)] focus:bg-white/68 focus:ring-2 focus:ring-[var(--primary-200)] dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.10] dark:focus:bg-white/[0.12] disabled:bg-white/20 disabled:text-[var(--gray-500)] dark:disabled:bg-white/[0.03]"

function phoneDigits(value: string) {
  return value.replace(/\D/g, "")
}

function phoneError(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const digits = phoneDigits(trimmed)
  if (digits.length !== 9) return "O telefone do paciente deve ter 9 dígitos."
  if (!/^8[234567]/.test(digits)) return "O telefone deve começar por 82, 83, 84, 85, 86 ou 87."
  return null
}

function emailError(value: string, label: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `${label} inválido.`
  return null
}

// Feedback em tempo real: erro só quando o valor já está claramente errado;
// caso contrário uma dica neutra (contador/idade) para guiar o preenchimento.
function phoneFeedback(value: string): { error: string | null; hint: string | null } {
  const trimmed = value.trim()
  if (!trimmed) return { error: null, hint: null }
  const digits = phoneDigits(trimmed)
  if (digits.length >= 2 && !/^8[234567]/.test(digits)) {
    return { error: "Deve começar por 82, 83, 84, 85, 86 ou 87.", hint: null }
  }
  if (digits.length !== 9) return { error: null, hint: `${digits.length}/9 dígitos` }
  return { error: null, hint: "Número válido" }
}

function emailFeedback(value: string, label: string) {
  if (!value.includes("@")) return null
  return emailError(value, label)
}

function birthDateError(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (date.getTime() > Date.now()) return "A data de nascimento não pode ser futura."
  return null
}

function ageLabel(value: string): string | null {
  if (!value) return null
  const birth = new Date(value)
  if (Number.isNaN(birth.getTime()) || birth.getTime() > Date.now()) return null
  const today = new Date()
  let years = today.getFullYear() - birth.getFullYear()
  let months = today.getMonth() - birth.getMonth()
  if (today.getDate() < birth.getDate()) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }
  if (years <= 0) {
    if (months <= 0) return "Recém-nascido"
    return `${months} ${months === 1 ? "mês" : "meses"}`
  }
  return `${years} ${years === 1 ? "ano" : "anos"}`
}

function documentNumberError(type: string, value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (type === "NUIT" && !/^\d{9}$/.test(trimmed)) return "O NUIT deve ter 9 dígitos."
  return null
}

function addText(payload: Record<string, any>, key: string, value: string) {
  const trimmed = value.trim()
  if (trimmed) payload[key] = trimmed
}

function addNumber(payload: Record<string, any>, key: string, value: string) {
  const trimmed = value.trim()
  if (!trimmed) return
  const parsed = Number(trimmed)
  if (!Number.isNaN(parsed)) payload[key] = parsed
}

function addDecimal(payload: Record<string, any>, key: string, value: string) {
  const trimmed = value.trim()
  if (trimmed) payload[key] = trimmed
}

function firstApiError(error: any, fallback: string) {
  const data = error?.data
  if (typeof data === "string") return data
  if (typeof data?.detail === "string") return data.detail
  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      if (typeof value === "string") return value
      if (Array.isArray(value) && value.length > 0) return String(value[0])
    }
  }
  return error?.message || fallback
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string
  required?: boolean
  error?: string | null
  hint?: string | null
  children: React.ReactNode
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-[var(--gray-700)]">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="flex items-center gap-1 text-[11px] font-medium text-rose-600">
          <AlertTriangle size={11} className="shrink-0" />
          {error}
        </span>
      ) : hint ? (
        <span className="text-[11px] text-[var(--gray-500)]">{hint}</span>
      ) : null}
    </label>
  )
}

function SectionTitle({ icon: Icon, title }: { icon: typeof ClipboardList; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-white/20 pb-2 dark:border-white/10">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/25 bg-white/45 text-[var(--primary-700)] shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-[var(--primary-300)]">
        <Icon size={15} />
      </span>
      <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
    </div>
  )
}

function ToggleRow({
  checked,
  onChange,
  icon: Icon,
  title,
  description,
  tone = "primary",
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  icon: typeof ClipboardList
  title: string
  description?: string
  tone?: "primary" | "rose" | "amber"
}) {
  const toneClass =
    tone === "rose" ? "text-rose-500" : tone === "amber" ? "text-amber-500" : "text-[var(--primary-700)]"

  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-white/20 bg-white/30 px-3 py-2.5 shadow-sm backdrop-blur-sm transition hover:border-[var(--primary-300)] hover:bg-white/45 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.09]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-[var(--primary-600)] focus:ring-[var(--primary-300)]"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text)]">
          <Icon size={14} className={toneClass} />
          {title}
        </span>
        {description ? <span className="text-xs text-[var(--gray-500)]">{description}</span> : null}
      </span>
    </label>
  )
}

function PurposeCard({
  active,
  onSelect,
  icon: Icon,
  title,
  description,
}: {
  active: boolean
  onSelect: () => void
  icon: typeof ClipboardList
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex items-start gap-2 rounded-lg border px-3 py-3 text-left transition ${
        active
          ? "border-[var(--primary-500)] bg-[var(--primary-600)] text-white shadow-sm"
          : "border-white/20 bg-white/30 text-[var(--gray-700)] shadow-sm backdrop-blur-sm hover:border-[var(--primary-300)] hover:bg-white/45 dark:border-white/10 dark:bg-white/[0.05] dark:text-[var(--gray-200)] dark:hover:bg-white/[0.09]"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
          active ? "bg-white/15" : "bg-white/45 text-[var(--primary-700)] dark:bg-white/[0.06] dark:text-[var(--primary-300)]"
        }`}
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight">{title}</span>
        <span className={`block text-[11px] leading-snug ${active ? "text-white/80" : "text-[var(--gray-500)]"}`}>
          {description}
        </span>
      </span>
      {active ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : null}
    </button>
  )
}

function LookupSearch({
  value,
  endpoint,
  placeholder,
  onChange,
}: {
  value: { id: number | null; name: string }
  endpoint: string
  placeholder: string
  onChange: (item: { id: number | null; name: string }) => void
}) {
  const [query, setQuery] = useState(value.name)
  const [results, setResults] = useState<LookupItem[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestSeqRef = useRef(0)

  useEffect(() => {
    setQuery(value.name)
  }, [value.name])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  async function loadOptions(searchText: string) {
    const requestSeq = requestSeqRef.current + 1
    requestSeqRef.current = requestSeq
    setLoading(true)
    try {
      const { items } = await apiFetchList<LookupItem>(endpoint, {
        page: 1,
        pageSize: 25,
        query: searchText ? { search: searchText } : undefined,
        clientCache: false,
      })
      if (requestSeq === requestSeqRef.current) {
        setResults(items)
        setOpen(true)
      }
    } catch {
      if (requestSeq === requestSeqRef.current) {
        setResults([])
        setOpen(true)
      }
    } finally {
      if (requestSeq === requestSeqRef.current) setLoading(false)
    }
  }

  function search(nextQuery: string) {
    setQuery(nextQuery)
    onChange({ id: null, name: nextQuery })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setOpen(true)
    debounceRef.current = setTimeout(async () => {
      await loadOptions(nextQuery.trim())
    }, 250)
  }

  function pick(item: LookupItem) {
    const label = lookupItemLabel(item)
    onChange({ id: item.id, name: label })
    setQuery(label)
    setOpen(false)
    setResults([item])
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(event) => search(event.target.value)}
        placeholder={placeholder}
        className={inputCls}
        autoComplete="off"
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => {
          setOpen(true)
          void loadOptions(query.trim())
        }}
      />
      {loading ? <span className="absolute right-3 top-2.5 text-xs text-[var(--gray-500)]">...</span> : null}
      {open && results.length > 0 ? (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg">
          {results.map((item) => (
            <li
              key={item.id}
              onMouseDown={() => pick(item)}
              className="cursor-pointer px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--gray-100)]"
            >
              <span className="block font-medium">{lookupItemLabel(item)}</span>
              {item.custom_id || item.document_number || item.nuit ? (
                <span className="text-xs text-[var(--gray-500)]">
                  {[item.custom_id, item.nuit, item.document_number].filter(Boolean).join(" · ")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {open && !loading && query.trim() && results.length === 0 ? (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--gray-500)] shadow-lg">
          Nenhum registo encontrado.
        </div>
      ) : null}
    </div>
  )
}

function lookupItemLabel(item: LookupItem) {
  return item.name || item.nome || item.custom_id || String(item.id)
}

export function PatientIntakeWizard({
  onClose,
  onSuccess,
  patientId,
}: {
  onClose: () => void
  onSuccess?: (result: { id: number; pregnant: boolean }) => void
  patientId?: number | null
}) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedPatient | null>(null)
  const [labelError, setLabelError] = useState<string | null>(null)
  const [bootstrapping, setBootstrapping] = useState(Boolean(patientId))
  const isEditMode = Boolean(patientId)

  const steps = useMemo(
    () =>
      STEP_DEFINITIONS.filter((definition) => {
        if (definition.key === "donation") return !isEditMode && data.is_blood_donor
        return true
      }),
    [data.is_blood_donor, isEditMode],
  )
  const currentStep = steps[Math.min(step, steps.length - 1)]
  const isOccupational = data.visit_purpose === "occupational"
  const isDonor = data.visit_purpose === "donor"
  const isClinical = data.visit_purpose === "clinical"

  useEffect(() => {
    setStep((current) => Math.min(current, steps.length - 1))
  }, [steps.length])

  useEffect(() => {
    if (!patientId) {
      setBootstrapping(false)
      return
    }

    let active = true
    setBootstrapping(true)
    setError(null)

    apiFetch<ExistingPatientRecord>(`/clinical/patient/${patientId}/`)
      .then((patient) => {
        if (!active) return
        const originCompanyObject =
          patient.origin_company && typeof patient.origin_company === "object" ? patient.origin_company : null
        const originCompanyId =
          typeof patient.origin_company === "number"
            ? patient.origin_company
            : originCompanyObject?.id ?? null
        const originCompanyName =
          patient.origin_company_name ||
          originCompanyObject?.name ||
          originCompanyObject?.nome ||
          ""
        const provenance = patient.provenance?.trim() || EMPTY.provenance
        const isOccupational = provenance === "Medicina Ocupacional"
        const isDonor = Boolean(patient.is_blood_donor)
        const visitPurpose: VisitPurpose = isDonor
          ? "donor"
          : isOccupational
            ? "occupational"
            : "clinical"

        setData({
          ...EMPTY,
          visit_purpose: visitPurpose,
          provenance,
          origin_company_id: originCompanyId,
          origin_company_name: originCompanyName,
          is_blood_donor: isDonor,
          is_organ_donor: Boolean(patient.is_organ_donor),
          name: patient.name || "",
          birth_date: patient.birth_date || "",
          gender: patient.gender || EMPTY.gender,
          blood_type: patient.blood_type || EMPTY.blood_type,
          race_origin: patient.race_origin || EMPTY.race_origin,
          document_type: patient.document_type || EMPTY.document_type,
          document_number: patient.document_number || "",
          contact: patient.contact || "",
          email: patient.email || "",
          address_street: patient.address_street || "",
          address_number: patient.address_number || "",
          address_neighborhood: patient.address_neighborhood || "",
          address_city: patient.address_city || "",
          address_province: patient.address_province || "",
          address_postal_code: patient.address_postal_code || "",
          address_country: patient.address_country || EMPTY.address_country,
          address_complement: patient.address_complement || "",
          address: patient.address || "",
          pregnant: Boolean(patient.pregnant),
          gestational_age_weeks:
            patient.gestational_age_weeks === null || patient.gestational_age_weeks === undefined
              ? ""
              : String(patient.gestational_age_weeks),
          is_replacement_donor_inapt: Boolean(patient.is_replacement_donor_inapt),
          replacement_donor_inapt_at: patient.replacement_donor_inapt_at || "",
          replacement_donor_inapt_reason: patient.replacement_donor_inapt_reason || "",
          companion_name: patient.companion_name || "",
          companion_relationship: patient.companion_relationship || "",
          companion_contact: patient.companion_contact || "",
          companion_email: patient.companion_email || "",
        })
      })
      .catch((loadError: any) => {
        if (!active) return
        setError(firstApiError(loadError, "Falha ao carregar o paciente para edição."))
      })
      .finally(() => {
        if (active) setBootstrapping(false)
      })

    return () => {
      active = false
    }
  }, [patientId])

  const update = useCallback((patch: Partial<WizardData>) => {
    setData((previous) => ({ ...previous, ...patch }))
    setError(null)
  }, [])

  const selectPurpose = useCallback((purpose: VisitPurpose) => {
    setData((previous) => {
      if (previous.visit_purpose === purpose) return previous
      const next: WizardData = { ...previous, visit_purpose: purpose }
      next.is_blood_donor = purpose === "donor"
      if (purpose === "occupational") {
        next.provenance = "Medicina Ocupacional"
      } else if (purpose === "donor") {
        next.provenance = DONOR_PROVENANCE
      } else if (
        previous.provenance === "Medicina Ocupacional" ||
        previous.provenance === DONOR_PROVENANCE
      ) {
        next.provenance = "Clínica Externa"
      }
      if (purpose !== "occupational") {
        next.origin_company_id = null
        next.origin_company_name = ""
      }
      if (purpose !== "clinical") {
        next.is_organ_donor = false
      }
      if (purpose !== "donor") {
        next.is_replacement_donor_inapt = false
        next.replacement_donor_inapt_at = ""
        next.replacement_donor_inapt_reason = ""
      } else {
        next.companion_name = ""
        next.companion_relationship = ""
        next.companion_contact = ""
        next.companion_email = ""
      }
      return next
    })
    setError(null)
  }, [])

  function validateStep(key: StepKey): string | null {
    if (key === "origin" && isOccupational && !data.origin_company_id) {
      return "Selecione a empresa de origem para pacientes de Medicina Ocupacional."
    }

    if (key === "identity") {
      if (data.name.trim().length < 2) return "O nome do paciente deve ter pelo menos 2 caracteres."
      if (data.is_blood_donor && !data.birth_date) {
        return "Informe a data de nascimento para validar a idade mínima do doador de sangue."
      }
      const birthProblem = birthDateError(data.birth_date)
      if (birthProblem) return birthProblem
      const documentProblem = documentNumberError(data.document_type, data.document_number)
      if (documentProblem) return documentProblem
    }

    if (key === "contact") {
      const contactProblem = phoneError(data.contact)
      if (contactProblem) return contactProblem
      const patientEmailProblem = emailError(data.email, "Email do paciente")
      if (patientEmailProblem) return patientEmailProblem
    }

    if (key === "clinical") {
      if (data.pregnant && !data.gestational_age_weeks.trim()) {
        return "Informe a idade gestacional quando a paciente está marcada como gestante."
      }
      if (!isDonor) {
        const companionEmailProblem = emailError(data.companion_email, "Email do acompanhante")
        if (companionEmailProblem) return companionEmailProblem
      }
    }

    if (key === "donation" && data.is_blood_donor) {
      if (data.donor_role === "REP" && !data.replacement_for_id) {
        return "Selecione o paciente para quem esta doação é reposição."
      }
      if (data.donor_role === "REP") {
        const pendingTest = [
          data.hiv_test,
          data.syphilis_rpr_test,
          data.hepatitis_b_hbsag_test,
          data.hepatitis_c_anti_hcv_test,
          data.malaria_test,
        ].some((result) => result === "PEN")
        if (pendingTest) return "Para doador repositor, todos os resultados de triagem devem estar preenchidos."
      }
      if (data.screening_status === "APR") {
        const allNegative = [
          data.hiv_test,
          data.syphilis_rpr_test,
          data.hepatitis_b_hbsag_test,
          data.hepatitis_c_anti_hcv_test,
          data.malaria_test,
        ].every((result) => result === "NEG")
        if (!allNegative) return "Triagem aprovada exige todos os testes com resultado negativo."
        if (!data.donor_weight_kg.trim()) return "Triagem aprovada exige peso do doador."
        if (!data.hemoglobin_g_dl.trim()) return "Triagem aprovada exige hemoglobina."
      }
    }

    return null
  }

  function next() {
    const problem = validateStep(currentStep.key)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setStep((current) => Math.min(steps.length - 1, current + 1))
  }

  function validateAll() {
    for (const definition of steps) {
      if (definition.key === "confirm") continue
      const problem = validateStep(definition.key)
      if (problem) {
        setStep(steps.findIndex((stepDefinition) => stepDefinition.key === definition.key))
        setError(problem)
        return false
      }
    }
    return true
  }

  function buildPatientPayload() {
    const payload: Record<string, any> = {
      name: data.name.trim(),
      provenance: data.provenance,
      gender: data.gender,
      blood_type: data.blood_type,
      race_origin: data.race_origin,
      document_type: data.document_type,
      pregnant: data.pregnant,
      gestational_age_weeks: data.pregnant ? Number(data.gestational_age_weeks) : null,
      is_replacement_donor_inapt: data.is_replacement_donor_inapt,
      is_organ_donor: data.is_organ_donor,
      address_country: data.address_country.trim() || "MZ",
    }

    if (data.birth_date) payload.birth_date = data.birth_date
    if (data.origin_company_id) payload.origin_company = data.origin_company_id
    if (data.contact.trim()) payload.contact = phoneDigits(data.contact)
    addText(payload, "document_number", data.document_number)
    addText(payload, "email", data.email)
    addText(payload, "address_street", data.address_street)
    addText(payload, "address_number", data.address_number)
    addText(payload, "address_neighborhood", data.address_neighborhood)
    addText(payload, "address_city", data.address_city)
    addText(payload, "address_province", data.address_province)
    addText(payload, "address_postal_code", data.address_postal_code)
    addText(payload, "address_complement", data.address_complement)
    addText(payload, "address", data.address)
    addText(payload, "replacement_donor_inapt_reason", data.replacement_donor_inapt_reason)
    addText(payload, "companion_name", data.companion_name)
    addText(payload, "companion_relationship", data.companion_relationship)
    addText(payload, "companion_contact", data.companion_contact)
    addText(payload, "companion_email", data.companion_email)
    if (data.replacement_donor_inapt_at) payload.replacement_donor_inapt_at = data.replacement_donor_inapt_at

    return payload
  }

  function buildDonationPayload(patientId: number) {
    const payload: Record<string, any> = {
      donor: patientId,
      donor_role: data.donor_role,
      blood_type: data.blood_type,
      donation_type: data.donation_type,
      status: data.donation_status,
      screening_status: data.screening_status,
      hiv_test: data.hiv_test,
      syphilis_rpr_test: data.syphilis_rpr_test,
      hepatitis_b_hbsag_test: data.hepatitis_b_hbsag_test,
      hepatitis_c_anti_hcv_test: data.hepatitis_c_anti_hcv_test,
      malaria_test: data.malaria_test,
    }

    addNumber(payload, "volume_ml", data.volume_ml)
    addDecimal(payload, "donor_weight_kg", data.donor_weight_kg)
    addDecimal(payload, "hemoglobin_g_dl", data.hemoglobin_g_dl)
    addNumber(payload, "donor_height_cm", data.donor_height_cm)
    addNumber(payload, "blood_pressure_systolic", data.blood_pressure_systolic)
    addNumber(payload, "blood_pressure_diastolic", data.blood_pressure_diastolic)
    addNumber(payload, "pulse_bpm", data.pulse_bpm)
    addDecimal(payload, "temperature_c", data.temperature_c)
    addText(payload, "test_notes", data.test_notes)
    addText(payload, "contraindications", data.contraindications)
    addText(payload, "notes", data.donation_notes)
    if (data.collected_at) payload.collected_at = data.collected_at
    if (data.processed_at) payload.processed_at = data.processed_at
    if (data.donor_role === "REP" && data.replacement_for_id) payload.replacement_for = data.replacement_for_id

    return payload
  }

  async function submit() {
    if (!validateAll()) return
    setSubmitting(true)
    setError(null)
    try {
      const patient = await apiFetch<any>(isEditMode ? `/clinical/patient/${patientId}/` : "/clinical/patient/", {
        method: isEditMode ? "PATCH" : "POST",
        body: JSON.stringify(buildPatientPayload()),
      })

      let donationCreated = false
      let donationId: number | null = null
      let bagIdentifier: string | null = null
      let warning: string | undefined
      if (!isEditMode && data.is_blood_donor && patient?.id) {
        try {
          const donation = await apiFetch<any>("/bloodbank/donation/", {
            method: "POST",
            body: JSON.stringify(buildDonationPayload(patient.id)),
          })
          donationCreated = true
          donationId = donation?.id ?? null
          bagIdentifier = donation?.bag_identifier ?? donation?.custom_id ?? null
        } catch (donationError: any) {
          warning = firstApiError(
            donationError,
            "Paciente criado, mas a doação de sangue não foi criada. Reveja os dados no Banco de Sangue.",
          )
        }
      }

      if (isEditMode) {
        onSuccess?.(patient.id)
        onClose()
        return
      }

      setCreated({
        id: patient.id,
        custom_id: patient.custom_id,
        name: patient.name,
        pregnant: data.pregnant,
        donationCreated,
        donationId,
        bagIdentifier,
        warning,
      })
      if (!warning) onSuccess?.({ id: patient.id, pregnant: data.pregnant })
    } catch (submitError: any) {
      setError(
        firstApiError(
          submitError,
          isEditMode
            ? "Falha ao atualizar o paciente. Verifique os dados e tente novamente."
            : "Falha ao registar o paciente. Verifique os dados e tente novamente.",
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (bootstrapping) {
    return (
      <ModalShell title={isEditMode ? "Editar paciente" : "Registar paciente"} onClose={onClose}>
        <div className="flex min-h-[320px] items-center justify-center p-5 text-sm text-[var(--gray-500)]">
          Carregando paciente...
        </div>
      </ModalShell>
    )
  }

  if (created) {
    return (
      <ModalShell title="Paciente registado" onClose={onClose}>
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold">{created.name}</p>
              <p className="text-xs text-emerald-700">{created.custom_id || `ID ${created.id}`}</p>
            </div>
          </div>

          {created.warning ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{created.warning}</span>
            </div>
          ) : null}

          {created.donationCreated ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <span className="flex items-center gap-2">
                <Droplets size={14} />
                Doação registada · Bolsa {created.bagIdentifier || "—"}
              </span>
              {created.donationId ? (
                <button
                  type="button"
                  onClick={() => {
                    setLabelError(null)
                    openBloodBagLabel(created.donationId!).catch(() =>
                      setLabelError("Falha ao gerar a etiqueta da bolsa."),
                    )
                  }}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-rose-300 bg-white px-2.5 font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  <Printer size={13} />
                  Imprimir etiqueta
                </button>
              ) : null}
            </div>
          ) : null}

          {labelError ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{labelError}</span>
            </div>
          ) : null}

          {isOccupational ? (
            <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">
              <Building2 size={14} />
              Medicina Ocupacional: {data.origin_company_name}.
            </div>
          ) : null}

          {data.is_organ_donor ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <HeartHandshake size={14} />
              Doador de órgãos marcado no perfil.
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href={`/patients/${created.id}`}
              className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
            >
              Ver ficha do paciente
            </Link>
            {created.donationCreated ? (
              <Link
                href="/bloodbank/blood-donations"
                className="inline-flex h-9 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Banco de Sangue
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setCreated(null)
                setData(EMPTY)
                setStep(0)
                setLabelError(null)
              }}
              className="inline-flex h-9 items-center rounded-lg bg-[var(--primary-600)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--primary-700)]"
            >
              Registar outro paciente
            </button>
          </div>
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell title={isEditMode ? "Editar paciente" : "Registar paciente"} onClose={onClose}>
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="border-b border-white/20 bg-white/18 p-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03] md:border-b-0 md:border-r">
          <div className="flex gap-1.5 overflow-x-auto md:flex-col md:overflow-visible">
            {steps.map((definition, index) => {
              const Icon = definition.icon
              const active = index === step
              const complete = index < step
              return (
                <button
                  key={definition.key}
                  type="button"
                  onClick={() => index <= step && setStep(index)}
                  disabled={index > step}
                  className={`flex min-w-[150px] items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition md:min-w-0 ${
                    active
                      ? "border-[var(--primary-500)] bg-[var(--primary-600)] text-white"
                      : complete
                        ? "border-emerald-200 bg-emerald-50/80 text-emerald-800 shadow-sm dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "border-white/20 bg-white/30 text-[var(--gray-700)] shadow-sm backdrop-blur-sm disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.05] dark:text-[var(--gray-200)]"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                      active ? "bg-white/15" : complete ? "bg-emerald-100/80" : "bg-white/45 dark:bg-white/[0.06]"
                    }`}
                  >
                    {complete ? <CheckCircle2 size={15} /> : <Icon size={15} />}
                  </span>
                  <span className="min-w-0 font-semibold">
                    {definition.key === "clinical" && isDonor ? "Clínico" : definition.label}
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">{renderStep(currentStep.key)}</div>

          {error ? (
            <div className="mx-2 mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800 backdrop-blur-sm sm:mx-3">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 border-t border-white/20 px-3 py-2 dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                setError(null)
                setStep((current) => Math.max(0, current - 1))
              }}
              disabled={step === 0}
              className="inline-flex h-9 items-center rounded-lg border border-white/20 bg-white/30 px-3 text-xs font-semibold text-[var(--gray-700)] shadow-sm backdrop-blur-sm transition hover:bg-white/45 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-[var(--gray-200)] dark:hover:bg-white/[0.09]"
            >
              Anterior
            </button>

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--primary-600)] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)]"
              >
                Próximo <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UserPlus size={14} />
                {submitting ? (isEditMode ? "A atualizar..." : "A registar...") : isEditMode ? "Guardar alterações" : "Confirmar e registar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  )

  function renderStep(key: StepKey) {
    if (key === "origin") {
      return (
        <div className="space-y-3">
          <SectionTitle icon={ClipboardList} title="Propósito da visita" />
          <div className="grid gap-2 sm:grid-cols-3">
            {PURPOSE_OPTIONS.map((option) => (
              <PurposeCard
                key={option.value}
                active={data.visit_purpose === option.value}
                onSelect={() => selectPurpose(option.value)}
                icon={option.icon}
                title={option.title}
                description={option.description}
              />
            ))}
          </div>

          {isOccupational || isClinical ? (
            <div className="space-y-3 rounded-xl border border-white/20 bg-white/24 p-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                Detalhes — {purposeLabel(data.visit_purpose)}
              </h4>

              {isOccupational ? (
                <Field label="Empresa de origem" required>
                  <LookupSearch
                    endpoint="/external_entities/empresa/"
                    placeholder="Pesquisar empresa"
                    value={{ id: data.origin_company_id, name: data.origin_company_name }}
                    onChange={(company) =>
                      update({ origin_company_id: company.id, origin_company_name: company.name })
                    }
                  />
                </Field>
              ) : null}

              {isClinical ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Tipo de proveniência">
                    <select
                      value={data.provenance}
                      onChange={(event) => update({ provenance: event.target.value })}
                      className={inputCls}
                    >
                      {CLINICAL_PROVENANCE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="flex items-end">
                    <div className="w-full">
                      <ToggleRow
                        checked={data.is_organ_donor}
                        onChange={(checked) => update({ is_organ_donor: checked })}
                        icon={HeartHandshake}
                        title="Doador de órgãos"
                        tone="amber"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {isDonor ? (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2.5 text-xs text-rose-700 backdrop-blur-sm">
              <Droplets size={14} className="mt-0.5 shrink-0" />
              <span>
                Será adicionado o passo <strong>Doação de sangue</strong> para registar a colheita, sinais
                vitais e triagem.
              </span>
            </div>
          ) : null}
        </div>
      )
    }

    if (key === "identity") {
      return (
        <div className="space-y-3">
          <SectionTitle icon={Badge} title="Identificação do paciente" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Nome completo" required>
                <input
                  value={data.name}
                  onChange={(event) => update({ name: event.target.value })}
                  placeholder="Nome completo do paciente"
                  className={inputCls}
                  autoFocus
                />
              </Field>
            </div>

            <Field
              label="Data de nascimento"
              required={data.is_blood_donor}
              error={birthDateError(data.birth_date)}
              hint={ageLabel(data.birth_date) ? `Idade: ${ageLabel(data.birth_date)}` : null}
            >
              <input
                type="date"
                value={data.birth_date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => update({ birth_date: event.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label="Género">
              <select
                value={data.gender}
                onChange={(event) =>
                  update({
                    gender: event.target.value,
                    ...(event.target.value === "Masculino"
                      ? { pregnant: false, gestational_age_weeks: "" }
                      : {}),
                  })
                }
                className={inputCls}
              >
                <option value="Femenino">Feminino</option>
                <option value="Masculino">Masculino</option>
              </select>
            </Field>

            <Field label="Raça / origem">
              <select
                value={data.race_origin}
                onChange={(event) => update({ race_origin: event.target.value })}
                className={inputCls}
              >
                {RACE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tipo sanguíneo">
              <select
                value={data.blood_type}
                onChange={(event) => update({ blood_type: event.target.value })}
                className={inputCls}
              >
                {BLOOD_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tipo de documento">
              <select
                value={data.document_type}
                onChange={(event) => update({ document_type: event.target.value })}
                className={inputCls}
              >
                {DOCUMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Número do documento"
              error={documentNumberError(data.document_type, data.document_number)}
              hint={data.document_type === "NUIT" ? "9 dígitos" : null}
            >
              <input
                value={data.document_number}
                onChange={(event) => update({ document_number: event.target.value })}
                placeholder={data.document_type === "NUIT" ? "000000000" : "Número do documento"}
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      )
    }

    if (key === "contact") {
      return (
        <div className="space-y-3">
          <SectionTitle icon={Phone} title="Contacto e morada" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Field
              label="Telefone"
              error={phoneFeedback(data.contact).error}
              hint={phoneFeedback(data.contact).hint}
            >
              <input
                value={data.contact}
                onChange={(event) => update({ contact: event.target.value })}
                placeholder="84XXXXXXX"
                className={inputCls}
              />
            </Field>

            <Field label="Email" error={emailFeedback(data.email, "Email do paciente")}>
              <input
                type="email"
                value={data.email}
                onChange={(event) => update({ email: event.target.value })}
                placeholder="email@exemplo.com"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Rua">
              <input
                value={data.address_street}
                onChange={(event) => update({ address_street: event.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Número">
              <input
                value={data.address_number}
                onChange={(event) => update({ address_number: event.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Bairro">
              <input
                value={data.address_neighborhood}
                onChange={(event) => update({ address_neighborhood: event.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Cidade">
              <input
                value={data.address_city}
                onChange={(event) => update({ address_city: event.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Província">
              <input
                value={data.address_province}
                onChange={(event) => update({ address_province: event.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Código postal">
              <input
                value={data.address_postal_code}
                onChange={(event) => update({ address_postal_code: event.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="País">
              <input
                value={data.address_country}
                onChange={(event) => update({ address_country: event.target.value.toUpperCase() })}
                maxLength={2}
                className={inputCls}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Complemento">
                <input
                  value={data.address_complement}
                  onChange={(event) => update({ address_complement: event.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Morada em texto livre">
                <input
                  value={data.address}
                  onChange={(event) => update({ address: event.target.value })}
                  placeholder="Resumo da morada quando não há endereço estruturado"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>
        </div>
      )
    }

    if (key === "clinical") {
      const showPregnant = data.gender !== "Masculino"
      const showReplacementInapt = data.is_blood_donor
      const showInaptFields = showReplacementInapt && data.is_replacement_donor_inapt
      return (
        <div className="space-y-3">
          <SectionTitle icon={ShieldCheck} title="Informações clínicas e acompanhante" />
          {showPregnant || showReplacementInapt ? (
            <div className="grid gap-2 md:grid-cols-2">
              {showPregnant ? (
                <ToggleRow
                  checked={data.pregnant}
                  onChange={(checked) =>
                    update({ pregnant: checked, gestational_age_weeks: checked ? data.gestational_age_weeks : "" })
                  }
                  icon={HeartHandshake}
                  title="Gestante"
                />
              ) : null}
              {showReplacementInapt ? (
                <ToggleRow
                  checked={data.is_replacement_donor_inapt}
                  onChange={(checked) =>
                    update({
                      is_replacement_donor_inapt: checked,
                      replacement_donor_inapt_at: checked ? data.replacement_donor_inapt_at : "",
                      replacement_donor_inapt_reason: checked ? data.replacement_donor_inapt_reason : "",
                    })
                  }
                  icon={AlertTriangle}
                  title="Repositor inapto"
                  tone="amber"
                />
              ) : null}
            </div>
          ) : null}

          {data.pregnant || showInaptFields ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {data.pregnant ? (
                <Field label="Idade gestacional (semanas)" required>
                  <input
                    type="number"
                    min={1}
                    value={data.gestational_age_weeks}
                    onChange={(event) => update({ gestational_age_weeks: event.target.value })}
                    className={inputCls}
                  />
                </Field>
              ) : null}
              {showInaptFields ? (
                <>
                  <Field label="Inapto desde">
                    <input
                      type="datetime-local"
                      value={data.replacement_donor_inapt_at}
                      onChange={(event) => update({ replacement_donor_inapt_at: event.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Motivo de inaptidão">
                      <textarea
                        value={data.replacement_donor_inapt_reason}
                        onChange={(event) => update({ replacement_donor_inapt_reason: event.target.value })}
                        rows={3}
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {!isDonor ? (
            <div className="space-y-3">
              <SectionTitle icon={Users} title="Acompanhante" />
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Nome do acompanhante">
                  <input
                    value={data.companion_name}
                    onChange={(event) => update({ companion_name: event.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Parentesco">
                  <input
                    value={data.companion_relationship}
                    onChange={(event) => update({ companion_relationship: event.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Telefone do acompanhante">
                  <input
                    value={data.companion_contact}
                    onChange={(event) => update({ companion_contact: event.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field
                  label="Email do acompanhante"
                  error={emailFeedback(data.companion_email, "Email do acompanhante")}
                >
                  <input
                    type="email"
                    value={data.companion_email}
                    onChange={(event) => update({ companion_email: event.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
          ) : null}
        </div>
      )
    }

    if (key === "donation") {
      return (
        <div className="space-y-3">
          <SectionTitle icon={Droplets} title="Doação de sangue" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Tipo de doador">
              <select
                value={data.donor_role}
                onChange={(event) =>
                  update({
                    donor_role: event.target.value as DonorRole,
                    replacement_for_id: event.target.value === "REP" ? data.replacement_for_id : null,
                    replacement_for_name: event.target.value === "REP" ? data.replacement_for_name : "",
                  })
                }
                className={inputCls}
              >
                <option value="VOL">Voluntário</option>
                <option value="REP">Repositor</option>
              </select>
            </Field>
            <Field label="Tipo de doação">
              <select
                value={data.donation_type}
                onChange={(event) => update({ donation_type: event.target.value as "WBL" | "APH" })}
                className={inputCls}
              >
                <option value="WBL">Sangue total</option>
                <option value="APH">Aférese</option>
              </select>
            </Field>
            {data.donor_role === "REP" ? (
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Reposição para" required>
                  <LookupSearch
                    endpoint="/clinical/patient/"
                    placeholder="Pesquisar paciente"
                    value={{ id: data.replacement_for_id, name: data.replacement_for_name }}
                    onChange={(patient) =>
                      update({ replacement_for_id: patient.id, replacement_for_name: patient.name })
                    }
                  />
                </Field>
              </div>
            ) : null}
            <Field label="Estado da doação">
              <select
                value={data.donation_status}
                onChange={(event) => update({ donation_status: event.target.value as DonationStatus })}
                className={inputCls}
              >
                <option value="REG">Registada</option>
                <option value="SCR">Em triagem</option>
                <option value="COM">Concluída</option>
                <option value="CAN">Cancelada</option>
              </select>
            </Field>
            <Field label="Estado da triagem">
              <select
                value={data.screening_status}
                onChange={(event) => update({ screening_status: event.target.value as ScreeningStatus })}
                className={inputCls}
              >
                <option value="PEN">Pendente</option>
                <option value="APR">Aprovada</option>
                <option value="REJ">Rejeitada</option>
              </select>
            </Field>
            <Field label="Volume coletado (ml)">
              <input
                type="number"
                min={1}
                value={data.volume_ml}
                onChange={(event) => update({ volume_ml: event.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Coletado em">
              <input
                type="datetime-local"
                value={data.collected_at}
                onChange={(event) => update({ collected_at: event.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Processado em">
              <input
                type="datetime-local"
                value={data.processed_at}
                onChange={(event) => update({ processed_at: event.target.value })}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="space-y-3">
            <SectionTitle icon={CalendarClock} title="Triagem e sinais" />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Peso (kg)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={data.donor_weight_kg}
                  onChange={(event) => update({ donor_weight_kg: event.target.value })}
                  className={compactInputCls}
                />
              </Field>
              <Field label="Hemoglobina (g/dL)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={data.hemoglobin_g_dl}
                  onChange={(event) => update({ hemoglobin_g_dl: event.target.value })}
                  className={compactInputCls}
                />
              </Field>
              <Field label="Altura (cm)">
                <input
                  type="number"
                  min={0}
                  value={data.donor_height_cm}
                  onChange={(event) => update({ donor_height_cm: event.target.value })}
                  className={compactInputCls}
                />
              </Field>
              <Field label="Temperatura (C)">
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={data.temperature_c}
                  onChange={(event) => update({ temperature_c: event.target.value })}
                  className={compactInputCls}
                />
              </Field>
              <Field label="PA sistólica">
                <input
                  type="number"
                  min={0}
                  value={data.blood_pressure_systolic}
                  onChange={(event) => update({ blood_pressure_systolic: event.target.value })}
                  className={compactInputCls}
                />
              </Field>
              <Field label="PA diastólica">
                <input
                  type="number"
                  min={0}
                  value={data.blood_pressure_diastolic}
                  onChange={(event) => update({ blood_pressure_diastolic: event.target.value })}
                  className={compactInputCls}
                />
              </Field>
              <Field label="Pulso (bpm)">
                <input
                  type="number"
                  min={0}
                  value={data.pulse_bpm}
                  onChange={(event) => update({ pulse_bpm: event.target.value })}
                  className={compactInputCls}
                />
              </Field>
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle icon={ShieldCheck} title="Resultados laboratoriais" />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <TestSelect label="HIV" value={data.hiv_test} onChange={(value) => update({ hiv_test: value })} />
              <TestSelect
                label="Sífilis/RPR"
                value={data.syphilis_rpr_test}
                onChange={(value) => update({ syphilis_rpr_test: value })}
              />
              <TestSelect
                label="Hepatite B"
                value={data.hepatitis_b_hbsag_test}
                onChange={(value) => update({ hepatitis_b_hbsag_test: value })}
              />
              <TestSelect
                label="Hepatite C"
                value={data.hepatitis_c_anti_hcv_test}
                onChange={(value) => update({ hepatitis_c_anti_hcv_test: value })}
              />
              <TestSelect
                label="Malária"
                value={data.malaria_test}
                onChange={(value) => update({ malaria_test: value })}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Field label="Observações dos exames">
                <textarea
                  value={data.test_notes}
                  onChange={(event) => update({ test_notes: event.target.value })}
                  rows={3}
                  className={inputCls}
                />
              </Field>
              <Field label="Contraindicações">
                <textarea
                  value={data.contraindications}
                  onChange={(event) => update({ contraindications: event.target.value })}
                  rows={3}
                  className={inputCls}
                />
              </Field>
              <Field label="Observações">
                <textarea
                  value={data.donation_notes}
                  onChange={(event) => update({ donation_notes: event.target.value })}
                  rows={3}
                  className={inputCls}
                />
              </Field>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <SectionTitle icon={CheckCircle2} title="Confirmação" />
        <SummaryGroup title="Paciente">
          <SummaryRow label="Nome" value={data.name || "-"} />
          <SummaryRow label="Propósito da visita" value={purposeLabel(data.visit_purpose)} />
          <SummaryRow label="Proveniência" value={data.provenance} />
          {isOccupational ? <SummaryRow label="Empresa" value={data.origin_company_name || "-"} /> : null}
          <SummaryRow label="Nascimento" value={data.birth_date || "-"} />
          <SummaryRow label="Género" value={data.gender === "Masculino" ? "Masculino" : "Feminino"} />
          <SummaryRow label="Raça / origem" value={data.race_origin} />
          <SummaryRow label="Tipo sanguíneo" value={data.blood_type === "UNK" ? "Não informado" : data.blood_type} />
          <SummaryRow
            label="Documento"
            value={data.document_number ? `${data.document_type} ${data.document_number}` : "-"}
          />
        </SummaryGroup>
        <SummaryGroup title="Contacto e morada">
          <SummaryRow label="Telefone" value={data.contact || "-"} />
          <SummaryRow label="Email" value={data.email || "-"} />
          <SummaryRow
            label="Morada"
            value={
              [
                data.address_street,
                data.address_number,
                data.address_neighborhood,
                data.address_city,
                data.address_province,
                data.address_postal_code,
                data.address_complement,
              ]
                .filter(Boolean)
                .join(", ") ||
              data.address ||
              "-"
            }
          />
        </SummaryGroup>
        <SummaryGroup title={isDonor ? "Clínico" : "Clínico e acompanhante"}>
          <SummaryRow label="Gestante" value={data.pregnant ? `${data.gestational_age_weeks} semanas` : "Não"} />
          {isClinical ? (
            <SummaryRow label="Doador de órgãos" value={data.is_organ_donor ? "Sim" : "Não"} />
          ) : null}
          {isDonor ? (
            <SummaryRow label="Repositor inapto" value={data.is_replacement_donor_inapt ? "Sim" : "Não"} />
          ) : null}
          {!isDonor ? (
            <>
              <SummaryRow label="Acompanhante" value={data.companion_name || "-"} />
              <SummaryRow label="Contacto do acompanhante" value={data.companion_contact || "-"} />
            </>
          ) : null}
        </SummaryGroup>
        {data.is_blood_donor ? (
          <SummaryGroup title="Doação de sangue">
            <SummaryRow label="Bolsa" value="Gerada automaticamente" />
            <SummaryRow label="Tipo" value={data.donor_role === "VOL" ? "Voluntário" : "Repositor"} />
            {data.donor_role === "REP" ? (
              <SummaryRow label="Reposição para" value={data.replacement_for_name || "-"} />
            ) : null}
            <SummaryRow label="Volume" value={`${data.volume_ml || "450"} ml`} />
            <SummaryRow label="Triagem" value={screeningLabel(data.screening_status)} />
          </SummaryGroup>
        ) : null}
      </div>
    )
  }
}

function TestSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: TestResult
  onChange: (value: TestResult) => void
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value as TestResult)} className={compactInputCls}>
        {TEST_RESULT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden p-2 sm:p-3">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[calc(100vh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/35 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] supports-[backdrop-filter]:bg-white/30 dark:supports-[backdrop-filter]:bg-white/[0.05]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/20 px-3 py-2 dark:border-white/10">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1 text-[var(--gray-500)] transition hover:bg-white/50 hover:text-[var(--text)] dark:hover:bg-white/[0.08]"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function SummaryGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-xl border border-white/20 bg-white/24 p-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
      <h4 className="text-xs font-semibold uppercase text-[var(--gray-500)]">{title}</h4>
      <div className="divide-y divide-[var(--border)]">{children}</div>
    </section>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-xs">
      <span className="font-medium text-[var(--gray-500)]">{label}</span>
      <span className="max-w-[70%] text-right font-medium text-[var(--text)]">{value}</span>
    </div>
  )
}

function screeningLabel(value: ScreeningStatus) {
  if (value === "APR") return "Aprovada"
  if (value === "REJ") return "Rejeitada"
  return "Pendente"
}
