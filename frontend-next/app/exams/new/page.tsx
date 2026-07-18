"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FlaskConical,
  Loader2,
  Plus,
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

const CREATE_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

const T_SAMPLE: RelationTarget = { endpoint: "/clinical/samples/", labelFields: ["name"] };

interface SampleCollectionProfile {
  id: number;
  name: string;
  bottle_type: string;
  bottle_type_display?: string;
  cap_color?: string;
  minimum_volume_ml?: string;
  fasting_required?: boolean;
  fasting_hours?: number;
  storage_temperature?: string;
}

const BOTTLE_TYPE_LABELS: Record<string, string> = {
  TUBO_SECO: "Tubo seco (soro)",
  TUBO_EDTA: "Tubo EDTA",
  TUBO_CITRATO: "Tubo citrato",
  TUBO_FLUORETO: "Tubo fluoreto",
  FRASCO_URINA: "Frasco de urina",
  FRASCO_FEZES: "Frasco de fezes",
  FRASCO_ESTERIL: "Frasco estéril",
  HEMOCULTURA: "Frasco de hemocultura",
  OUTRO: "Outro",
};

function bottleTypeLabel(profile: SampleCollectionProfile | null) {
  if (!profile) return "—";
  return profile.bottle_type_display || BOTTLE_TYPE_LABELS[profile.bottle_type] || profile.bottle_type || "—";
}

const SECTORS = [
  ["Hematologia", "Hematologia"], ["Bioquimica", "Bioquímica"],
  ["Microbiologia", "Microbiologia"], ["Imunologia", "Imunologia"],
  ["Serologia", "Serologia"], ["Parasitologia", "Parasitologia"],
  ["BiologiaMolecular", "Biologia Molecular"], ["Virologia", "Virologia"],
  ["Bacteriologia", "Bacteriologia"], ["Coagulacao", "Coagulação"],
  ["Urinalise", "Urinálise"], ["Toxicologia", "Toxicologia"],
  ["Hormonios", "Hormônios"], ["MarcadoresTumorais", "Marcadores Tumorais"],
  ["LiquidosCorporais", "Líquidos Corporais"], ["Gasometria", "Gasometria"],
  ["BancoSangue", "Banco de Sangue"], ["Outro", "Outro"],
];

const METHODS = [
  ["Enzimatico", "Enzimático"], ["EnzimaticoColorimetrico", "Enzimático Colorimétrico"],
  ["Colorimetrico", "Colorimétrico"], ["CineticoUV", "Cinético UV"],
  ["CineticoEnzimatico", "Cinético Enzimático"], ["Jaffe", "Jaffé Cinético"],
  ["Biureto", "Biureto"], ["VerdeBromocresol", "Verde de Bromocresol"],
  ["Imunoturbidimetria", "Imunoturbidimetria"], ["Nefelometrico", "Nefelométrico"],
  ["ELISA", "ELISA"], ["Quimioluminescencia", "Quimioluminescência"],
  ["Eletroquimioluminescencia", "Eletroquimioluminescência"],
  ["Imunofluorescencia", "Imunofluorescência"], ["Imunoensaio", "Imunoensaio"],
  ["HematologiaAutomatizada", "Hematologia Automatizada"],
  ["CitometriaFluxo", "Citometria de Fluxo"], ["Coagulometria", "Coagulometria"],
  ["MicroscopiaOptica", "Microscopia Óptica"], ["Microscopico", "Microscópico"],
  ["Cultura", "Cultura"], ["Antibiograma", "Antibiograma"],
  ["ColoracaoGram", "Coloração de Gram"], ["ColoracaoZiehl", "Ziehl-Neelsen"],
  ["PCR", "PCR"], ["RT_PCR", "RT-PCR"], ["PCRTempoReal", "PCR em Tempo Real"],
  ["NAAT", "NAAT"], ["Sequenciamento", "Sequenciamento"],
  ["GotaEspessa", "Gota Espessa"], ["Imunocromatografia", "Imunocromatografia"],
  ["FisicoQuimicoMicroscopia", "Físico-químico e Microscopia"],
  ["TiraReagente", "Tira Reagente"], ["EletrodoIonSeletivo", "Eletrodo Íon Seletivo"],
  ["HPLC", "HPLC"], ["Eletroforese", "Eletroforese"],
  ["EspectrometriaMassa", "Espectrometria de Massa"], ["MALDI_TOF", "MALDI-TOF"],
  ["Outro", "Outro"],
];

const RESULT_TYPES = [
  ["NUMERICO", "Numérico"],
  ["QUALITATIVO", "Qualitativo"],
  ["SEMIQUANTITATIVO", "Semi-quantitativo"],
  ["TEXTO", "Texto livre"],
];

const FIELD_UNITS = [
  ["g/dl", "g/dl"], ["g/L", "g/L"], ["mg/dl", "mg/dl"], ["mg/L", "mg/L"],
  ["mg/24h", "mg/24h"], ["µg/dL", "µg/dL"], ["µg/L", "µg/L"], ["µg/mL", "µg/mL"],
  ["ng/mL", "ng/mL"], ["ng/dL", "ng/dL"], ["pg/mL", "pg/mL"], ["mmol/l", "mmol/l"],
  ["mmol/mol", "mmol/mol"], ["µmol/l", "µmol/l"], ["nmol/L", "nmol/L"], ["pmol/L", "pmol/L"],
  ["mEq/L", "mEq/L"], ["cel/mm3", "cel/mm3"], ["x10³/µl", "x10³/µl"], ["x10⁶/µL", "x10⁶/µL"],
  ["%", "%"], ["u/l", "u/l"], ["U/mL", "U/mL"], ["UI/L", "UI/L"],
  ["UI/mL", "UI/mL"], ["mUI/L", "mUI/L"], ["kU/L", "kU/L"], ["p/µL", "p/µL"],
  ["ph", "ph"], ["fl", "fl"], ["pg", "pg"], ["mm/h", "mm/h"],
  ["ovos/g", "ovos/g"], ["ovos/10mL", "ovos/10mL"], ["parasitas/µL", "parasitas/µL"], ["parasitas/campo", "parasitas/campo"],
  ["cistos/campo", "cistos/campo"], ["larvas/campo", "larvas/campo"], ["Ct", "Ct"], ["cópias/mL", "cópias/mL"],
  ["cópias/reação", "cópias/reação"], ["log10", "log10"], ["% alelo", "% alelo"], ["% IS", "% IS"],
  ["genótipo", "genótipo"], ["traços/detectado", "traços/detectado"], ["S/CO", "S/CO"], ["mUI/mL", "mUI/mL"],
  ["título", "título"], ["index", "index"], ["UFC/mL", "UFC/mL"], ["UFC/g", "UFC/g"],
  ["UFC/placa", "UFC/placa"], ["horas", "horas"], ["S/I/R", "S/I/R"], ["mm", "mm"],
  ["cruzes", "cruzes"], ["campo", "campo"], ["células/campo", "células/campo"], ["mL/24h", "mL/24h"],
  ["mL/min", "mL/min"], ["mg/g creatinina", "mg/g creatinina"], ["densidade", "densidade"], ["µUI/mL", "µUI/mL"],
  ["% risco", "% risco"], ["segundos", "segundos"], ["minutos", "minutos"], ["ratio", "ratio"],
  ["ng/mL FEU", "ng/mL FEU"], ["µg/mL FEU", "µg/mL FEU"], ["mg/L FEU", "mg/L FEU"], ["mmHg", "mmHg"],
  ["mOsm/kg", "mOsm/kg"], ["s", "s"], ["INR", "INR"], ["razão/índice", "razão/índice"],
  ["sem unidade", "Sem unidade"],
] as const;

type DraftExamField = {
  id: string;
  name: string;
  type: string;
  unit: string;
  reference_min: string;
  reference_max: string;
  critical_min: string;
  critical_max: string;
  max_delta: string;
};

function createEmptyExamField(): DraftExamField {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    type: "NUMERICO",
    unit: "sem unidade",
    reference_min: "",
    reference_max: "",
    critical_min: "",
    critical_max: "",
    max_delta: "",
  };
}

function RelationSelect({ value, onChange, target, placeholder, zIndex = "z-[30]" }: {
  value: number | null; onChange: (v: number | null, label: string) => void;
  target: RelationTarget; placeholder?: string; zIndex?: string;
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
    <div className="space-y-1.5">
      {value !== null && (
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300">
          {label}
          <button type="button" onClick={clear} className="ml-0.5 text-sky-400 hover:text-sky-600"><X size={9} /></button>
        </span>
      )}
      {value === null && (
        <div className={`relative ${zIndex}`}>
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

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20";
const selectCls = "w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20";

export default function NewExamPage() {
  useAuthGuard();
  const router = useRouter();

  const [name, setName]       = useState("");
  const [sector, setSector]   = useState("Bioquimica");
  const [method, setMethod]   = useState("");
  const [price, setPrice]     = useState("");
  const [vatPct, setVatPct]   = useState("5.00");
  const [appliesVat, setAppliesVat] = useState(true);
  const [tat, setTat]         = useState("24");
  const [sampleTypeId, setSampleTypeId] = useState<number | null>(null);
  const [sampleProfile, setSampleProfile] = useState<SampleCollectionProfile | null>(null);
  const [examFields, setExamFields] = useState<DraftExamField[]>([createEmptyExamField()]);

  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!sampleTypeId) {
      setSampleProfile(null);
      return;
    }
    apiFetch<SampleCollectionProfile>(`/clinical/samples/${sampleTypeId}/`)
      .then(setSampleProfile)
      .catch(() => setSampleProfile(null));
  }, [sampleTypeId]);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome obrigatório.";
    if (!price || Number(price) <= 0) e.price = "Preço deve ser maior que zero.";
    if (!sampleTypeId) e.sample_type = "Amostra obrigatória.";
    if (!tat || Number(tat) <= 0) e.tat = "Tempo de resposta deve ser maior que zero.";
    examFields.forEach((field) => {
      const hasAnyValue = Object.entries(field).some(([key, value]) => key !== "id" && String(value).trim() !== "");
      if (!hasAnyValue) return;
      if (!field.name.trim()) e[`field_name_${field.id}`] = "Nome do campo obrigatório.";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function updateExamField(id: string, key: keyof Omit<DraftExamField, "id">, value: string) {
    setExamFields((prev) => prev.map((field) => (
      field.id === id ? { ...field, [key]: value } : field
    )));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`field_name_${id}`];
      return next;
    });
  }

  function addExamField() {
    setExamFields((prev) => [...prev, createEmptyExamField()]);
  }

  function removeExamField(id: string) {
    setExamFields((prev) => {
      if (prev.length === 1) return [createEmptyExamField()];
      return prev.filter((field) => field.id !== id);
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`field_name_${id}`];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const filledFields = examFields
        .filter((field) => Object.entries(field).some(([key, value]) => key !== "id" && String(value).trim() !== ""))
        .map((field, index) => ({
          exam: 0,
          name: field.name.trim(),
          type: field.type,
          unit: field.unit,
          position: index + 1,
          reference_min: field.reference_min.trim() || null,
          reference_max: field.reference_max.trim() || null,
          critical_min: field.critical_min.trim() || null,
          critical_max: field.critical_max.trim() || null,
          max_delta: field.max_delta.trim() || null,
        }));

      const res = await apiFetch<{ id: number }>("/clinical/lab-exams/", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(), sector, method,
          price, vat_percentage: vatPct,
          applies_vat_by_default: appliesVat,
          turnaround_hours: Number(tat),
          sample_type: sampleTypeId,
        }),
      });

      if (filledFields.length > 0) {
        await Promise.all(
          filledFields.map((field) =>
            apiFetch("/clinical/examfield/", {
              method: "POST",
              body: JSON.stringify({ ...field, exam: res.id }),
            })
          )
        );
      }

      router.push(`/exams/${res.id}`);
    } catch (err: unknown) {
      setSaveError((err as { message?: string })?.message || "Erro ao criar exame e/ou campos do exame.");
    } finally { setSaving(false); }
  }

  return (
    <AppLayout requiredGroups={CREATE_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[98%] max-w-[98%] space-y-2 overflow-x-hidden">

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
              <div className="text-[10px] text-muted-foreground">Laboratório / Exames</div>
              <h1 className="text-base font-bold leading-tight text-foreground">Novo exame laboratorial</h1>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 px-4 text-xs font-semibold text-white shadow-md shadow-sky-500/30 transition hover:from-sky-700 hover:to-cyan-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Criar exame
              </button>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        )}

        <div className="columns-1 gap-2 lg:columns-2">

          <div className="mb-2 break-inside-avoid">
            <Card title="Identificação" accent="bg-gradient-to-b from-sky-500 to-cyan-600">
              <Field label="Nome do exame" required error={errors.name}>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Hemograma completo" className={inputCls} />
              </Field>
              <Field label="Setor">
                <select value={sector} onChange={(e) => setSector(e.target.value)} className={selectCls}>
                  {SECTORS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Método">
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={selectCls}>
                  <option value="">— Seleccionar método —</option>
                  {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
            </Card>
          </div>

          <div className="mb-2 break-inside-avoid">
            <Card title="Amostra e TAT" accent="bg-cyan-500">
              <Field label="Amostra principal" required error={errors.sample_type}>
                <RelationSelect target={T_SAMPLE} value={sampleTypeId}
                  onChange={(v) => { setSampleTypeId(v); setErrors((p) => ({ ...p, sample_type: "" })); }}
                  placeholder="Pesquisar amostra…" />
              </Field>
              <Field label="Tempo de resposta (horas)" required error={errors.tat}>
                <input type="number" min="1" value={tat} onChange={(e) => setTat(e.target.value)} className={inputCls} />
              </Field>
            </Card>
          </div>

          <div className="mb-2 break-inside-avoid">
            <Card title="Tipo de frasco e coleta" accent="bg-gradient-to-b from-amber-500 to-orange-600">
              {!sampleTypeId ? (
                <p className="text-xs text-muted-foreground">
                  Selecione a amostra principal para expor o frasco de coleta correspondente.
                </p>
              ) : !sampleProfile ? (
                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                  <Loader2 size={13} className="animate-spin" />
                  A carregar dados da coleta…
                </div>
              ) : (
                <>
                  <Field label="Tipo de frasco">
                    <input
                      type="text"
                      value={bottleTypeLabel(sampleProfile)}
                      readOnly
                      className={`${inputCls} bg-muted/40`}
                    />
                  </Field>
                  <Field label="Cor da tampa">
                    <input
                      type="text"
                      value={sampleProfile.cap_color || "—"}
                      readOnly
                      className={`${inputCls} bg-muted/40`}
                    />
                  </Field>
                  <Field label="Volume mínimo (mL)">
                    <input
                      type="text"
                      value={sampleProfile.minimum_volume_ml || "—"}
                      readOnly
                      className={`${inputCls} bg-muted/40`}
                    />
                  </Field>
                  <Field label="Jejum">
                    <input
                      type="text"
                      value={sampleProfile.fasting_required ? `${sampleProfile.fasting_hours || 0} h` : "Não"}
                      readOnly
                      className={`${inputCls} bg-muted/40`}
                    />
                  </Field>
                  <Field label="Conservação">
                    <input
                      type="text"
                      value={sampleProfile.storage_temperature || "—"}
                      readOnly
                      className={`${inputCls} bg-muted/40`}
                    />
                  </Field>
                </>
              )}
            </Card>
          </div>

          <div className="mb-2 break-inside-avoid">
            <Card title="Preço e facturação" accent="bg-gradient-to-b from-emerald-500 to-teal-600">
              <Field label="Preço base (MT)" required error={errors.price}>
                <input type="number" min="0.01" step="0.01" value={price}
                  onChange={(e) => setPrice(e.target.value)} className={inputCls} />
              </Field>
              <Field label="IVA (%)">
                <input type="number" min="0" max="100" step="0.01" value={vatPct}
                  onChange={(e) => setVatPct(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Aplicar IVA por padrão">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={appliesVat} onChange={(e) => setAppliesVat(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-sky-600" />
                  <span className="text-xs text-foreground">Sim, aplicar IVA por padrão</span>
                </label>
              </Field>
            </Card>
          </div>

          <div className="mb-2 mt-3 break-inside-avoid lg:mt-4 lg:[column-span:all]">
          <Card title="Campos do exame" accent="bg-gradient-to-b from-violet-500 to-fuchsia-600">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  Adicione os campos do resultado diretamente aqui.
                </p>
                <button
                  type="button"
                  onClick={addExamField}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2.5 text-[11px] font-semibold text-white shadow-md shadow-violet-500/20 transition hover:from-violet-700 hover:to-fuchsia-700"
                >
                  <Plus size={12} />
                  Adicionar campo
                </button>
              </div>

              <div className="space-y-1 overflow-x-auto overflow-y-hidden">
                {examFields.map((field, index) => (
                  <div key={field.id} className="w-full min-w-0 rounded-lg border border-border/60 bg-background/70 p-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-foreground">Campo {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeExamField(field.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-red-600"
                        aria-label={`Remover campo ${index + 1}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="flex min-w-max flex-nowrap items-start gap-2">
                      <div className="w-[104px] min-w-0 shrink-0 space-y-0.5">
                        <label className="text-[11px] font-semibold text-foreground">
                          Nome do campo<span className="ml-0.5 text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => updateExamField(field.id, "name", e.target.value)}
                          placeholder="Ex.: Hemoglobina"
                          className={inputCls}
                        />
                        {errors[`field_name_${field.id}`] && (
                          <p className="text-[10px] font-medium text-red-600 dark:text-red-400">
                            {errors[`field_name_${field.id}`]}
                          </p>
                        )}
                      </div>
                      <div className="w-[72px] min-w-0 shrink-0 space-y-0.5">
                        <label className="text-[11px] font-semibold text-foreground">Tipo</label>
                        <select
                          value={field.type}
                          onChange={(e) => updateExamField(field.id, "type", e.target.value)}
                          className={selectCls}
                        >
                          {RESULT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </div>
                      <div className="w-[72px] min-w-0 shrink-0 space-y-0.5">
                        <label className="text-[11px] font-semibold text-foreground">Unidade</label>
                        <select
                          value={field.unit}
                          onChange={(e) => updateExamField(field.id, "unit", e.target.value)}
                          className={selectCls}
                        >
                          {FIELD_UNITS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </div>
                      <div className="w-[104px] min-w-0 shrink-0 space-y-0.5">
                        <label className="text-[11px] font-semibold text-foreground">Delta máximo</label>
                        <input
                          type="number"
                          step="0.01"
                          value={field.max_delta}
                          onChange={(e) => updateExamField(field.id, "max_delta", e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div className="w-[104px] min-w-0 shrink-0 space-y-0.5">
                        <label className="text-[11px] font-semibold text-foreground">Referência mínima</label>
                        <input
                          type="number"
                          step="0.01"
                          value={field.reference_min}
                          onChange={(e) => updateExamField(field.id, "reference_min", e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div className="w-[104px] min-w-0 shrink-0 space-y-0.5">
                        <label className="text-[11px] font-semibold text-foreground">Referência máxima</label>
                        <input
                          type="number"
                          step="0.01"
                          value={field.reference_max}
                          onChange={(e) => updateExamField(field.id, "reference_max", e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div className="w-[104px] min-w-0 shrink-0 space-y-0.5">
                        <label className="text-[11px] font-semibold text-foreground">Crítico mínimo</label>
                        <input
                          type="number"
                          step="0.01"
                          value={field.critical_min}
                          onChange={(e) => updateExamField(field.id, "critical_min", e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div className="w-[104px] min-w-0 shrink-0 space-y-0.5">
                        <label className="text-[11px] font-semibold text-foreground">Crítico máximo</label>
                        <input
                          type="number"
                          step="0.01"
                          value={field.critical_max}
                          onChange={(e) => updateExamField(field.id, "critical_max", e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
