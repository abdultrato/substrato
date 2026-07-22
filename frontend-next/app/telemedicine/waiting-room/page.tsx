"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, ClipboardList, Clock3, Headphones, Loader2, MonitorCheck, Plus, RefreshCw, Search, ShieldCheck, User, Video, XCircle } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import ColumnCardScroller from "./ColumnCardScroller";
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
const ADVANCE: Record<Column, { endpoint: string; label: string; short: string; to: Column | null } | null> = {
  waiting: { endpoint: "iniciar-triagem", label: "Iniciar triagem", short: "Triagem", to: "triage" },
  triage: { endpoint: "marcar-pronto", label: "Marcar pronto", short: "Pronto", to: "ready" },
  ready: { endpoint: "iniciar-chamada", label: "Iniciar chamada", short: "Chamar", to: "call" },
  call: { endpoint: "concluir", label: "Concluir", short: "Concluir", to: null },
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

export default function TelemedicineWaitingRoomListPage() {
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

  useEffect(() => { load(); }, [load]);

  // Auto-atualização em tempo real. Usa uma referência estável de `load` para o
  // intervalo não ser recriado a cada render (evitava um ciclo de re-registo).
  // Recarrega em silêncio, saltando quando a aba está escondida ou há uma
  // transição em curso.
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (busyRef.current) return;
      loadRef.current({ silent: true });
    }, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

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
    <div className="mx-auto w-full max-w-[min(99vw,1680px)] space-y-1 px-1 pb-2">
      {/* Header mínimo: título + métricas inline + busca, tudo numa faixa fina. */}
      <section className="relative flex flex-wrap items-center gap-x-2 gap-y-1 overflow-hidden rounded-lg border border-cyan-200/60 bg-white/55 px-2 py-1 shadow-sm backdrop-blur dark:border-cyan-900/35 dark:bg-slate-950/45">
        <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-cyan-500 to-violet-600" />
        <div className="flex items-center gap-1.5">
          <Video size={16} className="text-cyan-600 dark:text-cyan-400" />
          <h1 className="text-sm font-bold leading-none text-foreground">Sala de espera virtual</h1>
        </div>
        {/* Indicadores mínimos, inline nowrap: ícone + rótulo + número, cada um
            numa única linha sem quebrar. */}
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          {([["Em atendimento", board.call.length, Headphones, "text-violet-600"], ["Prontos", board.ready.length, CheckCircle2, "text-emerald-600"], ["Consentimento", consentCount, ShieldCheck, "text-cyan-600"], ["Fila ativa", activeItems.length, ClipboardList, "text-sky-600"]] as const).map(([label, value, Icon, tone]) => <span key={label} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"><Icon size={13} className={`shrink-0 ${tone}`} />{label}<b className={`text-xs font-bold ${tone}`}>{loading ? "…" : value}</b></span>)}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="relative"><Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar…" className="h-7 w-32 rounded-md border border-slate-200 bg-white/80 pl-6 pr-2 text-xs outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 sm:w-40 dark:border-slate-700 dark:bg-slate-900/70" /></div>
          <select value={priority} onChange={(event) => setPriority(event.target.value)} className="h-7 rounded-md border border-slate-200 bg-white/80 px-1.5 text-xs outline-none transition focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900/70"><option value="">Todas</option><option value="EMERGENCY">Emergência</option><option value="URGENT">Urgente</option><option value="PRIORITY">Prioritário</option><option value="ROUTINE">Rotina</option></select>
          <button type="button" onClick={() => load()} title="Atualizar" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-cyan-200 bg-white/70 text-cyan-700 transition hover:bg-cyan-50 dark:border-cyan-800/50 dark:bg-slate-900/60 dark:text-cyan-300"><RefreshCw size={13} className={busyId != null ? "animate-spin" : ""} /></button>
          <Link href="/telemedicine/waiting-room/new" title="Novo check-in" className="inline-flex h-7 items-center gap-1 rounded-md bg-gradient-to-r from-cyan-600 to-violet-600 px-2 text-xs font-semibold text-white transition hover:from-cyan-700 hover:to-violet-700"><Plus size={13} /> Novo</Link>
        </div>
      </section>
      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error}</div> : null}
      {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" /> A atualizar a fila…</div> : <div className="flex items-start gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">{COLUMNS.map((column) => {
        const isDropTarget = dragOver === column.key;
        return <section
          key={column.key}
          onDragOver={(event) => { event.preventDefault(); setDragOver(column.key); }}
          onDragLeave={() => setDragOver((current) => (current === column.key ? null : current))}
          onDrop={(event) => handleDrop(column.key, event)}
          className={`w-[18rem] shrink-0 overflow-hidden rounded-lg border ${column.tone} ${isDropTarget ? `ring-2 ${column.ring}` : ""}`}
        >
          <header className="flex items-center justify-between border-b border-inherit px-2 py-1"><h2 className="text-[11px] font-bold uppercase tracking-wide text-foreground">{column.label}</h2><span className={`rounded-full px-1.5 text-[10px] font-bold ${column.countTone}`}>{board[column.key].length}</span></header>
          {board[column.key].length === 0 ? <div className="p-1"><p className="rounded-md border border-dashed border-border/65 px-2 py-6 text-center text-[11px] text-muted-foreground">Vazio</p></div> : <ColumnCardScroller>{board[column.key].map((entry) => <WaitingCard key={entry.id} entry={entry} column={column.key} busy={busyId === entry.id} onAction={runAction} />)}</ColumnCardScroller>}
        </section>;
      })}</div>}
    </div>
  </AppLayout>;
}

function WaitingCard({ entry, column, busy, onAction }: { entry: Entry; column: Column; busy: boolean; onAction: (entry: Entry, endpoint: string) => void }) {
  const inCall = entry.status === "IN_CALL";
  const advance = ADVANCE[column];
  const canRemove = column !== "call";
  const urgent = entry.priority === "URGENT" || entry.priority === "EMERGENCY";
  return <div
    draggable={!busy}
    onDragStart={(event) => { event.dataTransfer.setData("text/plain", String(entry.id)); event.dataTransfer.effectAllowed = "move"; }}
    className={`group relative flex h-full w-32 shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-white/60 bg-white/80 shadow-sm transition hover:border-cyan-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/65 dark:hover:border-cyan-600/60 ${busy ? "pointer-events-none opacity-60" : "cursor-grab active:cursor-grabbing"}`}
  >
    <span className={`absolute inset-y-0 left-0 w-1 ${inCall ? "bg-violet-500" : urgent ? "bg-rose-500" : "bg-cyan-500"}`} />
    <Link href={`/telemedicine/waiting-room/${entry.id}`} className="block flex-1 py-1.5 pl-2.5 pr-2">
      {/* Linha 1: nome (identificação de relance). */}
      <p className="truncate text-xs font-bold leading-tight text-foreground">{entry.patient_name || "Sem nome"}</p>
      {/* Linha 2: espera + posição na fila. */}
      <div className="mt-0.5 flex items-center justify-between text-[10px]">
        <span className={`inline-flex items-center gap-0.5 font-semibold ${urgent ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}><Clock3 size={10} /> {waitLabel(entry.check_in_at)}</span>
        <span className="tabular-nums text-muted-foreground">{inCall ? "em curso" : `#${entry.queue_position || "—"}`}</span>
      </div>
      {/* Linha 3: clínico + selos de dispositivo/consentimento. */}
      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-0.5 truncate"><User size={10} /> {entry.clinician_name || "Sem clínico"}</span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-0.5">
          {entry.device_check_passed ? <MonitorCheck size={10} className="text-emerald-600 dark:text-emerald-400" /> : null}
          {entry.consent_confirmed ? <ShieldCheck size={10} className="text-cyan-600 dark:text-cyan-400" /> : null}
        </span>
      </div>
    </Link>
    {/* Ações de fluxo compactas: avançar etapa (ícone-only) + faltou. */}
    <div className="flex items-center gap-1 border-t border-border/40 px-1.5 py-1">
      {advance ? <button type="button" disabled={busy} title={advance.label} onClick={() => onAction(entry, advance.endpoint)} className="inline-flex h-6 min-w-0 flex-1 items-center justify-center gap-0.5 rounded-md bg-gradient-to-r from-cyan-600 to-violet-600 px-1 text-[10px] font-semibold text-white transition hover:from-cyan-700 hover:to-violet-700 disabled:opacity-50">{busy ? <Loader2 size={11} className="shrink-0 animate-spin" /> : <ChevronRight size={11} className="shrink-0" />}<span className="truncate">{advance.short}</span></button> : <span className="flex-1" />}
      {canRemove ? <button type="button" disabled={busy} title="Marcar como faltou" onClick={() => onAction(entry, "faltou")} className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800/40 dark:text-rose-300"><XCircle size={12} /></button> : null}
    </div>
  </div>;
}





