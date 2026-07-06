"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Droplet,
  FlaskConical,
  HeartHandshake,
  Loader2,
  Plus,
  Search,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import Pagination from "@/components/ui/Pagination";
import useAuthGuard from "@/hooks/useAuthGuard";
import useDebounce from "@/hooks/useDebounce";
import { apiFetchAll } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const GLASS_CARD =
  "relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const DEFAULT_PAGE_SIZE = 10;

type DonationRow = {
  id: number;
  custom_id?: string | null;
  donor_role?: "VOL" | "REP" | string | null;
  bag_identifier?: string | null;
  blood_type?: "O-" | "O+" | "A-" | "A+" | "B-" | "B+" | "AB-" | "AB+" | "UNK" | string | null;
  donation_type?: "WBL" | "APH" | string | null;
  status?: "REG" | "SCR" | "COM" | "CAN" | string | null;
  screening_status?: "PEN" | "APR" | "REJ" | string | null;
  collected_at?: string | null;
  processed_at?: string | null;
  volume_ml?: number | null;
  donor_weight_kg?: string | null;
  hemoglobin_g_dl?: string | null;
  donor?: number | null;
};

const DONATION_TYPE_OPTIONS = [
  { value: "", label: "Todos os tipos" },
  { value: "WBL", label: "Sangue total" },
  { value: "APH", label: "Aférese" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Todos os estados" },
  { value: "REG", label: "Registada" },
  { value: "SCR", label: "Em triagem" },
  { value: "COM", label: "Concluída" },
  { value: "CAN", label: "Cancelada" },
];

function formatDonationType(value?: string | null) {
  if (value === "WBL") return "Sangue total";
  if (value === "APH") return "Aférese";
  return "Tipo não definido";
}

function formatDonorRole(value?: string | null) {
  if (value === "VOL") return "Voluntário";
  if (value === "REP") return "Reposição";
  return "Perfil não definido";
}

function formatStatus(value?: string | null) {
  if (value === "REG") return "Registada";
  if (value === "SCR") return "Em triagem";
  if (value === "COM") return "Concluída";
  if (value === "CAN") return "Cancelada";
  return "Sem estado";
}

function formatScreeningStatus(value?: string | null) {
  if (value === "PEN") return "Pendente";
  if (value === "APR") return "Aprovada";
  if (value === "REJ") return "Rejeitada";
  return "Sem triagem";
}

function formatBloodType(value?: string | null) {
  const normalized = String(value || "").trim();
  return !normalized || normalized === "UNK" ? "Não definido" : normalized;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClasses(status?: string | null) {
  switch (status) {
    case "COM":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300";
    case "SCR":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300";
    case "CAN":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300";
    default:
      return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-700/40 dark:bg-cyan-900/20 dark:text-cyan-300";
  }
}

function screeningClasses(status?: string | null) {
  switch (status) {
    case "APR":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300";
    case "REJ":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-900/20 dark:text-slate-300";
  }
}

function screeningCardClasses(status?: string | null) {
  switch (status) {
    case "APR":
      return {
        shell:
          "border-emerald-200/80 bg-gradient-to-br from-emerald-50/95 via-white to-cyan-50/85 dark:border-emerald-700/40 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.30),rgba(15,23,42,0.92),rgba(8,145,178,0.18))]",
        bar: "from-emerald-500 via-teal-500 to-cyan-500",
      };
    case "REJ":
      return {
        shell:
          "border-rose-200/80 bg-gradient-to-br from-rose-50/95 via-white to-amber-50/85 dark:border-rose-700/40 dark:bg-[linear-gradient(135deg,rgba(127,29,29,0.28),rgba(15,23,42,0.92),rgba(120,53,15,0.18))]",
        bar: "from-rose-500 via-pink-500 to-amber-500",
      };
    default:
      return {
        shell:
          "border-amber-200/80 bg-gradient-to-br from-amber-50/95 via-white to-sky-50/85 dark:border-amber-700/40 dark:bg-[linear-gradient(135deg,rgba(120,53,15,0.24),rgba(15,23,42,0.92),rgba(14,116,144,0.18))]",
        bar: "from-amber-500 via-orange-500 to-sky-500",
      };
  }
}

export default function BloodbankBloodDonationsListPage() {
  const { loading } = useAuthGuard();

  const [allItems, setAllItems] = useState<DonationRow[]>([]);
  const [items, setItems] = useState<DonationRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageSizeInput, setPageSizeInput] = useState(String(DEFAULT_PAGE_SIZE));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, typeFilter, pageSize]);

  function applyPageSize(value: string) {
    const parsed = Math.max(1, Math.min(999, parseInt(value, 10) || DEFAULT_PAGE_SIZE));
    setPageSize(parsed);
    setPageSizeInput(String(parsed));
    setPage(1);
  }

  useEffect(() => {
    let mounted = true;

    async function loadDonations() {
      try {
        setListLoading(true);
        setError(null);
        const rows = await apiFetchAll<DonationRow>("/bloodbank/donation/", { pageSize: 200, maxPages: 20 });

        if (!mounted) return;

        setAllItems(rows);
      } catch (err: any) {
        if (!mounted) return;
        setAllItems([]);
        setError(err?.message || "Falha ao carregar as doações de sangue.");
      } finally {
        if (mounted) setListLoading(false);
      }
    }

    loadDonations();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedSearch = debouncedSearch
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    return allItems.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (typeFilter && item.donation_type !== typeFilter) return false;
      if (!normalizedSearch) return true;

      const haystack = [
        item.custom_id,
        item.bag_identifier,
        item.status,
        item.donation_type,
        item.blood_type,
      ]
        .filter(Boolean)
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [allItems, debouncedSearch, statusFilter, typeFilter]);

  useEffect(() => {
    const total = filteredItems.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, pages);
    const start = (currentPage - 1) * pageSize;

    setItems(filteredItems.slice(start, start + pageSize));
    setTotalItems(total);
    setTotalPages(pages);
    if (page !== currentPage) setPage(currentPage);
  }, [filteredItems, page, pageSize]);

  const summary = useMemo(() => {
    let triagem = 0;
    let concluidas = 0;
    let volume = 0;

    for (const item of filteredItems) {
      if (item.status === "SCR") triagem += 1;
      if (item.status === "COM") concluidas += 1;
      volume += Number(item.volume_ml || 0);
    }

    return { triagem, concluidas, volume };
  }, [filteredItems]);

  if (loading) return null;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="mx-auto min-h-[calc(100vh-5rem)] w-full max-w-[min(98vw,1600px)] space-y-2 px-2 pb-3">
        <section className={GLASS_CARD}>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-12 -top-10 h-36 w-36 rounded-full bg-rose-500/10 blur-3xl" />
            <div className="absolute left-16 top-8 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
            <div className="absolute -bottom-10 right-28 h-28 w-28 rounded-full bg-amber-500/10 blur-3xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-rose-500 via-red-500 to-cyan-600" />

          <div className="relative flex flex-wrap items-center gap-2 px-3 py-2.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-cyan-600 shadow-md shadow-rose-500/25">
              <Droplet size={22} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Hemoterapia / Captação e processamento</div>
              <h1 className="text-lg font-bold leading-tight text-foreground">Doações de sangue</h1>
            </div>
            <Link
              href="/bloodbank/blood-donations/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-cyan-600 px-3 text-sm font-semibold text-white shadow-md shadow-rose-500/25 transition hover:from-rose-700 hover:to-cyan-700"
            >
              <Plus size={15} />
              Nova doação
            </Link>
          </div>

          <div className="relative border-t border-white/15 px-3 py-2.5 dark:border-white/10">
            <div className="grid grid-cols-4 gap-1">
              <article className="relative min-w-0 overflow-hidden rounded-xl border border-white/20 bg-white/22 p-2 shadow-sm backdrop-blur-sm">
                <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-rose-500" />
                <div className="flex flex-nowrap items-center gap-1.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600">
                    <HeartHandshake size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate whitespace-nowrap text-[10px] text-muted-foreground">Registos nesta página</div>
                    <div className="truncate whitespace-nowrap text-sm font-bold text-foreground">{items.length}</div>
                  </div>
                </div>
              </article>
              <article className="relative min-w-0 overflow-hidden rounded-xl border border-white/20 bg-white/22 p-2 shadow-sm backdrop-blur-sm">
                <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-amber-500" />
                <div className="flex flex-nowrap items-center gap-1.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
                    <Activity size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate whitespace-nowrap text-[10px] text-muted-foreground">Em triagem</div>
                    <div className="truncate whitespace-nowrap text-sm font-bold text-foreground">{summary.triagem}</div>
                  </div>
                </div>
              </article>
              <article className="relative min-w-0 overflow-hidden rounded-xl border border-white/20 bg-white/22 p-2 shadow-sm backdrop-blur-sm">
                <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-emerald-500" />
                <div className="flex flex-nowrap items-center gap-1.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate whitespace-nowrap text-[10px] text-muted-foreground">Concluídas</div>
                    <div className="truncate whitespace-nowrap text-sm font-bold text-foreground">{summary.concluidas}</div>
                  </div>
                </div>
              </article>
              <article className="relative min-w-0 overflow-hidden rounded-xl border border-white/20 bg-white/22 p-2 shadow-sm backdrop-blur-sm">
                <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-cyan-500" />
                <div className="flex flex-nowrap items-center gap-1.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-600">
                    <FlaskConical size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate whitespace-nowrap text-[10px] text-muted-foreground">Volume visível</div>
                    <div className="truncate whitespace-nowrap text-sm font-bold text-foreground">{summary.volume} mL</div>
                  </div>
                </div>
              </article>
            </div>

            <div className="mt-1.5 grid grid-cols-1 gap-1.5 lg:grid-cols-[minmax(0,1.2fr)_minmax(160px,0.36fr)_minmax(160px,0.36fr)_minmax(120px,0.22fr)]">
              <div className="relative min-w-0">
                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar por código, bolsa ou referência..."
                  className="h-9 w-full rounded-xl border border-slate-300/90 bg-white/88 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none backdrop-blur-sm transition focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-9 min-w-0 rounded-xl border border-slate-300/90 bg-white/88 px-3 text-sm text-slate-900 outline-none backdrop-blur-sm transition focus:border-rose-400 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-9 min-w-0 rounded-xl border border-slate-300/90 bg-white/88 px-3 text-sm text-slate-900 outline-none backdrop-blur-sm transition focus:border-cyan-400 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
              >
                {DONATION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                max="999"
                value={pageSizeInput}
                onChange={(event) => setPageSizeInput(event.target.value)}
                onBlur={(event) => applyPageSize(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyPageSize(pageSizeInput);
                  }
                }}
                placeholder="10/pág"
                className="h-9 min-w-0 rounded-xl border border-slate-300/90 bg-white/88 px-3 text-sm text-slate-900 outline-none backdrop-blur-sm transition focus:border-cyan-400 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        {listLoading ? (
          <div className={`${GLASS_CARD} flex items-center justify-center py-16 text-muted-foreground`}>
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className={`${GLASS_CARD} px-3 py-12 text-center text-sm text-muted-foreground`}>
            Nenhuma doação encontrada com os filtros atuais.
          </div>
        ) : (
          <section className="columns-1 gap-1.5 sm:columns-2 2xl:columns-3 [column-fill:_balance]">
            {items.map((item) => (
              (() => {
                const screeningTone = screeningCardClasses(item.screening_status);
                return (
              <Link
                key={item.id}
                href={`/bloodbank/blood-donations/${item.id}`}
                className={`relative mb-1.5 block break-inside-avoid overflow-hidden rounded-xl border shadow-sm transition hover:shadow-md ${screeningTone.shell}`}
              >
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-rose-500/8 blur-2xl" />
                  <div className="absolute -bottom-8 left-10 h-20 w-20 rounded-full bg-cyan-500/8 blur-2xl" />
                </div>
                <span className={`absolute inset-y-2 right-2 w-1 rounded-full bg-gradient-to-b ${screeningTone.bar}`} />
                <div className="relative space-y-2 px-3 py-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {item.custom_id || `Doação #${item.id}`}
                      </div>
                      <h2 className="mt-0.5 text-sm font-semibold text-foreground">
                        Bolsa {item.bag_identifier || "sem identificador"}
                      </h2>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(item.status)}`}>
                          {formatStatus(item.status)}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${screeningClasses(item.screening_status)}`}>
                          Triagem {formatScreeningStatus(item.screening_status)}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-white/20 bg-white/30 px-2.5 py-1 text-[10px] font-semibold text-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
                      {formatBloodType(item.blood_type)}
                    </span>
                  </div>

                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/15 bg-white/20 px-2.5 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Tipo de doação</div>
                      <div className="mt-1 text-sm font-medium text-foreground">{formatDonationType(item.donation_type)}</div>
                    </div>
                    <div className="rounded-xl border border-white/15 bg-white/20 px-2.5 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Perfil do doador</div>
                      <div className="mt-1 text-sm font-medium text-foreground">{formatDonorRole(item.donor_role)}</div>
                    </div>
                    <div className="rounded-xl border border-white/15 bg-white/20 px-2.5 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Coleta</div>
                      <div className="mt-1 text-sm font-medium text-foreground">{formatDate(item.collected_at)}</div>
                    </div>
                    <div className="rounded-xl border border-white/15 bg-white/20 px-2.5 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Volume</div>
                      <div className="mt-1 text-sm font-medium text-foreground">{item.volume_ml ? `${item.volume_ml} mL` : "Não informado"}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-white/15 pt-1.5 text-xs text-muted-foreground dark:border-white/10">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>Hemoglobina: {item.hemoglobin_g_dl || "—"}</span>
                      <span>Peso: {item.donor_weight_kg ? `${item.donor_weight_kg} kg` : "—"}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 font-medium text-rose-700 dark:text-rose-300">
                      Abrir detalhe
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
                );
              })()
            ))}
          </section>
        )}

        <div className={`${GLASS_CARD} p-2.5`}>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Página {page} de {totalPages} · {pageSize} itens por página
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
