"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  FilePlus2,
  Image as ImageIcon,
  Layers,
  Loader2,
  Search,
  Timer,
  User,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type ImagingSeries = {
  id: number;
  custom_id?: string;
  study?: number | { id?: number };
  study_label?: string;
  patient_name?: string;
  series_instance_uid?: string;
  series_number?: number;
  modality?: string;
  body_region?: string;
  description?: string;
  image_count?: number;
  storage_uri?: string;
  acquisition_started_at?: string | null;
  acquisition_completed_at?: string | null;
  notes?: string;
};

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const MODALITY_LABELS: Record<string, string> = {
  XRAY: "Raio-X",
  ULTRASOUND: "Ultrassom",
  CT: "Tomografia",
  MRI: "Ressonância",
  MAMMOGRAPHY: "Mamografia",
  FLUOROSCOPY: "Fluoroscopia",
  DENSITOMETRY: "Densitometria",
  OTHER: "Outra",
};

const REGION_LABELS: Record<string, string> = {
  HEAD: "Cabeça",
  NECK: "Pescoço",
  CHEST: "Tórax",
  ABDOMEN: "Abdómen",
  PELVIS: "Pelve",
  SPINE: "Coluna",
  UPPER_LIMB: "Membro superior",
  LOWER_LIMB: "Membro inferior",
  BREAST: "Mama",
  VASCULAR: "Vascular",
  WHOLE_BODY: "Corpo inteiro",
  OTHER: "Outra",
};

const MODALITY_STYLES: Record<string, { bar: string; badge: string }> = {
  XRAY: {
    bar: "bg-sky-500",
    badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-300",
  },
  ULTRASOUND: {
    bar: "bg-teal-500",
    badge: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800/50 dark:bg-teal-950/30 dark:text-teal-300",
  },
  CT: {
    bar: "bg-violet-500",
    badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-300",
  },
  MRI: {
    bar: "bg-indigo-500",
    badge: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-950/30 dark:text-indigo-300",
  },
  MAMMOGRAPHY: {
    bar: "bg-rose-500",
    badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
  },
  FLUOROSCOPY: {
    bar: "bg-amber-500",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
  },
  DENSITOMETRY: {
    bar: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  OTHER: {
    bar: "bg-slate-500",
    badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/50 dark:bg-slate-950/30 dark:text-slate-300",
  },
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(date);
}

/** Duração da aquisição em minutos, quando ambos os extremos existem. */
function acquisitionMinutes(item: ImagingSeries): number | null {
  if (!item.acquisition_started_at || !item.acquisition_completed_at) return null;
  const start = new Date(item.acquisition_started_at).getTime();
  const end = new Date(item.acquisition_completed_at).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / 60000);
}

function shortUid(value?: string) {
  if (!value) return "Sem UID";
  return value.length > 26 ? `…${value.slice(-25)}` : value;
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-[112px] flex-none rounded-md border border-border/60 bg-background/45 px-2 py-1">
      <div className="mb-0.5 flex items-center gap-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        <Icon size={11} />
        {label}
      </div>
      <div className="truncate whitespace-nowrap text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}

function SeriesCard({ item }: { item: ImagingSeries }) {
  const modality = item.modality || "OTHER";
  const style = MODALITY_STYLES[modality] || MODALITY_STYLES.OTHER;
  const minutes = acquisitionMinutes(item);

  return (
    <Link
      href={`/radiology/series/${item.id}`}
      className={`${GLASS} group relative block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} />
      <div className="space-y-2 px-3 py-2 pl-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-500/12 text-violet-600 dark:text-violet-300">
              <Layers size={17} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                {item.description || `Série ${item.series_number ?? item.id}`}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {item.study_label || "Estudo não associado"}
                {item.patient_name ? ` · ${item.patient_name}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
              {MODALITY_LABELS[modality] || modality}
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground">
              #{item.series_number ?? "—"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1">
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Imagens</p>
            <p className="truncate text-xs font-bold text-foreground">{item.image_count ?? 0}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Região</p>
            <p className="truncate text-xs font-bold text-foreground">{REGION_LABELS[item.body_region || ""] || "—"}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Duração</p>
            <p className="truncate text-xs font-bold text-foreground">{minutes != null ? `${minutes} min` : "—"}</p>
          </div>
        </div>

        <div className="space-y-1 border-t border-border/50 pt-1.5 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarClock size={11} className="shrink-0" />
            <span className="truncate">{formatDate(item.acquisition_completed_at || item.acquisition_started_at)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity size={11} className="shrink-0" />
            <span className="truncate font-mono">{shortUid(item.series_instance_uid)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function RadiologySeriesListPage() {
  useAuthGuard();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<ImagingSeries[]>([]);
  const [search, setSearch] = useState("");
  const [modality, setModality] = useState("ALL");
  const [region, setRegion] = useState("ALL");
  const [limit, setLimit] = useState(12);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await apiFetchList<ImagingSeries>("/radiology/series/", {
          page: 1,
          pageSize: 500,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        });
        if (!mounted) return;
        setSeries(response.items || []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar as séries de imagem.");
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
    const term = search.trim().toLowerCase();
    return series.filter((item) => {
      if (modality !== "ALL" && item.modality !== modality) return false;
      if (region !== "ALL" && item.body_region !== region) return false;
      if (!term) return true;
      return [
        item.custom_id,
        item.description,
        item.study_label,
        item.patient_name,
        item.series_instance_uid,
        item.storage_uri,
      ].some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [modality, region, search, series]);

  const visible = filtered.slice(0, limit);

  const totalImages = series.reduce((sum, item) => sum + Number(item.image_count || 0), 0);
  const studyCount = new Set(
    series.map((item) => item.study_label || String(item.study ?? "")).filter(Boolean)
  ).size;
  const averageImages = series.length ? Math.round(totalImages / series.length) : 0;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RADIOLOGIA]}>
      <div className="w-full space-y-1.5 px-0.5">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-violet-500" />
          <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-500/12 text-violet-600 dark:text-violet-300">
                  <Layers size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">Séries de imagem</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar..." : `${visible.length} de ${filtered.length} séries`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link href="/radiology" className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft size={13} />
                  Voltar
                </Link>
                <Link href="/radiology/series/new" className="inline-flex h-7 items-center gap-1 rounded-md border border-violet-400/50 bg-violet-500/15 px-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-500/20 dark:text-violet-200">
                  <FilePlus2 size={13} />
                  Nova série
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 xl:flex-row xl:items-center">
              <div className="flex flex-1 flex-nowrap gap-1 overflow-x-auto">
                <MetricCard icon={Layers} label="Séries" value={series.length} />
                <MetricCard icon={ImageIcon} label="Imagens" value={totalImages.toLocaleString("pt-PT")} />
                <MetricCard icon={Timer} label="Média/série" value={averageImages} />
                <MetricCard icon={User} label="Estudos" value={studyCount} />
              </div>
              <div className="flex min-w-0 gap-1.5 overflow-x-auto xl:w-[620px]">
                <div className="relative min-w-[190px] flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Pesquisar..."
                    className="h-7 w-full rounded-md border border-border bg-background/70 pl-8 pr-8 text-xs text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  />
                  {search ? (
                    <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar pesquisa">
                      <X size={12} />
                    </button>
                  ) : null}
                </div>
                <label className="w-16 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={limit}
                    onChange={(event) => setLimit(Math.min(500, Math.max(1, Number(event.target.value || 1))))}
                    className="h-7 w-full rounded-md border border-border bg-background/70 px-2 text-center text-xs font-semibold text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                    aria-label="Quantidade de séries a exibir"
                  />
                </label>
                <select
                  value={modality}
                  onChange={(event) => setModality(event.target.value)}
                  className="h-7 max-w-36 rounded-md border border-border bg-background/70 px-2 text-xs font-semibold text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  aria-label="Filtrar por modalidade"
                >
                  <option value="ALL">Todas as modalidades</option>
                  {Object.entries(MODALITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  className="h-7 max-w-36 rounded-md border border-border bg-background/70 px-2 text-xs font-semibold text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  aria-label="Filtrar por região anatómica"
                >
                  <option value="ALL">Todas as regiões</option>
                  {Object.entries(REGION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className={`${GLASS} flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground`}>
            <Loader2 size={19} className="animate-spin" />
            A carregar séries...
          </div>
        ) : visible.length === 0 ? (
          <section className={`${GLASS} flex min-h-36 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground`}>
            <Layers size={25} className="opacity-60" />
            <span>Nenhuma série corresponde aos filtros.</span>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-4">
            {visible.map((item) => (
              <SeriesCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
