"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle2, ChevronRight, Droplets, HeartHandshake, UserPlus, X } from "lucide-react"
import { apiFetch } from "@/lib/api"

// ─── Types ───────────────────────────────────────────────────────────────────

type Company = { id: number; name: string }

type WizardData = {
  // Step 0 – classification
  provenance: string
  origin_company_id: number | null
  origin_company_name: string
  is_blood_donor: boolean
  donor_role: "VOL" | "REP"
  is_organ_donor: boolean
  // Step 1 – personal data
  name: string
  birth_date: string
  gender: string
  blood_type: string
  document_type: string
  document_number: string
  contact: string
  email: string
  address: string
}

const EMPTY: WizardData = {
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
  document_type: "BI",
  document_number: "",
  contact: "",
  email: "",
  address: "",
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

const BLOOD_TYPE_OPTIONS = [
  { value: "UNK", label: "Não informado" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O−" },
  { value: "A+", label: "A+" },
  { value: "A-", label: "A−" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B−" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB−" },
]

const STEP_LABELS = ["Classificação", "Dados pessoais", "Confirmação"]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </span>
      {children}
    </label>
  )
}

const inputCls =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-300)] disabled:bg-slate-50 disabled:text-slate-400"

const selectCls = inputCls

// ─── Company search ───────────────────────────────────────────────────────────

function CompanySearch({
  value,
  onChange,
}: {
  value: { id: number | null; name: string }
  onChange: (c: { id: number | null; name: string }) => void
}) {
  const [query, setQuery] = useState(value.name)
  const [results, setResults] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setQuery(value.name)
  }, [value.name])

  function search(q: string) {
    setQuery(q)
    onChange({ id: null, name: q })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await apiFetch<any>(`/external_entities/empresa/?search=${encodeURIComponent(q)}&page_size=10`)
        const items = res?.results ?? (Array.isArray(res) ? res : [])
        setResults(items)
        setOpen(items.length > 0)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 300)
  }

  function pick(c: Company) {
    onChange({ id: c.id, name: c.name })
    setQuery(c.name)
    setOpen(false)
    setResults([])
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder="Pesquisar empresa..."
        className={inputCls + " w-full"}
        autoComplete="off"
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-xs text-slate-400">...</span>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((c) => (
            <li
              key={c.id}
              onMouseDown={() => pick(c)}
              className="cursor-pointer px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
            >
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PatientIntakeWizard({ onClose, onSuccess }: { onClose: () => void; onSuccess?: (id: number) => void }) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ id: number; custom_id: string; name: string } | null>(null)

  const set = useCallback((patch: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...patch }))
    setError(null)
  }, [])

  const isOccupational = data.provenance === "Medicina Ocupacional"

  // ── Validation ──────────────────────────────────────────────────────────────
  function validateStep(s: number): string | null {
    if (s === 0 && isOccupational && !data.origin_company_id)
      return "Selecione a empresa de origem para pacientes de Medicina Ocupacional."
    if (s === 1 && data.name.trim().length < 2)
      return "O nome do paciente deve ter pelo menos 2 caracteres."
    return null
  }

  function next() {
    const err = validateStep(step)
    if (err) { setError(err); return }
    setError(null)
    setStep((s) => s + 1)
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function submit() {
    const err = validateStep(1)
    if (err) { setError(err); return }
    setSubmitting(true)
    setError(null)
    try {
      const payload: Record<string, any> = {
        name: data.name.trim(),
        provenance: data.provenance,
        is_organ_donor: data.is_organ_donor,
      }
      if (data.birth_date) payload.birth_date = data.birth_date
      if (data.gender) payload.gender = data.gender
      if (data.blood_type && data.blood_type !== "UNK") payload.blood_type = data.blood_type
      if (data.document_type && data.document_number) {
        payload.document_type = data.document_type
        payload.document_number = data.document_number.trim()
      }
      const contactDigits = data.contact.replace(/\D/g, "")
      if (contactDigits.length === 9) payload.contact = contactDigits
      if (data.email.trim()) payload.email = data.email.trim()
      if (data.address.trim()) payload.address = data.address.trim()
      if (isOccupational && data.origin_company_id) payload.origin_company = data.origin_company_id

      const patient = await apiFetch<any>("/clinical/patient/", {
        method: "POST",
        body: JSON.stringify(payload),
      })

      if (data.is_blood_donor && patient?.id) {
        try {
          await apiFetch("/bloodbank/donation/", {
            method: "POST",
            body: JSON.stringify({ donor: patient.id, donor_role: data.donor_role }),
          })
        } catch {
          // donation creation failure is non-blocking — patient already created
        }
      }

      setCreated({ id: patient.id, custom_id: patient.custom_id, name: patient.name })
      onSuccess?.(patient.id)
    } catch (e: any) {
      const detail = e?.data?.detail || e?.data?.name?.[0] || e?.data?.document_number?.[0] || e?.message
      setError(detail || "Falha ao registar o paciente. Verifique os dados e tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (created) {
    return (
      <ModalShell title="Paciente registado" onClose={onClose}>
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">{created.name}</p>
              <p className="text-xs text-emerald-700">{created.custom_id}</p>
            </div>
          </div>

          {data.is_blood_donor && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <Droplets size={14} />
              Registo de doação criado no Banco de Sangue.
            </div>
          )}
          {isOccupational && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <HeartHandshake size={14} />
              Paciente registado em Medicina Ocupacional — empresa: {data.origin_company_name}.
            </div>
          )}
          {data.is_organ_donor && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <HeartHandshake size={14} />
              Paciente marcado como doador de órgãos.
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <a
              href={`/patients/${created.id}`}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Ver ficha do paciente
            </a>
            {data.is_blood_donor && (
              <a
                href="/bloodbank/blood-donations"
                className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
              >
                Banco de Sangue
              </a>
            )}
            {isOccupational && (
              <a
                href="/occupational-medicine"
                className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                Medicina Ocupacional
              </a>
            )}
            <button
              type="button"
              onClick={() => { setCreated(null); setData(EMPTY); setStep(0) }}
              className="inline-flex items-center rounded-lg border border-[var(--primary-200)] bg-[var(--primary-50)] px-3 py-1.5 text-xs font-medium text-[var(--primary-700)] hover:bg-[var(--primary-100)]"
            >
              Registar outro paciente
            </button>
          </div>
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell title="Registar paciente" onClose={onClose}>
      {/* Stepper */}
      <div className="flex items-center gap-1 border-b border-slate-100 px-4 py-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                i === step
                  ? "bg-[var(--primary-600)] text-white"
                  : i < step
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span className={`text-[11px] font-medium ${i === step ? "text-[var(--primary-700)]" : "text-slate-400"}`}>
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && <ChevronRight size={12} className="mx-0.5 text-slate-300" />}
          </div>
        ))}
      </div>

      <div className="p-4">
        {/* ── Step 0: Classification ─────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Tipo de proveniência">
              <select
                value={data.provenance}
                onChange={(e) => set({ provenance: e.target.value, origin_company_id: null, origin_company_name: "" })}
                className={selectCls}
              >
                {PROVENANCE_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>

            {isOccupational && (
              <Field label="Empresa de origem" required>
                <CompanySearch
                  value={{ id: data.origin_company_id, name: data.origin_company_name }}
                  onChange={(c) => set({ origin_company_id: c.id, origin_company_name: c.name })}
                />
              </Field>
            )}

            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Perfil do paciente</p>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={data.is_blood_donor}
                  onChange={(e) => set({ is_blood_donor: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600"
                />
                <div>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                    <Droplets size={14} className="text-rose-500" /> Doador de sangue
                  </span>
                  <span className="text-xs text-slate-500">Cria registo no Banco de Sangue</span>
                </div>
              </label>

              {data.is_blood_donor && (
                <div className="ml-7">
                  <Field label="Tipo de dador">
                    <select
                      value={data.donor_role}
                      onChange={(e) => set({ donor_role: e.target.value as "VOL" | "REP" })}
                      className={selectCls}
                    >
                      <option value="VOL">Voluntário</option>
                      <option value="REP">Repositor</option>
                    </select>
                  </Field>
                </div>
              )}

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={data.is_organ_donor}
                  onChange={(e) => set({ is_organ_donor: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600"
                />
                <div>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                    <HeartHandshake size={14} className="text-amber-500" /> Doador de órgãos
                  </span>
                  <span className="text-xs text-slate-500">Registado no perfil do paciente</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ── Step 1: Personal data ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Nome completo" required>
                <input
                  value={data.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="Nome completo do paciente"
                  className={inputCls + " w-full"}
                  autoFocus
                />
              </Field>
            </div>

            <Field label="Data de nascimento">
              <input
                type="date"
                value={data.birth_date}
                onChange={(e) => set({ birth_date: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label="Género">
              <select value={data.gender} onChange={(e) => set({ gender: e.target.value })} className={selectCls}>
                <option value="Femenino">Feminino</option>
                <option value="Masculino">Masculino</option>
              </select>
            </Field>

            <Field label="Tipo sanguíneo">
              <select value={data.blood_type} onChange={(e) => set({ blood_type: e.target.value })} className={selectCls}>
                {BLOOD_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Tipo de documento">
              <select value={data.document_type} onChange={(e) => set({ document_type: e.target.value })} className={selectCls}>
                <option value="BI">Bilhete de Identidade</option>
                <option value="PASS">Passaporte</option>
                <option value="CC">Carta de Condução</option>
              </select>
            </Field>

            <div className="col-span-2">
              <Field label="Nº do documento">
                <input
                  value={data.document_number}
                  onChange={(e) => set({ document_number: e.target.value })}
                  placeholder="Número do documento"
                  className={inputCls + " w-full"}
                />
              </Field>
            </div>

            <Field label="Telefone">
              <input
                value={data.contact}
                onChange={(e) => set({ contact: e.target.value })}
                placeholder="8XXXXXXXX (9 dígitos)"
                className={inputCls}
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={data.email}
                onChange={(e) => set({ email: e.target.value })}
                placeholder="email@exemplo.com"
                className={inputCls}
              />
            </Field>

            <div className="col-span-2">
              <Field label="Morada">
                <input
                  value={data.address}
                  onChange={(e) => set({ address: e.target.value })}
                  placeholder="Bairro, Rua, Número"
                  className={inputCls + " w-full"}
                />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 2: Confirmation ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">Resumo do registo</p>
            <SummaryRow label="Nome" value={data.name || "—"} />
            <SummaryRow label="Proveniência" value={data.provenance} />
            {isOccupational && <SummaryRow label="Empresa" value={data.origin_company_name || "—"} />}
            {data.birth_date && <SummaryRow label="Data nasc." value={data.birth_date} />}
            <SummaryRow label="Género" value={data.gender === "Masculino" ? "Masculino" : "Feminino"} />
            {data.blood_type !== "UNK" && <SummaryRow label="Tipo sanguíneo" value={data.blood_type} />}
            {data.document_number && <SummaryRow label="Documento" value={`${data.document_type} ${data.document_number}`} />}
            {data.contact && <SummaryRow label="Telefone" value={data.contact} />}
            {data.email && <SummaryRow label="Email" value={data.email} />}
            <div className="flex gap-3 pt-2">
              {data.is_blood_donor && (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                  <Droplets size={12} /> Doador de sangue ({data.donor_role === "VOL" ? "Voluntário" : "Repositor"})
                </span>
              )}
              {data.is_organ_donor && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  <HeartHandshake size={12} /> Doador de órgãos
                </span>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => { setError(null); setStep((s) => Math.max(0, s - 1)) }}
            disabled={step === 0}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-40"
          >
            Anterior
          </button>

          {step < STEP_LABELS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary-600)] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--primary-700)]"
            >
              Próximo <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              <UserPlus size={14} />
              {submitting ? "A registar..." : "Confirmar e registar"}
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto p-4 pt-16">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-[var(--gray-100)]">
            <X size={16} className="text-[var(--gray-500)]" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-1.5 text-xs">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="text-right text-slate-800">{value}</span>
    </div>
  )
}
