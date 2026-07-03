"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Hash,
  Loader2,
  Save,
  Search,
  Shield,
  Syringe,
  User,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

const EDIT_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Choices ───────────────────────────────────────────────────────────────────

const STATUS_CHOICES = [
  { value: "EM_DIA",   label: "Em dia",   color: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300", bar: "bg-emerald-500" },
  { value: "A_VENCER", label: "A vencer", color: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",           bar: "bg-amber-400" },
  { value: "VENCIDA",  label: "Vencida",  color: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",                         bar: "bg-red-500" },
];

const STATUS_BAR: Record<string, string> = {
  EM_DIA: "bg-emerald-500", A_VENCER: "bg-amber-400", VENCIDA: "bg-red-500",
};

const VACCINE_SUGGESTIONS = [
  "Hepatite B", "Hepatite A", "Tétano (Td)", "Tétano/Difteria/Pertussis (Tdap)",
  "Influenza (Gripe sazonal)", "BCG (Tuberculose)", "MMR (Sarampo/Parotidite/Rubéola)",
  "Varicela", "Febre Tifóide", "Febre Amarela", "Meningite Meningocócica",
  "COVID-19", "HPV", "Pneumocócica", "Raiva (pré-exposição)",
];

const T_USER: RelationTarget = {
  endpoint: "/identity/user/",
  labelFields: ["username", "first_name", "last_name"],
};

// ── RelationSelect ────────────────────────────────────────────────────────────

function RelationSelect({
  value, onChange, target, placeholder, initialLabel, safeRefreshToken,
}: {
  value: number | null;
  onChange: (v: number | null, label: string) => void;
  target: RelationTarget;
  placeholder?: string;
  initialLabel?: string;
  safeRefreshToken?: number;
}) {
  const [query,     setQuery]     = useState("");
  const [label,     setLabel]     = useState(initialLabel ?? "");
  const [open,      setOpen]      = useState(false);
  const [results,   setResults]   = useState<{ value: string; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lbId   = useId();

  useEffect(() => { if (initialLabel) setLabel(initialLabel); }, [initialLabel]);

  function search(q: string) {
    setQuery(q); setOpen(true);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { items } = await apiFetchList<Record<string, any>>(target.endpoint, {
          page: 1, pageSize: 20,
          query: { ...(target.staticFilters ?? {}), ...(q.trim() ? { search: q.trim() } : {}) },
        });
        setResults(relationOptionsFromRows(items, target));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 250);
  }

  function select(opt: { value: string; label: string }) {
    onChange(Number(opt.value), opt.label);
    setLabel(opt.label); setQuery(""); setOpen(false);
  }
  function clear() { onChange(null, ""); setLabel(""); }

  return (
    <div className="space-y-1.5">
      {value !== null && (
        <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300">
          {label}
          <button type="button" onClick={clear} className="ml-0.5 text-teal-400 hover:text-teal-600 transition">
            <X size={9} />
          </button>
        </span>
      )}
      {value === null && (
        <div className="relative z-[999]">
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => { setOpen(true); if (!query) search(""); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
          />
          {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {open && (
            <div id={lbId} role="listbox"
              className="absolute left-0 right-0 z-[999] mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {results.length === 0
                ? <p className="px-3 py-2 text-[11px] text-muted-foreground">{searching ? "A pesquisar…" : "Nenhum resultado."}</p>
                : <ul className="max-h-48 overflow-y-auto divide-y divide-border/40">
                    {results.map((opt) => (
                      <li key={opt.value}>
                        <button type="button" onMouseDown={() => select(opt)}
                          className="flex w-full items-center px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-muted">
                          {opt.label}
                        </button>
                      </li>
                    ))}
                  </ul>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── VaccineInput ──────────────────────────────────────────────────────────────

function VaccineInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const filtered = VACCINE_SUGGESTIONS.filter((v) =>
    !value.trim() || v.toLowerCase().includes(value.toLowerCase())
  );
  return (
    <div className="relative z-[998]">
      <Syringe size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input type="text" value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Nome da vacina…"
        className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 z-[998] mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <ul className="max-h-44 overflow-y-auto divide-y divide-border/40">
            {filtered.slice(0, 10).map((v) => (
              <li key={v}>
                <button type="button" onMouseDown={() => { onChange(v); setOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-muted">
                  <Syringe size={9} className="shrink-0 text-muted-foreground" /> {v}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Design helpers ────────────────────────────────────────────────────────────

function Card({ icon: Icon, title, accent, children }: {
  icon: React.ElementType; title: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <section className="relative z-0 overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm focus-within:z-50 dark:bg-white/5 dark:border-white/10">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-1.5 pl-4">
        <Icon size={11} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-2 p-2.5 pl-3">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-[11px] font-semibold text-foreground">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint  && !error && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditVaccinationRecordPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [loadingData, setLoadingData] = useState(true);
  const [customId,    setCustomId]    = useState("");

  const [staff,           setStaff]           = useState<number | null>(null);
  const [staffLabel,      setStaffLabel]       = useState("");
  const [vaccine,         setVaccine]          = useState("");
  const [doseNumber,      setDoseNumber]       = useState<string>("1");
  const [vaccinationDate, setVaccinationDate]  = useState("");
  const [nextDoseDue,     setNextDoseDue]      = useState("");
  const [document,        setDocument]         = useState("");
  const [status,          setStatus]           = useState("EM_DIA");

  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<Record<string, any>>(`/clinical_laboratory/vaccination/${id}/`)
      .then((d) => {
        setCustomId(d.custom_id ?? "");
        setStaff(d.staff ?? null);
        setStaffLabel(d.staff_detail?.name ?? "");
        setVaccine(d.vaccine ?? "");
        setDoseNumber(String(d.dose_number ?? 1));
        setVaccinationDate(d.vaccination_date ?? "");
        setNextDoseDue(d.next_dose_due ?? "");
        setDocument(d.document ?? "");
        setStatus(d.status ?? "EM_DIA");
      })
      .catch(() => setSaveError("Erro ao carregar registo."))
      .finally(() => setLoadingData(false));
  }, [id]);

  const currentStatus = STATUS_CHOICES.find((s) => s.value === status);

  function validate() {
    const e: Record<string, string> = {};
    if (!staff)                                e.staff   = "Colaborador obrigatório.";
    if (!vaccine.trim())                       e.vaccine = "Nome da vacina obrigatório.";
    if (!vaccinationDate)                      e.date    = "Data de vacinação obrigatória.";
    if (!doseNumber || Number(doseNumber) < 1) e.dose    = "Número de dose inválido.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      await apiFetch(`/clinical_laboratory/vaccination/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          staff,
          vaccine:          vaccine.trim(),
          dose_number:      Number(doseNumber),
          vaccination_date: vaccinationDate,
          next_dose_due:    nextDoseDue || null,
          document:         document.trim(),
          status,
        }),
      });
      router.push(`/clinical-laboratory/biosafety/vaccination/${id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao guardar alterações.");
    } finally { setSaving(false); }
  }

  if (loadingData) return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${STATUS_BAR[status] ?? "bg-teal-500"}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-md shadow-teal-500/30`}>
              <Syringe size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Biossegurança</span><span>/</span>
                <span>Vacinação</span><span>/</span>
                <span className="font-mono">{customId}</span><span>/</span>
                <span className="font-medium text-foreground">Editar</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {vaccine.trim() ? `Editar — ${vaccine}` : "Editar registo de vacinação"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {currentStatus && (
                  <span className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${currentStatus.color}`}>
                    <Shield size={8} />{currentStatus.label}
                  </span>
                )}
                {doseNumber && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300">
                    <Hash size={8} />Dose {doseNumber}
                  </span>
                )}
                {staffLabel && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <User size={9} /> {staffLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 px-4 text-xs font-semibold text-white shadow-md shadow-teal-500/30 transition hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Guardar alterações
              </button>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        )}

        <div className="grid gap-2 lg:grid-cols-2">

          {/* Colaborador */}
          <Card icon={User} title="Colaborador" accent="bg-teal-500">
            <Field label="Colaborador vacinado" required error={errors.staff}>
              <RelationSelect
                value={staff}
                onChange={(v, l) => { setStaff(v); setStaffLabel(l); if (v) setErrors((p) => ({ ...p, staff: "" })); }}
                target={T_USER}
                placeholder="Pesquisar colaborador…"
                initialLabel={staffLabel}
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
          </Card>

          {/* Estado */}
          <Card icon={Shield} title="Estado da vacinação" accent="bg-emerald-500">
            <Field label="Estado">
              <div className="flex gap-1.5">
                {STATUS_CHOICES.map(({ value, label, color, bar }) => {
                  const active = status === value;
                  return (
                    <button key={value} type="button" onClick={() => setStatus(value)}
                      className={`relative flex-1 overflow-hidden rounded-lg border py-2 text-[11px] font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-400/20 ${active ? color + " ring-1 ring-current/30" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                      <span className={`absolute inset-y-0 left-0 w-0.5 ${bar}`} />
                      <span className="block pl-1.5">{label}</span>
                    </button>
                  );
                })}
              </div>
            </Field>
          </Card>

          {/* Vacina + Dose */}
          <Card icon={Syringe} title="Vacina e dose" accent="bg-cyan-500">
            <Field label="Vacina" required error={errors.vaccine}>
              <VaccineInput value={vaccine}
                onChange={(v) => { setVaccine(v); if (v.trim()) setErrors((p) => ({ ...p, vaccine: "" })); }}
              />
            </Field>
            <Field label="Número da dose" required error={errors.dose}
              hint="1 = dose inicial, 2 = reforço, etc.">
              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={() => setDoseNumber(String(Math.max(1, Number(doseNumber) - 1)))}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-sm font-bold text-foreground transition hover:bg-muted">
                  −
                </button>
                <input type="number" min={1} max={20} value={doseNumber}
                  onChange={(e) => { setDoseNumber(e.target.value); if (Number(e.target.value) >= 1) setErrors((p) => ({ ...p, dose: "" })); }}
                  className={`${inputCls} text-center`}
                />
                <button type="button"
                  onClick={() => setDoseNumber(String(Number(doseNumber) + 1))}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-sm font-bold text-foreground transition hover:bg-muted">
                  +
                </button>
              </div>
            </Field>
          </Card>

          {/* Datas + Documento */}
          <Card icon={CalendarDays} title="Datas e comprovativo" accent="bg-sky-500">
            <Field label="Data de vacinação" required error={errors.date}>
              <input type="date" value={vaccinationDate}
                onChange={(e) => { setVaccinationDate(e.target.value); if (e.target.value) setErrors((p) => ({ ...p, date: "" })); }}
                className={inputCls}
              />
            </Field>
            <Field label="Próxima dose prevista" hint="Deixar em branco se não aplicável">
              <input type="date" value={nextDoseDue}
                onChange={(e) => setNextDoseDue(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Comprovativo / Número de lote">
              <div className="relative">
                <FileText size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder="Ex.: Cert-2024-001, Lote XYZ123"
                  className={`${inputCls} pl-7`}
                />
              </div>
            </Field>
          </Card>

        </div>
      </form>
    </AppLayout>
  );
}
