"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClipboardList,
  FileText,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Stethoscope,
  User,
  UserCheck,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

// ── Types ─────────────────────────────────────────────────────────────────────

type Checkin = {
  id: number;
  custom_id?: string;
  patient?: number;
  patient_name?: string;
  patient_code?: string;
  attendant_name?: string;
  status?: string;
  status_display?: string;
  priority?: string;
  priority_display?: string;
  reason?: string;
  notes?: string;
  arrived_at?: string;
  called_at?: string;
  completed_at?: string;
  request_code?: string;
  invoice_code?: string;
};

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "Todos os estados" },
  { value: "AGUARD",  label: "Aguardando" },
  { value: "ATEND",   label: "Em atendimento" },
  { value: "REQ",     label: "Requisição criada" },
  { value: "FAT",     label: "Fatura vinculada" },
  { value: "CONC",    label: "Concluído" },
  { value: "CANC",    label: "Cancelado" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "Todas as prioridades" },
  { value: "URG",  label: "Urgente" },
  { value: "PREF", label: "Preferencial" },
  { value: "NOR",  label: "Normal" },
];

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  AGUARD: { label: "Aguardando",        cls: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400",    dot: "bg-amber-400" },
  ATEND:  { label: "Em atendimento",    cls: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-400",          dot: "bg-blue-500" },
  REQ:    { label: "Req. criada",       cls: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-400", dot: "bg-violet-500" },
  FAT:    { label: "Fatura vinculada",  cls: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-400", dot: "bg-indigo-500" },
  CONC:   { label: "Concluído",         cls: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-400", dot: "bg-emerald-500" },
  CANC:   { label: "Cancelado",         cls: "border-red-300 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-400",                dot: "bg-red-400" },
};

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  URG:  { label: "Urgente",       cls: "border-red-300 bg-red-100 text-red-700 font-bold dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-400" },
  PREF: { label: "Preferencial",  cls: "border-amber-300 bg-amber-100 text-amber-700 font-semibold dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400" },
  NOR:  { label: "Normal",        cls: "border-border bg-muted text-muted-foreground" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString([], { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const m = STATUS_META[status];
  if (!m) return <span className="text-xs text-muted-foreground">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return null;
  const m = PRIORITY_META[priority] ?? PRIORITY_META.NOR;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${m.cls}`}>
      {m.label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export default function ReceptionCheckinsPage() {
  const { user } = useAuth();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const canWrite = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO]);

  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Stats for header
  const stats = useMemo(() => ({
    waiting:  checkins.filter((c) => c.status === "AGUARD").length,
    inCare:   checkins.filter((c) => c.status === "ATEND").length,
    done:     checkins.filter((c) => c.status === "CONC").length,
    urgent:   checkins.filter((c) => c.priority === "URG").length,
  }), [checkins]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("ordering", "-arrived_at");
      params.set("page_size", String(PAGE_SIZE));
      params.set("page", String(page));
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      const res = await apiFetch<any>(`/reception/checkin/?${params}`, { clientCache: false });
      if (Array.isArray(res)) {
        setCheckins(res);
        setCount(res.length);
      } else {
        setCheckins(res?.results ?? []);
        setCount(res?.count ?? 0);
      }
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, priorityFilter, safeRefreshToken]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  async function handleAction(id: number, action: "start-care" | "complete" | "cancel") {
    setActionError(null);
    try {
      await apiFetch(`/reception/checkin/${id}/${action}/`, { method: "POST", body: JSON.stringify({}) });
      await load();
    } catch (e: any) {
      setActionError(e?.message || "Erro ao executar acção.");
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("reception")}>
      <div className="space-y-3">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <ClipboardList size={16} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Check-ins de recepção</h1>
                <p className="text-[11px] text-muted-foreground">{count} registos encontrados</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={load} disabled={loading}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-50">
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              </button>
              {canWrite && (
                <Link href="/reception/reception-checkins/new"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700">
                  <Plus size={13} /> Novo check-in
                </Link>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Aguardando", value: stats.waiting, icon: Clock, color: "text-amber-600 dark:text-amber-400" },
              { label: "Em atendimento", value: stats.inCare, icon: Stethoscope, color: "text-blue-600 dark:text-blue-400" },
              { label: "Concluídos", value: stats.done, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Urgentes", value: stats.urgent, icon: AlertCircle, color: "text-red-600 dark:text-red-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <Icon size={14} className={color} />
                <div>
                  <div className={`text-base font-bold leading-none ${color}`}>{value}</div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/20 bg-white/25 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar paciente, ID, motivo..."
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-8 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={12} />
              </button>
            )}
          </div>

          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25">
            {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {(statusFilter || priorityFilter || debouncedSearch) && (
            <button type="button" onClick={() => { setSearch(""); setStatusFilter(""); setPriorityFilter(""); setPage(1); }}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] text-muted-foreground transition hover:bg-muted">
              <X size={11} /> Limpar
            </button>
          )}
        </div>

        {actionError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {actionError}
          </div>
        )}

        {/* Cards */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Carregando...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{error}</div>
        ) : checkins.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-white/20 bg-white/25 py-16 text-center shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
            <ClipboardList size={28} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum check-in encontrado.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {checkins.map((c) => {
              const canStart    = c.status === "AGUARD";
              const canComplete = c.status === "ATEND" || c.status === "REQ" || c.status === "FAT";
              const canCancel   = c.status !== "CONC" && c.status !== "CANC";
              const statusMeta  = c.status ? STATUS_META[c.status] : null;
              const accentLeft  = statusMeta?.dot ?? "bg-border";

              return (
                <div key={c.id}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:shadow-md hover:bg-white/35 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/8">

                  {/* Accent bar left */}
                  <div className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accentLeft}`} />

                  {/* Clickable body → detail page */}
                  <Link href={`/reception/reception-checkins/${c.id}`}
                    className="flex flex-1 flex-col gap-3 px-4 pb-3 pt-3 pl-5">

                    {/* Top row: ID + badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[11px] font-semibold text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                          {c.custom_id || `#${c.id}`}
                        </span>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Clock size={10} />
                          {fmtDateTime(c.arrived_at)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <PriorityBadge priority={c.priority} />
                        <StatusBadge status={c.status} />
                      </div>
                    </div>

                    {/* Patient */}
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                        <User size={14} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">{c.patient_name || "—"}</div>
                        {c.patient_code && <div className="text-[10px] text-muted-foreground">{c.patient_code}</div>}
                      </div>
                    </div>

                    {/* Reason */}
                    {c.reason && (
                      <p className="line-clamp-2 text-[11px] text-muted-foreground leading-relaxed">{c.reason}</p>
                    )}

                    {/* Codes row */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {c.request_code && (
                        <span className="inline-flex items-center gap-1 rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-400">
                          <FileText size={9} /> {c.request_code}
                        </span>
                      )}
                      {c.invoice_code && (
                        <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400">
                          <Receipt size={9} /> {c.invoice_code}
                        </span>
                      )}
                      {c.attendant_name && (
                        <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          <UserCheck size={9} /> {c.attendant_name}
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-muted-foreground/60 group-hover:text-[var(--primary-600)] transition flex items-center gap-0.5">
                        Ver detalhes <ArrowRight size={9} />
                      </span>
                    </div>
                  </Link>

                  {/* Action footer (only for write access) */}
                  {canWrite && (canStart || canComplete || canCancel) && (
                    <div className="flex items-center gap-1.5 border-t border-border/40 px-4 py-2 pl-5">
                      {canStart && (
                        <button type="button"
                          onClick={(e) => { e.preventDefault(); handleAction(c.id, "start-care"); }}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-400">
                          <UserCheck size={11} /> Atender
                        </button>
                      )}
                      {canComplete && (
                        <ConfirmDialog
                          title="Concluir atendimento"
                          message="Marcar este atendimento como concluído?"
                          confirmText="Concluir"
                          onConfirm={() => handleAction(c.id, "complete")}
                        >
                          <button type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400">
                            <CheckCircle2 size={11} /> Concluir
                          </button>
                        </ConfirmDialog>
                      )}
                      {canCancel && (
                        <ConfirmDialog
                          title="Cancelar check-in"
                          message="Cancelar este check-in?"
                          confirmText="Cancelar check-in"
                          danger
                          onConfirm={() => handleAction(c.id, "cancel")}
                        >
                          <button type="button"
                            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-50 dark:bg-transparent dark:text-red-400">
                            <X size={11} /> Cancelar
                          </button>
                        </ConfirmDialog>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between rounded-xl border border-white/20 bg-white/25 px-4 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
            <span className="text-[11px] text-muted-foreground">
              Página {page} de {totalPages} · {count} registos
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted disabled:opacity-40">
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const n = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button key={n} type="button" onClick={() => setPage(n)} disabled={loading}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-medium transition ${n === page ? "border-violet-500 bg-violet-600 text-white" : "border-border bg-card text-foreground hover:bg-muted"}`}>
                    {n}
                  </button>
                );
              })}
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted disabled:opacity-40">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
