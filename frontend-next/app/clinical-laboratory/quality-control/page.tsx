"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  Loader2,
  Save,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

const ENDPOINT = "/clinical_laboratory/quality_control/";
const PAGE_SIZE = 24;

type LabTest = {
  id: number;
  code: string;
  name: string;
  method?: string;
  unit?: string;
  reference_low?: string | null;
  reference_high?: string | null;
};

type LabTestField = {
  id: number;
  test: number;
  code?: string;
  name: string;
  unit?: string;
  reference_low?: string | null;
  reference_high?: string | null;
};

type QualityControl = {
  id: number;
  custom_id?: string | null;
  test: number;
  test_name?: string;
  test_code?: string;
  field_name?: string;
  control_type: string;
  result_mode: string;
  material_name?: string;
  material_lot?: string;
  material_level?: string;
  expected_result: string;
  observed_result: string;
  expected_min?: string | null;
  expected_max?: string | null;
  tolerance?: string | null;
  deviation?: string | null;
  unit?: string;
  equipment?: string;
  method?: string;
  sop_reference?: string;
  iso_clause?: string;
  decision: "APROVADO" | "REJEITADO" | "REVISAO" | "INCOMPLETO";
  decision_display?: string;
  status_display?: string;
  approved_for_use: boolean;
  corrective_action_required: boolean;
  run_at?: string;
};

type FormState = {
  test: string;
  test_field: string;
  control_type: string;
  result_mode: string;
  material_name: string;
  material_lot: string;
  material_level: string;
  manufacturer: string;
  expiry_date: string;
  method: string;
  equipment: string;
  sop_reference: string;
  iso_clause: string;
  acceptance_criteria: string;
  expected_result: string;
  observed_result: string;
  expected_min: string;
  expected_max: string;
  tolerance: string;
  unit: string;
  measurement_uncertainty: string;
  traceability_notes: string;
};

const initialForm: FormState = {
  test: "",
  test_field: "",
  control_type: "INTERNO",
  result_mode: "NUMERICO",
  material_name: "",
  material_lot: "",
  material_level: "NORMAL",
  manufacturer: "",
  expiry_date: "",
  method: "",
  equipment: "",
  sop_reference: "",
  iso_clause: "ISO 9001:2015 8.5.1/9.1",
  acceptance_criteria: "",
  expected_result: "",
  observed_result: "",
  expected_min: "",
  expected_max: "",
  tolerance: "",
  unit: "",
  measurement_uncertainty: "",
  traceability_notes: "",
};

const decisionClass: Record<QualityControl["decision"], string> = {
  APROVADO: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  REJEITADO: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
  REVISAO: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  INCOMPLETO: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/40 dark:bg-slate-900/30 dark:text-slate-300",
};

function decimalOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.replace(",", ".") : null;
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-medium text-foreground">{label}</span>
      {children}
      {error ? <span className="block text-[10px] text-red-600">{error}</span> : null}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-background/85 px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";

function FormSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative overflow-hidden rounded-lg border border-white/20 bg-white/40 px-3 py-2.5 pl-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] ${className}`}>
      <span className="absolute left-0 top-0 h-full w-1 bg-teal-500/80" />
      <div className="mb-2 flex items-center gap-1.5 border-b border-border/50 pb-1.5">
        <span className="text-[11px] font-semibold uppercase text-muted-foreground">{title}</span>
      </div>
      {children}
    </section>
  );
}

type StatCard = {
  label: string;
  value: number;
  icon: LucideIcon;
};

export default function LaboratoryQualityControlPage() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [fields, setFields] = useState<LabTestField[]>([]);
  const [records, setRecords] = useState<QualityControl[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTest = useMemo(
    () => tests.find((item) => String(item.id) === form.test),
    [tests, form.test],
  );

  const approved = records.filter((item) => item.decision === "APROVADO").length;
  const rejected = records.filter((item) => item.decision === "REJEITADO").length;
  const review = records.filter((item) => item.decision === "REVISAO").length;
  const stats: StatCard[] = [
    { label: "Registos", value: total, icon: ClipboardCheck },
    { label: "Aprovados", value: approved, icon: CheckCircle2 },
    { label: "Rejeitados", value: rejected, icon: XCircle },
    { label: "Revisão", value: review, icon: AlertTriangle },
  ];

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string> = {};
      if (search.trim()) query.search = search.trim();
      if (decision) query.decision = decision;
      const { items, meta } = await apiFetchList<QualityControl>(ENDPOINT, {
        page: 1,
        pageSize: PAGE_SIZE,
        query,
      });
      setRecords(items);
      setTotal(meta.total ?? items.length);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar controlos de qualidade.");
    } finally {
      setLoading(false);
    }
  }, [search, decision]);

  useEffect(() => {
    apiFetchList<LabTest>("/clinical_laboratory/test/", {
      page: 1,
      pageSize: 500,
      query: { active: true },
      clientCache: true,
      clientCacheTtlMs: 30000,
    }).then(({ items }) => setTests(items)).catch(() => setTests([]));
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    if (!form.test) {
      setFields([]);
      return;
    }
    apiFetchList<LabTestField>("/clinical_laboratory/test_field/", {
      page: 1,
      pageSize: 200,
      query: { test: form.test, active: true },
      clientCache: true,
      clientCacheTtlMs: 30000,
    }).then(({ items }) => setFields(items)).catch(() => setFields([]));
  }, [form.test]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleTestChange(value: string) {
    const test = tests.find((item) => String(item.id) === value);
    setForm((prev) => ({
      ...prev,
      test: value,
      test_field: "",
      method: test?.method || prev.method,
      unit: test?.unit || prev.unit,
      expected_min: test?.reference_low || prev.expected_min,
      expected_max: test?.reference_high || prev.expected_max,
    }));
  }

  function handleFieldChange(value: string) {
    const field = fields.find((item) => String(item.id) === value);
    setForm((prev) => ({
      ...prev,
      test_field: value,
      unit: field?.unit || prev.unit,
      expected_min: field?.reference_low || prev.expected_min,
      expected_max: field?.reference_high || prev.expected_max,
    }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.test) next.test = "Selecione o exame.";
    if (!form.expected_result.trim()) next.expected_result = "Informe o resultado esperado.";
    if (!form.observed_result.trim()) next.observed_result = "Informe o resultado obtido.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        test: Number(form.test),
        test_field: form.test_field ? Number(form.test_field) : null,
        expiry_date: form.expiry_date || null,
        expected_numeric: form.result_mode === "NUMERICO" ? decimalOrNull(form.expected_result) : null,
        observed_numeric: form.result_mode === "NUMERICO" ? decimalOrNull(form.observed_result) : null,
        expected_min: decimalOrNull(form.expected_min),
        expected_max: decimalOrNull(form.expected_max),
        tolerance: decimalOrNull(form.tolerance),
      };
      const saved = await apiFetch<QualityControl>(ENDPOINT, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setRecords((prev) => [saved, ...prev].slice(0, PAGE_SIZE));
      setTotal((value) => value + 1);
      setForm((prev) => ({
        ...initialForm,
        test: prev.test,
        method: prev.method,
        equipment: prev.equipment,
        sop_reference: prev.sop_reference,
        iso_clause: prev.iso_clause,
      }));
    } catch (err: any) {
      setError(err?.message || "Erro ao guardar controlo de qualidade.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="space-y-3">
        <section className="relative overflow-hidden rounded-xl border border-teal-200/60 bg-gradient-to-br from-teal-50/85 via-white/70 to-cyan-50/70 shadow-sm backdrop-blur-sm dark:border-teal-800/30 dark:from-teal-950/40 dark:via-slate-900/40 dark:to-cyan-950/20">
          <span className="absolute left-0 top-0 h-full w-1 bg-teal-500" />
          <div className="px-4 py-3 pl-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/20">
                  <ShieldCheck size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Laboratório Clínico / Analítico</p>
                  <h1 className="text-base font-bold text-foreground">Controlo de qualidade dos exames</h1>
                  <p className="text-[11px] text-muted-foreground">
                    Resultado esperado, resultado obtido e decisão automática de validade.
                  </p>
                </div>
              </div>
              <Link href="/clinical-laboratory" className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/40 bg-white/40 px-3 text-xs text-foreground transition hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.1]">
                <ArrowLeft size={12} /> Voltar
              </Link>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-lg border border-white/50 bg-white/45 px-3 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</span>
                    <Icon size={13} className="text-teal-600 dark:text-teal-300" />
                  </div>
                  <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{loading ? "…" : value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/30 pt-3 dark:border-white/10">
              <div className="relative min-w-[240px] flex-1">
                <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar exame, lote, equipamento..." className="w-full rounded-lg border border-white/50 bg-white/55 py-1.5 pl-7 pr-3 text-xs text-foreground outline-none backdrop-blur-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-white/10 dark:bg-white/[0.06]" />
              </div>
              <select value={decision} onChange={(event) => setDecision(event.target.value)} className="h-8 rounded-lg border border-white/50 bg-white/55 pl-2.5 pr-7 text-xs text-foreground outline-none backdrop-blur-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-white/10 dark:bg-white/[0.06]">
                <option value="">Todas as conclusões</option>
                <option value="APROVADO">Aprovado</option>
                <option value="REJEITADO">Rejeitado</option>
                <option value="REVISAO">Revisão</option>
                <option value="INCOMPLETO">Incompleto</option>
              </select>
              {loading ? <Loader2 size={14} className="animate-spin text-muted-foreground" /> : null}
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-[minmax(420px,0.9fr)_minmax(0,1.1fr)]">
          <form onSubmit={submit} className="space-y-2">
            <section className="rounded-xl border border-white/20 bg-white/30 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Nova execução de CQ</h2>
                  <p className="text-[11px] text-muted-foreground">O backend calcula automaticamente a conclusão.</p>
                </div>
                <button type="submit" disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-3 text-xs font-semibold text-white shadow-md shadow-teal-500/20 transition hover:from-teal-700 hover:to-cyan-700 disabled:opacity-60">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Registar
                </button>
              </div>
            </section>

            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <FormSection title="Identificação do exame">
                  <div className="grid gap-2 md:grid-cols-2">
                    <Field label="Exame" error={errors.test}>
                      <select value={form.test} onChange={(event) => handleTestChange(event.target.value)} className={inputCls}>
                        <option value="">Selecione...</option>
                        {tests.map((test) => (
                          <option key={test.id} value={test.id}>{test.code} - {test.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Analito/campo">
                      <select value={form.test_field} onChange={(event) => handleFieldChange(event.target.value)} className={inputCls}>
                        <option value="">Exame completo</option>
                        {fields.map((field) => (
                          <option key={field.id} value={field.id}>{field.code ? `${field.code} - ` : ""}{field.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Tipo">
                      <select value={form.control_type} onChange={(event) => update("control_type", event.target.value)} className={inputCls}>
                        <option value="INTERNO">Interno</option>
                        <option value="EXTERNO">Externo</option>
                        <option value="ENSAIO_PROFICIENCIA">Ensaio de proficiência</option>
                        <option value="CALIBRACAO">Calibração/verificação</option>
                      </select>
                    </Field>
                    <Field label="Modo">
                      <select value={form.result_mode} onChange={(event) => update("result_mode", event.target.value)} className={inputCls}>
                        <option value="NUMERICO">Numérico</option>
                        <option value="QUALITATIVO">Qualitativo</option>
                      </select>
                    </Field>
                  </div>
                </FormSection>

                <FormSection title="Resultado e critérios de aceitação">
                  <div className="grid gap-2 md:grid-cols-2">
                    <Field label="Resultado esperado" error={errors.expected_result}>
                      <input value={form.expected_result} onChange={(event) => update("expected_result", event.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Resultado obtido" error={errors.observed_result}>
                      <input value={form.observed_result} onChange={(event) => update("observed_result", event.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Mínimo aceitável">
                      <input value={form.expected_min} onChange={(event) => update("expected_min", event.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Máximo aceitável">
                      <input value={form.expected_max} onChange={(event) => update("expected_max", event.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Tolerância absoluta">
                      <input value={form.tolerance} onChange={(event) => update("tolerance", event.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Unidade">
                      <input value={form.unit} onChange={(event) => update("unit", event.target.value)} className={inputCls} />
                    </Field>
                  </div>
                </FormSection>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <FormSection title="Material de controlo">
                  <div className="grid gap-2 md:grid-cols-2">
                    <Field label="Material de controlo">
                      <input value={form.material_name} onChange={(event) => update("material_name", event.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Lote">
                      <input value={form.material_lot} onChange={(event) => update("material_lot", event.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Nível">
                      <select value={form.material_level} onChange={(event) => update("material_level", event.target.value)} className={inputCls}>
                        <option value="BAIXO">Baixo</option>
                        <option value="NORMAL">Normal</option>
                        <option value="ALTO">Alto</option>
                        <option value="POSITIVO">Positivo</option>
                        <option value="NEGATIVO">Negativo</option>
                        <option value="MULTINIVEL">Multinível</option>
                      </select>
                    </Field>
                    <Field label="Validade do material">
                      <input type="date" value={form.expiry_date} onChange={(event) => update("expiry_date", event.target.value)} className={inputCls} />
                    </Field>
                  </div>
                </FormSection>

                <FormSection title="Método, equipamento e norma">
                  <div className="grid gap-2 md:grid-cols-2">
                    <Field label="Método">
                      <input value={form.method} onChange={(event) => update("method", event.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Equipamento">
                      <input value={form.equipment} onChange={(event) => update("equipment", event.target.value)} className={inputCls} />
                    </Field>
                    <Field label="POP/Procedimento">
                      <input value={form.sop_reference} onChange={(event) => update("sop_reference", event.target.value)} className={inputCls} />
                    </Field>
                    <Field label="ISO/SGQ">
                      <input value={form.iso_clause} onChange={(event) => update("iso_clause", event.target.value)} className={inputCls} />
                    </Field>
                  </div>
                </FormSection>
              </div>

              <FormSection title="Evidências e rastreabilidade">
                <div className="grid gap-2 md:grid-cols-2">
                  <Field label="Critério de aceitação">
                    <textarea value={form.acceptance_criteria} onChange={(event) => update("acceptance_criteria", event.target.value)} rows={3} className={`${inputCls} resize-y`} />
                  </Field>
                  <Field label="Rastreabilidade/evidências">
                    <textarea value={form.traceability_notes} onChange={(event) => update("traceability_notes", event.target.value)} rows={3} className={`${inputCls} resize-y`} />
                  </Field>
                </div>
              </FormSection>

              {selectedTest ? (
                <div className="rounded-lg border border-teal-200/60 bg-teal-50/60 px-3 py-2 text-[11px] text-teal-800 dark:border-teal-800/40 dark:bg-teal-900/20 dark:text-teal-200">
                  {selectedTest.code} - {selectedTest.name} · método {form.method || "—"} · unidade {form.unit || "—"}
                </div>
              ) : null}
            </div>
          </form>

          <section className="space-y-3">
            <div className="rounded-xl border border-white/20 bg-white/30 p-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
              <h2 className="text-sm font-bold text-foreground">Registos de controlo</h2>
              <p className="text-[11px] text-muted-foreground">Filtrados pelos controles do cabeçalho.</p>
            </div>

            <div className="grid gap-2">
              {records.map((record) => (
                <article key={record.id} className="rounded-xl border border-white/20 bg-white/35 p-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono text-muted-foreground">{record.custom_id || `#${record.id}`}</p>
                      <h3 className="text-sm font-semibold text-foreground">{record.test_code ? `${record.test_code} - ` : ""}{record.test_name || "Exame"}</h3>
                      <p className="text-[11px] text-muted-foreground">{record.field_name || "Exame completo"} · {fmtDate(record.run_at)}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${decisionClass[record.decision] || decisionClass.INCOMPLETO}`}>
                      {record.decision_display || record.decision}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-3">
                    <div className="rounded-lg bg-background/60 px-2 py-1.5">
                      <span className="block text-muted-foreground">Esperado</span>
                      <strong className="text-foreground">{record.expected_result}</strong>
                    </div>
                    <div className="rounded-lg bg-background/60 px-2 py-1.5">
                      <span className="block text-muted-foreground">Obtido</span>
                      <strong className="text-foreground">{record.observed_result}</strong>
                    </div>
                    <div className="rounded-lg bg-background/60 px-2 py-1.5">
                      <span className="block text-muted-foreground">Uso do teste</span>
                      <strong className={record.approved_for_use ? "text-emerald-600" : "text-red-600"}>
                        {record.approved_for_use ? "Pode ser usado" : "Não usar / rever"}
                      </strong>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                    {record.material_lot ? <span>Lote {record.material_lot}</span> : null}
                    {record.equipment ? <span>Equip. {record.equipment}</span> : null}
                    {record.deviation ? <span>Desvio {record.deviation}</span> : null}
                    {record.corrective_action_required ? <span className="font-semibold text-red-600">CAPA requerida</span> : null}
                  </div>
                </article>
              ))}

              {!loading && records.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center">
                  <FlaskConical size={28} className="mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nenhum controlo registado.</p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
