"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Paperclip,
  Save,
  Search,
  Trash2,
  Users,
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
  { value: "PLANEADA",  label: "Planeada" },
  { value: "CONCLUIDA", label: "Concluída" },
  { value: "EXPIRADA",  label: "Expirada" },
];

const STATUS_BAR: Record<string, string> = {
  PLANEADA:  "bg-amber-400",
  CONCLUIDA: "bg-emerald-500",
  EXPIRADA:  "bg-red-500",
};

const STATUS_COLOR: Record<string, string> = {
  PLANEADA:  "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  CONCLUIDA: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  EXPIRADA:  "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
};

const TRAINING_TYPE_OPTS = [
  { value: "Interna",     label: "Interna" },
  { value: "Externa",     label: "Externa" },
  { value: "E-learning",  label: "E-learning" },
  { value: "On-the-job",  label: "On-the-job" },
  { value: "Conferência", label: "Conferência / Congresso" },
  { value: "Workshop",    label: "Workshop" },
];

// ── Relation targets ──────────────────────────────────────────────────────────

const T_USER: RelationTarget = {
  endpoint: "/identity/user/",
  labelFields: ["name", "username"],
};

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
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
            {label}
            <button type="button" onClick={clear} className="ml-0.5 text-violet-400 hover:text-red-500 transition">
              <X size={9} />
            </button>
          </span>
        </div>
      )}
      {(value === null || !label) && (
        <div className="relative z-[999]">
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
      {error && <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

// ── MultiRelationSelect (M2M) ─────────────────────────────────────────────────

function MultiRelationSelect({
  values, onChange, target, placeholder, safeRefreshToken,
}: {
  values: { id: number; label: string }[];
  onChange: (v: { id: number; label: string }[]) => void;
  target: RelationTarget;
  placeholder?: string;
  safeRefreshToken?: number;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();
  const selectedIds = new Set(values.map((v) => v.id));

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
    const id = Number(opt.value);
    if (!selectedIds.has(id)) {
      onChange([...values, { id, label: opt.label }]);
    }
    setQuery(""); setOpen(false);
  }
  function remove(id: number) { onChange(values.filter((v) => v.id !== id)); }

  return (
    <div className="space-y-1.5">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <span key={v.id} className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300">
              {v.label}
              <button type="button" onClick={() => remove(v.id)} className="ml-0.5 text-indigo-400 hover:text-red-500 transition">
                <X size={9} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative z-[999]">
        <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text" value={query}
          onChange={(e) => search(e.target.value)}
          onFocus={() => { setOpen(true); if (!query) search(""); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
        />
        {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
        {open && (
          <div id={listboxId} role="listbox"
            className="absolute left-0 right-0 z-[999] mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            {results.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">{searching ? "A pesquisar…" : "Nenhum resultado."}</p>
            ) : (
              <ul className="max-h-48 overflow-y-auto divide-y divide-border/40">
                {results.map((opt) => {
                  const already = selectedIds.has(Number(opt.value));
                  return (
                    <li key={opt.value}>
                      <button type="button" onMouseDown={() => select(opt)} disabled={already}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition ${already ? "cursor-default text-muted-foreground" : "text-foreground hover:bg-muted"}`}>
                        {already && <CheckCircle2 size={10} className="text-emerald-500" />}
                        {opt.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ChipSingleSelect ──────────────────────────────────────────────────────────

function ChipSingleSelect({
  value, onChange, options, placeholder,
}: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const listboxId = useId();

  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );
  const selected = options.find((o) => o.value === value) ?? null;

  function select(opt: { value: string; label: string }) { onChange(opt.value); setQuery(""); setOpen(false); }
  function clear() { onChange(""); }

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
        <div className="relative z-[999]">
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
          />
          {open && (
            <div id={listboxId} role="listbox"
              className="absolute left-0 right-0 z-[999] mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {filtered.length === 0
                ? <p className="px-3 py-2 text-[11px] text-muted-foreground">Nenhum resultado.</p>
                : (
                  <ul className="max-h-48 overflow-y-auto divide-y divide-border/40">
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

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditTrainingRecordPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [title,               setTitle]               = useState("");
  const [trainingType,        setTrainingType]        = useState("");
  const [trainer,             setTrainer]             = useState("");
  const [trainingDate,        setTrainingDate]        = useState("");
  const [expiryDate,          setExpiryDate]          = useState("");
  const [certificate,         setCertificate]         = useState("");
  const [competencyVerified,  setCompetencyVerified]  = useState(false);
  const [status,              setStatus]              = useState("CONCLUIDA");
  const [staff,               setStaff]               = useState<number | null>(null);
  const [staffLabel,          setStaffLabel]          = useState("");
  const [participants,        setParticipants]        = useState<{ id: number; label: string }[]>([]);
  const [notes,               setNotes]               = useState("");
  const [customId,            setCustomId]            = useState("");
  const [attachments,         setAttachments]         = useState<{ id: number; original_name: string; file_url: string }[]>([]);
  const [pendingFiles,        setPendingFiles]        = useState<File[]>([]);

  const [loadingRec, setLoadingRec] = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState<string | null>(null);

  // ── load ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoadingRec(true);
    apiFetch<any>(`/clinical_laboratory/training_record/${id}/`)
      .then((rec) => {
        setTitle(rec.title ?? "");
        setTrainingType(rec.training_type ?? "");
        setTrainer(rec.trainer ?? "");
        setTrainingDate(rec.training_date ?? "");
        setExpiryDate(rec.expiry_date ?? "");
        setCertificate(rec.certificate ?? "");
        setCompetencyVerified(rec.competency_verified ?? false);
        setStatus(rec.status ?? "CONCLUIDA");
        setStaff(rec.staff ?? null);
        setStaffLabel(rec.staff_display ?? "");
        setCustomId(rec.custom_id ?? "");
        setNotes(rec.notes ?? "");
        setParticipants(
          (rec.participants_display ?? []).map((p: any) => ({ id: p.id, label: p.label }))
        );
        // load attachments separately
        apiFetch<any>(`/clinical_laboratory/training_attachment/?training=${id}`)
          .then((resp) => setAttachments(resp?.results ?? resp?.items ?? []))
          .catch(() => {});
      })
      .catch((e) => setLoadError(e?.message ?? "Erro ao carregar registo."))
      .finally(() => setLoadingRec(false));
  }, [id]);

  const currentStatus = STATUS_CHOICES.find((s) => s.value === status);

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Título obrigatório.";
    if (staff === null) e.staff = "Colaborador obrigatório.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      await apiFetch(`/clinical_laboratory/training_record/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          title:               title.trim(),
          training_type:       trainingType,
          trainer:             trainer.trim(),
          training_date:       trainingDate || null,
          expiry_date:         expiryDate || null,
          certificate:         certificate.trim(),
          competency_verified: competencyVerified,
          status,
          staff:               staff ?? undefined,
          participants:        participants.map((p) => p.id),
          notes:               notes.trim(),
        }),
      });
      // upload pending attachments
      for (const file of pendingFiles) {
        const fd = new FormData();
        fd.append("training", String(id));
        fd.append("file", file);
        fd.append("original_name", file.name);
        await apiFetch("/clinical_laboratory/training_attachment/", { method: "POST", body: fd }).catch(() => {});
      }
      router.push(`/clinical-laboratory/quality-management/trainings/${id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao guardar registo.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAttachment(attId: number) {
    await apiFetch(`/clinical_laboratory/training_attachment/${attId}/`, { method: "DELETE" }).catch(() => {});
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  }

  if (loadingRec) {
    return (
      <AppLayout requiredGroups={EDIT_GROUPS}>
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
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
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-500/10 blur-2xl" />
            <div className="absolute -bottom-6 left-8 h-20 w-20 rounded-full bg-indigo-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${STATUS_BAR[status] ?? "bg-slate-300"}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/30">
              <BookOpen size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Gestão da qualidade</span>
                <span>/</span>
                <span>Formação</span>
                <span>/</span>
                <span className="font-mono text-[9px]">{customId}</span>
                <span>/</span>
                <span className="font-medium text-foreground">Editar</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {title.trim() || "Editar formação"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {trainingType && (
                  <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                    {trainingType}
                  </span>
                )}
                {currentStatus && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[status] ?? ""}`}>
                    {currentStatus.label}
                  </span>
                )}
                {competencyVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <CheckCircle2 size={9} /> Competência verificada
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
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50">
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
          <Card icon={BookOpen} title="Identificação" accent="bg-violet-500">
            <Field label="Título da formação" required error={errors.title}>
              <input
                type="text" value={title}
                onChange={(e) => { setTitle(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, title: "" })); }}
                placeholder="Título da formação"
                className={`${inputCls} ${errors.title ? "border-red-300 focus:border-red-400" : ""}`}
              />
            </Field>
            <Field label="Tipo de formação">
              <ChipSingleSelect
                value={trainingType}
                onChange={setTrainingType}
                options={TRAINING_TYPE_OPTS}
                placeholder="Pesquisar tipo…"
              />
            </Field>
          </Card>

          {/* Colaborador */}
          <Card icon={User} title="Colaborador" accent="bg-indigo-500">
            <Field label="Colaborador" required error={errors.staff}>
              <RelationSelect
                value={staff}
                onChange={(v, l) => { setStaff(v); setStaffLabel(l); if (v !== null) setErrors((p) => ({ ...p, staff: "" })); }}
                target={T_USER}
                placeholder="Pesquisar utilizador…"
                safeRefreshToken={safeRefreshToken}
                initialLabel={staffLabel}
                error={errors.staff}
              />
            </Field>
          </Card>

          {/* Formador & Certificado */}
          <Card icon={Award} title="Formador e certificação" accent="bg-sky-500">
            <Field label="Formador / entidade formadora">
              <input
                type="text" value={trainer}
                onChange={(e) => setTrainer(e.target.value)}
                placeholder="Ex: INASA, Cepheid Moçambique…"
                className={inputCls}
              />
            </Field>
            <Field label="Nº do certificado">
              <input
                type="text" value={certificate}
                onChange={(e) => setCertificate(e.target.value)}
                placeholder="Ex: BPL-2025-001"
                className={inputCls}
              />
            </Field>
            <Field label="Competência verificada">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={competencyVerified}
                  onChange={(e) => setCompetencyVerified(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border accent-violet-600"
                />
                <span className="text-[11px] text-foreground">
                  Competência avaliada e verificada
                </span>
              </label>
            </Field>
          </Card>

          {/* Datas */}
          <Card icon={CalendarDays} title="Datas" accent="bg-teal-500">
            <Field label="Data de formação">
              <input
                type="date" value={trainingDate}
                onChange={(e) => setTrainingDate(e.target.value)}
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

          {/* Participantes */}
          <Card icon={Users} title="Participantes" accent="bg-purple-500">
            <p className="text-[10px] text-muted-foreground pb-0.5">
              Outros colaboradores que participaram nesta formação.
            </p>
            <MultiRelationSelect
              values={participants}
              onChange={setParticipants}
              target={T_USER}
              placeholder="Pesquisar participante…"
              safeRefreshToken={safeRefreshToken}
            />
          </Card>

          {/* Observações */}
          <Card icon={MessageSquare} title="Observações" accent="bg-slate-400">
            <Field label="Notas / observações" hint="Informações adicionais não previstas nos campos acima.">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações livres sobre a formação…"
                rows={4}
                className={`${inputCls} resize-y`}
              />
            </Field>
          </Card>

          {/* Instrumentos / Anexos */}
          <Card icon={Paperclip} title="Instrumentos de formação" accent="bg-rose-400">
            <p className="text-[10px] text-muted-foreground pb-0.5">
              Adicione ou remova PDFs, imagens, vídeos, ZIPs e outros ficheiros de apoio.
            </p>
            {/* existing attachments */}
            {attachments.length > 0 && (
              <ul className="mb-2 space-y-1">
                {attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-[10px]">
                    <Paperclip size={10} className="shrink-0 text-muted-foreground" />
                    <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate text-violet-600 underline-offset-2 hover:underline dark:text-violet-400">
                      {a.original_name || a.file_url}
                    </a>
                    <button type="button" onClick={() => deleteAttachment(a.id)}
                      className="shrink-0 text-muted-foreground transition hover:text-red-500">
                      <Trash2 size={10} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-[11px] text-muted-foreground transition hover:border-violet-400 hover:bg-muted">
              <Paperclip size={12} />
              <span>Selecionar ficheiros…</span>
              <input type="file" multiple className="sr-only"
                onChange={(e) => {
                  if (e.target.files) {
                    setPendingFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                    e.target.value = "";
                  }
                }}
              />
            </label>
            {pendingFiles.length > 0 && (
              <ul className="mt-1.5 space-y-1">
                {pendingFiles.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-[10px]">
                    <Paperclip size={10} className="shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-foreground">{f.name}</span>
                    <span className="shrink-0 text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                    <button type="button" onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                      className="shrink-0 text-muted-foreground transition hover:text-red-500">
                      <Trash2 size={10} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Estado — chips clicáveis full width */}
          <div className="lg:col-span-2">
            <Card icon={CheckCircle2} title="Estado — clique para alterar">
              <div className="grid gap-1.5 sm:grid-cols-3">
                {STATUS_CHOICES.map(({ value, label }) => {
                  const isActive = status === value;
                  return (
                    <button key={value} type="button" onClick={() => setStatus(value)}
                      className={`relative overflow-hidden rounded-lg border px-3 py-2.5 text-left text-[11px] transition focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${isActive ? STATUS_COLOR[value] + " ring-1 ring-current/30" : "border-border bg-background hover:bg-muted"}`}>
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
