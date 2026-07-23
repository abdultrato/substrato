"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, ClipboardCheck, HeartPulse, Loader2, Pause, Play, Plus, Search, User, XCircle } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Program = {
  id: number;
  custom_id?: string | null;
  patient_name?: string | null;
  care_manager_name?: string | null;
  alert_count?: number | null;
  condition?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  next_review_date?: string | null;
  review_frequency_days?: number | null;
};

const CONDITION_LABEL: Record<string, string> = { COPD: "DPCO", HYPERTENSION: "Hipertensão", DIABETES: "Diabetes", HEART_FAILURE: "Insuf. cardíaca", PREGNANCY_RISK: "Gravidez de risco", OTHER: "Outra" };

const STATUS_META: Record<string, { label: string; tone: string; bar: string }> = {
  ENROLLED: { label: "Inscrito", tone: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/40 dark:bg-sky-950/30 dark:text-sky-300", bar: "bg-sky-500" },
  ACTIVE: { label: "Ativo", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300", bar: "bg-emerald-500" },
  PAUSED: { label: "Pausado", tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300", bar: "bg-amber-500" },
  COMPLETED: { label: "Concluído", tone: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300", bar: "bg-slate-400" },
  CANCELLED: { label: "Cancelado", tone: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400", bar: "bg-slate-400" },
};

const ACTIONS_BY_STATUS: Record<string, Array<{ endpoint: string; label: string; icon: any; kind: "primary" | "danger" }>> = {
  ENROLLED: [{ endpoint: "ativar", label: "Ativar", icon: Play, kind: "primary" }, { endpoint: "cancelar", label: "Cancelar", icon: XCircle, kind: "danger" }],
  ACTIVE: [{ endpoint: "registar-revisao", label: "Revisão", icon: ClipboardCheck, kind: "primary" }, { endpoint: "pausar", label: "Pausar", icon: Pause, kind: "primary" }, { endpoint: "concluir", label: "Concluir", icon: CheckCircle2, kind: "primary" }],
  PAUSED: [{ endpoint: "ativar", label: "Reativar", icon: Play, kind: "primary" }, { endpoint: "cancelar", label: "Cancelar", icon: XCircle, kind: "danger" }],
};

function fmtDate(value?: string | null) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }); }
function isOverdue(value?: string | null) { if (!value) return false; const d = new Date(value); if (Number.isNaN(d.getTime())) return false; const today = new Date(); today.setHours(0, 0, 0, 0); return d < today; }

export default function TelemedicineChronicProgramsListPage() {
  const [items, setItems] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetchList<Program>("/telemedicine/program/", { page: 1, pageSize: 200, clientPaginate: true, clientCache: false });
      setItems(res.items || []);
    } catch (e: any) {
      setError(e?.message || "Não foi possível carregar os programas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runAction = useCallback(async (p: Program, endpoint: string) => {
    if (busyId) return;
    setBusyId(p.id);
    setError(null);
    try {
      await apiFetch(`/telemedicine/program/${p.id}/${endpoint}/`, { method: "POST", body: JSON.stringify({}) });
      await load();
    } catch (e: any) {
      setError(e?.message || "Não foi possível atualizar o programa.");
    } finally {
      setBusyId(null);
    }
  }, [busyId, load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return items.filter((p) =>
      (!statusFilter || String(p.status || "").toUpperCase() === statusFilter) &&
      (!term || [p.patient_name, p.custom_id, p.care_manager_name].filter(Boolean).join(" ").toLocaleLowerCase().includes(term))
    );
  }, [items, search, statusFilter]);

  const activeCount = useMemo(() => items.filter((p) => String(p.status || "").toUpperCase() === "ACTIVE").length, [items]);
  const dueCount = useMemo(() => items.filter((p) => ["ACTIVE", "ENROLLED"].includes(String(p.status || "").toUpperCase()) && isOverdue(p.next_review_date)).length, [items]);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM, GROUPS.TELEMEDICINA]}>
      <div className="mx-auto w-full max-w-[99vw] space-y-1 px-1 pb-2">
        {/* Header mínimo: voltar + título + indicadores + busca/filtro. */}
        <section className="relative flex flex-wrap items-center gap-x-2 gap-y-1 overflow-hidden rounded-lg border border-cyan-200/60 bg-white/55 px-2 py-1 shadow-sm backdrop-blur dark:border-cyan-900/35 dark:bg-slate-950/45">
          <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-cyan-500 to-violet-600" />
          <div className="flex items-center gap-1.5">
            <Link href="/telemedicine" title="Voltar à Telemedicina" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/70 text-muted-foreground shadow-sm transition hover:border-cyan-300 hover:text-foreground"><ArrowLeft size={15} /></Link>
            <HeartPulse size={16} className="text-cyan-600 dark:text-cyan-400" /><h1 className="text-sm font-bold leading-none text-foreground">Programas crónicos</h1>
          </div>
          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"><HeartPulse size={13} className="shrink-0 text-sky-600" />Total<b className="text-xs font-bold text-sky-600">{loading ? "…" : items.length}</b></span>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"><Activity size={13} className="shrink-0 text-emerald-600" />Ativos<b className="text-xs font-bold text-emerald-600">{loading ? "…" : activeCount}</b></span>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"><AlertTriangle size={13} className="shrink-0 text-rose-600" />Revisão em atraso<b className="text-xs font-bold text-rose-600">{loading ? "…" : dueCount}</b></span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <div className="relative"><Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Paciente, código, gestor…" className="h-7 w-40 rounded-md border border-slate-200 bg-white/80 pl-6 pr-2 text-xs outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 sm:w-52 dark:border-slate-700 dark:bg-slate-900/70" /></div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-7 rounded-md border border-slate-200 bg-white/80 px-1.5 text-xs outline-none transition focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900/70">
              <option value="">Todos</option>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <Link href="/telemedicine/chronic-programs/new" title="Novo programa" className="inline-flex h-7 items-center gap-1 rounded-md bg-gradient-to-r from-cyan-600 to-violet-600 px-2 text-xs font-semibold text-white transition hover:from-cyan-700 hover:to-violet-700"><Plus size={13} /> Novo</Link>
          </div>
        </section>

        {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error}</div> : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" /> A carregar programas…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/65 px-3 py-10 text-center text-xs text-muted-foreground">Sem programas para mostrar.</div>
        ) : (
          <div className="flex flex-wrap items-stretch gap-1.5">
            {filtered.map((p) => {
              const status = String(p.status || "").toUpperCase();
              const meta = STATUS_META[status] || STATUS_META.ENROLLED;
              const actions = ACTIONS_BY_STATUS[status] || [];
              const busy = busyId === p.id;
              const overdue = ["ACTIVE", "ENROLLED"].includes(status) && isOverdue(p.next_review_date);
              return (
                <div key={p.id} className={`relative flex w-[18rem] flex-col overflow-hidden rounded-lg border bg-white/80 shadow-sm transition dark:bg-slate-900/65 ${busy ? "opacity-60" : ""} ${overdue ? "border-rose-300 dark:border-rose-700/50" : "border-white/60 dark:border-white/10"}`}>
                  <span className={`absolute inset-y-0 left-0 w-1 ${meta.bar}`} />
                  <Link href={`/telemedicine/chronic-programs/${p.id}`} className="block flex-1 py-1.5 pl-3 pr-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold leading-tight text-foreground">{p.patient_name || "Sem paciente"}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{CONDITION_LABEL[String(p.condition || "").toUpperCase()] || "Condição —"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${meta.tone}`}>{meta.label}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className={`inline-flex items-center gap-0.5 ${overdue ? "font-semibold text-rose-600 dark:text-rose-400" : ""}`}><CalendarClock size={10} /> Rev.: {fmtDate(p.next_review_date)}{overdue ? " (atraso)" : ""}</span>
                      {(p.alert_count ?? 0) > 0 ? <span className="ml-auto inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400"><AlertTriangle size={10} /> {p.alert_count}</span> : null}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[9px] text-muted-foreground">
                      {p.care_manager_name ? <span className="inline-flex min-w-0 items-center gap-0.5 truncate"><User size={9} /> {p.care_manager_name}</span> : null}
                      <span className="ml-auto shrink-0">a cada {p.review_frequency_days ?? "—"}d</span>
                    </div>
                  </Link>
                  {actions.length ? (
                    <div className="flex items-center gap-1 border-t border-border/40 px-1.5 py-1">
                      {actions.map((a) => {
                        const AIcon = a.icon;
                        return (
                          <button key={a.endpoint} type="button" disabled={busy} title={a.label} onClick={() => runAction(p, a.endpoint)}
                            className={`inline-flex h-6 flex-1 items-center justify-center gap-1 rounded-md px-1 text-[10px] font-semibold transition disabled:opacity-50 ${a.kind === "primary" ? "bg-gradient-to-r from-cyan-600 to-violet-600 text-white hover:from-cyan-700 hover:to-violet-700" : "border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800/40 dark:text-rose-300"}`}>
                            {busy ? <Loader2 size={11} className="animate-spin" /> : <AIcon size={11} />}{a.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
