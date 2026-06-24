"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FlaskConical, Loader2, Save } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";
import { LAB_METHOD_OPTIONS } from "@/lib/clinicalLabMethods";

// ── Types ─────────────────────────────────────────────────────────────────────

type LabSector = { id: number; name: string; code: string };
type LabContainerType = { id: number; code: string; name: string; cap_color_display: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

const SAMPLE_OPTIONS = [
  ["SANGUE_TOTAL", "Sangue total"], ["SORO", "Soro"], ["PLASMA", "Plasma"],
  ["URINA", "Urina"], ["FEZES", "Fezes"], ["ESCARRO", "Escarro"],
  ["LCR", "Líquor (LCR)"], ["ZARAGATOA", "Zaragatoa/Swab"], ["SEMEN", "Sémen"],
  ["MEDULA", "Medula óssea"], ["LIQUIDO", "Líquido biológico"], ["OUTRO", "Outro"],
];

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
        <Icon size={13} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

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

const inputCls = "w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25";
const checkboxCls = "h-4 w-4 rounded border-border accent-violet-600";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LabTestEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [sectors, setSectors] = useState<LabSector[]>([]);
  const [containerTypes, setContainerTypes] = useState<LabContainerType[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sector, setSector] = useState("");
  const [sampleType, setSampleType] = useState("SORO");
  const [containerType, setContainerType] = useState<string>(""); // stores container type ID (number as string) or ""
  const [method, setMethod] = useState("");
  const [price, setPrice] = useState("0.00");
  const [turnaroundHours, setTurnaroundHours] = useState("24");
  const [requiresFasting, setRequiresFasting] = useState(false);
  const [requiresConsent, setRequiresConsent] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoadingData(true);
      setLoadError(null);
      try {
        const [testData, sectorsData, containersData] = await Promise.all([
          apiFetch<any>(`/clinical_laboratory/test/${id}/`),
          apiFetchList<LabSector>("/clinical_laboratory/sector/", { pageSize: 200 }),
          apiFetchList<LabContainerType>("/clinical_laboratory/container_type/", { pageSize: 200 }),
        ]);
        setSectors(sectorsData.items);
        setContainerTypes(containersData.items);
        setName(testData.name ?? "");
        setCode(testData.code ?? "");
        setSector(String(testData.sector ?? ""));
        setSampleType(testData.sample_type ?? "SORO");
        setContainerType(testData.container_type ? String(testData.container_type) : "");
        setMethod(testData.method ?? "");
        setPrice(testData.price ?? "0.00");
        setTurnaroundHours(String(testData.turnaround_hours ?? 24));
        setRequiresFasting(testData.requires_fasting ?? false);
        setRequiresConsent(testData.requires_consent ?? false);
      } catch (e: any) {
        setLoadError(e?.message || "Erro ao carregar dados.");
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [id]);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome obrigatório.";
    if (!code.trim()) e.code = "Código obrigatório.";
    if (!sector) e.sector = "Sector obrigatório.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiFetch(`/clinical_laboratory/test/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(), code: code.trim(), sector: Number(sector),
          sample_type: sampleType, container_type: containerType ? Number(containerType) : null,
          method: method.trim(),
          price, turnaround_hours: Number(turnaroundHours) || 24,
          requires_fasting: requiresFasting, requires_consent: requiresConsent,
        }),
      });
      router.push(`/clinical-laboratory/tests/${id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao guardar alterações.");
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
                <h1 className="text-lg font-bold leading-tight text-foreground">Editar exame</h1>
                <p className="text-[11px] text-muted-foreground font-mono">#{id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.push(`/clinical-laboratory/tests/${id}`)}
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
            <SectionCard icon={FlaskConical} title="Identificação">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome" required error={errors.name}>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Código" required error={errors.code}>
                  <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} />
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
              <Field label="Tipo de tubo/recipiente" hint="Recipiente utilizado para a coleta da amostra">
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
                  {method && !LAB_METHOD_OPTIONS.some(([v]) => v === method) && (
                    <option value={method}>{method}</option>
                  )}
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

            {/* Preço e prazo */}
            <SectionCard icon={FlaskConical} title="Preço e prazo">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Preço (MZN)">
                  <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Tempo de resposta (horas)">
                  <input type="number" min="1" value={turnaroundHours} onChange={(e) => setTurnaroundHours(e.target.value)} className={inputCls} />
                </Field>
              </div>
            </SectionCard>
          </>
        )}

      </form>
    </AppLayout>
  );
}
