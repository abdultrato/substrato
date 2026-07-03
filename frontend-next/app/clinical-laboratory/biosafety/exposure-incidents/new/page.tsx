"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Loader2,
  Save,
  Search,
  Shield,
  Stethoscope,
  User,
  X,
  Zap,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

const CREATE_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Choices ───────────────────────────────────────────────────────────────────

const EXPOSURE_TYPE_CHOICES = [
  { value: "PICADA",   label: "Picada de agulha" },
  { value: "MUCOSA",   label: "Contacto com mucosa" },
  { value: "PELE",     label: "Contacto com pele" },
  { value: "CORTE",    label: "Corte com material contaminado" },
  { value: "AEROSSOL", label: "Inalação de aerossol" },
  { value: "CULTURA",  label: "Contacto com cultura" },
  { value: "OUTRO",    label: "Outro" },
];

const EXPOSURE_TYPE_COLOR: Record<string, string> = {
  PICADA:   "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
  MUCOSA:   "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",
  PELE:     "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  CORTE:    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300",
  AEROSSOL: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",
  CULTURA:  "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300",
  OUTRO:    "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-300",
};

const STATUS_CHOICES = [
  { value: "REPORTADO",   label: "Reportado" },
  { value: "EM_ANALISE",  label: "Em análise" },
  { value: "SAUDE_OCUP",  label: "Encaminhado a saúde ocupacional" },
  { value: "SEGUIMENTO",  label: "Seguimento em curso" },
  { value: "FECHADO",     label: "Fechado" },
];

const STATUS_BAR: Record<string, string> = {
  REPORTADO:  "bg-red-500",
  EM_ANALISE: "bg-amber-400",
  SAUDE_OCUP: "bg-blue-500",
  SEGUIMENTO: "bg-violet-500",
  FECHADO:    "bg-slate-400",
};
const STATUS_COLOR: Record<string, string> = {
  REPORTADO:  "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
  EM_ANALISE: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  SAUDE_OCUP: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
  SEGUIMENTO: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",
  FECHADO:    "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-400",
};

// ── RelationTargets ───────────────────────────────────────────────────────────

const T_USER: RelationTarget = {
  endpoint: "/identity/user/",
  labelFields: ["username", "first_name", "last_name"],
};

// ── RelationSelect ────────────────────────────────────────────────────────────

function RelationSelect({
  value, onChange, target, placeholder, safeRefreshToken, accentClass = "border-red-500 ring-red-500/25",
}: {
  value: number | null;
  onChange: (v: number | null, label: string) => void;
  target: RelationTarget;
  placeholder?: string;
  safeRefreshToken?: number;
  accentClass?: string;
}) {
  const [query, setQuery]     = useState("");
  const [label, setLabel]     = useState("");
  const [open, setOpen]       = useState(false);
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const debRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lbId    = useId();

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

  const chipCls = "inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300";

  return (
    <div className="space-y-1.5">
      {value !== null && (
        <div className="flex flex-wrap gap-1">
          <span className={chipCls}>
            {label}
            <button type="button" onClick={clear} className="ml-0.5 text-red-400 hover:text-red-600 transition">
              <X size={9} />
            </button>
          </span>
        </div>
      )}
      {value === null && (
        <div className="relative z-[999]">
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => { setOpen(true); if (!query) search(""); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className={`w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:ring-2 focus:${accentClass}`}
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
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-muted">
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

// ── ChipSingleSelect ──────────────────────────────────────────────────────────

function ChipGrid({ value, onChange, options, colorMap }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  colorMap?: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(({ value: v, label }) => {
        const active = value === v;
        const clr = colorMap?.[v] ?? "border-border bg-background text-foreground";
        return (
          <button key={v} type="button" onClick={() => onChange(v)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition focus:outline-none focus:ring-2 focus:ring-red-500/20 ${active ? clr + " ring-1 ring-current/30 shadow-sm" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Design helpers ────────────────────────────────────────────────────────────

function Card({ icon: Icon, title, children, accent }: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: string;
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

const inputCls    = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-400/20";
const textareaCls = inputCls + " resize-none";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewExposureIncidentPage() {
  useAuthGuard();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();

  // core
  const [staff,          setStaff]          = useState<number | null>(null);
  const [staffLabel,     setStaffLabel]      = useState("");
  const [incidentAt,     setIncidentAt]      = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [exposureType,   setExposureType]    = useState("");
  const [status,         setStatus]          = useState("REPORTADO");

  // detail
  const [materialInvolved,  setMaterialInvolved]  = useState("");
  const [bodySite,          setBodySite]           = useState("");
  const [activity,          setActivity]           = useState("");
  const [immediateAction,   setImmediateAction]    = useState("");
  const [reportedTo,        setReportedTo]         = useState("");
  const [requiresFollowup,  setRequiresFollowup]   = useState(true);

  // investigation
  const [rootCause,          setRootCause]          = useState("");
  const [contributingFactors,setContributingFactors]= useState("");
  const [conclusion,         setConclusion]         = useState("");
  const [investigatedBy,     setInvestigatedBy]     = useState<number | null>(null);
  const [investigatedByLabel,setInvestigatedByLabel]= useState("");
  const [investigatedAt,     setInvestigatedAt]     = useState("");

  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentStatus   = STATUS_CHOICES.find((s) => s.value === status);
  const currentExpType  = EXPOSURE_TYPE_CHOICES.find((e) => e.value === exposureType);

  function validate() {
    const e: Record<string, string> = {};
    if (!staff)           e.staff = "Colaborador afectado obrigatório.";
    if (!incidentAt)      e.date  = "Data e hora do incidente obrigatórias.";
    if (!exposureType)    e.type  = "Tipo de exposição obrigatório.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const data = await apiFetch<{ id?: number }>("/clinical_laboratory/exposure_incident/", {
        method: "POST",
        body: JSON.stringify({
          staff,
          incident_at:           incidentAt,
          exposure_type:         exposureType,
          status,
          material_involved:     materialInvolved.trim(),
          body_site:             bodySite.trim(),
          activity:              activity.trim(),
          immediate_action:      immediateAction.trim(),
          reported_to:           reportedTo.trim(),
          requires_medical_followup: requiresFollowup,
          root_cause:            rootCause.trim(),
          contributing_factors:  contributingFactors.trim(),
          conclusion:            conclusion.trim(),
          investigated_by:       investigatedBy ?? null,
          investigated_at:       investigatedAt || null,
        }),
      });
      if (!data?.id) throw new Error("Resposta inesperada do servidor.");
      router.push(`/clinical-laboratory/biosafety/exposure-incidents/${data.id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao registar incidente.");
    } finally { setSaving(false); }
  }

  return (
    <AppLayout requiredGroups={CREATE_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-red-500/10 blur-2xl" />
            <div className="absolute -bottom-6 left-8 h-20 w-20 rounded-full bg-orange-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${STATUS_BAR[status] ?? "bg-red-500"}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-600 shadow-md shadow-red-500/30">
              <Zap size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Biossegurança</span><span>/</span>
                <span>Incidentes de exposição</span><span>/</span>
                <span className="font-medium text-foreground">Novo</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {currentExpType ? `Exposição — ${currentExpType.label}` : "Novo incidente de exposição"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {currentExpType && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${EXPOSURE_TYPE_COLOR[exposureType] ?? ""}`}>
                    {currentExpType.label}
                  </span>
                )}
                {currentStatus && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[status] ?? ""}`}>
                    {currentStatus.label}
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
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 px-4 text-xs font-semibold text-white shadow-md shadow-red-500/30 transition hover:from-red-700 hover:to-orange-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Registar incidente
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

          {/* Colaborador + Data */}
          <Card icon={User} title="Colaborador e data do incidente" accent="bg-red-500">
            <Field label="Colaborador afectado" required error={errors.staff}>
              <RelationSelect
                value={staff}
                onChange={(v, l) => { setStaff(v); setStaffLabel(l); if (v) setErrors((p) => ({ ...p, staff: "" })); }}
                target={T_USER}
                placeholder="Pesquisar colaborador…"
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
            <Field label="Data e hora do incidente" required error={errors.date}>
              <input type="datetime-local" value={incidentAt}
                onChange={(e) => { setIncidentAt(e.target.value); if (e.target.value) setErrors((p) => ({ ...p, date: "" })); }}
                className={`${inputCls} ${errors.date ? "border-red-300" : ""}`}
              />
            </Field>
            <Field label="Reportado a" hint="Nome do supervisor ou responsável notificado">
              <input type="text" value={reportedTo}
                onChange={(e) => setReportedTo(e.target.value)}
                placeholder="Ex.: Chefe de laboratório, Medicina do trabalho"
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Tipo de exposição + Estado */}
          <Card icon={AlertTriangle} title="Tipo de exposição e estado" accent="bg-orange-500">
            <Field label="Tipo de exposição" required error={errors.type}>
              <ChipGrid
                value={exposureType}
                onChange={(v) => { setExposureType(v); if (v) setErrors((p) => ({ ...p, type: "" })); }}
                options={EXPOSURE_TYPE_CHOICES}
                colorMap={EXPOSURE_TYPE_COLOR}
              />
              {errors.type && <p className="mt-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">{errors.type}</p>}
            </Field>
            <Field label="Estado">
              <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {STATUS_CHOICES.map(({ value, label }) => {
                  const isActive = status === value;
                  return (
                    <button key={value} type="button" onClick={() => setStatus(value)}
                      className={`relative overflow-hidden rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition focus:outline-none focus:ring-2 focus:ring-red-400/20 ${isActive ? STATUS_COLOR[value] + " ring-1 ring-current/30" : "border-border bg-background hover:bg-muted"}`}>
                      <span className={`absolute inset-y-0 left-0 w-0.5 ${STATUS_BAR[value]}`} />
                      <span className={`block pl-1.5 font-semibold ${isActive ? "" : "text-foreground"}`}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </Field>
          </Card>

          {/* Detalhes da exposição */}
          <Card icon={Activity} title="Detalhes da exposição" accent="bg-amber-400">
            <Field label="Material envolvido" hint="Ex.: Sangue, LCR, cultura de M. tuberculosis">
              <input type="text" value={materialInvolved}
                onChange={(e) => setMaterialInvolved(e.target.value)}
                placeholder="Material biológico ou agente envolvido"
                className={inputCls}
              />
            </Field>
            <Field label="Local corporal afectado" hint="Ex.: Dedo indicador direito, mucosa ocular esquerda">
              <input type="text" value={bodySite}
                onChange={(e) => setBodySite(e.target.value)}
                placeholder="Parte do corpo exposta"
                className={inputCls}
              />
            </Field>
            <Field label="Actividade em curso" hint="O que estava a ser feito quando ocorreu o incidente">
              <input type="text" value={activity}
                onChange={(e) => setActivity(e.target.value)}
                placeholder="Ex.: Colheita de sangue, manipulação de agulha, centrifugação"
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Acção imediata + acompanhamento */}
          <Card icon={Stethoscope} title="Acção imediata e acompanhamento" accent="bg-blue-500">
            <Field label="Acção imediata tomada">
              <textarea value={immediateAction}
                onChange={(e) => setImmediateAction(e.target.value)}
                placeholder="Ex.: Lavagem imediata com água e sabão, profilaxia iniciada…"
                rows={3} className={textareaCls}
              />
            </Field>
            <Field label="Requer acompanhamento médico">
              <div className="flex gap-2 pt-0.5">
                {[{ v: true, l: "Sim" }, { v: false, l: "Não" }].map(({ v, l }) => (
                  <button key={String(v)} type="button" onClick={() => setRequiresFollowup(v)}
                    className={`flex-1 rounded-lg border py-1.5 text-[11px] font-medium transition ${requiresFollowup === v ? (v ? "border-red-300 bg-red-50 text-red-700 ring-1 ring-red-300/40 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300" : "border-emerald-300 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300/40 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300") : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>
          </Card>

          {/* Investigação — full width */}
          <div className="lg:col-span-2">
            <Card icon={ClipboardList} title="Investigação do incidente" accent="bg-violet-500">
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Causa raiz">
                  <textarea value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    placeholder="Descreva a causa raiz identificada…"
                    rows={3} className={textareaCls}
                  />
                </Field>
                <Field label="Factores contribuintes">
                  <textarea value={contributingFactors}
                    onChange={(e) => setContributingFactors(e.target.value)}
                    placeholder="Factores que contribuíram para o incidente…"
                    rows={3} className={textareaCls}
                  />
                </Field>
                <Field label="Conclusão / medidas correctivas">
                  <textarea value={conclusion}
                    onChange={(e) => setConclusion(e.target.value)}
                    placeholder="Conclusões e acções correctivas implementadas…"
                    rows={3} className={textareaCls}
                  />
                </Field>
                <div className="space-y-2">
                  <Field label="Investigado por">
                    <RelationSelect
                      value={investigatedBy}
                      onChange={(v, l) => { setInvestigatedBy(v); setInvestigatedByLabel(l); }}
                      target={T_USER}
                      placeholder="Pesquisar utilizador…"
                      safeRefreshToken={safeRefreshToken}
                    />
                  </Field>
                  <Field label="Data da investigação">
                    <input type="datetime-local" value={investigatedAt}
                      onChange={(e) => setInvestigatedAt(e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
