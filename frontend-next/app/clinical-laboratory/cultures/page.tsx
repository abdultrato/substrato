"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardList, Clock3, FlaskConical, Loader2, Microscope, RefreshCw, Search, User, X } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

type QueueItem = {
  id: string;
  kind: "pending" | "culture";
  culture_id: number | null;
  culture_custom_id: string;
  order_item: number;
  order_item_custom_id: string;
  order_custom_id: string;
  patient_name: string;
  test_name: string;
  test_code: string;
  test_method: string;
  sample: number | null;
  sample_barcode: string;
  sample_type: string;
  sample_received_at: string | null;
  status: string;
  status_display: string;
  incubation_started_at: string | null;
  incubation_expected_end_at: string | null;
};

type CultureGroup = {
  orderId: string;
  patient: string;
  items: QueueItem[];
};

type GroupState = "pending" | "overdue" | "reincubated" | "incubating" | "finalized";

const FINAL_STATUSES = new Set(["CONCLUIDA", "POSITIVA", "NEGATIVA"]);

// Estado de uma cultura para efeito de cor do cartão da requisição.
function itemState(item: QueueItem, now: number): GroupState {
  if (!item.culture_id || item.status === "MONTADA") return "pending";
  if (item.status === "REINCUBACAO") return "reincubated";
  if (FINAL_STATUSES.has(item.status)) return "finalized";
  if (item.status === "AGUARDA_AVALIACAO") return "overdue";
  if (item.status === "INCUBACAO") {
    if (item.incubation_expected_end_at && now > new Date(item.incubation_expected_end_at).getTime()) return "overdue";
    return "incubating";
  }
  return "incubating";
}

// Cor agregada da requisição: prioriza o que exige atenção.
function groupState(items: QueueItem[], now: number): GroupState {
  const states = items.map((item) => itemState(item, now));
  if (states.length > 0 && states.every((state) => state === "finalized")) return "finalized";
  const active = states.filter((state) => state !== "finalized");
  if (active.includes("pending")) return "pending";
  if (active.includes("overdue")) return "overdue";
  if (active.includes("reincubated")) return "reincubated";
  return "incubating";
}

const STATE_STYLES: Record<GroupState, {
  label: string;
  card: string;
  strip: string;
  dot: string;
  badgeText: string;
  title: string;
  subtitle: string;
  count: string;
}> = {
  pending: {
    label: "Pendente",
    card: "border-red-300/70 bg-gradient-to-br from-red-50/85 to-rose-100/55 dark:border-red-800/50 dark:from-red-950/45 dark:to-rose-950/30",
    strip: "bg-red-500",
    dot: "bg-red-500",
    badgeText: "text-red-700 dark:text-red-300",
    title: "text-foreground",
    subtitle: "text-muted-foreground",
    count: "bg-red-500/15 text-red-700 dark:text-red-300",
  },
  overdue: {
    label: "Atrasada",
    card: "border-orange-300/70 bg-gradient-to-br from-orange-50/85 to-amber-100/55 dark:border-orange-800/50 dark:from-orange-950/45 dark:to-amber-950/30",
    strip: "bg-orange-500",
    dot: "bg-orange-500",
    badgeText: "text-orange-700 dark:text-orange-300",
    title: "text-foreground",
    subtitle: "text-muted-foreground",
    count: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  reincubated: {
    label: "Reincubada",
    card: "border-yellow-300/70 bg-gradient-to-br from-yellow-50/85 to-amber-100/55 dark:border-yellow-800/50 dark:from-yellow-950/45 dark:to-amber-950/30",
    strip: "bg-yellow-400",
    dot: "bg-yellow-400",
    badgeText: "text-amber-700 dark:text-amber-300",
    title: "text-foreground",
    subtitle: "text-muted-foreground",
    count: "bg-yellow-400/20 text-amber-700 dark:text-amber-300",
  },
  incubating: {
    label: "Incubando",
    card: "border-emerald-300/70 bg-gradient-to-br from-emerald-50/85 to-teal-100/55 dark:border-emerald-800/50 dark:from-emerald-950/45 dark:to-teal-950/30",
    strip: "bg-emerald-500",
    dot: "bg-emerald-500",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    title: "text-foreground",
    subtitle: "text-muted-foreground",
    count: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  finalized: {
    label: "Finalizada",
    card: "border-slate-700 bg-slate-900 dark:border-slate-600 dark:bg-slate-950",
    strip: "bg-slate-500",
    dot: "bg-slate-300",
    badgeText: "text-slate-200",
    title: "text-white",
    subtitle: "text-slate-400",
    count: "bg-white/15 text-slate-100",
  },
};

// Rótulo curto da requisição (segmento final do código).
function shortOrder(orderId: string) {
  const tail = orderId.split("/").pop() || orderId;
  return tail.replace(/^0+/, "") || tail;
}

function fmtDate(value: string | null) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-MZ", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function LabCulturesPage() {
  const router = useRouter();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

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

  const selectedGroup = useMemo(
    () => (selected ? groups.find((group) => group.orderId === selected) ?? null : null),
    [groups, selected],
  );

  const now = Date.now();

  async function startCulture(item: QueueItem) {
    if (item.culture_id) {
      router.push(`/clinical-laboratory/cultures/${item.culture_id}`);
      return;
    }
    setStartingId(item.id);
    try {
      const culture = await apiFetch<{ id: number }>("/clinical_laboratory/culture/", {
        method: "POST",
        body: JSON.stringify({
          order_item: item.order_item,
          sample: item.sample,
          culture_type: "AEROBIA",
          specimen: item.sample_type || "",
          status: "MONTADA",
        }),
      });
      router.push(`/clinical-laboratory/cultures/${culture.id}`);
    } catch (err: any) {
      setError(err?.message || "Não foi possível iniciar a cultura.");
    } finally {
      setStartingId(null);
    }
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
                <p className="text-xs text-muted-foreground">Agrupadas por requisição. Clique numa requisição para ver as culturas do paciente.</p>
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

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
              {groups.map((group) => {
                const state = groupState(group.items, now);
                const style = STATE_STYLES[state];
                const isOpen = selected === group.orderId;
                return (
                  <button
                    key={group.orderId}
                    type="button"
                    onClick={() => setSelected((current) => (current === group.orderId ? null : group.orderId))}
                    aria-expanded={isOpen}
                    title={`${group.patient || "Paciente"} — ${group.orderId}`}
                    className={`relative flex flex-col gap-1 overflow-hidden rounded-lg border p-2 pl-2.5 text-left shadow-sm backdrop-blur-sm transition hover:brightness-[1.03] ${style.card} ${isOpen ? "ring-2 ring-sky-400/70 ring-offset-1 ring-offset-transparent" : ""}`}
                  >
                    <span className={`absolute inset-y-0 left-0 w-1 ${style.strip}`} />
                    <div className="flex items-center justify-between gap-1">
                      <span className={`inline-flex min-w-0 items-center gap-1 text-[9px] font-bold uppercase tracking-wide ${style.badgeText}`}>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                        <span className="truncate">{style.label}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-1.5 text-[9px] font-bold ${style.count}`}>{group.items.length}</span>
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate text-[11px] font-semibold leading-tight ${style.title}`}>{group.patient || "Sem paciente"}</p>
                      <p className={`truncate font-mono text-[9px] leading-tight ${style.subtitle}`}>#{shortOrder(group.orderId)}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedGroup && (
              <div className="rounded-xl border border-white/25 bg-white/30 p-2 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
                <div className="mb-1.5 flex items-center gap-2 px-1">
                  <User size={13} className="shrink-0 text-teal-600 dark:text-teal-400" />
                  <span className="truncate text-sm font-semibold text-foreground">{selectedGroup.patient || "Paciente não informado"}</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground"><ClipboardList size={11} /> {selectedGroup.orderId}</span>
                  <button type="button" onClick={() => setSelected(null)} className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/40 hover:text-foreground dark:hover:bg-white/10" aria-label="Fechar"><X size={14} /></button>
                </div>
                <div className="space-y-1.5">
                  {selectedGroup.items.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/25 bg-white/30 px-2.5 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <FlaskConical size={13} className="shrink-0 text-teal-600 dark:text-teal-400" />
                          <span className="truncate text-xs font-semibold text-foreground">{item.test_name}</span>
                          <span className="shrink-0 rounded-full border border-white/40 bg-white/45 px-1.5 py-0.5 text-[9px] font-semibold text-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/10">{item.status_display}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                          <span>{item.test_code || "Sem código"}</span>
                          <span>· {item.sample_barcode || "Sem amostra"}</span>
                          <span className="inline-flex items-center gap-1">· <Clock3 size={10} /> {item.incubation_expected_end_at ? `Leitura ${fmtDate(item.incubation_expected_end_at)}` : "Aguardando sementeira"}</span>
                        </div>
                      </div>
                      {item.culture_id ? (
                        <Link href={`/clinical-laboratory/cultures/${item.culture_id}`} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/20">
                          Abrir <ArrowRight size={13} />
                        </Link>
                      ) : (
                        <button onClick={() => startCulture(item)} disabled={startingId === item.id} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-3 text-xs font-semibold text-white shadow-md shadow-teal-500/20 disabled:opacity-60">
                          {startingId === item.id ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />} Iniciar cultura
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
