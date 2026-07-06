"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, GaugeCircle, Loader2, Save, Target, TrendingUp } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";
import {
  Card,
  Field,
  RelationSelect,
  STATUS_BAR,
  STATUS_CHOICES,
  STATUS_COLOR,
  T_SECTOR,
  indicatorStatusLabel,
  inputCls,
} from "../_components";

const EDIT_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

export default function NewQualityIndicatorPage() {
  useAuthGuard();
  const router = useRouter();
  const [name, setName] = useState("");
  const [sector, setSector] = useState<number | null>(null);
  const [formula, setFormula] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [period, setPeriod] = useState("");
  const [status, setStatus] = useState("NAO_MEDIDO");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentStatus = STATUS_CHOICES.find((s) => s.value === status);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome obrigatório.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const created = await apiFetch<{ id: number }>("/clinical_laboratory/quality_indicator/", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          sector,
          formula: formula.trim(),
          target_value: targetValue || null,
          current_value: currentValue || null,
          period: period.trim(),
          status,
        }),
      });
      router.push(`/clinical-laboratory/quality-management/indicators/${created.id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao criar indicador.");
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="absolute -bottom-6 left-8 h-20 w-20 rounded-full bg-teal-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${STATUS_BAR[status] ?? "bg-slate-300"}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/30">
              <GaugeCircle size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Gestão da qualidade</span><span>/</span><span>Indicadores</span><span>/</span>
                <span className="font-medium text-foreground">Novo</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">{name.trim() || "Novo indicador"}</h1>
              {currentStatus && (
                <span className={`mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[status]}`}>
                  {indicatorStatusLabel(status, currentValue, targetValue)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Criar indicador
              </button>
            </div>
          </div>
        </div>

        {saveError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{saveError}</div>}

        <div className="grid gap-2 lg:grid-cols-2">
          <Card icon={GaugeCircle} title="Identificação" accent="bg-emerald-500">
            <Field label="Nome do indicador" required error={errors.name}>
              <input value={name} onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, name: "" })); }} className={`${inputCls} ${errors.name ? "border-red-300 focus:border-red-400" : ""}`} />
            </Field>
            <Field label="Sector">
              <RelationSelect value={sector} onChange={(v) => setSector(v)} target={T_SECTOR} placeholder="Pesquisar sector..." />
            </Field>
            <Field label="Período">
              <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Ex: Mensal, Trimestral..." className={inputCls} />
            </Field>
          </Card>

          <Card icon={Target} title="Medição" accent="bg-teal-500">
            <Field label="Valor atual">
              <input type="number" step="0.01" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Meta">
              <input type="number" step="0.01" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className={inputCls} />
            </Field>
          </Card>

          <div className="lg:col-span-2">
            <Card icon={FileText} title="Fórmula" accent="bg-sky-500">
              <Field label="Fórmula de cálculo">
                <textarea value={formula} onChange={(e) => setFormula(e.target.value)} rows={4} placeholder="Ex: Numerador / denominador x 100" className={`${inputCls} resize-y`} />
              </Field>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card icon={TrendingUp} title="Estado — clique para alterar">
              <div className="grid gap-1.5 sm:grid-cols-4">
                {STATUS_CHOICES.map(({ value, label }) => {
                  const active = status === value;
                  const visibleLabel = value === "FORA_META" ? indicatorStatusLabel(value, currentValue, targetValue) : label;
                  return (
                    <button key={value} type="button" onClick={() => setStatus(value)}
                      className={`relative overflow-hidden rounded-lg border px-3 py-2.5 text-left text-[11px] transition focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${active ? STATUS_COLOR[value] + " ring-1 ring-current/30" : "border-border bg-background hover:bg-muted"}`}>
                      <span className={`absolute inset-y-0 left-0 w-0.5 ${STATUS_BAR[value]}`} />
                      <span className={`block pl-1.5 font-semibold ${active ? "" : "text-foreground"}`}>{visibleLabel}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </form>
    </AppLayout>
  );
}
