"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  FileText,
  Loader2,
  Save,
  Search,
  Tag,
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

const CREATE_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Choices ───────────────────────────────────────────────────────────────────

const DOC_TYPE_CHOICES = [
  { value: "MANUAL",     label: "Manual da qualidade" },
  { value: "POP",        label: "Procedimento operacional padrão (SOP)" },
  { value: "INSTRUCAO",  label: "Instrução de trabalho" },
  { value: "FORMULARIO", label: "Formulário" },
  { value: "REGISTO",    label: "Registo" },
  { value: "POLITICA",   label: "Política" },
  { value: "PLANO",      label: "Plano" },
  { value: "PROT_BIO",   label: "Protocolo de biossegurança" },
];

const STATUS_CHOICES = [
  { value: "RASCUNHO",   label: "Rascunho" },
  { value: "EM_REVISAO", label: "Em revisão" },
  { value: "APROVADO",   label: "Aprovado" },
  { value: "ATIVO",      label: "Ativo" },
  { value: "OBSOLETO",   label: "Obsoleto" },
  { value: "ARQUIVADO",  label: "Arquivado" },
];

const STATUS_COLOR: Record<string, string> = {
  RASCUNHO:   "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-300",
  EM_REVISAO: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  APROVADO:   "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
  ATIVO:      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  OBSOLETO:   "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",
  ARQUIVADO:  "border-border bg-muted text-muted-foreground",
};

// ── RelationTargets ───────────────────────────────────────────────────────────

const T_SECTOR: RelationTarget = {
  endpoint: "/clinical_laboratory/sector/",
  labelFields: ["name", "code"],
};
const T_USER: RelationTarget = {
  endpoint: "/identity/user/",
  labelFields: ["first_name", "last_name", "username"],
};

// ── FK single-select com pesquisa ─────────────────────────────────────────────

function RelationSelect({
  value, onChange, target, placeholder, safeRefreshToken, error,
}: {
  value: number | null; onChange: (v: number | null, label: string) => void;
  target: RelationTarget; placeholder?: string; safeRefreshToken?: number; error?: string;
}) {
  const [query, setQuery] = useState("");
  const [label, setLabel] = useState("");
  const [open, setOpen] = useState(false);
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

  const hasValue = value !== null;

  return (
    <div className="space-y-1.5">
      {hasValue && (
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
            {label}
            <button type="button" onClick={clear} className="ml-0.5 text-violet-400 hover:text-red-500 transition">
              <X size={9} />
            </button>
          </span>
        </div>
      )}
      {!hasValue && (
        <div className="relative">
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => { setOpen(true); if (!query) search(""); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className={`w-full rounded-md border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:ring-2 focus:ring-violet-500/25 ${error ? "border-red-300 focus:border-red-400" : "border-border focus:border-violet-500"}`}
          />
          {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {open && (
            <div id={listboxId} role="listbox" className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {results.length === 0 ? (
                <p className="px-3 py-2 text-[11px] text-muted-foreground">{searching ? "A pesquisar…" : "Nenhum resultado."}</p>
              ) : (
                <ul className="max-h-40 overflow-y-auto divide-y divide-border/40">
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

// ── ChipSingleSelect (TextChoices) ────────────────────────────────────────────

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

  const filtered = useMemo(() =>
    options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  );
  const selected = options.find((o) => o.value === value) ?? null;

  function select(opt: { value: string; label: string }) {
    onChange(opt.value); setQuery(""); setOpen(false);
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
          <input type="text" value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className={`w-full rounded-md border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:ring-2 focus:ring-violet-500/25 ${error ? "border-red-300 focus:border-red-400" : "border-border focus:border-violet-500"}`}
          />
          {open && (
            <div id={listboxId} role="listbox" className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {filtered.length === 0
                ? <p className="px-3 py-2 text-[11px] text-muted-foreground">Nenhum resultado.</p>
                : (
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

function Card({ icon: Icon, title, children, accent }: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <section className="relative z-0 overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm focus-within:z-50 dark:bg-white/5 dark:border-white/10">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />}
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

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25";
const selectCls = inputCls;
const textareaCls = inputCls + " resize-none";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewQualityDocumentPage() {
  useAuthGuard();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("");
  const [version, setVersion] = useState("1.0");
  const [status, setStatus] = useState("RASCUNHO");
  const [sector, setSector] = useState<number | null>(null);
  const [sectorLabel, setSectorLabel] = useState("");
  const [owner, setOwner] = useState<number | null>(null);
  const [ownerLabel, setOwnerLabel] = useState("");
  const [approvedBy, setApprovedBy] = useState<number | null>(null);
  const [approvedByLabel, setApprovedByLabel] = useState("");
  const [approvedAt, setApprovedAt] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [content, setContent] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentStatus = STATUS_CHOICES.find((s) => s.value === status);
  const currentDocType = DOC_TYPE_CHOICES.find((d) => d.value === docType);

  function validate() {
    const e: Record<string, string> = {};
    if (!code.trim()) e.code = "Código obrigatório.";
    if (!title.trim()) e.title = "Título obrigatório.";
    if (!docType) e.docType = "Tipo de documento obrigatório.";
    if (!version.trim()) e.version = "Versão obrigatória.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const data = await apiFetch<{ id?: number }>("/clinical_laboratory/quality_document/", {
        method: "POST",
        body: JSON.stringify({
          code: code.trim(),
          title: title.trim(),
          document_type: docType,
          version: version.trim(),
          status,
          sector: sector ?? null,
          owner: owner ?? null,
          approved_by: approvedBy ?? null,
          approved_at: approvedAt || null,
          effective_date: effectiveDate || null,
          review_date: reviewDate || null,
          content: content.trim(),
        }),
      });
      if (!data?.id) throw new Error("Resposta inesperada do servidor.");
      router.push(`/clinical-laboratory/quality-management/documents/${data.id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao criar documento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={CREATE_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="absolute -bottom-6 left-8 h-20 w-20 rounded-full bg-indigo-500/10 blur-2xl" />
          </div>
          {status && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${
            status === "ATIVO" ? "bg-emerald-500" :
            status === "APROVADO" ? "bg-blue-500" :
            status === "EM_REVISAO" ? "bg-amber-400" :
            status === "OBSOLETO" ? "bg-orange-500" :
            status === "ARQUIVADO" ? "bg-slate-400" : "bg-slate-300"
          }`} />}

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/30">
              <FileText size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Gestão da qualidade</span>
                <span>/</span>
                <span>Documentos</span>
                <span>/</span>
                <span className="font-medium text-foreground">Novo</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {title.trim() || "Novo documento"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {code.trim() && (
                  <span className="font-mono text-[10px] text-muted-foreground">{code}</span>
                )}
                {currentDocType && (
                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300">
                    {currentDocType.label}
                  </span>
                )}
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
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Criar documento
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
          <Card icon={FileText} title="Identificação" accent="bg-blue-500">
            <Field label="Código" required error={errors.code}
              hint="Ex.: POP-LAB-001, MANUAL-QLD-01">
              <input type="text" value={code}
                onChange={(e) => { setCode(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, code: "" })); }}
                placeholder="POP-LAB-001"
                className={`${inputCls} ${errors.code ? "border-red-300 focus:border-red-400" : ""}`}
              />
            </Field>
            <Field label="Título" required error={errors.title}>
              <input type="text" value={title}
                onChange={(e) => { setTitle(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, title: "" })); }}
                placeholder="Título completo do documento"
                className={`${inputCls} ${errors.title ? "border-red-300 focus:border-red-400" : ""}`}
              />
            </Field>
            <Field label="Versão" required error={errors.version}>
              <input type="text" value={version}
                onChange={(e) => { setVersion(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, version: "" })); }}
                placeholder="1.0"
                className={`${inputCls} ${errors.version ? "border-red-300 focus:border-red-400" : ""}`}
              />
            </Field>
          </Card>

          {/* Classificação */}
          <Card icon={Tag} title="Classificação" accent="bg-indigo-500">
            <Field label="Tipo de documento" required error={errors.docType}>
              <ChipSingleSelect
                value={docType}
                onChange={(v) => { setDocType(v); if (v) setErrors((p) => ({ ...p, docType: "" })); }}
                options={DOC_TYPE_CHOICES}
                placeholder="Pesquisar tipo…"
                error={errors.docType}
              />
            </Field>
            <Field label="Estado">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
                {STATUS_CHOICES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Sector">
              <RelationSelect
                value={sector}
                onChange={(v, l) => { setSector(v); setSectorLabel(l); }}
                target={T_SECTOR}
                placeholder="Pesquisar sector…"
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
          </Card>

          {/* Responsáveis */}
          <Card icon={User} title="Responsáveis" accent="bg-violet-500">
            <Field label="Proprietário">
              <RelationSelect
                value={owner}
                onChange={(v, l) => { setOwner(v); setOwnerLabel(l); }}
                target={T_USER}
                placeholder="Pesquisar utilizador…"
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
            <Field label="Aprovado por">
              <RelationSelect
                value={approvedBy}
                onChange={(v, l) => { setApprovedBy(v); setApprovedByLabel(l); }}
                target={T_USER}
                placeholder="Pesquisar utilizador…"
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
            <Field label="Data de aprovação">
              <input type="datetime-local" value={approvedAt}
                onChange={(e) => setApprovedAt(e.target.value)}
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Datas */}
          <Card icon={CalendarDays} title="Datas de vigência" accent="bg-sky-500">
            <Field label="Data de entrada em vigor">
              <input type="date" value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Data de revisão">
              <input type="date" value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Conteúdo — full width */}
          <div className="lg:col-span-2">
            <Card icon={BookOpen} title="Conteúdo / resumo" accent="bg-slate-400">
              <Field label="Texto do documento ou resumo">
                <textarea value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Descreva o conteúdo, âmbito ou resumo do documento…"
                  rows={6}
                  className={textareaCls}
                />
              </Field>
            </Card>
          </div>

          {/* Estados disponíveis — referência full width */}
          <div className="lg:col-span-2">
            <Card icon={Tag} title="Estado — referência">
              <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
                {STATUS_CHOICES.map(({ value, label }) => {
                  const isActive = status === value;
                  return (
                    <button key={value} type="button" onClick={() => setStatus(value)}
                      className={`rounded-lg border px-2.5 py-2 text-left text-[11px] transition focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${isActive ? STATUS_COLOR[value] + " ring-1 ring-current/30" : "border-border bg-background hover:bg-muted"}`}>
                      <span className={`block font-semibold ${isActive ? "" : "text-foreground"}`}>{label}</span>
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
