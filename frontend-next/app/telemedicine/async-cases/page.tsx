"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, ClipboardList, FileStack, HelpCircle, Loader2, Plus, Search, Stethoscope, User, XCircle } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Case = {
  id: number;
  custom_id?: string | null;
  patient_name?: string | null;
  reviewer_name?: string | null;
  consultation_label?: string | null;
  specialty_area?: string | null;
  status?: string | null;
  title?: string | null;
  clinical_question?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  media_manifest?: unknown[] | null;
};

const AREA_LABEL: Record<string, string> = { DERMATOLOGY: "Dermatologia", RADIOLOGY: "Radiologia", OPHTHALMOLOGY: "Oftalmologia", WOUND_CARE: "Feridas", OTHER: "Outra" };

const STATUS_META: Record<string, { label: string; tone: string; bar: string }> = {
  SUBMITTED: { label: "Submetido", tone: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/40 dark:bg-sky-950/30 dark:text-sky-300", bar: "bg-sky-500" },
  TRIAGED: { label: "Triado", tone: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800/40 dark:bg-cyan-950/30 dark:text-cyan-300", bar: "bg-cyan-500" },
  IN_REVIEW: { label: "Em revisão", tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300", bar: "bg-amber-500" },
  NEEDS_INFO: { label: "Requer info", tone: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/40 dark:bg-orange-950/30 dark:text-orange-300", bar: "bg-orange-500" },
  COMPLETED: { label: "Concluído", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300", bar: "bg-emerald-500" },
  CANCELLED: { label: "Cancelado", tone: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400", bar: "bg-slate-400" },
};

// Ações de workflow conforme o estado atual.
const ACTIONS_BY_STATUS: Record<string, Array<{ endpoint: string; label: string; icon: any; kind: "primary" | "danger" }>> = {
  SUBMITTED: [{ endpoint: "triar", label: "Triar", icon: ChevronRight, kind: "primary" }, { endpoint: "cancelar", label: "Cancelar", icon: XCircle, kind: "danger" }],
  TRIAGED: [{ endpoint: "iniciar-revisao", label: "Rever", icon: Stethoscope, kind: "primary" }, { endpoint: "cancelar", label: "Cancelar", icon: XCircle, kind: "danger" }],
  IN_REVIEW: [{ endpoint: "pedir-informacao", label: "Pedir info", icon: HelpCircle, kind: "primary" }, { endpoint: "concluir", label: "Concluir", icon: CheckCircle2, kind: "primary" }, { endpoint: "cancelar", label: "Cancelar", icon: XCircle, kind: "danger" }],
  NEEDS_INFO: [{ endpoint: "iniciar-revisao", label: "Retomar", icon: Stethoscope, kind: "primary" }, { endpoint: "cancelar", label: "Cancelar", icon: XCircle, kind: "danger" }],
};

function fmt(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function TelemedicineAsyncCasesListPage() {
  const [items, setItems] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetchList<Case>("/telemedicine/async_case/", { page: 1, pageSize: 200, clientPaginate: true, clientCache: false });
      setItems(res.items || []);
    } catch (e: any) {
      setError(e?.message || "Não foi possível carregar os casos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runAction = useCallback(async (c: Case, endpoint: string) => {
    if (busyId) return;
    setBusyId(c.id);
    setError(null);
    try {
      await apiFetch(`/telemedicine/async_case/${c.id}/${endpoint}/`, { method: "POST", body: JSON.stringify({}) });
      await load();
    } catch (e: any) {
      setError(e?.message || "Não foi possível atualizar o caso.");
    } finally {
      setBusyId(null);
    }
  }, [busyId, load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return items.filter((c) =>
      (!statusFilter || String(c.status || "").toUpperCase() === statusFilter) &&
      (!term || [c.title, c.patient_name, c.custom_id, c.reviewer_name].filter(Boolean).join(" ").toLocaleLowerCase().includes(term))
    );
  }, [items, search, statusFilter]);

  const pendingCount = useMemo(() => items.filter((c) => ["SUBMITTED", "TRIAGED", "IN_REVIEW", "NEEDS_INFO"].includes(String(c.status || "").toUpperCase())).length, [items]);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.RECEPCAO, GROUPS.TELEMEDICINA]}>
      <div className="mx-auto w-full max-w-[99vw] space-y-1 px-1 pb-2">
        {/* Header mínimo: voltar + título + indicadores + busca/filtro. */}
        <section className="relative flex flex-wrap items-center gap-x-2 gap-y-1 overflow-hidden rounded-lg border border-cyan-200/60 bg-white/55 px-2 py-1 shadow-sm backdrop-blur dark:border-cyan-900/35 dark:bg-slate-950/45">
          <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-cyan-500 to-violet-600" />
          <div className="flex items-center gap-1.5">
            <Link href="/telemedicine" title="Voltar à Telemedicina" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/70 text-muted-foreground shadow-sm transition hover:border-cyan-300 hover:text-foreground"><ArrowLeft size={15} /></Link>
            <FileStack size={16} className="text-cyan-600 dark:text-cyan-400" /><h1 className="text-sm font-bold leading-none text-foreground">Casos assíncronos</h1>
          </div>
          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"><FileStack size={13} className="shrink-0 text-sky-600" />Total<b className="text-xs font-bold text-sky-600">{loading ? "…" : items.length}</b></span>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"><ClipboardList size={13} className="shrink-0 text-amber-600" />Pendentes<b className="text-xs font-bold text-amber-600">{loading ? "…" : pendingCount}</b></span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <div className="relative"><Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Título, paciente, revisor…" className="h-7 w-40 rounded-md border border-slate-200 bg-white/80 pl-6 pr-2 text-xs outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 sm:w-52 dark:border-slate-700 dark:bg-slate-900/70" /></div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-7 rounded-md border border-slate-200 bg-white/80 px-1.5 text-xs outline-none transition focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900/70">
              <option value="">Todos</option>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <Link href="/telemedicine/async-cases/new" title="Novo caso" className="inline-flex h-7 items-center gap-1 rounded-md bg-gradient-to-r from-cyan-600 to-violet-600 px-2 text-xs font-semibold text-white transition hover:from-cyan-700 hover:to-violet-700"><Plus size={13} /> Novo</Link>
          </div>
        </section>

        {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error}</div> : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" /> A carregar casos…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/65 px-3 py-10 text-center text-xs text-muted-foreground">Sem casos para mostrar.</div>
        ) : (
          <div className="flex flex-wrap items-stretch gap-1.5">
            {filtered.map((c) => {
              const status = String(c.status || "").toUpperCase();
              const meta = STATUS_META[status] || STATUS_META.SUBMITTED;
              const actions = ACTIONS_BY_STATUS[status] || [];
              const busy = busyId === c.id;
              const mediaCount = Array.isArray(c.media_manifest) ? c.media_manifest.length : 0;
              return (
                <div key={c.id} className={`relative flex w-[19rem] flex-col overflow-hidden rounded-lg border border-white/60 bg-white/80 shadow-sm transition dark:border-white/10 dark:bg-slate-900/65 ${busy ? "opacity-60" : ""}`}>
                  <span className={`absolute inset-y-0 left-0 w-1 ${meta.bar}`} />
                  <Link href={`/telemedicine/async-cases/${c.id}`} className="block flex-1 py-1.5 pl-3 pr-2">
                    <div className="flex items-start justify-between gap-1">
                      <p className="min-w-0 flex-1 truncate text-xs font-bold leading-tight text-foreground">{c.title || "Sem título"}</p>
                      <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${meta.tone}`}>{meta.label}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="inline-flex min-w-0 items-center gap-0.5 truncate"><User size={10} /> {c.patient_name || "Sem paciente"}</span>
                      <span className="ml-auto shrink-0 rounded bg-muted/50 px-1 py-px">{AREA_LABEL[String(c.specialty_area || "").toUpperCase()] || "—"}</span>
                    </div>
                    {c.clinical_question ? <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{c.clinical_question}</p> : null}
                    <div className="mt-1 flex items-center gap-2 text-[9px] text-muted-foreground">
                      <span>{fmt(c.submitted_at)}</span>
                      {c.reviewer_name ? <span className="inline-flex items-center gap-0.5 truncate"><Stethoscope size={9} /> {c.reviewer_name}</span> : null}
                      {mediaCount > 0 ? <span className="ml-auto inline-flex items-center gap-0.5"><FileStack size={9} /> {mediaCount}</span> : null}
                    </div>
                  </Link>
                  {actions.length ? (
                    <div className="flex items-center gap-1 border-t border-border/40 px-1.5 py-1">
                      {actions.map((a) => {
                        const AIcon = a.icon;
                        return (
                          <button key={a.endpoint} type="button" disabled={busy} title={a.label} onClick={() => runAction(c, a.endpoint)}
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
