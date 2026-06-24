"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FlaskConical, Loader2, Save } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

const UNIT_OPTIONS = [
  "", "g/dl", "g/L", "mg/dl", "mg/L", "mg/24h", "µg/dL", "µg/L", "µg/mL",
  "ng/mL", "ng/dL", "pg/mL", "mmol/l", "mmol/mol", "µmol/l", "nmol/L", "pmol/L",
  "mEq/L", "cel/mm3", "x10³/µl", "x10⁶/µL", "%", "u/l", "U/mL", "UI/L", "UI/mL",
  "mUI/L", "kU/L", "p/µL", "ph", "fl", "pg", "mm/h",
  "ovos/g", "ovos/10mL", "parasitas/µL", "parasitas/campo", "cistos/campo", "larvas/campo",
  "Ct", "cópias/mL", "cópias/reação", "log10", "% alelo", "% IS", "genótipo", "traços/detectado",
  "S/CO", "mUI/mL", "título", "index",
  "UFC/mL", "UFC/g", "UFC/placa", "horas", "S/I/R", "mm", "cruzes", "campo",
  "células/campo", "mL/24h", "mL/min", "mg/g creatinina", "densidade",
  "µUI/mL", "% risco",
  "segundos", "minutos", "ratio", "ng/mL FEU", "µg/mL FEU", "mg/L FEU",
  "mmHg", "mOsm/kg", "s", "INR", "razão/índice", "sem unidade",
];

const inputCls = "w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25";

function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
        <FlaskConical size={13} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

export default function TestFieldEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [testId, setTestId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [unit, setUnit] = useState("");
  const [referenceRange, setReferenceRange] = useState("");
  const [referenceLow, setReferenceLow] = useState("");
  const [referenceHigh, setReferenceHigh] = useState("");
  const [criticalLow, setCriticalLow] = useState("");
  const [criticalHigh, setCriticalHigh] = useState("");
  const [sequence, setSequence] = useState("0");
  const [resultType, setResultType] = useState("numero");
  const [resultChoices, setResultChoices] = useState<string[]>([]);
  const [choiceInput, setChoiceInput] = useState("");

  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoadingData(true);
      setLoadError(null);
      try {
        const data = await apiFetch<any>(`/clinical_laboratory/test_field/${id}/`);
        setTestId(data.test ?? null);
        setName(data.name ?? "");
        setCode(data.code ?? "");
        setUnit(data.unit ?? "");
        setReferenceRange(data.reference_range ?? "");
        setReferenceLow(data.reference_low ?? "");
        setReferenceHigh(data.reference_high ?? "");
        setCriticalLow(data.critical_low ?? "");
        setCriticalHigh(data.critical_high ?? "");
        setSequence(String(data.sequence ?? 0));
        setResultType(data.result_type ?? "numero");
        setResultChoices(data.result_choices ?? []);
      } catch (e: any) {
        setLoadError(e?.message || "Erro ao carregar campo.");
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [id]);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome obrigatório.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiFetch(`/clinical_laboratory/test_field/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim(),
          unit: resultType === "numero" ? unit.trim() : "",
          reference_range: resultType === "numero" ? referenceRange.trim() : "",
          reference_low: resultType === "numero" ? (referenceLow || null) : null,
          reference_high: resultType === "numero" ? (referenceHigh || null) : null,
          critical_low: resultType === "numero" ? (criticalLow || null) : null,
          critical_high: resultType === "numero" ? (criticalHigh || null) : null,
          result_type: resultType,
          result_choices: resultChoices,
          sequence: Number(sequence) || 0,
        }),
      });
      router.push(testId ? `/clinical-laboratory/tests/${testId}` : "/clinical-laboratory/tests");
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao guardar alterações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-xl space-y-3">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <FlaskConical size={16} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Editar campo</h1>
                <p className="text-[11px] text-muted-foreground font-mono">
                  #{id}{testId ? ` · Exame #${testId}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button"
                onClick={() => router.push(testId ? `/clinical-laboratory/tests/${testId}` : "/clinical-laboratory/tests")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving || loadingData}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar
              </button>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        )}

        {loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-800">
            {loadError}
          </div>
        ) : loadingData ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/25 py-16 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Carregando dados…</span>
          </div>
        ) : (
          <>
            {/* Identificação */}
            <SectionCard title="Identificação do campo">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome" required error={errors.name}>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Hemoglobina" className={inputCls} autoFocus />
                </Field>
                <Field label="Código">
                  <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
                    placeholder="Ex.: HB" className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Tipo de resultado">
                  <select value={resultType} onChange={(e) => { setResultType(e.target.value); setResultChoices([]); }} className={inputCls}>
                    <option value="numero">Número</option>
                    <option value="texto">Texto livre</option>
                    <option value="texto_choice">Escolha (lista)</option>
                  </select>
                </Field>
                <Field label="Ordem de exibição">
                  <input type="number" min="0" value={sequence} onChange={(e) => setSequence(e.target.value)}
                    className={inputCls} />
                </Field>
              </div>
              {resultType === "numero" && (
                <Field label="Unidade">
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
                    <option value="">— Sem unidade —</option>
                    {UNIT_OPTIONS.filter(Boolean).map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
              )}
            </SectionCard>

            {/* Opções (texto_choice) */}
            {resultType === "texto_choice" && (
              <SectionCard title="Opções de escolha">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Qualitativo", choices: ["Negativo", "Positivo", "Indeterminado"] },
                      { label: "Titulação", choices: ["Reativo 80", "Reativo 160", "Reativo 240", "Reativo 320", "Não Reativo"] },
                      { label: "Semiquantitativo", choices: ["Reativo +", "Reativo ++", "Reativo +++"] },
                    ].map((p) => (
                      <button key={p.label} type="button" onClick={() => setResultChoices(p.choices)}
                        className="inline-flex h-7 items-center rounded-lg border border-violet-200 px-3 text-xs text-violet-700 hover:bg-violet-50 dark:border-violet-700/40 dark:text-violet-300 dark:hover:bg-violet-900/20 transition">
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {resultChoices.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {resultChoices.map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                          {c}
                          <button type="button" onClick={() => setResultChoices(resultChoices.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-red-500 transition">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input type="text" value={choiceInput} onChange={(e) => setChoiceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const v = choiceInput.trim();
                          if (v && !resultChoices.includes(v)) setResultChoices([...resultChoices, v]);
                          setChoiceInput("");
                        }
                      }}
                      placeholder="Adicionar opção e pressionar Enter…" className={inputCls} />
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Valores de referência */}
            {resultType === "numero" && (
              <SectionCard title="Valores de referência e críticos">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-3">
                    <p className="text-[11px] font-semibold text-foreground">Intervalo de referência</p>
                    <Field label="Mín.">
                      <input type="number" step="any" value={referenceLow} onChange={(e) => setReferenceLow(e.target.value)} placeholder="—" className={inputCls} />
                    </Field>
                    <Field label="Máx.">
                      <input type="number" step="any" value={referenceHigh} onChange={(e) => setReferenceHigh(e.target.value)} placeholder="—" className={inputCls} />
                    </Field>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50/40 p-3 space-y-3 dark:border-red-700/30 dark:bg-red-900/10">
                    <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">Limiar crítico (pânico)</p>
                    <Field label="Mín. crítico">
                      <input type="number" step="any" value={criticalLow} onChange={(e) => setCriticalLow(e.target.value)} placeholder="—" className={inputCls} />
                    </Field>
                    <Field label="Máx. crítico">
                      <input type="number" step="any" value={criticalHigh} onChange={(e) => setCriticalHigh(e.target.value)} placeholder="—" className={inputCls} />
                    </Field>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Quando o resultado atingir o limiar crítico, é gerado automaticamente um alerta de resultado crítico (pânico).
                </p>
              </SectionCard>
            )}
          </>
        )}

      </form>
    </AppLayout>
  );
}
