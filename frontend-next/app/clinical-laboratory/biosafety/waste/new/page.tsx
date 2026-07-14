"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Package,
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

const WASTE_TYPES = [
  { value: "BIOLOGICO",        label: "Biológico",         emoji: "🧫", bar: "bg-violet-500",  chip: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",   grad: "from-violet-500 to-purple-600",   glow: "shadow-violet-500/30" },
  { value: "PERFUROCORTANTE",  label: "Perfurocortante",   emoji: "🩺", bar: "bg-red-500",      chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",                     grad: "from-red-500 to-rose-600",         glow: "shadow-red-500/30"    },
  { value: "QUIMICO",          label: "Químico",            emoji: "⚗️",  bar: "bg-amber-500",   chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",          grad: "from-amber-500 to-orange-600",    glow: "shadow-amber-500/30"  },
  { value: "GERAL",            label: "Geral",              emoji: "🗑️",  bar: "bg-slate-400",   chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-300",          grad: "from-slate-400 to-slate-500",     glow: "shadow-slate-400/30"  },
  { value: "INFECCIOSO",       label: "Infeccioso",         emoji: "☣️",  bar: "bg-orange-500",  chip: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",    grad: "from-orange-500 to-red-500",      glow: "shadow-orange-500/30" },
  { value: "ANATOMICO",        label: "Anatómico",          emoji: "🫀", bar: "bg-pink-500",    chip: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-700/40 dark:bg-pink-900/20 dark:text-pink-300",                 grad: "from-pink-500 to-rose-500",       glow: "shadow-pink-500/30"   },
  { value: "CULTURA",          label: "Cultura",            emoji: "🔬", bar: "bg-teal-500",    chip: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300",                 grad: "from-teal-500 to-emerald-600",    glow: "shadow-teal-500/30"   },
  { value: "REAGENTE_VENCIDO", label: "Reagente vencido",  emoji: "🧪", bar: "bg-yellow-500",  chip: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-700/40 dark:bg-yellow-900/20 dark:text-yellow-300",    grad: "from-yellow-500 to-amber-500",    glow: "shadow-yellow-500/30" },
] as const;

const STATUSES = [
  { value: "GERADO",     label: "Gerado",             bar: "border-l-blue-400"   },
  { value: "ARMAZENADO", label: "Armazenado",         bar: "border-l-indigo-400" },
  { value: "RECOLHIDO",  label: "Recolhido",          bar: "border-l-amber-400"  },
  { value: "TRATADO",    label: "Tratado",            bar: "border-l-teal-400"   },
  { value: "DESCARTADO", label: "Descartado",         bar: "border-l-emerald-400"},
  { value: "INCIDENTE",  label: "Incidente reportado",bar: "border-l-red-500"    },
];

const STATUS_CHIP: Record<string, string> = {
  GERADO:     "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
  ARMAZENADO: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300",
  RECOLHIDO:  "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  TRATADO:    "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300",
  DESCARTADO: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  INCIDENTE:  "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
};

const DEPARTMENTS = [
  "Laboratório Clínico","Banco de Sangue","Microbiologia","Imunologia","Bioquímica",
  "Hematologia","Urgência","Bloco Operatório","UCI","Maternidade","Farmácia",
  "Radiologia","Anatomia Patológica","Sala de Colheitas","Consulta Externa",
];
const CONTAINERS = [
  "Saco vermelho (biológico)","Caixa amarela (perfurocortantes)","Saco preto (geral)",
  "Contentor laranja (químico)","Saco branco (farmacêutico)","Frasco de vidro âmbar",
  "Bidão PEAD 10L","Bidão PEAD 30L","Caixa de cartão reforçado","Saco azul (reciclável)",
];
const DISPOSAL_METHODS = [
  "Incineração","Autoclavagem + aterro","Tratamento químico","Aterro sanitário autorizado",
  "Empresa de gestão de resíduos hospitalares","Desactivação química","Co-incineração",
  "Recolha pela entidade gestora (SIGMED)","Neutralização + aterro",
];
const STORAGE_LOCATIONS = [
  "Sala de resíduos — R/C","Sala de resíduos — 1.º andar","Armazenamento temporário laboratório",
  "Câmara frigorífica de resíduos","Contentor exterior (pátio)","Armazém de produtos químicos",
];
const FILL_LEVELS = ["25%","50%","75%","Cheio (100%) — trocar contentor"];

const T_USER: RelationTarget = { endpoint: "/identity/user/", labelFields: ["username","first_name","last_name"] };

// ── Inline RelationSelect ─────────────────────────────────────────────────────
function RelationSelect({ value, onChange, target, placeholder }: {
  value: number | null; onChange: (v: number | null, label: string) => void;
  target: RelationTarget; placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [label, setLabel] = useState("");
  const [open,  setOpen]  = useState(false);
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lbId   = useId();

  function search(q: string) {
    setQuery(q); setOpen(true);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
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
    onChange(Number(opt.value), opt.label); setLabel(opt.label); setQuery(""); setOpen(false);
  }
  function clear() { onChange(null, ""); setLabel(""); }

  return (
    <div className="space-y-1.5">
      {value !== null && (
        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-medium text-cyan-700 dark:border-cyan-700/40 dark:bg-cyan-900/20 dark:text-cyan-300">
          {label}
          <button type="button" onClick={clear} className="ml-0.5 text-cyan-400 hover:text-cyan-600 transition"><X size={9} /></button>
        </span>
      )}
      {value === null && (
        <div className="relative z-[999]">
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => { setOpen(true); if (!query) search(""); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
          />
          {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {open && (
            <div id={lbId} role="listbox" className="absolute left-0 right-0 z-[999] mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {results.length === 0
                ? <p className="px-3 py-2 text-[11px] text-muted-foreground">{searching ? "A pesquisar…" : "Nenhum resultado."}</p>
                : <ul className="max-h-48 overflow-y-auto divide-y divide-border/40">
                    {results.map((opt) => (
                      <li key={opt.value}>
                        <button type="button" onMouseDown={() => select(opt)}
                          className="flex w-full items-center px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-muted">
                          {opt.label}
                        </button>
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

// ── Design helpers ────────────────────────────────────────────────────────────
function SuggestInput({ value, onChange, suggestions, placeholder, zIndex = "z-[997]" }: {
  value: string; onChange: (v: string) => void; suggestions: string[]; placeholder?: string; zIndex?: string;
}) {
  const [open, setOpen] = useState(false);
  const filtered = suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value);
  return (
    <div className="relative">
      <input type="text" value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
      />
      {open && filtered.length > 0 && (
        <ul className={`absolute left-0 right-0 top-full mt-0.5 rounded-lg border border-border bg-card shadow-lg ${zIndex} max-h-44 overflow-y-auto`}>
          {filtered.map((s) => (
            <li key={s} onMouseDown={() => { onChange(s); setOpen(false); }}
              className="cursor-pointer px-2.5 py-1.5 text-xs text-foreground hover:bg-muted">{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
export default function NewWastePage() {
  useAuthGuard();
  const router = useRouter();

  const now = new Date().toISOString().slice(0, 16);

  const [wasteType,       setWasteType]       = useState("BIOLOGICO");
  const [status,          setStatus]          = useState("GERADO");
  const [department,      setDepartment]      = useState("");
  const [quantity,        setQuantity]        = useState("");
  const [containerType,   setContainerType]   = useState("");
  const [containerCode,   setContainerCode]   = useState("");
  const [fillLevel,       setFillLevel]       = useState("");
  const [generatedAt,     setGeneratedAt]     = useState(now);
  const [storageLocation, setStorageLocation] = useState("");
  const [collectedById,   setCollectedById]   = useState<number | null>(null);
  const [disposalMethod,  setDisposalMethod]  = useState("");
  const [disposalDate,    setDisposalDate]    = useState("");

  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeType = WASTE_TYPES.find((t) => t.value === wasteType) ?? WASTE_TYPES[0];
  const isSharps   = wasteType === "PERFUROCORTANTE";
  const needsDisposal = ["RECOLHIDO","TRATADO","DESCARTADO"].includes(status);

  function validate() {
    const e: Record<string, string> = {};
    if (!department.trim()) e.department = "Sector é obrigatório.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const body: Record<string, any> = {
        waste_type:   wasteType,
        status,
        department:   department.trim(),
        generated_at: generatedAt,
      };
      if (quantity.trim())        body.quantity         = quantity.trim();
      if (containerType.trim())   body.container_type   = containerType.trim();
      if (containerCode.trim())   body.container_code   = containerCode.trim();
      if (isSharps && fillLevel)  body.fill_level       = fillLevel;
      if (storageLocation.trim()) body.storage_location = storageLocation.trim();
      if (collectedById)          body.collected_by     = collectedById;
      if (disposalMethod.trim())  body.disposal_method  = disposalMethod.trim();
      if (disposalDate)           body.disposal_date    = disposalDate;

      const res = await apiFetch<{ id: number }>("/clinical_laboratory/waste/", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.push(`/clinical-laboratory/biosafety/waste/${res.id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao registar resíduo.");
    } finally { setSaving(false); }
  }

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-teal-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${activeType.bar}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${activeType.grad} shadow-md ${activeType.glow}`}>
              <Trash2 size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Biossegurança</span><span>/</span>
                <span>Resíduos</span><span>/</span>
                <span className="font-medium text-foreground">Novo registo</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {department.trim() ? `Resíduo — ${department}` : "Novo registo de resíduo"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${activeType.chip}`}>
                  {activeType.emoji} {activeType.label}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CHIP[status]}`}>
                  {STATUSES.find((s) => s.value === status)?.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r px-4 text-xs font-semibold text-white shadow-md transition disabled:opacity-50 ${activeType.grad} ${activeType.glow}`}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Registar resíduo
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

          {/* Tipo de resíduo */}
          <div className="lg:col-span-2">
            <Card icon={Trash2} title="Tipo de resíduo" accent={activeType.bar}>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                {WASTE_TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => setWasteType(t.value)}
                    className={`rounded-lg border py-2 text-center text-[10px] font-medium transition ${wasteType === t.value ? `${t.chip} ring-1 ring-current/30 shadow-sm` : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    <div className="text-lg leading-none">{t.emoji}</div>
                    <div className="mt-0.5 leading-tight">{t.label}</div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Identificação */}
          <Card icon={Package} title="Identificação e sector" accent="bg-indigo-500">
            <Field label="Sector / Departamento" required error={errors.department}>
              <SuggestInput value={department}
                onChange={(v) => { setDepartment(v); if (v.trim()) setErrors((p) => ({ ...p, department: "" })); }}
                suggestions={DEPARTMENTS} placeholder="Ex.: Laboratório Clínico…" zIndex="z-[997]" />
            </Field>
            <Field label="Quantidade" hint="Ex.: 2 kg, 500 mL, 3 sacos">
              <input type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                placeholder="Quantidade / volume" className={inputCls} />
            </Field>
            <Field label="Data e hora de geração">
              <input type="datetime-local" value={generatedAt}
                onChange={(e) => setGeneratedAt(e.target.value)} className={inputCls} />
            </Field>
          </Card>

          {/* Contentor */}
          <Card icon={Package} title="Contentor" accent="bg-teal-500">
            <Field label="Tipo de contentor">
              <SuggestInput value={containerType} onChange={setContainerType}
                suggestions={CONTAINERS} placeholder="Ex.: Saco vermelho, Caixa amarela…" zIndex="z-[996]" />
            </Field>
            <Field label="Código do contentor" hint="Código ou etiqueta de rastreio">
              <input type="text" value={containerCode} onChange={(e) => setContainerCode(e.target.value)}
                placeholder="Ex.: C-2026-0042" className={inputCls} />
            </Field>
            {isSharps && (
              <Field label="Nível de enchimento" hint="Apenas para contentores de perfurocortantes">
                <div className="flex flex-wrap gap-1.5">
                  {FILL_LEVELS.map((fl) => (
                    <button key={fl} type="button" onClick={() => setFillLevel(fl)}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${fillLevel === fl ? "border-red-300 bg-red-50 text-red-700 ring-1 ring-red-300/30 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                      {fl}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </Card>

          {/* Estado + Armazenamento */}
          <Card icon={CalendarDays} title="Estado e armazenamento" accent="bg-blue-500">
            <Field label="Estado">
              <div className="grid grid-cols-3 gap-1">
                {STATUSES.map((s) => (
                  <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                    className={`rounded-lg border-l-2 border border-border py-1.5 text-[10px] font-medium transition ${status === s.value ? `${s.bar} ${STATUS_CHIP[s.value]} shadow-sm` : "border-l-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Local de armazenamento">
              <SuggestInput value={storageLocation} onChange={setStorageLocation}
                suggestions={STORAGE_LOCATIONS} placeholder="Ex.: Sala de resíduos R/C…" zIndex="z-[995]" />
            </Field>
          </Card>

          {/* Descarte */}
          <Card icon={CalendarDays} title="Recolha e descarte" accent="bg-emerald-500">
            <Field label="Recolhido por">
              <RelationSelect target={T_USER} value={collectedById}
                onChange={(id) => setCollectedById(id)} placeholder="Procurar responsável pela recolha…" />
            </Field>
            <Field label="Método de descarte">
              <SuggestInput value={disposalMethod} onChange={setDisposalMethod}
                suggestions={DISPOSAL_METHODS} placeholder="Ex.: Incineração, Autoclavagem…" zIndex="z-[994]" />
            </Field>
            {needsDisposal && (
              <Field label="Data de descarte">
                <input type="date" value={disposalDate}
                  onChange={(e) => setDisposalDate(e.target.value)} className={inputCls} />
              </Field>
            )}
          </Card>

        </div>
      </form>
    </AppLayout>
  );
}
