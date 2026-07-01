"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  CalendarClock,
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
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

/* ── helpers ──────────────────────────────────────────────────── */

const STATUS_CHOICES = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "REQUESTED", label: "Solicitada" },
  { value: "UNDER_ASSESSMENT", label: "Em avaliação" },
  { value: "FINANCIAL_PENDING", label: "Financeiro pendente" },
  { value: "AUTHORIZED", label: "Autorizada" },
  { value: "AGENDADA", label: "Agendada" },
  { value: "PATIENT_CHECKED_IN", label: "Check-in" },
  { value: "PREOPERATIVE_PREPARATION", label: "Preparação pré-op." },
  { value: "PREPARED", label: "Preparada" },
  { value: "IN_OPERATING_ROOM", label: "Em sala operatória" },
  { value: "ANESTHESIA_STARTED", label: "Anestesia iniciada" },
  { value: "SURGERY_STARTED", label: "Cirurgia iniciada" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "SURGERY_COMPLETED", label: "Cirurgia realizada" },
  { value: "CONCLUIDA", label: "Concluída" },
  { value: "IN_RECOVERY", label: "Em recuperação" },
  { value: "RECOVERED", label: "Recuperado" },
  { value: "REPORT_PENDING", label: "Relatório pendente" },
  { value: "BILLING_PENDING", label: "Faturação pendente" },
  { value: "CLOSED", label: "Fechada" },
  { value: "POSTPONED", label: "Adiada" },
  { value: "CANCELADA", label: "Cancelada" },
]

const PRIORITY_CHOICES = [
  { value: "EMERGENCY", label: "Emergência" },
  { value: "URGENT", label: "Urgente" },
  { value: "ELECTIVE", label: "Eletiva" },
  { value: "SCHEDULED", label: "Agendada" },
]

const CLASSIFICATION_CHOICES = [
  { value: "MINOR", label: "Minor" },
  { value: "INTERMEDIATE", label: "Intermediária" },
  { value: "MAJOR", label: "Major" },
  { value: "COMPLEX", label: "Complexa" },
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

/* ── sub-components ───────────────────────────────────────────── */

function SurfaceCard({ title, icon, accent = "bg-sky-400", children }: {
  title: string; icon: React.ReactNode; accent?: string; children: React.ReactNode
}) {
  return (
    <section className={`relative ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${accent}`} />
      <div className="flex flex-col gap-3 px-3 py-3 pl-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
          {icon}<span>{title}</span>
        </div>
        {children}
      </div>
    </section>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)]">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full rounded-lg border border-white/30 bg-white/40 px-2.5 py-1.5 text-[12px] text-[var(--text)] placeholder-[var(--gray-400)] backdrop-blur-sm focus:border-[var(--primary-400)] focus:outline-none dark:border-white/10 dark:bg-white/[0.06]"
const selectCls = `${inputCls} cursor-pointer`

/* Portal dropdown — mounts directly on document.body via createPortal */
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
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open, anchorRef])

  if (!open || !pos || !mounted) return null

  return createPortal(
    <div
      ref={portalRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="rounded-lg border border-violet-200 bg-white shadow-xl dark:border-white/20 dark:bg-[var(--surface-1)]"
    >
      {children}
    </div>,
    document.body
  )
}

/* Searchable single-select dropdown */
function SearchSelect({
  label, placeholder, endpoint, labelField = "name", value, onChange,
}: {
  label: string
  placeholder: string
  endpoint: string
  labelField?: string
  value: number | null
  onChange: (id: number | null, label: string) => void
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
      const r = Array.isArray(d) ? d : (d.results || [])
      setResults(r)
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
    <FieldRow label={label}>
      <div ref={ref}>
        <div
          className={`${inputCls} flex cursor-pointer items-center justify-between gap-1`}
          onClick={() => setOpen(o => !o)}
        >
          {value && selectedLabel
            ? <span className="truncate text-[var(--text)]">{selectedLabel}</span>
            : <span className="text-[var(--gray-400)]">{placeholder}</span>}
          <div className="flex shrink-0 items-center gap-1">
            {value ? (
              <button type="button" onClick={clear} className="text-[var(--gray-400)] hover:text-rose-500">
                <X size={11} />
              </button>
            ) : null}
            <Search size={11} className="text-[var(--gray-400)]" />
          </div>
        </div>
        <DropdownPortal anchorRef={ref} portalRef={portalRef} open={open}>
          <div className="border-b border-violet-100 px-2 py-1.5 dark:border-white/10">
            <input
              autoFocus
              className="w-full bg-transparent text-[12px] text-[var(--text)] outline-none placeholder-[var(--gray-400)]"
              placeholder="Pesquisar..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {results.length === 0
              ? <div className="px-3 py-2 text-[11px] text-[var(--gray-400)]">Sem resultados</div>
              : results.map(item => (
                <div
                  key={item.id}
                  className={`cursor-pointer px-3 py-1.5 text-[12px] hover:bg-violet-50 dark:hover:bg-white/10 ${item.id === value ? "font-semibold text-violet-700 dark:text-violet-300" : "text-[var(--text)]"}`}
                  onMouseDown={e => { e.preventDefault(); select(item) }}
                >
                  {item[labelField] || item.name}
                  {item.custom_id ? <span className="ml-1 text-[10px] text-[var(--gray-400)]">{item.custom_id}</span> : null}
                </div>
              ))
            }
          </div>
        </DropdownPortal>
      </div>
    </FieldRow>
  )
}

/* Multi-select for procedures */
function ProcedureMultiSelect({
  selected, onChange,
}: {
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
      const r = Array.isArray(d) ? d : (d.results || [])
      setResults(r)
    } catch { setResults([]) }
  }, [])

  useEffect(() => { if (open) search(query) }, [query, open, search])

  function toggle(item: any) {
    const exists = selected.find(s => s.id === item.id)
    if (exists) {
      onChange(selected.filter(s => s.id !== item.id))
    } else {
      onChange([...selected, { id: item.id, name: item.name, base_price: item.base_price }])
    }
  }

  function remove(id: number) {
    onChange(selected.filter(s => s.id !== id))
  }

  return (
    <FieldRow label="Procedimentos cirúrgicos">
      <div ref={ref}>
        {/* selected chips */}
        {selected.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {selected.map(s => (
              <span key={s.id} className="inline-flex items-center gap-1 rounded-md border border-violet-300/60 bg-violet-50/80 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                {s.name}
                <button type="button" onClick={() => remove(s.id)} className="hover:text-rose-500"><X size={9} /></button>
              </span>
            ))}
          </div>
        )}
        <div
          className={`${inputCls} flex cursor-pointer items-center justify-between gap-1`}
          onClick={() => setOpen(o => !o)}
        >
          <span className="text-[var(--gray-400)]">Adicionar procedimento...</span>
          <Search size={11} className="text-[var(--gray-400)]" />
        </div>
        <DropdownPortal anchorRef={ref} portalRef={portalRef} open={open}>
          <div className="border-b border-violet-100 px-2 py-1.5 dark:border-white/10">
            <input
              autoFocus
              className="w-full bg-transparent text-[12px] text-[var(--text)] outline-none placeholder-[var(--gray-400)]"
              placeholder="Pesquisar procedimento..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {results.length === 0
              ? <div className="px-3 py-2 text-[11px] text-[var(--gray-400)]">Sem resultados</div>
              : results.map(item => {
                const isSelected = !!selected.find(s => s.id === item.id)
                return (
                  <div
                    key={item.id}
                    className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-violet-50 dark:hover:bg-white/10 ${isSelected ? "bg-violet-50 dark:bg-violet-900/20" : ""}`}
                    onMouseDown={e => { e.preventDefault(); toggle(item) }}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected ? "border-violet-500 bg-violet-500 text-white" : "border-[var(--gray-300)]"}`}>
                      {isSelected ? <CheckCircle2 size={10} /> : null}
                    </span>
                    <span className={isSelected ? "font-semibold text-violet-700 dark:text-violet-300" : "text-[var(--text)]"}>
                      {item.name}
                    </span>
                    {item.base_price ? <span className="ml-auto text-[10px] text-[var(--gray-400)]">{item.base_price} MT</span> : null}
                  </div>
                )
              })
            }
          </div>
        </DropdownPortal>
      </div>
    </FieldRow>
  )
}

/* Team member row */
function TeamMemberRow({
  member, onRemove, onChangeRole,
}: {
  member: { tempId: string; employeeId: number | null; employeeName: string; role: string }
  onRemove: () => void
  onChangeRole: (role: string) => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/20 px-2 py-1.5 dark:bg-white/[0.03]">
      <User size={12} className="shrink-0 text-[var(--gray-400)]" />
      <span className="flex-1 truncate text-[12px] text-[var(--text)]">{member.employeeName || "—"}</span>
      <select
        className="rounded border border-white/20 bg-transparent px-1.5 py-0.5 text-[11px] text-[var(--gray-500)] focus:outline-none"
        value={member.role}
        onChange={e => onChangeRole(e.target.value)}
      >
        {TEAM_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <button type="button" onClick={onRemove} className="text-[var(--gray-400)] hover:text-rose-500">
        <Trash2 size={11} />
      </button>
    </div>
  )
}

/* ── main page ────────────────────────────────────────────────── */

type TeamMember = {
  tempId: string
  employeeId: number | null
  employeeName: string
  role: string
}

export default function SmallSurgeryEditPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [code, setCode] = useState("")

  // 1 — patient
  const [patient, setPatient] = useState<number | null>(null)
  const [patientLabel, setPatientLabel] = useState("")

  // 2 — procedures (multi)
  const [procedures, setProcedures] = useState<{ id: number; name: string; base_price?: string }[]>([])

  // 3 — surgeon + specialty (from RH/consultations)
  const [surgeon, setSurgeon] = useState<number | null>(null)
  const [surgeonLabel, setSurgeonLabel] = useState("")
  const [specialty, setSpecialty] = useState<number | null>(null)
  const [specialtyLabel, setSpecialtyLabel] = useState("")

  // 4 — operating room (bloco — from nursing/ward)
  const [operatingRoom, setOperatingRoom] = useState<number | null>(null)
  const [operatingRoomLabel, setOperatingRoomLabel] = useState("")

  // 5 — surgical team
  const [team, setTeam] = useState<TeamMember[]>([])
  const [addingTeam, setAddingTeam] = useState(false)
  const [teamQuery, setTeamQuery] = useState("")
  const [teamResults, setTeamResults] = useState<any[]>([])
  const [teamRole, setTeamRole] = useState("ASSISTANT_SURGEON")
  const teamRef = useRef<HTMLDivElement>(null)
  const teamInputRef = useRef<HTMLDivElement>(null)
  const teamPortalRef = useRef<HTMLDivElement>(null)

  // 6 — diagnoses
  const [preDiag, setPreDiag] = useState("")
  const [posDiag, setPosDiag] = useState("")

  // 7 — status + dates
  const [status, setStatus] = useState("DRAFT")
  const [priority, setPriority] = useState("ELECTIVE")
  const [classification, setClassification] = useState("")
  const [scheduledFor, setScheduledFor] = useState("")
  const [startedAt, setStartedAt] = useState("")
  const [endedAt, setEndedAt] = useState("")
  const [completedAt, setCompletedAt] = useState("")

  // 8 — financial

  const toDatetimeLocal = (v: any) => {
    if (!v) return ""
    try { return new Date(v).toISOString().slice(0, 16) } catch { return "" }
  }

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const d = await apiFetch<Record<string, any>>(`/surgery/small_surgery/${id}/`)
      setCode(d.custom_id || `#${d.id}`)
      setPatient(d.patient ?? null)
      setPatientLabel(d.patient_name || "")
      setProcedures((d.procedures || []).map((pid: number) => ({ id: pid, name: `#${pid}` })))
      setSurgeon(d.surgeon ?? null)
      setSurgeonLabel(d.surgeon_name || "")
      setSpecialty(d.specialty ?? null)
      setSpecialtyLabel(d.specialty_name || "")
      setOperatingRoom(d.operating_room ?? null)
      setOperatingRoomLabel(d.operating_room_name || "")
      setPreDiag(d.preoperative_diagnosis || "")
      setPosDiag(d.postoperative_diagnosis || "")
      setStatus(d.status || "DRAFT")
      setPriority(d.priority || "ELECTIVE")
      setClassification(d.classification || "")
      setScheduledFor(toDatetimeLocal(d.scheduled_for || d.agendada_para))
      setStartedAt(toDatetimeLocal(d.started_at))
      setEndedAt(toDatetimeLocal(d.ended_at))
      setCompletedAt(toDatetimeLocal(d.completed_at))


      // Load procedure names if IDs exist
      if (d.procedures?.length) {
        const procs = await apiFetch<any>(`/surgery/surgical_procedure/?limit=100`)
        const all: any[] = Array.isArray(procs) ? procs : (procs.results || [])
        const mapped = d.procedures.map((pid: number) => {
          const found = all.find((p: any) => p.id === pid)
          return found ? { id: found.id, name: found.name, base_price: found.base_price } : { id: pid, name: `#${pid}` }
        })
        setProcedures(mapped)
      }

      // Load team
      const teamData = await apiFetch<any>(`/surgery/equipa_cirurgica/?surgery=${id}&limit=50`)
      const teamList: any[] = Array.isArray(teamData) ? teamData : (teamData.results || [])
      setTeam(teamList.map((t: any) => ({
        tempId: String(t.id),
        employeeId: t.employee,
        employeeName: t.employee_name || `#${t.employee}`,
        role: t.role || "ASSISTANT_SURGEON",
      })))
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // team member search
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

  function addTeamMember(emp: any) {
    setTeam(prev => [...prev, {
      tempId: `new-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      role: teamRole,
    }])
    setTeamQuery("")
    setAddingTeam(false)
  }

  // close team picker on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node
      if (teamRef.current?.contains(t) || teamPortalRef.current?.contains(t)) return
      setAddingTeam(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  const save = useCallback(async () => {
    setSaving(true); setError(null); setSuccess(false)
    try {
      await apiFetch(`/surgery/small_surgery/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          patient,
          procedures: procedures.map(p => p.id),
          surgeon: surgeon ?? null,
          specialty: specialty ?? null,
          operating_room: operatingRoom ?? null,
          preoperative_diagnosis: preDiag,
          postoperative_diagnosis: posDiag,
          status,
          priority,
          classification: classification || null,
          scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          started_at: startedAt ? new Date(startedAt).toISOString() : null,
          ended_at: endedAt ? new Date(endedAt).toISOString() : null,
          completed_at: completedAt ? new Date(completedAt).toISOString() : null,

        }),
      })
      setSuccess(true)
      setTimeout(() => router.push(`/surgery/small-surgeries/${id}`), 800)
    } catch (e: any) {
      setError(e?.message || "Erro ao guardar.")
    } finally {
      setSaving(false)
    }
  }, [id, patient, procedures, surgeon, specialty, operatingRoom, preDiag, posDiag, status, priority, classification, scheduledFor, startedAt, endedAt, completedAt, router])

  if (loading) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
        <div className="flex h-40 items-center justify-center text-sm text-[var(--gray-500)]">Carregando...</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
      <div className="mx-auto w-full max-w-5xl space-y-3 px-1">

        {/* header */}
        <section className={`relative overflow-hidden ${GLASS} h-[72px]`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex h-full items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href="/surgery/small-surgeries" className="hover:text-foreground">Pequenas cirurgias</Link>
                <span>/</span>
                <Link href={`/surgery/small-surgeries/${id}`} className="hover:text-foreground">{code}</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">Editar</span>
              </div>
              <h1 className="mt-0.5 font-display text-base font-semibold text-foreground">Editar cirurgia</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={save}
                disabled={saving || success}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                {saving ? "A guardar..." : success ? "Guardado!" : "Guardar"}
              </button>
              <Link
                href={`/surgery/small-surgeries/${id}`}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted"
              >
                <ArrowLeft size={11} />
                Cancelar
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-rose-300/50 bg-rose-50/60 px-4 py-3 text-sm text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        {/* masonry — 2 colunas independentes */}
        <div className="flex items-start gap-3">

          {/* col esquerda: 1, 3, 5, 7 */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">

            <SurfaceCard title="1 · Paciente" icon={<User size={13} />} accent="bg-sky-400">
              <SearchSelect
                label="Paciente *"
                placeholder="Pesquisar paciente..."
                endpoint="/clinical/patient/"
                labelField="name"
                value={patient}
                onChange={(v, lbl) => { setPatient(v); setPatientLabel(lbl) }}
              />
              {patientLabel && patient ? (
                <div className="text-[11px] text-[var(--gray-500)]">Seleccionado: <span className="font-medium text-foreground">{patientLabel}</span></div>
              ) : null}
            </SurfaceCard>

            <SurfaceCard title="3 · Cirurgião e especialidade" icon={<Stethoscope size={13} />} accent="bg-emerald-400">
              <SearchSelect
                label="Cirurgião (médico de RH)"
                placeholder="Pesquisar médico..."
                endpoint="/consultations/doctors/"
                labelField="name"
                value={surgeon}
                onChange={(v, lbl) => { setSurgeon(v); setSurgeonLabel(lbl) }}
              />
              <SearchSelect
                label="Especialidade (de RH)"
                placeholder="Pesquisar especialidade..."
                endpoint="/consultations/specialty/"
                labelField="name"
                value={specialty}
                onChange={(v, lbl) => { setSpecialty(v); setSpecialtyLabel(lbl) }}
              />
            </SurfaceCard>

            <SurfaceCard title="5 · Equipa cirúrgica" icon={<Users size={13} />} accent="bg-indigo-400">
              <div className="flex flex-col gap-2">
                {team.length === 0 && (
                  <p className="text-[11px] text-[var(--gray-400)]">Sem membros — clique em "+ Adicionar".</p>
                )}
                {team.map(m => (
                  <TeamMemberRow
                    key={m.tempId}
                    member={m}
                    onRemove={() => setTeam(prev => prev.filter(t => t.tempId !== m.tempId))}
                    onChangeRole={role => setTeam(prev => prev.map(t => t.tempId === m.tempId ? { ...t, role } : t))}
                  />
                ))}
                <div ref={teamRef} className="relative">
                  {!addingTeam ? (
                    <button
                      type="button"
                      onClick={() => { setAddingTeam(true); setTeamQuery("") }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-[var(--gray-300)] px-3 py-1.5 text-[11px] text-[var(--gray-500)] hover:border-[var(--primary-400)] hover:text-[var(--primary-600)]"
                    >
                      + Adicionar membro da equipa
                    </button>
                  ) : (
                    <div className="rounded-lg border border-white/30 bg-white/40 p-2 backdrop-blur-sm dark:bg-white/[0.06]">
                      <div className="mb-1.5 flex items-center gap-2">
                        <select
                          className="rounded border border-white/20 bg-transparent px-1.5 py-0.5 text-[11px] text-[var(--text)] focus:outline-none"
                          value={teamRole}
                          onChange={e => setTeamRole(e.target.value)}
                        >
                          {TEAM_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <button type="button" onClick={() => setAddingTeam(false)} className="ml-auto text-[var(--gray-400)] hover:text-rose-500">
                          <X size={12} />
                        </button>
                      </div>
                      <div ref={teamInputRef}>
                        <input
                          autoFocus
                          className={`${inputCls} mb-1`}
                          placeholder="Pesquisar profissional..."
                          value={teamQuery}
                          onChange={e => setTeamQuery(e.target.value)}
                        />
                      </div>
                      <DropdownPortal anchorRef={teamInputRef} portalRef={teamPortalRef} open={addingTeam && (teamResults.length > 0 || teamQuery.length > 0)}>
                        <div className="max-h-96 overflow-y-auto">
                          {teamResults.length === 0
                            ? <div className="px-3 py-2 text-[11px] text-[var(--gray-400)]">Sem resultados</div>
                            : teamResults.map(emp => (
                              <div
                                key={emp.id}
                                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[var(--primary-50)] dark:hover:bg-white/10"
                                onMouseDown={e => { e.preventDefault(); addTeamMember(emp) }}
                              >
                                <User size={11} className="text-[var(--gray-400)]" />
                                <span className="text-[var(--text)]">{emp.name}</span>
                                {emp.role_name ? <span className="ml-auto text-[10px] text-[var(--gray-400)]">{emp.role_name}</span> : null}
                              </div>
                            ))
                          }
                        </div>
                      </DropdownPortal>
                    </div>
                  )}
                </div>
              </div>
            </SurfaceCard>

          </div>

          {/* col direita: 2, 4, 6, 8 */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">

            <SurfaceCard title="2 · Procedimentos cirúrgicos" icon={<Scissors size={13} />} accent="bg-violet-400">
              <ProcedureMultiSelect selected={procedures} onChange={setProcedures} />
              {procedures.length === 0 && (
                <p className="text-[11px] text-[var(--gray-400)]">Pesquise e clique para adicionar procedimentos.</p>
              )}
            </SurfaceCard>

            <SurfaceCard title="4 · Bloco operatório (enfermaria)" icon={<Scissors size={13} />} accent="bg-cyan-400">
              <SearchSelect
                label="Bloco / Sala operatória"
                placeholder="Pesquisar sala na enfermaria..."
                endpoint="/nursing/ward/"
                labelField="name"
                value={operatingRoom}
                onChange={(v, lbl) => { setOperatingRoom(v); setOperatingRoomLabel(lbl) }}
              />
            </SurfaceCard>

            <SurfaceCard title="6 · Diagnósticos" icon={<Stethoscope size={13} />} accent="bg-amber-400">
              <FieldRow label="Diagnóstico pré-operatório">
                <textarea className={`${inputCls} resize-none`} rows={3} value={preDiag} onChange={e => setPreDiag(e.target.value)} placeholder="Diagnóstico antes da cirurgia" />
              </FieldRow>
              <FieldRow label="Diagnóstico pós-operatório">
                <textarea className={`${inputCls} resize-none`} rows={3} value={posDiag} onChange={e => setPosDiag(e.target.value)} placeholder="Diagnóstico após a cirurgia" />
              </FieldRow>
            </SurfaceCard>

          </div>
        </div>

        {/* ── 7+8 · full-width row no fundo ── */}
        <div className="flex items-start gap-3">

          {/* 7 · Estado e agendamento — ocupa o espaço disponível */}
          <SurfaceCard title="7 · Estado e agendamento" icon={<CalendarClock size={13} />} accent="bg-emerald-400">
            <div className="grid grid-cols-7 gap-3">
              <FieldRow label="Estado">
                <select className={selectCls} value={status} onChange={e => setStatus(e.target.value)}>
                  {STATUS_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Prioridade">
                <select className={selectCls} value={priority} onChange={e => setPriority(e.target.value)}>
                  {PRIORITY_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Classificação">
                <select className={selectCls} value={classification} onChange={e => setClassification(e.target.value)}>
                  <option value="">—</option>
                  {CLASSIFICATION_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Agendada para">
                <input type="datetime-local" className={inputCls} value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} />
              </FieldRow>
              <FieldRow label="Iniciada em">
                <input type="datetime-local" className={inputCls} value={startedAt} onChange={e => setStartedAt(e.target.value)} />
              </FieldRow>
              <FieldRow label="Terminada em">
                <input type="datetime-local" className={inputCls} value={endedAt} onChange={e => setEndedAt(e.target.value)} />
              </FieldRow>
              <FieldRow label="Concluída em">
                <input type="datetime-local" className={inputCls} value={completedAt} onChange={e => setCompletedAt(e.target.value)} />
              </FieldRow>
            </div>
          </SurfaceCard>

        </div>

      </div>
    </AppLayout>
  )
}
