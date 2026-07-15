"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, FlaskConical, Loader2, Pill, RefreshCw, Search } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { abbreviateMiddleNames } from "@/lib/formatName";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

type Susceptibility = {
  id: number;
  antibiotic: string;
  result: string;
};

type Isolate = {
  id: number;
  organism_name: string;
  susceptibilities: Susceptibility[];
};

type CultureQueueItem = {
  culture_id: number;
  culture_custom_id: string;
  culture_type_display: string;
  status: string;
  status_display: string;
  specimen: string;
  read_at: string | null;
  order_custom_id: string;
  patient_name: string;
  isolates: Isolate[];
  isolate_count: number;
  antibiogram_count: number;
};

function shortOrder(order: string): string {
  return order.replace(/^LORD-?/i, "").replace(/^0+/, "") || order;
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function LabAntibiogramsPage() {
  const router = useRouter();
  const [items, setItems] = useState<CultureQueueItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (manual = false) => {
    const startedAt = Date.now();
    if (manual) setRefreshing(true);
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<CultureQueueItem[]>("/clinical_laboratory/antibiogram/queue/", {
        clientCache: false,
      });
      setItems(data);
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar as culturas positivas.");
    } finally {
      if (manual) {
        const remaining = Math.max(0, 700 - (Date.now() - startedAt));
        if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
        setRefreshing(false);
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => [
      item.patient_name,
      item.order_custom_id,
      item.culture_custom_id,
      item.culture_type_display,
      item.specimen,
      ...item.isolates.map((i) => i.organism_name),
    ].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [items, query]);

  const totals = useMemo(() => {
    const pendingSubculture = filtered.filter((c) => c.isolate_count === 0).length;
    const withAntibiogram = filtered.filter((c) => c.antibiogram_count > 0).length;
    return { pendingSubculture, withAntibiogram };
  }, [filtered]);

  function openWorkspace(cultureId: number) {
    router.push(`/clinical-laboratory/antibiograms/culture/${cultureId}`);
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="mx-auto w-full max-w-7xl space-y-3">
        <section className="relative overflow-hidden rounded-xl border border-white/25 bg-gradient-to-br from-white/35 via-white/20 to-violet-100/25 p-3 pl-4 shadow-md shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:from-white/[0.07] dark:via-white/[0.03] dark:to-violet-950/20">
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-violet-500 to-fuchsia-600" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25">
                <Pill size={18} />
              </span>
              <div>
                <div className="mb-0.5 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-violet-200/70 bg-violet-50/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 backdrop-blur-sm dark:border-violet-800/40 dark:bg-violet-900/20 dark:text-violet-300">Microbiologia</span>
                  <span className="rounded-full border border-fuchsia-200/70 bg-fuchsia-50/70 px-2 py-0.5 text-[10px] font-medium text-fuchsia-700 backdrop-blur-sm dark:border-fuchsia-800/40 dark:bg-fuchsia-900/20 dark:text-fuchsia-300">Subcultura e antibiograma</span>
                  {!loading && (
                    <>
                      <span className="rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[10px] font-medium text-amber-700 backdrop-blur-sm dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">{totals.pendingSubculture} a subcultivar</span>
                      <span className="rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[10px] font-medium text-emerald-700 backdrop-blur-sm dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300">{totals.withAntibiogram} com antibiograma</span>
                    </>
                  )}
                </div>
                <h1 className="text-lg font-semibold leading-tight text-foreground">Culturas positivas</h1>
                <p className="text-xs text-muted-foreground">Culturas com crescimento confirmado. Abra cada uma para registar a subcultura (isolados) e os antibiogramas.</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[360px] sm:flex-row sm:items-center">
              <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/40 bg-white/35 px-2.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <Search size={14} className="shrink-0 text-muted-foreground" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar por paciente, requisição ou microrganismo" className="h-full min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
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
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando culturas positivas...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/30 bg-white/20 p-8 text-center text-sm text-muted-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/5">Nenhuma cultura positiva pendente. Culturas marcadas como positivas na leitura aparecem aqui automaticamente.</div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c) => {
              const needsSubculture = c.isolate_count === 0;
              return (
                <button
                  key={c.culture_id}
                  type="button"
                  onClick={() => openWorkspace(c.culture_id)}
                  title={`${c.patient_name || "Paciente"} — ${c.order_custom_id}`}
                  className="group relative flex flex-col gap-1.5 overflow-hidden rounded-xl border border-white/40 bg-white/30 p-3 pl-4 text-left shadow-sm backdrop-blur-sm transition hover:border-white/60 hover:bg-white/45 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                >
                  <span className={`absolute inset-y-0 left-0 w-1.5 ${needsSubculture ? "bg-amber-400" : "bg-emerald-400"}`} />

                  <div className="flex items-center justify-between gap-1.5">
                    <span className="truncate font-mono text-[10px] font-bold text-violet-700 dark:text-violet-300">
                      #{shortOrder(c.order_custom_id)}
                    </span>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${needsSubculture ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"}`}>
                      {needsSubculture ? "Subcultura pendente" : "Em antibiograma"}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-tight text-foreground">{abbreviateMiddleNames(c.patient_name) || "Sem paciente"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {c.culture_type_display}{c.specimen ? ` · ${c.specimen}` : ""}
                    </p>
                  </div>

                  {c.isolates.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.isolates.slice(0, 3).map((iso) => (
                        <span key={iso.id} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-medium text-violet-700 dark:bg-violet-900/25 dark:text-violet-200">
                          <FlaskConical size={9} className="shrink-0" />
                          <span className="max-w-[110px] truncate italic">{iso.organism_name}</span>
                        </span>
                      ))}
                      {c.isolates.length > 3 && (
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">+{c.isolates.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/40 pt-1.5 text-[10px] text-muted-foreground dark:border-white/10">
                    <span className="inline-flex items-center gap-1"><CalendarDays size={10} className="shrink-0" /> {fmtDate(c.read_at)}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span>{c.isolate_count} {c.isolate_count === 1 ? "isolado" : "isolados"}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>{c.antibiogram_count} antib.</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
