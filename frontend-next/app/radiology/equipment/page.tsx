"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  FilePlus2,
  Loader2,
  MapPin,
  Search,
  Server,
  Wrench,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type ImagingEquipment = {
  id: number;
  custom_id?: string;
  name?: string;
  code?: string;
  modality?: string;
  status?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  ae_title?: string;
  station_name?: string;
  location?: string;
  pacs_endpoint?: string;
  last_quality_control?: string | null;
  next_quality_control?: string | null;
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

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  MAINTENANCE: "Em manutenção",
  INACTIVE: "Inativo",
};

const STATUS_STYLES: Record<string, { bar: string; badge: string }> = {
  ACTIVE: {
    bar: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  MAINTENANCE: {
    bar: "bg-amber-500",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
  },
  INACTIVE: {
    bar: "bg-slate-500",
    badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/50 dark:bg-slate-950/30 dark:text-slate-300",
  },
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short" }).format(date);
}

/** Dias até ao próximo controlo de qualidade; negativo quando está em atraso. */
function daysUntil(value?: string | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
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

function EquipmentCard({ item }: { item: ImagingEquipment }) {
  const status = item.status || "ACTIVE";
  const style = STATUS_STYLES[status] || STATUS_STYLES.ACTIVE;
  const remaining = daysUntil(item.next_quality_control);
  const overdue = remaining != null && remaining < 0;
  const dueSoon = remaining != null && remaining >= 0 && remaining <= 30;

  return (
    <Link
      href={`/radiology/equipment/${item.id}`}
      className={`${GLASS} group relative block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} />
      <div className="space-y-2 px-3 py-2 pl-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-500/12 text-slate-600 dark:text-slate-300">
              <Wrench size={17} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                {item.name || item.code || `Equipamento #${item.id}`}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {MODALITY_LABELS[item.modality || ""] || item.modality || "—"}
                {item.code ? ` · ${item.code}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
              {STATUS_LABELS[status] || status}
            </span>
            {overdue ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                <AlertTriangle size={10} />
                CQ vencido
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1">
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Fabricante</p>
            <p className="truncate text-xs font-bold text-foreground">{item.manufacturer || "—"}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">AE Title</p>
            <p className="truncate text-xs font-bold text-foreground">{item.ae_title || "—"}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Próximo CQ</p>
            <p className={`truncate text-xs font-bold ${overdue ? "text-red-600 dark:text-red-300" : dueSoon ? "text-amber-600 dark:text-amber-300" : "text-foreground"}`}>
              {formatDate(item.next_quality_control)}
            </p>
          </div>
        </div>

        <div className="space-y-1 border-t border-border/50 pt-1.5 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{item.location || "Localização não definida"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Server size={11} className="shrink-0" />
            <span className="truncate font-mono">{item.station_name || item.model || "Sem estação"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function RadiologyEquipmentListPage() {
  useAuthGuard();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<ImagingEquipment[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [modality, setModality] = useState("ALL");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [limit, setLimit] = useState(12);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await apiFetchList<ImagingEquipment>("/radiology/equipment/", {
          page: 1,
          pageSize: 500,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        });
        if (!mounted) return;
        setEquipment(response.items || []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar os equipamentos de imagem.");
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
    return equipment.filter((item) => {
      if (status !== "ALL" && item.status !== status) return false;
      if (modality !== "ALL" && item.modality !== modality) return false;
      if (onlyOverdue) {
        const remaining = daysUntil(item.next_quality_control);
        if (remaining == null || remaining >= 0) return false;
      }
      if (!term) return true;
      return [
        item.name,
        item.code,
        item.custom_id,
        item.manufacturer,
        item.model,
        item.serial_number,
        item.ae_title,
        item.station_name,
        item.location,
      ].some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [equipment, modality, onlyOverdue, search, status]);

  const visible = filtered.slice(0, limit);

  const activeCount = equipment.filter((item) => item.status === "ACTIVE").length;
  const maintenanceCount = equipment.filter((item) => item.status === "MAINTENANCE").length;
  const overdueCount = equipment.filter((item) => {
    const remaining = daysUntil(item.next_quality_control);
    return remaining != null && remaining < 0;
  }).length;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RADIOLOGIA]}>
      <div className="w-full space-y-1.5 px-0.5">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-slate-500" />
          <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-500/12 text-slate-600 dark:text-slate-300">
                  <Wrench size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">Equipamentos de imagem</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar..." : `${visible.length} de ${filtered.length} equipamentos`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link href="/radiology" className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft size={13} />
                  Voltar
                </Link>
                <Link href="/radiology/equipment/new" className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-400/50 bg-slate-500/15 px-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-500/20 dark:text-slate-200">
                  <FilePlus2 size={13} />
                  Novo equipamento
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 xl:flex-row xl:items-center">
              <div className="flex flex-1 flex-nowrap gap-1 overflow-x-auto">
                <MetricCard icon={Activity} label="Equipamentos" value={equipment.length} />
                <MetricCard icon={CheckCircle2} label="Ativos" value={activeCount} />
                <MetricCard icon={Wrench} label="Manutenção" value={maintenanceCount} />
                <MetricCard icon={AlertTriangle} label="CQ vencido" value={overdueCount} />
              </div>
              <div className="flex min-w-0 gap-1.5 overflow-x-auto xl:w-[700px]">
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
                    aria-label="Quantidade de equipamentos a exibir"
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
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-7 max-w-32 rounded-md border border-border bg-background/70 px-2 text-xs font-semibold text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  aria-label="Filtrar por estado"
                >
                  <option value="ALL">Todos os estados</option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setOnlyOverdue((previous) => !previous)}
                  aria-pressed={onlyOverdue}
                  className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-semibold transition ${
                    onlyOverdue
                      ? "border-red-400/60 bg-red-500/15 text-red-700 dark:text-red-300"
                      : "border-border bg-background/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CalendarClock size={12} />
                  CQ vencido
                </button>
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
            A carregar equipamentos...
          </div>
        ) : visible.length === 0 ? (
          <section className={`${GLASS} flex min-h-36 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground`}>
            <Wrench size={25} className="opacity-60" />
            <span>Nenhum equipamento corresponde aos filtros.</span>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-4">
            {visible.map((item) => (
              <EquipmentCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
