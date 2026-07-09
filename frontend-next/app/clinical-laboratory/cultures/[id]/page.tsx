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
  Lock,
  Microscope,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";
import { CulturePlateOutcome } from "@/components/clinical-laboratory/CulturePlateOutcome";
import type { BiochemEntry } from "@/lib/cultureBiochemistry";
import {
  CULTURE_ATMOSPHERES,
  CULTURE_CONSISTENCIES,
  CULTURE_CONTAINERS,
  CULTURE_MEDIA,
  applyMediumChoice,
  isCustomMedium,
  makeCulturePlate,
  makePlateCode,
  mediumSelectValue,
  normalizePlates,
  type CulturePlate as Plate,
} from "@/lib/culturePlates";

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
  incubation_accumulated_hours: string | number;
  incubation_started_at: string | null;
  incubation_expected_end_at: string | null;
};

const inputClass = "h-8 w-full rounded-lg border border-white/30 bg-white/35 px-2.5 text-xs text-foreground shadow-sm outline-none backdrop-blur-sm placeholder:text-muted-foreground focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:border-white/10 dark:bg-white/[0.06]";

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
  const [plates, setPlates] = useState<Plate[]>(() => normalizePlates([{}], "CUL"));
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
      setPlates(normalizePlates(data.culture_plates as any[], data.custom_id));
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
      setPlates(normalizePlates(updated.culture_plates as any[], updated.custom_id));
    } catch (err: any) {
      setError(err?.message || "Não foi possível executar a ação.");
    } finally {
      setSaving(false);
    }
  }

  function updatePlate(index: number, patch: Partial<Plate>) {
    setPlates((rows) => rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  }

  // ── Fluxo por meio (placa) quando a incubação termina ──
  function plateCallbacks(plate: Plate) {
    return {
      onEvaluate: (outcome: "positive" | "negative" | "contaminated", macroscopic: string) =>
        submitAction("avaliar-placa", { plate_id: plate.id, outcome, macroscopic }),
      onReincubate: (h: number) => submitAction("reincubar-placa", { plate_id: plate.id, hours: h }),
      onSaveColony: (data: { macroscopic: string; gram: Plate["gram"]; biochemical: BiochemEntry[]; resolved?: boolean }) =>
        submitAction("salvar-placa", { plate_id: plate.id, macroscopic: data.macroscopic, gram: data.gram, biochemical: data.biochemical, resolved: data.resolved ?? false }),
      onFinalizeNegative: () => submitAction("salvar-placa", { plate_id: plate.id, finalize_negative: true }),
      onReopen: () => submitAction("salvar-placa", { plate_id: plate.id, resolved: false }),
      onResetOutcome: () => submitAction("salvar-placa", { plate_id: plate.id, reset_outcome: true }),
    };
  }

  function addPlate() {
    setPlates((rows) => {
      const cultureRef = culture?.custom_id || "CUL";
      const usedSeqs = rows
        .map((row) => Number(row.code.match(/-P(\d+)$/)?.[1]))
        .filter((n) => Number.isFinite(n));
      const nextSeq = (usedSeqs.length ? Math.max(...usedSeqs) : 0) + 1;
      return [...rows, makeCulturePlate({ code: makePlateCode(cultureRef, nextSeq) })];
    });
  }

  if (loading) {
    return <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}><div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando cultura...</div></AppLayout>;
  }

  if (!culture) {
    return <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}><div className="rounded-xl border border-red-200/60 bg-red-50/50 p-4 text-sm text-red-800">{error || "Cultura não encontrada."}</div></AppLayout>;
  }

  const isIncubating = culture.status === "INCUBACAO" || culture.status === "REINCUBACAO";
  const incubationRunning = isIncubating && !due;
  const incubationReady = isIncubating && due;
  // Depois de a incubação começar, nada na sementeira pode ser modificado até
  // ao fim do período — só o estado "Montada" permite editar/iniciar.
  const setupMode = culture.status === "MONTADA";
  const resolvedPlates = plates.filter((p) => p.resolved);

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

            {culture.incubation_expected_end_at && (
              <div className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-1.5 shadow-sm backdrop-blur-sm ${due ? "border-emerald-300/60 bg-emerald-50/60 dark:border-emerald-700/40 dark:bg-emerald-950/25" : "border-sky-300/50 bg-sky-50/55 dark:border-sky-800/40 dark:bg-sky-950/25"}`}>
                <Clock3 size={18} className={`shrink-0 ${due ? "text-emerald-600 dark:text-emerald-400" : "text-sky-600 dark:text-sky-400"} ${incubationRunning ? "animate-pulse" : ""}`} />
                <div className="leading-tight">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{due ? "Pronto para leitura" : "Tempo restante"}</p>
                  <p className="font-mono text-xl font-semibold tabular-nums text-foreground">{elapsedParts(remaining)}</p>
                </div>
                <div className="hidden border-l border-white/40 pl-2.5 text-[10px] leading-snug text-muted-foreground sm:block dark:border-white/10">
                  <p>Acumulado {accumulatedNow.toFixed(1)}h</p>
                  <p>Início {fmtDate(culture.incubation_started_at)}</p>
                  <p>Leitura {fmtDate(culture.incubation_expected_end_at)}</p>
                </div>
              </div>
            )}

            <div className="flex shrink-0 items-center gap-1.5">
              <button onClick={() => router.push("/clinical-laboratory/cultures")} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/55 dark:border-white/10 dark:bg-white/5"><ArrowLeft size={14} /> Voltar</button>
              <button
                onClick={load}
                disabled={loading}
                aria-busy={loading}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/55 disabled:cursor-not-allowed disabled:opacity-65 dark:border-white/10 dark:bg-white/5"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                {loading ? "Atualizando" : "Atualizar"}
              </button>
            </div>
          </div>
        </section>

        {error && <div className="rounded-xl border border-red-200/60 bg-red-50/50 px-3 py-2 text-sm text-red-800 backdrop-blur-sm dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{error}</div>}

        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-2">
            <Card title="Sementeira" icon={FlaskConical} accent="bg-gradient-to-b from-teal-500 to-cyan-600" iconTone="from-teal-600 to-cyan-600">
              <div className="space-y-2">
                {plates.map((plate, index) => {
                  const custom = isCustomMedium(plate);
                  const plateEnd = plate.incubation_expected_end_at ? new Date(plate.incubation_expected_end_at).getTime() : null;
                  const plateDue = plateEnd !== null && now >= plateEnd;
                  const plateRemaining = plateEnd !== null ? plateEnd - now : 0;
                  return (
                    <div key={plate.id} className="space-y-2 rounded-lg border border-white/25 bg-white/20 p-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-md border border-teal-300/50 bg-teal-50/70 px-2 py-0.5 font-mono text-[11px] font-semibold text-teal-800 dark:border-teal-700/40 dark:bg-teal-900/25 dark:text-teal-200"
                          title="Código único da placa/tubo — escreva-o no recipiente"
                        >
                          <FlaskConical size={11} /> {plate.code}
                        </span>
                        {setupMode ? (
                          <button
                            type="button"
                            onClick={() => setPlates((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows))}
                            disabled={plates.length <= 1}
                            aria-label="Remover placa/tubo"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/30 bg-white/25 text-muted-foreground transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : plate.resolved ? null : plateEnd !== null ? (
                          <span
                            className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium shadow-sm ${plateDue ? "border-emerald-300/60 bg-emerald-50/70 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-sky-300/50 bg-sky-50/60 text-sky-700 dark:border-sky-800/40 dark:bg-sky-900/20 dark:text-sky-300"}`}
                            title={plateDue ? "Meio pronto para leitura" : "Cronómetro individual deste meio"}
                          >
                            <Clock3 size={12} className={plateDue ? "" : "animate-pulse"} />
                            {plateDue ? "Pronto para leitura" : <span className="font-mono tabular-nums">{elapsedParts(plateRemaining)}</span>}
                          </span>
                        ) : incubationReady ? (
                          <span className="inline-flex h-7 items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300" title="Tempo de incubação concluído"><CheckCircle2 size={12} /> Pronto</span>
                        ) : (
                          <span className="inline-flex h-7 items-center gap-1 text-[10px] font-medium text-muted-foreground/70" title="Em incubação — não editável"><Lock size={12} /> Em incubação</span>
                        )}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <select disabled={!setupMode} value={plate.container} onChange={(event) => updatePlate(index, { container: event.target.value })} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-70`} aria-label="Recipiente">
                          {CULTURE_CONTAINERS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <select disabled={!setupMode} value={mediumSelectValue(plate)} onChange={(event) => updatePlate(index, applyMediumChoice(plate, event.target.value))} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-70`} aria-label="Meio de cultura">
                          <option value="">Meio de cultura…</option>
                          {CULTURE_MEDIA.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        {custom && (
                          <input disabled={!setupMode} value={plate.medium} onChange={(event) => updatePlate(index, { medium: event.target.value })} placeholder="Especifique o meio" className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-70`} />
                        )}
                        <select disabled={!setupMode} value={plate.consistency} onChange={(event) => updatePlate(index, { consistency: event.target.value })} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-70`} aria-label="Consistência do meio">
                          {CULTURE_CONSISTENCIES.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <select disabled={!setupMode} value={plate.atmosphere} onChange={(event) => updatePlate(index, { atmosphere: event.target.value })} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-70`} aria-label="Atmosfera">
                          {CULTURE_ATMOSPHERES.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1.5">
                          <input disabled={!setupMode} value={plate.temperature_c} onChange={(event) => updatePlate(index, { temperature_c: event.target.value })} placeholder="°C" className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-70`} />
                          <span className="text-xs text-muted-foreground">°C</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Horas de incubação deste meio (cronómetro individual)">
                          <input disabled={!setupMode} type="number" min="0" step="0.5" value={plate.incubation_hours} onChange={(event) => updatePlate(index, { incubation_hours: event.target.value })} placeholder="Horas" className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-70`} aria-label="Horas de incubação deste meio" />
                          <span className="text-xs text-muted-foreground">h</span>
                        </div>
                      </div>

                      {(plateDue || plate.resolved || (plate.outcome && plate.outcome !== "")) && (
                        <CulturePlateOutcome plate={plate} busy={saving} callbacks={plateCallbacks(plate)} />
                      )}
                    </div>
                  );
                })}
              </div>
              {setupMode ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={addPlate} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm"><Plus size={14} /> Placa / tubo</button>
                  <span className="text-[11px] text-muted-foreground">Cada meio incuba e é cronometrado individualmente pelas horas definidas acima.</span>
                  <button
                    disabled={saving}
                    onClick={() => submitAction("iniciar-incubacao", { plates, hours: Number(plates[0]?.incubation_hours) || 24 })}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-3 text-xs font-semibold text-white shadow-md shadow-teal-500/20 disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Clock3 size={14} />}
                    Iniciar incubação
                  </button>
                </div>
              ) : incubationReady ? (
                <p className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={12} /> Tempo de incubação concluído. Os meios prontos já podem ser lidos individualmente.</p>
              ) : (
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Lock size={12} /> Sementeira bloqueada durante a incubação. Cada meio abre para leitura quando o seu tempo termina.</p>
              )}
            </Card>

          </div>

          <aside className="space-y-2">
            <Card title="Resultados por meio" icon={Beaker} accent="bg-gradient-to-b from-emerald-500 to-teal-600" iconTone="from-emerald-600 to-teal-600">
              <div className="space-y-1.5">
                {resolvedPlates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum meio finalizado. Os resultados aparecem aqui à medida que cada incubação termina e é avaliada.</p>
                ) : resolvedPlates.map((plate) => {
                  const positive = plate.outcome === "positive";
                  const contaminated = plate.outcome === "contaminated";
                  return (
                    <div key={plate.id} className="rounded-lg border border-white/25 bg-white/20 px-2 py-1.5 text-xs backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-semibold text-teal-700 dark:text-teal-300">{plate.code}</span>
                        <span className={contaminated ? "text-rose-600 dark:text-rose-400" : positive ? "text-violet-600 dark:text-violet-400" : "text-emerald-600 dark:text-emerald-400"}>
                          {contaminated ? "Contaminada" : positive ? "Positiva" : "Negativa"}
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{plate.result_text || plate.medium}</p>
                      {positive && plate.gram?.result ? (
                        <p className="mt-0.5 text-[11px] text-violet-600 dark:text-violet-400">
                          {[plate.gram.result, plate.gram.morphology, plate.gram.arrangement].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
