"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, Microscope, RefreshCw, Search } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { abbreviateMiddleNames } from "@/lib/formatName";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";
import {
  STATE_STYLES,
  fmtQueueDate,
  groupEntryDate,
  groupState,
  shortOrder,
  type GroupState,
  type QueueItem,
} from "@/lib/cultureQueue";

type CultureGroup = {
  orderId: string;
  patient: string;
  items: QueueItem[];
};

const REQUISITION_PATH = "/clinical-laboratory/cultures/requisition";

export default function LabCulturesPage() {
  const router = useRouter();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(manual = false) {
    const startedAt = Date.now();
    if (manual) setRefreshing(true);
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<QueueItem[]>("/clinical_laboratory/culture/queue/");
      setItems(data);
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar a fila de culturas.");
    } finally {
      if (manual) {
        const remaining = Math.max(0, 700 - (Date.now() - startedAt));
        if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
        setRefreshing(false);
      }
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => [
      item.patient_name,
      item.order_custom_id,
      item.order_item_custom_id,
      item.test_name,
      item.test_code,
      item.sample_barcode,
      item.status_display,
    ].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [items, query]);

  // Agrupa as culturas pela requisição (order). Cada grupo é um paciente/pedido.
  const groups = useMemo<CultureGroup[]>(() => {
    const map = new Map<string, CultureGroup>();
    for (const item of filtered) {
      const key = item.order_custom_id || "Sem requisição";
      let group = map.get(key);
      if (!group) {
        group = { orderId: key, patient: item.patient_name, items: [] };
        map.set(key, group);
      }
      if (!group.patient && item.patient_name) group.patient = item.patient_name;
      group.items.push(item);
    }
    return Array.from(map.values()).sort((a, b) => b.orderId.localeCompare(a.orderId));
  }, [filtered]);

  const now = Date.now();

  function openRequisition(orderId: string) {
    router.push(`${REQUISITION_PATH}?order=${encodeURIComponent(orderId)}`);
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="mx-auto w-full max-w-7xl space-y-3">
        <section className="relative overflow-hidden rounded-xl border border-white/25 bg-gradient-to-br from-white/35 via-white/20 to-teal-100/25 p-3 pl-4 shadow-md shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:from-white/[0.07] dark:via-white/[0.03] dark:to-teal-950/20">
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-teal-500 to-cyan-600" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/25">
                <Microscope size={18} />
              </span>
              <div>
                <div className="mb-0.5 flex gap-1.5">
                  <span className="rounded-full border border-teal-200/70 bg-teal-50/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700 backdrop-blur-sm dark:border-teal-800/40 dark:bg-teal-900/20 dark:text-teal-300">Microbiologia</span>
                  <span className="rounded-full border border-cyan-200/70 bg-cyan-50/70 px-2 py-0.5 text-[10px] font-medium text-cyan-700 backdrop-blur-sm dark:border-cyan-800/40 dark:bg-cyan-900/20 dark:text-cyan-300">Fila de culturas</span>
                </div>
                <h1 className="text-lg font-semibold leading-tight text-foreground">Culturas pendentes e em execução</h1>
                <p className="text-xs text-muted-foreground">Agrupadas por requisição. Clique numa requisição para abrir os exames do paciente.</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[360px] sm:flex-row sm:items-center">
              <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/40 bg-white/35 px-2.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <Search size={14} className="shrink-0 text-muted-foreground" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar por paciente ou requisição" className="h-full min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
              </div>
              <button
                onClick={() => load(true)}
                disabled={loading || refreshing}
                aria-busy={loading || refreshing}
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/55 disabled:cursor-not-allowed disabled:opacity-65 dark:border-white/10 dark:bg-white/5"
              >
                <RefreshCw size={14} className={loading || refreshing ? "animate-spin" : ""} />
                {loading || refreshing ? "Atualizando" : "Atualizar"}
              </button>
            </div>
          </div>
        </section>

        {error && <div className="rounded-xl border border-red-200/60 bg-red-50/50 px-3 py-2 text-sm text-red-800 backdrop-blur-sm dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{error}</div>}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando culturas...</div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/30 bg-white/20 p-8 text-center text-sm text-muted-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/5">Nenhuma cultura pendente para os filtros atuais.</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5 text-[10px] text-muted-foreground">
              {(["pending", "incubating", "overdue", "reincubated", "finalized"] as GroupState[]).map((state) => (
                <span key={state} className="inline-flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${STATE_STYLES[state].dot}`} />
                  {STATE_STYLES[state].label}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
              {groups.map((group) => {
                const state = groupState(group.items, now);
                const style = STATE_STYLES[state];
                const entryDate = groupEntryDate(group.items);
                return (
                  <button
                    key={group.orderId}
                    type="button"
                    onClick={() => openRequisition(group.orderId)}
                    title={`${group.patient || "Paciente"} — ${group.orderId}`}
                    className={`relative flex flex-col gap-2 overflow-hidden rounded-xl border p-3.5 pl-4 text-left shadow-sm backdrop-blur-sm transition hover:brightness-[1.03] ${style.card}`}
                  >
                    <span className={`absolute inset-y-0 left-0 w-1.5 ${style.strip}`} />
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`inline-flex min-w-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${style.badgeText}`}>
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                        <span className="truncate">{style.label}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${style.count}`}>{group.items.length}</span>
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate text-base font-semibold leading-tight ${style.title}`}>{abbreviateMiddleNames(group.patient) || "Sem paciente"}</p>
                      <p className={`truncate font-mono text-xs leading-tight ${style.subtitle}`}>#{shortOrder(group.orderId)}</p>
                    </div>
                    <p className={`inline-flex items-center gap-1 text-[11px] ${style.subtitle}`}>
                      <CalendarDays size={11} className="shrink-0" />
                      Entrada {entryDate ? fmtQueueDate(entryDate) : "—"}
                    </p>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
