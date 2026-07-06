"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardCheck,
  FileText,
  ListChecks,
  Loader2,
  Save,
  Scale,
  Search,
  Tag,
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

const TYPE_CHOICES = [
  { value: "CONFORMIDADE", label: "Conformidade" },
  { value: "NC_MENOR",     label: "NC menor" },
  { value: "NC_MAIOR",     label: "NC maior" },
  { value: "OBSERVACAO",   label: "Observação" },
  { value: "MELHORIA",     label: "Oportunidade de melhoria" },
];

const TYPE_BAR: Record<string, string> = {
  CONFORMIDADE: "bg-emerald-500",
  NC_MENOR:     "bg-amber-400",
  NC_MAIOR:     "bg-red-500",
  OBSERVACAO:   "bg-sky-500",
  MELHORIA:     "bg-violet-500",
};

const TYPE_COLOR: Record<string, string> = {
  CONFORMIDADE: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  NC_MENOR:     "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  NC_MAIOR:     "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
  OBSERVACAO:   "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300",
  MELHORIA:     "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",
};

const T_AUDIT: RelationTarget = { endpoint: "/clinical_laboratory/internal_audit/", labelFields: ["area", "code"] };

// ── RelationSelect ────────────────────────────────────────────────────────────

function RelationSelect({
  value, onChange, target, placeholder, safeRefreshToken, initialLabel = "", error,
}: {
  value: number | null;
  onChange: (v: number | null, label: string) => void;
  target: RelationTarget;
  placeholder?: string;
  safeRefreshToken?: number;
  initialLabel?: string;
  error?: string;
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
          clientCache: safeRefreshToken === 0,
          clientCacheTtlMs: 30000,
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
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300">
            {label}
            <button type="button" onClick={clear} className="ml-0.5 text-blue-400 hover:text-red-500 transition">
              <X size={9} />
            </button>
          </span>
        </div>
      )}
      {(value === null || !label) && (
        <div className={`relative ${open ? "z-[9999]" : "z-[10]"}`}>
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => { setOpen(true); if (!query) search(""); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className={`w-full rounded-md border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:ring-2 focus:ring-amber-500/25 ${error ? "border-red-300 focus:border-red-400" : "border-border focus:border-amber-500"}`}
          />
          {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {open && (
            <div id={listboxId} role="listbox"
              className="absolute left-0 right-0 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {results.length === 0
                ? <p className="px-3 py-2 text-[11px] text-muted-foreground">{searching ? "A pesquisar…" : "Nenhuma auditoria."}</p>
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
      {error && <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{error}</p>}
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
      {hint && !error && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditFindingPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [audit,       setAudit]       = useState<number | null>(null);
  const [auditLabel,  setAuditLabel]  = useState("");
  const [findingType, setFindingType] = useState("OBSERVACAO");
  const [clause,      setClause]      = useState("");
  const [description, setDescription] = useState("");
  const [customId,    setCustomId]    = useState("");

  const [loadingRec, setLoadingRec] = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState<string | null>(null);

  // ── load ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoadingRec(true);
    apiFetch<any>(`/clinical_laboratory/audit_finding/${id}/`)
      .then((rec) => {
        setAudit(rec.audit ?? null);
        setAuditLabel(rec.audit_display?.label ?? rec.audit_display?.code ?? "");
        setFindingType(rec.finding_type ?? "OBSERVACAO");
        setClause(rec.clause ?? "");
        setDescription(rec.description ?? "");
        setCustomId(rec.custom_id ?? "");
      })
      .catch((e) => setLoadError(e?.message ?? "Erro ao carregar achado."))
      .finally(() => setLoadingRec(false));
  }, [id]);

  const currentType = TYPE_CHOICES.find((t) => t.value === findingType);

  function validate() {
    const e: Record<string, string> = {};
    if (audit === null) e.audit = "Auditoria obrigatória.";
    if (!description.trim()) e.description = "Descrição obrigatória.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      await apiFetch(`/clinical_laboratory/audit_finding/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          audit,
          finding_type: findingType,
          clause:       clause.trim(),
          description:  description.trim(),
        }),
      });
      router.push(`/clinical-laboratory/quality-management/findings/${id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao guardar achado.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingRec) {
    return (
      <AppLayout requiredGroups={EDIT_GROUPS}>
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (loadError) {
    return (
      <AppLayout requiredGroups={EDIT_GROUPS}>
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          {loadError}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-500/10 blur-2xl" />
            <div className="absolute -bottom-6 left-8 h-20 w-20 rounded-full bg-red-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${TYPE_BAR[findingType] ?? "bg-slate-300"}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-red-600 shadow-md shadow-amber-500/30">
              <ListChecks size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Gestão da qualidade</span>
                <span>/</span>
                <span>Achados</span>
                <span>/</span>
                <span className="font-mono text-[9px]">{customId}</span>
                <span>/</span>
                <span className="font-medium text-foreground">Editar</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {description.trim().slice(0, 60) || "Editar achado"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {currentType && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${TYPE_COLOR[findingType] ?? ""}`}>
                    {currentType.label}
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
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-red-600 px-4 text-xs font-semibold text-white shadow-md shadow-amber-500/30 transition hover:from-amber-700 hover:to-red-700 disabled:opacity-50">
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

          {/* Auditoria */}
          <Card icon={ClipboardCheck} title="Auditoria" accent="bg-blue-500">
            <Field label="Auditoria" required error={errors.audit}
              hint="Auditoria interna a que este achado pertence.">
              <RelationSelect
                value={audit}
                onChange={(v, l) => { setAudit(v); setAuditLabel(l); if (v !== null) setErrors((p) => ({ ...p, audit: "" })); }}
                target={T_AUDIT}
                placeholder="Pesquisar auditoria…"
                safeRefreshToken={safeRefreshToken}
                initialLabel={auditLabel}
                error={errors.audit}
              />
            </Field>
          </Card>

          {/* Classificação */}
          <Card icon={Tag} title="Classificação" accent="bg-amber-500">
            <Field label="Cláusula / requisito" hint="Ex: 5.5.1 (ISO 15189).">
              <input
                type="text" value={clause}
                onChange={(e) => setClause(e.target.value)}
                placeholder="Ex: 5.8.2"
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Descrição */}
          <div className="lg:col-span-2">
            <Card icon={FileText} title="Descrição do achado" accent="bg-orange-500">
              <Field label="Descrição" required error={errors.description}>
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, description: "" })); }}
                  placeholder="Descrição da evidência / constatação…"
                  rows={5}
                  className={`${inputCls} resize-y ${errors.description ? "border-red-300 focus:border-red-400" : ""}`}
                />
              </Field>
            </Card>
          </div>

          {/* Tipo — chips clicáveis full width */}
          <div className="lg:col-span-2">
            <Card icon={Scale} title="Tipo de achado — clique para escolher">
              <div className="grid gap-1.5 sm:grid-cols-5">
                {TYPE_CHOICES.map(({ value, label }) => {
                  const isActive = findingType === value;
                  return (
                    <button key={value} type="button" onClick={() => setFindingType(value)}
                      className={`relative overflow-hidden rounded-lg border px-3 py-2.5 text-left text-[11px] transition focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${isActive ? TYPE_COLOR[value] + " ring-1 ring-current/30" : "border-border bg-background hover:bg-muted"}`}>
                      <span className={`absolute inset-y-0 left-0 w-0.5 ${TYPE_BAR[value]}`} />
                      <span className={`block pl-1.5 font-semibold ${isActive ? "" : "text-foreground"}`}>{label}</span>
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
