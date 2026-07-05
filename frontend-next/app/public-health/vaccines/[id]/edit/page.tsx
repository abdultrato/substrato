"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Snowflake,
  Syringe,
  Target,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const EDIT_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.MEDICINA,
  GROUPS.ENFERMAGEM,
  GROUPS.LABORATORIO,
  GROUPS.SAUDE_PUBLICA,
];

const TYPES = [
  { value: "LIVE_ATTENUATED", label: "Viva atenuada", emoji: "🦠", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300", grad: "from-emerald-500 to-teal-600",   glow: "shadow-emerald-500/30", btn: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30",       blob1: "bg-emerald-500/10", blob2: "bg-teal-500/10"    },
  { value: "INACTIVATED",     label: "Inativada",     emoji: "💉", bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",             grad: "from-blue-500 to-indigo-600",   glow: "shadow-blue-500/30",    btn: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30",           blob1: "bg-blue-500/10",    blob2: "bg-indigo-500/10"  },
  { value: "TOXOID",          label: "Toxóide",       emoji: "☣️", bar: "bg-amber-500",   chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",         grad: "from-amber-500 to-orange-600",  glow: "shadow-amber-500/30",   btn: "from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/30",       blob1: "bg-amber-500/10",   blob2: "bg-orange-500/10"  },
  { value: "SUBUNIT",         label: "Subunidade",    emoji: "🧩", bar: "bg-teal-500",    chip: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300",             grad: "from-teal-500 to-cyan-600",     glow: "shadow-teal-500/30",    btn: "from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-teal-500/30",               blob1: "bg-teal-500/10",    blob2: "bg-cyan-500/10"    },
  { value: "MRNA",            label: "mRNA",          emoji: "🧬", bar: "bg-violet-500",  chip: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300", grad: "from-violet-500 to-fuchsia-600", glow: "shadow-violet-500/30", btn: "from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-violet-500/30", blob1: "bg-violet-500/10",  blob2: "bg-fuchsia-500/10" },
  { value: "VIRAL_VECTOR",    label: "Vetor viral",   emoji: "🧫", bar: "bg-pink-500",    chip: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-700/40 dark:bg-pink-900/20 dark:text-pink-300",                 grad: "from-pink-500 to-rose-600",     glow: "shadow-pink-500/30",    btn: "from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 shadow-pink-500/30",               blob1: "bg-pink-500/10",    blob2: "bg-rose-500/10"    },
  { value: "OTHER",           label: "Outra",         emoji: "💊", bar: "bg-slate-400",   chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-300",         grad: "from-slate-400 to-slate-600",   glow: "shadow-slate-400/20",   btn: "from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 shadow-slate-400/20",         blob1: "bg-slate-400/10",   blob2: "bg-slate-500/10"   },
];

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

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20";

export default function EditVaccinePage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loadingData, setLoadingData] = useState(true);
  const [customId, setCustomId] = useState("");

  const [name, setName] = useState("");
  const [disease, setDisease] = useState("");
  const [vaccineType, setVaccineType] = useState("INACTIVATED");
  const [manufacturer, setManufacturer] = useState("");
  const [code, setCode] = useState("");
  const [officialCode, setOfficialCode] = useState("");
  const [doseVolume, setDoseVolume] = useState("");
  const [doseCount, setDoseCount] = useState("1");
  const [boosterDays, setBoosterDays] = useState("0");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [coldMin, setColdMin] = useState("");
  const [coldMax, setColdMax] = useState("");
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<Record<string, any>>(`/public_health/vaccine/${id}/`)
      .then((d) => {
        setCustomId(d.custom_id ?? "");
        setName(d.name ?? "");
        setDisease(d.disease ?? "");
        setVaccineType(d.vaccine_type ?? "INACTIVATED");
        setManufacturer(d.manufacturer ?? "");
        setCode(d.code ?? "");
        setOfficialCode(d.official_code ?? "");
        setDoseVolume(d.dose_volume_ml != null ? String(d.dose_volume_ml) : "");
        setDoseCount(d.dose_count_required != null ? String(d.dose_count_required) : "1");
        setBoosterDays(d.booster_interval_days != null ? String(d.booster_interval_days) : "0");
        setMinAge(d.minimum_age_months != null ? String(d.minimum_age_months) : "");
        setMaxAge(d.maximum_age_months != null ? String(d.maximum_age_months) : "");
        setColdMin(d.cold_chain_min_c != null ? String(d.cold_chain_min_c) : "");
        setColdMax(d.cold_chain_max_c != null ? String(d.cold_chain_max_c) : "");
        setActive(d.active ?? true);
        setNotes(d.notes ?? "");
      })
      .catch(() => setSaveError("Erro ao carregar vacina."))
      .finally(() => setLoadingData(false));
  }, [id]);

  const activeType = TYPES.find((t) => t.value === vaccineType) ?? TYPES[1];

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome é obrigatório.";
    if (!disease.trim()) e.disease = "Doença alvo é obrigatória.";
    if (coldMin.trim() && coldMax.trim() && Number(coldMax) < Number(coldMin)) e.cold_chain_max_c = "A máxima deve ser maior que a mínima.";
    if (minAge.trim() && maxAge.trim() && Number(maxAge) < Number(minAge)) e.maximum_age_months = "A idade máxima deve ser maior que a mínima.";
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
        disease: disease.trim(),
        vaccine_type: vaccineType,
        manufacturer: manufacturer.trim(),
        code: code.trim(),
        official_code: officialCode.trim(),
        dose_count_required: Number(doseCount || 1),
        booster_interval_days: Number(boosterDays || 0),
        active,
        notes: notes.trim(),
        minimum_age_months: minAge.trim() ? Number(minAge) : null,
        maximum_age_months: maxAge.trim() ? Number(maxAge) : null,
      };
      if (doseVolume.trim()) body.dose_volume_ml = Number(doseVolume);
      if (coldMin.trim()) body.cold_chain_min_c = Number(coldMin);
      if (coldMax.trim()) body.cold_chain_max_c = Number(coldMax);

      await apiFetch(`/public_health/vaccine/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      router.push(`/public-health/vaccines/${id}`);
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
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl ${activeType.blob1}`} />
            <div className={`absolute -bottom-8 left-6 h-24 w-24 rounded-full blur-2xl ${activeType.blob2}`} />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${activeType.bar}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${activeType.grad} shadow-md ${activeType.glow}`}>
              <Syringe size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Vacinas</span><span>/</span>
                <span className="font-mono">{customId}</span><span>/</span>
                <span className="font-medium text-foreground">Editar</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {name.trim() ? `Editar — ${name}` : "Editar vacina"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${activeType.chip}`}>
                  {activeType.emoji} {activeType.label}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                  : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-400"}`}>
                  {active ? "Ativa" : "Inativa"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r px-4 text-xs font-semibold text-white shadow-md transition disabled:opacity-50 ${activeType.btn}`}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <span className="text-[13px]">💾</span>}
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
            <Card icon={Syringe} title="Tipo de vacina" accent={activeType.bar}>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                {TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => setVaccineType(t.value)}
                    className={`rounded-lg border py-2 text-center text-[10px] font-medium transition ${vaccineType === t.value ? `${t.chip} shadow-sm ring-1 ring-current/30` : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    <div className="text-lg leading-none">{t.emoji}</div>
                    <div className="mt-0.5 leading-tight">{t.label}</div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Identificação */}
          <Card icon={Target} title="Identificação" accent="bg-violet-500">
            <Field label="Nome" required error={errors.name}>
              <input type="text" value={name}
                onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, name: "" })); }}
                placeholder="Ex.: Hepatite B" className={inputCls} />
            </Field>
            <Field label="Doença alvo" required error={errors.disease}>
              <input type="text" value={disease}
                onChange={(e) => { setDisease(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, disease: "" })); }}
                placeholder="Ex.: Hepatite B" className={inputCls} />
            </Field>
            <Field label="Fabricante">
              <input type="text" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)}
                placeholder="Ex.: GSK" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Código">
                <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex.: HEPB" className={inputCls} />
              </Field>
              <Field label="Código oficial">
                <input type="text" value={officialCode} onChange={(e) => setOfficialCode(e.target.value)}
                  placeholder="Ex.: PNV-001" className={inputCls} />
              </Field>
            </div>
          </Card>

          {/* Esquema */}
          <Card icon={CalendarDays} title="Esquema vacinal" accent="bg-indigo-500">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Doses requeridas">
                <input type="number" min={1} value={doseCount} onChange={(e) => setDoseCount(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Reforço (dias)" hint="0 = sem reforço">
                <input type="number" min={0} value={boosterDays} onChange={(e) => setBoosterDays(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Volume da dose (ml)">
                <input type="number" step="0.01" min={0} value={doseVolume} onChange={(e) => setDoseVolume(e.target.value)} placeholder="Ex.: 0.50" className={inputCls} />
              </Field>
              <div />
              <Field label="Idade mínima (meses)">
                <input type="number" min={0} value={minAge} onChange={(e) => setMinAge(e.target.value)} placeholder="—" className={inputCls} />
              </Field>
              <Field label="Idade máxima (meses)" error={errors.maximum_age_months}>
                <input type="number" min={0} value={maxAge} onChange={(e) => setMaxAge(e.target.value)} placeholder="—" className={inputCls} />
              </Field>
            </div>
          </Card>

          {/* Cadeia fria + estado */}
          <Card icon={Snowflake} title="Cadeia fria e estado" accent="bg-sky-500">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Temp. mínima (°C)">
                <input type="number" step="0.01" value={coldMin} onChange={(e) => setColdMin(e.target.value)} placeholder="Ex.: 2" className={inputCls} />
              </Field>
              <Field label="Temp. máxima (°C)" error={errors.cold_chain_max_c}>
                <input type="number" step="0.01" value={coldMax} onChange={(e) => setColdMax(e.target.value)} placeholder="Ex.: 8" className={inputCls} />
              </Field>
            </div>
            <Field label="Estado">
              <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => setActive(true)}
                  className={`rounded-lg border py-1.5 text-[10px] font-medium transition ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-300/30 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                  ✅ Ativa
                </button>
                <button type="button" onClick={() => setActive(false)}
                  className={`rounded-lg border py-1.5 text-[10px] font-medium transition ${!active ? "border-slate-300 bg-slate-100 text-slate-600 shadow-sm ring-1 ring-slate-300/30 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-300" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                  🚫 Inativa
                </button>
              </div>
            </Field>
          </Card>

          {/* Observações */}
          <Card icon={CalendarDays} title="Observações" accent="bg-slate-400">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              placeholder="Indicações, contraindicações, notas de conservação…"
              className={inputCls} />
          </Card>

        </div>
      </form>
    </AppLayout>
  );
}
