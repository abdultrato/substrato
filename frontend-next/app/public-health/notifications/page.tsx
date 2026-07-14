"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  Zap,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useDebounce from "@/hooks/useDebounce";
import { apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const LIST_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ENFERMAGEM,
  GROUPS.SAUDE_PUBLICA,
];

const PAGE_SIZE = 24;

interface NotificationRecord {
  id: number;
  custom_id: string;
  official_system: string;
  event_type: string;
  status: string;
  campaign_name: string | null;
  immunization_record_label: string | null;
  adverse_event_label: string | null;
  external_reference: string;
  attempt_count: number;
  last_attempt_at: string | null;
  sent_at: string | null;
  error_message: string;
  created_at: string;
}

const STATUS_META: Record<string, { label: string; bar: string; chip: string }> = {
  PENDING:  { label: "Pendente",  bar: "bg-slate-400",   chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/40 dark:bg-slate-800/20 dark:text-slate-400"          },
  SENDING:  { label: "Enviando",  bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300"                },
  SENT:     { label: "Enviado",   bar: "bg-teal-500",    chip: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300"                },
  ACCEPTED: { label: "Aceito",    bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"},
  REJECTED: { label: "Rejeitado", bar: "bg-red-500",     chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300"                      },
  FAILED:   { label: "Falhou",    bar: "bg-rose-500",    chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300"                },
};

const EVENT_TYPE_META: Record<string, { label: string; icon: string }> = {
  IMMUNIZATION:      { label: "Imunização",           icon: "💉" },
  AEFI:              { label: "Evento adverso",        icon: "⚠️" },
  CAMPAIGN_COVERAGE: { label: "Cobertura de campanha", icon: "📣" },
};

const SYSTEM_LABELS: Record<string, string> = {
  E_SUS:  "e-SUS",
  SIPNI:  "SIPNI",
  DHIS2:  "DHIS2",
  CUSTOM: "Outro",
};

const STATUS_FILTERS = [
  { value: "",         label: "Todos os estados" },
  { value: "PENDING",  label: "Pendente"         },
  { value: "SENDING",  label: "Enviando"         },
  { value: "SENT",     label: "Enviado"          },
  { value: "ACCEPTED", label: "Aceito"           },
  { value: "REJECTED", label: "Rejeitado"        },
  { value: "FAILED",   label: "Falhou"           },
];

const EVENT_FILTERS = [
  { value: "",                    label: "Todos os tipos"        },
  { value: "IMMUNIZATION",        label: "Imunização"           },
  { value: "AEFI",                label: "Evento adverso"       },
  { value: "CAMPAIGN_COVERAGE",   label: "Cobertura de campanha"},
];

function fmtDatetime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function NotificationsListPage() {
  useAuthGuard();

  const [items, setItems]                 = useState<NotificationRecord[]>([]);
  const [total, setTotal]                 = useState(0);
  const [page, setPage]                   = useState(1);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [filterStatus, setFilterStatus]   = useState("");
  const [filterEvent, setFilterEvent]     = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async (p: number, q: string, st: string, ev: string) => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (q.trim()) query.search     = q.trim();
      if (st)       query.status     = st;
      if (ev)       query.event_type = ev;
      const { items: rows, meta } = await apiFetchList<NotificationRecord>(
        "/public_health/notification/",
        { page: p, pageSize: PAGE_SIZE, query }
      );
      setItems(rows);
      setTotal(meta.total ?? 0);
    } catch {
      setItems([]); setTotal(0);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page, debouncedSearch, filterStatus, filterEvent); }, [page, debouncedSearch, load, filterStatus, filterEvent]);

  function handleSearch(v: string) {
    setSearch(v); setPage(1);
  }
  function handleStatus(v: string) { setFilterStatus(v); setPage(1); }
  function handleEvent(v: string)  { setFilterEvent(v);  setPage(1); }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-violet-500 to-purple-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/30">
              <Bell size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Saúde Pública</div>
              <h1 className="text-base font-bold text-foreground">Notificações Oficiais</h1>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{total} registos encontrados</div>
            </div>
            <Link href="/public-health/notifications/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-purple-700">
              <Plus size={13} /> Nova notificação
            </Link>
          </div>

          {/* Filters inside hero */}
          <div className="border-t border-white/20 px-4 py-2 dark:border-white/10">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-40 flex-1">
                <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Pesquisar por referência, sistema ou tipo…"
                  className="w-full rounded-lg border border-white/30 bg-white/40 py-1.5 pl-7 pr-3 text-xs outline-none transition placeholder:text-muted-foreground focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 dark:border-white/10 dark:bg-white/5" />
              </div>
              <div className="relative">
                <Activity size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select value={filterStatus} onChange={(e) => handleStatus(e.target.value)}
                  className="appearance-none rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs text-foreground outline-none transition focus:border-violet-400">
                  {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div className="relative">
                <Zap size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select value={filterEvent} onChange={(e) => handleEvent(e.target.value)}
                  className="appearance-none rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs text-foreground outline-none transition focus:border-violet-400">
                  {EVENT_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Grid ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            Nenhuma notificação encontrada.
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const sm = STATUS_META[item.status] ?? { label: item.status, bar: "bg-slate-400", chip: "border-slate-200 bg-slate-50 text-slate-600" };
              const ev = EVENT_TYPE_META[item.event_type] ?? { label: item.event_type, icon: "📋" };
              const linked = item.campaign_name || item.immunization_record_label || item.adverse_event_label;

              return (
                <Link key={item.id} href={`/public-health/notifications/${item.id}`}
                  className="relative z-0 block overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:bg-white/35 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                  <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${sm.bar}`} />

                  <div className="space-y-1.5 px-3 py-2.5 pl-4">
                    {/* header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold leading-tight text-foreground">
                          {ev.icon} {ev.label}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">{item.custom_id}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${sm.chip}`}>{sm.label}</span>
                    </div>

                    {/* sistema */}
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                        {SYSTEM_LABELS[item.official_system] ?? item.official_system}
                      </span>
                      {item.external_reference && (
                        <span className="truncate font-mono text-muted-foreground">{item.external_reference}</span>
                      )}
                    </div>

                    {/* linked entity */}
                    {linked && (
                      <p className="truncate text-[10px] text-muted-foreground">
                        {item.campaign_name && `📣 ${item.campaign_name}`}
                        {item.immunization_record_label && `💉 ${item.immunization_record_label}`}
                        {item.adverse_event_label && `⚠️ ${item.adverse_event_label}`}
                      </p>
                    )}

                    {/* error */}
                    {item.error_message && (
                      <p className="truncate text-[10px] text-rose-600 dark:text-rose-400">{item.error_message}</p>
                    )}

                    {/* footer */}
                    <div className="flex justify-between border-t border-border/30 pt-1 text-[10px] text-muted-foreground">
                      <span>{item.attempt_count} tentativa{item.attempt_count !== 1 ? "s" : ""}</span>
                      <span>{item.sent_at ? `Enviado: ${fmtDatetime(item.sent_at)}` : fmtDatetime(item.created_at)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">Página {page} de {totalPages} · {total} notificações</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-muted disabled:opacity-40">
                <ChevronLeft size={13} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-muted disabled:opacity-40">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
