"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FlaskConical,
  Loader2,
  Save,
  Search,
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

interface LabExam {
  id: number; custom_id: string; name: string;
  turnaround_hours: number; price: string; vat_percentage: string;
  applies_vat_by_default: boolean; method: string; sector: string;
  sample_type: number | null; sample_type_name: string | null;
  sample_options: number[];
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

export default function EditExamPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loadingData, setLoadingData] = useState(true);
  const [name, setName] = useState("");
  const [sector, setSector] = useState("Bioquimica");
  const [method, setMethod] = useState("");
  const [price, setPrice] = useState("");
  const [vatPct, setVatPct] = useState("16.00");
  const [appliesVat, setAppliesVat] = useState(true);
  const [tat, setTat] = useState("24");
  const [sampleTypeId, setSampleTypeId] = useState<number | null>(null);
  const [sampleTypeLabel, setSampleTypeLabel] = useState("");

  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<LabExam>(`/clinical/lab-exams/${id}/`)
      .then((exam) => {
        setName(exam.name ?? "");
        setSector(exam.sector ?? "Bioquimica");
        setMethod(exam.method ?? "");
        setPrice(exam.price ?? "");
        setVatPct(exam.vat_percentage ?? "16.00");
        setAppliesVat(exam.applies_vat_by_default ?? true);
        setTat(String(exam.turnaround_hours ?? 24));
        if (exam.sample_type) { setSampleTypeId(exam.sample_type); setSampleTypeLabel(exam.sample_type_name ?? ""); }
      })
      .catch(() => setSaveError("Erro ao carregar exame."))
      .finally(() => setLoadingData(false));
  }, [id]);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome obrigatório.";
    if (!price || Number(price) <= 0) e.price = "Preço deve ser maior que zero.";
    if (!sampleTypeId) e.sample_type = "Amostra obrigatória.";
    if (!tat || Number(tat) <= 0) e.tat = "Tempo de resposta deve ser maior que zero.";
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
          name: name.trim(), sector, method,
          price, vat_percentage: vatPct,
          applies_vat_by_default: appliesVat,
          turnaround_hours: Number(tat),
          sample_type: sampleTypeId,
        }),
      });
      router.push(`/exams/${id}`);
    } catch (err: unknown) {
      setSaveError((err as { message?: string })?.message || "Erro ao guardar exame.");
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
          <div className="grid gap-2 lg:grid-cols-2">

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

            <Card title="Amostra e TAT" accent="bg-cyan-500">
              <Field label="Amostra principal" required error={errors.sample_type}>
                <RelationSelect target={T_SAMPLE} value={sampleTypeId}
                  onChange={(v, lbl) => { setSampleTypeId(v); setSampleTypeLabel(lbl); setErrors((p) => ({ ...p, sample_type: "" })); }}
                  placeholder="Pesquisar amostra…" />
                {sampleTypeId && !sampleTypeLabel && (
                  <p className="text-[10px] text-muted-foreground">Amostra seleccionada (ID: {sampleTypeId})</p>
                )}
              </Field>
              <Field label="Tempo de resposta (horas)" required error={errors.tat}>
                <input type="number" min="1" value={tat} onChange={(e) => setTat(e.target.value)}
                  className={inputCls} />
              </Field>
            </Card>

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
        )}
      </form>
    </AppLayout>
  );
}
