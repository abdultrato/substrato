"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  MessageSquare,
  Pencil,
  Paperclip,
  Search,
  Shield,
  User,
  Users,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Metadata ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PLANEADA:  "Planeada",
  CONCLUIDA: "Concluída",
  EXPIRADA:  "Expirada",
};

const STATUS_COLOR: Record<string, string> = {
  PLANEADA:  "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  CONCLUIDA: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  EXPIRADA:  "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
};

const STATUS_DOT: Record<string, string> = {
  PLANEADA:  "bg-amber-400",
  CONCLUIDA: "bg-emerald-500",
  EXPIRADA:  "bg-red-500",
};

const STATUS_BAR: Record<string, string> = {
  PLANEADA:  "bg-amber-400",
  CONCLUIDA: "bg-emerald-500",
  EXPIRADA:  "bg-red-500",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Training = {
  id: number;
  custom_id: string;
  title: string;
  training_type: string;
  trainer: string;
  training_date: string | null;
  expiry_date: string | null;
  certificate: string;
  competency_verified: boolean;
  status: string;
  staff: number | null;
  staff_display?: string;
  participants_display?: { id: number; label: string }[];
  notes?: string;
  created_at: string;
  updated_at: string;
};

const T_USER: RelationTarget = { endpoint: "/identity/user/", labelFields: ["name", "username"] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d.includes("T") ? d : d + "T00:00:00").toLocaleDateString("pt-MZ", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function fmtDateTime(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleString("pt-MZ", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children, accent }: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5 pl-5">
        <Icon size={13} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-4 pl-5">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/30 py-1.5 last:border-0">
      <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium text-foreground">{children ?? "—"}</span>
    </div>
  );
}

// ── MultiRelationSelect (M2M inside modal) ─────────────────────────────────────

function MultiRelationSelect({
  values, onChange, target, placeholder,
}: {
  values: { id: number; label: string }[];
  onChange: (v: { id: number; label: string }[]) => void;
  target: RelationTarget;
  placeholder?: string;
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
        });
        setResults(relationOptionsFromRows(items, target));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 250);
  }

  function select(opt: { value: string; label: string }) {
    const id = Number(opt.value);
    if (!selectedIds.has(id)) onChange([...values, { id, label: opt.label }]);
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
              <button type="button" onClick={() => remove(v.id)} className="ml-0.5 text-indigo-400 hover:text-red-500 transition"><X size={9} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="relative z-[999]">
        <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" value={query}
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
            {results.length === 0
              ? <p className="px-3 py-2 text-[11px] text-muted-foreground">{searching ? "A pesquisar…" : "Nenhum resultado."}</p>
              : (
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

// ── FK RelationSelect (modal) ──────────────────────────────────────────────────

function RelationSelectSingle({
  value, onChange, target, placeholder,
}: {
  value: number | null;
  onChange: (v: number | null, label: string) => void;
  target: RelationTarget;
  placeholder?: string;
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
      {value !== null && (
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
            {label}<button type="button" onClick={clear} className="ml-0.5 text-violet-400 hover:text-red-500 transition"><X size={9} /></button>
          </span>
        </div>
      )}
      {value === null && (
        <div className="relative z-[999]">
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={query}
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

// ── ReplicaModal ──────────────────────────────────────────────────────────────

function ReplicaModal({
  trainingId, trainingTitle, onClose, onCreated,
}: {
  trainingId: number;
  trainingTitle: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [replicator, setReplicator]       = useState<number | null>(null);
  const [participants, setParticipants]   = useState<{ id: number; label: string }[]>([]);
  const [repDate, setRepDate]             = useState("");
  const [notes, setNotes]                 = useState("");
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!replicator) { setError("Selecione o replicante."); return; }
    setSaving(true); setError(null);
    try {
      await apiFetch("/clinical_laboratory/training_replication/", {
        method: "POST",
        body: JSON.stringify({
          original: trainingId,
          replicator,
          participants: participants.map((p) => p.id),
          replication_date: repDate || null,
          notes: notes.trim(),
        }),
      });
      onCreated();
    } catch (err: any) {
      setError(err?.message || "Erro ao criar réplica.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-visible rounded-2xl border border-white/20 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
          <div className="flex items-center gap-2">
            <Copy size={15} className="text-violet-600" />
            <h2 className="text-sm font-semibold text-foreground">Criar réplica de formação</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4 p-5">
          <p className="text-[11px] text-muted-foreground">
            Réplica de <span className="font-semibold text-foreground">{trainingTitle}</span>
          </p>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-0.5">
            <label className="text-[11px] font-semibold text-foreground">
              Replicante <span className="text-red-500">*</span>
            </label>
            <p className="text-[10px] text-muted-foreground">Colaborador que irá conduzir a réplica.</p>
            <RelationSelectSingle
              value={replicator}
              onChange={(v) => setReplicator(v)}
              target={T_USER}
              placeholder="Pesquisar replicante…"
            />
          </div>

          <div className="space-y-0.5">
            <label className="text-[11px] font-semibold text-foreground">Participantes da réplica</label>
            <MultiRelationSelect
              values={participants}
              onChange={setParticipants}
              target={T_USER}
              placeholder="Pesquisar participante…"
            />
          </div>

          <div className="space-y-0.5">
            <label className="text-[11px] font-semibold text-foreground">Data da réplica</label>
            <input type="date" value={repDate} onChange={(e) => setRepDate(e.target.value)} className={inputCls} />
          </div>

          <div className="space-y-0.5">
            <label className="text-[11px] font-semibold text-foreground">Observações</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Notas sobre esta réplica…" className={`${inputCls} resize-y`} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
              Criar réplica
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TrainingRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rec, setRec] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [showReplica, setShowReplica] = useState(false);
  const [attachments, setAttachments] = useState<{ id: number; original_name: string; file_url: string }[]>([]);
  const [replications, setReplications] = useState<{ id: number; custom_id: string; replicator_display?: string; replication_date: string | null }[]>([]);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<Training>(`/clinical_laboratory/training_record/${id}/`)
      .then((data) => {
        setRec(data);
        apiFetch<any>(`/clinical_laboratory/training_attachment/?training=${id}`)
          .then((resp) => setAttachments(resp?.results ?? resp?.items ?? []))
          .catch(() => {});
        apiFetch<any>(`/clinical_laboratory/training_replication/?original=${id}`)
          .then((resp) => setReplications(resp?.results ?? resp?.items ?? []))
          .catch(() => {});
      })
      .catch((e) => setError(e?.message ?? "Erro ao carregar registo."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function marcarRealizada() {
    if (!id) return;
    setMarking(true);
    try {
      const updated = await apiFetch<Training>(
        `/clinical_laboratory/training_record/${id}/marcar-realizada/`,
        { method: "POST" },
      );
      setRec(updated);
    } catch { /* ignore */ }
    finally { setMarking(false); }
  }

  if (loading) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (error || !rec) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          {error ?? "Registo não encontrado."}
        </div>
      </AppLayout>
    );
  }

  const bar      = STATUS_BAR[rec.status]   ?? "bg-slate-400";
  const sClr     = STATUS_COLOR[rec.status] ?? "border-border bg-muted text-foreground";
  const sDot     = STATUS_DOT[rec.status]   ?? "bg-slate-400";
  const sLbl     = STATUS_LABEL[rec.status] ?? rec.status;
  const days     = daysUntil(rec.expiry_date);
  const expiring = days !== null && days >= 0 && days <= 30;
  const expired  = rec.status === "EXPIRADA" || (days !== null && days < 0);
  const isPlaneada  = rec.status === "PLANEADA";
  const isConcluida = rec.status === "CONCLUIDA";

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${bar}`} />

          <div className="relative flex flex-wrap items-center gap-4 px-5 py-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 ${sClr} shadow-sm`}>
              <BookOpen size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/quality-management/trainings" className="hover:underline">
                  Registos de formação
                </Link>
                <span>/</span>
                <span className="font-mono text-[9px]">{rec.custom_id}</span>
              </div>
              <h1 className="mt-0.5 text-lg font-bold leading-tight text-foreground">{rec.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sClr}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${sDot}`} />
                  {sLbl}
                </span>
                {rec.training_type && (
                  <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                    {rec.training_type}
                  </span>
                )}
                {rec.competency_verified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <CheckCircle2 size={9} /> Competência verificada
                  </span>
                )}
                {expiring && !expired && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300">
                    <Clock size={9} /> Expira em {days} dia{days !== 1 ? "s" : ""}
                  </span>
                )}
                {expired && rec.status !== "EXPIRADA" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                    <Clock size={9} /> Validade expirada
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              {isPlaneada && (
                <button type="button" onClick={marcarRealizada} disabled={marking}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-700 disabled:opacity-50">
                  {marking ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Marcar como realizada
                </button>
              )}
              {isConcluida && (
                <button type="button" onClick={() => setShowReplica(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 text-xs font-semibold text-violet-700 shadow-sm transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/40">
                  <Copy size={13} /> Criar réplica
                </button>
              )}
              <Link href={`/clinical-laboratory/quality-management/trainings/${id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700">
                <Pencil size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Grid de cards ─────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Identificação */}
          <SectionCard icon={BookOpen} title="Identificação" accent="bg-violet-500">
            <Row label="Código">{rec.custom_id}</Row>
            <Row label="Título">{rec.title}</Row>
            <Row label="Tipo de formação">{rec.training_type || "—"}</Row>
          </SectionCard>

          {/* Colaborador */}
          <SectionCard icon={User} title="Colaborador" accent="bg-indigo-500">
            <Row label="Colaborador">
              {rec.staff_display ?? (rec.staff ? `#${rec.staff}` : "—")}
            </Row>
            <Row label="Formador / Moderador">{rec.trainer || "—"}</Row>
            <Row label="Competência verificada">
              {rec.competency_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <CheckCircle2 size={9} /> Sim
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">Não</span>
              )}
            </Row>
          </SectionCard>

          {/* Formador & Certificação */}
          <SectionCard icon={Award} title="Formador e certificação" accent="bg-sky-500">
            <Row label="Formador / entidade">{rec.trainer || "—"}</Row>
            <Row label="Nº do certificado">
              {rec.certificate
                ? <span className="font-mono text-[10px]">{rec.certificate}</span>
                : "—"}
            </Row>
          </SectionCard>

          {/* Datas */}
          <SectionCard icon={CalendarDays} title="Datas" accent="bg-teal-500">
            <Row label="Data de formação">{fmtDate(rec.training_date) ?? "—"}</Row>
            <Row label="Validade / expiração">
              {rec.expiry_date ? (
                <span className={expiring || expired ? "font-semibold text-orange-600 dark:text-orange-400" : ""}>
                  {fmtDate(rec.expiry_date)}
                  {days !== null && days >= 0 && (
                    <span className="ml-1 text-[10px] text-muted-foreground">({days}d restantes)</span>
                  )}
                  {days !== null && days < 0 && (
                    <span className="ml-1 text-[10px] text-red-500">({Math.abs(days)}d expirado)</span>
                  )}
                </span>
              ) : "—"}
            </Row>
            <Row label="Criado em">
              <span className="text-[10px] text-muted-foreground">{fmtDateTime(rec.created_at)}</span>
            </Row>
            <Row label="Última atualização">
              <span className="text-[10px] text-muted-foreground">{fmtDateTime(rec.updated_at)}</span>
            </Row>
          </SectionCard>

          {/* Participantes */}
          <SectionCard icon={Users} title="Participantes" accent="bg-purple-500">
            {(rec.participants_display ?? []).length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nenhum participante registado.</p>
            ) : (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {(rec.participants_display ?? []).map((p) => (
                  <span key={p.id} className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                    {p.label}
                  </span>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Observações */}
          {rec.notes && (
            <SectionCard icon={MessageSquare} title="Observações" accent="bg-slate-400">
              <p className="whitespace-pre-wrap text-[11px] text-foreground leading-relaxed">{rec.notes}</p>
            </SectionCard>
          )}

          {/* Anexos */}
          {attachments.length > 0 && (
            <SectionCard icon={Paperclip} title="Instrumentos de formação" accent="bg-rose-400">
              <ul className="space-y-1">
                {attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-[11px]">
                    <Paperclip size={10} className="shrink-0 text-muted-foreground" />
                    <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate text-violet-600 underline-offset-2 hover:underline dark:text-violet-400">
                      {a.original_name || a.file_url}
                    </a>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* Réplicas */}
          {replications.length > 0 && (
            <div className="lg:col-span-2">
              <SectionCard icon={Copy} title={`Réplicas realizadas (${replications.length})`} accent="bg-violet-500">
                <div className="space-y-1">
                  {replications.map((r) => (
                    <Link key={r.id}
                      href={`/clinical-laboratory/quality-management/trainings/replications/${r.id}`}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-background px-3 py-2 transition hover:border-violet-300 hover:bg-violet-50/50 dark:hover:border-violet-700/40 dark:hover:bg-violet-900/10">
                      <div className="flex items-center gap-2">
                        <Copy size={11} className="shrink-0 text-violet-600 dark:text-violet-400" />
                        <span className="text-[11px] font-medium text-foreground">
                          {r.replicator_display ?? `Réplica #${r.id}`}
                        </span>
                        <span className="font-mono text-[9px] text-muted-foreground">{r.custom_id}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {r.replication_date ? fmtDate(r.replication_date) : "—"}
                      </span>
                    </Link>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {/* Ciclo de vida — full width */}
          <div className={rec.notes ? "lg:col-span-2" : "lg:col-span-2"}>
            <SectionCard icon={Shield} title="Estado da formação" accent={bar}>
              <div className="grid gap-1.5 sm:grid-cols-3">
                {Object.entries(STATUS_LABEL).map(([value, label]) => {
                  const isActive = rec.status === value;
                  return (
                    <div key={value}
                      className={`relative overflow-hidden rounded-lg border px-3 py-2.5 text-[11px] transition ${isActive ? STATUS_COLOR[value] + " ring-1 ring-current/20" : "border-border bg-background opacity-40"}`}>
                      <span className={`absolute inset-y-0 left-0 w-0.5 ${STATUS_DOT[value]}`} />
                      <div className="flex items-center justify-between pl-2">
                        <span className="font-semibold">{label}</span>
                        {isActive && <CheckCircle2 size={11} className="shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>

        </div>
      </div>

      {showReplica && (
        <ReplicaModal
          trainingId={rec.id}
          trainingTitle={rec.title}
          onClose={() => setShowReplica(false)}
          onCreated={() => { setShowReplica(false); load(); }}
        />
      )}
    </AppLayout>
  );
}
