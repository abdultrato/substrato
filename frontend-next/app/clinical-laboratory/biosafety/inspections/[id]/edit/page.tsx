"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Loader2,
  MapPin,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  User,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

const EDIT_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Choices ───────────────────────────────────────────────────────────────────

const STATUS_CHOICES = [
  { value: "PLANEADA",            label: "Planeada" },
  { value: "CONCLUIDA",           label: "Concluída" },
  { value: "ACHADOS_ABERTOS",     label: "Achados em aberto" },
  { value: "CORRETIVA_REQUERIDA", label: "Ação corretiva requerida" },
  { value: "FECHADA",             label: "Fechada" },
];
const STATUS_BAR: Record<string, string> = {
  PLANEADA:            "bg-sky-400",
  CONCLUIDA:           "bg-emerald-500",
  ACHADOS_ABERTOS:     "bg-amber-400",
  CORRETIVA_REQUERIDA: "bg-orange-500",
  FECHADA:             "bg-slate-400",
};
const STATUS_COLOR: Record<string, string> = {
  PLANEADA:            "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300",
  CONCLUIDA:           "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  ACHADOS_ABERTOS:     "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  CORRETIVA_REQUERIDA: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",
  FECHADA:             "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-400",
};

const CHECKLIST_TEMPLATES = [
  "EPI disponível e em bom estado",
  "Câmara de segurança biológica em funcionamento",
  "Sinalização de biossegurança afixada",
  "Contentor de resíduos biológicos identificado",
  "Solução desinfectante preparada e dentro do prazo",
  "Registo de temperatura do frigorífico actualizado",
  "Kit de derramamento disponível",
  "Autoclave com registo de ciclo actualizado",
  "Saídas de emergência desobstruídas",
  "Extintores dentro do prazo de validade",
  "Luvas descartáveis disponíveis em quantidade suficiente",
  "Máscaras N95/FFP2 disponíveis para agentes de risco 3",
  "Óculos de protecção disponíveis",
  "Batas de protecção em stock adequado",
  "Rótulos de biossegurança visíveis nos contentores",
];

// ── Types ─────────────────────────────────────────────────────────────────────

type ChecklistItem = { id: string; label: string; checked: boolean };

// ── RelationTarget ────────────────────────────────────────────────────────────

const T_USER: RelationTarget = {
  endpoint: "/identity/user/",
  labelFields: ["username", "first_name", "last_name"],
};

// ── RelationSelect ────────────────────────────────────────────────────────────

function RelationSelect({
  value, onChange, target, placeholder, safeRefreshToken, initialLabel = "",
}: {
  value: number | null;
  onChange: (v: number | null, label: string) => void;
  target: RelationTarget;
  placeholder?: string;
  safeRefreshToken?: number;
  initialLabel?: string;
}) {
  const [query, setQuery]     = useState("");
  const [label, setLabel]     = useState(initialLabel);
  const [open, setOpen]       = useState(false);
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();

  useEffect(() => { if (initialLabel) setLabel(initialLabel); }, [initialLabel]);

  function search(q: string) {
    setQuery(q); setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { items } = await apiFetchList<Record<string, any>>(target.endpoint, {
          page: 1, pageSize: 20,
          query: { ...(target.staticFilters ?? {}), ...(q.trim() ? { search: q.trim() } : {}) },
        });
        setResults(relationOptionsFromRows(items, target));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 250);
  }

  function select(opt: { value: string; label: string }) {
    onChange(Number(opt.value), opt.label);
    setLabel(opt.label); setQuery(""); setOpen(false);
  }
  function clear() { onChange(null, ""); setLabel(""); setQuery(""); }

  return (
    <div className="space-y-1.5">
      {value !== null && label && (
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
            {label}
            <button type="button" onClick={clear} className="ml-0.5 text-emerald-400 hover:text-red-500 transition">
              <X size={9} />
            </button>
          </span>
        </div>
      )}
      {(value === null || !label) && (
        <div className="relative z-[999]">
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => { setOpen(true); if (!query) search(""); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
          />
          {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {open && (
            <div id={listboxId} role="listbox"
              className="absolute left-0 right-0 z-[999] mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {results.length === 0
                ? <p className="px-3 py-2 text-[11px] text-muted-foreground">{searching ? "A pesquisar…" : "Nenhum resultado."}</p>
                : (
                  <ul className="max-h-48 overflow-y-auto divide-y divide-border/40">
                    {results.map((opt) => (
                      <li key={opt.value}>
                        <button type="button" onMouseDown={() => select(opt)}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-muted">
                          {opt.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ChecklistBuilder ──────────────────────────────────────────────────────────

function ChecklistBuilder({ items, onChange }: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  function addItem(label: string) {
    if (!label.trim()) return;
    onChange([...items, { id: crypto.randomUUID(), label: label.trim(), checked: false }]);
    setNewLabel(""); setShowTemplates(false);
  }
  function toggle(id: string) {
    onChange(items.map((i) => i.id === id ? { ...i, checked: !i.checked } : i));
  }
  function remove(id: string) { onChange(items.filter((i) => i.id !== id)); }

  const checked = items.filter((i) => i.checked).length;
  const pct     = items.length > 0 ? Math.round((checked / items.length) * 100) : 0;
  const pctColor = pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{checked}/{items.length} verificados</span><span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/50">
            <div className={`h-1.5 rounded-full transition-all ${pctColor}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="grid gap-1 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.id}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition ${item.checked ? "border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-900/10" : "border-border bg-background"}`}>
            <button type="button" onClick={() => toggle(item.id)}
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${item.checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-background hover:border-emerald-400"}`}>
              {item.checked && (
                <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className={`flex-1 text-[11px] leading-snug ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {item.label}
            </span>
            <button type="button" onClick={() => remove(item.id)}
              className="text-muted-foreground/40 transition hover:text-red-500">
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>

      <div className="relative">
        <div className="flex gap-1.5">
          <input type="text" value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(newLabel); } }}
            placeholder="Adicionar item ao checklist…"
            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          <button type="button" onClick={() => addItem(newLabel)} disabled={!newLabel.trim()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-40">
            <Plus size={12} />
          </button>
          <button type="button" onClick={() => setShowTemplates((s) => !s)}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[10px] text-muted-foreground transition hover:bg-muted">
            Modelos
          </button>
        </div>
        {showTemplates && (
          <div className="absolute left-0 right-0 z-[999] mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            <p className="border-b border-border/50 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">Itens predefinidos</p>
            <ul className="max-h-52 overflow-y-auto divide-y divide-border/40">
              {CHECKLIST_TEMPLATES.filter((t) => !items.some((i) => i.label === t)).map((t) => (
                <li key={t}>
                  <button type="button" onMouseDown={() => { addItem(t); setShowTemplates(false); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-foreground transition hover:bg-muted">
                    <Plus size={9} className="shrink-0 text-emerald-500" /> {t}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Design helpers ────────────────────────────────────────────────────────────

function Card({ icon: Icon, title, children, accent }: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: string;
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

const inputCls    = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25";
const textareaCls = inputCls + " resize-none";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditBiosafetyInspectionPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [area,           setArea]           = useState("");
  const [inspector,      setInspector]      = useState<number | null>(null);
  const [inspectorLabel, setInspectorLabel] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [status,         setStatus]         = useState("PLANEADA");
  const [checklist,      setChecklist]      = useState<ChecklistItem[]>([]);
  const [findings,       setFindings]       = useState("");

  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState<string | null>(null);

  // ── load ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoadingDoc(true);
    apiFetch<any>(`/clinical_laboratory/biosafety_inspection/${id}/`)
      .then((doc) => {
        setArea(doc.area ?? "");
        setInspector(doc.inspector ?? null);
        setInspectorLabel(doc.inspector_detail?.name ?? "");
        setInspectionDate(doc.inspection_date ?? "");
        setStatus(doc.status ?? "PLANEADA");
        setFindings(doc.findings ?? "");

        // parse checklist — may be array or JSON string
        let cl: { label: string; checked: boolean }[] = [];
        if (Array.isArray(doc.checklist)) {
          cl = doc.checklist;
        } else if (typeof doc.checklist === "string") {
          try { cl = JSON.parse(doc.checklist); } catch { cl = []; }
        }
        setChecklist(cl.map((i) => ({ ...i, id: crypto.randomUUID() })));
      })
      .catch((e) => setLoadError(e?.message ?? "Erro ao carregar inspecção."))
      .finally(() => setLoadingDoc(false));
  }, [id]);

  const currentStatus = STATUS_CHOICES.find((s) => s.value === status);
  const checkedCount  = checklist.filter((i) => i.checked).length;

  function validate() {
    const e: Record<string, string> = {};
    if (!area.trim())    e.area = "Área obrigatória.";
    if (!inspectionDate) e.date = "Data obrigatória.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      await apiFetch(`/clinical_laboratory/biosafety_inspection/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          area:            area.trim(),
          inspector:       inspector ?? null,
          inspection_date: inspectionDate,
          status,
          checklist:       checklist.map(({ label, checked }) => ({ label, checked })),
          findings:        findings.trim(),
        }),
      });
      router.push(`/clinical-laboratory/biosafety/inspections/${id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao guardar inspecção.");
    } finally { setSaving(false); }
  }

  if (loadingDoc) return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    </AppLayout>
  );

  if (loadError) return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
        {loadError}
      </div>
    </AppLayout>
  );

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="absolute -bottom-6 left-8 h-20 w-20 rounded-full bg-teal-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${STATUS_BAR[status] ?? "bg-emerald-500"}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/30">
              <Shield size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Biossegurança</span><span>/</span>
                <span>Inspecções</span><span>/</span>
                <span className="font-medium text-foreground">Editar</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {area.trim() ? `Inspecção — ${area}` : "Editar inspecção"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {currentStatus && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[status]}`}>
                    {currentStatus.label}
                  </span>
                )}
                {inspectionDate && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <CalendarDays size={9} />
                    {new Date(inspectionDate + "T00:00:00").toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                )}
                {checklist.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <CheckSquare size={9} /> {checkedCount}/{checklist.length}
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
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50">
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

          {/* Área + data */}
          <Card icon={MapPin} title="Área inspeccionada" accent="bg-emerald-500">
            <Field label="Área / local" required error={errors.area}
              hint="Ex.: Laboratório de Microbiologia, Sala de colheitas">
              <input type="text" value={area}
                onChange={(e) => { setArea(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, area: "" })); }}
                placeholder="Nome da área inspeccionada"
                className={`${inputCls} ${errors.area ? "border-red-300 focus:border-red-400" : ""}`}
              />
            </Field>
            <Field label="Data da inspecção" required error={errors.date}>
              <input type="date" value={inspectionDate}
                onChange={(e) => { setInspectionDate(e.target.value); if (e.target.value) setErrors((p) => ({ ...p, date: "" })); }}
                className={`${inputCls} ${errors.date ? "border-red-300 focus:border-red-400" : ""}`}
              />
            </Field>
          </Card>

          {/* Inspector + Estado */}
          <Card icon={User} title="Inspector e estado" accent="bg-teal-500">
            <Field label="Inspector">
              <RelationSelect
                value={inspector}
                onChange={(v, l) => { setInspector(v); setInspectorLabel(l); }}
                target={T_USER}
                placeholder="Pesquisar utilizador…"
                safeRefreshToken={safeRefreshToken}
                initialLabel={inspectorLabel}
              />
            </Field>
            <Field label="Estado">
              <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {STATUS_CHOICES.map(({ value, label }) => {
                  const isActive = status === value;
                  return (
                    <button key={value} type="button" onClick={() => setStatus(value)}
                      className={`relative overflow-hidden rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${isActive ? STATUS_COLOR[value] + " ring-1 ring-current/30" : "border-border bg-background hover:bg-muted"}`}>
                      <span className={`absolute inset-y-0 left-0 w-0.5 ${STATUS_BAR[value]}`} />
                      <span className={`block pl-1.5 font-semibold ${isActive ? "" : "text-foreground"}`}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </Field>
          </Card>

          {/* Checklist — full width */}
          <div className="lg:col-span-2">
            <Card icon={ClipboardList} title="Checklist de biossegurança" accent="bg-sky-500">
              <ChecklistBuilder items={checklist} onChange={setChecklist} />
            </Card>
          </div>

          {/* Achados — full width */}
          <div className="lg:col-span-2">
            <Card icon={AlertTriangle} title="Achados e observações" accent="bg-amber-400">
              <Field label="Descrição dos achados / não conformidades detectadas">
                <textarea value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  placeholder="Descreva os problemas identificados durante a inspecção, se aplicável…"
                  rows={5}
                  className={textareaCls}
                />
              </Field>
            </Card>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
