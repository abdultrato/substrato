"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CalendarClock, Check, ChevronDown, Scissors, Search, Stethoscope, X } from "lucide-react"
import { createPortal } from "react-dom"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const INPUT = "w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
const LABEL = "block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)] mb-1"

interface DropdownOption { id: number; label: string; sub?: string }

function SearchSelect({
  placeholder, value, onChange, fetchFn, disabled,
}: {
  placeholder: string
  value: DropdownOption | null
  onChange: (v: DropdownOption | null) => void
  fetchFn: (q: string) => Promise<DropdownOption[]>
  disabled?: boolean
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<DropdownOption[]>([])
  const [loading, setLoading] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!open) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try { setOpts(await fetchFn(query)) } catch { setOpts([]) }
      finally { setLoading(false) }
    }, 280)
    return () => clearTimeout(timerRef.current)
  }, [query, open, fetchFn])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  const openDropdown = () => {
    if (disabled) return
    if (ref.current) setRect(ref.current.getBoundingClientRect())
    setOpen(true)
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 dark:border-emerald-700/30 dark:bg-emerald-900/10">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-foreground truncate">{value.label}</div>
          {value.sub && <div className="text-[10px] text-[var(--gray-400)] truncate">{value.sub}</div>}
        </div>
        <button type="button" onClick={() => onChange(null)} className="shrink-0 text-[var(--gray-400)] hover:text-rose-500">
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center gap-2 ${INPUT} cursor-text`} onClick={openDropdown}>
        <Search size={13} className="shrink-0 text-[var(--gray-400)]" />
        {open ? (
          <input autoFocus className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            placeholder={placeholder}
            value={query}
            onChange={e => setQuery(e.target.value)} />
        ) : (
          <span className="flex-1 text-[13px] text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown size={13} className="shrink-0 text-[var(--gray-400)]" />
      </div>

      {open && rect && createPortal(
        <div style={{ position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }}
          className="max-h-56 overflow-auto rounded-xl border border-white/30 bg-white/95 shadow-xl backdrop-blur-sm dark:bg-[#1a1a2e]/95">
          {loading ? (
            <div className="px-3 py-2 text-[11px] text-[var(--gray-400)]">A pesquisar...</div>
          ) : opts.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-[var(--gray-400)]">Sem resultados</div>
          ) : opts.map(o => (
            <div key={o.id}
              onMouseDown={e => { e.preventDefault(); onChange(o); setOpen(false); setQuery("") }}
              className="cursor-pointer px-3 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/20">
              <div className="text-[12px] font-medium text-foreground">{o.label}</div>
              {o.sub && <div className="text-[10px] text-[var(--gray-400)]">{o.sub}</div>}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

const PRIORITY_OPTIONS = [
  { value: "EMERGENCY", label: "Emergência" },
  { value: "URGENT", label: "Urgente" },
  { value: "ELECTIVE", label: "Eletiva" },
]

export default function NewSchedulePage() {
  const router = useRouter()

  const [surgery, setSurgery] = useState<DropdownOption | null>(null)
  const [surgeon, setSurgeon] = useState<DropdownOption | null>(null)
  const [anesthetist, setAnesthetist] = useState<DropdownOption | null>(null)
  const [scheduledStart, setScheduledStart] = useState("")
  const [scheduledEnd, setScheduledEnd] = useState("")
  const [priority, setPriority] = useState("ELECTIVE")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fetchSurgeries = useCallback(async (q: string) => {
    const res = await apiFetch<any>(`/surgery/surgery/?search=${encodeURIComponent(q)}&limit=20`)
    const rows = res.results ?? res ?? []
    return rows.map((r: any) => ({
      id: r.id,
      label: r.patient_name || `Cirurgia ${r.id}`,
      sub: `${r.custom_id} · ${(r.procedure_names || []).slice(0, 2).join(", ") || r.procedure || "—"}`,
    }))
  }, [])

  const fetchEmployees = useCallback(async (q: string) => {
    const res = await apiFetch<any>(`/consultations/doctors/?search=${encodeURIComponent(q)}&limit=20`)
    const rows = res.results ?? res ?? []
    return rows.map((r: any) => ({ id: r.id, label: r.name || r.full_name || `#${r.id}`, sub: r.specialty_name || r.role || "" }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!surgery) errs.surgery = "Seleccione uma cirurgia."
    if (!scheduledStart) errs.scheduledStart = "Informe a data/hora de início."
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true); setErrors({})
    try {
      await apiFetch("/surgery/agenda_cirurgica/", {
        method: "POST",
        body: JSON.stringify({
          surgery: surgery!.id,
          primary_surgeon: surgeon?.id ?? null,
          anesthetist: anesthetist?.id ?? null,
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd || null,
          priority,
          notes,
          status: "SCHEDULED",
        }),
      })
      router.push("/surgery/schedules")
    } catch (err: any) {
      const msg = err?.message || "Erro ao guardar."
      try {
        const detail = JSON.parse(msg)
        const mapped: Record<string, string> = {}
        for (const [k, v] of Object.entries(detail)) {
          mapped[k] = Array.isArray(v) ? (v as string[]).join(" ") : String(v)
        }
        setErrors(mapped)
      } catch { setErrors({ _: msg }) }
    } finally { setSaving(false) }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
      <div className="mx-auto w-full max-w-2xl space-y-3 px-1">

        {/* header */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-400" />
          <div className="flex items-center justify-between gap-3 px-4 py-3 pl-5">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href="/surgery/schedules" className="hover:text-foreground">Agenda cirúrgica</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">Nova marcação</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <CalendarClock size={14} className="text-violet-500" />
                <h1 className="font-display text-base font-semibold text-foreground">Agendar cirurgia</h1>
              </div>
            </div>
            <Link href="/surgery/schedules"
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:bg-muted">
              <ArrowLeft size={11} /> Cancelar
            </Link>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* cirurgia */}
          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 bg-violet-400" />
            <div className="px-4 py-3 pl-5">
              <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                <Scissors size={13} />
                <span>Cirurgia</span>
              </div>
              <label className={LABEL}>Seleccionar cirurgia *</label>
              <SearchSelect
                placeholder="Pesquisar por paciente ou código..."
                value={surgery}
                onChange={setSurgery}
                fetchFn={fetchSurgeries}
              />
              {errors.surgery && <p className="mt-1 text-[11px] text-rose-500">{errors.surgery}</p>}
            </div>
          </section>

          {/* equipa */}
          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 bg-emerald-400" />
            <div className="px-4 py-3 pl-5">
              <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                <Stethoscope size={13} />
                <span>Equipa</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Cirurgião principal</label>
                  <SearchSelect placeholder="Pesquisar cirurgião..." value={surgeon} onChange={setSurgeon} fetchFn={fetchEmployees} />
                </div>
                <div>
                  <label className={LABEL}>Anestesista</label>
                  <SearchSelect placeholder="Pesquisar anestesista..." value={anesthetist} onChange={setAnesthetist} fetchFn={fetchEmployees} />
                </div>
              </div>
            </div>
          </section>

          {/* horário */}
          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />
            <div className="px-4 py-3 pl-5">
              <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                <CalendarClock size={13} />
                <span>Horário</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Início *</label>
                  <input type="datetime-local" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} className={INPUT} />
                  {errors.scheduledStart && <p className="mt-1 text-[11px] text-rose-500">{errors.scheduledStart}</p>}
                </div>
                <div>
                  <label className={LABEL}>Fim previsto</label>
                  <input type="datetime-local" value={scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} className={INPUT} />
                </div>
              </div>

              <div className="mt-3">
                <label className={LABEL}>Prioridade</label>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map(p => (
                    <button key={p.value} type="button"
                      onClick={() => setPriority(p.value)}
                      className={`flex-1 rounded-lg border py-1.5 text-[11px] font-semibold transition ${
                        priority === p.value
                          ? p.value === "EMERGENCY" ? "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300"
                          : p.value === "URGENT" ? "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                          : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* notas */}
          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 bg-slate-400" />
            <div className="px-4 py-3 pl-5">
              <label className={LABEL}>Notas</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                className={`${INPUT} resize-none`}
                placeholder="Informações adicionais sobre a marcação..." />
            </div>
          </section>

          {errors._ && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{errors._}</div>
          )}

          <div className="flex justify-end gap-2 pb-4">
            <Link href="/surgery/schedules"
              className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-4 text-[12px] font-medium text-foreground hover:bg-muted">
              Cancelar
            </Link>
            <button type="submit" disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-violet-300 bg-violet-600 px-5 text-[12px] font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50">
              <Check size={14} />
              {saving ? "A guardar..." : "Confirmar marcação"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
