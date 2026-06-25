"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  CheckCircle2,
  Circle,
  Edit3,
  Eye,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import MetricCard from "@/components/ui/MetricCard";
import { useLanguage } from "@/hooks/useLanguage";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type WardBedRow = {
  id: number;
  custom_id?: string | null;
  ward?: number | null;
  ward_name?: string | null;
  number?: string | null;
  active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const STATUS_OPTIONS = [
  { value: "", labelPt: "Todos os estados", labelEn: "All statuses" },
  { value: "true", labelPt: "Disponíveis", labelEn: "Available" },
  { value: "false", labelPt: "Bloqueadas", labelEn: "Blocked" },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function statusClasses(active: boolean | null | undefined) {
  return active ?? false
    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400"
    : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400";
}

function statusLabel(active: boolean | null | undefined, t: (pt: string, en: string) => string) {
  return active ?? false ? t("Disponível", "Available") : t("Bloqueada", "Blocked");
}

export default function WardBedsCardListPage() {
  const { t } = useLanguage();
  const [beds, setBeds] = useState<WardBedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadBeds() {
      try {
        setLoading(true);
        setError(null);
        const response = await apiFetchList<WardBedRow>("/nursing/ward_bed/", {
          page: 1,
          pageSize: 500,
          clientCache: false,
        });
        if (!mounted) return;
        setBeds(response.items || []);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || t("Falha ao carregar camas.", "Failed to load beds."));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadBeds();
    return () => {
      mounted = false;
    };
  }, [t]);

  const filteredBeds = useMemo(() => {
    const q = search.trim().toLowerCase();

    return beds
      .filter((bed) => {
        if (statusFilter && String(Boolean(bed.active)) !== statusFilter) return false;
        if (!q) return true;

        const haystack = [
          bed.custom_id,
          bed.number,
          bed.ward_name,
          bed.ward ? String(bed.ward) : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        const wardCompare = String(a.ward_name || "").localeCompare(String(b.ward_name || ""), "pt");
        if (wardCompare !== 0) return wardCompare;
        return String(a.number || "").localeCompare(String(b.number || ""), "pt", { numeric: true });
      });
  }, [beds, search, statusFilter]);

  const availableCount = beds.filter((bed) => bed.active).length;
  const blockedCount = beds.length - availableCount;
  const wardCount = new Set(beds.map((bed) => bed.ward).filter(Boolean)).size;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <BedDouble size={18} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">
                  {t("Camas de enfermaria", "Ward beds")}
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading
                    ? t("A carregar camas...", "Loading beds...")
                    : t(`${beds.length} cama${beds.length === 1 ? "" : "s"} registada${beds.length === 1 ? "" : "s"}`, `${beds.length} bed${beds.length === 1 ? "" : "s"} registered`)}
                </p>
              </div>
            </div>
            <Link
              href="/nursing/ward-beds/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-sm font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700"
            >
              <Plus size={14} />
              {t("Nova cama", "New bed")}
            </Link>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <MetricCard label={t("Total", "Total")} value={loading ? "..." : beds.length} accentClass="border-l-violet-500" />
          <MetricCard label={t("Disponíveis", "Available")} value={loading ? "..." : availableCount} accentClass="border-l-emerald-500" />
          <MetricCard label={t("Enfermarias", "Wards")} value={loading ? "..." : wardCount} hint={t(`${blockedCount} bloqueada${blockedCount === 1 ? "" : "s"}`, `${blockedCount} blocked`)} accentClass="border-l-amber-500" />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("Pesquisar por cama, código ou enfermaria...", "Search by bed, code, or ward...")}
              className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-sm text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-violet-500"
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
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            <X size={14} />
            {t("Limpar", "Clear")}
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            {t("A carregar camas...", "Loading beds...")}
          </div>
        ) : filteredBeds.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
            <Circle size={28} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("Nenhuma cama encontrada.", "No beds found.")}</p>
            <Link
              href="/nursing/ward-beds/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-sm font-semibold text-white"
            >
              <Plus size={14} />
              {t("Criar cama", "Create bed")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBeds.map((bed) => (
              <article
                key={bed.id}
                className="group relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:border-violet-300/60 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-violet-500/30"
              >
                <span className={`absolute inset-x-0 top-0 h-0.5 ${bed.active ? "bg-emerald-500" : "bg-amber-500"}`} />
                <div className="space-y-3 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {bed.custom_id || `CAMA-${bed.id}`}
                      </p>
                      <h2 className="truncate text-base font-semibold text-foreground">
                        {t("Cama", "Bed")} {bed.number || bed.id}
                      </h2>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(bed.active)}`}>
                      <CheckCircle2 size={11} />
                      {statusLabel(bed.active, t)}
                    </span>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                      {t("Enfermaria", "Ward")}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                      {bed.ward_name || (bed.ward ? `${t("Enfermaria", "Ward")} ${bed.ward}` : "-")}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{t("Atualizada", "Updated")}</span>
                    <span className="font-medium text-foreground/80">{formatDate(bed.updated_at || bed.created_at)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 border-t border-border/50 pt-2">
                    <Link
                      href={`/nursing/ward-beds/${bed.id}`}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-muted"
                    >
                      <Eye size={12} />
                      {t("Ver", "View")}
                    </Link>
                    <Link
                      href={`/nursing/ward-beds/${bed.id}/edit`}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1.5 text-[11px] font-semibold text-violet-800 transition hover:bg-violet-100 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-400"
                    >
                      <Edit3 size={12} />
                      {t("Editar", "Edit")}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {t("Exibindo", "Showing")} {filteredBeds.length} {t("de", "of")} {beds.length} {t("camas", "beds")}
        </div>
      </div>
    </AppLayout>
  );
}
