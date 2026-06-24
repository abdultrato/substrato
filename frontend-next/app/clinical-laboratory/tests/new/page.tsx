"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FlaskConical, Loader2, Plus, Save, Trash2 } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";
import { LAB_METHOD_OPTIONS } from "@/lib/clinicalLabMethods";

// ── Types ─────────────────────────────────────────────────────────────────────

type LabSector = { id: number; name: string; code: string };
type LabContainerType = { id: number; code: string; name: string; cap_color_display: string };

type FieldRow = {
  _key: number;
  name: string;
  code: string;
  unit: string;
  reference_range: string;
  reference_low: string;
  reference_high: string;
  critical_low: string;
  critical_high: string;
  result_type: string;
  result_choices: string[];
  _choiceInput: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const SAMPLE_OPTIONS = [
  ["SANGUE_TOTAL", "Sangue total"], ["SORO", "Soro"], ["PLASMA", "Plasma"],
  ["URINA", "Urina"], ["FEZES", "Fezes"], ["ESCARRO", "Escarro"],
  ["LCR", "Líquor (LCR)"], ["ZARAGATOA", "Zaragatoa/Swab"], ["SEMEN", "Sémen"],
  ["MEDULA", "Medula óssea"], ["LIQUIDO", "Líquido biológico"], ["OUTRO", "Outro"],
];

const CHOICE_PRESETS = [
  { label: "Qualitativo", choices: ["Negativo", "Positivo", "Indeterminado"] },
  { label: "Titulação", choices: ["Reativo 80", "Reativo 160", "Reativo 240", "Reativo 320", "Não Reativo"] },
  { label: "Semiquant.", choices: ["Reativo +", "Reativo ++", "Reativo +++"] },
];

let _keyCounter = 0;
function newFieldRow(): FieldRow {
  return { _key: ++_keyCounter, name: "", code: "", unit: "", reference_range: "", reference_low: "", reference_high: "", critical_low: "", critical_high: "", result_type: "numero", result_choices: [], _choiceInput: "" };
}

function SectionCard({ icon: Icon, title, action, children }: {
  icon: React.ElementType; title: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Icon size={13} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
          <h2 className="text-xs font-semibold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25";
const UNIT_OPTIONS = [
  "g/dl", "g/L", "mg/dl", "mg/L", "mg/24h", "µg/dL", "µg/L", "µg/mL",
  "ng/mL", "ng/dL", "pg/mL", "mmol/l", "mmol/mol", "µmol/l", "nmol/L", "pmol/L",
  "mEq/L", "cel/mm3", "x10³/µl", "x10⁶/µL", "%", "u/l", "U/mL", "UI/L", "UI/mL",
  "mUI/L", "kU/L", "p/µL", "ph", "fl", "pg", "mm/h",
  "Ct", "cópias/mL", "log10", "% alelo", "% IS", "S/CO", "mUI/mL", "título", "index",
  "UFC/mL", "UFC/g", "S/I/R", "mm", "cruzes", "campo", "células/campo",
  "mL/24h", "mL/min", "mg/g creatinina", "densidade", "segundos", "minutos",
  "ratio", "mmHg", "mOsm/kg", "s", "INR", "razão/índice", "sem unidade",
];

const smInputCls = "w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/25";
const checkboxCls = "h-4 w-4 rounded border-border accent-violet-600";

// ── Inline field row ──────────────────────────────────────────────────────────

function FieldRowEditor({ row, index, onChange, onRemove }: {
  row: FieldRow; index: number;
  onChange: (key: number, patch: Partial<FieldRow>) => void;
  onRemove: (key: number) => void;
}) {
  const upd = (patch: Partial<FieldRow>) => onChange(row._key, patch);

  function addChoice() {
    const v = row._choiceInput.trim();
    if (v && !row.result_choices.includes(v))
      upd({ result_choices: [...row.result_choices, v], _choiceInput: "" });
    else
      upd({ _choiceInput: "" });
  }

  return (
    <div className="relative rounded-lg border border-border/60 bg-background/60 p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Campo {index + 1}</span>
        <button type="button" onClick={() => onRemove(row._key)}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
          <Trash2 size={11} />
        </button>
      </div>

      {/* Name + Code + result_type + unit */}
      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-1">
          <label className="text-[10px] font-semibold text-muted-foreground">Nome *</label>
          <input type="text" value={row.name} onChange={(e) => upd({ name: e.target.value })}
            placeholder="Ex.: Hemoglobina" className={smInputCls} />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground">Código</label>
          <input type="text" value={row.code} onChange={(e) => upd({ code: e.target.value })}
            placeholder="HB" className={smInputCls} />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground">Tipo resultado</label>
          <select value={row.result_type}
            onChange={(e) => upd({ result_type: e.target.value, result_choices: [], unit: "" })}
            className={smInputCls}>
            <option value="numero">Número</option>
            <option value="texto">Texto livre</option>
            <option value="texto_choice">Escolha (lista)</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground">Unidade</label>
          <select value={row.unit} onChange={(e) => upd({ unit: e.target.value })} className={smInputCls}
            disabled={row.result_type !== "numero"}>
            <option value="">—</option>
            {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Choices editor */}
      {row.result_type === "texto_choice" && (
        <div className="space-y-1.5 rounded-md border border-violet-200/60 bg-violet-50/20 p-2 dark:border-violet-700/30 dark:bg-violet-900/10">
          <p className="text-[10px] font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide">Opções de escolha</p>
          <div className="flex flex-wrap gap-1">
            {CHOICE_PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => upd({ result_choices: p.choices })}
                className="inline-flex h-5 items-center rounded px-1.5 text-[10px] border border-violet-200 text-violet-700 hover:bg-violet-100 dark:border-violet-700/40 dark:text-violet-300 dark:hover:bg-violet-900/30 transition">
                {p.label}
              </button>
            ))}
          </div>
          {row.result_choices.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {row.result_choices.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                  {c}
                  <button type="button" onClick={() => upd({ result_choices: row.result_choices.filter((_, j) => j !== i) })}
                    className="ml-0.5 text-muted-foreground hover:text-red-500 transition leading-none">×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-1">
            <input type="text" value={row._choiceInput}
              onChange={(e) => upd({ _choiceInput: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChoice(); } }}
              placeholder="Adicionar opção…" className={smInputCls + " flex-1"} />
            <button type="button" onClick={addChoice}
              className="inline-flex h-[29px] items-center rounded-md border border-border bg-card px-2 text-muted-foreground hover:bg-muted transition">
              <Plus size={10} />
            </button>
          </div>
        </div>
      )}

      {/* Numeric limits */}
      {row.result_type === "numero" && (
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground">Ref. mín.</label>
            <input type="number" step="any" value={row.reference_low} onChange={(e) => upd({ reference_low: e.target.value })}
              placeholder="—" className={smInputCls} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground">Ref. máx.</label>
            <input type="number" step="any" value={row.reference_high} onChange={(e) => upd({ reference_high: e.target.value })}
              placeholder="—" className={smInputCls} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-red-600 dark:text-red-400">Crítico mín.</label>
            <input type="number" step="any" value={row.critical_low} onChange={(e) => upd({ critical_low: e.target.value })}
              placeholder="—" className={smInputCls} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-red-600 dark:text-red-400">Crítico máx.</label>
            <input type="number" step="any" value={row.critical_high} onChange={(e) => upd({ critical_high: e.target.value })}
              placeholder="—" className={smInputCls} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

function NewLabTestForm() {
  const router = useRouter();

  const [sectors, setSectors] = useState<LabSector[]>([]);
  const [containerTypes, setContainerTypes] = useState<LabContainerType[]>([]);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sector, setSector] = useState("");
  const [sampleType, setSampleType] = useState("SORO");
  const [containerType, setContainerType] = useState("");
  const [method, setMethod] = useState("");
  const [price, setPrice] = useState("0.00");
  const [turnaroundHours, setTurnaroundHours] = useState("24");
  const [requiresFasting, setRequiresFasting] = useState(false);
  const [requiresConsent, setRequiresConsent] = useState(false);

  const [fieldRows, setFieldRows] = useState<FieldRow[]>([newFieldRow()]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetchList<LabSector>("/clinical_laboratory/sector/", { pageSize: 200 }),
      apiFetchList<LabContainerType>("/clinical_laboratory/container_type/", { pageSize: 200 }),
    ]).then(([s, c]) => {
      setSectors(s.items);
      setContainerTypes(c.items);
    }).catch(() => {});
  }, []);

  function updateField(key: number, patch: Partial<FieldRow>) {
    setFieldRows((rows) => rows.map((r) => r._key === key ? { ...r, ...patch } : r));
  }
  function removeField(key: number) {
    setFieldRows((rows) => rows.filter((r) => r._key !== key));
  }
  function addField() {
    setFieldRows((rows) => [...rows, newFieldRow()]);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome obrigatório.";
    if (!code.trim()) e.code = "Código obrigatório.";
    if (!sector) e.sector = "Sector obrigatório.";
    const emptyField = fieldRows.find((r) => !r.name.trim());
    if (emptyField) e.fields = "Todos os campos precisam de ter nome.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const test = await apiFetch<{ id: number }>("/clinical_laboratory/test/", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(), code: code.trim(), sector: Number(sector),
          sample_type: sampleType, container_type: containerType ? Number(containerType) : null,
          method: method.trim(),
          price, turnaround_hours: Number(turnaroundHours) || 24,
          requires_fasting: requiresFasting, requires_consent: requiresConsent,
        }),
      });

      // Create each field sequentially
      for (let i = 0; i < fieldRows.length; i++) {
        const f = fieldRows[i];
        if (!f.name.trim()) continue;
        await apiFetch("/clinical_laboratory/test_field/", {
          method: "POST",
          body: JSON.stringify({
            test: test.id,
            name: f.name.trim(),
            code: f.code.trim(),
            unit: f.result_type === "numero" ? f.unit.trim() : "",
            reference_range: f.result_type === "numero" ? f.reference_range.trim() : "",
            reference_low: f.result_type === "numero" ? (f.reference_low || null) : null,
            reference_high: f.result_type === "numero" ? (f.reference_high || null) : null,
            critical_low: f.result_type === "numero" ? (f.critical_low || null) : null,
            critical_high: f.result_type === "numero" ? (f.critical_high || null) : null,
            result_type: f.result_type,
            result_choices: f.result_choices,
            sequence: i,
          }),
        });
      }

      router.push(`/clinical-laboratory/tests/${test.id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao criar exame.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-2xl space-y-3">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <FlaskConical size={16} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Novo exame</h1>
                <p className="text-[11px] text-muted-foreground">Catálogo laboratorial</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Criar exame
              </button>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        )}

        {/* Identificação */}
        <SectionCard icon={FlaskConical} title="Identificação">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome" required error={errors.name}>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Hemograma completo" className={inputCls} />
            </Field>
            <Field label="Código" required error={errors.code}>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="Ex.: HEM001" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sector" required error={errors.sector}>
              <select value={sector} onChange={(e) => setSector(e.target.value)} className={inputCls}>
                <option value="">— Selecionar —</option>
                {sectors.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </Field>
            <Field label="Tipo de amostra">
              <select value={sampleType} onChange={(e) => setSampleType(e.target.value)} className={inputCls}>
                {SAMPLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Tipo de tubo/recipiente">
            <select value={containerType} onChange={(e) => setContainerType(e.target.value)} className={inputCls}>
              <option value="">— Não especificado —</option>
              {containerTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name} ({ct.cap_color_display})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Método">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
              <option value="">— Selecionar —</option>
              {LAB_METHOD_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <div className="flex gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
              <input type="checkbox" checked={requiresFasting} onChange={(e) => setRequiresFasting(e.target.checked)} className={checkboxCls} />
              Exige jejum
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
              <input type="checkbox" checked={requiresConsent} onChange={(e) => setRequiresConsent(e.target.checked)} className={checkboxCls} />
              Exige consentimento
            </label>
          </div>
        </SectionCard>

        {/* Campos do exame */}
        <SectionCard icon={FlaskConical} title={`Campos / analitos · ${fieldRows.length}`}
          action={
            <button type="button" onClick={addField}
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11px] font-medium text-foreground transition hover:bg-muted">
              <Plus size={11} /> Adicionar campo
            </button>
          }>
          {errors.fields && (
            <p className="text-[11px] font-medium text-red-600 dark:text-red-400">{errors.fields}</p>
          )}
          <div className="space-y-2">
            {fieldRows.map((row, i) => (
              <FieldRowEditor key={row._key} row={row} index={i}
                onChange={updateField} onRemove={removeField} />
            ))}
          </div>
          {fieldRows.length === 0 && (
            <p className="py-3 text-center text-xs text-muted-foreground">
              Nenhum campo adicionado. Clique em &quot;Adicionar campo&quot; para começar.
            </p>
          )}
        </SectionCard>

        {/* Preço e prazo */}
        <SectionCard icon={FlaskConical} title="Preço e prazo">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Preço (MZN)">
              <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
                className={inputCls} />
            </Field>
            <Field label="Tempo de resposta (horas)">
              <input type="number" min="1" value={turnaroundHours} onChange={(e) => setTurnaroundHours(e.target.value)}
                className={inputCls} />
            </Field>
          </div>
        </SectionCard>

      </form>
    </AppLayout>
  );
}

export default function Page() {
  return <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Carregando…</div>}><NewLabTestForm /></Suspense>;
}
