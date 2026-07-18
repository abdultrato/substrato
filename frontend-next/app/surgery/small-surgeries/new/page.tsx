"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Loader2,
  Save,
  Scissors,
  Search,
  Stethoscope,
  Trash2,
  User,
  Users,
  X,
  AlertCircle,
  ClipboardList,
  Building2,
} from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

/* ── constants ──────────────────────────────────────────────────── */

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const inputCls = "w-full rounded-lg border border-white/30 bg-white/40 px-2.5 py-1.5 text-[12px] text-[var(--text)] placeholder-[var(--gray-400)] backdrop-blur-sm focus:border-violet-400 focus:outline-none dark:border-white/10 dark:bg-white/[0.06]"

const PRIORITY_CHOICES = [
  { value: "EMERGENCY", label: "Emergência", color: "text-rose-600 dark:text-rose-400" },
  { value: "URGENT", label: "Urgente", color: "text-amber-600 dark:text-amber-400" },
  { value: "ELECTIVE", label: "Eletiva", color: "text-emerald-600 dark:text-emerald-400" },
  { value: "SCHEDULED", label: "Agendada", color: "text-blue-600 dark:text-blue-400" },
]

const SURGERY_SIZE_CHOICES = [
  { value: "PEQUENA", label: "Pequena cirurgia", desc: "Procedimento simples, baixo risco, sem internamento" },
  { value: "GRANDE", label: "Grande cirurgia", desc: "Alto risco, anestesia geral, internamento obrigatório" },
]

const PROCEDURE_SURGERY_TYPE_LABELS: Record<string, string> = {
  PEQUENA: "Pequena",
  GRANDE: "Grande",
  AMBAS: "Ambas",
}

const TEAM_ROLES = [
  { value: "SURGEON", label: "Cirurgião principal" },
  { value: "ASSISTANT_SURGEON", label: "Cirurgião assistente" },
  { value: "ANESTHESIOLOGIST", label: "Anestesista" },
  { value: "SCRUB_NURSE", label: "Enfermeiro instrumentista" },
  { value: "CIRCULATING_NURSE", label: "Enfermeiro circulante" },
  { value: "TECHNICIAN", label: "Técnico cirúrgico" },
  { value: "OBSERVER", label: "Observador" },
]

/* ── wizard steps definition ────────────────────────────────────── */

const STEPS = [
  { id: 1, label: "Paciente & procedimento", icon: <User size={14} /> },
  { id: 2, label: "Cirurgião & bloco", icon: <Stethoscope size={14} /> },
  { id: 3, label: "Equipa & diagnóstico", icon: <Users size={14} /> },
  { id: 4, label: "Agendamento & revisão", icon: <CalendarClock size={14} /> },
]

/* ── sub-components ─────────────────────────────────────────────── */

function FieldRow({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">
        {label}{required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      {children}
    </div>
  )
}

function DropdownPortal({ anchorRef, portalRef, open, children }: {
  anchorRef: React.RefObject<HTMLDivElement | null>
  portalRef: React.RefObject<HTMLDivElement | null>
  open: boolean
  children: React.ReactNode
}) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!open || !anchorRef.current) return
    function update() {
      if (!anchorRef.current) return
      const r = anchorRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update) }
  }, [open, anchorRef])
  if (!open || !pos || !mounted) return null
  return createPortal(
    <div ref={portalRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="rounded-lg border border-violet-200 bg-white shadow-xl backdrop-blur-md dark:border-white/20 dark:bg-zinc-900/90">
      {children}
    </div>,
    document.body
  )
}

function SearchSelect({ label, placeholder, endpoint, labelField = "name", value, onChange, required, displayLabel }: {
  label: string; placeholder: string; endpoint: string; labelField?: string
  value: number | null; onChange: (id: number | null, label: string) => void; required?: boolean
  displayLabel?: string
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node
      if (ref.current?.contains(t) || portalRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  const search = useCallback(async (q: string) => {
    try {
      const d = await apiFetch<any>(`${endpoint}?search=${encodeURIComponent(q)}&limit=20`)
      setResults(Array.isArray(d) ? d : (d.results || []))
    } catch { setResults([]) }
  }, [endpoint])

  useEffect(() => { if (open) search(query) }, [query, open, search])

  function select(item: any) {
    const lbl = [item[labelField], item.custom_id].filter(Boolean).join(" — ")
    setSelectedLabel(lbl)
    onChange(item.id, lbl)
    setOpen(false)
    setQuery("")
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedLabel("")
    onChange(null, "")
  }

  return (
    <FieldRow label={label} required={required}>
      <div ref={ref}>
        <div className={`${inputCls} flex cursor-pointer items-center justify-between gap-1 ${value ? "border-violet-300/60 dark:border-violet-700/40" : ""}`}
          onClick={() => setOpen(o => !o)}>
          {value && (selectedLabel || displayLabel)
            ? <span className="truncate font-medium text-[var(--text)]">{selectedLabel || displayLabel}</span>
            : <span className="text-[var(--gray-400)]">{placeholder}</span>}
          <div className="flex shrink-0 items-center gap-1">
            {value ? <button type="button" onClick={clear} className="text-[var(--gray-400)] hover:text-rose-500"><X size={11} /></button> : null}
            <Search size={11} className="text-[var(--gray-400)]" />
          </div>
        </div>
        <DropdownPortal anchorRef={ref} portalRef={portalRef} open={open}>
          <div className="border-b border-violet-100 px-2 py-1.5 dark:border-white/10">
            <input autoFocus className="w-full bg-transparent text-[12px] text-[var(--text)] outline-none placeholder-[var(--gray-400)]"
              placeholder="Pesquisar..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {results.length === 0
              ? <div className="px-3 py-3 text-center text-[11px] text-[var(--gray-400)]">Sem resultados</div>
              : results.map(item => (
                <div key={item.id}
                  className={`cursor-pointer px-3 py-2 text-[12px] hover:bg-violet-50 dark:hover:bg-white/10 ${item.id === value ? "bg-violet-50 font-semibold text-violet-700 dark:bg-violet-900/20 dark:text-violet-300" : "text-[var(--text)]"}`}
                  onMouseDown={e => { e.preventDefault(); select(item) }}>
                  {item[labelField] || item.name}
                  {item.custom_id ? <span className="ml-1.5 text-[10px] text-[var(--gray-400)]">{item.custom_id}</span> : null}
                </div>
              ))}
          </div>
        </DropdownPortal>
      </div>
    </FieldRow>
  )
}

function ProcedureMultiSelect({ selected, onChange, surgerySize }: {
  selected: { id: number; name: string; base_price?: string; surgery_type?: string }[]
  onChange: (items: { id: number; name: string; base_price?: string; surgery_type?: string }[]) => void
  surgerySize: string
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node
      if (ref.current?.contains(t) || portalRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  const search = useCallback(async (q: string, size: string) => {
    try {
      const params = new URLSearchParams({
        limit: "30",
        active: "true",
        for_surgery_size: size,
      })
      if (q.trim()) params.set("search", q.trim())
      const d = await apiFetch<any>(`/surgery/surgical_procedure/?${params.toString()}`)
      setResults(Array.isArray(d) ? d : (d.results || []))
    } catch { setResults([]) }
  }, [])

  useEffect(() => { if (open) search(query, surgerySize) }, [query, open, search, surgerySize])

  function toggle(item: any) {
    const exists = selected.find(s => s.id === item.id)
    if (exists) onChange(selected.filter(s => s.id !== item.id))
    else onChange([...selected, { id: item.id, name: item.name, base_price: item.base_price, surgery_type: item.surgery_type }])
  }

  return (
    <FieldRow label="Procedimentos cirúrgicos" required>
      <div ref={ref}>
        {selected.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {selected.map(s => (
              <span key={s.id} className="inline-flex items-center gap-1 rounded-md border border-violet-300/60 bg-violet-50/80 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                {s.name}
                {s.surgery_type ? <span className="opacity-60">{PROCEDURE_SURGERY_TYPE_LABELS[s.surgery_type] || s.surgery_type}</span> : null}
                {s.base_price && parseFloat(s.base_price) > 0
                  ? <span className="opacity-60">{parseFloat(s.base_price).toLocaleString("pt-PT")} MT</span>
                  : null}
                <button type="button" onClick={() => onChange(selected.filter(x => x.id !== s.id))} className="hover:text-rose-500"><X size={9} /></button>
              </span>
            ))}
          </div>
        )}
        <div className={`${inputCls} flex cursor-pointer items-center justify-between gap-1`}
          onClick={() => setOpen(o => !o)}>
          <span className="text-[var(--gray-400)]">{selected.length > 0 ? "Adicionar mais..." : "Pesquisar e adicionar procedimento..."}</span>
          <Search size={11} className="text-[var(--gray-400)]" />
        </div>
        <DropdownPortal anchorRef={ref} portalRef={portalRef} open={open}>
          <div className="border-b border-violet-100 px-2 py-1.5 dark:border-white/10">
            <input autoFocus className="w-full bg-transparent text-[12px] text-[var(--text)] outline-none placeholder-[var(--gray-400)]"
              placeholder="Pesquisar procedimento..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {results.length === 0
              ? <div className="px-3 py-3 text-center text-[11px] text-[var(--gray-400)]">Sem resultados</div>
              : results.map(item => {
                const sel = !!selected.find(s => s.id === item.id)
                return (
                  <div key={item.id}
                    className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-[12px] hover:bg-violet-50 dark:hover:bg-white/10 ${sel ? "bg-violet-50/60 dark:bg-violet-900/10" : ""}`}
                    onMouseDown={e => { e.preventDefault(); toggle(item) }}>
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${sel ? "border-violet-500 bg-violet-500 text-white" : "border-[var(--gray-300)]"}`}>
                      {sel ? <Check size={9} /> : null}
                    </span>
                    <span className={sel ? "font-semibold text-violet-700 dark:text-violet-300" : "text-[var(--text)]"}>{item.name}</span>
                    {item.surgery_type ? (
                      <span className="rounded-full border border-violet-200/70 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                        {PROCEDURE_SURGERY_TYPE_LABELS[item.surgery_type] || item.surgery_type}
                      </span>
                    ) : null}
                    {item.base_price && parseFloat(item.base_price) > 0
                      ? <span className="ml-auto text-[10px] font-medium text-[var(--gray-500)]">{parseFloat(item.base_price).toLocaleString("pt-PT")} MT</span>
                      : null}
                  </div>
                )
              })}
          </div>
        </DropdownPortal>
      </div>
    </FieldRow>
  )
}

type SurgeonOption = {
  id: number
  name: string
  specialty_id?: number | null
  specialty_name?: string | null
  specialty_code?: string | null
}

function SurgeonMultiSelect({ selected, onChange, onSpecialtyFromSurgeon }: {
  selected: SurgeonOption[]
  onChange: (items: SurgeonOption[]) => void
  onSpecialtyFromSurgeon?: (specialtyId: number, specialtyName: string) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node
      if (ref.current?.contains(t) || portalRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  const search = useCallback(async (q: string) => {
    try {
      const d = await apiFetch<any>(`/consultations/doctors/?is_surgeon=true&search=${encodeURIComponent(q)}&limit=20`)
      setResults(Array.isArray(d) ? d : (d.results || []))
    } catch { setResults([]) }
  }, [])

  useEffect(() => { if (open) search(query) }, [query, open, search])

  function toggle(item: any) {
    const exists = selected.find(s => s.id === item.id)
    if (exists) onChange(selected.filter(s => s.id !== item.id))
    else {
      const specialtyId = Number(item.specialty_id || 0)
      const specialtyName = String(item.specialty_name || "").trim()
      const specialtyCode = String(item.specialty_code || "").trim()
      const specialtyLabel = [specialtyName, specialtyCode].filter(Boolean).join(" — ")
      onChange([...selected, { id: item.id, name: item.name, specialty_id: specialtyId || null, specialty_name: specialtyName, specialty_code: specialtyCode }])
      if (specialtyId && specialtyLabel) onSpecialtyFromSurgeon?.(specialtyId, specialtyLabel)
    }
  }

  return (
    <FieldRow label="Cirurgiões">
      <div ref={ref}>
        {selected.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {selected.map(s => (
              <span key={s.id} className="inline-flex items-center gap-1 rounded-md border border-emerald-300/60 bg-emerald-50/80 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                {s.name}
                {s.specialty_name ? <span className="opacity-65">· {s.specialty_name}</span> : null}
                <button type="button" onClick={() => onChange(selected.filter(x => x.id !== s.id))} className="hover:text-rose-500"><X size={9} /></button>
              </span>
            ))}
          </div>
        )}
        <div className={`${inputCls} flex cursor-pointer items-center justify-between gap-1`}
          onClick={() => setOpen(o => !o)}>
          <span className="text-[var(--gray-400)]">{selected.length > 0 ? "Adicionar cirurgião..." : "Pesquisar cirurgião..."}</span>
          <Search size={11} className="text-[var(--gray-400)]" />
        </div>
        <DropdownPortal anchorRef={ref} portalRef={portalRef} open={open}>
          <div className="border-b border-violet-100 px-2 py-1.5 dark:border-white/10">
            <input autoFocus className="w-full bg-transparent text-[12px] text-[var(--text)] outline-none placeholder-[var(--gray-400)]"
              placeholder="Pesquisar médico..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {results.filter(r => !selected.find(s => s.id === r.id)).length === 0
              ? <div className="px-3 py-3 text-center text-[11px] text-[var(--gray-400)]">Sem resultados</div>
              : results.filter(r => !selected.find(s => s.id === r.id)).map(item => (
                <div key={item.id}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[12px] hover:bg-violet-50 dark:hover:bg-white/10"
                  onMouseDown={e => { e.preventDefault(); toggle(item) }}>
                  <Stethoscope size={11} className="shrink-0 text-[var(--gray-400)]" />
                  <span className="text-[var(--text)]">{item.name}</span>
                  {item.specialty_name ? (
                    <span className="ml-auto truncate text-[10px] font-medium text-violet-500">{item.specialty_name}</span>
                  ) : null}
                </div>
              ))}
          </div>
        </DropdownPortal>
      </div>
    </FieldRow>
  )
}

/* ── step progress bar ──────────────────────────────────────────── */

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => {
        const done = s.id < current
        const active = s.id === current
        return (
          <div key={s.id} className="flex flex-1 items-center">
            <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all
              ${active ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                : done ? "text-emerald-600 dark:text-emerald-400"
                : "text-[var(--gray-400)]"}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px]
                ${active ? "border-violet-500 bg-violet-500 text-white"
                  : done ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-[var(--gray-300)] text-[var(--gray-400)]"}`}>
                {done ? <Check size={9} /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-1 h-px flex-1 transition-all ${s.id < current ? "bg-emerald-400" : "bg-[var(--gray-200)] dark:bg-white/10"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── review row ─────────────────────────────────────────────────── */

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-white/20 py-2 last:border-0 dark:border-white/10">
      <span className="w-36 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">{label}</span>
      <span className="text-[12px] text-[var(--text)]">{value || <span className="italic text-[var(--gray-400)]">—</span>}</span>
    </div>
  )
}

function teamRoleLabel(role: string) {
  return TEAM_ROLES.find((item) => item.value === role)?.label || role
}

/* ── main page ──────────────────────────────────────────────────── */

type TeamMember = { tempId: string; employeeId: number | null; employeeName: string; role: string }

export default function SmallSurgeryNewPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // step 1
  const [patient, setPatient] = useState<number | null>(null)
  const [patientLabel, setPatientLabel] = useState("")
  const [procedures, setProcedures] = useState<{ id: number; name: string; base_price?: string; surgery_type?: string }[]>([])
  const [priority, setPriority] = useState("ELECTIVE")
  const [surgerySize, setSurgerySize] = useState("PEQUENA")

  // step 2
  const [surgeons, setSurgeons] = useState<SurgeonOption[]>([])
  const [specialty, setSpecialty] = useState<number | null>(null)
  const [specialtyLabel, setSpecialtyLabel] = useState("")
  const [operatingRoom, setOperatingRoom] = useState<number | null>(null)
  const [operatingRoomLabel, setOperatingRoomLabel] = useState("")

  // step 3
  const [team, setTeam] = useState<TeamMember[]>([])
  const [addingTeam, setAddingTeam] = useState(false)
  const [teamQuery, setTeamQuery] = useState("")
  const [teamResults, setTeamResults] = useState<any[]>([])
  const [teamRole, setTeamRole] = useState("ASSISTANT_SURGEON")
  const teamRef = useRef<HTMLDivElement>(null)
  const teamInputRef = useRef<HTMLDivElement>(null)
  const teamPortalRef = useRef<HTMLDivElement>(null)
  const [preDiag, setPreDiag] = useState("")
  const [posDiag, setPosDiag] = useState("")

  // step 4
  const [scheduledFor, setScheduledFor] = useState("")
  const [notes, setNotes] = useState("")

  // team search
  useEffect(() => {
    if (!addingTeam) return
    const t = setTimeout(async () => {
      try {
        const d = await apiFetch<any>(`/consultations/doctors/?search=${encodeURIComponent(teamQuery)}&limit=20`)
        setTeamResults(Array.isArray(d) ? d : (d.results || []))
      } catch { setTeamResults([]) }
    }, 200)
    return () => clearTimeout(t)
  }, [teamQuery, addingTeam])

  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node
      if (teamRef.current?.contains(t) || teamPortalRef.current?.contains(t)) return
      setAddingTeam(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  function addTeamMember(emp: any) {
    setTeam(prev => {
      if (prev.some(m => m.employeeId === emp.id)) return prev
      return [...prev, { tempId: `new-${Date.now()}`, employeeId: emp.id, employeeName: emp.name, role: teamRole }]
    })
    setTeamQuery(""); setAddingTeam(false)
  }

  /* step validation */
  const canAdvance = useCallback(() => {
    if (step === 1) return !!patient && procedures.length > 0
    if (step === 2) return true // surgeon optional
    if (step === 3) return true
    return true
  }, [step, patient, procedures])

  /* submit */
  const submit = useCallback(async () => {
    setSaving(true); setError(null)
    try {
      const d = await apiFetch<any>("/surgery/small_surgery/", {
        method: "POST",
        body: JSON.stringify({
          patient,
          procedures: procedures.map(p => p.id),
          surgeons: surgeons.map(s => Number(s.id)),
          specialty: specialty ?? null,
          ward: operatingRoom ?? null,
          preoperative_diagnosis: preDiag || "",
          postoperative_diagnosis: posDiag || "",
          priority,
          surgery_size: surgerySize,
          scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          status: scheduledFor ? "AGENDADA" : "DRAFT",
        }),
      })
      router.push(`/surgery/small-surgeries/${d.id}`)
    } catch (e: any) {
      setError(e?.message || "Erro ao criar cirurgia.")
      setSaving(false)
    }
  }, [patient, procedures, surgeons, specialty, operatingRoom, preDiag, posDiag, priority, surgerySize, scheduledFor, router])

  /* ── render ── */

  const totalPrice = procedures.reduce((sum, p) => sum + (p.base_price ? parseFloat(p.base_price) : 0), 0)

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-[98vw] space-y-2 px-1 py-1">

        {/* header */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-col gap-2 px-4 py-2.5 pl-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                  <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                  <span>/</span>
                  <Link href="/surgery/small-surgeries" className="hover:text-foreground">Pequenas cirurgias</Link>
                  <span>/</span>
                  <span className="font-semibold text-foreground">Nova cirurgia</span>
                </div>
                <h1 className="mt-0.5 font-display text-base font-semibold text-foreground">Nova pequena cirurgia</h1>
              </div>
              <div className="flex items-center gap-3">
                {totalPrice > 0 && (
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[10px] text-[var(--gray-500)]">Preço total (IVA 5%)</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[13px] font-semibold text-violet-700 dark:text-violet-300">
                        {(totalPrice * 1.05).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT
                      </span>
                      <span className="text-[10px] text-[var(--gray-400)]">
                        ({totalPrice.toLocaleString("pt-PT")} + IVA)
                      </span>
                    </div>
                  </div>
                )}
                <Link href="/surgery/small-surgeries"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted">
                  <ArrowLeft size={11} /> Cancelar
                </Link>
              </div>
            </div>
            <StepBar current={step} />
          </div>
        </section>

        {/* error */}
        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-300/50 bg-rose-50/60 px-4 py-3 text-sm text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertCircle size={14} /> {error}
          </div>
        ) : null}

        {/* ── step 1: Paciente & procedimento ── */}
        {step === 1 && (
          <section className={`relative ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-sky-400" />
            <div className="flex flex-col gap-4 px-4 py-4 pl-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                  <User size={12} /> Paciente & procedimento
                </div>
                <button type="button" disabled={!canAdvance()} onClick={() => setStep(2)}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-40 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                  Próximo <ArrowRight size={11} />
                </button>
              </div>

              <SearchSelect label="Paciente" placeholder="Pesquisar por nome ou nº processo..." required
                endpoint="/clinical/patient/" labelField="name"
                value={patient} onChange={(v, l) => { setPatient(v); setPatientLabel(l) }} />

              <ProcedureMultiSelect selected={procedures} onChange={setProcedures} surgerySize={surgerySize} />

              {/* priority */}
              <FieldRow label="Prioridade">
                <div className="grid grid-cols-4 gap-2">
                  {PRIORITY_CHOICES.map(p => (
                    <button key={p.value} type="button"
                      onClick={() => setPriority(p.value)}
                      className={`rounded-lg border px-2.5 py-2 text-center text-[11px] font-semibold transition
                        ${priority === p.value
                          ? "border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-600/60 dark:bg-violet-900/30 dark:text-violet-300"
                          : "border-white/30 bg-white/20 text-[var(--gray-500)] hover:border-violet-200 dark:border-white/10 dark:bg-white/[0.03]"}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </FieldRow>

              {/* surgery size */}
              <FieldRow label="Tipo de cirurgia">
                <div className="grid grid-cols-2 gap-2">
                  {SURGERY_SIZE_CHOICES.map(c => (
                    <button key={c.value} type="button"
                      onClick={() => setSurgerySize(c.value)}
                      className={`rounded-lg border px-3 py-2.5 text-left transition
                        ${surgerySize === c.value
                          ? "border-violet-400 bg-violet-50 dark:border-violet-600/60 dark:bg-violet-900/30"
                          : "border-white/30 bg-white/20 hover:border-violet-200 dark:border-white/10 dark:bg-white/[0.03]"}`}>
                      <div className={`text-[11px] font-semibold ${surgerySize === c.value ? "text-violet-700 dark:text-violet-300" : "text-[var(--text)]"}`}>{c.label}</div>
                      <div className="text-[10px] text-[var(--gray-400)]">{c.desc}</div>
                    </button>
                  ))}
                </div>
              </FieldRow>

              {totalPrice > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-violet-200/50 bg-violet-50/40 px-3 py-2 dark:border-violet-700/20 dark:bg-violet-900/10">
                  <span className="text-[11px] text-[var(--gray-500)]">Preço estimado (procedimentos)</span>
                  <span className="text-[13px] font-semibold text-violet-700 dark:text-violet-300">{totalPrice.toLocaleString("pt-PT")} MT</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── step 2: Cirurgião & bloco ── */}
        {step === 2 && (
          <section className={`relative ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-emerald-400" />
            <div className="flex flex-col gap-4 px-4 py-4 pl-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                  <Stethoscope size={12} /> Cirurgião & bloco operatório
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:bg-muted">
                    <ArrowLeft size={11} /> Anterior
                  </button>
                  <button type="button" onClick={() => setStep(3)}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                    Próximo <ArrowRight size={11} />
                  </button>
                </div>
              </div>

              <SurgeonMultiSelect
                selected={surgeons}
                onChange={setSurgeons}
                onSpecialtyFromSurgeon={(specialtyId, label) => {
                  setSpecialty(specialtyId)
                  setSpecialtyLabel(label)
                }}
              />

              <SearchSelect label="Especialidade" placeholder="Pesquisar especialidade..."
                endpoint="/consultations/specialty/" labelField="name"
                displayLabel={specialtyLabel}
                value={specialty} onChange={(v, l) => { setSpecialty(v); setSpecialtyLabel(l) }} />

              <SearchSelect label="Bloco operatório" placeholder="Pesquisar enfermaria / bloco..."
                endpoint="/nursing/ward/" labelField="name"
                value={operatingRoom} onChange={(v, l) => { setOperatingRoom(v); setOperatingRoomLabel(l) }} />

              <div className={`rounded-lg border border-white/20 bg-white/20 px-3 py-2.5 text-[11px] text-[var(--gray-400)] dark:bg-white/[0.03]`}>
                <Building2 size={12} className="mb-1 inline-block opacity-60" /> Todos os campos desta etapa são opcionais e podem ser definidos posteriormente.
              </div>
            </div>
          </section>
        )}

        {/* ── step 3: Equipa & diagnóstico ── */}
        {step === 3 && (
          <section className={`relative ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-indigo-400" />
            <div className="flex flex-col gap-4 px-4 py-4 pl-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                  <Users size={12} /> Equipa cirúrgica & diagnóstico
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setStep(2)}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:bg-muted">
                    <ArrowLeft size={11} /> Anterior
                  </button>
                  <button type="button" onClick={() => setStep(4)}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                    Próximo <ArrowRight size={11} />
                  </button>
                </div>
              </div>

              {/* team list */}
              <FieldRow label="Equipa cirúrgica">
                <div className="flex flex-col gap-1.5">
                  {team.map(m => (
                    <div key={m.tempId} className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/20 px-2.5 py-2 dark:bg-white/[0.03]">
                      <User size={12} className="shrink-0 text-[var(--gray-400)]" />
                      <span className="flex-1 truncate text-[12px] text-[var(--text)]">{m.employeeName}</span>
                      <select className="rounded border border-white/20 bg-transparent px-1.5 py-0.5 text-[11px] text-[var(--gray-500)] focus:outline-none"
                        value={m.role} onChange={e => setTeam(prev => prev.map(x => x.tempId === m.tempId ? { ...x, role: e.target.value } : x))}>
                        {TEAM_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      <button type="button" onClick={() => setTeam(prev => prev.filter(x => x.tempId !== m.tempId))}
                        className="text-[var(--gray-400)] hover:text-rose-500"><Trash2 size={11} /></button>
                    </div>
                  ))}

                  {/* add member */}
                  <div ref={teamRef}>
                    {!addingTeam ? (
                      <button type="button" onClick={() => { setAddingTeam(true); setTeamQuery("") }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--gray-300)] px-3 py-1.5 text-[11px] text-[var(--gray-500)] hover:border-violet-400 hover:text-violet-600 dark:border-white/20">
                        + Adicionar membro
                      </button>
                    ) : (
                      <div className="rounded-lg border border-violet-200/50 bg-violet-50/30 p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="mb-2 flex items-center gap-2">
                          <select className="rounded border border-white/20 bg-transparent px-1.5 py-0.5 text-[11px] text-[var(--text)] focus:outline-none"
                            value={teamRole} onChange={e => setTeamRole(e.target.value)}>
                            {TEAM_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                          <button type="button" onClick={() => setAddingTeam(false)} className="ml-auto text-[var(--gray-400)] hover:text-rose-500"><X size={12} /></button>
                        </div>
                        <div ref={teamInputRef}>
                          <input autoFocus className={inputCls} placeholder="Pesquisar profissional..."
                            value={teamQuery} onChange={e => setTeamQuery(e.target.value)} />
                        </div>
                        <DropdownPortal anchorRef={teamInputRef} portalRef={teamPortalRef} open={addingTeam && (teamResults.length > 0 || teamQuery.length > 0)}>
                          <div className="max-h-96 overflow-y-auto">
                            {teamResults.filter(e => !team.some(m => m.employeeId === e.id)).length === 0
                              ? <div className="px-3 py-2 text-[11px] text-[var(--gray-400)]">Sem resultados</div>
                              : teamResults.filter(e => !team.some(m => m.employeeId === e.id)).map(emp => (
                                <div key={emp.id}
                                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[12px] hover:bg-violet-50 dark:hover:bg-white/10"
                                  onMouseDown={e => { e.preventDefault(); addTeamMember(emp) }}>
                                  <User size={11} className="text-[var(--gray-400)]" />
                                  <span className="text-[var(--text)]">{emp.name}</span>
                                  {emp.role_name ? <span className="ml-auto text-[10px] text-[var(--gray-400)]">{emp.role_name}</span> : null}
                                </div>
                              ))}
                          </div>
                        </DropdownPortal>
                      </div>
                    )}
                  </div>
                </div>
              </FieldRow>

              <FieldRow label="Diagnóstico pré-operatório">
                <textarea rows={2} className={`${inputCls} resize-none`} placeholder="Descrever o diagnóstico antes da cirurgia..."
                  value={preDiag} onChange={e => setPreDiag(e.target.value)} />
              </FieldRow>

              <FieldRow label="Diagnóstico pós-operatório">
                <textarea rows={2} className={`${inputCls} resize-none`} placeholder="Preencher após a cirurgia..."
                  value={posDiag} onChange={e => setPosDiag(e.target.value)} />
              </FieldRow>
            </div>
          </section>
        )}

        {/* ── step 4: Agendamento & revisão ── */}
        {step === 4 && (
          <section className={`relative ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-amber-400" />
            <div className="flex flex-col gap-4 px-4 py-4 pl-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                  <CalendarClock size={12} /> Agendamento & revisão
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setStep(3)}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:bg-muted">
                    <ArrowLeft size={11} /> Anterior
                  </button>
                  <button type="button" disabled={saving || !patient || procedures.length === 0} onClick={submit}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-500 px-4 text-[11px] font-semibold text-white transition hover:bg-violet-600 disabled:opacity-40">
                    {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                    {saving ? "A criar..." : "Criar cirurgia"}
                  </button>
                </div>
              </div>

              <FieldRow label="Data e hora agendada">
                <input type="datetime-local" className={inputCls} value={scheduledFor}
                  onChange={e => setScheduledFor(e.target.value)} />
              </FieldRow>

              <FieldRow label="Notas adicionais">
                <textarea rows={2} className={`${inputCls} resize-none`} placeholder="Instruções ou observações..."
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </FieldRow>

              {/* review summary */}
              <div className="rounded-lg border border-white/30 bg-white/20 px-1 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                  <ClipboardList size={11} /> Resumo
                </div>
                <div className="px-3 pb-3">
                  <ReviewRow label="Paciente" value={patientLabel} />
                  <ReviewRow label="Procedimentos" value={procedures.length > 0
                    ? <span className="flex flex-wrap gap-1">{procedures.map(p => <span key={p.id} className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">{p.name}</span>)}</span>
                    : null} />
                  <ReviewRow label="Prioridade" value={PRIORITY_CHOICES.find(p => p.value === priority)?.label} />
                  <ReviewRow label="Tipo de cirurgia" value={SURGERY_SIZE_CHOICES.find(c => c.value === surgerySize)?.label} />
                  <ReviewRow label="Cirurgiões" value={surgeons.length > 0 ? surgeons.map(s => s.name).join(", ") : null} />
                  <ReviewRow label="Especialidade" value={specialtyLabel || null} />
                  <ReviewRow label="Bloco" value={operatingRoomLabel || null} />
                  <ReviewRow label="Equipa" value={team.length > 0
                    ? (
                      <span className="flex flex-wrap gap-1">
                        {team.map((member) => (
                          <span
                            key={member.tempId}
                            className="inline-flex max-w-full items-center gap-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                          >
                            <span className="truncate">{member.employeeName}</span>
                            <span className="shrink-0 opacity-70">· {teamRoleLabel(member.role)}</span>
                          </span>
                        ))}
                      </span>
                    )
                    : null} />
                  <ReviewRow label="Agendada para" value={scheduledFor ? new Date(scheduledFor).toLocaleString("pt-PT") : null} />
                  {totalPrice > 0 && <ReviewRow label="Preço estimado" value={`${totalPrice.toLocaleString("pt-PT")} MT`} />}
                </div>
              </div>
            </div>
          </section>
        )}

      </div>
    </AppLayout>
  )
}
