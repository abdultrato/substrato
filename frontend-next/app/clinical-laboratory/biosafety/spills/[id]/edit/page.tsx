"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Droplets,
  FlaskConical,
  Loader2,
  MapPin,
  Save,
  Search,
  Shield,
  X,
  Zap,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

const EDIT_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

const SPILL_TYPES = [
  { value: "BIOLOGICO", label: "Biológico", icon: FlaskConical, bar: "bg-violet-500", chip: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300", grad: "from-violet-500 to-purple-600", glow: "shadow-violet-500/30", btn: "from-violet-600 to-purple-600 shadow-violet-500/30 hover:from-violet-700 hover:to-purple-700", blob1: "bg-violet-500/10", blob2: "bg-purple-500/10" },
  { value: "QUIMICO",   label: "Químico",   icon: Zap,          bar: "bg-amber-500",  chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",    grad: "from-amber-500 to-orange-600",   glow: "shadow-amber-500/30",  btn: "from-amber-600 to-orange-600 shadow-amber-500/30 hover:from-amber-700 hover:to-orange-700",  blob1: "bg-amber-500/10",  blob2: "bg-orange-500/10" },
] as const;

const LOCATIONS = [
  "Laboratório Clínico","Banco de Sangue","Sala de Colheitas","Microbiologia",
  "Imunologia","Bioquímica","Hematologia","Bloco Operatório","Urgência","UCI",
  "Corredor","Armazém","Estufa / Câmara fria","Sala de descontaminação","Farmácia",
  "Zona de processamento de amostras","Sala de PCR","Maternidade",
];

const MATERIALS = [
  "Sangue total","Soro","Urina","Fezes","LCR","Líquido pleural","Líquido amniótico",
  "Cultura microbiológica","Ácido sulfúrico","Formol","Hipoclorito",
  "Reagente de PCR","Xilol","Álcool etílico","Solução de fixação","Reagente Giemsa",
];

const DISINFECTION_METHODS = [
  "Hipoclorito de sódio 1%","Hipoclorito de sódio 10%","Hipoclorito de sódio 5% (diluído 1:10)",
  "Álcool 70%","Glutaraldeído 2%","Fenol 5%","Autoclavagem do material absorvente",
  "Aspiração + desinfecção","Kit de derrame químico padrão","Neutralização ácido-base + absorção",
];

const T_INCIDENT: RelationTarget = {
  endpoint: "/clinical_laboratory/exposure_incident/",
  labelFields: ["custom_id"],
};

// ── Inline RelationSelect ─────────────────────────────────────────────────────

function RelationSelect({ value, onChange, target, placeholder, initialLabel }: {
  value: number | null;
  onChange: (v: number | null, label: string) => void;
  target: RelationTarget;
  placeholder?: string;
  initialLabel?: string;
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
        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-medium text-cyan-700 dark:border-cyan-700/40 dark:bg-cyan-900/20 dark:text-cyan-300">
          {label}
          <button type="button" onClick={clear} className="ml-0.5 text-cyan-400 hover:text-cyan-600 transition"><X size={9} /></button>
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
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
          />
          {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {open && (
            <div id={lbId} role="listbox" className="absolute left-0 right-0 z-[999] mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
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

// ── Design helpers ────────────────────────────────────────────────────────────

function SuggestInput({ value, onChange, suggestions, placeholder, zIndex = "z-[997]" }: {
  value: string; onChange: (v: string) => void;
  suggestions: string[]; placeholder?: string; zIndex?: string;
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
        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
      />
      {open && filtered.length > 0 && (
        <ul className={`absolute left-0 right-0 top-full mt-0.5 rounded-lg border border-border bg-card shadow-lg ${zIndex} max-h-48 overflow-y-auto`}>
          {filtered.map((s) => (
            <li key={s} onMouseDown={() => { onChange(s); setOpen(false); }}
              className="cursor-pointer px-2.5 py-1.5 text-xs text-foreground hover:bg-muted">{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

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

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditSpillPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [loadingData, setLoadingData] = useState(true);
  const [customId,    setCustomId]    = useState("");

  const [spillType,          setSpillType]          = useState("BIOLOGICO");
  const [location,           setLocation]           = useState("");
  const [materialInvolved,   setMaterialInvolved]   = useState("");
  const [estimatedVolume,    setEstimatedVolume]     = useState("");
  const [immediateAction,    setImmediateAction]     = useState("");
  const [disinfectionMethod, setDisinfectionMethod] = useState("");
  const [staffExposed,       setStaffExposed]       = useState(false);
  const [exposureIncidentId, setExposureIncidentId] = useState<number | null>(null);
  const [occurredAt,         setOccurredAt]         = useState("");

  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<Record<string, any>>(`/clinical_laboratory/spill/${id}/`)
      .then((d) => {
        setCustomId(d.custom_id ?? "");
        setSpillType(d.spill_type ?? "BIOLOGICO");
        setLocation(d.location ?? "");
        setMaterialInvolved(d.material_involved ?? "");
        setEstimatedVolume(d.estimated_volume ?? "");
        setImmediateAction(d.immediate_action ?? "");
        setDisinfectionMethod(d.disinfection_method ?? "");
        setStaffExposed(d.staff_exposed ?? false);
        setExposureIncidentId(d.exposure_incident ?? null);
        if (d.occurred_at) setOccurredAt(new Date(d.occurred_at).toISOString().slice(0, 16));
      })
      .catch(() => setSaveError("Erro ao carregar registo."))
      .finally(() => setLoadingData(false));
  }, [id]);

  const activeType = SPILL_TYPES.find((t) => t.value === spillType) ?? SPILL_TYPES[0];
  const TypeIcon   = activeType.icon;

  function validate() {
    const e: Record<string, string> = {};
    if (!location.trim()) e.location = "Local é obrigatório.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const body: Record<string, any> = {
        spill_type:    spillType,
        location:      location.trim(),
        occurred_at:   occurredAt,
        staff_exposed: staffExposed,
      };
      if (materialInvolved.trim())   body.material_involved   = materialInvolved.trim();
      if (estimatedVolume.trim())    body.estimated_volume    = estimatedVolume.trim();
      if (immediateAction.trim())    body.immediate_action    = immediateAction.trim();
      if (disinfectionMethod.trim()) body.disinfection_method = disinfectionMethod.trim();
      body.exposure_incident = exposureIncidentId;

      await apiFetch(`/clinical_laboratory/spill/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      router.push(`/clinical-laboratory/biosafety/spills/${id}`);
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
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl ${activeType.blob1}`} />
            <div className={`absolute -bottom-8 left-6 h-24 w-24 rounded-full blur-2xl ${activeType.blob2}`} />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${activeType.bar}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${activeType.grad} shadow-md ${activeType.glow}`}>
              <TypeIcon size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Biossegurança</span><span>/</span>
                <span>Derrames</span><span>/</span>
                <span className="font-mono">{customId}</span><span>/</span>
                <span className="font-medium text-foreground">Editar</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {location.trim() ? `Editar — ${location}` : "Editar registo de derrame"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${activeType.chip}`}>
                  <TypeIcon size={8} className="mr-1" /> {activeType.label}
                </span>
                {staffExposed && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                    <AlertTriangle size={8} /> Houve exposição
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
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r px-4 text-xs font-semibold text-white shadow-md transition disabled:opacity-50 ${activeType.btn}`}>
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

          {/* Tipo + Local */}
          <Card icon={MapPin} title="Tipo e localização" accent={activeType.bar}>
            <Field label="Tipo de derrame" required>
              <div className="flex gap-2">
                {SPILL_TYPES.map((t) => {
                  const TIcon = t.icon;
                  return (
                    <button key={t.value} type="button" onClick={() => setSpillType(t.value)}
                      className={`flex-1 rounded-lg border py-2 text-xs font-medium transition ${spillType === t.value ? `${t.chip} ring-1 ring-current/30 shadow-sm` : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                      <TIcon size={14} className="mx-auto mb-0.5" />
                      <div>{t.label}</div>
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Local / Área" required error={errors.location}>
              <SuggestInput value={location} onChange={(v) => { setLocation(v); if (v.trim()) setErrors((p) => ({ ...p, location: "" })); }}
                suggestions={LOCATIONS} placeholder="Ex.: Laboratório Clínico…" zIndex="z-[997]" />
            </Field>
            <Field label="Data e hora da ocorrência" required>
              <input type="datetime-local" value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Material */}
          <Card icon={Droplets} title="Material e volume" accent="bg-orange-400">
            <Field label="Material envolvido">
              <SuggestInput value={materialInvolved} onChange={setMaterialInvolved}
                suggestions={MATERIALS} placeholder="Ex.: Sangue total, Ácido sulfúrico…" zIndex="z-[996]" />
            </Field>
            <Field label="Volume estimado">
              <input type="text" value={estimatedVolume}
                onChange={(e) => setEstimatedVolume(e.target.value)}
                placeholder="Ex.: 5 mL, ~50 mL, < 1 L"
                className={inputCls}
              />
            </Field>
            <Field label="Método de desinfeção">
              <SuggestInput value={disinfectionMethod} onChange={setDisinfectionMethod}
                suggestions={DISINFECTION_METHODS} placeholder="Ex.: Hipoclorito 1%…" zIndex="z-[995]" />
            </Field>
          </Card>

          {/* Ação imediata + Exposição — full width */}
          <div className="lg:col-span-2">
            <Card icon={Shield} title="Ação imediata e exposição" accent="bg-red-500">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Ação imediata tomada">
                  <textarea value={immediateAction}
                    onChange={(e) => setImmediateAction(e.target.value)}
                    rows={5} placeholder="Descreva os passos de contenção e limpeza…"
                    className={inputCls + " resize-none"} />
                </Field>
                <div className="space-y-3">
                  <Field label="Houve exposição de colaboradores?">
                    <div className="flex gap-2">
                      {[{ v: false, l: "Não houve" }, { v: true, l: "Sim, houve" }].map(({ v, l }) => (
                        <button key={String(v)} type="button" onClick={() => setStaffExposed(v)}
                          className={`flex-1 rounded-lg border py-1.5 text-[11px] font-medium transition ${staffExposed === v ? (v ? "border-red-300 bg-red-50 text-red-700 ring-1 ring-red-300/40 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300" : "border-emerald-300 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300/40 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300") : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </Field>
                  {staffExposed && (
                    <Field label="Incidente de exposição associado" hint="Ligue a um registo de exposição existente">
                      <RelationSelect
                        target={T_INCIDENT}
                        value={exposureIncidentId}
                        onChange={(id) => setExposureIncidentId(id)}
                        placeholder="Procurar incidente…"
                        initialLabel={exposureIncidentId ? `Incidente #${exposureIncidentId}` : undefined}
                      />
                    </Field>
                  )}
                </div>
              </div>
            </Card>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
