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

const CLASSIFICATION_CHOICES = [
  { value: "MINOR", label: "Minor", desc: "Procedimento simples, baixo risco" },
  { value: "INTERMEDIATE", label: "Intermediária", desc: "Risco moderado, anestesia geral" },
  { value: "MAJOR", label: "Major", desc: "Alto risco, internamento obrigatório" },
  { value: "COMPLEX", label: "Complexa", desc: "Risco elevado, UCI provável" },
]

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

function SearchSelect({ label, placeholder, endpoint, labelField = "name", value, onChange, required }: {
  label: string; placeholder: string; endpoint: string; labelField?: string
  value: number | null; onChange: (id: number | null, label: string) => void; required?: boolean
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
          {value && selectedLabel
            ? <span className="truncate font-medium text-[var(--text)]">{selectedLabel}</span>
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

function ProcedureMultiSelect({ selected, onChange }: {
  selected: { id: number; name: string; base_price?: string }[]
  onChange: (items: { id: number; name: string; base_price?: string }[]) => void
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
      const d = await apiFetch<any>(`/surgery/surgical_procedure/?search=${encodeURIComponent(q)}&limit=30`)
      setResults(Array.isArray(d) ? d : (d.results || []))
    } catch { setResults([]) }
  }, [])

  useEffect(() => { if (open) search(query) }, [query, open, search])

  function toggle(item: any) {
    const exists = selected.find(s => s.id === item.id)
    if (exists) onChange(selected.filter(s => s.id !== item.id))
    else onChange([...selected, { id: item.id, name: item.name, base_price: item.base_price }])
  }

  return (
    <FieldRow label="Procedimentos cirúrgicos" required>
      <div ref={ref}>
        {selected.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {selected.map(s => (
              <span key={s.id} className="inline-flex items-center gap-1 rounded-md border border-violet-300/60 bg-violet-50/80 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                {s.name}
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
  const [procedures, setProcedures] = useState<{ id: number; name: string; base_price?: string }[]>([])
  const [priority, setPriority] = useState("ELECTIVE")
  const [classification, setClassification] = useState("MINOR")

  // step 2
  const [surgeon, setSurgeon] = useState<number | null>(null)
  const [surgeonLabel, setSurgeonLabel] = useState("")
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
    setTeam(prev => [...prev, { tempId: `new-${Date.now()}`, employeeId: emp.id, employeeName: emp.name, role: teamRole }])
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
          surgeon: surgeon ?? null,
          specialty: specialty ?? null,
          operating_room: operatingRoom ?? null,
          preoperative_diagnosis: preDiag || null,
          postoperative_diagnosis: posDiag || null,
          priority,
          classification,
          scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          status: scheduledFor ? "AGENDADA" : "DRAFT",
        }),
      })
      router.push(`/surgery/small-surgeries/${d.id}`)
    } catch (e: any) {
      setError(e?.message || "Erro ao criar cirurgia.")
      setSaving(false)
    }
  }, [patient, procedures, surgeon, specialty, operatingRoom, preDiag, posDiag, priority, classification, scheduledFor, router])

  /* ── render ── */

  const totalPrice = procedures.reduce((sum, p) => sum + (p.base_price ? parseFloat(p.base_price) : 0), 0)

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
      <div className="mx-auto w-full max-w-2xl space-y-4 px-1 py-1">

        {/* header */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex items-center justify-between gap-3 px-4 py-3 pl-5">
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
            <Link href="/surgery/small-surgeries"
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted">
              <ArrowLeft size={11} /> Cancelar
            </Link>
          </div>
        </section>

        {/* step bar */}
        <section className={`${GLASS} px-3 py-2.5`}>
          <StepBar current={step} />
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
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                <User size={12} /> Paciente & procedimento
              </div>

              <SearchSelect label="Paciente" placeholder="Pesquisar por nome ou nº processo..." required
                endpoint="/clinical/patient/" labelField="name"
                value={patient} onChange={(v, l) => { setPatient(v); setPatientLabel(l) }} />

              <ProcedureMultiSelect selected={procedures} onChange={setProcedures} />

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

              {/* classification */}
              <FieldRow label="Classificação">
                <div className="grid grid-cols-2 gap-2">
                  {CLASSIFICATION_CHOICES.map(c => (
                    <button key={c.value} type="button"
                      onClick={() => setClassification(c.value)}
                      className={`rounded-lg border px-3 py-2 text-left transition
                        ${classification === c.value
                          ? "border-violet-400 bg-violet-50 dark:border-violet-600/60 dark:bg-violet-900/30"
                          : "border-white/30 bg-white/20 hover:border-violet-200 dark:border-white/10 dark:bg-white/[0.03]"}`}>
                      <div className={`text-[11px] font-semibold ${classification === c.value ? "text-violet-700 dark:text-violet-300" : "text-[var(--text)]"}`}>{c.label}</div>
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
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                <Stethoscope size={12} /> Cirurgião & bloco operatório
              </div>

              <SearchSelect label="Cirurgião" placeholder="Pesquisar médico..."
                endpoint="/consultations/doctors/" labelField="name"
                value={surgeon} onChange={(v, l) => { setSurgeon(v); setSurgeonLabel(l) }} />

              <SearchSelect label="Especialidade" placeholder="Pesquisar especialidade..."
                endpoint="/consultations/specialty/" labelField="name"
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
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                <Users size={12} /> Equipa cirúrgica & diagnóstico
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
                            {teamResults.length === 0
                              ? <div className="px-3 py-2 text-[11px] text-[var(--gray-400)]">Sem resultados</div>
                              : teamResults.map(emp => (
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
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                <CalendarClock size={12} /> Agendamento & revisão
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
                  <ReviewRow label="Classificação" value={CLASSIFICATION_CHOICES.find(c => c.value === classification)?.label} />
                  <ReviewRow label="Cirurgião" value={surgeonLabel || null} />
                  <ReviewRow label="Especialidade" value={specialtyLabel || null} />
                  <ReviewRow label="Bloco" value={operatingRoomLabel || null} />
                  <ReviewRow label="Equipa" value={team.length > 0 ? `${team.length} membro(s)` : null} />
                  <ReviewRow label="Agendada para" value={scheduledFor ? new Date(scheduledFor).toLocaleString("pt-PT") : null} />
                  {totalPrice > 0 && <ReviewRow label="Preço estimado" value={`${totalPrice.toLocaleString("pt-PT")} MT`} />}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* nav buttons */}
        <div className="flex items-center justify-between gap-2 pb-4">
          {step > 1
            ? <button type="button" onClick={() => setStep(s => s - 1)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] text-muted-foreground hover:bg-muted">
                <ArrowLeft size={12} /> Anterior
              </button>
            : <div />}

          {step < 4
            ? <button type="button" disabled={!canAdvance()} onClick={() => setStep(s => s + 1)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-4 text-[12px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-40 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                Próximo <ArrowRight size={12} />
              </button>
            : <button type="button" disabled={saving || !patient || procedures.length === 0} onClick={submit}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-500 px-5 text-[12px] font-semibold text-white transition hover:bg-violet-600 disabled:opacity-40 dark:border-violet-700/40">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? "A criar..." : "Criar cirurgia"}
              </button>}
        </div>

      </div>
    </AppLayout>
  )
}
