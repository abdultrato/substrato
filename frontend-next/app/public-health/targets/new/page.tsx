"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Save,
  Search,
  Target,
  Users,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

const EDIT_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.MEDICINA,
  GROUPS.ENFERMAGEM,
  GROUPS.LABORATORIO,
  GROUPS.SAUDE_PUBLICA,
];

const REGIONS = [
  "Maputo Cidade", "Maputo Província", "Gaza", "Inhambane", "Sofala",
  "Manica", "Tete", "Zambézia", "Nampula", "Cabo Delgado", "Niassa",
];

const T_CAMPAIGN: RelationTarget = { endpoint: "/public_health/campaign/", labelFields: ["name"] };

// ── Inline RelationSelect ─────────────────────────────────────────────────────
function RelationSelect({ value, onChange, target, placeholder }: {
  value: number | null; onChange: (v: number | null, label: string) => void;
  target: RelationTarget; placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [label, setLabel] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lbId = useId();

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
    onChange(Number(opt.value), opt.label); setLabel(opt.label); setQuery(""); setOpen(false);
  }
  function clear() { onChange(null, ""); setLabel(""); }

  return (
    <div className="space-y-1.5">
      {value !== null && (
        <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300">
          {label}
          <button type="button" onClick={clear} className="ml-0.5 text-teal-400 transition hover:text-teal-600"><X size={9} /></button>
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
            <div id={lbId} role="listbox" className="absolute left-0 right-0 z-[999] mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {results.length === 0
                ? <p className="px-3 py-2 text-[11px] text-muted-foreground">{searching ? "A pesquisar…" : "Nenhuma campanha encontrada."}</p>
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

// ── Design helpers ────────────────────────────────────────────────────────────
function SuggestInput({ value, onChange, suggestions, placeholder, zIndex = "z-[997]" }: {
  value: string; onChange: (v: string) => void; suggestions: string[]; placeholder?: string; zIndex?: string;
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
        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
      />
      {open && filtered.length > 0 && (
        <ul className={`absolute left-0 right-0 top-full mt-0.5 rounded-lg border border-border bg-card shadow-lg ${zIndex} max-h-44 overflow-y-auto`}>
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

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20";

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NewTargetPage() {
  useAuthGuard();
  const router = useRouter();

  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [campaignLabel, setCampaignLabel] = useState("");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [population, setPopulation] = useState("");
  const [targetDoses, setTargetDoses] = useState("");
  const [administered, setAdministered] = useState("");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const doses = Number(targetDoses || 0);
  const adm = Number(administered || 0);
  const pct = doses > 0 ? Math.min(100, Math.round((adm / doses) * 100)) : 0;
  const pctBar = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : pct > 0 ? "bg-amber-500" : "bg-slate-400";

  function validate() {
    const e: Record<string, string> = {};
    if (!campaignId) e.campaign = "Campanha é obrigatória.";
    if (!region.trim()) e.region = "Região é obrigatória.";
    if (adm > doses && administered) e.administered_doses = "Doses aplicadas não podem exceder a meta.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const body: Record<string, any> = {
        campaign: campaignId,
        region: region.trim(),
      };
      if (district.trim()) body.district = district.trim();
      if (ageMin.trim()) body.age_min_months = Number(ageMin);
      if (ageMax.trim()) body.age_max_months = Number(ageMax);
      if (population.trim()) body.target_population = Number(population);
      if (targetDoses.trim()) body.target_doses = Number(targetDoses);
      if (administered.trim()) body.administered_doses = Number(administered);
      if (notes.trim()) body.notes = notes.trim();

      const res = await apiFetch<{ id: number }>("/public_health/target/", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.push(`/public-health/targets/${res.id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao registar meta.");
    } finally { setSaving(false); }
  }

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-teal-500 to-cyan-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-md shadow-teal-500/30">
              <Target size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Saúde Pública</span><span>/</span>
                <span>Metas</span><span>/</span>
                <span className="font-medium text-foreground">Nova meta</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {region.trim() ? `Meta — ${[region, district].filter(Boolean).join(" / ")}` : "Nova meta por região"}
              </h1>
              {campaignLabel && (
                <div className="mt-0.5 text-[10px] text-muted-foreground">📣 {campaignLabel}</div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-4 text-xs font-semibold text-white shadow-md shadow-teal-500/30 transition hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Registar meta
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

          {/* Campanha e região */}
          <Card icon={MapPin} title="Campanha e região" accent="bg-teal-500">
            <Field label="Campanha" required error={errors.campaign}>
              <RelationSelect target={T_CAMPAIGN} value={campaignId}
                onChange={(id, lbl) => { setCampaignId(id); setCampaignLabel(lbl); if (id) setErrors((p) => ({ ...p, campaign: "" })); }}
                placeholder="Procurar campanha…" />
            </Field>
            <Field label="Região" required error={errors.region}>
              <SuggestInput value={region}
                onChange={(v) => { setRegion(v); if (v.trim()) setErrors((p) => ({ ...p, region: "" })); }}
                suggestions={REGIONS} placeholder="Ex.: Maputo Província…" zIndex="z-[997]" />
            </Field>
            <Field label="Distrito">
              <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)}
                placeholder="Ex.: Matola" className={inputCls} />
            </Field>
          </Card>

          {/* Faixa etária + população */}
          <Card icon={Users} title="Faixa etária e população" accent="bg-cyan-500">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Idade mínima (meses)">
                <input type="number" min={0} value={ageMin} onChange={(e) => setAgeMin(e.target.value)}
                  placeholder="Ex.: 9" className={inputCls} />
              </Field>
              <Field label="Idade máxima (meses)">
                <input type="number" min={0} value={ageMax} onChange={(e) => setAgeMax(e.target.value)}
                  placeholder="Ex.: 60" className={inputCls} />
              </Field>
            </div>
            <Field label="População alvo">
              <input type="number" min={0} value={population} onChange={(e) => setPopulation(e.target.value)}
                placeholder="Ex.: 4000" className={inputCls} />
            </Field>
          </Card>

          {/* Doses + cobertura */}
          <div className="lg:col-span-2">
            <Card icon={Target} title="Metas de doses e cobertura" accent="bg-emerald-500">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Meta de doses">
                  <input type="number" min={0} value={targetDoses} onChange={(e) => setTargetDoses(e.target.value)}
                    placeholder="Ex.: 3500" className={inputCls} />
                </Field>
                <Field label="Doses aplicadas" error={errors.administered_doses}>
                  <input type="number" min={0} value={administered} onChange={(e) => setAdministered(e.target.value)}
                    placeholder="Ex.: 3100" className={inputCls} />
                </Field>
              </div>
              <div>
                <div className="mb-0.5 flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Cobertura estimada</span>
                  <span className="font-semibold text-foreground">{pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div className={pctBar} style={{ width: `${pct}%`, height: "100%" }} />
                </div>
              </div>
            </Card>
          </div>

          {/* Observações */}
          <div className="lg:col-span-2">
            <Card icon={MapPin} title="Observações" accent="bg-slate-400">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                placeholder="Notas sobre a meta, logística ou barreiras de acesso…"
                className={inputCls} />
            </Card>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
