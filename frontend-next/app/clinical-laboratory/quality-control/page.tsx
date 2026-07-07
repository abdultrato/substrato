"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FlaskConical,
  Microscope,
  Loader2,
  Ruler,
  Save,
  Search,
  ShieldCheck,
  TestTube2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import SearchableSelect, { type SearchableOption } from "@/components/ui/SearchableSelect";
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

type QualityControlGroup = {
  key: string;
  records: QualityControl[];
  primary: QualityControl;
  total: number;
  approved: number;
  rejected: number;
  review: number;
  incomplete: number;
  approvedForUse: boolean;
  correctiveActionRequired: boolean;
  maxDeviation: number | null;
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

function parseDecimal(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

// Valores de referência do backend vêm com 4 casas ("12.0000"); apresenta com 1.
function fmtRef(value?: string | null): string {
  if (!value) return "";
  const num = parseDecimal(String(value));
  return num === null ? String(value) : num.toFixed(1);
}

// Espelha LaboratoryQualityControl.evaluate() do backend para pré-visualizar a conclusão.
function evaluateQc(
  mode: string,
  expectedRaw: string,
  observedRaw: string,
  minRaw: string,
  maxRaw: string,
  toleranceRaw: string,
): QualityControl["decision"] {
  if (mode === "NUMERICO") {
    const expected = parseDecimal(expectedRaw);
    const observed = parseDecimal(observedRaw);
    const min = parseDecimal(minRaw);
    const max = parseDecimal(maxRaw);
    const tolerance = parseDecimal(toleranceRaw);
    if (observed === null) return "INCOMPLETO";
    if (min !== null && observed < min) return "REJEITADO";
    if (max !== null && observed > max) return "REJEITADO";
    if (tolerance !== null && expected !== null && Math.abs(observed - expected) > tolerance) return "REJEITADO";
    if (min === null && max === null && tolerance === null && expected === null) return "REVISAO";
    return "APROVADO";
  }
  if (!expectedRaw.trim() || !observedRaw.trim()) return "INCOMPLETO";
  return expectedRaw.trim().toLowerCase() === observedRaw.trim().toLowerCase() ? "APROVADO" : "REJEITADO";
}

function previewDecision(form: FormState): QualityControl["decision"] {
  return evaluateQc(form.result_mode, form.expected_result, form.observed_result, form.expected_min, form.expected_max, form.tolerance);
}

type AnalyteRow = {
  expected: string;
  observed: string;
  min: string;
  max: string;
  tolerance: string;
  unit: string;
};

function buildAnalyteRows(fields: LabTestField[]): Record<number, AnalyteRow> {
  return Object.fromEntries(
    fields.map((field) => [
      field.id,
      {
        expected: "",
        observed: "",
        min: fmtRef(field.reference_low),
        max: fmtRef(field.reference_high),
        tolerance: "",
        unit: field.unit || "",
      },
    ]),
  );
}

const decisionLabel: Record<QualityControl["decision"], string> = {
  APROVADO: "Aprovado para uso",
  REJEITADO: "Rejeitado",
  REVISAO: "Requer revisão",
  INCOMPLETO: "Incompleto",
};

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

function executionMinute(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  date.setSeconds(0, 0);
  return date.toISOString();
}

function qcRunGroupKey(record: QualityControl) {
  return [
    record.test,
    executionMinute(record.run_at),
    record.material_lot || "",
    record.material_name || "",
    record.control_type || "",
    record.result_mode || "",
    record.equipment || "",
    record.method || "",
  ].join("|");
}

function numericDeviation(value?: string | null) {
  if (!value) return null;
  const parsed = parseDecimal(String(value));
  return parsed === null ? null : parsed;
}

function isHemogramRecord(record: QualityControl) {
  return /hemog|hemograma/i.test(`${record.test_code || ""} ${record.test_name || ""}`);
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

const rowInputCls =
  "w-full rounded-md border border-border bg-background/85 px-1.5 py-1 text-[11px] text-foreground outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20";

const decisionDotClass: Record<QualityControl["decision"], string> = {
  APROVADO: "bg-emerald-500",
  REJEITADO: "bg-red-500",
  REVISAO: "bg-amber-500",
  INCOMPLETO: "bg-slate-400",
};

function FormSection({
  title,
  icon: Icon,
  accentClass = "bg-teal-500/80",
  children,
  className = "",
}: {
  title: string;
  icon: LucideIcon;
  accentClass?: string;
  children: React.ReactNode;
  className?: string;
}) {
  // O backdrop-blur cria um stacking context por secção, por isso os dropdowns
  // dos SearchableSelect ficariam atrás dos cartões seguintes no DOM;
  // focus-within eleva a secção com o dropdown aberto acima das irmãs.
  return (
    <section className={`relative overflow-visible rounded-lg border border-white/20 bg-white/40 px-2.5 py-2 pl-3.5 shadow-sm backdrop-blur-sm focus-within:z-30 dark:border-white/10 dark:bg-white/[0.04] ${className}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accentClass}`} />
      <div className="mb-2 flex items-center gap-1.5 border-b border-border/50 pb-1.5">
        <Icon size={13} className="text-foreground/70" />
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
  const [catalogRecords, setCatalogRecords] = useState<QualityControl[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [decision, setDecision] = useState("");
  const [controlType, setControlType] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [analyteRows, setAnalyteRows] = useState<Record<number, AnalyteRow>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const selectedTest = useMemo(
    () => tests.find((item) => String(item.id) === form.test),
    [tests, form.test],
  );

  const predictedDecision = useMemo(() => previewDecision(form), [form]);

  // "Exame completo" num exame com analitos: uma linha de resultado por analito.
  const batchMode = Boolean(form.test) && !form.test_field && fields.length > 0;

  const testOptions = useMemo<SearchableOption[]>(
    () =>
      tests.map((test) => ({
        value: String(test.id),
        label: `${test.code} - ${test.name}`,
        hint: test.method || test.unit || undefined,
      })),
    [tests],
  );

  const fieldOptions = useMemo<SearchableOption[]>(
    () => [
      { value: "", label: "Exame completo" },
      ...fields.map((field) => ({
        value: String(field.id),
        label: `${field.code ? `${field.code} - ` : ""}${field.name}`,
        hint: field.unit || undefined,
      })),
    ],
    [fields],
  );

  const groupedRecords = useMemo<QualityControlGroup[]>(() => {
    const orderedGroups: QualityControlGroup[] = [];
    const groups = new Map<string, QualityControlGroup>();

    records.forEach((record) => {
      // Hemogramas têm muitos analitos; agrupa por execução para evitar uma
      // lista longa de linhas quase idênticas.
      const key = isHemogramRecord(record) ? qcRunGroupKey(record) : `single-${record.id}`;
      const deviation = numericDeviation(record.deviation);
      const existing = groups.get(key);

      if (!existing) {
        const group: QualityControlGroup = {
          key,
          records: [record],
          primary: record,
          total: 1,
          approved: record.decision === "APROVADO" ? 1 : 0,
          rejected: record.decision === "REJEITADO" ? 1 : 0,
          review: record.decision === "REVISAO" ? 1 : 0,
          incomplete: record.decision === "INCOMPLETO" ? 1 : 0,
          approvedForUse: record.approved_for_use,
          correctiveActionRequired: record.corrective_action_required,
          maxDeviation: deviation,
        };
        groups.set(key, group);
        orderedGroups.push(group);
        return;
      }

      existing.records.push(record);
      existing.total += 1;
      existing.approved += record.decision === "APROVADO" ? 1 : 0;
      existing.rejected += record.decision === "REJEITADO" ? 1 : 0;
      existing.review += record.decision === "REVISAO" ? 1 : 0;
      existing.incomplete += record.decision === "INCOMPLETO" ? 1 : 0;
      existing.approvedForUse = existing.approvedForUse && record.approved_for_use;
      existing.correctiveActionRequired = existing.correctiveActionRequired || record.corrective_action_required;
      if (deviation !== null) existing.maxDeviation = existing.maxDeviation === null ? deviation : Math.max(existing.maxDeviation, deviation);
    });

    return orderedGroups;
  }, [records]);

  const materialNameOptions = useMemo<SearchableOption[]>(() => {
    const seen = new Set<string>();
    return catalogRecords
      .map((record) => record.material_name?.trim())
      .filter((value): value is string => Boolean(value))
      .filter((value) => {
        const key = value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((value) => ({ value, label: value }));
  }, [catalogRecords]);

  const materialLotOptions = useMemo<SearchableOption[]>(() => {
    const seen = new Set<string>();
    return catalogRecords
      .filter((record) => !form.material_name || record.material_name === form.material_name)
      .map((record) => record.material_lot?.trim())
      .filter((value): value is string => Boolean(value))
      .filter((value) => {
        const key = value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((value) => ({ value, label: value }));
  }, [catalogRecords, form.material_name]);

  const methodOptions = useMemo<SearchableOption[]>(() => {
    const values = new Set<string>();
    if (selectedTest?.method?.trim()) values.add(selectedTest.method.trim());
    catalogRecords.forEach((record) => {
      if (record.method?.trim()) values.add(record.method.trim());
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value }));
  }, [catalogRecords, selectedTest]);

  const equipmentOptions = useMemo<SearchableOption[]>(() => {
    const values = new Set<string>();
    catalogRecords.forEach((record) => {
      if (record.equipment?.trim()) values.add(record.equipment.trim());
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value }));
  }, [catalogRecords]);

  // Contagens sobre o conjunto global (até 500 mais recentes), não só a página visível.
  const approved = catalogRecords.filter((item) => item.decision === "APROVADO").length;
  const rejected = catalogRecords.filter((item) => item.decision === "REJEITADO").length;
  const review = catalogRecords.filter((item) => item.decision === "REVISAO").length;
  const stats: StatCard[] = [
    { label: "Registos", value: total, icon: ClipboardCheck },
    { label: "Aprovados", value: approved, icon: CheckCircle2 },
    { label: "Rejeitados", value: rejected, icon: XCircle },
    { label: "Revisão", value: review, icon: AlertTriangle },
  ];

  const loadRecords = useCallback(async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const query: Record<string, string> = {};
      if (debouncedSearch.trim()) query.search = debouncedSearch.trim();
      if (decision) query.decision = decision;
      if (controlType) query.control_type = controlType;
      const { items, meta } = await apiFetchList<QualityControl>(ENDPOINT, {
        page: pageNum,
        pageSize: PAGE_SIZE,
        query,
      });
      setRecords((prev) => (append ? [...prev, ...items] : items));
      setPage(pageNum);
      setTotal(meta.total ?? items.length);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar controlos de qualidade.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, decision, controlType]);

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
    apiFetchList<QualityControl>(ENDPOINT, {
      page: 1,
      pageSize: 500,
      clientCache: true,
      clientCacheTtlMs: 30000,
    }).then(({ items }) => setCatalogRecords(items)).catch(() => setCatalogRecords([]));
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

  useEffect(() => {
    setAnalyteRows(buildAnalyteRows(fields));
  }, [fields]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateRow(fieldId: number, key: keyof AnalyteRow, value: string) {
    setAnalyteRows((prev) => ({ ...prev, [fieldId]: { ...prev[fieldId], [key]: value } }));
  }

  function handleTestChange(value: string) {
    const test = tests.find((item) => String(item.id) === value);
    setForm((prev) => ({
      ...prev,
      test: value,
      test_field: "",
      method: test?.method || prev.method,
      unit: test?.unit || prev.unit,
      expected_min: fmtRef(test?.reference_low) || prev.expected_min,
      expected_max: fmtRef(test?.reference_high) || prev.expected_max,
    }));
  }

  function handleFieldChange(value: string) {
    const field = fields.find((item) => String(item.id) === value);
    setForm((prev) => ({
      ...prev,
      test_field: value,
      unit: field?.unit || prev.unit,
      expected_min: fmtRef(field?.reference_low) || prev.expected_min,
      expected_max: fmtRef(field?.reference_high) || prev.expected_max,
    }));
  }

  function handleMaterialNameChange(value: string) {
    setForm((prev) => ({
      ...prev,
      material_name: value,
      material_lot:
        value && prev.material_name && prev.material_name !== value
          ? ""
          : prev.material_lot,
    }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.test) next.test = "Selecione o exame.";
    if (!batchMode) {
      if (!form.expected_result.trim()) next.expected_result = "Informe o resultado esperado.";
      if (!form.observed_result.trim()) next.observed_result = "Informe o resultado obtido.";
      if (form.result_mode === "NUMERICO") {
        if (form.expected_result.trim() && parseDecimal(form.expected_result) === null)
          next.expected_result = "Valor numérico inválido.";
        if (form.observed_result.trim() && parseDecimal(form.observed_result) === null)
          next.observed_result = "Valor numérico inválido.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateBatchRows(): { field: LabTestField; row: AnalyteRow }[] | null {
    const filled = fields
      .map((field) => ({ field, row: analyteRows[field.id] }))
      .filter(({ row }) => row && (row.expected.trim() || row.observed.trim()));
    if (filled.length === 0) {
      setError("Preencha resultado esperado e obtido em pelo menos um analito.");
      return null;
    }
    for (const { field, row } of filled) {
      if (!row.expected.trim() || !row.observed.trim()) {
        setError(`Analito "${field.name}": preencha resultado esperado e obtido.`);
        return null;
      }
      if (form.result_mode === "NUMERICO" && (parseDecimal(row.expected) === null || parseDecimal(row.observed) === null)) {
        setError(`Analito "${field.name}": valor numérico inválido.`);
        return null;
      }
    }
    return filled;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setError(null);
    setSuccess(null);
    if (batchMode) {
      const filled = validateBatchRows();
      if (!filled) return;
      setSaving(true);
      const saved: QualityControl[] = [];
      try {
        for (const { field, row } of filled) {
          const payload = {
            ...form,
            test: Number(form.test),
            test_field: field.id,
            expiry_date: form.expiry_date || null,
            expected_result: row.expected,
            observed_result: row.observed,
            expected_numeric: form.result_mode === "NUMERICO" ? decimalOrNull(row.expected) : null,
            observed_numeric: form.result_mode === "NUMERICO" ? decimalOrNull(row.observed) : null,
            expected_min: decimalOrNull(row.min),
            expected_max: decimalOrNull(row.max),
            tolerance: decimalOrNull(row.tolerance),
            unit: row.unit,
          };
          saved.push(await apiFetch<QualityControl>(ENDPOINT, { method: "POST", body: JSON.stringify(payload) }));
        }
        setRecords((prev) => [...saved.slice().reverse(), ...prev]);
        setCatalogRecords((prev) => [...saved.slice().reverse(), ...prev].slice(0, 500));
        setTotal((value) => value + saved.length);
        const ok = saved.filter((item) => item.decision === "APROVADO").length;
        const bad = saved.filter((item) => item.decision === "REJEITADO").length;
        setSuccess(`Registados ${saved.length} controlos (${ok} aprovados, ${bad} rejeitados).`);
        setAnalyteRows(buildAnalyteRows(fields));
      } catch (err: any) {
        if (saved.length > 0) {
          setRecords((prev) => [...saved.slice().reverse(), ...prev]);
          setCatalogRecords((prev) => [...saved.slice().reverse(), ...prev].slice(0, 500));
          setTotal((value) => value + saved.length);
        }
        setError(
          `${err?.message || "Erro ao guardar controlo de qualidade."}${saved.length ? ` (${saved.length} de ${filled.length} analitos já registados)` : ""}`,
        );
      } finally {
        setSaving(false);
      }
      return;
    }
    setSaving(true);
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
      setRecords((prev) => [saved, ...prev]);
      setCatalogRecords((prev) => [saved, ...prev].slice(0, 500));
      setTotal((value) => value + 1);
      setSuccess(
        `Registado ${saved.custom_id || `#${saved.id}`} — conclusão: ${saved.decision_display || decisionLabel[saved.decision] || saved.decision}.`,
      );
      setForm((prev) => ({
        ...initialForm,
        test: prev.test,
        method: prev.method,
        equipment: prev.equipment,
        sop_reference: prev.sop_reference,
        iso_clause: prev.iso_clause,
        material_name: prev.material_name,
        material_lot: prev.material_lot,
        manufacturer: prev.manufacturer,
        unit: prev.unit,
      }));
    } catch (err: any) {
      setError(err?.message || "Erro ao guardar controlo de qualidade.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="space-y-1.5">
        <section className="relative overflow-hidden rounded-xl border border-teal-200/60 bg-gradient-to-br from-teal-50/85 via-white/70 to-cyan-50/70 shadow-sm backdrop-blur-sm dark:border-teal-800/30 dark:from-teal-950/40 dark:via-slate-900/40 dark:to-cyan-950/20">
          <span className="absolute left-0 top-0 h-full w-1 bg-teal-500" />
          <div className="px-3 py-2 pl-4">
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

            <div className="mt-2 grid gap-1.5 sm:grid-cols-4">
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

            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/30 pt-2 dark:border-white/10">
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
              <select value={controlType} onChange={(event) => setControlType(event.target.value)} className="h-8 rounded-lg border border-white/50 bg-white/55 pl-2.5 pr-7 text-xs text-foreground outline-none backdrop-blur-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-white/10 dark:bg-white/[0.06]">
                <option value="">Todos os tipos</option>
                <option value="INTERNO">Interno</option>
                <option value="EXTERNO">Externo</option>
                <option value="ENSAIO_PROFICIENCIA">Ensaio de proficiência</option>
                <option value="CALIBRACAO">Calibração/verificação</option>
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

        {success ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/15 dark:text-emerald-300">
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess(null)} className="shrink-0 text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100" aria-label="Fechar">
              <XCircle size={14} />
            </button>
          </div>
        ) : null}

        <div className="grid gap-1.5 xl:grid-cols-[minmax(420px,0.9fr)_minmax(0,1.1fr)]">
          <form onSubmit={submit} className="space-y-1.5">
            <section className="rounded-xl border border-white/20 bg-white/30 p-2.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Nova execução de CQ</h2>
                  <p className="text-[11px] text-muted-foreground">O backend calcula automaticamente a conclusão.</p>
                </div>
                <div className="flex items-center gap-2">
                  {form.observed_result.trim() || form.expected_result.trim() ? (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${decisionClass[predictedDecision]}`}>
                      Prevista: {decisionLabel[predictedDecision]}
                    </span>
                  ) : null}
                  <button type="submit" disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-3 text-xs font-semibold text-white shadow-md shadow-teal-500/20 transition hover:from-teal-700 hover:to-cyan-700 disabled:opacity-60">
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Registar
                  </button>
                </div>
              </div>
            </section>

            <div className="grid gap-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <FormSection title="Identificação do exame" icon={FlaskConical} accentClass="bg-sky-500/80" className={batchMode ? "col-span-2" : ""}>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Field label="Exame" error={errors.test}>
                      <SearchableSelect
                        value={form.test}
                        onChange={handleTestChange}
                        options={testOptions}
                        placeholder="Selecione..."
                        searchPlaceholder="Pesquisar exame..."
                        emptyMessage="Nenhum exame encontrado."
                      />
                    </Field>
                    <Field label="Analito/campo">
                      <SearchableSelect
                        value={form.test_field}
                        onChange={handleFieldChange}
                        options={fieldOptions}
                        placeholder="Exame completo"
                        searchPlaceholder={form.test ? "Pesquisar analito..." : "Selecione primeiro o exame..."}
                        emptyMessage={form.test ? "Nenhum analito encontrado para este exame." : "Selecione primeiro o exame."}
                        disabled={!form.test}
                      />
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

                <FormSection title="Resultado e critérios de aceitação" icon={Ruler} accentClass="bg-emerald-500/80" className={batchMode ? "col-span-2" : ""}>
                  {batchMode ? (
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground">
                        Um controlo por analito; mínimo, máximo e unidade pré-preenchidos com a referência de cada campo.
                      </p>
                      <div className="grid grid-cols-[minmax(0,1.3fr)_repeat(5,minmax(0,1fr))_minmax(0,0.6fr)_14px] items-center gap-1 px-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                        <span>Analito</span>
                        <span>Esperado</span>
                        <span>Obtido</span>
                        <span>Mín</span>
                        <span>Máx</span>
                        <span>Tolerância</span>
                        <span>Unid.</span>
                        <span />
                      </div>
                      {fields.map((field) => {
                        const row = analyteRows[field.id];
                        if (!row) return null;
                        const rowDecision = evaluateQc(form.result_mode, row.expected, row.observed, row.min, row.max, row.tolerance);
                        return (
                          <div key={field.id} className="grid grid-cols-[minmax(0,1.3fr)_repeat(5,minmax(0,1fr))_minmax(0,0.6fr)_14px] items-center gap-1">
                            <span className="truncate text-[11px] text-foreground" title={`${field.code ? `${field.code} - ` : ""}${field.name}`}>
                              {field.name}
                            </span>
                            <input value={row.expected} onChange={(event) => updateRow(field.id, "expected", event.target.value)} className={rowInputCls} />
                            <input value={row.observed} onChange={(event) => updateRow(field.id, "observed", event.target.value)} className={rowInputCls} />
                            <input value={row.min} onChange={(event) => updateRow(field.id, "min", event.target.value)} className={rowInputCls} />
                            <input value={row.max} onChange={(event) => updateRow(field.id, "max", event.target.value)} className={rowInputCls} />
                            <input value={row.tolerance} onChange={(event) => updateRow(field.id, "tolerance", event.target.value)} className={rowInputCls} />
                            <input value={row.unit} onChange={(event) => updateRow(field.id, "unit", event.target.value)} className={rowInputCls} />
                            <span
                              title={row.observed.trim() ? decisionLabel[rowDecision] : ""}
                              className={`h-2.5 w-2.5 justify-self-center rounded-full ${row.observed.trim() ? decisionDotClass[rowDecision] : "bg-border"}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
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
                  )}
                </FormSection>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <FormSection title="Material de controlo" icon={TestTube2} accentClass="bg-violet-500/80">
                  <div className="grid gap-2 md:grid-cols-2">
                    <Field label="Material de controlo">
                      <SearchableSelect
                        value={form.material_name}
                        onChange={handleMaterialNameChange}
                        options={materialNameOptions}
                        placeholder="Selecione ou digite..."
                        searchPlaceholder="Pesquisar ou digitar novo..."
                        emptyMessage="Nenhum material encontrado."
                        allowClear
                        allowCustom
                      />
                    </Field>
                    <Field label="Lote">
                      <SearchableSelect
                        value={form.material_lot}
                        onChange={(value) => update("material_lot", value)}
                        options={materialLotOptions}
                        placeholder="Selecione ou digite..."
                        searchPlaceholder={form.material_name ? "Pesquisar ou digitar novo..." : "Selecione primeiro o material..."}
                        emptyMessage={form.material_name ? "Nenhum lote encontrado para este material." : "Selecione primeiro o material."}
                        disabled={!form.material_name}
                        allowClear
                        allowCustom
                      />
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
                    <Field label="Fabricante">
                      <input value={form.manufacturer} onChange={(event) => update("manufacturer", event.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Validade do material">
                      <input type="date" value={form.expiry_date} onChange={(event) => update("expiry_date", event.target.value)} className={inputCls} />
                    </Field>
                  </div>
                </FormSection>

                <FormSection title="Método, equipamento e norma" icon={Microscope} accentClass="bg-amber-500/80">
                  <div className="grid gap-2 md:grid-cols-2">
                    <Field label="Método">
                      <SearchableSelect
                        value={form.method}
                        onChange={(value) => update("method", value)}
                        options={methodOptions}
                        placeholder="Selecione ou digite..."
                        searchPlaceholder="Pesquisar ou digitar novo..."
                        emptyMessage="Nenhum método encontrado."
                        allowClear
                        allowCustom
                      />
                    </Field>
                    <Field label="Equipamento">
                      <SearchableSelect
                        value={form.equipment}
                        onChange={(value) => update("equipment", value)}
                        options={equipmentOptions}
                        placeholder="Selecione ou digite..."
                        searchPlaceholder="Pesquisar ou digitar novo..."
                        emptyMessage="Nenhum equipamento encontrado."
                        allowClear
                        allowCustom
                      />
                    </Field>
                    <Field label="POP/Procedimento">
                      <input value={form.sop_reference} onChange={(event) => update("sop_reference", event.target.value)} className={inputCls} />
                    </Field>
                    <Field label="ISO/SGQ">
                      <input value={form.iso_clause} onChange={(event) => update("iso_clause", event.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Incerteza de medição">
                      <input value={form.measurement_uncertainty} onChange={(event) => update("measurement_uncertainty", event.target.value)} className={inputCls} placeholder="ex.: ±0,05" />
                    </Field>
                  </div>
                </FormSection>
              </div>

              <FormSection title="Evidências e rastreabilidade" icon={FileCheck2} accentClass="bg-rose-500/80">
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

          <section className="space-y-1.5">
            <div className="rounded-xl border border-white/20 bg-white/30 p-2 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
              <h2 className="text-sm font-bold text-foreground">Registos de controlo</h2>
              <p className="text-[11px] text-muted-foreground">Filtrados pelos controles do cabeçalho.</p>
            </div>

            <div className="grid gap-1.5">
              {groupedRecords.map((group) => {
                const record = group.primary;
                const detailHref = `/clinical-laboratory/quality-control/${record.id}`;
                const aggregateDecision: QualityControl["decision"] =
                  group.rejected > 0 ? "REJEITADO" : group.review > 0 ? "REVISAO" : group.incomplete > 0 ? "INCOMPLETO" : "APROVADO";
                if (group.total > 1) {
                  return (
                    <Link key={group.key} href={detailHref} className="group block rounded-xl border border-teal-200/60 bg-white/45 p-2 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-white/65 hover:shadow-md dark:border-teal-800/30 dark:bg-white/[0.06] dark:hover:border-teal-700/60 dark:hover:bg-white/[0.09]">
                      <article>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-mono text-muted-foreground">
                              {record.custom_id || `#${record.id}`} · execução agrupada
                            </p>
                            <h3 className="truncate text-sm font-semibold text-foreground">
                              {record.test_code ? `${record.test_code} - ` : ""}{record.test_name || "Exame"}
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                              {group.total} analitos · {fmtDate(record.run_at)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${decisionClass[aggregateDecision] || decisionClass.INCOMPLETO}`}>
                              {decisionLabel[aggregateDecision]}
                            </span>
                            <ChevronRight size={14} className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                          </div>
                        </div>
                        <div className="mt-2 grid gap-1.5 text-[11px] sm:grid-cols-3">
                          <div className="rounded-lg bg-background/55 px-2 py-1.5">
                            <span className="block text-muted-foreground">Analitos aprovados</span>
                            <strong className="text-foreground">{group.approved}/{group.total}</strong>
                          </div>
                          <div className="rounded-lg bg-background/55 px-2 py-1.5">
                            <span className="block text-muted-foreground">Uso do teste</span>
                            <strong className={group.approvedForUse ? "text-emerald-600" : "text-red-600"}>
                              {group.approvedForUse ? "Pode ser usado" : "Não usar / rever"}
                            </strong>
                          </div>
                          <div className="rounded-lg bg-background/55 px-2 py-1.5">
                            <span className="block text-muted-foreground">Maior desvio</span>
                            <strong className="text-foreground">{group.maxDeviation === null ? "—" : fmtRef(String(group.maxDeviation))}</strong>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                          {record.material_lot ? <span>Lote {record.material_lot}</span> : null}
                          {record.equipment ? <span>Equip. {record.equipment}</span> : null}
                          {group.rejected ? <span className="font-semibold text-red-600">{group.rejected} rejeitado(s)</span> : null}
                          {group.correctiveActionRequired ? <span className="font-semibold text-red-600">CAPA requerida</span> : null}
                        </div>
                      </article>
                    </Link>
                  );
                }

                return (
                  <Link key={group.key} href={detailHref} className="group block rounded-xl border border-white/20 bg-white/35 p-2 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white/55 hover:shadow-md dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]">
                    <article>
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
                          <strong className="text-foreground">{record.expected_result}{record.unit ? ` ${record.unit}` : ""}</strong>
                        </div>
                        <div className="rounded-lg bg-background/60 px-2 py-1.5">
                          <span className="block text-muted-foreground">Obtido</span>
                          <strong className="text-foreground">{record.observed_result}{record.unit ? ` ${record.unit}` : ""}</strong>
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
                        {record.deviation ? <span>Desvio {fmtRef(record.deviation)}</span> : null}
                        {record.corrective_action_required ? <span className="font-semibold text-red-600">CAPA requerida</span> : null}
                      </div>
                    </article>
                  </Link>
                );
              })}

              {!loading && records.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center">
                  <FlaskConical size={28} className="mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nenhum controlo registado.</p>
                </div>
              ) : null}

              {!loading && records.length < total ? (
                <button
                  type="button"
                  onClick={() => loadRecords(page + 1, true)}
                  disabled={loadingMore}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-background/60 text-xs font-medium text-foreground transition hover:bg-background disabled:opacity-60"
                >
                  {loadingMore ? <Loader2 size={12} className="animate-spin" /> : null}
                  Carregar mais ({records.length} de {total})
                </button>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
