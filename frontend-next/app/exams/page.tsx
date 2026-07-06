"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FlaskConical,
  Loader2,
  Plus,
  Search,
  Tag,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const LIST_GROUPS = [
  GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ENFERMAGEM, GROUPS.LABORATORIO, GROUPS.RECEPCAO,
];

const PAGE_SIZES = [12, 24, 48, 96];
const DEFAULT_PAGE_SIZE = 24;

interface LabExam {
  id: number;
  custom_id: string;
  name: string;
  turnaround_hours: number;
  price: string;
  vat_percentage: string;
  applies_vat_by_default: boolean;
  method: string;
  sector: string;
  sample_type_name: string | null;
  created_at: string;
}

const SECTOR_FILTERS = [
  { value: "", label: "Todos os setores" },
  { value: "Hematologia",      label: "Hematologia"         },
  { value: "Bioquimica",       label: "Bioquímica"          },
  { value: "Microbiologia",    label: "Microbiologia"       },
  { value: "Imunologia",       label: "Imunologia"          },
  { value: "Serologia",        label: "Serologia"           },
  { value: "Parasitologia",    label: "Parasitologia"       },
  { value: "BiologiaMolecular",label: "Biologia Molecular"  },
  { value: "Virologia",        label: "Virologia"           },
  { value: "Bacteriologia",    label: "Bacteriologia"       },
  { value: "Coagulacao",       label: "Coagulação"          },
  { value: "Urinalise",        label: "Urinálise"           },
  { value: "Toxicologia",      label: "Toxicologia"         },
  { value: "Hormonios",        label: "Hormônios"           },
  { value: "MarcadoresTumorais", label: "Marcadores Tumorais" },
  { value: "Outro",            label: "Outro"               },
];

const SECTOR_CHIP: Record<string, string> = {
  Hematologia:        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300",
  Bioquimica:         "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  Microbiologia:      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  Imunologia:         "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",
  Serologia:          "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-700/40 dark:bg-purple-900/20 dark:text-purple-300",
  Parasitologia:      "border-green-200 bg-green-50 text-green-700 dark:border-green-700/40 dark:bg-green-900/20 dark:text-green-300",
  BiologiaMolecular:  "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300",
  Virologia:          "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-700/40 dark:bg-cyan-900/20 dark:text-cyan-300",
  Bacteriologia:      "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300",
  Coagulacao:         "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
  Urinalise:          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
  Toxicologia:        "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",
  Hormonios:          "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-700/40 dark:bg-pink-900/20 dark:text-pink-300",
  MarcadoresTumorais: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-700/40 dark:bg-fuchsia-900/20 dark:text-fuchsia-300",
};

const SECTOR_BAR: Record<string, string> = {
  Hematologia:        "bg-rose-500",
  Bioquimica:         "bg-amber-500",
  Microbiologia:      "bg-emerald-500",
  Imunologia:         "bg-violet-500",
  Serologia:          "bg-purple-500",
  Parasitologia:      "bg-green-500",
  BiologiaMolecular:  "bg-indigo-500",
  Virologia:          "bg-cyan-500",
  Bacteriologia:      "bg-teal-500",
  Coagulacao:         "bg-red-500",
  Urinalise:          "bg-blue-500",
  Toxicologia:        "bg-orange-500",
  Hormonios:          "bg-pink-500",
  MarcadoresTumorais: "bg-fuchsia-500",
};

function chipFor(sector: string) {
  return SECTOR_CHIP[sector] ?? "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/40 dark:bg-slate-800/20 dark:text-slate-400";
}
function barFor(sector: string) {
  return SECTOR_BAR[sector] ?? "bg-slate-400";
}

function sectorLabel(value: string) {
  return SECTOR_FILTERS.find((f) => f.value === value)?.label ?? value;
}

function fmtPrice(price: string) {
  const n = Number(price);
  return Number.isFinite(n) ? n.toLocaleString("pt-PT", { minimumFractionDigits: 2 }) + " MT" : price;
}

export default function ExamsListPage() {
  useAuthGuard();

  const [items, setItems]               = useState<LabExam[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [filterSector, setFilterSector] = useState("");
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p: number, q: string, sector: string, ps: number) => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (q.trim())  query.search = q.trim();
      if (sector)    query.sector = sector;
      const { items: rows, meta } = await apiFetchList<LabExam>(
        "/clinical/lab-exams/", { page: p, pageSize: ps, query }
      );
      setItems(rows); setTotal(meta.total ?? 0);
    } catch { setItems([]); setTotal(0); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page, search, filterSector, pageSize); }, [page, load, filterSector, pageSize]);

  function handleSearch(v: string) {
    setSearch(v); setPage(1);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => load(1, v, filterSector, pageSize), 300);
  }
  function handleSector(v: string) { setFilterSector(v); setPage(1); load(1, search, v, pageSize); }
  function handlePageSize(v: number) { setPageSize(v); setPage(1); load(1, search, filterSector, v); }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-sky-500 to-cyan-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 shadow-md shadow-sky-500/30">
              <FlaskConical size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Laboratório</div>
              <h1 className="text-base font-bold text-foreground">Exames Laboratoriais</h1>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{total} exames no catálogo</div>
            </div>
            <Link href="/exams/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 px-4 text-xs font-semibold text-white shadow-md shadow-sky-500/30 transition hover:from-sky-700 hover:to-cyan-700">
              <Plus size={13} /> Novo exame
            </Link>
          </div>

          {/* Filters */}
          <div className="border-t border-white/20 px-4 py-2 dark:border-white/10">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-48 flex-1">
                <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Pesquisar por nome, método, amostra…"
                  className="w-full rounded-lg border border-white/30 bg-white/40 py-1.5 pl-7 pr-3 text-xs outline-none transition placeholder:text-muted-foreground focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-white/10 dark:bg-white/5" />
              </div>
              <div className="relative">
                <Tag size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select value={filterSector} onChange={(e) => handleSector(e.target.value)}
                  className="appearance-none rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs text-foreground outline-none transition focus:border-sky-400">
                  {SECTOR_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div className="relative">
                <select value={pageSize} onChange={(e) => handlePageSize(Number(e.target.value))}
                  className="appearance-none rounded-lg border border-border bg-card py-1.5 pl-3 pr-6 text-xs text-foreground outline-none transition focus:border-sky-400">
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} por página</option>)}
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
            Nenhum exame encontrado.
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((exam) => (
              <Link key={exam.id} href={`/exams/${exam.id}`}
                className="relative block overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:bg-white/35 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${barFor(exam.sector)}`} />

                <div className="space-y-1.5 px-3 py-2.5 pl-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold leading-tight text-foreground">{exam.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{exam.custom_id}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${chipFor(exam.sector)}`}>
                      {sectorLabel(exam.sector)}
                    </span>
                  </div>

                  {exam.method && (
                    <p className="truncate text-[10px] text-muted-foreground">{exam.method.replace(/([A-Z])/g, " $1").trim()}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="font-semibold text-sky-700 dark:text-sky-300">{fmtPrice(exam.price)}</span>
                    {exam.applies_vat_by_default && (
                      <span className="text-muted-foreground">+ IVA {exam.vat_percentage}%</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-border/30 pt-1 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock size={9} />
                      {exam.turnaround_hours}h TAT
                    </span>
                    {exam.sample_type_name && (
                      <span className="truncate">{exam.sample_type_name}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">Página {page} de {totalPages} · {total} exames · {pageSize}/pág</span>
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
