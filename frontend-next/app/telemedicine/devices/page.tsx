"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, BatteryFull, BatteryLow, Cpu, Loader2, Pause, Play, Plus, RadioTower, Search, Trash2, XCircle } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Device = {
  id: number;
  custom_id?: string | null;
  patient_name?: string | null;
  reading_count?: number | null;
  device_type?: string | null;
  status?: string | null;
  manufacturer?: string | null;
  model_name?: string | null;
  serial_number?: string | null;
  paired_at?: string | null;
  last_sync_at?: string | null;
  battery_percent?: string | number | null;
  notes?: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  BLOOD_PRESSURE: "Medidor de pressão", GLUCOMETER: "Glicómetro", PULSE_OXIMETER: "Oxímetro",
  WEARABLE: "Wearable", SPIROMETER: "Espirómetro", SCALE: "Balança", OTHER: "Outro",
};

const STATUS_META: Record<string, { label: string; tone: string; bar: string }> = {
  REGISTERED: { label: "Registado", tone: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/40 dark:bg-sky-950/30 dark:text-sky-300", bar: "bg-sky-500" },
  ACTIVE: { label: "Ativo", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300", bar: "bg-emerald-500" },
  PAUSED: { label: "Pausado", tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300", bar: "bg-amber-500" },
  LOST: { label: "Perdido", tone: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300", bar: "bg-rose-500" },
  RETIRED: { label: "Retirado", tone: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400", bar: "bg-slate-400" },
};

// Ações de estado disponíveis conforme o estado atual.
const ACTIONS_BY_STATUS: Record<string, Array<{ endpoint: string; label: string; icon: any; kind: "primary" | "danger" }>> = {
  REGISTERED: [{ endpoint: "ativar", label: "Ativar", icon: Play, kind: "primary" }, { endpoint: "retirar", label: "Retirar", icon: Trash2, kind: "danger" }],
  ACTIVE: [{ endpoint: "pausar", label: "Pausar", icon: Pause, kind: "primary" }, { endpoint: "marcar-perdido", label: "Perdido", icon: XCircle, kind: "danger" }],
  PAUSED: [{ endpoint: "ativar", label: "Reativar", icon: Play, kind: "primary" }, { endpoint: "retirar", label: "Retirar", icon: Trash2, kind: "danger" }],
  LOST: [{ endpoint: "retirar", label: "Retirar", icon: Trash2, kind: "danger" }],
};

function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
function fmt(value?: string | null) {
  if (!value) return "nunca";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function TelemedicineDevicesListPage() {
  const [items, setItems] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetchList<Device>("/telemedicine/device/", { page: 1, pageSize: 200, clientPaginate: true, clientCache: false });
      setItems(res.items || []);
    } catch (e: any) {
      setError(e?.message || "Não foi possível carregar os dispositivos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runAction = useCallback(async (device: Device, endpoint: string) => {
    if (busyId) return;
    setBusyId(device.id);
    setError(null);
    try {
      await apiFetch(`/telemedicine/device/${device.id}/${endpoint}/`, { method: "POST", body: JSON.stringify({}) });
      await load();
    } catch (e: any) {
      setError(e?.message || "Não foi possível atualizar o dispositivo.");
    } finally {
      setBusyId(null);
    }
  }, [busyId, load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return items.filter((d) =>
      (!statusFilter || String(d.status || "").toUpperCase() === statusFilter) &&
      (!term || [d.patient_name, d.custom_id, d.serial_number, d.manufacturer, d.model_name].filter(Boolean).join(" ").toLocaleLowerCase().includes(term))
    );
  }, [items, search, statusFilter]);

  const activeCount = useMemo(() => items.filter((d) => String(d.status || "").toUpperCase() === "ACTIVE").length, [items]);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.RECEPCAO, GROUPS.ENFERMAGEM, GROUPS.TELEMEDICINA]}>
      <div className="mx-auto w-full max-w-[99vw] space-y-1 px-1 pb-2">
        {/* Header mínimo: voltar + título + indicadores + busca/filtro. */}
        <section className="relative flex flex-wrap items-center gap-x-2 gap-y-1 overflow-hidden rounded-lg border border-cyan-200/60 bg-white/55 px-2 py-1 shadow-sm backdrop-blur dark:border-cyan-900/35 dark:bg-slate-950/45">
          <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-cyan-500 to-violet-600" />
          <div className="flex items-center gap-1.5">
            <Link href="/telemedicine" title="Voltar à Telemedicina" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/70 text-muted-foreground shadow-sm transition hover:border-cyan-300 hover:text-foreground"><ArrowLeft size={15} /></Link>
            <Cpu size={16} className="text-cyan-600 dark:text-cyan-400" /><h1 className="text-sm font-bold leading-none text-foreground">Dispositivos de monitorização</h1>
          </div>
          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"><Cpu size={13} className="shrink-0 text-sky-600" />Total<b className="text-xs font-bold text-sky-600">{loading ? "…" : items.length}</b></span>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"><RadioTower size={13} className="shrink-0 text-emerald-600" />Ativos<b className="text-xs font-bold text-emerald-600">{loading ? "…" : activeCount}</b></span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <div className="relative"><Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Paciente, série, fabricante…" className="h-7 w-40 rounded-md border border-slate-200 bg-white/80 pl-6 pr-2 text-xs outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 sm:w-52 dark:border-slate-700 dark:bg-slate-900/70" /></div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-7 rounded-md border border-slate-200 bg-white/80 px-1.5 text-xs outline-none transition focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900/70">
              <option value="">Todos</option>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <Link href="/telemedicine/devices/new" title="Novo dispositivo" className="inline-flex h-7 items-center gap-1 rounded-md bg-gradient-to-r from-cyan-600 to-violet-600 px-2 text-xs font-semibold text-white transition hover:from-cyan-700 hover:to-violet-700"><Plus size={13} /> Novo</Link>
          </div>
        </section>

        {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error}</div> : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" /> A carregar dispositivos…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/65 px-3 py-10 text-center text-xs text-muted-foreground">Sem dispositivos para mostrar.</div>
        ) : (
          <div className="flex flex-wrap items-stretch gap-1.5">
            {filtered.map((d) => {
              const status = String(d.status || "").toUpperCase();
              const meta = STATUS_META[status] || STATUS_META.REGISTERED;
              const actions = ACTIONS_BY_STATUS[status] || [];
              const battery = num(d.battery_percent);
              const lowBattery = battery != null && battery <= 20;
              const busy = busyId === d.id;
              return (
                <div key={d.id} className={`relative flex w-[17rem] flex-col overflow-hidden rounded-lg border bg-white/80 shadow-sm transition dark:bg-slate-900/65 ${busy ? "opacity-60" : ""} border-white/60 dark:border-white/10`}>
                  <span className={`absolute inset-y-0 left-0 w-1 ${meta.bar}`} />
                  <Link href={`/telemedicine/devices/${d.id}`} className="block flex-1 py-1.5 pl-3 pr-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold leading-tight text-foreground">{d.patient_name || "Sem paciente"}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{TYPE_LABEL[String(d.device_type || "").toUpperCase()] || "Dispositivo"}{d.model_name ? ` · ${d.model_name}` : ""}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${meta.tone}`}>{meta.label}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className={`inline-flex items-center gap-0.5 ${lowBattery ? "text-rose-600 dark:text-rose-400 font-semibold" : ""}`}>{lowBattery ? <BatteryLow size={11} /> : <BatteryFull size={11} />}{battery != null ? `${battery}%` : "—"}</span>
                      <span className="inline-flex items-center gap-0.5"><Activity size={10} /> {d.reading_count ?? 0} leituras</span>
                      <span className="ml-auto truncate">Sinc.: {fmt(d.last_sync_at)}</span>
                    </div>
                    {d.serial_number ? <p className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground">SN: {d.serial_number}</p> : null}
                  </Link>
                  {actions.length ? (
                    <div className="flex items-center gap-1 border-t border-border/40 px-1.5 py-1">
                      {actions.map((a) => {
                        const AIcon = a.icon;
                        return (
                          <button key={a.endpoint} type="button" disabled={busy} title={a.label} onClick={() => runAction(d, a.endpoint)}
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
