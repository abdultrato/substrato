"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  MapPin,
  Plus,
  Search,
  UserCog,
  Wrench,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useDebounce from "@/hooks/useDebounce";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetchList } from "@/lib/api";
import { isNotFoundLikeError } from "@/lib/errors/api-error";
import { formatCount } from "@/lib/i18n/plural";
import {
  equipmentStatusMeta,
  pickEquipmentIcon,
  type EquipmentRow,
} from "@/components/equipment/equipmentMeta";

type StatusFilter = "" | "FUNCIONANDO" | "AVARIADO" | "DESLIGADO" | "MANUT" | "INATIVO";

const FILTER_CHIPS: Array<{ value: StatusFilter; label: string; chip: string }> = [
  {
    value: "FUNCIONANDO",
    label: "A funcionar",
    chip: "border-emerald-200/50 bg-emerald-100/30 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300",
  },
  {
    value: "AVARIADO",
    label: "Avariados",
    chip: "border-rose-200/50 bg-rose-100/30 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300",
  },
  {
    value: "DESLIGADO",
    label: "Desligados",
    chip: "border-slate-200/50 bg-slate-100/30 text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/30 dark:text-slate-300",
  },
  {
    value: "MANUT",
    label: "Requer manutenção",
    chip: "border-amber-200/50 bg-amber-100/30 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300",
  },
  {
    value: "INATIVO",
    label: "Inativos",
    chip: "border-zinc-200/50 bg-zinc-100/30 text-zinc-600 dark:border-zinc-600/30 dark:bg-zinc-800/30 dark:text-zinc-300",
  },
];

function matchesFilter(row: EquipmentRow, filter: StatusFilter): boolean {
  if (!filter) return true;
  if (filter === "MANUT") return Boolean(row.requires_maintenance);
  if (filter === "INATIVO") return row.active === false;
  return String(row.current_status ?? "").toUpperCase() === filter;
}

const statPill =
  "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold backdrop-blur-xl";

export default function EquipmentEquipmentsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [rows, setRows] = useState<EquipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("");
  const debouncedSearch = useDebounce(search.trim().toLowerCase(), 200);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setErro(null);
        const { items } = await apiFetchList<EquipmentRow>("/equipment/equipment/", {
          page: 1,
          pageSize: 500,
          clientCache: safeRefreshToken === 0,
        });
        if (!mounted) return;
        setRows(items);
      } catch (e: any) {
        if (!mounted) return;
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar equipamentos."));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [safeRefreshToken]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (!matchesFilter(row, filter)) return false;
      if (!debouncedSearch) return true;
      const blob = [
        row.name,
        row.custom_id,
        row.serial_number,
        row.manufacturer,
        row.model,
        row.location,
        row.responsible,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(debouncedSearch);
    });
  }, [rows, filter, debouncedSearch]);

  const stats = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const code = String(row.current_status ?? "").toUpperCase();
        if (code === "FUNCIONANDO") acc.working += 1;
        else if (code === "AVARIADO") acc.broken += 1;
        else if (code === "DESLIGADO") acc.offline += 1;
        if (row.requires_maintenance) acc.maintenance += 1;
        if (row.active === false) acc.inactive += 1;
        return acc;
      },
      { working: 0, broken: 0, offline: 0, maintenance: 0, inactive: 0 },
    );
  }, [rows]);

  return (
    <AppLayout>
      <div className="space-y-1.5">
        {/* Cabeçalho fundido: banner + pílulas + pesquisa + filtros num só bloco translúcido */}
        <section className="relative overflow-hidden rounded-2xl border border-teal-200/25 bg-gradient-to-br from-teal-100/[0.05] via-white/[0.015] to-cyan-100/[0.03] shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-teal-800/20 dark:from-teal-950/[0.05] dark:via-white/[0.01] dark:to-cyan-950/[0.03]">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-teal-400/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-2.5 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25">
                <Wrench size={15} />
              </span>
              <div className="min-w-0">
                <h1 className="text-base font-bold leading-tight text-foreground">Equipamentos</h1>
                <p className="text-[10px] text-muted-foreground">
                  {loading
                    ? "A carregar…"
                    : formatCount(rows.length, {
                        one: "equipamento registado",
                        other: "equipamentos registados",
                      })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`${statPill} border-emerald-200/50 bg-emerald-100/30 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300`}
              >
                A funcionar <strong className="text-[11px]">{stats.working}</strong>
              </span>
              <span
                className={`${statPill} border-rose-200/50 bg-rose-100/30 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300`}
              >
                Avariados <strong className="text-[11px]">{stats.broken}</strong>
              </span>
              <span
                className={`${statPill} border-slate-200/50 bg-slate-100/30 text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/30 dark:text-slate-300`}
              >
                Desligados <strong className="text-[11px]">{stats.offline}</strong>
              </span>
              <span
                className={`${statPill} border-amber-200/50 bg-amber-100/30 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300`}
              >
                Req. manutenção <strong className="text-[11px]">{stats.maintenance}</strong>
              </span>
              <span
                className={`${statPill} border-zinc-200/50 bg-zinc-100/30 text-zinc-600 dark:border-zinc-600/30 dark:bg-zinc-800/30 dark:text-zinc-300`}
              >
                Inativos <strong className="text-[11px]">{stats.inactive}</strong>
              </span>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <Link
                href="/equipment/equipments/new"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-2.5 text-xs font-semibold text-white shadow-sm transition hover:from-teal-700 hover:to-cyan-700"
              >
                <Plus size={12} /> Novo equipamento
              </Link>
            </div>
          </div>

          <div className="relative flex flex-wrap items-center gap-1.5 border-t border-white/15 px-3 py-1.5 dark:border-white/[0.06]">
            <div className="relative w-full sm:w-64">
              <Search
                size={12}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome, série, fabricante, local, responsável…"
                className="w-full rounded-lg border border-white/25 bg-white/[0.05] py-1.5 pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground backdrop-blur-xl transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/40 sm:focus:w-80 dark:border-white/10 dark:bg-white/[0.03]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setFilter("")}
                className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-semibold transition ${
                  filter === ""
                    ? "border-teal-400/60 bg-teal-500/15 text-teal-700 dark:text-teal-300"
                    : "border-white/25 bg-white/[0.05] text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/[0.03]"
                }`}
              >
                Todos
              </button>
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setFilter(filter === chip.value ? "" : chip.value)}
                  className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-semibold transition ${
                    filter === chip.value
                      ? chip.chip
                      : "border-white/25 bg-white/[0.05] text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/[0.03]"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {debouncedSearch || filter ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground-2">
                {filtered.length}/{rows.length}
              </span>
            ) : null}
          </div>
        </section>

        {erro ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            {erro}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-xs text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            A carregar equipamentos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
            {rows.length === 0
              ? "Ainda não há equipamentos registados."
              : "Nenhum equipamento corresponde à pesquisa/filtro."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((row) => {
              const meta = equipmentStatusMeta(row);
              const Icon = pickEquipmentIcon(row);
              return (
                <Link
                  key={row.id}
                  href={`/equipment/equipments/${row.id}`}
                  className={`group flex min-w-0 flex-col gap-1.5 rounded-xl border border-l-4 border-white/20 bg-white/25 p-2 shadow-sm backdrop-blur-sm transition hover:border-[var(--primary-300)] hover:bg-white/40 dark:border-white/10 dark:bg-white/5 dark:hover:border-[var(--primary-600)] dark:hover:bg-white/[0.08] ${meta.bar}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400">
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground group-hover:text-[var(--primary-700)] dark:group-hover:text-[var(--primary-400)]">
                        {row.name || `Equipamento #${row.id}`}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {[row.custom_id, row.serial_number].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${meta.chip}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                    {row.requires_maintenance ? (
                      <span className="inline-flex items-center rounded-full border border-amber-200/50 bg-amber-100/30 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300">
                        Manutenção
                      </span>
                    ) : null}
                    {row.active === false ? (
                      <span className="inline-flex items-center rounded-full border border-zinc-200/50 bg-zinc-100/30 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-600 dark:border-zinc-600/30 dark:bg-zinc-800/30 dark:text-zinc-300">
                        Inativo
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0 space-y-0.5 text-[10px] text-muted-foreground">
                    {row.manufacturer || row.model ? (
                      <p className="truncate">
                        {[row.manufacturer, row.model].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    {row.location ? (
                      <p className="flex min-w-0 items-center gap-1">
                        <MapPin size={9} className="shrink-0" />
                        <span className="truncate">{row.location}</span>
                      </p>
                    ) : null}
                    {row.responsible ? (
                      <p className="flex min-w-0 items-center gap-1">
                        <UserCog size={9} className="shrink-0" />
                        <span className="truncate">{row.responsible}</span>
                      </p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
