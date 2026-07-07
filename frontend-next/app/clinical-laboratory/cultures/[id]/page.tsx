"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Beaker,
  CheckCircle2,
  Clock3,
  FlaskConical,
  Loader2,
  Microscope,
  Plus,
  RefreshCw,
  Save,
  TimerReset,
  Trash2,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

type Plate = {
  id: string;
  label: string;
  medium: string;
  atmosphere: string;
  temperature_c: string;
};

type Observation = {
  observed_at: string;
  accumulated_hours: number;
  observation: string;
  positive: boolean;
};

type BiochemicalTest = {
  name: string;
  duration_hours: number;
  started_at: string;
  expected_end_at: string;
  result: string;
  status: string;
};

type Culture = {
  id: number;
  custom_id: string;
  status: string;
  status_display: string;
  patient_name: string;
  order_custom_id: string;
  test_name: string;
  test_code: string;
  sample_barcode: string;
  sample_type: string;
  culture_plates: Plate[];
  incubation_periods: any[];
  growth_observations: Observation[];
  gram_exam: Record<string, string>;
  biochemical_tests: BiochemicalTest[];
  incubation_accumulated_hours: string | number;
  incubation_started_at: string | null;
  incubation_expected_end_at: string | null;
};

const inputClass = "h-8 w-full rounded-lg border border-white/30 bg-white/35 px-2.5 text-xs text-foreground shadow-sm outline-none backdrop-blur-sm placeholder:text-muted-foreground focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:border-white/10 dark:bg-white/[0.06]";
const textareaClass = "min-h-20 w-full rounded-lg border border-white/30 bg-white/35 px-2.5 py-2 text-xs text-foreground shadow-sm outline-none backdrop-blur-sm placeholder:text-muted-foreground focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:border-white/10 dark:bg-white/[0.06]";

function newPlate(): Plate {
  return { id: crypto.randomUUID(), label: "", medium: "", atmosphere: "Aeróbia", temperature_c: "37" };
}

function fmtDate(value?: string | null) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-MZ", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}

function elapsedParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function Card({ title, icon: Icon, accent, iconTone, children }: {
  title: string;
  icon: typeof Microscope;
  accent: string;
  iconTone: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="flex items-center gap-1.5 border-b border-white/30 px-3 py-1.5 pl-4 dark:border-white/10">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${iconTone} text-white shadow-md`}>
          <Icon size={14} />
        </span>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-2 p-2.5 pl-4">{children}</div>
    </section>
  );
}

export default function CultureDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [culture, setCulture] = useState<Culture | null>(null);
  const [plates, setPlates] = useState<Plate[]>([newPlate()]);
  const [hours, setHours] = useState("24");
  const [observation, setObservation] = useState("");
  const [positive, setPositive] = useState(false);
  const [reincubationHours, setReincubationHours] = useState("24");
  const [gram, setGram] = useState({ result: "", morphology: "", arrangement: "", notes: "" });
  const [biochemical, setBiochemical] = useState<BiochemicalTest[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Culture>(`/clinical_laboratory/culture/${id}/`);
      setCulture(data);
      if (Array.isArray(data.culture_plates) && data.culture_plates.length) setPlates(data.culture_plates);
      if (data.gram_exam) setGram({
        result: data.gram_exam.result || "",
        morphology: data.gram_exam.morphology || "",
        arrangement: data.gram_exam.arrangement || "",
        notes: data.gram_exam.notes || "",
      });
      if (Array.isArray(data.biochemical_tests)) setBiochemical(data.biochemical_tests);
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar a cultura.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const expectedEnd = culture?.incubation_expected_end_at ? new Date(culture.incubation_expected_end_at).getTime() : null;
  const due = expectedEnd !== null && now >= expectedEnd;
  const remaining = expectedEnd !== null ? expectedEnd - now : 0;
  const accumulatedBase = Number(culture?.incubation_accumulated_hours || 0);
  const currentPeriod = culture?.incubation_periods?.[culture.incubation_periods.length - 1];
  const currentStarted = currentPeriod?.started_at ? new Date(currentPeriod.started_at).getTime() : null;
  const accumulatedNow = useMemo(() => {
    if (!currentStarted || !culture?.incubation_expected_end_at) return accumulatedBase;
    return accumulatedBase + Math.max(0, (Math.min(now, expectedEnd || now) - currentStarted) / 3600000);
  }, [accumulatedBase, culture?.incubation_expected_end_at, currentStarted, expectedEnd, now]);

  async function submitAction(path: string, body: Record<string, any>) {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<Culture>(`/clinical_laboratory/culture/${id}/${path}/`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setCulture(updated);
      if (Array.isArray(updated.culture_plates) && updated.culture_plates.length) setPlates(updated.culture_plates);
      if (Array.isArray(updated.biochemical_tests)) setBiochemical(updated.biochemical_tests);
      setObservation("");
    } catch (err: any) {
      setError(err?.message || "Não foi possível executar a ação.");
    } finally {
      setSaving(false);
    }
  }

  function updatePlate(index: number, patch: Partial<Plate>) {
    setPlates((rows) => rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  }

  function addBiochemical() {
    setBiochemical((rows) => [...rows, { name: "", duration_hours: 24, started_at: "", expected_end_at: "", result: "", status: "AGUARDA_RESULTADO" }]);
  }

  if (loading) {
    return <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}><div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando cultura...</div></AppLayout>;
  }

  if (!culture) {
    return <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}><div className="rounded-xl border border-red-200/60 bg-red-50/50 p-4 text-sm text-red-800">{error || "Cultura não encontrada."}</div></AppLayout>;
  }

  const isPositiveFlow = culture.status === "POSITIVA" || culture.growth_observations?.some((obs) => obs.positive);

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="mx-auto w-full max-w-7xl space-y-2">
        <section className="relative overflow-hidden rounded-xl border border-white/25 bg-gradient-to-br from-white/35 via-white/20 to-teal-100/25 p-3 pl-4 shadow-md shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:from-white/[0.07] dark:via-white/[0.03] dark:to-teal-950/20">
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-teal-500 to-cyan-600" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/25"><Microscope size={18} /></span>
              <div className="min-w-0">
                <div className="mb-0.5 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-teal-200/70 bg-teal-50/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700 backdrop-blur-sm dark:border-teal-800/40 dark:bg-teal-900/20 dark:text-teal-300">{culture.status_display}</span>
                  <span className="rounded-full border border-cyan-200/70 bg-cyan-50/70 px-2 py-0.5 text-[10px] font-medium text-cyan-700 backdrop-blur-sm dark:border-cyan-800/40 dark:bg-cyan-900/20 dark:text-cyan-300">{culture.custom_id}</span>
                </div>
                <h1 className="truncate text-lg font-semibold leading-tight text-foreground">{culture.test_name}</h1>
                <p className="truncate text-xs text-muted-foreground">{culture.patient_name} • {culture.order_custom_id} • {culture.sample_barcode}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button onClick={() => router.push("/clinical-laboratory/cultures")} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/55 dark:border-white/10 dark:bg-white/5"><ArrowLeft size={14} /> Voltar</button>
              <button onClick={load} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/55 dark:border-white/10 dark:bg-white/5"><RefreshCw size={14} /> Atualizar</button>
            </div>
          </div>
        </section>

        {error && <div className="rounded-xl border border-red-200/60 bg-red-50/50 px-3 py-2 text-sm text-red-800 backdrop-blur-sm dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{error}</div>}

        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-2">
            <Card title="Sementeira" icon={FlaskConical} accent="bg-gradient-to-b from-teal-500 to-cyan-600" iconTone="from-teal-600 to-cyan-600">
              <div className="space-y-2">
                {plates.map((plate, index) => (
                  <div key={plate.id} className="grid gap-2 rounded-lg border border-white/25 bg-white/20 p-2 backdrop-blur-sm md:grid-cols-[1fr_1fr_1fr_100px_32px] dark:border-white/10 dark:bg-white/[0.04]">
                    <input value={plate.label} onChange={(event) => updatePlate(index, { label: event.target.value })} placeholder="Placa / identificação" className={inputClass} />
                    <input value={plate.medium} onChange={(event) => updatePlate(index, { medium: event.target.value })} placeholder="Meio de cultura" className={inputClass} />
                    <select value={plate.atmosphere} onChange={(event) => updatePlate(index, { atmosphere: event.target.value })} className={inputClass}>
                      <option>Aeróbia</option>
                      <option>Anaeróbia</option>
                      <option>Microaerofilia</option>
                      <option>CO2 5%</option>
                    </select>
                    <input value={plate.temperature_c} onChange={(event) => updatePlate(index, { temperature_c: event.target.value })} placeholder="°C" className={inputClass} />
                    <button type="button" onClick={() => setPlates((rows) => rows.filter((_, i) => i !== index))} className="inline-flex h-8 items-center justify-center rounded-lg border border-white/30 bg-white/25 text-muted-foreground hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setPlates((rows) => [...rows, newPlate()])} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm"><Plus size={14} /> Placa</button>
                <input value={hours} onChange={(event) => setHours(event.target.value)} placeholder="Horas de incubação" className={`${inputClass} max-w-40`} />
                <button disabled={saving} onClick={() => submitAction("iniciar-incubacao", { plates, hours: Number(hours) || 24 })} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-3 text-xs font-semibold text-white shadow-md shadow-teal-500/20 disabled:opacity-60">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Clock3 size={14} />} Iniciar incubação
                </button>
              </div>
            </Card>

            {due && (
              <Card title="Avaliação de crescimento microbiano" icon={Beaker} accent="bg-gradient-to-b from-amber-500 to-orange-600" iconTone="from-amber-500 to-orange-600">
                <textarea value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="Descreva o crescimento observado na placa, aspecto das colónias, hemólise, pigmento, odor ou ausência de crescimento." className={textareaClass} />
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/30 bg-white/25 px-2.5 text-xs text-foreground backdrop-blur-sm">
                    <input type="checkbox" checked={positive} onChange={(event) => setPositive(event.target.checked)} className="h-3.5 w-3.5 accent-teal-600" />
                    Cultura positiva
                  </label>
                  <button onClick={() => submitAction("registrar-observacao", { observation, positive, accumulated_hours: accumulatedNow })} disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-3 text-xs font-semibold text-white shadow-md shadow-amber-500/20 disabled:opacity-60"><Save size={14} /> Guardar observação</button>
                  <input value={reincubationHours} onChange={(event) => setReincubationHours(event.target.value)} placeholder="Horas para reincubar" className={`${inputClass} max-w-40`} />
                  <button onClick={() => submitAction("reincubar", { hours: Number(reincubationHours) || 24 })} disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm"><TimerReset size={14} /> Reincubar</button>
                  <button onClick={() => submitAction("finalizar", { positive: false })} disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 text-xs font-semibold text-white shadow-md shadow-emerald-500/20"><CheckCircle2 size={14} /> Finalizar negativa</button>
                </div>
              </Card>
            )}

            {isPositiveFlow && (
              <Card title="Gram e provas bioquímicas" icon={Microscope} accent="bg-gradient-to-b from-violet-500 to-fuchsia-600" iconTone="from-violet-600 to-fuchsia-600">
                <div className="grid gap-2 md:grid-cols-4">
                  <input value={gram.result} onChange={(event) => setGram((g) => ({ ...g, result: event.target.value }))} placeholder="Resultado do Gram" className={inputClass} />
                  <input value={gram.morphology} onChange={(event) => setGram((g) => ({ ...g, morphology: event.target.value }))} placeholder="Morfologia" className={inputClass} />
                  <input value={gram.arrangement} onChange={(event) => setGram((g) => ({ ...g, arrangement: event.target.value }))} placeholder="Arranjo" className={inputClass} />
                  <input value={gram.notes} onChange={(event) => setGram((g) => ({ ...g, notes: event.target.value }))} placeholder="Notas" className={inputClass} />
                </div>
                <button onClick={() => submitAction("salvar-gram", gram)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/20"><Save size={14} /> Guardar Gram</button>

                <div className="space-y-2">
                  {biochemical.map((test, index) => (
                    <div key={index} className="grid gap-2 rounded-lg border border-white/25 bg-white/20 p-2 backdrop-blur-sm md:grid-cols-[1fr_110px_1fr_1fr_32px] dark:border-white/10 dark:bg-white/[0.04]">
                      <input value={test.name} onChange={(event) => setBiochemical((rows) => rows.map((row, i) => i === index ? { ...row, name: event.target.value } : row))} placeholder="Prova bioquímica" className={inputClass} />
                      <input value={test.duration_hours} onChange={(event) => setBiochemical((rows) => rows.map((row, i) => i === index ? { ...row, duration_hours: Number(event.target.value) || 0 } : row))} placeholder="Horas" className={inputClass} />
                      <input value={test.result} onChange={(event) => setBiochemical((rows) => rows.map((row, i) => i === index ? { ...row, result: event.target.value } : row))} placeholder="Resultado" className={inputClass} />
                      <span className="flex h-8 items-center rounded-lg border border-white/25 bg-white/20 px-2 text-xs text-muted-foreground">{test.expected_end_at ? fmtDate(test.expected_end_at) : "Sem leitura"}</span>
                      <button type="button" onClick={() => setBiochemical((rows) => rows.filter((_, i) => i !== index))} className="inline-flex h-8 items-center justify-center rounded-lg border border-white/30 bg-white/25 text-muted-foreground hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={addBiochemical} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm"><Plus size={14} /> Prova</button>
                  <button onClick={() => submitAction("salvar-provas-bioquimicas", { tests: biochemical })} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/20"><Save size={14} /> Guardar provas</button>
                  <button onClick={() => submitAction("finalizar", { positive: true })} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 text-xs font-semibold text-white shadow-md shadow-emerald-500/20"><CheckCircle2 size={14} /> Finalizar positiva</button>
                </div>
              </Card>
            )}
          </div>

          <aside className="space-y-2">
            <Card title="Cronômetro de incubação" icon={Clock3} accent="bg-gradient-to-b from-sky-500 to-indigo-600" iconTone="from-sky-600 to-indigo-600">
              <div className="rounded-xl border border-white/25 bg-white/25 p-3 text-center backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{due ? "Pronto para leitura" : "Tempo restante"}</p>
                <p className="mt-1 font-mono text-3xl font-semibold text-foreground">{culture.incubation_expected_end_at ? elapsedParts(remaining) : "--:--:--"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Acumulado: {accumulatedNow.toFixed(1)}h</p>
              </div>
              <div className="grid gap-1.5 text-xs text-muted-foreground">
                <span className="rounded-lg border border-white/25 bg-white/20 px-2 py-1">Início: {fmtDate(culture.incubation_started_at)}</span>
                <span className="rounded-lg border border-white/25 bg-white/20 px-2 py-1">Leitura prevista: {fmtDate(culture.incubation_expected_end_at)}</span>
              </div>
            </Card>

            <Card title="Observações" icon={Beaker} accent="bg-gradient-to-b from-emerald-500 to-teal-600" iconTone="from-emerald-600 to-teal-600">
              <div className="space-y-1.5">
                {(culture.growth_observations || []).length === 0 ? <p className="text-xs text-muted-foreground">Sem observações registadas.</p> : culture.growth_observations.map((obs, index) => (
                  <div key={index} className="rounded-lg border border-white/25 bg-white/20 px-2 py-1.5 text-xs backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{obs.accumulated_hours?.toFixed?.(1) ?? obs.accumulated_hours}h</span>
                      <span className={obs.positive ? "text-rose-600" : "text-emerald-600"}>{obs.positive ? "Positiva" : "Negativa/sem crescimento"}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{obs.observation}</p>
                  </div>
                ))}
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
