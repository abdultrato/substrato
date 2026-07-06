"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  Loader2,
  Plus,
  Search,
  Shield,
  Syringe,
  User,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

const CREATE_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ENFERMAGEM,
  GROUPS.SAUDE_PUBLICA,
];

const STATUSES = [
  { value: "ADMINISTERED", label: "Aplicada",   emoji: "💉", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300", grad: "from-emerald-500 to-green-600",   glow: "shadow-emerald-500/30", btn: "from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-emerald-500/30",     blob1: "bg-emerald-500/10", blob2: "bg-green-500/10"   },
  { value: "REPORTED",     label: "Notificada", emoji: "📋", bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",             grad: "from-blue-500 to-indigo-600",    glow: "shadow-blue-500/30",    btn: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30",         blob1: "bg-blue-500/10",    blob2: "bg-indigo-500/10"  },
  { value: "SCHEDULED",    label: "Agendada",   emoji: "📅", bar: "bg-violet-500",  chip: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300", grad: "from-violet-500 to-fuchsia-600", glow: "shadow-violet-500/30",  btn: "from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-violet-500/30", blob1: "bg-violet-500/10",  blob2: "bg-fuchsia-500/10" },
  { value: "EXEMPT",       label: "Isenta",     emoji: "🛡️", bar: "bg-amber-500",   chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",       grad: "from-amber-500 to-orange-600",  glow: "shadow-amber-500/30",   btn: "from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/30",       blob1: "bg-amber-500/10",   blob2: "bg-orange-500/10"  },
  { value: "CANCELLED",    label: "Cancelada",  emoji: "✖️", bar: "bg-rose-500",    chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300",             grad: "from-rose-500 to-red-600",      glow: "shadow-rose-500/30",    btn: "from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-500/30",               blob1: "bg-rose-500/10",    blob2: "bg-red-500/10"     },
];

const SOURCES = [
  { value: "ROUTINE",         label: "Rotina",             emoji: "🩺" },
  { value: "CAMPAIGN",        label: "Campanha",           emoji: "📣" },
  { value: "CATCH_UP",        label: "Recuperação",        emoji: "🔁" },
  { value: "OFFICIAL_IMPORT", label: "Importação oficial", emoji: "📥" },
];

const ROUTES = [
  { value: "IM",    label: "Intramuscular" },
  { value: "SC",    label: "Subcutânea" },
  { value: "ID",    label: "Intradérmica" },
  { value: "ORAL",  label: "Oral" },
  { value: "IN",    label: "Intranasal" },
  { value: "OTHER", label: "Outra" },
];

const BODY_SITES = [
  "Deltoide esquerdo", "Deltoide direito",
  "Vasto lateral esquerdo", "Vasto lateral direito",
  "Glúteo", "Antebraço esquerdo", "Antebraço direito", "Outro",
];

const T_PATIENT:  RelationTarget = { endpoint: "/clinical/patient/",         labelFields: ["name", "custom_id"] };
const T_VACCINE:  RelationTarget = { endpoint: "/public_health/vaccine/",    labelFields: ["name", "code", "disease"] };
const T_LOT:      RelationTarget = { endpoint: "/public_health/lot/",        labelFields: ["lot_number", "vaccine_name"] };
const T_CAMPAIGN: RelationTarget = { endpoint: "/public_health/campaign/",   labelFields: ["name", "custom_id"] };
const T_EMPLOYEE: RelationTarget = { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code"] };

// ── RelationSelect ────────────────────────────────────────────────────────────
function RelationSelect({ value, onChange, target, placeholder }: {
  value: number | null; onChange: (v: number | null, label: string) => void;
  target: RelationTarget; placeholder?: string;
}) {
  const [query, setQuery]     = useState("");
  const [label, setLabel]     = useState("");
  const [open, setOpen]       = useState(false);
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [busy, setBusy]       = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lbId = useId();

  function search(q: string) {
    setQuery(q); setOpen(true);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      setBusy(true);
      try {
        const { items } = await apiFetchList<Record<string, unknown>>(target.endpoint, {
          page: 1, pageSize: 20,
          query: { ...(target.staticFilters ?? {}), ...(q.trim() ? { search: q.trim() } : {}) },
        });
        setResults(relationOptionsFromRows(items, target));
      } catch { setResults([]); }
      finally { setBusy(false); }
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
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {label}
          <button type="button" onClick={clear} className="ml-0.5 text-emerald-400 transition hover:text-emerald-600"><X size={9} /></button>
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
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
          />
          {busy && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {open && (
            <div id={lbId} role="listbox" className="absolute left-0 right-0 z-[999] mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {results.length === 0
                ? <p className="px-3 py-2 text-[11px] text-muted-foreground">{busy ? "A pesquisar…" : "Nenhum resultado."}</p>
                : <ul className="max-h-48 divide-y divide-border/40 overflow-y-auto">
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

// ── SuggestInput ──────────────────────────────────────────────────────────────
function SuggestInput({ value, onChange, suggestions, placeholder }: {
  value: string; onChange: (v: string) => void; suggestions: string[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const filtered = suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value);
  return (
    <div className="relative">
      <input type="text" value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={inputCls}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-[997] mt-0.5 max-h-44 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
          {filtered.map((s) => (
            <li key={s} onMouseDown={() => { onChange(s); setOpen(false); }}
              className="cursor-pointer px-2.5 py-1.5 text-xs text-foreground hover:bg-muted">{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Card / Field helpers ──────────────────────────────────────────────────────
function Card({ icon: Icon, title, accent, children }: {
  icon: React.ElementType; title: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <section className="relative z-0 overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm focus-within:z-50 dark:border-white/10 dark:bg-white/5">
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
      {hint && !error && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20";

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NewImmunizationPage() {
  useAuthGuard();
  const router = useRouter();

  const now = new Date();
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().substring(0, 16);

  const [patientId, setPatientId]         = useState<number | null>(null);
  const [vaccineId, setVaccineId]         = useState<number | null>(null);
  const [lotId, setLotId]                 = useState<number | null>(null);
  const [campaignId, setCampaignId]       = useState<number | null>(null);
  const [employeeId, setEmployeeId]       = useState<number | null>(null);

  const [status, setStatus]           = useState("ADMINISTERED");
  const [source, setSource]           = useState("ROUTINE");
  const [doseNumber, setDoseNumber]   = useState("1");
  const [administeredAt, setAdministeredAt] = useState(localIso);
  const [nextDueDate, setNextDueDate] = useState("");
  const [route, setRoute]             = useState("IM");
  const [bodySite, setBodySite]       = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(true);
  const [contraindicationReason, setContraindicationReason] = useState("");
  const [officialNotificationId, setOfficialNotificationId] = useState("");
  const [notes, setNotes]             = useState("");

  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeStatus = STATUSES.find((s) => s.value === status) ?? STATUSES[0];

  function validate() {
    const e: Record<string, string> = {};
    if (!patientId) e.patient = "Paciente é obrigatório.";
    if (!vaccineId) e.vaccine = "Vacina é obrigatória.";
    if (!administeredAt) e.administered_at = "Data de administração é obrigatória.";
    if (status === "EXEMPT" && !contraindicationReason.trim()) {
      e.contraindication_reason = "Isenção exige motivo de contraindicação.";
    }
    if ((status === "ADMINISTERED" || status === "REPORTED") && !lotId) {
      e.lot = "Registos aplicados exigem lote para rastreabilidade.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const res = await apiFetch<{ id: number }>("/public_health/immunization/", {
        method: "POST",
        body: JSON.stringify({
          patient: patientId,
          vaccine: vaccineId,
          lot: lotId,
          campaign: campaignId,
          administered_by: employeeId,
          status,
          source,
          dose_number: Number(doseNumber),
          administered_at: administeredAt,
          next_due_date: nextDueDate || null,
          route,
          body_site: bodySite.trim(),
          consent_confirmed: consentConfirmed,
          contraindication_reason: contraindicationReason.trim(),
          official_notification_id: officialNotificationId.trim(),
          notes: notes.trim(),
        }),
      });
      router.push(`/public-health/immunizations/${res.id}`);
    } catch (err: unknown) {
      setSaveError((err as { message?: string })?.message || "Erro ao criar registo.");
    } finally { setSaving(false); }
  }

  return (
    <AppLayout requiredGroups={CREATE_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl ${activeStatus.blob1}`} />
            <div className={`absolute -bottom-8 left-6 h-24 w-24 rounded-full blur-2xl ${activeStatus.blob2}`} />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${activeStatus.bar}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${activeStatus.grad} shadow-md ${activeStatus.glow}`}>
              <Syringe size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Saúde Pública / Imunizações</div>
              <h1 className="text-base font-bold leading-tight text-foreground">Novo registo de imunização</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${activeStatus.chip}`}>
                  {activeStatus.emoji} {activeStatus.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Cancelar
              </button>
              <button type="submit" disabled={saving}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r px-4 text-xs font-semibold text-white shadow-md transition disabled:opacity-50 ${activeStatus.btn}`}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Criar registo
              </button>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        )}

        {/* ── Estado — full width ────────────────────────────────── */}
        <Card icon={ClipboardCheck} title="Estado do registo" accent={activeStatus.bar}>
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-5">
            {STATUSES.map((s) => (
              <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                className={`rounded-lg border py-2 text-center text-[10px] font-medium transition ${status === s.value ? `${s.chip} shadow-sm ring-1 ring-current/30` : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                <div className="text-base leading-none">{s.emoji}</div>
                <div className="mt-0.5 leading-tight">{s.label}</div>
              </button>
            ))}
          </div>
        </Card>

        <div className="grid gap-2 lg:grid-cols-2">

          {/* Paciente e profissional */}
          <Card icon={User} title="Paciente e profissional" accent={activeStatus.bar}>
            <Field label="Paciente" required error={errors.patient}>
              <RelationSelect target={T_PATIENT} value={patientId}
                onChange={(v, lbl) => { setPatientId(v); if (v) setErrors((p) => ({ ...p, patient: "" })); }}
                placeholder="Pesquisar paciente…" />
            </Field>
            <Field label="Aplicada por">
              <RelationSelect target={T_EMPLOYEE} value={employeeId}
                onChange={(v) => setEmployeeId(v)}
                placeholder="Pesquisar profissional…" />
            </Field>
            <Field label="Origem">
              <div className="grid grid-cols-2 gap-1">
                {SOURCES.map((s) => (
                  <button key={s.value} type="button" onClick={() => setSource(s.value)}
                    className={`rounded-lg border py-1.5 text-[10px] font-medium transition ${source === s.value ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-300/30 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    <span className="mr-0.5">{s.emoji}</span>{s.label}
                  </button>
                ))}
              </div>
            </Field>
          </Card>

          {/* Vacina e lote */}
          <Card icon={Syringe} title="Vacina e lote" accent="bg-teal-500">
            <Field label="Vacina" required error={errors.vaccine}>
              <RelationSelect target={T_VACCINE} value={vaccineId}
                onChange={(v) => { setVaccineId(v); setLotId(null); if (v) setErrors((p) => ({ ...p, vaccine: "" })); }}
                placeholder="Pesquisar vacina…" />
            </Field>
            <Field label="Lote" required={status === "ADMINISTERED" || status === "REPORTED"}
              error={errors.lot} hint="Obrigatório para registos aplicados">
              <RelationSelect target={T_LOT} value={lotId}
                onChange={(v) => { setLotId(v); if (v) setErrors((p) => ({ ...p, lot: "" })); }}
                placeholder="Pesquisar lote…" />
            </Field>
            <Field label="Número de dose">
              <input type="number" min={1} max={20} value={doseNumber}
                onChange={(e) => setDoseNumber(e.target.value)}
                className={inputCls} />
            </Field>
          </Card>

          {/* Datas e via */}
          <Card icon={CalendarDays} title="Datas e via" accent="bg-blue-500">
            <Field label="Data / hora de administração" required error={errors.administered_at}>
              <input type="datetime-local" value={administeredAt}
                onChange={(e) => { setAdministeredAt(e.target.value); if (e.target.value) setErrors((p) => ({ ...p, administered_at: "" })); }}
                className={inputCls} />
            </Field>
            <Field label="Próxima dose / reforço" hint="Deixe vazio se não aplicável">
              <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Via de administração">
              <div className="grid grid-cols-3 gap-1">
                {ROUTES.map((r) => (
                  <button key={r.value} type="button" onClick={() => setRoute(r.value)}
                    className={`rounded-lg border py-1.5 text-[10px] font-medium transition ${route === r.value ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Local anatómico">
              <SuggestInput value={bodySite} onChange={setBodySite}
                suggestions={BODY_SITES} placeholder="Ex.: Deltoide esquerdo…" />
            </Field>
          </Card>

          {/* Campanha (opcional) */}
          <Card icon={ClipboardCheck} title="Campanha (opcional)" accent="bg-indigo-500">
            <Field label="Campanha">
              <RelationSelect target={T_CAMPAIGN} value={campaignId}
                onChange={(v) => setCampaignId(v)}
                placeholder="Pesquisar campanha…" />
            </Field>
          </Card>

          {/* Consentimento e isenção */}
          <Card icon={Shield} title="Consentimento e isenção" accent="bg-amber-500">
            <Field label="Consentimento confirmado">
              <div className="flex items-center gap-3">
                {[true, false].map((v) => (
                  <button key={String(v)} type="button" onClick={() => setConsentConfirmed(v)}
                    className={`rounded-lg border px-3 py-1.5 text-[10px] font-medium transition ${consentConfirmed === v ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    {v ? "✓ Confirmado" : "✗ Não confirmado"}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Motivo de contraindicação / isenção" required={status === "EXEMPT"}
              error={errors.contraindication_reason} hint="Obrigatório para estado Isenta">
              <textarea value={contraindicationReason} onChange={(e) => { setContraindicationReason(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, contraindication_reason: "" })); }}
                rows={2} placeholder="Ex.: Alergia conhecida ao componente…" className={inputCls} />
            </Field>
            <Field label="ID oficial de notificação">
              <input type="text" value={officialNotificationId} onChange={(e) => setOfficialNotificationId(e.target.value)}
                placeholder="Ex.: NOT-2026-001234" className={inputCls} />
            </Field>
          </Card>

          {/* Observações — full width */}
          <div className="lg:col-span-2">
            <Card icon={CalendarDays} title="Observações" accent="bg-slate-400">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                placeholder="Notas clínicas, reacções locais, outras informações relevantes…"
                className={inputCls} />
            </Card>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
