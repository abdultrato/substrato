"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, ClipboardList, Clock3, Headphones, Loader2, MonitorCheck, Plus, RefreshCw, Search, ShieldCheck, Stethoscope, UserRound, Video, XCircle } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Entry = { id: number; custom_id?: string | null; patient_name?: string | null; clinician_name?: string | null; status?: string | null; priority?: string | null; queue_position?: number | null; check_in_at?: string | null; estimated_start_at?: string | null; chief_complaint?: string | null; device_check_passed?: boolean; consent_confirmed?: boolean };
type Column = "waiting" | "triage" | "ready" | "call";

const COLUMNS: Array<{ key: Column; label: string; hint: string; tone: string; countTone: string; ring: string }> = [
  { key: "waiting", label: "Na sala", hint: "Aguardam acolhimento", tone: "border-sky-200/80 bg-sky-50/65 dark:border-sky-800/40 dark:bg-sky-950/15", countTone: "bg-sky-100 text-sky-700 dark:bg-sky-900/45 dark:text-sky-300", ring: "ring-sky-400/70" },
  { key: "triage", label: "Em triagem", hint: "Avaliação preliminar", tone: "border-amber-200/80 bg-amber-50/65 dark:border-amber-800/40 dark:bg-amber-950/15", countTone: "bg-amber-100 text-amber-700 dark:bg-amber-900/45 dark:text-amber-300", ring: "ring-amber-400/70" },
  { key: "ready", label: "Prontos", hint: "Liberados para chamada", tone: "border-emerald-200/80 bg-emerald-50/65 dark:border-emerald-800/40 dark:bg-emerald-950/15", countTone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-300", ring: "ring-emerald-400/70" },
  { key: "call", label: "Em chamada", hint: "Atendimento em curso", tone: "border-violet-200/80 bg-violet-50/65 dark:border-violet-800/40 dark:bg-violet-950/15", countTone: "bg-violet-100 text-violet-700 dark:bg-violet-900/45 dark:text-violet-300", ring: "ring-violet-400/70" },
];

// Transição de "avanço" de cada coluna: endpoint da API + coluna de destino.
// Suporta tanto os botões de ação como o drag-and-drop entre colunas adjacentes.
const ADVANCE: Record<Column, { endpoint: string; label: string; to: Column | null } | null> = {
  waiting: { endpoint: "iniciar-triagem", label: "Iniciar triagem", to: "triage" },
  triage: { endpoint: "marcar-pronto", label: "Marcar pronto", to: "ready" },
  ready: { endpoint: "iniciar-chamada", label: "Iniciar chamada", to: "call" },
  call: { endpoint: "concluir", label: "Concluir", to: null },
};

const AUTO_REFRESH_MS = 15000;

function columnFor(status?: string | null): Column | null {
  return ({ CHECKED_IN: "waiting", TRIAGE: "triage", READY: "ready", IN_CALL: "call" } as Record<string, Column>)[String(status || "").toUpperCase()] || null;
}
function priorityStyle(priority?: string | null) {
  return ({ EMERGENCY: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300", URGENT: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/40 dark:bg-orange-950/30 dark:text-orange-300", PRIORITY: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300" } as Record<string, string>)[String(priority || "").toUpperCase()] || "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300";
}
function priorityLabel(priority?: string | null) { return ({ EMERGENCY: "Emergência", URGENT: "Urgente", PRIORITY: "Prioritário", ROUTINE: "Rotina" } as Record<string, string>)[String(priority || "").toUpperCase()] || "Rotina"; }
function waitLabel(value?: string | null) { if (!value) return "sem horário"; const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000)); return minutes < 1 ? "agora" : minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}min`; }
function formatTime(value?: string | null) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }); }

export default function TelemedicineWaitingRoomListPage() {
  const refreshToken = useSafeDataRefreshSignal();
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<Column | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  // Mantém a referência viva do "há mutação em curso" para o auto-refresh não
  // recarregar por cima de uma transição a decorrer.
  const busyRef = useRef(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      setError(null);
      const response = await apiFetchList<Entry>("/telemedicine/waiting_room/", { page: 1, pageSize: 100, clientPaginate: true, clientCache: false });
      setItems(response.items || []);
      setLastSync(new Date());
    } catch (err: any) { setError(err?.message || "Não foi possível carregar a sala de espera virtual."); if (!opts?.silent) setItems([]); }
    finally { if (!opts?.silent) setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshToken]);

  // Auto-atualização em tempo real: recarrega em silêncio a cada AUTO_REFRESH_MS,
  // saltando quando a aba está escondida ou há uma transição em curso.
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (busyRef.current) return;
      load({ silent: true });
    }, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Executa uma transição de workflow (botão ou drop) e recarrega a fila.
  const runAction = useCallback(async (entry: Entry, endpoint: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyId(entry.id);
    setError(null);
    try {
      await apiFetch(`/telemedicine/waiting_room/${entry.id}/${endpoint}/`, { method: "POST", body: JSON.stringify({}) });
      await load({ silent: true });
    } catch (err: any) {
      setError(err?.message || "Não foi possível atualizar o paciente.");
    } finally {
      busyRef.current = false;
      setBusyId(null);
    }
  }, [load]);

  const activeItems = useMemo(() => items.filter((item) => columnFor(item.status)), [items]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return activeItems.filter((item) => (!priority || item.priority === priority) && (!term || [item.patient_name, item.custom_id, item.chief_complaint, item.clinician_name].filter(Boolean).join(" ").toLocaleLowerCase().includes(term)));
  }, [activeItems, priority, search]);
  const board = useMemo(() => {
    const next: Record<Column, Entry[]> = { waiting: [], triage: [], ready: [], call: [] };
    filtered.forEach((item) => { const column = columnFor(item.status); if (column) next[column].push(item); });
    Object.values(next).forEach((entries) => entries.sort((a, b) => (a.queue_position || 999) - (b.queue_position || 999)));
    return next;
  }, [filtered]);
  const consentCount = activeItems.filter((item) => item.consent_confirmed).length;

  // Drop numa coluna: só é válido se a origem avança exatamente para essa coluna.
  const handleDrop = useCallback((target: Column, event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(null);
    const id = Number(event.dataTransfer.getData("text/plain"));
    const entry = activeItems.find((item) => item.id === id);
    if (!entry) return;
    const from = columnFor(entry.status);
    if (!from) return;
    const advance = ADVANCE[from];
    if (advance && advance.to === target) runAction(entry, advance.endpoint);
  }, [activeItems, runAction]);

  return <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.RECEPCAO, GROUPS.ENFERMAGEM]}>
    <div className="mx-auto w-full max-w-[min(98vw,1680px)] space-y-2 px-2 pb-4">
      <section className="relative overflow-hidden rounded-2xl border border-cyan-200/60 bg-white/55 shadow-sm backdrop-blur-xl dark:border-cyan-900/35 dark:bg-slate-950/45">
        <div className="pointer-events-none absolute inset-0 overflow-hidden"><div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" /><div className="absolute left-1/3 -bottom-16 h-36 w-36 rounded-full bg-violet-400/10 blur-3xl" /></div>
        <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cyan-500 via-sky-500 to-violet-600" />
        <div className="relative flex flex-wrap items-center gap-2 px-3 py-2.5"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 text-white shadow-md shadow-cyan-500/25"><Video size={20} /></div><div className="min-w-0 flex-1"><p className="text-[10px] font-medium uppercase tracking-[0.16em] text-cyan-700/75 dark:text-cyan-300/70">Telemedicina · Operação em tempo real</p><h1 className="text-lg font-bold leading-tight text-foreground">Sala de espera virtual</h1></div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 text-[10px] text-muted-foreground sm:inline-flex"><RefreshCw size={11} className={busyId != null ? "animate-spin" : ""} /> {lastSync ? `Atualizado ${formatTime(lastSync.toISOString())}` : "A sincronizar…"}</span>
            <button type="button" onClick={() => load()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cyan-200 bg-white/70 px-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50 dark:border-cyan-800/50 dark:bg-slate-900/60 dark:text-cyan-300"><RefreshCw size={14} /> Atualizar</button>
            <Link href="/telemedicine/waiting-room/new" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 px-3 text-sm font-semibold text-white shadow-md shadow-cyan-500/25 transition hover:from-cyan-700 hover:to-violet-700"><Plus size={15} /> Novo check-in</Link>
          </div>
        </div>
        <div className="relative grid grid-cols-2 gap-1.5 border-t border-white/30 px-3 py-2 sm:grid-cols-4 dark:border-white/10">
          {[["Em atendimento", board.call.length, Headphones, "text-violet-600", "bg-violet-500/12"], ["Prontos agora", board.ready.length, CheckCircle2, "text-emerald-600", "bg-emerald-500/12"], ["Consentimento", consentCount, ShieldCheck, "text-cyan-600", "bg-cyan-500/12"], ["Fila ativa", activeItems.length, ClipboardList, "text-sky-600", "bg-sky-500/12"]].map(([label, value, Icon, text, background]) => { const MetricIcon = Icon as typeof Video; return <div key={String(label)} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/35 bg-white/35 px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.035]"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${text} ${background}`}><MetricIcon size={15} /></span><div className="min-w-0"><p className="truncate text-[10px] text-muted-foreground">{String(label)}</p><p className="text-sm font-bold text-foreground">{loading ? "…" : String(value)}</p></div></div>; })}
        </div>
        <div className="relative grid gap-1.5 border-t border-white/30 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_180px] dark:border-white/10"><div className="relative"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar paciente, código ou queixa…" className="h-9 w-full rounded-xl border border-slate-200 bg-white/80 pl-9 pr-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-900/70" /></div><select value={priority} onChange={(event) => setPriority(event.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none transition focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900/70"><option value="">Todas as prioridades</option><option value="EMERGENCY">Emergência</option><option value="URGENT">Urgente</option><option value="PRIORITY">Prioritário</option><option value="ROUTINE">Rotina</option></select></div>
      </section>
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error}</div> : null}
      {loading ? <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" /> A atualizar a fila…</div> : <div className="grid items-start gap-2 xl:grid-cols-4">{COLUMNS.map((column) => {
        const isDropTarget = dragOver === column.key;
        return <section
          key={column.key}
          onDragOver={(event) => { event.preventDefault(); setDragOver(column.key); }}
          onDragLeave={() => setDragOver((current) => (current === column.key ? null : current))}
          onDrop={(event) => handleDrop(column.key, event)}
          className={`overflow-hidden rounded-2xl border ${column.tone} ${isDropTarget ? `ring-2 ${column.ring}` : ""}`}
        >
          <header className="flex items-center justify-between border-b border-inherit px-3 py-2.5"><div><h2 className="text-xs font-bold uppercase tracking-wide text-foreground">{column.label}</h2><p className="text-[10px] text-muted-foreground">{column.hint}</p></div><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${column.countTone}`}>{board[column.key].length}</span></header>
          <div className="space-y-2 bg-background/25 p-2">{board[column.key].length === 0 ? <p className="rounded-xl border border-dashed border-border/65 px-3 py-9 text-center text-xs text-muted-foreground">Nenhum paciente nesta etapa.</p> : board[column.key].map((entry) => <WaitingCard key={entry.id} entry={entry} column={column.key} busy={busyId === entry.id} onAction={runAction} />)}</div>
        </section>;
      })}</div>}
    </div>
  </AppLayout>;
}

function WaitingCard({ entry, column, busy, onAction }: { entry: Entry; column: Column; busy: boolean; onAction: (entry: Entry, endpoint: string) => void }) {
  const inCall = entry.status === "IN_CALL";
  const advance = ADVANCE[column];
  const canRemove = column !== "call";
  return <div
    draggable={!busy}
    onDragStart={(event) => { event.dataTransfer.setData("text/plain", String(entry.id)); event.dataTransfer.effectAllowed = "move"; }}
    className={`group relative block overflow-hidden rounded-xl border border-white/60 bg-white/80 p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/65 dark:hover:border-cyan-600/60 ${busy ? "pointer-events-none opacity-60" : "cursor-grab active:cursor-grabbing"}`}
  >
    <span className={`absolute inset-y-0 left-0 w-1 ${inCall ? "bg-violet-500" : entry.priority === "URGENT" || entry.priority === "EMERGENCY" ? "bg-rose-500" : "bg-cyan-500"}`} />
    <div className="pl-2">
      <Link href={`/telemedicine/waiting-room/${entry.id}`} className="block">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-mono text-[10px] text-muted-foreground">{entry.custom_id || `TWR-${entry.id}`}</p><p className="truncate text-sm font-bold text-foreground">{entry.patient_name || "Paciente não identificado"}</p></div><span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${priorityStyle(entry.priority)}`}>{priorityLabel(entry.priority)}</span></div>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{entry.chief_complaint || "Sem queixa registada"}</p>
        <div className="mt-2 flex flex-wrap gap-1"><span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Clock3 size={10} /> {waitLabel(entry.check_in_at)}</span>{entry.device_check_passed ? <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><MonitorCheck size={10} /> Dispositivo</span> : null}{entry.consent_confirmed ? <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-1.5 py-0.5 text-[10px] text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300"><ShieldCheck size={10} /> Consentimento</span> : null}</div>
        <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-[10px] text-muted-foreground"><span className="inline-flex min-w-0 items-center gap-1 truncate"><UserRound size={10} /> {entry.clinician_name || "Sem clínico"}</span><span className="inline-flex items-center gap-0.5">{inCall ? <><Stethoscope size={10} /> Em curso</> : `Fila ${entry.queue_position || "—"}`}<ChevronRight size={13} className="opacity-0 transition group-hover:opacity-100" /></span></div>
        {entry.estimated_start_at ? <p className="mt-1 text-[10px] text-muted-foreground">Previsão: {formatTime(entry.estimated_start_at)}</p> : null}
      </Link>
      {/* Ações de fluxo: avançar etapa + remover (faltou). */}
      <div className="mt-2 flex items-center gap-1.5">
        {advance ? <button type="button" disabled={busy} onClick={() => onAction(entry, advance.endpoint)} className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-cyan-600 to-violet-600 px-2 text-[11px] font-semibold text-white shadow-sm transition hover:from-cyan-700 hover:to-violet-700 disabled:opacity-50">{busy ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />} {advance.label}</button> : null}
        {canRemove ? <button type="button" disabled={busy} title="Marcar como faltou" onClick={() => onAction(entry, "faltou")} className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-white px-2 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800/40 dark:bg-slate-900/60 dark:text-rose-300"><XCircle size={12} /> Faltou</button> : null}
      </div>
    </div>
  </div>;
}
