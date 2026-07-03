"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Package,
  Save,
  ShieldCheck,
  Tag,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const EDIT_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

const CATEGORIES = [
  "Proteção corporal",
  "Proteção respiratória",
  "Proteção ocular",
  "Proteção das mãos",
  "Proteção dos pés",
  "Proteção da cabeça",
];

const CAT_COLORS: Record<string, { bar: string; chip: string }> = {
  "Proteção corporal":     { bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300" },
  "Proteção respiratória": { bar: "bg-violet-500",  chip: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300" },
  "Proteção ocular":       { bar: "bg-sky-500",     chip: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300" },
  "Proteção das mãos":     { bar: "bg-teal-500",    chip: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300" },
  "Proteção dos pés":      { bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" },
  "Proteção da cabeça":    { bar: "bg-amber-500",   chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300" },
};
const DEFAULT_CAT = { bar: "bg-slate-400", chip: "border-slate-200 bg-slate-50 text-slate-600" };
function catMeta(c: string) { return CAT_COLORS[c] ?? DEFAULT_CAT; }

// ── Design helpers ────────────────────────────────────────────────────────────

function Card({ icon: Icon, title, accent, children }: {
  icon: React.ElementType; title: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <section className="relative z-0 overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm focus-within:z-50 dark:bg-white/5 dark:border-white/10">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-1.5 pl-4">
        <Icon size={11} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-2 p-2.5 pl-3">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-[11px] font-semibold text-foreground">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint  && !error && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditPPEPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [loadingData, setLoadingData] = useState(true);
  const [customId,    setCustomId]    = useState("");

  const [name,           setName]           = useState("");
  const [category,       setCategory]       = useState("");
  const [size,           setSize]           = useState("");
  const [unit,           setUnit]           = useState("");
  const [stockControlled, setStockControlled] = useState(true);
  const [minimumStock,   setMinimumStock]   = useState<string>("0");
  const [currentStock,   setCurrentStock]   = useState<string>("0");
  const [active,         setActive]         = useState(true);

  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<Record<string, any>>(`/clinical_laboratory/ppe/${id}/`)
      .then((d) => {
        setCustomId(d.custom_id ?? "");
        setName(d.name ?? "");
        setCategory(d.category ?? "");
        setSize(d.size ?? "");
        setUnit(d.unit ?? "");
        setStockControlled(d.stock_controlled ?? true);
        setMinimumStock(String(d.minimum_stock ?? 0));
        setCurrentStock(String(d.current_stock ?? 0));
        setActive(d.active ?? true);
      })
      .catch(() => setSaveError("Erro ao carregar EPI."))
      .finally(() => setLoadingData(false));
  }, [id]);

  const cm = catMeta(category);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim())     e.name     = "Nome obrigatório.";
    if (!category.trim()) e.category = "Categoria obrigatória.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      await apiFetch(`/clinical_laboratory/ppe/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name:            name.trim(),
          category:        category.trim(),
          size:            size.trim(),
          unit:            unit.trim(),
          stock_controlled: stockControlled,
          minimum_stock:   Number(minimumStock),
          current_stock:   Number(currentStock),
          active,
        }),
      });
      router.push(`/clinical-laboratory/biosafety/ppe/${id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao guardar alterações.");
    } finally { setSaving(false); }
  }

  if (loadingData) return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
      </div>
    </AppLayout>
  );

  // stock preview
  const minN  = Number(minimumStock);
  const curN  = Number(currentStock);
  const pct   = stockControlled && minN > 0
    ? Math.min(100, Math.round((curN / (minN * 2)) * 100))
    : null;
  const barColor = curN <= 0 ? "bg-red-500" : curN <= minN ? "bg-amber-400" : "bg-emerald-500";

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${cm.bar}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/30`}>
              <ShieldCheck size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Biossegurança</span><span>/</span>
                <span>EPI</span><span>/</span>
                <span className="font-mono">{customId}</span><span>/</span>
                <span className="font-medium text-foreground">Editar</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {name.trim() ? `Editar — ${name}` : "Editar EPI"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {category && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cm.chip}`}>
                    {category}
                  </span>
                )}
                {!active && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    Inactivo
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Guardar alterações
              </button>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        )}

        <div className="grid gap-2 lg:grid-cols-2">

          {/* Identificação */}
          <Card icon={ShieldCheck} title="Identificação" accent={cm.bar}>
            <Field label="Nome do EPI" required error={errors.name}>
              <input type="text" value={name}
                onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, name: "" })); }}
                placeholder="Ex.: Luvas de nitrilo, Máscara FFP2…"
                className={`${inputCls} ${errors.name ? "border-red-300" : ""}`}
              />
            </Field>
            <Field label="Tamanho" hint="Ex.: S, M, L, XL, Único">
              <input type="text" value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="Tamanho / Dimensão"
                className={inputCls}
              />
            </Field>
            <Field label="Unidade" hint="Ex.: par, unidade, caixa de 100">
              <input type="text" value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Unidade de medida"
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Categoria + Estado */}
          <Card icon={Tag} title="Categoria e estado" accent="bg-indigo-500">
            <Field label="Categoria" required error={errors.category}>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => {
                  const m = catMeta(cat);
                  const active_ = category === cat;
                  return (
                    <button key={cat} type="button"
                      onClick={() => { setCategory(cat); setErrors((p) => ({ ...p, category: "" })); }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400/20 ${active_ ? m.chip + " ring-1 ring-current/30 shadow-sm" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                      {cat}
                    </button>
                  );
                })}
              </div>
              {errors.category && <p className="mt-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">{errors.category}</p>}
            </Field>
            <Field label="Estado">
              <div className="flex gap-2">
                {[{ v: true, l: "Activo" }, { v: false, l: "Inactivo" }].map(({ v, l }) => (
                  <button key={String(v)} type="button" onClick={() => setActive(v)}
                    className={`flex-1 rounded-lg border py-1.5 text-[11px] font-medium transition ${active === v ? (v ? "border-emerald-300 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300/40 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-slate-300 bg-slate-100 text-slate-600 ring-1 ring-slate-300/40") : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>
          </Card>

          {/* Stock — full width */}
          <div className="lg:col-span-2">
            <Card icon={Package} title="Gestão de stock" accent="bg-teal-500">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Controlo de stock">
                  <div className="flex gap-2">
                    {[{ v: true, l: "Controlado" }, { v: false, l: "Não controlado" }].map(({ v, l }) => (
                      <button key={String(v)} type="button" onClick={() => setStockControlled(v)}
                        className={`flex-1 rounded-lg border py-1.5 text-[11px] font-medium transition ${stockControlled === v ? (v ? "border-blue-300 bg-blue-50 text-blue-700 ring-1 ring-blue-300/40 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300" : "border-slate-300 bg-slate-100 text-slate-600 ring-1") : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </Field>

                {stockControlled && (
                  <>
                    <div className="space-y-2">
                      <Field label="Stock actual" hint="Número de unidades actualmente disponíveis">
                        <div className="flex items-center gap-2">
                          <button type="button"
                            onClick={() => setCurrentStock(String(Math.max(0, curN - 1)))}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-sm font-bold text-foreground transition hover:bg-muted">−</button>
                          <input type="number" min={0} value={currentStock}
                            onChange={(e) => setCurrentStock(e.target.value)}
                            className={`${inputCls} text-center`} />
                          <button type="button"
                            onClick={() => setCurrentStock(String(curN + 1))}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-sm font-bold text-foreground transition hover:bg-muted">+</button>
                        </div>
                      </Field>
                      <Field label="Stock mínimo" hint="Nível mínimo para alerta de reposição">
                        <div className="flex items-center gap-2">
                          <button type="button"
                            onClick={() => setMinimumStock(String(Math.max(0, minN - 1)))}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-sm font-bold text-foreground transition hover:bg-muted">−</button>
                          <input type="number" min={0} value={minimumStock}
                            onChange={(e) => setMinimumStock(e.target.value)}
                            className={`${inputCls} text-center`} />
                          <button type="button"
                            onClick={() => setMinimumStock(String(minN + 1))}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-sm font-bold text-foreground transition hover:bg-muted">+</button>
                        </div>
                      </Field>
                    </div>

                    {/* live preview */}
                    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Pré-visualização</p>
                      <div className="flex items-end justify-between text-xs">
                        <span className="text-foreground font-bold text-lg">{curN}</span>
                        <span className="text-muted-foreground">/ {minN} mín.</span>
                      </div>
                      {pct !== null && (
                        <>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-border/40">
                            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className={`text-[10px] font-medium ${curN <= 0 ? "text-red-600 dark:text-red-400" : curN <= minN ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {curN <= 0 ? "⚠ Stock esgotado" : curN <= minN ? "⏰ Stock abaixo do mínimo" : "✓ Stock adequado"} · {pct}%
                          </p>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
