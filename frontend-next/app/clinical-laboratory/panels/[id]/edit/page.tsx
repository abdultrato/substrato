"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FlaskConical, ListChecks, Loader2, Save, Search } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

// ── Types ─────────────────────────────────────────────────────────────────────

type LabSector = { id: number; name: string; code: string };
type LabTestLite = { id: number; name: string; code: string; active: boolean; price?: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

const PROFILE_OPTIONS: [string, string][] = [
  ["standard", "Painel padrão"],
  ["occupational", "Perfil ocupacional"],
];

function fmtPrice(val: string | number) {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-PT", { style: "currency", currency: "MZN" });
}

function SectionCard({ icon: Icon, title, right, children }: {
  icon: React.ElementType; title: string; right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Icon size={13} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
          <h2 className="text-xs font-semibold text-foreground">{title}</h2>
        </div>
        {right}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LabPanelEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [sectors, setSectors] = useState<LabSector[]>([]);
  const [allTests, setAllTests] = useState<LabTestLite[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sector, setSector] = useState("");
  const [profileType, setProfileType] = useState("standard");
  const [occupation, setOccupation] = useState("");
  const [active, setActive] = useState(true);
  const [selectedTests, setSelectedTests] = useState<number[]>([]);

  const [testSearch, setTestSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoadingData(true);
      setLoadError(null);
      try {
        const [panelData, sectorsData, testsData] = await Promise.all([
          apiFetch<any>(`/clinical_laboratory/panel/${id}/`),
          apiFetchList<LabSector>("/clinical_laboratory/sector/", { pageSize: 200 }),
          apiFetchList<LabTestLite>("/clinical_laboratory/test/", { pageSize: 500 }),
        ]);
        setSectors(sectorsData.items);
        setAllTests(testsData.items);
        setName(panelData.name ?? "");
        setCode(panelData.code ?? "");
        setSector(String(panelData.sector ?? ""));
        setProfileType(panelData.profile_type ?? "standard");
        setOccupation(panelData.occupation ?? "");
        setActive(panelData.active ?? true);
        setSelectedTests(Array.isArray(panelData.tests) ? panelData.tests : []);
      } catch (e: any) {
        setLoadError(e?.message || "Erro ao carregar dados.");
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [id]);

  const filteredTests = useMemo(() => {
    const q = testSearch.trim().toLowerCase();
    if (!q) return allTests;
    return allTests.filter((t) =>
      t.name.toLowerCase().includes(q) || (t.code ?? "").toLowerCase().includes(q));
  }, [allTests, testSearch]);

  const derivedPrice = useMemo(() => {
    return selectedTests.reduce((sum, tid) => {
      const t = allTests.find((x) => x.id === tid);
      return sum + (t?.price ? parseFloat(t.price) : 0);
    }, 0);
  }, [selectedTests, allTests]);

  function toggleTest(testId: number) {
    setSelectedTests((prev) =>
      prev.includes(testId) ? prev.filter((x) => x !== testId) : [...prev, testId]);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome obrigatório.";
    if (!code.trim()) e.code = "Código obrigatório.";
    if (profileType === "occupational" && !occupation.trim()) e.occupation = "Função obrigatória para perfil ocupacional.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiFetch(`/clinical_laboratory/panel/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim(),
          sector: sector ? Number(sector) : null,
          profile_type: profileType,
          occupation: profileType === "occupational" ? occupation.trim() : "",
          active,
          tests: selectedTests,
        }),
      });
      router.push(`/clinical-laboratory/panels/${id}`);
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
                <ListChecks size={16} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Editar painel</h1>
                <p className="text-[11px] text-muted-foreground font-mono">#{id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.push(`/clinical-laboratory/panels/${id}`)}
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
            <SectionCard icon={ListChecks} title="Identificação">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome" required error={errors.name}>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Código" required error={errors.code}>
                  <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Tipo de perfil">
                  <select value={profileType} onChange={(e) => setProfileType(e.target.value)} className={inputCls}>
                    {PROFILE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Sector">
                  <select value={sector} onChange={(e) => setSector(e.target.value)} className={inputCls}>
                    <option value="">— Sem sector —</option>
                    {sectors.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                  </select>
                </Field>
              </div>
              {profileType === "occupational" && (
                <Field label="Função / tipo de trabalho" required error={errors.occupation}>
                  <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Ex.: Operador de máquinas" className={inputCls} />
                </Field>
              )}
              <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-violet-600" />
                Painel ativo (disponível no catálogo)
              </label>
            </SectionCard>

            {/* Exames incluídos */}
            <SectionCard icon={FlaskConical}
              title={`Exames incluídos · ${selectedTests.length}`}
              right={<span className="text-xs font-semibold text-foreground">{fmtPrice(derivedPrice)}</span>}>
              <p className="text-[11px] text-muted-foreground">
                O preço do pacote é recalculado automaticamente a partir dos exames selecionados.
              </p>
              <div className="relative">
                <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={testSearch} onChange={(e) => setTestSearch(e.target.value)}
                  placeholder="Procurar exame por nome ou código…"
                  className="h-9 w-full rounded-lg border border-border bg-background pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25" />
              </div>
              <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                {filteredTests.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">Nenhum exame encontrado.</p>
                ) : (
                  filteredTests.map((t) => {
                    const checked = selectedTests.includes(t.id);
                    return (
                      <label key={t.id}
                        className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 transition ${
                          checked
                            ? "border-violet-300/60 bg-violet-50/60 dark:border-violet-500/30 dark:bg-violet-900/15"
                            : "border-border/50 bg-background/40 hover:bg-muted/40"
                        }`}>
                        <span className="flex min-w-0 items-center gap-2.5">
                          <input type="checkbox" checked={checked} onChange={() => toggleTest(t.id)}
                            className="h-4 w-4 shrink-0 rounded border-border accent-violet-600" />
                          <span className="min-w-0">
                            <span className="block text-[10px] font-mono text-muted-foreground">{t.code}</span>
                            <span className="block truncate text-xs font-medium text-foreground">{t.name}</span>
                          </span>
                        </span>
                        {t.price != null && (
                          <span className="shrink-0 text-[11px] text-muted-foreground">{fmtPrice(t.price)}</span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </SectionCard>
          </>
        )}

      </form>
    </AppLayout>
  );
}
