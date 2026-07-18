"use client"

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Edit3,
  Loader2,
  Save,
  Scissors,
  Search,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useDebounce from "@/hooks/useDebounce"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"

const REQUIRED_GROUPS = [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.RECEPCAO]

const GLASS =
  "rounded-lg border border-white/35 bg-white/45 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"

const inputClass =
  "h-8 w-full rounded-md border border-border bg-background/60 px-2 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-rose-500/40"
const lockedInputClass = `${inputClass} disabled:cursor-not-allowed disabled:bg-muted/70 disabled:text-muted-foreground disabled:opacity-80`

const textareaClass =
  "min-h-16 w-full resize-y rounded-md border border-border bg-background/60 px-2 py-1.5 text-xs leading-5 text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-rose-500/40"

const IMMUTABLE_STATUSES = new Set([
  "SURGERY_COMPLETED",
  "CONCLUIDA",
  "IN_RECOVERY",
  "RECOVERED",
  "REPORT_PENDING",
  "BILLING_PENDING",
  "CLOSED",
  "CANCELADA",
  "CANCELLED",
])

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  REQUESTED: "Solicitada",
  UNDER_ASSESSMENT: "Em avaliação",
  FINANCIAL_PENDING: "Financeiro pendente",
  AUTHORIZED: "Autorizada",
  AGENDADA: "Agendada",
  PATIENT_CHECKED_IN: "Check-in",
  PREOPERATIVE_PREPARATION: "Preparação pré-op.",
  PREPARED: "Preparada",
  IN_OPERATING_ROOM: "Em sala operatória",
  ANESTHESIA_STARTED: "Anestesia iniciada",
  SURGERY_STARTED: "Cirurgia iniciada",
  EM_ANDAMENTO: "Em andamento",
  SURGERY_COMPLETED: "Cirurgia realizada",
  CONCLUIDA: "Concluída",
  IN_RECOVERY: "Em recuperação",
  RECOVERED: "Recuperada",
  REPORT_PENDING: "Relatório pendente",
  BILLING_PENDING: "Faturação pendente",
  CLOSED: "Fechada",
  POSTPONED: "Adiada",
  CANCELADA: "Cancelada",
  CANCELLED: "Cancelada",
}

type Option = {
  id: number
  name?: string
  custom_id?: string
  code?: string
  employee_code?: string
  base_price?: string | number
  vat_percentage?: string | number
  applies_vat_by_default?: boolean
  surgery_type?: string
  room_type?: string
  status?: string
  active?: boolean
  sterile?: boolean
  is_surgical?: boolean
}

type Surgery = {
  id: number
  custom_id?: string
  patient?: number | null
  patient_name?: string
  specialty?: number | null
  specialty_name?: string
  surgeons?: number[]
  surgeon_names?: { id: number; name: string }[]
  operating_room?: number | null
  operating_room_name?: string
  procedures?: number[]
  procedure_names?: string[]
  procedure?: string | null
  description?: string | null
  preoperative_diagnosis?: string | null
  postoperative_diagnosis?: string | null
  scheduled_for?: string | null
  status?: string
  surgery_size?: string | null
  priority?: string | null
  classification?: string | null
  estimated_price?: string | number | null
  vat_percentage?: string | number | null
  applies_vat_by_default?: boolean
  invoice_id?: number | null
}

function toNumber(value: unknown) {
  const n = Number(String(value ?? "0").replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

function money(value: number) {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(value || 0)
}

function toLocalInput(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toApiDatetime(value: string) {
  return value ? new Date(value).toISOString() : null
}

function labelFor(option?: Option | null) {
  if (!option) return ""
  return [option.name, option.custom_id || option.code || option.employee_code].filter(Boolean).join(" · ") || `#${option.id}`
}

function pickLabel(id: number | null | undefined, rows: Option[], fallback?: string) {
  if (!id) return fallback || ""
  return labelFor(rows.find((row) => row.id === id) || null) || fallback || `#${id}`
}

function Field({ label, children, hint, error }: { label: string; children: ReactNode; hint?: string; error?: string }) {
  return (
    <label className="block space-y-0.5">
      <span className="whitespace-nowrap text-[10px] font-semibold text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-[9px] text-muted-foreground">{hint}</span> : null}
      {error ? <span className="block text-[9px] font-semibold text-rose-600 dark:text-rose-300">{error}</span> : null}
    </label>
  )
}

function Card({
  title,
  icon: Icon,
  children,
  accent = "bg-rose-500",
  className = "",
}: {
  title: string
  icon: typeof Scissors
  children: ReactNode
  accent?: string
  className?: string
}) {
  return (
    <section className={`relative overflow-visible ${GLASS} ${className}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="space-y-1 px-2 py-1.5 pl-4">
        <div className="flex items-center gap-1 border-b border-border/40 pb-1">
          <Icon size={12} className="shrink-0 text-rose-500" />
          <h2 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  )
}

function HeaderMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded border border-border/60 border-l-2 border-l-rose-500 bg-rose-500/5 px-1.5 py-0.5">
      <div className="whitespace-nowrap text-[9px] font-medium leading-tight text-muted-foreground">{label}</div>
      <div className="break-words text-[11px] font-bold leading-tight text-foreground md:truncate">{value}</div>
    </div>
  )
}

function Picker({
  label,
  value,
  options,
  query,
  onQuery,
  onPick,
  placeholder,
  error,
  multiple = false,
  emptyLabel = "Nenhuma opção encontrada.",
}: {
  label: string
  value: string
  options: Option[]
  query: string
  onQuery: (value: string) => void
  onPick: (option: Option) => void
  placeholder: string
  error?: string
  multiple?: boolean
  emptyLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [menuRect, setMenuRect] = useState<{ left: number; top: number; width: number } | null>(null)
  const debounced = useDebounce(query, 150)
  const visible = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    const rows = !q
      ? options
      : options.filter((item) =>
          [item.name, item.custom_id, item.code, item.employee_code, item.surgery_type, item.room_type, item.status]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
    return rows.slice(0, 12)
  }, [debounced, options])

  function updateMenuRect() {
    const rect = inputRef.current?.getBoundingClientRect()
    if (!rect) return
    setMenuRect({ left: rect.left, top: rect.bottom + 4, width: rect.width })
  }

  function openMenu() {
    updateMenuRect()
    setOpen(true)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    updateMenuRect()
    const handle = () => updateMenuRect()
    window.addEventListener("scroll", handle, true)
    window.addEventListener("resize", handle)
    return () => {
      window.removeEventListener("scroll", handle, true)
      window.removeEventListener("resize", handle)
    }
  }, [open])

  const menu =
    open && mounted && menuRect
      ? createPortal(
          <div
            className="fixed z-[2147483647] max-h-48 overflow-auto rounded-md border border-white/20 bg-white/10 p-1 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-white/10"
            style={{ left: menuRect.left, top: menuRect.top, width: menuRect.width }}
          >
            {visible.length === 0 ? (
              <div className="px-2 py-2 text-[11px] text-muted-foreground">{emptyLabel}</div>
            ) : (
              visible.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onPick(option)
                    onQuery(multiple ? "" : labelFor(option))
                    setOpen(false)
                  }}
                  className="block w-full rounded px-2 py-1 text-left text-[11px] leading-tight hover:bg-muted"
                >
                  <span className="block truncate font-semibold text-foreground">{labelFor(option)}</span>
                  <span className="block truncate text-[9px] text-muted-foreground">
                    {[option.surgery_type, option.room_type, option.status, option.base_price ? `${money(toNumber(option.base_price))} MZN` : ""].filter(Boolean).join(" · ")}
                  </span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )
      : null

  return (
    <Field label={label} error={error}>
      <div className="relative">
        <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onFocus={openMenu}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            onQuery(event.target.value)
            openMenu()
          }}
          className={`${inputClass} pl-7`}
          placeholder={value || placeholder}
        />
        {menu}
      </div>
    </Field>
  )
}

export default function EditSurgeryPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const router = useRouter()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [patients, setPatients] = useState<Option[]>([])
  const [employees, setEmployees] = useState<Option[]>([])
  const [rooms, setRooms] = useState<Option[]>([])
  const [procedures, setProcedures] = useState<Option[]>([])
  const [specialties, setSpecialties] = useState<Option[]>([])
  const [original, setOriginal] = useState<Surgery | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [patientId, setPatientId] = useState<number | null>(null)
  const [patientQuery, setPatientQuery] = useState("")
  const [surgeonIds, setSurgeonIds] = useState<number[]>([])
  const [surgeonQuery, setSurgeonQuery] = useState("")
  const [roomId, setRoomId] = useState<number | null>(null)
  const [roomQuery, setRoomQuery] = useState("")
  const [procedureIds, setProcedureIds] = useState<number[]>([])
  const [selectedProcedureRows, setSelectedProcedureRows] = useState<Option[]>([])
  const [procedureQuery, setProcedureQuery] = useState("")
  const debouncedProcedureQuery = useDebounce(procedureQuery, 250)
  const [specialtyId, setSpecialtyId] = useState<number | null>(null)
  const [specialtyQuery, setSpecialtyQuery] = useState("")
  const [surgerySize, setSurgerySize] = useState("PEQUENA")
  const [priority, setPriority] = useState("ELECTIVE")
  const [classification, setClassification] = useState("AMBULATORY")
  const [status, setStatus] = useState("REQUESTED")
  const [scheduledFor, setScheduledFor] = useState("")
  const [procedure, setProcedure] = useState("")
  const [preoperativeDiagnosis, setPreoperativeDiagnosis] = useState("")
  const [postoperativeDiagnosis, setPostoperativeDiagnosis] = useState("")
  const [description, setDescription] = useState("")
  const [estimatedPrice, setEstimatedPrice] = useState("")
  const [vatPercentage, setVatPercentage] = useState("5.00")
  const [appliesVat, setAppliesVat] = useState(true)

  const hydrate = useCallback((data: Surgery, refs: { patients: Option[]; employees: Option[]; rooms: Option[]; procedures: Option[]; specialties: Option[] }) => {
    setOriginal(data)
    setPatientId(data.patient || null)
    setPatientQuery(pickLabel(data.patient, refs.patients, data.patient_name))
    setSpecialtyId(data.specialty || null)
    setSpecialtyQuery(pickLabel(data.specialty, refs.specialties, data.specialty_name))
    setSurgeonIds(data.surgeons || data.surgeon_names?.map((item) => item.id).filter(Boolean) || [])
    setRoomId(data.operating_room || null)
    setRoomQuery(pickLabel(data.operating_room, refs.rooms, data.operating_room_name))
    const ids = data.procedures || []
    setProcedureIds(ids)
    setSelectedProcedureRows(refs.procedures.filter((item) => ids.includes(item.id)))
    setSurgerySize(data.surgery_size || "PEQUENA")
    setPriority(data.priority || "ELECTIVE")
    setClassification(data.classification || "AMBULATORY")
    setStatus(data.status || "REQUESTED")
    setScheduledFor(toLocalInput(data.scheduled_for))
    setProcedure(data.procedure || "")
    setPreoperativeDiagnosis(data.preoperative_diagnosis || "")
    setPostoperativeDiagnosis(data.postoperative_diagnosis || "")
    setDescription(data.description || "")
    setEstimatedPrice(String(data.estimated_price || ""))
    setVatPercentage(String(data.vat_percentage || "5.00"))
    setAppliesVat(data.applies_vat_by_default !== false)
  }, [])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [data, patientRes, employeeRes, roomRes, procedureRes, specialtyRes] = await Promise.all([
        apiFetch<Surgery>(`/surgery/surgery/${id}/`, { clientCache: safeRefreshToken === 0 }),
        apiFetchList<Option>("/clinical/patient/", { page: 1, pageSize: 300 }),
        apiFetchList<Option>("/human_resources/employee/", { page: 1, pageSize: 300 }),
        apiFetchList<Option>("/surgery/centro_cirurgico/", { page: 1, pageSize: 200, query: { status: "AVAILABLE", sterile: "true" } }),
        apiFetchList<Option>("/surgery/surgical_procedure/", { page: 1, pageSize: 300, query: { is_surgical: "true" } }),
        apiFetchList<Option>("/consultations/specialty/", { page: 1, pageSize: 200 }),
      ])
      const refs = {
        patients: patientRes.items,
        employees: employeeRes.items,
        rooms: roomRes.items.filter((room) => room.status === "AVAILABLE" && room.sterile !== false),
        procedures: procedureRes.items.filter((item) => item.active !== false && item.is_surgical !== false),
        specialties: specialtyRes.items,
      }
      setPatients(refs.patients)
      setEmployees(refs.employees)
      setRooms(refs.rooms)
      setProcedures(refs.procedures)
      setSpecialties(refs.specialties)
      hydrate(data, refs)
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar a cirurgia.")
    } finally {
      setLoading(false)
    }
  }, [hydrate, id, safeRefreshToken])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let mounted = true
    async function loadProcedures() {
      try {
        const query: Record<string, string> = { for_surgery_size: surgerySize, is_surgical: "true" }
        if (debouncedProcedureQuery.trim()) query.search = debouncedProcedureQuery.trim()
        const { items } = await apiFetchList<Option>("/surgery/surgical_procedure/", { page: 1, pageSize: 50, query })
        if (mounted) setProcedures(items.filter((item) => item.active !== false && item.is_surgical !== false))
      } catch {
        if (mounted) setProcedures([])
      }
    }
    loadProcedures()
    return () => {
      mounted = false
    }
  }, [debouncedProcedureQuery, surgerySize])

  const selectedPatient = patients.find((item) => item.id === patientId) || null
  const selectedSpecialty = specialties.find((item) => item.id === specialtyId) || null
  const selectedSurgeons = employees.filter((item) => surgeonIds.includes(item.id))
  const selectedRoom = rooms.find((item) => item.id === roomId) || null
  const selectedProcedures = selectedProcedureRows.filter((item) => procedureIds.includes(item.id))
  const procedureDrivenClassification = procedureIds.length > 0
  const proceduresTotal = selectedProcedures.reduce((acc, item) => acc + toNumber(item.base_price), 0)
  const totalEstimate = toNumber(estimatedPrice) || proceduresTotal
  const finalEstimate = appliesVat ? totalEstimate * (1 + toNumber(vatPercentage) / 100) : totalEstimate
  const immutable = Boolean(original?.status && IMMUTABLE_STATUSES.has(original.status))
  const compatibleRooms = useMemo(() => rooms.filter((room) => {
    const type = room.room_type || ""
    if (surgerySize === "PEQUENA") return ["MINOR", "GENERAL", "OPERATING_ROOM", "OTHER"].includes(type)
    return ["MAJOR", "OPERATING_ROOM", "HYBRID", "EMERGENCY_OR", "GENERAL", "OTHER"].includes(type)
  }), [rooms, surgerySize])

  useEffect(() => {
    if (roomId && !compatibleRooms.some((room) => room.id === roomId)) {
      setRoomId(null)
      setRoomQuery("")
    }
  }, [compatibleRooms, roomId])

  function toggleId(list: number[], nextId: number) {
    return list.includes(nextId) ? list.filter((item) => item !== nextId) : [...list, nextId]
  }

  function applyProcedureDefaults(chosen: Option[]) {
    if (chosen.length === 0) return
    const hasLarge = chosen.some((item) => item.surgery_type === "GRANDE")
    const hasSmall = chosen.some((item) => item.surgery_type === "PEQUENA")
    if (hasLarge) {
      setSurgerySize("GRANDE")
      setClassification("MAJOR")
    } else if (hasSmall) {
      setSurgerySize("PEQUENA")
      setClassification("MINOR")
    }
    const priceTotal = chosen.reduce((sum, item) => sum + toNumber(item.base_price), 0)
    if (priceTotal > 0) setEstimatedPrice(priceTotal.toFixed(2))
    const vatSource = chosen.find((item) => item.vat_percentage !== undefined && item.vat_percentage !== null)
    if (vatSource) setVatPercentage(String(vatSource.vat_percentage))
    const vatFlagSource = chosen.find((item) => item.applies_vat_by_default !== undefined)
    if (vatFlagSource) setAppliesVat(vatFlagSource.applies_vat_by_default !== false)
  }

  function validate() {
    const next: Record<string, string> = {}
    if (!patientId) next.patient = "Selecione o paciente."
    if (!procedure.trim() && procedureIds.length === 0) next.procedure = "Selecione procedimento ou descreva em texto livre."
    if (!scheduledFor) next.scheduledFor = "Informe a data prevista."
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (immutable || !validate()) return
    setSaving(true)
    setError(null)
    try {
      await apiFetch<Surgery>(`/surgery/surgery/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          patient: patientId,
          specialty: specialtyId,
          surgeons: surgeonIds,
          operating_room: roomId,
          procedures: procedureIds,
          procedure: procedure.trim(),
          description: description.trim(),
          preoperative_diagnosis: preoperativeDiagnosis.trim(),
          postoperative_diagnosis: postoperativeDiagnosis.trim(),
          scheduled_for: toApiDatetime(scheduledFor),
          status,
          surgery_size: surgerySize,
          priority,
          classification,
          estimated_price: totalEstimate.toFixed(2),
          vat_percentage: vatPercentage,
          applies_vat_by_default: appliesVat,
        }),
      })
      router.push(`/surgery/surgeries/${id}/`)
    } catch (err: any) {
      setError(err?.message || "Não foi possível guardar a cirurgia.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout requiredGroups={REQUIRED_GROUPS}>
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Carregando...</div>
      </AppLayout>
    )
  }

  if (!original) {
    return (
      <AppLayout requiredGroups={REQUIRED_GROUPS}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error || "Cirurgia não encontrada."}</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout requiredGroups={REQUIRED_GROUPS}>
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[99vw] space-y-1 px-0.5 pb-2">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-rose-500" />
          <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 pl-4 xl:flex-nowrap">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20">
              <Edit3 size={14} />
            </span>
            <div className="min-w-[12rem] flex-1">
              <h1 className="break-words text-sm font-bold leading-tight text-foreground xl:truncate">Editar cirurgia</h1>
              <p className="break-words text-[10px] leading-tight text-muted-foreground md:truncate">
                {original.custom_id || `#${original.id}`} · {selectedPatient ? labelFor(selectedPatient) : original.patient_name || "Paciente por definir"}
              </p>
            </div>
            <span className="inline-flex h-7 shrink-0 items-center rounded border border-amber-200 bg-amber-50 px-2 text-[11px] font-semibold text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
              {immutable ? "Edição bloqueada" : STATUS_LABEL[status] || status}
            </span>
            <Link
              href={`/surgery/surgeries/${id}/`}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-white/20 bg-white/10 px-2 text-[11px] font-medium text-muted-foreground backdrop-blur-sm transition hover:bg-white/20 hover:text-foreground"
            >
              <ArrowLeft size={12} /> Voltar
            </Link>
            {!immutable ? (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded bg-gradient-to-br from-rose-500 to-red-600 px-2 text-[11px] font-semibold text-white shadow-sm shadow-rose-500/20 transition hover:opacity-90 disabled:opacity-60"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Guardar
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-1 border-t border-white/20 px-2 py-1 pl-4 min-[520px]:grid-cols-3 md:grid-cols-6 dark:border-white/10">
            <HeaderMetric label="Porte" value={surgerySize === "PEQUENA" ? "Pequena" : "Grande"} />
            <HeaderMetric label="Prioridade" value={priority === "ELECTIVE" ? "Eletiva" : priority === "URGENT" ? "Urgente" : "Emergência"} />
            <HeaderMetric label="Sala" value={selectedRoom ? labelFor(selectedRoom) : original.operating_room_name || "-"} />
            <HeaderMetric label="Cirurgiões" value={selectedSurgeons.length || original.surgeon_names?.length || 0} />
            <HeaderMetric label="Prevista" value={scheduledFor ? new Date(scheduledFor).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"} />
            <HeaderMetric label="Total c/ IVA" value={money(finalEstimate)} />
          </div>
        </section>

        {immutable ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
            Esta cirurgia já está concluída, fechada ou cancelada. A edição é bloqueada de forma atómica pelo frontend e pelo backend.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <fieldset disabled={immutable || saving} className="grid grid-cols-1 gap-1 disabled:opacity-70 md:grid-cols-2">
          <Card title="Paciente e especialidade" icon={User} accent="bg-rose-500">
            <div className="grid grid-cols-1 gap-1 min-[620px]:grid-cols-2">
              <Picker label="Paciente" value={pickLabel(patientId, patients, original.patient_name)} options={patients} query={patientQuery} onQuery={setPatientQuery} onPick={(item) => setPatientId(item.id)} placeholder="Pesquisar paciente..." emptyLabel="Nenhum paciente encontrado." error={errors.patient} />
              <Picker label="Especialidade" value={pickLabel(specialtyId, specialties, original.specialty_name)} options={specialties} query={specialtyQuery} onQuery={setSpecialtyQuery} onPick={(item) => setSpecialtyId(item.id)} placeholder="Pesquisar especialidade..." emptyLabel="Nenhuma especialidade encontrada." />
            </div>
          </Card>

          <Card title="Equipa e sala" icon={Users} accent="bg-blue-500">
            <div className="grid grid-cols-1 gap-1 min-[620px]:grid-cols-2">
              <Picker label="Cirurgiões" value={selectedSurgeons.map(labelFor).join(", ")} options={employees} query={surgeonQuery} onQuery={setSurgeonQuery} onPick={(item) => setSurgeonIds((current) => toggleId(current, item.id))} placeholder="Pesquisar cirurgião..." emptyLabel="Nenhum cirurgião encontrado." multiple />
              <Picker label="Sala operatória" value={pickLabel(roomId, rooms, original.operating_room_name)} options={compatibleRooms} query={roomQuery} onQuery={setRoomQuery} onPick={(item) => setRoomId(item.id)} placeholder="Pesquisar sala disponível..." emptyLabel="Nenhuma sala disponível para este porte." />
            </div>
            {selectedSurgeons.length ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {selectedSurgeons.map((item) => (
                  <button key={item.id} type="button" onClick={() => setSurgeonIds((current) => current.filter((surgeonId) => surgeonId !== item.id))} className="rounded-full border border-border bg-background/50 px-2 py-0.5 text-[10px]">
                    {labelFor(item)}
                  </button>
                ))}
              </div>
            ) : null}
          </Card>

          <Card title="Classificação e data" icon={ShieldCheck} accent="bg-amber-500">
            <div className="grid grid-cols-1 gap-1 min-[520px]:grid-cols-2 xl:grid-cols-4">
              <Field label="Porte">
                <select value={surgerySize} onChange={(event) => setSurgerySize(event.target.value)} className={lockedInputClass} disabled={procedureDrivenClassification}>
                  <option value="PEQUENA">Pequena</option>
                  <option value="GRANDE">Grande</option>
                </select>
              </Field>
              <Field label="Prioridade">
                <select value={priority} onChange={(event) => setPriority(event.target.value)} className={lockedInputClass} disabled={procedureDrivenClassification}>
                  <option value="ELECTIVE">Eletiva</option>
                  <option value="URGENT">Urgente</option>
                  <option value="EMERGENCY">Emergência</option>
                </select>
              </Field>
              <Field label="Classificação">
                <select value={classification} onChange={(event) => setClassification(event.target.value)} className={lockedInputClass} disabled={procedureDrivenClassification}>
                  <option value="AMBULATORY">Ambulatória</option>
                  <option value="DAY_SURGERY">Cirurgia de dia</option>
                  <option value="INPATIENT">Com internamento</option>
                  <option value="ELECTIVE">Eletiva</option>
                  <option value="EMERGENCY">Emergência</option>
                  <option value="MINOR">Pequena cirurgia</option>
                  <option value="MAJOR">Grande cirurgia</option>
                </select>
              </Field>
              <Field label="Agendada para" error={errors.scheduledFor}>
                <input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className={inputClass} />
              </Field>
            </div>
          </Card>

          <Card title="Estado e faturação" icon={DollarSign} accent="bg-emerald-500">
            <div className="grid grid-cols-1 gap-1 min-[520px]:grid-cols-2 xl:grid-cols-4">
              <Field label="Estado">
                <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
                  <option value="DRAFT">Rascunho</option>
                  <option value="REQUESTED">Solicitada</option>
                  <option value="UNDER_ASSESSMENT">Em avaliação</option>
                  <option value="AUTHORIZED">Autorizada</option>
                  <option value="AGENDADA">Agendada</option>
                  <option value="PATIENT_CHECKED_IN">Check-in</option>
                  <option value="PREOPERATIVE_PREPARATION">Preparação pré-op.</option>
                  <option value="PREPARED">Preparada</option>
                </select>
              </Field>
              <Field label="Preço estimado">
                <input type="number" step="0.01" value={estimatedPrice} onChange={(event) => setEstimatedPrice(event.target.value)} className={lockedInputClass} placeholder={money(proceduresTotal)} disabled={procedureDrivenClassification} />
              </Field>
              <Field label="IVA (%)">
                <input type="number" step="0.01" value={vatPercentage} onChange={(event) => setVatPercentage(event.target.value)} className={lockedInputClass} disabled={procedureDrivenClassification} />
              </Field>
              <Field label="Aplicar IVA">
                <button type="button" onClick={() => setAppliesVat((current) => !current)} disabled={procedureDrivenClassification} className={`inline-flex h-8 w-full items-center justify-center gap-1 rounded-md border px-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-80 ${appliesVat ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-background/60 text-muted-foreground"}`}>
                  <CheckCircle2 size={13} /> {appliesVat ? "Sim" : "Não"}
                </button>
              </Field>
            </div>
          </Card>

          <Card title="Procedimentos" icon={Scissors} accent="bg-violet-500" className="md:col-span-2">
            <div className="grid grid-cols-1 gap-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Picker
                label="Catálogo"
                value={selectedProcedures.map(labelFor).join(", ")}
                options={procedures}
                query={procedureQuery}
                onQuery={setProcedureQuery}
                onPick={(item) => {
                  const next = toggleId(procedureIds, item.id)
                  setProcedureIds(next)
                  const known = [...selectedProcedureRows.filter((row) => row.id !== item.id), item]
                  const chosen = known.filter((row) => next.includes(row.id))
                  setSelectedProcedureRows(chosen)
                  applyProcedureDefaults(chosen)
                }}
                placeholder="Pesquisar procedimento..."
                emptyLabel="Nenhum procedimento encontrado."
                error={errors.procedure}
                multiple
              />
              <Field label="Procedimento em texto livre" error={errors.procedure}>
                <input value={procedure} onChange={(event) => setProcedure(event.target.value)} className={inputClass} placeholder="Use se não existir no catálogo" />
              </Field>
            </div>
            {selectedProcedures.length ? (
              <div className="mt-1 grid grid-cols-1 gap-1 md:grid-cols-3">
                {selectedProcedures.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const next = procedureIds.filter((procedureId) => procedureId !== item.id)
                      const chosen = selectedProcedureRows.filter((row) => row.id !== item.id)
                      setProcedureIds(next)
                      setSelectedProcedureRows(chosen)
                      applyProcedureDefaults(chosen)
                    }}
                    className="rounded border border-border bg-background/50 px-2 py-1 text-left text-[10px] hover:bg-muted"
                  >
                    <span className="block truncate font-semibold">{labelFor(item)}</span>
                    <span className="block text-muted-foreground">{money(toNumber(item.base_price))} MZN · {item.surgery_type || "AMBAS"}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </Card>

          <Card title="Diagnóstico pré-operatório" icon={Stethoscope} accent="bg-sky-500">
            <Field label="Diagnóstico">
              <textarea value={preoperativeDiagnosis} onChange={(event) => setPreoperativeDiagnosis(event.target.value)} className={textareaClass} placeholder="Diagnóstico e indicação cirúrgica..." />
            </Field>
          </Card>

          <Card title="Descrição e notas" icon={ClipboardList} accent="bg-slate-500">
            <Field label="Descrição">
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} className={textareaClass} placeholder="Resumo clínico, requisitos de sala, material especial..." />
            </Field>
          </Card>

          <Card title="Pós-operatório" icon={CalendarClock} accent="bg-teal-500" className="md:col-span-2">
            <Field label="Diagnóstico pós-operatório">
              <textarea value={postoperativeDiagnosis} onChange={(event) => setPostoperativeDiagnosis(event.target.value)} className={textareaClass} placeholder="Preencher depois da cirurgia se aplicável." />
            </Field>
          </Card>
        </fieldset>
      </form>
    </AppLayout>
  )
}
