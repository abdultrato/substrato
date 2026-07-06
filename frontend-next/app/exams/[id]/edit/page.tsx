"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FlaskConical,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

const EDIT_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

const T_SAMPLE: RelationTarget = { endpoint: "/clinical/samples/", labelFields: ["name"] };

const SECTORS = [
  ["Hematologia","Hematologia"],["Bioquimica","Bioquímica"],["Microbiologia","Microbiologia"],
  ["Imunologia","Imunologia"],["Serologia","Serologia"],["Parasitologia","Parasitologia"],
  ["BiologiaMolecular","Biologia Molecular"],["Virologia","Virologia"],["Bacteriologia","Bacteriologia"],
  ["Coagulacao","Coagulação"],["Urinalise","Urinálise"],["Toxicologia","Toxicologia"],
  ["Hormonios","Hormônios"],["MarcadoresTumorais","Marcadores Tumorais"],
  ["LiquidosCorporais","Líquidos Corporais"],["Gasometria","Gasometria"],
  ["BancoSangue","Banco de Sangue"],["Outro","Outro"],
];

const METHODS = [
  ["Enzimatico","Enzimático"],["EnzimaticoColorimetrico","Enzimático Colorimétrico"],
  ["Colorimetrico","Colorimétrico"],["CineticoUV","Cinético UV"],["CineticoEnzimatico","Cinético Enzimático"],
  ["Jaffe","Jaffé"],["Biureto","Biureto"],["VerdeBromocresol","Verde de Bromocresol"],
  ["Imunoturbidimetria","Imunoturbidimetria"],["Nefelometrico","Nefelométrico"],
  ["ELISA","ELISA"],["Quimioluminescencia","Quimioluminescência"],
  ["Eletroquimioluminescencia","Eletroquimioluminescência"],["Imunofluorescencia","Imunofluorescência"],
  ["Imunoensaio","Imunoensaio"],["HematologiaAutomatizada","Hematologia Automatizada"],
  ["CitometriaFluxo","Citometria de Fluxo"],["Coagulometria","Coagulometria"],
  ["MicroscopiaOptica","Microscopia Óptica"],["Microscopico","Microscópico"],
  ["Cultura","Cultura"],["Antibiograma","Antibiograma"],["ColoracaoGram","Gram"],
  ["ColoracaoZiehl","Ziehl-Neelsen"],["PCR","PCR"],["RT_PCR","RT-PCR"],
  ["PCRTempoReal","PCR Tempo Real"],["NAAT","NAAT"],["Sequenciamento","Sequenciamento"],
  ["GotaEspessa","Gota Espessa"],["Imunocromatografia","Imunocromatografia"],
  ["FisicoQuimicoMicroscopia","Físico-químico + Microscopia"],["TiraReagente","Tira Reagente"],
  ["EletrodoIonSeletivo","Eletrodo Íon Seletivo"],["HPLC","HPLC"],["Eletroforese","Eletroforese"],
  ["EspectrometriaMassa","Espectrometria de Massa"],["MALDI_TOF","MALDI-TOF"],["Outro","Outro"],
];

const RESULT_TYPES = [
  ["NUMERICO","Numérico"],["QUALITATIVO","Qualitativo"],
  ["SEMIQUANTITATIVO","Semi-quantitativo"],["TEXTO","Texto livre"],
];

const UNITS = [
  "g/dl","g/L","mg/dl","mg/L","mg/24h","µg/dL","µg/L","µg/mL","ng/mL","ng/dL","pg/mL",
  "mmol/l","mmol/mol","µmol/l","nmol/L","pmol/L","mEq/L","cel/mm3","x10³/µl","x10⁶/µL",
  "%","u/l","U/mL","UI/L","UI/mL","mUI/L","kU/L","p/µL","ph","fl","pg","mm/h",
  "ovos/g","parasitas/µL","parasitas/campo","cistos/campo","Ct","cópias/mL","log10",
  "densidade","células/campo","sem unidade",
];

interface LabExam {
  id: number; custom_id: string; name: string;
  turnaround_hours: number; price: string; vat_percentage: string;
  applies_vat_by_default: boolean; method: string; sector: string;
  sample_type: number | null; sample_type_name: string | null;
}

interface FieldRow {
  _key: string;
  id?: number;
  name: string;
  type: string;
  unit: string;
  reference_min: string;
  reference_max: string;
  critical_min: string;
  critical_max: string;
}

let _keyCounter = 0;
function newKey() { return `row-${++_keyCounter}`; }
function emptyRow(): FieldRow {
  return { _key: newKey(), name: "", type: "NUMERICO", unit: "mg/dl", reference_min: "", reference_max: "", critical_min: "", critical_max: "" };
}

function isUnitOptionalType(type: string) {
  return type === "QUALITATIVO" || type === "SEMIQUANTITATIVO" || type === "TEXTO";
}

function resolveUnitForPayload(row: FieldRow) {
  if (isUnitOptionalType(row.type)) return "sem unidade";
  return row.unit || "sem unidade";
}

function resolveNumericReferencePayload(row: FieldRow, value: string) {
  if (isUnitOptionalType(row.type)) return null;
  return value || null;
}

function RelationSelect({ value, onChange, target, placeholder }: {
  value: number | null; onChange: (v: number | null, label: string) => void;
  target: RelationTarget; placeholder?: string;
}) {
  const [query, setQuery]   = useState("");
  const [label, setLabel]   = useState("");
  const [open, setOpen]     = useState(false);
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [busy, setBusy]     = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lbId = useId();

  function search(q: string) {
    setQuery(q); setOpen(true);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      setBusy(true);
      try {
        const { items } = await apiFetchList<Record<string, unknown>>(target.endpoint, {
          page: 1, pageSize: 20,
          query: { ...(target.staticFilters ?? {}), ...(q.trim() ? { search: q.trim() } : {}) },
        });
        setResults(relationOptionsFromRows(items, target));
      } catch { setResults([]); }
      finally { setBusy(false); }
    }, 250);
  }
  function select(opt: { value: string; label: string }) {
    onChange(Number(opt.value), opt.label); setLabel(opt.label); setQuery(""); setOpen(false);
  }
  function clear() { onChange(null, ""); setLabel(""); }

  return (
    <div className="space-y-1">
      {value !== null && (
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300">
          {label}
          <button type="button" onClick={clear} className="ml-0.5 text-sky-400 hover:text-sky-600"><X size={9} /></button>
        </span>
      )}
      {value === null && (
        <div className="relative z-[30]">
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => { setOpen(true); if (!query) search(""); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
          />
          {busy && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {open && (
            <div id={lbId} role="listbox" className="absolute left-0 right-0 z-[999] mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {results.length === 0
                ? <p className="px-3 py-2 text-[11px] text-muted-foreground">{busy ? "A pesquisar…" : "Nenhum resultado."}</p>
                : <ul className="max-h-48 divide-y divide-border/40 overflow-y-auto">
                    {results.map((opt) => (
                      <li key={opt.value}>
                        <button type="button" onMouseDown={() => select(opt)}
                          className="flex w-full px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-muted">{opt.label}</button>
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

function Card({ title, accent, children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <section className="relative z-0 overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm focus-within:z-50 dark:border-white/10 dark:bg-white/5">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="border-b border-border/50 px-3 py-1.5 pl-4">
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-2 p-2.5 pl-3">{children}</div>
    </section>
  );
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-[11px] font-semibold text-foreground">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20";
const selectCls = "w-full rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground outline-none transition focus:border-sky-400";

export default function EditExamPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loadingData, setLoadingData] = useState(true);
  const [name, setName]       = useState("");
  const [sector, setSector]   = useState("Bioquimica");
  const [method, setMethod]   = useState("");
  const [price, setPrice]     = useState("");
  const [vatPct, setVatPct]   = useState("16.00");
  const [appliesVat, setAppliesVat] = useState(true);
  const [tat, setTat]         = useState("24");
  const [sampleTypeId, setSampleTypeId] = useState<number | null>(null);
  const [sampleTypeLabel, setSampleTypeLabel] = useState("");
  const [fields, setFields]   = useState<FieldRow[]>([]);
  const [deletedFieldIds, setDeletedFieldIds] = useState<number[]>([]);

  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiFetch<LabExam>(`/clinical/lab-exams/${id}/`),
      apiFetchList<{ id: number; name: string; type: string; unit: string; reference_min: string | null; reference_max: string | null; critical_min: string | null; critical_max: string | null; position: number }>(
        "/clinical/examfield/", { page: 1, pageSize: 200, query: { exam: id } }
      ),
    ]).then(([exam, { items: fieldItems }]) => {
      setName(exam.name ?? "");
      setSector(exam.sector ?? "Bioquimica");
      setMethod(exam.method ?? "");
      setPrice(exam.price ?? "");
      setVatPct(exam.vat_percentage ?? "16.00");
      setAppliesVat(exam.applies_vat_by_default ?? true);
      setTat(String(exam.turnaround_hours ?? 24));
      if (exam.sample_type) { setSampleTypeId(exam.sample_type); setSampleTypeLabel(exam.sample_type_name ?? ""); }
      setFields(
        [...fieldItems]
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((f) => ({
            _key: newKey(),
            id: f.id,
            name: f.name ?? "",
            type: f.type ?? "NUMERICO",
            unit: f.unit ?? "sem unidade",
            reference_min: f.reference_min ?? "",
            reference_max: f.reference_max ?? "",
            critical_min: f.critical_min ?? "",
            critical_max: f.critical_max ?? "",
          }))
      );
    }).catch(() => setSaveError("Erro ao carregar exame."))
      .finally(() => setLoadingData(false));
  }, [id]);

  function addField() { setFields((prev) => [...prev, emptyRow()]); }
  function removeField(key: string) {
    setFields((prev) => {
      const row = prev.find((r) => r._key === key);
      if (row?.id) setDeletedFieldIds((d) => [...d, row.id!]);
      return prev.filter((r) => r._key !== key);
    });
  }
  function updateField(key: string, patch: Partial<FieldRow>) {
    setFields((prev) => prev.map((r) => {
      if (r._key !== key) return r;
      const next = { ...r, ...patch };
      if (patch.type && isUnitOptionalType(patch.type) && !patch.unit) next.unit = "sem unidade";
      return next;
    }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome obrigatório.";
    if (!price || Number(price) <= 0) e.price = "Preço deve ser maior que zero.";
    if (!sampleTypeId) e.sample_type = "Amostra obrigatória.";
    if (!tat || Number(tat) <= 0) e.tat = "Tempo de resposta > 0.";
    fields.forEach((f, i) => { if (!f.name.trim()) e[`field_${i}`] = "Nome do analito obrigatório."; });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      await apiFetch(`/clinical/lab-exams/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(), sector, method, price,
          vat_percentage: vatPct, applies_vat_by_default: appliesVat,
          turnaround_hours: Number(tat), sample_type: sampleTypeId,
        }),
      });

      // Delete removed fields
      await Promise.all(deletedFieldIds.map((fid) =>
        apiFetch(`/clinical/examfield/${fid}/`, { method: "DELETE" }).catch(() => {})
      ));

      // Save fields (create or patch)
      await Promise.all(
        fields.map((f, pos) => {
          const body = JSON.stringify({
            exam: Number(id), name: f.name.trim(), type: f.type, unit: resolveUnitForPayload(f),
            reference_min: resolveNumericReferencePayload(f, f.reference_min),
            reference_max: resolveNumericReferencePayload(f, f.reference_max),
            critical_min: resolveNumericReferencePayload(f, f.critical_min),
            critical_max: resolveNumericReferencePayload(f, f.critical_max),
            position: pos + 1,
          });
          if (f.id) {
            return apiFetch(`/clinical/examfield/${f.id}/`, { method: "PATCH", body });
          } else {
            return apiFetch("/clinical/examfield/", { method: "POST", body });
          }
        })
      );

      router.push(`/exams/${id}`);
    } catch (err: unknown) {
      setSaveError((err as { message?: string })?.message || "Erro ao guardar.");
    } finally { setSaving(false); }
  }

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-sky-500 to-cyan-600" />
          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 shadow-md shadow-sky-500/30">
              <FlaskConical size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Exames / Editar</div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {loadingData ? "Carregando…" : (name || "Exame laboratorial")}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Cancelar
              </button>
              <button type="submit" disabled={saving || loadingData}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 px-4 text-xs font-semibold text-white shadow-md shadow-sky-500/30 transition hover:from-sky-700 hover:to-cyan-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Guardar
              </button>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        )}

        {loadingData ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid gap-2 lg:grid-cols-3">

              {/* Identificação */}
              <Card title="Identificação" accent="bg-gradient-to-b from-sky-500 to-cyan-600">
                <Field label="Nome do exame" required error={errors.name}>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Hemograma completo"
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20" />
                </Field>
                <Field label="Setor">
                  <select value={sector} onChange={(e) => setSector(e.target.value)}
                    className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-sky-400">
                    {SECTORS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Método">
                  <select value={method} onChange={(e) => setMethod(e.target.value)}
                    className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-sky-400">
                    <option value="">— Método —</option>
                    {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
              </Card>

              {/* Amostra e TAT */}
              <Card title="Amostra e TAT" accent="bg-cyan-500">
                <Field label="Amostra principal" required error={errors.sample_type}>
                  <RelationSelect target={T_SAMPLE} value={sampleTypeId}
                    onChange={(v, lbl) => { setSampleTypeId(v); setSampleTypeLabel(lbl); setErrors((p) => ({ ...p, sample_type: "" })); }}
                    placeholder="Pesquisar amostra…" />
                </Field>
                <Field label="Tempo de resposta (h)" required error={errors.tat}>
                  <input type="number" min="1" value={tat} onChange={(e) => setTat(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20" />
                </Field>
              </Card>

              {/* Preço */}
              <Card title="Preço e IVA" accent="bg-gradient-to-b from-emerald-500 to-teal-600">
                <Field label="Preço base (MT)" required error={errors.price}>
                  <input type="number" min="0.01" step="0.01" value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20" />
                </Field>
                <Field label="IVA (%)">
                  <input type="number" min="0" max="100" step="0.01" value={vatPct}
                    onChange={(e) => setVatPct(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20" />
                </Field>
                <Field label="Aplicar IVA por padrão">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={appliesVat} onChange={(e) => setAppliesVat(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-sky-600" />
                    <span className="text-xs text-foreground">Sim</span>
                  </label>
                </Field>
              </Card>
            </div>

            {/* Analitos inline */}
            <section className="relative overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-indigo-500 to-violet-600" />
              <div className="flex items-center justify-between border-b border-border/50 px-3 py-1.5 pl-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-[11px] font-semibold text-foreground">Analitos e valores de referência</h2>
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                    {fields.length}
                  </span>
                </div>
                <button type="button" onClick={addField}
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/40">
                  <Plus size={10} /> Adicionar analito
                </button>
              </div>

              {fields.length === 0 ? (
                <div className="px-4 py-6 text-center text-[11px] text-muted-foreground">
                  Nenhum analito definido. Clique em &ldquo;Adicionar analito&rdquo; para começar.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-border/50 bg-white/10 dark:bg-white/5">
                        <th className="px-3 py-1.5 text-left font-semibold text-foreground">#</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-foreground">Nome do analito*</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-foreground">Tipo</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-foreground">Unidade</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-emerald-600 dark:text-emerald-400">Ref. mín</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-emerald-600 dark:text-emerald-400">Ref. máx</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-red-600 dark:text-red-400">Crit. mín</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-red-600 dark:text-red-400">Crit. máx</th>
                        <th className="px-2 py-1.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {fields.map((f, i) => (
                        <tr key={f._key} className={errors[`field_${i}`] ? "bg-red-50/30 dark:bg-red-900/10" : "hover:bg-white/20 dark:hover:bg-white/5"}>
                          <td className="px-3 py-1 text-center text-[10px] text-muted-foreground">{i + 1}</td>
                          <td className="px-2 py-1 min-w-[140px]">
                            <input value={f.name} onChange={(e) => updateField(f._key, { name: e.target.value })}
                              placeholder="Ex.: Hemoglobina" className={inputCls} />
                            {errors[`field_${i}`] && <p className="text-[9px] text-red-500 mt-0.5">{errors[`field_${i}`]}</p>}
                          </td>
                          <td className="px-2 py-1 min-w-[120px]">
                            <select value={f.type} onChange={(e) => updateField(f._key, { type: e.target.value })} className={selectCls}>
                              {RESULT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1 min-w-[100px]">
                            <select
                              value={isUnitOptionalType(f.type) ? "sem unidade" : f.unit}
                              onChange={(e) => updateField(f._key, { unit: e.target.value })}
                              disabled={isUnitOptionalType(f.type)}
                              className={`${selectCls} disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1 w-20">
                            <input type="number" step="any" value={f.reference_min}
                              onChange={(e) => updateField(f._key, { reference_min: e.target.value })}
                              placeholder="—"
                              disabled={isUnitOptionalType(f.type)}
                              className={`${inputCls} text-emerald-700 dark:text-emerald-400`} />
                          </td>
                          <td className="px-2 py-1 w-20">
                            <input type="number" step="any" value={f.reference_max}
                              onChange={(e) => updateField(f._key, { reference_max: e.target.value })}
                              placeholder="—"
                              disabled={isUnitOptionalType(f.type)}
                              className={`${inputCls} text-emerald-700 dark:text-emerald-400`} />
                          </td>
                          <td className="px-2 py-1 w-20">
                            <input type="number" step="any" value={f.critical_min}
                              onChange={(e) => updateField(f._key, { critical_min: e.target.value })}
                              placeholder="—"
                              disabled={isUnitOptionalType(f.type)}
                              className={`${inputCls} text-red-600 dark:text-red-400`} />
                          </td>
                          <td className="px-2 py-1 w-20">
                            <input type="number" step="any" value={f.critical_max}
                              onChange={(e) => updateField(f._key, { critical_max: e.target.value })}
                              placeholder="—"
                              disabled={isUnitOptionalType(f.type)}
                              className={`${inputCls} text-red-600 dark:text-red-400`} />
                          </td>
                          <td className="px-2 py-1">
                            <button type="button" onClick={() => removeField(f._key)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                              <Trash2 size={11} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="border-t border-border/30 px-4 py-2">
                <button type="button" onClick={addField}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 transition hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
                  <Plus size={10} /> Adicionar linha
                </button>
              </div>
            </section>
          </>
        )}
      </form>
    </AppLayout>
  );
}
