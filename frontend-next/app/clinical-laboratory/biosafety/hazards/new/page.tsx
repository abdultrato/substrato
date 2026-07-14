"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Biohazard,
  FileText,
  Loader2,
  Save,
  Search,
  Shield,
  ShieldAlert,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

const CREATE_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

const T_PPE: RelationTarget = {
  endpoint: "/clinical_laboratory/ppe/",
  labelFields: ["name", "category", "custom_id"],
  staticFilters: { active: true },
};
const T_ROUTES: RelationTarget = {
  endpoint: "/clinical_laboratory/transmission_route/",
  labelFields: ["name", "custom_id"],
  staticFilters: { active: true },
};

const HAZARD_TYPE_CHOICES = [
  { value: "VIRUS",    label: "Vírus" },
  { value: "BACTERIA", label: "Bactéria" },
  { value: "FUNGO",    label: "Fungo" },
  { value: "PARASITA", label: "Parasita" },
  { value: "PRIAO",    label: "Príon" },
  { value: "OUTRO",    label: "Outro" },
];

const CONTAINMENT_CHOICES = [
  { value: "", label: "— Não especificado —" },
  { value: "NB1", label: "NB-1 — Nível de biossegurança 1" },
  { value: "NB2", label: "NB-2 — Nível de biossegurança 2" },
  { value: "NB3", label: "NB-3 — Nível de biossegurança 3" },
  { value: "NB4", label: "NB-4 — Nível de biossegurança 4" },
];

const RISK_GROUPS = [
  { group: "RG1", label: "Grupo de risco 1", desc: "Agentes sem risco ou risco mínimo para o indivíduo e a comunidade." },
  { group: "RG2", label: "Grupo de risco 2", desc: "Risco moderado para o indivíduo; baixo risco para a comunidade. Tratamento disponível." },
  { group: "RG3", label: "Grupo de risco 3", desc: "Risco elevado para o indivíduo; baixo risco comunitário. Geralmente com tratamento." },
  { group: "RG4", label: "Grupo de risco 4", desc: "Risco muito elevado para o indivíduo e a comunidade. Sem tratamento disponível." },
] as const;

// ── Inline M2M chip-select ─────────────────────────────────────────────────────

function ChipMultiSelect({
  value, onChange, target, placeholder, safeRefreshToken, error,
}: {
  value: number[]; onChange: (v: number[]) => void; target: RelationTarget;
  placeholder?: string; safeRefreshToken?: number; error?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [labelById, setLabelById] = useState<Record<string, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();
  const selectedIds = useMemo(() => value.map(String), [value]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { items } = await apiFetchList<Record<string, any>>(target.endpoint, {
          page: 1, pageSize: 25,
          query: { ...(target.staticFilters ?? {}), ...(query.trim() ? { search: query.trim() } : {}) },
          clientCache: safeRefreshToken === 0,
          clientCacheTtlMs: 30000,
        });
        const opts = relationOptionsFromRows(items, target);
        setResults(opts);
        setLabelById((cur) => {
          const next = { ...cur };
          for (const o of opts) next[o.value] = o.label;
          return next;
        });
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 250);
  }, [query, open, target, safeRefreshToken]);

  function add(opt: { value: string; label: string }) {
    setLabelById((cur) => ({ ...cur, [opt.value]: opt.label }));
    if (!selectedIds.includes(opt.value)) onChange([...value, Number(opt.value)]);
    setQuery(""); setOpen(false);
  }
  function remove(id: string) { onChange(value.filter((v) => String(v) !== id)); }

  const available = results.filter((o) => !selectedIds.includes(o.value));

  return (
    <div className="space-y-1.5">
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedIds.map((id) => (
            <span key={id}
              className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
              {labelById[id] || `#${id}`}
              <button type="button" onClick={() => remove(id)} className="ml-0.5 text-violet-400 hover:text-red-500 transition">
                <X size={9} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text" value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className={`w-full rounded-md border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:ring-2 focus:ring-violet-500/25 ${error ? "border-red-300 focus:border-red-400" : "border-border focus:border-violet-500"}`}
        />
        {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
        {open && (query || available.length > 0) && (
          <div id={listboxId} role="listbox"
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            {available.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">
                {searching ? "A pesquisar…" : "Nenhum resultado."}
              </p>
            ) : (
              <ul className="max-h-40 overflow-y-auto divide-y divide-border/40">
                {available.map((opt) => (
                  <li key={opt.value}>
                    <button type="button" onMouseDown={() => add(opt)}
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
      {error && <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

// ── Single-select com filtro local (TextChoices) ───────────────────────────────

function ChipSingleSelect({
  value, onChange, options, placeholder, error,
}: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string; error?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const listboxId = useId();

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase())
  );
  const selected = options.find((o) => o.value === value) ?? null;

  function select(opt: { value: string; label: string }) {
    onChange(opt.value);
    setQuery("");
    setOpen(false);
  }
  function clear() { onChange(""); setQuery(""); }

  return (
    <div className="space-y-1.5">
      {selected && (
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
            {selected.label}
            <button type="button" onClick={clear} className="ml-0.5 text-violet-400 hover:text-red-500 transition">
              <X size={9} />
            </button>
          </span>
        </div>
      )}
      {!selected && (
        <div className="relative">
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className={`w-full rounded-md border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:ring-2 focus:ring-violet-500/25 ${error ? "border-red-300 focus:border-red-400" : "border-border focus:border-violet-500"}`}
          />
          {open && (
            <div id={listboxId} role="listbox"
              className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-[11px] text-muted-foreground">Nenhum resultado.</p>
              ) : (
                <ul className="max-h-40 overflow-y-auto divide-y divide-border/40">
                  {filtered.map((opt) => (
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
      {error && <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

// ── Design helpers ─────────────────────────────────────────────────────────────

function Card({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="relative z-0 rounded-lg border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm focus-within:z-50 dark:bg-white/5 dark:border-white/10">
      <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-1.5">
        <Icon size={11} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-2 p-2.5">{children}</div>
    </section>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:ring-offset-1 ${
        checked ? "bg-violet-600" : "bg-border"
      }`}
    >
      <span className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25";
const selectCls = inputCls;
const textareaCls = inputCls + " resize-none";

const RG_COLOR: Record<string, string> = {
  RG1: "text-emerald-600 dark:text-emerald-400",
  RG2: "text-amber-600 dark:text-amber-400",
  RG3: "text-orange-600 dark:text-orange-400",
  RG4: "text-red-600 dark:text-red-400",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewHazardPage() {
  useAuthGuard();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [name, setName] = useState("");
  const [hazardType, setHazardType] = useState("");
  const [riskGroup, setRiskGroup] = useState("RG2");
  const [transmissionRoutes, setTransmissionRoutes] = useState<number[]>([]);
  const [requiredPpeItems, setRequiredPpeItems] = useState<number[]>([]);
  const [containmentLevel, setContainmentLevel] = useState("");
  const [handlingNotes, setHandlingNotes] = useState("");
  const [active, setActive] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedRG = RISK_GROUPS.find((r) => r.group === riskGroup);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "O nome do agente é obrigatório.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const data = await apiFetch<{ id?: number }>("/clinical_laboratory/hazard/", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          hazard_type: hazardType.trim(),
          risk_group: riskGroup,
          transmission_routes: transmissionRoutes,
          required_ppe_items: requiredPpeItems,
          containment_level: containmentLevel,
          handling_notes: handlingNotes.trim(),
          active,
        }),
      });
      if (!data?.id) throw new Error("Resposta inesperada do servidor.");
      router.push(`/clinical-laboratory/biosafety/hazards/${data.id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao criar perigo biológico.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={CREATE_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* ── Header melhorado ───────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          {/* Decoração de fundo */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-500/10 blur-2xl" />
            <div className="absolute -bottom-6 left-8 h-20 w-20 rounded-full bg-indigo-500/10 blur-2xl" />
          </div>

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            {/* Ícone */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/30">
              <Biohazard size={20} className="text-white" />
            </div>

            {/* Título + breadcrumb */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Biossegurança</span>
                <span>/</span>
                <span>Perigos biológicos</span>
                <span>/</span>
                <span className="font-medium text-foreground">Novo</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {name.trim() || "Novo perigo biológico"}
              </h1>
              {selectedRG && (
                <p className={`text-[11px] font-medium ${RG_COLOR[riskGroup]}`}>
                  {selectedRG.label}
                </p>
              )}
            </div>

            {/* Acções */}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Criar registo
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
          <Card icon={Biohazard} title="Identificação">
            <Field label="Agente / perigo" required error={errors.name}>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, name: "" })); }}
                placeholder="Ex.: SARS-CoV-2, Mycobacterium tuberculosis…"
                className={`${inputCls} ${errors.name ? "border-red-300 focus:border-red-400" : ""}`}
              />
            </Field>
            <Field label="Tipo de perigo">
              <ChipSingleSelect
                value={hazardType}
                onChange={setHazardType}
                options={HAZARD_TYPE_CHOICES}
                placeholder="Pesquisar tipo de perigo…"
              />
            </Field>
            <Field label="Grupo de risco" required>
              <select value={riskGroup} onChange={(e) => setRiskGroup(e.target.value)} className={selectCls}>
                {RISK_GROUPS.map(({ group, label }) => (
                  <option key={group} value={group}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Estado">
              <div className="flex items-center gap-2 py-0.5">
                <Toggle checked={active} onChange={setActive} />
                <span className="text-xs font-medium text-foreground">{active ? "Ativo" : "Inativo"}</span>
              </div>
            </Field>
          </Card>

          {/* Contenção e vias */}
          <Card icon={Shield} title="Contenção e transmissão">
            <Field label="Nível de contenção">
              <select value={containmentLevel} onChange={(e) => setContainmentLevel(e.target.value)} className={selectCls}>
                {CONTAINMENT_CHOICES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Vias de transmissão">
              <ChipMultiSelect
                value={transmissionRoutes}
                onChange={setTransmissionRoutes}
                target={T_ROUTES}
                placeholder="Pesquisar via de transmissão…"
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
          </Card>

          {/* EPI */}
          <Card icon={ShieldAlert} title="EPI requerido">
            <Field label="Equipamentos de proteção individual">
              <ChipMultiSelect
                value={requiredPpeItems}
                onChange={setRequiredPpeItems}
                target={T_PPE}
                placeholder="Pesquisar EPI do catálogo…"
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
            <p className="text-[10px] text-muted-foreground">
              Os EPIs são herdados do catálogo de equipamentos de proteção individual do laboratório.
              Se não encontrar o item, cadastre-o primeiro em{" "}
              <Link href="/clinical-laboratory/biosafety/ppe" className="text-violet-600 hover:underline dark:text-violet-400">
                Biossegurança → EPI
              </Link>.
            </p>
          </Card>

          {/* Notas + Referência grupos de risco */}
          <Card icon={FileText} title="Notas de manipulação">
            <Field label="Instruções e notas">
              <textarea
                value={handlingNotes}
                onChange={(e) => setHandlingNotes(e.target.value)}
                placeholder="Procedimentos de segurança, cuidados especiais, desinfeção…"
                rows={4}
                className={textareaCls}
              />
            </Field>
          </Card>

          {/* Referência de grupos de risco — seleccionável, full-width */}
          <div className="lg:col-span-2">
            <Card icon={AlertTriangle} title="Referência de grupos de risco — clique para selecionar">
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                {RISK_GROUPS.map(({ group, label, desc }) => {
                  const isActive = riskGroup === group;
                  return (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setRiskGroup(group)}
                      className={`rounded-md border px-2.5 py-2 text-left text-[11px] transition focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${
                        isActive
                          ? "border-violet-400/70 bg-violet-50 dark:bg-violet-900/15"
                          : "border-border bg-background hover:border-violet-300 hover:bg-muted"
                      }`}
                    >
                      <span className={`block font-semibold ${isActive ? RG_COLOR[group] : "text-foreground"}`}>
                        {label}
                      </span>
                      <p className="mt-0.5 leading-snug text-muted-foreground">{desc}</p>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
