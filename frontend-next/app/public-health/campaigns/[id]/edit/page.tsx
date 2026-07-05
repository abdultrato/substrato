"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Loader2,
  MapPin,
  Save,
  Search,
  Syringe,
  Target,
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

const TYPES = [
  { value: "ROUTINE",      label: "Rotina",      emoji: "🔁" },
  { value: "MASS",         label: "Massiva",     emoji: "📣" },
  { value: "OUTBREAK",     label: "Surto",       emoji: "🚨" },
  { value: "SCHOOL",       label: "Escolar",     emoji: "🏫" },
  { value: "OCCUPATIONAL", label: "Ocupacional", emoji: "🏭" },
  { value: "OTHER",        label: "Outra",       emoji: "📋" },
];

const STATUSES = [
  { value: "PLANNED",   label: "Planeada",  emoji: "📅", bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",             grad: "from-blue-500 to-indigo-600",  glow: "shadow-blue-500/30",    btn: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30",       blob1: "bg-blue-500/10",    blob2: "bg-indigo-500/10" },
  { value: "ACTIVE",    label: "Ativa",     emoji: "▶️", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300", grad: "from-emerald-500 to-teal-600", glow: "shadow-emerald-500/30", btn: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30", blob1: "bg-emerald-500/10", blob2: "bg-teal-500/10"   },
  { value: "PAUSED",    label: "Pausada",   emoji: "⏸️", bar: "bg-amber-500",   chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",         grad: "from-amber-500 to-orange-600", glow: "shadow-amber-500/30",   btn: "from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/30",   blob1: "bg-amber-500/10",   blob2: "bg-orange-500/10" },
  { value: "COMPLETED", label: "Concluída", emoji: "✅", bar: "bg-teal-500",    chip: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300",             grad: "from-teal-500 to-emerald-600", glow: "shadow-teal-500/30",    btn: "from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-teal-500/30",   blob1: "bg-teal-500/10",    blob2: "bg-emerald-500/10" },
  { value: "CANCELLED", label: "Cancelada", emoji: "✖️", bar: "bg-red-500",     chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",                 grad: "from-red-500 to-rose-600",     glow: "shadow-red-500/30",     btn: "from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-500/30",             blob1: "bg-red-500/10",     blob2: "bg-rose-500/10"   },
];

const REGIONS = [
  "Maputo Cidade", "Maputo Província", "Gaza", "Inhambane", "Sofala",
  "Manica", "Tete", "Zambézia", "Nampula", "Cabo Delgado", "Niassa",
];

const T_VACCINE: RelationTarget = { endpoint: "/public_health/vaccine/", labelFields: ["name", "disease", "code"] };
const T_MANAGER: RelationTarget = { endpoint: "/human_resources/employee/", labelFields: ["name", "full_name", "employee_code"] };

// ── Inline RelationSelect ─────────────────────────────────────────────────────
function RelationSelect({ value, onChange, target, placeholder, initialLabel }: {
  value: number | null; onChange: (v: number | null, label: string) => void;
  target: RelationTarget; placeholder?: string; initialLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [label, setLabel] = useState(initialLabel ?? "");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lbId = useId();
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
    onChange(Number(opt.value), opt.label); setLabel(opt.label); setQuery(""); setOpen(false);
  }
  function clear() { onChange(null, ""); setLabel(""); }

  return (
    <div className="space-y-1.5">
      {value !== null && (
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300">
          {label}
          <button type="button" onClick={clear} className="ml-0.5 text-indigo-400 transition hover:text-indigo-600"><X size={9} /></button>
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
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
          />
          {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {open && (
            <div id={lbId} role="listbox" className="absolute left-0 right-0 z-[999] mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {results.length === 0
                ? <p className="px-3 py-2 text-[11px] text-muted-foreground">{searching ? "A pesquisar…" : "Nenhum resultado."}</p>
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
        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
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

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20";

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EditCampaignPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loadingData, setLoadingData] = useState(true);
  const [customId, setCustomId] = useState("");

  const [name, setName] = useState("");
  const [vaccineId, setVaccineId] = useState<number | null>(null);
  const [vaccineLabel, setVaccineLabel] = useState("");
  const [managerId, setManagerId] = useState<number | null>(null);
  const [managerLabel, setManagerLabel] = useState("");
  const [campaignType, setCampaignType] = useState("ROUTINE");
  const [status, setStatus] = useState("PLANNED");
  const [targetRegion, setTargetRegion] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [population, setPopulation] = useState("");
  const [targetDoses, setTargetDoses] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [programCode, setProgramCode] = useState("");
  const [officialSystem, setOfficialSystem] = useState("");
  const [notificationEndpoint, setNotificationEndpoint] = useState("");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<Record<string, any>>(`/public_health/campaign/${id}/`)
      .then((d) => {
        setCustomId(d.custom_id ?? "");
        setName(d.name ?? "");
        setVaccineId(d.vaccine ?? null);
        setVaccineLabel(d.vaccine_name ?? (d.vaccine ? `Vacina #${d.vaccine}` : ""));
        setManagerId(d.manager ?? null);
        setManagerLabel(d.manager_name ?? (d.manager ? `Responsável #${d.manager}` : ""));
        setCampaignType(d.campaign_type ?? "ROUTINE");
        setStatus(d.status ?? "PLANNED");
        setTargetRegion(d.target_region ?? "");
        setAgeMin(d.target_age_min_months != null ? String(d.target_age_min_months) : "");
        setAgeMax(d.target_age_max_months != null ? String(d.target_age_max_months) : "");
        setPopulation(d.target_population != null ? String(d.target_population) : "");
        setTargetDoses(d.target_doses != null ? String(d.target_doses) : "");
        setStartDate(d.start_date ?? "");
        setEndDate(d.end_date ?? "");
        setProgramCode(d.official_program_code ?? "");
        setOfficialSystem(d.official_system ?? "");
        setNotificationEndpoint(d.notification_endpoint ?? "");
        setNotes(d.notes ?? "");
      })
      .catch(() => setSaveError("Erro ao carregar campanha."))
      .finally(() => setLoadingData(false));
  }, [id]);

  const activeStatus = STATUSES.find((s) => s.value === status) ?? STATUSES[0];
  const activeType = TYPES.find((t) => t.value === campaignType) ?? TYPES[0];

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome é obrigatório.";
    if (!vaccineId) e.vaccine = "Vacina é obrigatória.";
    if (!startDate) e.start_date = "Data de início é obrigatória.";
    if (startDate && endDate && endDate < startDate) e.end_date = "A data final não pode ser anterior ao início.";
    if (ageMin.trim() && ageMax.trim() && Number(ageMax) < Number(ageMin)) e.target_age_max_months = "A idade máxima deve ser maior que a mínima.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const body: Record<string, any> = {
        name: name.trim(),
        vaccine: vaccineId,
        manager: managerId,
        campaign_type: campaignType,
        status,
        target_region: targetRegion.trim(),
        official_program_code: programCode.trim(),
        official_system: officialSystem.trim(),
        notification_endpoint: notificationEndpoint.trim(),
        notes: notes.trim(),
        start_date: startDate,
        end_date: endDate || null,
        target_age_min_months: ageMin.trim() ? Number(ageMin) : null,
        target_age_max_months: ageMax.trim() ? Number(ageMax) : null,
      };
      if (population.trim()) body.target_population = Number(population);
      if (targetDoses.trim()) body.target_doses = Number(targetDoses);

      await apiFetch(`/public_health/campaign/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      router.push(`/public-health/campaigns/${id}`);
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
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl ${activeStatus.blob1}`} />
            <div className={`absolute -bottom-8 left-6 h-24 w-24 rounded-full blur-2xl ${activeStatus.blob2}`} />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${activeStatus.bar}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${activeStatus.grad} shadow-md ${activeStatus.glow}`}>
              <ClipboardList size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Campanhas</span><span>/</span>
                <span className="font-mono">{customId}</span><span>/</span>
                <span className="font-medium text-foreground">Editar</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {name.trim() ? `Editar — ${name}` : "Editar campanha"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${activeStatus.chip}`}>
                  {activeStatus.emoji} {activeStatus.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {activeType.emoji} {activeType.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r px-4 text-xs font-semibold text-white shadow-md transition disabled:opacity-50 ${activeStatus.btn}`}>
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

          {/* Tipo — full width */}
          <div className="lg:col-span-2">
            <Card icon={ClipboardList} title="Tipo de campanha" accent={activeStatus.bar}>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                {TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => setCampaignType(t.value)}
                    className={`rounded-lg border py-2 text-center text-[10px] font-medium transition ${campaignType === t.value ? "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-300/30 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    <div className="text-lg leading-none">{t.emoji}</div>
                    <div className="mt-0.5 leading-tight">{t.label}</div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Identificação */}
          <Card icon={Target} title="Identificação" accent="bg-indigo-500">
            <Field label="Nome" required error={errors.name}>
              <input type="text" value={name}
                onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, name: "" })); }}
                placeholder="Ex.: Campanha Nacional contra o Sarampo" className={inputCls} />
            </Field>
            <Field label="Vacina" required error={errors.vaccine}>
              <RelationSelect target={T_VACCINE} value={vaccineId}
                onChange={(v, lbl) => { setVaccineId(v); setVaccineLabel(lbl); if (v) setErrors((p) => ({ ...p, vaccine: "" })); }}
                placeholder="Procurar vacina…" initialLabel={vaccineLabel || undefined} />
            </Field>
            <Field label="Responsável">
              <RelationSelect target={T_MANAGER} value={managerId}
                onChange={(v, lbl) => { setManagerId(v); setManagerLabel(lbl); }}
                placeholder="Procurar colaborador…" initialLabel={managerLabel || undefined} />
            </Field>
            <Field label="Código do programa oficial">
              <input type="text" value={programCode} onChange={(e) => setProgramCode(e.target.value)}
                placeholder="Ex.: PNV-SARAMPO-2026" className={inputCls} />
            </Field>
          </Card>

          {/* Estado e calendário */}
          <Card icon={CalendarDays} title="Estado e calendário" accent={activeStatus.bar}>
            <Field label="Estado">
              <div className="grid grid-cols-3 gap-1">
                {STATUSES.map((s) => (
                  <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                    className={`rounded-lg border py-1.5 text-[10px] font-medium transition ${status === s.value ? `${s.chip} shadow-sm ring-1 ring-current/30` : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    <span className="mr-0.5">{s.emoji}</span>{s.label}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Início" required error={errors.start_date}>
                <input type="date" value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); if (e.target.value) setErrors((p) => ({ ...p, start_date: "" })); }}
                  className={inputCls} />
              </Field>
              <Field label="Fim" hint="Deixe vazio se em aberto" error={errors.end_date}>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>

          {/* População alvo */}
          <Card icon={MapPin} title="População alvo" accent="bg-blue-500">
            <Field label="Região alvo">
              <SuggestInput value={targetRegion} onChange={setTargetRegion}
                suggestions={REGIONS} placeholder="Ex.: Maputo Província…" zIndex="z-[996]" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Idade mínima (meses)">
                <input type="number" min={0} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} placeholder="—" className={inputCls} />
              </Field>
              <Field label="Idade máxima (meses)" error={errors.target_age_max_months}>
                <input type="number" min={0} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} placeholder="—" className={inputCls} />
              </Field>
              <Field label="População alvo">
                <input type="number" min={0} value={population} onChange={(e) => setPopulation(e.target.value)} placeholder="0" className={inputCls} />
              </Field>
              <Field label="Meta de doses">
                <input type="number" min={0} value={targetDoses} onChange={(e) => setTargetDoses(e.target.value)} placeholder="0" className={inputCls} />
              </Field>
            </div>
          </Card>

          {/* Integração */}
          <Card icon={Syringe} title="Integração oficial" accent="bg-teal-500">
            <Field label="Sistema oficial" hint="Ex.: e-SUS, SIPNI, DHIS2">
              <input type="text" value={officialSystem} onChange={(e) => setOfficialSystem(e.target.value)}
                placeholder="Ex.: DHIS2" className={inputCls} />
            </Field>
            <Field label="Endpoint de notificação">
              <input type="url" value={notificationEndpoint} onChange={(e) => setNotificationEndpoint(e.target.value)}
                placeholder="https://…" className={inputCls} />
            </Field>
          </Card>

          {/* Observações */}
          <div className="lg:col-span-2">
            <Card icon={CalendarDays} title="Observações" accent="bg-slate-400">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                placeholder="Notas operacionais, logística, parcerias…"
                className={inputCls} />
            </Card>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
