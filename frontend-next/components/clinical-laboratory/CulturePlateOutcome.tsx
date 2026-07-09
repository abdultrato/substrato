"use client";

// Fluxo de leitura de um meio (placa/tubo) quando a sua incubação termina.
// Três desfechos: positiva → testes das colónias (macroscópico + Gram +
// provas bioquímicas); negativa → reincubar ou terminar; contaminada →
// devolver à enfermagem para nova colheita.

import { useState } from "react";
import {
  Ban,
  CheckCircle2,
  FlaskConical,
  Microscope,
  Plus,
  Save,
  TimerReset,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  BIOCHEM_CATALOG,
  biochemDef,
  makeBiochemEntry,
  type BiochemEntry,
} from "@/lib/cultureBiochemistry";
import type { CulturePlate as Plate } from "@/lib/culturePlates";

const GRAM_RESULT_OPTIONS = ["Gram positivos", "Gram negativos", "Gram variáveis"];
const GRAM_MORPHOLOGY_OPTIONS = ["Cocos", "Bacilos", "Cocobacilos", "Víbrios", "Leveduras"];
const GRAM_ARRANGEMENT_OPTIONS = ["Em cadeia", "Em cachos", "Em corda", "Em pares", "Isolados"];

const inputClass = "h-8 w-full rounded-lg border border-white/30 bg-white/35 px-2.5 text-xs text-foreground shadow-sm outline-none backdrop-blur-sm placeholder:text-muted-foreground focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:border-white/10 dark:bg-white/[0.06]";
const textareaClass = "min-h-16 w-full rounded-lg border border-white/30 bg-white/35 px-2.5 py-2 text-xs text-foreground shadow-sm outline-none backdrop-blur-sm placeholder:text-muted-foreground focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:border-white/10 dark:bg-white/[0.06]";

export type PlateOutcomeCallbacks = {
  onEvaluate: (outcome: "positive" | "negative" | "contaminated", macroscopic: string) => void;
  onReincubate: (hours: number) => void;
  onSaveColony: (data: { macroscopic: string; gram: Plate["gram"]; biochemical: BiochemEntry[]; resolved?: boolean }) => void;
  onFinalizeNegative: () => void;
  onReopen: () => void;       // reabre para edição mantendo o desfecho (positiva concluída → editar testes)
  onResetOutcome: () => void; // limpa o desfecho e volta à escolha positiva/negativa/contaminação
};

export function CulturePlateOutcome({
  plate,
  busy,
  callbacks,
}: {
  plate: Plate;
  busy: boolean;
  callbacks: PlateOutcomeCallbacks;
}) {
  const [macroscopic, setMacroscopic] = useState(plate.macroscopic || "");
  const [reincubHours, setReincubHours] = useState("24");
  const [gram, setGram] = useState({
    result: plate.gram?.result || "",
    morphology: plate.gram?.morphology || "",
    arrangement: plate.gram?.arrangement || "",
    notes: plate.gram?.notes || "",
  });
  const [biochemical, setBiochemical] = useState<BiochemEntry[]>(plate.biochemical || []);
  const [addKey, setAddKey] = useState("");

  const outcome = plate.outcome || "";
  const mediumLabel = plate.medium || "meio";

  // ── Meio já resolvido: mostra o resultado consolidado ──
  if (plate.resolved) {
    const positive = outcome === "positive";
    const contaminated = outcome === "contaminated";
    return (
      <div className={`mt-2 rounded-lg border px-2.5 py-2 text-xs backdrop-blur-sm ${
        contaminated
          ? "border-rose-300/50 bg-rose-50/60 text-rose-800 dark:border-rose-800/40 dark:bg-rose-900/15 dark:text-rose-300"
          : positive
            ? "border-violet-300/50 bg-violet-50/60 text-violet-800 dark:border-violet-800/40 dark:bg-violet-900/15 dark:text-violet-300"
            : "border-emerald-300/50 bg-emerald-50/60 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/15 dark:text-emerald-300"
      }`}>
        <div className="flex items-center gap-1.5 font-semibold">
          {contaminated ? <Ban size={13} /> : positive ? <Microscope size={13} /> : <CheckCircle2 size={13} />}
          {plate.result_text || (positive ? `Cultura positiva em ${mediumLabel}` : `Cultura negativa em ${mediumLabel}`)}
        </div>
        {contaminated && <p className="mt-1 text-[11px]">Amostra devolvida à enfermagem para nova colheita.</p>}
        {positive && (plate.biochemical?.length || plate.gram?.result) ? (
          <button type="button" onClick={callbacks.onReopen} className="mt-1.5 text-[11px] font-medium underline decoration-dotted hover:no-underline">
            Rever/editar testes das colónias
          </button>
        ) : null}
      </div>
    );
  }

  // ── Sem desfecho ainda: escolher entre positiva / negativa / contaminação ──
  if (outcome === "") {
    return (
      <div className="mt-2 space-y-2 rounded-lg border border-sky-300/40 bg-sky-50/40 p-2.5 backdrop-blur-sm dark:border-sky-800/30 dark:bg-sky-900/10">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Leitura deste meio</p>
        <textarea value={macroscopic} onChange={(e) => setMacroscopic(e.target.value)} placeholder="Exame macroscópico das colónias: nº, tamanho, cor, forma, hemólise, pigmento, odor — ou ausência de crescimento." className={textareaClass} />
        <div className="flex flex-wrap gap-1.5">
          <button type="button" disabled={busy} onClick={() => callbacks.onEvaluate("positive", macroscopic)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/20 disabled:opacity-60">
            <Microscope size={14} /> Cultura positiva
          </button>
          <button type="button" disabled={busy} onClick={() => callbacks.onEvaluate("negative", macroscopic)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 disabled:opacity-60">
            <CheckCircle2 size={14} /> Cultura negativa
          </button>
          <button type="button" disabled={busy} onClick={() => callbacks.onEvaluate("contaminated", macroscopic)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 px-3 text-xs font-semibold text-white shadow-md shadow-rose-500/20 disabled:opacity-60">
            <Ban size={14} /> Contaminação
          </button>
        </div>
      </div>
    );
  }

  // ── Negativa: reincubar OU terminar como negativa ──
  if (outcome === "negative") {
    return (
      <div className="mt-2 space-y-2 rounded-lg border border-emerald-300/40 bg-emerald-50/40 p-2.5 backdrop-blur-sm dark:border-emerald-800/30 dark:bg-emerald-900/10">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Sem crescimento neste meio — reincubar ou terminar?</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1" title="Horas de reincubação deste meio">
            <input type="number" min="0" step="0.5" value={reincubHours} onChange={(e) => setReincubHours(e.target.value)} placeholder="Horas" className={`${inputClass} w-24`} />
            <span className="text-xs text-muted-foreground">h</span>
          </div>
          <button type="button" disabled={busy} onClick={() => callbacks.onReincubate(Number(reincubHours) || 24)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-3 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm disabled:opacity-60">
            <TimerReset size={14} /> Reincubar
          </button>
          <button type="button" disabled={busy} onClick={callbacks.onFinalizeNegative} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 disabled:opacity-60">
            <CheckCircle2 size={14} /> Terminar negativa em {mediumLabel}
          </button>
          <button type="button" disabled={busy} onClick={callbacks.onResetOutcome} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-60">
            <XCircle size={13} /> Voltar
          </button>
        </div>
      </div>
    );
  }

  // ── Positiva: testes das colónias (Gram + provas bioquímicas) ──
  const availableToAdd = BIOCHEM_CATALOG.filter((t) => !biochemical.some((b) => b.key === t.key));
  return (
    <div className="mt-2 space-y-2.5 rounded-lg border border-violet-300/40 bg-violet-50/40 p-2.5 backdrop-blur-sm dark:border-violet-800/30 dark:bg-violet-900/10">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
        <Microscope size={13} /> Testes das colónias — {mediumLabel}
      </p>

      <textarea value={macroscopic} onChange={(e) => setMacroscopic(e.target.value)} placeholder="Exame macroscópico das colónias: nº, tamanho, cor, forma, bordo, elevação, hemólise, pigmento, odor." className={textareaClass} />

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Coloração de Gram</p>
        <div className="grid gap-1.5 md:grid-cols-4">
          <select value={gram.result} onChange={(e) => setGram((g) => ({ ...g, result: e.target.value }))} className={inputClass} aria-label="Resultado do Gram">
            <option value="">Resultado do Gram…</option>
            {GRAM_RESULT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={gram.morphology} onChange={(e) => setGram((g) => ({ ...g, morphology: e.target.value }))} className={inputClass} aria-label="Morfologia">
            <option value="">Morfologia…</option>
            {GRAM_MORPHOLOGY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={gram.arrangement} onChange={(e) => setGram((g) => ({ ...g, arrangement: e.target.value }))} className={inputClass} aria-label="Arranjo">
            <option value="">Arranjo…</option>
            {GRAM_ARRANGEMENT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <input value={gram.notes} onChange={(e) => setGram((g) => ({ ...g, notes: e.target.value }))} placeholder="Notas do Gram" className={inputClass} />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Provas bioquímicas de identificação</p>
          <div className="flex items-center gap-1.5">
            <select value={addKey} onChange={(e) => setAddKey(e.target.value)} className={`${inputClass} w-52`} aria-label="Escolher prova bioquímica">
              <option value="">Adicionar prova…</option>
              {availableToAdd.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
            <button type="button" disabled={!addKey} onClick={() => {
              const def = biochemDef(addKey);
              if (!def) return;
              setBiochemical((rows) => [...rows, makeBiochemEntry(def)]);
              setAddKey("");
            }} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm disabled:opacity-50"><Plus size={14} /></button>
          </div>
        </div>

        {biochemical.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Nenhuma prova adicionada. Escolha acima (Kligler, LIA, oxidase, catalase, coagulase, fenilalanina, citrato, urease, indol, motilidade, VM, VP…).</p>
        ) : biochemical.map((entry, index) => {
          const def = biochemDef(entry.key);
          if (!def) return null;
          return (
            <div key={`${entry.key}-${index}`} className="rounded-lg border border-white/25 bg-white/25 p-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-xs font-semibold text-foreground"><FlaskConical size={12} className="text-violet-500" /> {def.name}</span>
                <button type="button" onClick={() => setBiochemical((rows) => rows.filter((_, i) => i !== index))} className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/30 bg-white/25 text-muted-foreground hover:text-red-600" aria-label={`Remover ${def.name}`}><Trash2 size={12} /></button>
              </div>
              {def.hint && <p className="mb-1.5 text-[10px] text-muted-foreground">{def.hint}</p>}
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {def.fields.map((field) => (
                  <label key={field.key} className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground">{field.label}</span>
                    <select
                      value={entry.values[field.key] || ""}
                      onChange={(e) => setBiochemical((rows) => rows.map((row, i) => i === index ? { ...row, values: { ...row.values, [field.key]: e.target.value } } : row))}
                      className={inputClass}
                    >
                      <option value="">—</option>
                      {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button type="button" disabled={busy} onClick={() => callbacks.onSaveColony({ macroscopic, gram, biochemical })} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-3 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm disabled:opacity-60">
          <Save size={14} /> Guardar testes
        </button>
        <button type="button" disabled={busy} onClick={() => callbacks.onSaveColony({ macroscopic, gram, biochemical, resolved: true })} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/20 disabled:opacity-60">
          <CheckCircle2 size={14} /> Concluir positiva em {mediumLabel}
        </button>
        <button type="button" disabled={busy} onClick={callbacks.onResetOutcome} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-60">
          <XCircle size={13} /> Mudar desfecho
        </button>
      </div>
    </div>
  );
}
