"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
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
  { value: "REPORTED",            label: "Reportado",           emoji: "🔔", bar: "bg-amber-500",   chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",           grad: "from-amber-500 to-orange-600",   glow: "shadow-amber-500/30",   btn: "from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/30",     blob1: "bg-amber-500/10",   blob2: "bg-orange-500/10"   },
  { value: "UNDER_INVESTIGATION", label: "Em investigação",     emoji: "🔍", bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",                 grad: "from-blue-500 to-indigo-600",    glow: "shadow-blue-500/30",    btn: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30",         blob1: "bg-blue-500/10",    blob2: "bg-indigo-500/10"   },
  { value: "RESOLVED",            label: "Resolvido",           emoji: "✅", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300", grad: "from-emerald-500 to-teal-600",   glow: "shadow-emerald-500/30", btn: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30",   blob1: "bg-emerald-500/10", blob2: "bg-teal-500/10"     },
  { value: "DISCARDED",           label: "Descartado",          emoji: "✖️", bar: "bg-slate-400",   chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/40 dark:bg-slate-800/20 dark:text-slate-400",           grad: "from-slate-400 to-slate-500",   glow: "shadow-slate-400/30",   btn: "from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 shadow-slate-400/30",       blob1: "bg-slate-400/10",   blob2: "bg-slate-500/10"    },
  { value: "SENT_TO_AUTHORITY",   label: "Enviado à autoridade",emoji: "📤", bar: "bg-violet-500",  chip: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",     grad: "from-violet-500 to-purple-600", glow: "shadow-violet-500/30",  btn: "from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-violet-500/30",   blob1: "bg-violet-500/10",  blob2: "bg-purple-500/10"   },
];

const SEVERITIES = [
  { value: "MILD",     label: "Leve",     emoji: "🟢" },
  { value: "MODERATE", label: "Moderado", emoji: "🟡" },
  { value: "SEVERE",   label: "Grave",    emoji: "🟠" },
  { value: "CRITICAL", label: "Crítico",  emoji: "🔴" },
];

const OUTCOMES = [
  { value: "UNKNOWN",      label: "Desconhecido"   },
  { value: "RECOVERED",    label: "Recuperado"     },
  { value: "RECOVERING",   label: "Em recuperação" },
  { value: "HOSPITALIZED", label: "Hospitalizado"  },
  { value: "DEATH",        label: "Óbito"          },
];

const T_IMMUNIZATION: RelationTarget = { endpoint: "/public_health/immunization/", labelFields: ["custom_id", "patient_name", "vaccine_name"] };
const T_EMPLOYEE:     RelationTarget = { endpoint: "/human_resources/employee/",   labelFields: ["name", "employee_code"] };

function RelationSelect({ value, onChange, target, placeholder, zIndex = "z-[30]" }: {
  value: number | null; onChange: (v: number | null, label: string) => void;
  target: RelationTarget; placeholder?: string; zIndex?: string;
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
    onChange(Number(opt.value), opt.label); setLabel(opt.label); setQuery(""); setOpen(false);
  }
  function clear() { onChange(null, ""); setLabel(""); }

  return (
    <div className="space-y-1.5">
      {value !== null && (
        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300">
          {label}
          <button type="button" onClick={clear} className="ml-0.5 text-orange-400 transition hover:text-orange-600"><X size={9} /></button>
        </span>
      )}
      {value === null && (
        <div className={`relative ${zIndex}`}>
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => { setOpen(true); if (!query) search(""); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
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
                          className="flex w-full items-center px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-muted">{opt.label}</button>
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

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20";

export default function NewAEFIPage() {
  useAuthGuard();
  const router = useRouter();

  const now = new Date();
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().substring(0, 16);

  const [immunizationId, setImmunizationId] = useState<number | null>(null);
  const [reportedById, setReportedById]     = useState<number | null>(null);
  const [investigatedById, setInvestigatedById] = useState<number | null>(null);

  const [severity, setSeverity]                   = useState("MILD");
  const [status, setStatus]                       = useState("REPORTED");
  const [onsetAt, setOnsetAt]                     = useState(localIso);
  const [reportedAt, setReportedAt]               = useState(localIso);
  const [investigationDueAt, setInvestigationDueAt] = useState("");
  const [symptoms, setSymptoms]                   = useState("");
  const [serious, setSerious]                     = useState(false);
  const [outcome, setOutcome]                     = useState("UNKNOWN");
  const [causalityAssessment, setCausalityAssessment] = useState("");
  const [officialNotificationId, setOfficialNotificationId] = useState("");
  const [notes, setNotes]                         = useState("");

  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeStatus = STATUSES.find((s) => s.value === status) ?? STATUSES[0];

  function validate() {
    const e: Record<string, string> = {};
    if (!immunizationId) e.immunization = "Registo de imunização é obrigatório.";
    if (!onsetAt) e.onset_at = "Data de início dos sintomas é obrigatória.";
    if (!symptoms.trim()) e.symptoms = "Descrição dos sintomas é obrigatória.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const res = await apiFetch<{ id: number }>("/public_health/adverse_event/", {
        method: "POST",
        body: JSON.stringify({
          immunization_record: immunizationId,
          reported_by: reportedById,
          investigated_by: investigatedById,
          severity, status,
          onset_at: onsetAt,
          reported_at: reportedAt,
          investigation_due_at: investigationDueAt || null,
          symptoms: symptoms.trim(),
          serious,
          outcome,
          causality_assessment: causalityAssessment.trim(),
          official_notification_id: officialNotificationId.trim(),
          notes: notes.trim(),
        }),
      });
      router.push(`/public-health/adverse-events/${res.id}`);
    } catch (err: unknown) {
      setSaveError((err as { message?: string })?.message || "Erro ao criar evento adverso.");
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
              <AlertTriangle size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Saúde Pública / Eventos Adversos</div>
              <h1 className="text-base font-bold leading-tight text-foreground">Novo evento adverso (AEFI)</h1>
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
                Criar evento
              </button>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        )}

        {/* Estado e gravidade — full width */}
        <Card icon={ClipboardList} title="Estado e gravidade" accent={activeStatus.bar}>
          <div className="space-y-2">
            <Field label="Estado">
              <div className="grid grid-cols-3 gap-1 sm:grid-cols-5">
                {STATUSES.map((s) => (
                  <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                    className={`rounded-lg border py-2 text-center text-[10px] font-medium transition ${status === s.value ? `${s.chip} shadow-sm ring-1 ring-current/30` : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    <div className="text-base leading-none">{s.emoji}</div>
                    <div className="mt-0.5 leading-tight">{s.label}</div>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Gravidade">
              <div className="grid grid-cols-4 gap-1">
                {SEVERITIES.map((s) => (
                  <button key={s.value} type="button" onClick={() => setSeverity(s.value)}
                    className={`rounded-lg border py-1.5 text-center text-[10px] font-medium transition ${severity === s.value ? "border-orange-200 bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-300/30 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    <span className="mr-0.5">{s.emoji}</span>{s.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Card>

        <div className="grid gap-2 lg:grid-cols-2">

          {/* Registo e profissionais */}
          <Card icon={Syringe} title="Registo e profissionais" accent={activeStatus.bar}>
            <Field label="Registo de imunização" required error={errors.immunization}>
              <RelationSelect target={T_IMMUNIZATION} value={immunizationId} zIndex="z-[30]"
                onChange={(v) => { setImmunizationId(v); if (v) setErrors((p) => ({ ...p, immunization: "" })); }}
                placeholder="Pesquisar registo de imunização…" />
            </Field>
            <Field label="Reportado por">
              <RelationSelect target={T_EMPLOYEE} value={reportedById} zIndex="z-[20]"
                onChange={(v) => setReportedById(v)}
                placeholder="Pesquisar profissional…" />
            </Field>
            <Field label="Investigado por">
              <RelationSelect target={T_EMPLOYEE} value={investigatedById} zIndex="z-[10]"
                onChange={(v) => setInvestigatedById(v)}
                placeholder="Pesquisar profissional…" />
            </Field>
          </Card>

          {/* Dados clínicos */}
          <Card icon={AlertTriangle} title="Dados clínicos" accent="bg-orange-500">
            <Field label="Sintomas" required error={errors.symptoms}>
              <textarea value={symptoms} onChange={(e) => { setSymptoms(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, symptoms: "" })); }}
                rows={3} placeholder="Descreva os sintomas observados…" className={inputCls} />
            </Field>
            <Field label="Evento grave">
              <div className="flex gap-2">
                {[true, false].map((v) => (
                  <button key={String(v)} type="button" onClick={() => setSerious(v)}
                    className={`rounded-lg border px-3 py-1.5 text-[10px] font-medium transition ${serious === v ? (v ? "border-red-200 bg-red-50 text-red-700 shadow-sm dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300" : "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300") : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    {v ? "⚠ Sim, grave" : "Não grave"}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Desfecho">
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {OUTCOMES.map((o) => (
                  <button key={o.value} type="button" onClick={() => setOutcome(o.value)}
                    className={`rounded-lg border py-1.5 text-[10px] font-medium transition ${outcome === o.value ? "border-orange-200 bg-orange-50 text-orange-700 shadow-sm dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>
          </Card>

          {/* Datas */}
          <Card icon={CalendarDays} title="Datas" accent="bg-blue-500">
            <Field label="Início dos sintomas" required error={errors.onset_at}>
              <input type="datetime-local" value={onsetAt}
                onChange={(e) => { setOnsetAt(e.target.value); if (e.target.value) setErrors((p) => ({ ...p, onset_at: "" })); }}
                className={inputCls} />
            </Field>
            <Field label="Reportado em">
              <input type="datetime-local" value={reportedAt} onChange={(e) => setReportedAt(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Investigação até" hint="Prazo limite para investigação">
              <input type="datetime-local" value={investigationDueAt} onChange={(e) => setInvestigationDueAt(e.target.value)} className={inputCls} />
            </Field>
          </Card>

          {/* Causalidade */}
          <Card icon={Shield} title="Causalidade e notificação" accent="bg-violet-500">
            <Field label="Avaliação de causalidade">
              <textarea value={causalityAssessment} onChange={(e) => setCausalityAssessment(e.target.value)}
                rows={3} placeholder="Descrição da avaliação de causalidade…" className={inputCls} />
            </Field>
            <Field label="ID oficial AEFI">
              <input type="text" value={officialNotificationId} onChange={(e) => setOfficialNotificationId(e.target.value)}
                placeholder="Ex.: AEFI-2026-001234" className={inputCls} />
            </Field>
          </Card>

          {/* Observações — full width */}
          <div className="lg:col-span-2">
            <Card icon={User} title="Observações" accent="bg-slate-400">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                placeholder="Notas adicionais, contexto clínico, informações relevantes…" className={inputCls} />
            </Card>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
