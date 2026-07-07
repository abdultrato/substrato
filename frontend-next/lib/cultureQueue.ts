// Tipos e helpers partilhados da fila de culturas (lista agrupada por
// requisição e página dedicada de uma requisição).

export type QueueItem = {
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

export type GroupState = "pending" | "overdue" | "reincubated" | "incubating" | "finalized";

export const FINAL_STATUSES = new Set(["CONCLUIDA", "POSITIVA", "NEGATIVA"]);

// Estado de uma cultura para efeito de cor.
export function itemState(item: QueueItem, now: number): GroupState {
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
export function groupState(items: QueueItem[], now: number): GroupState {
  const states = items.map((item) => itemState(item, now));
  if (states.length > 0 && states.every((state) => state === "finalized")) return "finalized";
  const active = states.filter((state) => state !== "finalized");
  if (active.includes("pending")) return "pending";
  if (active.includes("overdue")) return "overdue";
  if (active.includes("reincubated")) return "reincubated";
  return "incubating";
}

export const STATE_STYLES: Record<GroupState, {
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
export function shortOrder(orderId: string) {
  const tail = orderId.split("/").pop() || orderId;
  return tail.replace(/^0+/, "") || tail;
}

// Data de entrada da requisição: receção mais antiga entre as amostras.
export function groupEntryDate(items: QueueItem[]): string | null {
  let earliest: number | null = null;
  for (const item of items) {
    if (!item.sample_received_at) continue;
    const time = new Date(item.sample_received_at).getTime();
    if (!Number.isNaN(time) && (earliest === null || time < earliest)) earliest = time;
  }
  return earliest === null ? null : new Date(earliest).toISOString();
}

export function fmtQueueDate(value: string | null) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-MZ", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
