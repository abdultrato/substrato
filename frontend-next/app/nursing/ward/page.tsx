"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Loader2,
  Plus,
  Search,
  Menu,
  ChevronDown,
  X,
  Zap,
  BedDouble,
  Users,
  Activity,
  Building2,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import { formatCount } from "@/lib/i18n/plural";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";
import { useLanguage } from "@/hooks/useLanguage";
import useDebounce from "@/hooks/useDebounce";

type WardRow = {
  id: number;
  custom_id?: string | null;
  name?: string | null;
  description?: string | null;
  active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type BedSummary = {
  total_beds: number;
  available_beds: number;
  occupied_beds: number;
};

type WardWithStats = WardRow & {
  bed_summary?: BedSummary;
  recent_admissions_count?: number;
};

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", labelPt: "Todos os status", labelEn: "All statuses" },
  { value: "true", labelPt: "Ativas", labelEn: "Active" },
  { value: "false", labelPt: "Inativas", labelEn: "Inactive" },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(active: boolean | null | undefined) {
  const isActive = active ?? false;
  return isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400"
    : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-400";
}

function statusLabel(active: boolean | null | undefined): string {
  return (active ?? false) ? "Ativa" : "Inativa";
}

function occupancyBadge(
  available: number,
  total: number
): string {
  if (total === 0) return "border-gray-200 bg-gray-50 text-gray-700";

  const occupancyRate = ((total - available) / total) * 100; // Percentage occupied

  if (occupancyRate >= 80) {
    return "border-red-200 bg-red-50 text-red-700"; // High occupancy
  } else if (occupancyRate >= 50) {
    return "border-amber-200 bg-amber-50 text-amber-700"; // Medium occupancy
  } else {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"; // Low occupancy
  }
}

function occupancyLabel(available: number, total: number): string {
  if (total === 0) return "Sem camas";
  const occupied = total - available;
  return `${occupied}/${total} ocupadas`;
}

async function fetchWardBases() {
  try {
    const res = await apiFetchList<WardRow>("/nursing/ward/", {
      page: 1,
      pageSize: 200, // Fetch all to minimize requests
      clientPaginate: true,
      clientCache: false,
    });
    return res.items || [];
  } catch (error) {
    console.error("Error fetching wards:", error);
    return [];
  }
}

async function fetchBedSummaryForWard(wardId: number): Promise<BedSummary> {
  try {
    // We'll fetch bed counts for a specific ward
    const res = await apiFetchList<{
      id: number;
      ward_id: number;
      active: boolean;
    }>(`/nursing/ward_bed/`, {
      page: 1,
      pageSize: 200,
      query: {
        ward_id: wardId.toString(),
      },
      clientPaginate: true,
      clientCache: false,
    });

    const beds = res.items || [];
    const total_beds = beds.length;
    const active_beds = beds.filter(b => b.active).length;

    return {
      total_beds,
      available_beds: active_beds, // Active beds are available for use
      occupied_beds: total_beds - active_beds
    };
  } catch (error) {
    console.error(`Error fetching bed summary for ward ${wardId}:`, error);
    return {
      total_beds: 0,
      available_beds: 0,
      occupied_beds: 0
    };
  }
}

async function fetchRecentAdmissionsForWard(wardId: number): Promise<number> {
  try {
    // Get count of recent admissions (last 30 days) for this ward
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const res = await apiFetchList<{ id: number }>(`/nursing/ward_admission/`, {
      page: 1,
      pageSize: 100, // We just need a count, but limit for performance
      query: {
        ward__id: wardId.toString(),
        admission_date__gte: thirtyDaysAgo.toISOString().split('T')[0],
      },
      clientPaginate: true,
      clientCache: false,
    });

    return res.items?.length || 0;
  } catch (error) {
    console.error(`Error fetching recent admissions for ward ${wardId}:`, error);
    return 0;
  }
}

export default function NursingWardPage() {
  const safeRefreshToken = useSafeDataRefreshSignal();
  const { t, tr, language } = useLanguage();
  const router = useRouter();

  const [wards, setWards] = useState<WardRow[]>([]);
  const [wardsWithStats, setWardsWithStats] = useState<WardWithStats[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
  }, [search]);

  // Fetch wards with enhanced data
  useEffect(() => {
    let mounted = true;

    const loadWardsWithStats = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch basic ward information with filtering
        const query: Record<string, string | number | boolean> = {};
        if (debouncedSearch) {
          // Search in name, custom_id, or description
          query.search = debouncedSearch;
        }
        if (statusFilter) {
          query.active = statusFilter === "true";
        }

        const res = await apiFetchList<WardRow>("/nursing/ward/", {
          page: 1,
          pageSize: 100, // Reasonable limit for wards
          query,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        });

        const fetchedWards = res.items || [];
        setWards(fetchedWards);
        setTotal(res.meta.total ?? fetchedWards.length);

        if (!mounted) return;

        // Fetch enhanced stats for each ward
        // We'll do this in batches to avoid overwhelming the API
        const wardsWithStatsPromises = fetchedWards.map(async (ward) => {
          // Fetch basic stats that we can get quickly
          const [bedSummary, recentAdmissions] = await Promise.all([
            fetchBedSummaryForWard(ward.id),
            fetchRecentAdmissionsForWard(ward.id),
          ]);

          return {
            ...ward,
            bed_summary: bedSummary,
            recent_admissions_count: recentAdmissions,
          };
        });

        const wardsWithStats = await Promise.all(
          wardsWithStatsPromises.slice(0, 10) // Limit to first 10 for initial load to avoid too many requests
        );

        // For remaining wards, we'll load basic info first and enhance later
        const remainingWards = fetchedWards.slice(10).map(ward => ({
          ...ward,
          bed_summary: undefined,
          recent_admissions_count: 0
        }));

        setWardsWithStats([...wardsWithStats, ...remainingWards]);

        // Load remaining wards' stats in background
        if (mounted && fetchedWards.length > 10) {
          const remainingPromises = fetchedWards.slice(10).map(async (ward) => {
            const [bedSummary, recentAdmissions] = await Promise.all([
              fetchBedSummaryForWard(ward.id),
              fetchRecentAdmissionsForWard(ward.id),
            ]);

            return {
              ...ward,
              bed_summary: bedSummary,
              recent_admissions_count: recentAdmissions,
            };
          });

          const enhancedRemaining = await Promise.all(remainingPromises);
          // Update state with enhanced data
          setWardsWithStats(prev => {
            const updated = [...prev];
            // Replace the placeholder entries with enhanced ones
            enhancedRemaining.forEach((enhanced, index) => {
              updated[10 + index] = enhanced;
            });
            return updated;
          });
        }
      } catch (e: any) {
        setError(e?.message || "Erro ao carregar enfermarias.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadWardsWithStats();
    return () => {
      // Cleanup
    };
  }, [debouncedSearch, statusFilter, safeRefreshToken]);

  // Filter and sort wards
  const filteredAndSortedWards = useMemo(() => {
    return wardsWithStats
      .filter((ward) => {
        const matchesSearch =
          !debouncedSearch ||
          (ward.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            ward.custom_id?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            (ward.description || "")
              .toLowerCase()
              .includes(debouncedSearch.toLowerCase()));

        const matchesStatus =
          !statusFilter ||
          (ward.active === undefined && statusFilter === "") ||
          (ward.active !== undefined &&
            String(ward.active ?? false) === statusFilter);

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        // Sort by name alphabetically
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });
  }, [wardsWithStats, debouncedSearch, search, statusFilter]);

  // Pagination calculation (show all on first page for simplicity with client-side filtering)
  const itemsPerPage = 20; // Match the ResourceListPage default
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const page = 1; // We're showing all filtered results on first page for simplicity

  // Get paginated items
  const startIdx = (page - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedWards = filteredAndSortedWards.slice(startIdx, endIdx);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-2">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-2 py-2 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <Building2 size={16} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">
                  Enfermarias
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? "Carregando…" : formatCount(total, { one: "enfermaria cadastrada", other: "enfermarias cadastradas" })}
                </p>
              </div>
            </div>
            <Link
              href="/nursing/ward/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-teal-700"
            >
              <Plus size={13} /> Nova Enfermaria
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1">
          <div className="relative min-w-[200px] flex-1">
            <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar por nome, código ou descrição…"
              className="h-8 w-full rounded-lg border border-border bg-card pl-7 pr-3 text-sm text-foreground outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-8 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none transition focus:border-emerald-500"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {t(option.labelPt, option.labelEn)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("");
            }}
            className="h-8 items-center gap-1 rounded-md border border-white/30 bg-white/45 px-2.5 font-semibold text-sm text-[var(--gray-700)] shadow-sm backdrop-blur-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-white/60 hover:text-[var(--text)] dark:border-white/10 dark:bg-white/10 dark:text-[var(--gray-200)] dark:hover:bg-white/15"
          >
            <span className="flex items-center gap-1">
              <X size={14} />
              {t("Limpar filtros", "Clear filters")}
            </span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-sm text-amber-800">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center gap-1 py-8 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Carregando…
          </div>
        ) : filteredAndSortedWards.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Circle size={28} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhuma enfermaria encontrada.</p>
            <Link
              href="/nursing/ward/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-2 text-sm font-semibold text-white"
            >
              <Plus size={13} /> Criar primeira enfermaria
            </Link>
          </div>
        ) : (
          // Ward Cards Grid
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedWards.map((ward) => (
              <Link
                key={ward.id}
                href={`/nursing/ward/${ward.id}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:border-emerald-300/50 hover:shadow-md dark:bg-white/5 dark:border-white/10 dark:hover:border-emerald-500/30"
              >
                {/* Status indicator on the left - thin colored bar */}
                <span className={`absolute left-0 top-0 h-0.5 w-0 ${ward.active ? "bg-emerald-500" : "bg-red-500"}`} />

                <div className="flex-1 flex-col p-2">
                  {/* Header with name and status */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <div className="text-sm font-mono text-muted-foreground truncate max-w-xs">
                        {ward.custom_id || `ENF-${ward.id}`}
                      </div>
                      <h3 className="text-base font-semibold leading-snug text-foreground truncate">
                        {ward.name || "Enfermaria sem nome"}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${ward.active
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-red-50 text-red-800"}`}
                      >
                        {ward.active ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {ward.description && (
                    <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-2">
                      {ward.description}
                    </p>
                  )}

                  {/* Stats Section */}
                  <div className="mt-2 pt-1 border-t border-border/40">
                    <div className="space-y-0.5 text-sm">
                      {/* Bed Occupancy */}
                      <div className="flex justify-between">
                        <span className="font-medium text-[var(--gray-700)]">
                          Ocupação de camas
                        </span>
                        <span className="flex items-center gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ward.bed_summary
                              ? occupancyBadge(
                                  ward.bed_summary.available_beds,
                                  ward.bed_summary.total_beds
                                )
                              : "border-gray-200 bg-gray-50 text-gray-700"}`}
                          >
                            {ward.bed_summary
                              ? occupancyLabel(
                                  ward.bed_summary.available_beds,
                                  ward.bed_summary.total_beds
                                )
                              : "Carregando…"}
                          </span>
                        </span>
                      </div>

                      {/* Recent Activity */}
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>
                          <Activity size={12} className="mr-0.5" />
                          {ward.recent_admissions_count ?? 0} admissões recentes
                        </span>
                        <span>
                          <Clock size={12} className="mr-0.5" />
                          {formatDate(ward.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-2 pt-1 border-t border-border/40 flex flex-col sm:flex-row gap-0.5">
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        router.push(`/nursing/ward/${ward.id}/beds`);
                      }}
                      className="flex-1 flex items-center justify-center px-2 py-1 text-sm font-semibold bg-white/10 border border-white/20 rounded-md hover:bg-white/20 transition-colors dark:border-white/10 dark:hover:bg-white/30 cursor-pointer"
                    >
                      <BedDouble size={14} className="mr-1" />
                      Ver Camas
                    </span>
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        alert(
                          `Funcionalidade de admissão rápida para ${ward.name} em desenvolvimento`
                        );
                      }}
                      className="flex-1 flex items-center justify-center px-2 py-1 text-sm font-semibold bg-green-500/10 border border-green-500/20 rounded-md hover:bg-green-500/20 transition-colors dark:border-green-400/30 dark:hover:bg-green-500/10 cursor-pointer"
                    >
                      <Users size={14} className="mr-1" />
                      Admitir Paciente
                    </span>
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        alert(
                          `Visualização do dashboard para ${ward.name} em desenvolvimento`
                        );
                      }}
                      className="flex-1 flex items-center justify-center px-2 py-1 text-sm font-semibold bg-blue-500/10 border border-blue-500/20 rounded-md hover:bg-blue-500/20 transition-colors dark:border-blue-400/30 dark:hover:bg-blue-500/10 cursor-pointer"
                    >
                      <Zap size={14} className="mr-1" />
                      Ver Dashboard
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination Info */}
        <div className="text-xs text-[var(--gray-600)] flex justify-between items-center pt-1">
          <span>
            {t("Exibindo", "Showing")} {paginatedWards.length > 0 ? `${startIdx + 1}` : "0"}–{Math.min(
              endIdx,
              filteredAndSortedWards.length
            )} de {total} {t("registros", "records")}
          </span>
          {totalPages > 1 && (
            <div className="flex space-x-1">
              <button
                onClick={() => {
                  // In a full implementation, this would change the page
                  // For now, we're showing all filtered results
                }}
                disabled={page <= 1}
                className="h-8 rounded-lg border border-white/30 bg-white/40 px-2 text-xs text-[var(--gray-500)] {page <= 1 ? 'cursor-not-allowed' : ''}"
              >
                <ChevronLeft size={14} />
              </button>
              <span>{page} / {totalPages}</span>
              <button
                onClick={() => {
                  // In a full implementation, this would change the page
                  // For now, we're showing all filtered results
                }}
                disabled={page >= totalPages}
                className="h-8 rounded-lg border border-white/30 bg-white/40 px-2 text-xs text-[var(--gray-500)] {page >= totalPages ? 'cursor-not-allowed' : ''}"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
