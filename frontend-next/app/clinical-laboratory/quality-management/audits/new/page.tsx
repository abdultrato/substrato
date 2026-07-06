"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  MapPin,
  Save,
  Search,
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
  { value: "PLANEADA",        label: "Planeada" },
  { value: "AGENDADA",        label: "Agendada" },
  { value: "EM_CURSO",        label: "Em curso" },
  { value: "CONCLUIDA",       label: "Concluída" },
  { value: "ACHADOS_ABERTOS", label: "Achados em aberto" },
  { value: "FECHADA",         label: "Fechada" },
];

const STATUS_BAR: Record<string, string> = {
  PLANEADA:        "bg-slate-400",
  AGENDADA:        "bg-amber-400",
  EM_CURSO:        "bg-sky-500",
  CONCLUIDA:       "bg-blue-500",
  ACHADOS_ABERTOS: "bg-orange-500",
  FECHADA:         "bg-emerald-500",
};

const STATUS_COLOR: Record<string, string> = {
  PLANEADA:        "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/40 dark:bg-slate-900/20 dark:text-slate-300",
  AGENDADA:        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  EM_CURSO:        "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300",
  CONCLUIDA:       "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
  ACHADOS_ABERTOS: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",
  FECHADA:         "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
};

const T_USER: RelationTarget = { endpoint: "/identity/user/", labelFields: ["name", "username"] };

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
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
          />
          {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {open && (
            <div id={listboxId} role="listbox"
              className="absolute left-0 right-0 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
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

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewAuditPage() {
  useAuthGuard();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [code,        setCode]        = useState("");
  const [area,        setArea]        = useState("");
  const [auditor,     setAuditor]     = useState<number | null>(null);
  const [auditDate,   setAuditDate]   = useState("");
  const [scope,       setScope]       = useState("");
  const [criteria,    setCriteria]    = useState("");
  const [conclusion,  setConclusion]  = useState("");
  const [status,      setStatus]      = useState("PLANEADA");

  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentStatus = STATUS_CHOICES.find((s) => s.value === status);

  function validate() {
    const e: Record<string, string> = {};
    if (!area.trim()) e.area = "Área auditada obrigatória.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const created = await apiFetch<{ id: number }>("/clinical_laboratory/internal_audit/", {
        method: "POST",
        body: JSON.stringify({
          code:       code.trim(),
          area:       area.trim(),
          auditor,
          audit_date: auditDate || undefined,
          scope:      scope.trim(),
          criteria:   criteria.trim(),
          conclusion: conclusion.trim(),
          status,
        }),
      });
      router.push(`/clinical-laboratory/quality-management/audits/${created.id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao criar auditoria.");
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="absolute -bottom-6 left-8 h-20 w-20 rounded-full bg-cyan-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${STATUS_BAR[status] ?? "bg-slate-300"}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md shadow-blue-500/30">
              <ClipboardCheck size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Gestão da qualidade</span>
                <span>/</span>
                <span>Auditorias</span>
                <span>/</span>
                <span className="font-medium text-foreground">Nova</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {area.trim() || "Nova auditoria interna"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {currentStatus && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[status] ?? ""}`}>
                    {currentStatus.label}
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
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 text-xs font-semibold text-white shadow-md shadow-blue-500/30 transition hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Criar auditoria
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
          <Card icon={MapPin} title="Identificação" accent="bg-blue-500">
            <Field label="Área auditada" required error={errors.area}>
              <input
                type="text" value={area}
                onChange={(e) => { setArea(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, area: "" })); }}
                placeholder="Ex: Pré-analítico, Microbiologia, Gestão documental…"
                className={`${inputCls} ${errors.area ? "border-red-300 focus:border-red-400" : ""}`}
              />
            </Field>
            <Field label="Código interno" hint="Referência opcional da auditoria.">
              <input
                type="text" value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: AUD-2026-004"
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Auditor & Data */}
          <Card icon={User} title="Auditor e data" accent="bg-cyan-500">
            <Field label="Auditor">
              <RelationSelect
                value={auditor}
                onChange={(v) => setAuditor(v)}
                target={T_USER}
                placeholder="Pesquisar auditor…"
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
            <Field label="Data da auditoria">
              <input
                type="date" value={auditDate}
                onChange={(e) => setAuditDate(e.target.value)}
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Âmbito e critérios */}
          <div className="lg:col-span-2">
            <Card icon={FileText} title="Âmbito e critérios" accent="bg-sky-500">
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Âmbito" hint="O que é abrangido pela auditoria.">
                  <textarea
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    placeholder="Processos, sectores e atividades abrangidas…"
                    rows={4}
                    className={`${inputCls} resize-y`}
                  />
                </Field>
                <Field label="Critérios" hint="Normas e requisitos de referência (ex: ISO 15189).">
                  <textarea
                    value={criteria}
                    onChange={(e) => setCriteria(e.target.value)}
                    placeholder="Critérios de auditoria…"
                    rows={4}
                    className={`${inputCls} resize-y`}
                  />
                </Field>
              </div>
            </Card>
          </div>

          {/* Conclusão */}
          <div className="lg:col-span-2">
            <Card icon={CheckCircle2} title="Conclusão" accent="bg-blue-400">
              <Field label="Conclusão" hint="Síntese dos resultados da auditoria.">
                <textarea
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                  placeholder="Conclusões e recomendações…"
                  rows={4}
                  className={`${inputCls} resize-y`}
                />
              </Field>
            </Card>
          </div>

          {/* Estado — chips clicáveis full width */}
          <div className="lg:col-span-2">
            <Card icon={CheckCircle2} title="Estado — clique para alterar">
              <div className="grid gap-1.5 sm:grid-cols-3">
                {STATUS_CHOICES.map(({ value, label }) => {
                  const isActive = status === value;
                  return (
                    <button key={value} type="button" onClick={() => setStatus(value)}
                      className={`relative overflow-hidden rounded-lg border px-3 py-2.5 text-left text-[11px] transition focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${isActive ? STATUS_COLOR[value] + " ring-1 ring-current/30" : "border-border bg-background hover:bg-muted"}`}>
                      <span className={`absolute inset-y-0 left-0 w-0.5 ${STATUS_BAR[value]}`} />
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
