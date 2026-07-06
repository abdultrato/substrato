"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  FlaskConical,
  Loader2,
  MessageSquare,
  Save,
  Search,
  User,
  UserCheck,
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
  { value: "AGENDADA",           label: "Agendada" },
  { value: "AVALIADA",           label: "Avaliada" },
  { value: "COMPETENTE",         label: "Competente" },
  { value: "NECESSITA_FORMACAO", label: "Necessita formação" },
  { value: "RESTRINGIDA",        label: "Restringida" },
  { value: "EXPIRADA",           label: "Expirada" },
];

const STATUS_BAR: Record<string, string> = {
  AGENDADA:           "bg-amber-400",
  AVALIADA:           "bg-sky-500",
  COMPETENTE:         "bg-emerald-500",
  NECESSITA_FORMACAO: "bg-orange-500",
  RESTRINGIDA:        "bg-rose-500",
  EXPIRADA:           "bg-red-500",
};

const STATUS_COLOR: Record<string, string> = {
  AGENDADA:           "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  AVALIADA:           "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300",
  COMPETENTE:         "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  NECESSITA_FORMACAO: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",
  RESTRINGIDA:        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300",
  EXPIRADA:           "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
};

// ── Relation targets ──────────────────────────────────────────────────────────

const T_USER: RelationTarget = {
  endpoint: "/identity/user/",
  labelFields: ["name", "username"],
};

const T_LABTEST: RelationTarget = {
  endpoint: "/clinical_laboratory/test/",
  labelFields: ["name", "code"],
};

// ── RelationSelect ────────────────────────────────────────────────────────────

function RelationSelect({
  value, onChange, target, placeholder, safeRefreshToken, error,
}: {
  value: number | null;
  onChange: (v: number | null, label: string) => void;
  target: RelationTarget;
  placeholder?: string;
  safeRefreshToken?: number;
  error?: string;
}) {
  const [query, setQuery]     = useState("");
  const [label, setLabel]     = useState("");
  const [open, setOpen]       = useState(false);
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();

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
          <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 text-[10px] font-medium text-fuchsia-700 dark:border-fuchsia-700/40 dark:bg-fuchsia-900/20 dark:text-fuchsia-300">
            {label}
            <button type="button" onClick={clear} className="ml-0.5 text-fuchsia-400 hover:text-red-500 transition">
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
            className={`w-full rounded-md border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:ring-2 focus:ring-fuchsia-500/25 ${error ? "border-red-300 focus:border-red-400" : "border-border focus:border-fuchsia-500"}`}
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

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/25";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewCompetencyPage() {
  useAuthGuard();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [staff,          setStaff]          = useState<number | null>(null);
  const [area,           setArea]           = useState("");
  const [relatedTest,    setRelatedTest]    = useState<number | null>(null);
  const [assessedBy,     setAssessedBy]     = useState<number | null>(null);
  const [assessmentDate, setAssessmentDate] = useState("");
  const [expiryDate,     setExpiryDate]     = useState("");
  const [status,         setStatus]         = useState("AGENDADA");
  const [notes,          setNotes]          = useState("");

  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentStatus = STATUS_CHOICES.find((s) => s.value === status);

  function validate() {
    const e: Record<string, string> = {};
    if (!area.trim()) e.area = "Atividade/competência obrigatória.";
    if (staff === null) e.staff = "Colaborador obrigatório.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const created = await apiFetch<{ id: number }>("/clinical_laboratory/competency/", {
        method: "POST",
        body: JSON.stringify({
          staff,
          area:            area.trim(),
          related_test:    relatedTest,
          assessed_by:     assessedBy,
          assessment_date: assessmentDate || null,
          expiry_date:     expiryDate || null,
          status,
          notes:           notes.trim(),
        }),
      });
      router.push(`/clinical-laboratory/quality-management/competencies/${created.id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao criar avaliação.");
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-fuchsia-500/10 blur-2xl" />
            <div className="absolute -bottom-6 left-8 h-20 w-20 rounded-full bg-purple-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${STATUS_BAR[status] ?? "bg-slate-300"}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-md shadow-fuchsia-500/30">
              <Award size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Gestão da qualidade</span>
                <span>/</span>
                <span>Competências</span>
                <span>/</span>
                <span className="font-medium text-foreground">Nova avaliação</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {area.trim() || "Nova avaliação de competência"}
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
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-purple-600 px-4 text-xs font-semibold text-white shadow-md shadow-fuchsia-500/30 transition hover:from-fuchsia-700 hover:to-purple-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Criar avaliação
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

          {/* Colaborador */}
          <Card icon={User} title="Colaborador" accent="bg-fuchsia-500">
            <Field label="Colaborador avaliado" required error={errors.staff}>
              <RelationSelect
                value={staff}
                onChange={(v) => { setStaff(v); if (v !== null) setErrors((p) => ({ ...p, staff: "" })); }}
                target={T_USER}
                placeholder="Pesquisar colaborador…"
                safeRefreshToken={safeRefreshToken}
                error={errors.staff}
              />
            </Field>
            <Field label="Avaliado por">
              <RelationSelect
                value={assessedBy}
                onChange={(v) => setAssessedBy(v)}
                target={T_USER}
                placeholder="Pesquisar avaliador…"
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
          </Card>

          {/* Competência */}
          <Card icon={Award} title="Competência" accent="bg-purple-500">
            <Field label="Atividade / competência" required error={errors.area}>
              <input
                type="text" value={area}
                onChange={(e) => { setArea(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, area: "" })); }}
                placeholder="Ex: Pipetagem, coloração de Gram, operação do GeneXpert…"
                className={`${inputCls} ${errors.area ? "border-red-300 focus:border-red-400" : ""}`}
              />
            </Field>
            <Field label="Exame relacionado" hint="Opcional — exame do catálogo ligado a esta competência.">
              <RelationSelect
                value={relatedTest}
                onChange={(v) => setRelatedTest(v)}
                target={T_LABTEST}
                placeholder="Pesquisar exame…"
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
          </Card>

          {/* Datas */}
          <Card icon={CalendarDays} title="Datas" accent="bg-teal-500">
            <Field label="Data da avaliação">
              <input
                type="date" value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Data de validade / expiração">
              <input
                type="date" value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Observações */}
          <Card icon={MessageSquare} title="Observações" accent="bg-slate-400">
            <Field label="Notas" hint="Critérios avaliados, evidências, restrições aplicadas…">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas livres sobre a avaliação…"
                rows={4}
                className={`${inputCls} resize-y`}
              />
            </Field>
          </Card>

          {/* Estado — chips clicáveis full width */}
          <div className="lg:col-span-2">
            <Card icon={CheckCircle2} title="Estado — clique para alterar">
              <div className="grid gap-1.5 sm:grid-cols-3">
                {STATUS_CHOICES.map(({ value, label }) => {
                  const isActive = status === value;
                  return (
                    <button key={value} type="button" onClick={() => setStatus(value)}
                      className={`relative overflow-hidden rounded-lg border px-3 py-2.5 text-left text-[11px] transition focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30 ${isActive ? STATUS_COLOR[value] + " ring-1 ring-current/30" : "border-border bg-background hover:bg-muted"}`}>
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
